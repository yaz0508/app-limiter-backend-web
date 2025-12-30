import { prisma } from "../prisma/client";
// @ts-ignore - Prisma client will be regenerated on build
import type { GoalType, GoalStatus } from "@prisma/client";
import { getDailySummary, getWeeklySummary } from "./usageService";

// Type definitions (will be available after prisma generate)
type GoalTypeEnum = "DAILY_TOTAL" | "WEEKLY_TOTAL" | "APP_SPECIFIC" | "CATEGORY_SPECIFIC";
type GoalStatusEnum = "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED";

export interface GoalProgress {
  goalId: string;
  currentMinutes: number;
  targetMinutes: number;
  percentage: number;
  remainingMinutes: number;
  status: "on_track" | "at_risk" | "exceeded" | "completed";
  daysRemaining?: number;
}

/**
 * Create a new usage goal
 */
export const createGoal = async (input: {
  deviceId: string;
  type: GoalTypeEnum;
  targetMinutes: number;
  appId?: string;
  categoryId?: string;
  name?: string;
  endDate?: Date;
  createdById?: string;
}) => {
  // Validate input
  if (input.targetMinutes <= 0) {
    throw new Error("targetMinutes must be positive");
  }

  if (input.type === "APP_SPECIFIC" && !input.appId) {
    throw new Error("appId is required for APP_SPECIFIC goals");
  }

  if (input.type === "CATEGORY_SPECIFIC" && !input.categoryId) {
    throw new Error("categoryId is required for CATEGORY_SPECIFIC goals");
  }

  // @ts-ignore - Prisma client will be regenerated on build
  const goal = await prisma.usageGoal.create({
    data: {
      deviceId: input.deviceId,
      type: input.type,
      targetMinutes: input.targetMinutes,
      appId: input.appId,
      categoryId: input.categoryId,
      name: input.name,
      endDate: input.endDate,
      createdById: input.createdById,
      status: "ACTIVE" as GoalStatusEnum,
    },
    include: {
      app: true,
      category: true,
      device: true,
    },
  });

  return goal;
};

/**
 * Get all goals for a device
 */
export const getGoals = async (deviceId: string, status?: GoalStatusEnum) => {
  const where: any = { deviceId };
  if (status) {
    where.status = status;
  }

  // @ts-ignore - Prisma client will be regenerated on build
  const goals = await prisma.usageGoal.findMany({
    where,
    include: {
      app: true,
      category: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return goals;
};

/**
 * Get goal progress
 */
export const getGoalProgress = async (goalId: string): Promise<GoalProgress | null> => {
  // @ts-ignore - Prisma client will be regenerated on build
  const goal = await prisma.usageGoal.findUnique({
    where: { id: goalId },
    include: {
      app: true,
      category: true,
      device: true,
    },
  });

  if (!goal) {
    return null;
  }

  let currentMinutes = 0;

  // Calculate current usage based on goal type
  if (goal.type === "DAILY_TOTAL") {
    const daily = await getDailySummary(goal.deviceId);
    currentMinutes = Math.round(daily.totalSeconds / 60);
  } else if (goal.type === "WEEKLY_TOTAL") {
    const weekly = await getWeeklySummary(goal.deviceId);
    currentMinutes = Math.round(weekly.totalSeconds / 60);
  } else if (goal.type === "APP_SPECIFIC" && goal.appId) {
    const daily = await getDailySummary(goal.deviceId);
    const appUsage = daily.byApp.find((a: any) => a.appId === goal.appId) as any;
    currentMinutes = appUsage ? Math.round(appUsage.totalMinutes) : 0;
  } else if (goal.type === "CATEGORY_SPECIFIC" && goal.categoryId) {
    // For category goals, sum all apps in the category
    const daily = await getDailySummary(goal.deviceId);
    // Get category apps
    // @ts-ignore - Prisma client will be regenerated on build
    const category = await prisma.appCategory.findUnique({
      where: { id: goal.categoryId },
      include: { apps: { include: { app: true } } },
    });

    if (category) {
      const categoryAppPackages = new Set(
        category.apps.map((ca: any) => ca.app.packageName)
      );
      currentMinutes = daily.byApp
        .filter((a: any) => categoryAppPackages.has(a.packageName))
        .reduce((sum: number, a: any) => sum + Math.round(a.totalMinutes), 0);
    }
  }

  const percentage = (currentMinutes / goal.targetMinutes) * 100;
  const remainingMinutes = Math.max(0, goal.targetMinutes - currentMinutes);

  // Determine status
  let status: "on_track" | "at_risk" | "exceeded" | "completed";
  if (percentage >= 100) {
    status = "exceeded";
  } else if (percentage >= 90) {
    status = "at_risk";
  } else if (percentage >= 80) {
    status = "at_risk";
  } else {
    status = "on_track";
  }

  // Calculate days remaining if endDate is set
  let daysRemaining: number | undefined;
  if (goal.endDate) {
    const now = new Date();
    const diff = goal.endDate.getTime() - now.getTime();
    daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  return {
    goalId: goal.id,
    currentMinutes,
    targetMinutes: goal.targetMinutes,
    percentage: Math.round(percentage * 100) / 100, // Round to 2 decimals
    remainingMinutes,
    status,
    daysRemaining,
  };
};

/**
 * Get progress for all active goals
 */
export const getAllGoalProgress = async (deviceId: string): Promise<GoalProgress[]> => {
  const goals = await getGoals(deviceId, "ACTIVE");
  const progress = await Promise.all(
    goals.map((goal: any) => getGoalProgress(goal.id))
  );
  return progress.filter((p: GoalProgress | null): p is GoalProgress => p !== null);
};

/**
 * Update goal
 */
export const updateGoal = async (
  goalId: string,
  updates: {
    targetMinutes?: number;
    name?: string;
    status?: GoalStatusEnum;
    endDate?: Date | null;
  }
) => {
  // @ts-ignore - Prisma client will be regenerated on build
  const goal = await prisma.usageGoal.update({
    where: { id: goalId },
    data: updates,
    include: {
      app: true,
      category: true,
    },
  });

  return goal;
};

/**
 * Delete goal
 */
export const deleteGoal = async (goalId: string) => {
  // @ts-ignore - Prisma client will be regenerated on build
  await prisma.usageGoal.delete({
    where: { id: goalId },
  });
};

