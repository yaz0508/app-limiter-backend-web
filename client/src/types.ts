export type Role = "ADMIN" | "PARENT" | "USER";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Device {
  id: string;
  name: string;
  os?: string | null;
  deviceIdentifier: string;
  userId: string;
  limits?: Limit[];
}

export interface App {
  id: string;
  name: string;
  packageName: string;
}

export interface Limit {
  id: string;
  deviceId: string;
  appId: string;
  dailyLimitMinutes: number;
  app: App;
}

export interface UsageAggregate {
  appId: string;
  appName: string;
  packageName: string;
  totalSeconds: number;
  totalMinutes: number;
  sessions: number;
}

export interface DailyUsageSummary {
  date: string;
  totalSeconds: number;
  byApp: UsageAggregate[];
}

export interface WeeklyUsageSummary {
  start: string;
  end: string;
  totalSeconds: number;
  byApp: UsageAggregate[];
}


