import { prisma } from "../prisma/client";
import { getAllGoalProgress } from "./goalService";

const PH_OFFSET_MS = 8 * 60 * 60 * 1000; // Asia/Manila fixed UTC+8 (no DST)

export interface InsightAction {
  label: string;
  type: "set_limit" | "create_goal" | "create_session" | "view_details" | "view_analytics";
  data?: any;
}

export interface UsageInsight {
  type: "pattern" | "trend" | "comparison" | "prediction" | "goal" | "habit" | "anomaly" | "recommendation";
  title: string;
  description: string;
  severity: "info" | "warning" | "success";
  data?: any;
  action?: InsightAction;
  confidence?: number; // 0-100
}

export const getUsageInsights = async (deviceId: string, days: number = 30): Promise<UsageInsight[]> => {
  const insights: UsageInsight[] = [];
  const endKey = new Date(Date.now() + PH_OFFSET_MS).toISOString().slice(0, 10);
  const endDate = new Date(`${endKey}T23:59:59.999+08:00`);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // Get usage logs for the period
  const logs = await prisma.usageLog.findMany({
    where: {
      deviceId,
      occurredAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      app: true,
    },
    orderBy: {
      occurredAt: "asc",
    },
  });

  if (logs.length === 0) {
    return insights;
  }

  // Group logs by app and day of week
  const appUsageByDay: Record<string, Record<number, number>> = {};
  const appTotalUsage: Record<string, number> = {};

  for (const log of logs) {
    const dayOfWeek = new Date(log.occurredAt.getTime() + PH_OFFSET_MS).getUTCDay(); // 0 = Sunday, 6 = Saturday (PH)
    const appId = log.appId;
    const minutes = log.durationSeconds / 60;

    if (!appUsageByDay[appId]) {
      appUsageByDay[appId] = {};
      appTotalUsage[appId] = 0;
    }

    if (!appUsageByDay[appId][dayOfWeek]) {
      appUsageByDay[appId][dayOfWeek] = 0;
    }

    appUsageByDay[appId][dayOfWeek] += minutes;
    appTotalUsage[appId] += minutes;
  }

  // Pattern Detection: Weekend vs Weekday usage
  for (const [appId, dayUsage] of Object.entries(appUsageByDay)) {
    const weekendDays = [0, 6]; // Sunday, Saturday
    const weekdayDays = [1, 2, 3, 4, 5]; // Monday to Friday

    const weekendUsage = weekendDays.reduce((sum, day) => sum + (dayUsage[day] || 0), 0);
    const weekdayUsage = weekdayDays.reduce((sum, day) => sum + (dayUsage[day] || 0), 0);
    const weekendDaysCount = Math.max(1, Math.floor(days / 7) * 2);
    const weekdayDaysCount = Math.max(1, days - weekendDaysCount);

    const avgWeekendUsage = weekendUsage / weekendDaysCount;
    const avgWeekdayUsage = weekdayUsage / weekdayDaysCount;

    if (avgWeekendUsage > 0 && avgWeekdayUsage > 0) {
      const diff = ((avgWeekendUsage - avgWeekdayUsage) / avgWeekdayUsage) * 100;

      if (Math.abs(diff) > 20) {
        const app = logs.find(l => l.appId === appId)?.app;
        if (app) {
          insights.push({
            type: "pattern",
            title: "Weekend Usage Pattern",
            description: `You use ${app.name} ${Math.abs(diff).toFixed(0)}% ${diff > 0 ? 'more' : 'less'} on weekends compared to weekdays.`,
            severity: diff > 50 ? "warning" : "info",
            data: {
              appId,
              appName: app.name,
              weekendAvg: avgWeekendUsage.toFixed(1),
              weekdayAvg: avgWeekdayUsage.toFixed(1),
              difference: diff.toFixed(0),
            },
          });
        }
      }
    }
  }

  // Trend Detection: Compare recent weeks
  const weekCount = Math.floor(days / 7);
  if (weekCount >= 2) {
    const recentWeekStart = new Date(endDate);
    recentWeekStart.setDate(recentWeekStart.getDate() - 7);
    recentWeekStart.setHours(0, 0, 0, 0);

    const previousWeekStart = new Date(endDate);
    previousWeekStart.setDate(previousWeekStart.getDate() - 14);
    previousWeekStart.setHours(0, 0, 0, 0);
    const previousWeekEnd = new Date(endDate);
    previousWeekEnd.setDate(previousWeekEnd.getDate() - 7);
    previousWeekEnd.setHours(23, 59, 59, 999);

    const recentLogs = logs.filter(l => l.occurredAt >= recentWeekStart);
    const previousLogs = logs.filter(
      l => l.occurredAt >= previousWeekStart && l.occurredAt < previousWeekEnd
    );

    const recentTotal = recentLogs.reduce((sum, l) => sum + l.durationSeconds, 0) / 60;
    const previousTotal = previousLogs.reduce((sum, l) => sum + l.durationSeconds, 0) / 60;

    if (previousTotal > 0) {
      const trend = ((recentTotal - previousTotal) / previousTotal) * 100;

      if (Math.abs(trend) > 10) {
        insights.push({
          type: "trend",
          title: "Usage Trend",
          description: `Your total usage has ${trend > 0 ? 'increased' : 'decreased'} by ${Math.abs(trend).toFixed(0)}% compared to last week.`,
          severity: trend < -20 ? "success" : trend > 20 ? "warning" : "info",
          data: {
            recentTotal: recentTotal.toFixed(1),
            previousTotal: previousTotal.toFixed(1),
            trend: trend.toFixed(0),
          },
        });
      }
    }
  }

  // Top App Comparison
  const appUsageArray = Object.entries(appTotalUsage)
    .map(([appId, minutes]) => ({
      appId,
      minutes,
      app: logs.find(l => l.appId === appId)?.app,
    }))
    .filter(item => item.app)
    .sort((a, b) => b.minutes - a.minutes);

  if (appUsageArray.length > 0) {
    const topApp = appUsageArray[0];
    const totalUsage = appUsageArray.reduce((sum, item) => sum + item.minutes, 0);
    const percentage = (topApp.minutes / totalUsage) * 100;

    if (percentage > 30 && topApp.app) {
      insights.push({
        type: "comparison",
        title: "Most Used App",
        description: `${topApp.app.name} accounts for ${percentage.toFixed(0)}% of your total usage (${(topApp.minutes / 60).toFixed(1)} hours).`,
        severity: percentage > 50 ? "warning" : "info",
        data: {
          appId: topApp.appId,
          appName: topApp.app.name,
          percentage: percentage.toFixed(0),
          hours: (topApp.minutes / 60).toFixed(1),
        },
      });
    }
  }

  // Prediction: Based on current week's usage
  if (weekCount >= 1) {
    const endDayOfWeek = new Date(endDate.getTime() + PH_OFFSET_MS).getUTCDay();
    const currentWeekStart = new Date(endDate);
    currentWeekStart.setDate(currentWeekStart.getDate() - endDayOfWeek);
    currentWeekStart.setHours(0, 0, 0, 0);
    currentWeekStart.setHours(0, 0, 0, 0);

    const currentWeekLogs = logs.filter(l => l.occurredAt >= currentWeekStart);
    const currentWeekTotal = currentWeekLogs.reduce((sum, l) => sum + l.durationSeconds, 0) / 60;
    const daysInWeek = endDayOfWeek + 1; // Days elapsed this week (PH)
    const projectedWeekly = (currentWeekTotal / daysInWeek) * 7;

    if (projectedWeekly > 0) {
      insights.push({
        type: "prediction",
        title: "Weekly Projection",
        description: `Based on this week's usage so far, you're projected to use ${(projectedWeekly / 60).toFixed(1)} hours this week.`,
        severity: projectedWeekly > 3000 ? "warning" : "info", // 50 hours
        data: {
          currentTotal: currentWeekTotal.toFixed(1),
          projectedTotal: projectedWeekly.toFixed(1),
          daysElapsed: daysInWeek,
        },
      });
    }
  }

  // Goal Progress Insights
  try {
    const goalProgress = await getAllGoalProgress(deviceId);
    for (const progress of goalProgress) {
      if (progress.percentage >= 80) {
        // @ts-ignore - Prisma client will be regenerated on build
        const goal = await prisma.usageGoal.findUnique({
          where: { id: progress.goalId },
          include: { app: true, category: true },
        });

        if (goal) {
          insights.push({
            type: "goal",
            title: "Goal Progress",
            description: progress.percentage >= 100
              ? `You've exceeded your ${goal.name || goal.type.toLowerCase().replace('_', ' ')} goal by ${Math.round(progress.percentage - 100)}%.`
              : `You've used ${Math.round(progress.percentage)}% of your ${goal.name || goal.type.toLowerCase().replace('_', ' ')} goal. ${Math.round(progress.remainingMinutes)} minutes remaining.`,
            severity: progress.percentage >= 100 ? "warning" : progress.percentage >= 90 ? "warning" : "info",
            data: {
              goalId: progress.goalId,
              currentMinutes: progress.currentMinutes,
              targetMinutes: progress.targetMinutes,
              percentage: progress.percentage,
            },
            action: {
              label: "View Goal",
              type: "view_details",
              data: { goalId: progress.goalId },
            },
            confidence: 100,
          });
        }
      }
    }
  } catch (error) {
    console.error("[InsightsService] Error getting goal progress:", error);
  }

  // Recommendations based on usage patterns
  if (appUsageArray.length > 0) {
    const topApp = appUsageArray[0];
    const totalUsage = appUsageArray.reduce((sum, item) => sum + item.minutes, 0);
    const topAppPercentage = (topApp.minutes / totalUsage) * 100;

    // Recommend setting a limit if app usage is high and no limit exists
    if (topAppPercentage > 40 && topApp.app) {
      try {
        const hasLimit = await prisma.limit.findFirst({
          where: {
            deviceId: deviceId,
            appId: topApp.appId,
          },
        });

        if (!hasLimit) {
          insights.push({
            type: "recommendation",
            title: "Consider Setting a Limit",
            description: `${topApp.app.name} accounts for ${Math.round(topAppPercentage)}% of your usage. Consider setting a daily limit to help manage your time.`,
            severity: "info",
            data: {
              appId: topApp.appId,
              appName: topApp.app.name,
              percentage: topAppPercentage,
            },
            action: {
              label: "Set Limit",
              type: "set_limit",
              data: {
                appId: topApp.appId,
                appName: topApp.app.name,
                packageName: topApp.app.packageName,
              },
            },
            confidence: 75,
          });
        }
      } catch (error) {
        console.error("[InsightsService] Error checking limits:", error);
      }
    }
  }

  return insights;
};

