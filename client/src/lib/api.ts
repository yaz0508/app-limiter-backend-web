import { ActiveFocusSession, App, AppCategory, CategoryLimit, DailyUsageSummary, Device, FocusSession, GoalProgress, GoalStatus, GoalType, HourlyUsage, Limit, OverrideRequest, OverrideStatus, PeakUsageHour, UsageGoal, UsageInsight, User, WeeklyUsageSummary } from "../types";

// Ensure API_URL ends with /api, but handle cases where it might already include it
const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
const API_URL = baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;

// Log API URL in development for debugging
if (import.meta.env.DEV) {
  console.log("API Base URL:", baseUrl);
  console.log("API URL:", API_URL);
  console.log("VITE_API_URL env var:", import.meta.env.VITE_API_URL);
}

type Options = {
  method?: string;
  token?: string | null;
  body?: unknown;
};

const apiRequest = async <T>(path: string, options: Options = {}): Promise<T> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const url = `${API_URL}${path}`;
  console.log(`[API] ${options.method || "GET"} ${url}`, options.body ? { body: JSON.parse(JSON.stringify(options.body)) } : "");

  try {
    const res = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    console.log(`[API] Response status: ${res.status} ${res.statusText}`);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const message = errorData.message || res.statusText;
      console.error(`[API] Error response:`, errorData);
      throw new Error(message);
    }

    const data = await res.json();
    console.log(`[API] Success response:`, data);
    return data;
  } catch (error) {
    // Handle network errors (connection refused, CORS, timeout, etc.)
    if (
      error instanceof TypeError ||
      error instanceof DOMException ||
      (error instanceof Error &&
        (error.message.includes("fetch") ||
          error.message.includes("network") ||
          error.message.includes("Failed to fetch") ||
          error.message.includes("NetworkError") ||
          error.message.includes("CORS")))
    ) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isCorsError = errorMsg.includes("CORS") ||
        (error instanceof TypeError && errorMsg.includes("Failed to fetch"));

      if (isCorsError) {
        const currentOrigin = window.location.origin;
        throw new Error(
          `CORS error: The backend at ${API_URL} is blocking requests from origin: ${currentOrigin}\n\n` +
          `To fix this:\n` +
          `1. Go to Render dashboard → Your service → Environment\n` +
          `2. Update CORS_ORIGIN to include: ${currentOrigin}\n` +
          `3. Or set it to: ${currentOrigin} (if single origin)\n` +
          `4. Save and wait for redeploy`
        );
      }

      throw new Error(
        `Network error: Unable to connect to the server. Please check if the backend is running at ${API_URL}. If the backend is on Render free tier, it may be sleeping - wait 30-60 seconds and try again.`
      );
    }
    // Re-throw other errors as-is
    throw error;
  }
};

export const loginRequest = (email: string, password: string) =>
  apiRequest<{ token: string; user: User }>("/auth/login", {
    method: "POST",
    body: { email, password },
  });

export const registerRequest = (email: string, name: string, password: string) =>
  apiRequest<{ token: string; user: User }>("/auth/register", {
    method: "POST",
    body: { email, name, password },
  });

export const getProfile = (token: string) =>
  apiRequest<{ user: User }>("/auth/me", { token });

export const getUsers = (token: string) =>
  apiRequest<{ users: User[] }>("/users", { token });

export const getDevices = (token: string) =>
  apiRequest<{ devices: Device[] }>("/devices", { token });

export const createDevice = (
  token: string,
  payload: { name: string; os?: string; deviceIdentifier: string }
) => apiRequest<{ device: Device }>("/devices", { token, method: "POST", body: payload });

export const getLimits = (token: string, deviceId: string) =>
  apiRequest<{ limits: Limit[] }>(`/limits/device/${deviceId}`, { token });

export const upsertLimit = (
  token: string,
  payload: { deviceId: string; appPackage: string; appName?: string; dailyLimitMinutes: number }
) => apiRequest<{ limit: Limit }>("/limits", { token, method: "POST", body: payload });

export const deleteLimit = (token: string, deviceId: string, appId: string) =>
  apiRequest<void>(`/limits/${deviceId}/${appId}`, { token, method: "DELETE" });

export const getDailyUsage = (token: string, deviceId: string, date?: string) => {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  return apiRequest<DailyUsageSummary>(`/usage/summary/daily/${deviceId}${query}`, { token });
};

export const getWeeklyUsage = (token: string, deviceId: string, start?: string) => {
  const query = start ? `?start=${encodeURIComponent(start)}` : "";
  return apiRequest<WeeklyUsageSummary>(`/usage/summary/weekly/${deviceId}${query}`, { token });
};

export const getCustomRangeUsage = (token: string, deviceId: string, start: string, end: string) => {
  const query = `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
  return apiRequest<WeeklyUsageSummary>(`/usage/summary/range/${deviceId}${query}`, { token });
};

export const getDailySeries = (token: string, deviceId: string, days: number = 30) => {
  const query = `?days=${encodeURIComponent(String(days))}`;
  return apiRequest<{ deviceId: string; days: number; series: Array<{ date: string; totalSeconds: number; totalMinutes: number; sessions: number }> }>(
    `/usage/summary/daily-series/${deviceId}${query}`,
    { token }
  );
};

// Aggregated analytics endpoints (across all devices)
export const getAggregatedWeeklyUsage = (token: string, start?: string) => {
  const query = start ? `?start=${encodeURIComponent(start)}` : "";
  return apiRequest<WeeklyUsageSummary>(`/usage/summary/aggregated/weekly${query}`, { token });
};

export const getAggregatedCustomRangeUsage = (token: string, start: string, end: string) => {
  const query = `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
  return apiRequest<WeeklyUsageSummary>(`/usage/summary/aggregated/range${query}`, { token });
};

export const getAggregatedDailySeries = (token: string, days: number = 30) => {
  const query = `?days=${encodeURIComponent(String(days))}`;
  return apiRequest<{ days: number; series: Array<{ date: string; totalSeconds: number; totalMinutes: number; sessions: number }> }>(
    `/usage/summary/aggregated/daily-series${query}`,
    { token }
  );
};

// Analytics API endpoints
export const getDailyAnalytics = (token: string, deviceId: string) =>
  apiRequest<any>(`/analytics/daily/${deviceId}`, { token });

export const getWeeklyAnalytics = (token: string, deviceId: string) =>
  apiRequest<any>(`/analytics/weekly/${deviceId}`, { token });

export const getMonthlyAnalytics = (token: string, deviceId: string) =>
  apiRequest<any>(`/analytics/monthly/${deviceId}`, { token });

export const getTopApps = (token: string, deviceId: string, period: string = "weekly", limit: number = 5) => {
  const query = `?period=${encodeURIComponent(period)}&limit=${limit}`;
  return apiRequest<{ topApps: any[] }>(`/analytics/top-apps/${deviceId}${query}`, { token });
};

export const getBlockEvents = (token: string, deviceId: string, limit: number = 50) => {
  const query = `?limit=${limit}`;
  return apiRequest<{ events: any[] }>(`/analytics/block-events/${deviceId}${query}`, { token });
};

export const updateUser = (
  token: string,
  userId: string,
  payload: { name?: string; email?: string; role?: string; password?: string }
) => apiRequest<{ user: User }>(`/users/${userId}`, { token, method: "PUT", body: payload });

export const createUser = (
  token: string,
  payload: { name: string; email: string; password: string; role?: string }
) => apiRequest<{ user: User }>("/users", { token, method: "POST", body: payload });

export const deleteUser = (token: string, userId: string) =>
  apiRequest<void>(`/users/${userId}`, { token, method: "DELETE" });

export const updateDevice = (
  token: string,
  deviceId: string,
  payload: { name?: string; os?: string; userId?: string }
) => apiRequest<{ device: Device }>(`/devices/${deviceId}`, { token, method: "PUT", body: payload });

export const deleteDevice = (token: string, deviceId: string) =>
  apiRequest<void>(`/devices/${deviceId}`, { token, method: "DELETE" });

export const getDeviceApps = (token: string, deviceId: string) =>
  apiRequest<{ apps: App[] }>(`/apps/device/${deviceId}`, { token });

export const getAllApps = (token: string) =>
  apiRequest<{ apps: App[] }>("/apps", { token });

// Sessions API
export const getSessions = (token: string, deviceId: string) =>
  apiRequest<{ sessions: FocusSession[] }>(`/sessions/device/${deviceId}`, { token });

export const createSession = (
  token: string,
  payload: {
    deviceId: string;
    name: string;
    durationMinutes: number;
    apps: Array<{ packageName: string; appName?: string }>;
  }
) => apiRequest<{ session: FocusSession }>(`/sessions`, { token, method: "POST", body: payload });

export const updateSession = (
  token: string,
  id: string,
  payload: {
    name?: string;
    durationMinutes?: number;
    apps?: Array<{ packageName: string; appName?: string }>;
  }
) => apiRequest<{ session: FocusSession }>(`/sessions/${id}`, { token, method: "PUT", body: payload });

export const deleteSession = (token: string, id: string) =>
  apiRequest<void>(`/sessions/${id}`, { token, method: "DELETE" });

export const getActiveSession = (token: string, deviceId: string) =>
  apiRequest<{ active: ActiveFocusSession | null }>(`/sessions/device/${deviceId}/active`, { token });

export const startSession = (token: string, deviceId: string, sessionId: string) =>
  apiRequest<{ active: ActiveFocusSession }>(`/sessions/device/${deviceId}/start`, {
    token,
    method: "POST",
    body: { sessionId },
  });

export const stopSession = (token: string, deviceId: string) =>
  apiRequest<void>(`/sessions/device/${deviceId}/stop`, { token, method: "POST" });

export const pauseSession = (token: string, deviceId: string) =>
  apiRequest<{ active: ActiveFocusSession }>(`/sessions/device/${deviceId}/pause`, { token, method: "POST" });

export const resumeSession = (token: string, deviceId: string) =>
  apiRequest<{ active: ActiveFocusSession }>(`/sessions/device/${deviceId}/resume`, { token, method: "POST" });

// Categories API
export const getCategories = (token: string) =>
  apiRequest<{ categories: AppCategory[] }>("/categories", { token });

export const getCategory = (token: string, id: string) =>
  apiRequest<{ category: AppCategory }>(`/categories/${id}`, { token });

export const createCategory = (
  token: string,
  payload: { name: string; description?: string; appIds?: string[] }
) => apiRequest<{ category: AppCategory }>("/categories", { token, method: "POST", body: payload });

export const updateCategory = (
  token: string,
  id: string,
  payload: { name?: string; description?: string; appIds?: string[] }
) => apiRequest<{ category: AppCategory }>(`/categories/${id}`, { token, method: "PUT", body: payload });

export const deleteCategory = (token: string, id: string) =>
  apiRequest<void>(`/categories/${id}`, { token, method: "DELETE" });

export const createCategoryLimit = (
  token: string,
  payload: { deviceId: string; categoryId: string; dailyLimitMinutes: number }
) => apiRequest<{ limit: CategoryLimit }>("/categories/limits", { token, method: "POST", body: payload });

export const getCategoryLimits = (token: string, deviceId: string) =>
  apiRequest<{ limits: CategoryLimit[] }>(`/categories/limits/device/${deviceId}`, { token });

export const deleteCategoryLimit = (token: string, deviceId: string, categoryId: string) =>
  apiRequest<void>(`/categories/limits/device/${deviceId}/category/${categoryId}`, { token, method: "DELETE" });

// Override Requests API
export const getOverrideRequests = (token: string, filters?: { deviceId?: string; status?: OverrideStatus }) => {
  const query = new URLSearchParams();
  if (filters?.deviceId) query.append("deviceId", filters.deviceId);
  if (filters?.status) query.append("status", filters.status);
  const queryString = query.toString();
  return apiRequest<{ requests: OverrideRequest[] }>(`/overrides${queryString ? `?${queryString}` : ""}`, { token });
};

export const getOverrideRequest = (token: string, id: string) =>
  apiRequest<{ request: OverrideRequest }>(`/overrides/${id}`, { token });

export const createOverrideRequest = (
  token: string,
  payload: { deviceId?: string; deviceIdentifier?: string; appId: string; requestedMinutes: number; reason?: string }
) => apiRequest<{ request: OverrideRequest }>("/overrides", { token, method: "POST", body: payload });

export const updateOverrideRequest = (
  token: string,
  id: string,
  payload: { status: OverrideStatus; expiresAt?: string }
) => apiRequest<{ request: OverrideRequest }>(`/overrides/${id}`, { token, method: "PUT", body: payload });

export const getActiveOverrides = (token: string, deviceId: string) =>
  apiRequest<{ overrides: OverrideRequest[] }>(`/overrides/device/${deviceId}/active`, { token });

// Insights API
export const getUsageInsights = (token: string, deviceId: string, days?: number) => {
  const query = days ? `?days=${days}` : "";
  return apiRequest<{ insights: UsageInsight[] }>(`/insights/device/${deviceId}${query}`, { token });
};

// Goals API
export const createGoal = (
  token: string,
  deviceId: string,
  payload: {
    type: GoalType;
    targetMinutes: number;
    appId?: string;
    categoryId?: string;
    name?: string;
    endDate?: string;
  }
) => apiRequest<{ goal: UsageGoal }>(`/device/${deviceId}/goals`, { token, method: "POST", body: payload });

export const getGoals = (token: string, deviceId: string, status?: GoalStatus) => {
  const query = status ? `?status=${status}` : "";
  return apiRequest<{ goals: UsageGoal[] }>(`/device/${deviceId}/goals${query}`, { token });
};

export const getGoalProgress = (token: string, goalId: string) =>
  apiRequest<{ progress: GoalProgress }>(`/goals/${goalId}/progress`, { token });

export const getAllGoalProgress = (token: string, deviceId: string) =>
  apiRequest<{ progress: GoalProgress[] }>(`/device/${deviceId}/goals/progress`, { token });

export const updateGoal = (
  token: string,
  goalId: string,
  payload: {
    targetMinutes?: number;
    name?: string;
    status?: GoalStatus;
    endDate?: string | null;
  }
) => apiRequest<{ goal: UsageGoal }>(`/goals/${goalId}`, { token, method: "PATCH", body: payload });

export const deleteGoal = (token: string, goalId: string) =>
  apiRequest<void>(`/goals/${goalId}`, { token, method: "DELETE" });

// Hourly Usage API
export const getHourlyUsage = (token: string, deviceId: string, date?: string) => {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  return apiRequest<{ date: string; hourly: HourlyUsage[] }>(`/hourly/device/${deviceId}/hourly${query}`, { token });
};

export const getDailyHourlyUsage = (token: string, deviceId: string, start: string, end: string) => {
  const query = `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
  return apiRequest<{ dailyHourly: Array<{ date: string; hours: HourlyUsage[]; totalMinutes: number }> }>(
    `/hourly/device/${deviceId}/hourly/range${query}`,
    { token }
  );
};

export const getPeakUsageHours = (token: string, deviceId: string, days?: number) => {
  const query = days ? `?days=${days}` : "";
  return apiRequest<{ peakHours: PeakUsageHour[] }>(`/hourly/device/${deviceId}/hourly/peak${query}`, { token });
};


