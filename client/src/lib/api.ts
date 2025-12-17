import { DailyUsageSummary, Device, Limit, User, WeeklyUsageSummary } from "../types";

// Ensure API_URL ends with /api, but handle cases where it might already include it
const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
const API_URL = baseUrl.endsWith("/api") ? baseUrl : `${baseUrl}/api`;

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

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const message = errorData.message || res.statusText || `Request failed with status ${res.status}`;
      throw new Error(message);
    }

    return res.json();
  } catch (error) {
    // Handle network errors (CORS, connection refused, etc.)
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(
        `Network error: Unable to connect to the server. Please check if the backend is running at ${API_URL}`
      );
    }
    throw error;
  }
};

export const loginRequest = (email: string, password: string) =>
  apiRequest<{ token: string; user: User }>("/auth/login", {
    method: "POST",
    body: { email, password },
  });

export const getProfile = (token: string) =>
  apiRequest<{ user: User }>("/auth/me", { token });

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


