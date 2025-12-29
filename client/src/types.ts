export type Role = "ADMIN" | "USER";

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
  user?: User;
  limits?: Limit[];
  lastSeenAt?: string | null;
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

export interface FocusSessionApp {
  id: string;
  sessionId: string;
  packageName: string;
  appName?: string | null;
}

export interface FocusSession {
  id: string;
  deviceId: string;
  name: string;
  durationMinutes: number;
  apps: FocusSessionApp[];
  createdAt: string;
  updatedAt: string;
}

export interface ActiveFocusSession {
  id: string;
  deviceId: string;
  sessionId: string;
  startedAt: string;
  endsAt: string;
  session: FocusSession;
}

export interface CategoryApp {
  id: string;
  categoryId: string;
  appId: string;
  app: App;
}

export interface AppCategory {
  id: string;
  name: string;
  description?: string | null;
  apps: CategoryApp[];
  _count?: {
    apps: number;
    limits: number;
  };
}

export interface CategoryLimit {
  id: string;
  deviceId: string;
  categoryId: string;
  dailyLimitMinutes: number;
  category: AppCategory;
  device: Device;
}

export enum OverrideStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  DENIED = "DENIED",
  EXPIRED = "EXPIRED",
}

export interface OverrideRequest {
  id: string;
  deviceId: string;
  appId: string;
  requestedMinutes: number;
  reason?: string | null;
  status: OverrideStatus;
  approvedById?: string | null;
  approvedAt?: string | null;
  expiresAt?: string | null;
  app: App;
  device: Device;
  approvedBy?: User | null;
  createdAt: string;
  updatedAt: string;
}

export interface UsageInsight {
  type: "pattern" | "trend" | "comparison" | "prediction";
  title: string;
  description: string;
  severity: "info" | "warning" | "success";
  data?: any;
}


