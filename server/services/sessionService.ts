import { prisma } from "../prisma/client";

export const listSessionsForDevice = async (deviceId: string) => {
  const sessions = await prisma.focusSession.findMany({
    where: { deviceId },
    orderBy: { updatedAt: "desc" },
    include: { apps: true },
  });
  return sessions;
};

export const getSessionById = async (id: string) => {
  return prisma.focusSession.findUnique({
    where: { id },
    include: { apps: true, device: true },
  });
};

export const createSession = async (data: {
  deviceId: string;
  name: string;
  durationMinutes: number;
  apps: Array<{ packageName: string; appName?: string }>;
}) => {
  return prisma.focusSession.create({
    data: {
      deviceId: data.deviceId,
      name: data.name,
      durationMinutes: data.durationMinutes,
      apps: {
        create: data.apps.map((a) => ({
          packageName: a.packageName,
          appName: a.appName,
        })),
      },
    },
    include: { apps: true },
  });
};

export const updateSession = async (id: string, data: {
  name?: string;
  durationMinutes?: number;
  apps?: Array<{ packageName: string; appName?: string }>;
}) => {
  // Update session + replace apps if provided
  const updated = await prisma.focusSession.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.durationMinutes !== undefined ? { durationMinutes: data.durationMinutes } : {}),
    },
    include: { apps: true },
  });

  if (data.apps) {
    await prisma.focusSessionApp.deleteMany({ where: { sessionId: id } });
    if (data.apps.length > 0) {
      await prisma.focusSessionApp.createMany({
        data: data.apps.map((a) => ({
          sessionId: id,
          packageName: a.packageName,
          appName: a.appName,
        })),
      });
    }
  }

  return prisma.focusSession.findUnique({
    where: { id },
    include: { apps: true },
  });
};

export const deleteSession = async (id: string) => {
  // If this session is currently active for a device, clear it first.
  await prisma.activeFocusSession.deleteMany({ where: { sessionId: id } });
  await prisma.focusSessionApp.deleteMany({ where: { sessionId: id } });
  await prisma.focusSession.delete({ where: { id } });
};

export const startActiveSessionForDevice = async (deviceId: string, sessionId: string) => {
  const session = await prisma.focusSession.findUnique({
    where: { id: sessionId },
    include: { apps: true },
  });
  if (!session) throw new Error("NotFound");
  if (session.deviceId !== deviceId) throw new Error("Forbidden");

  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + session.durationMinutes * 60_000);

  const active = await prisma.activeFocusSession.upsert({
    where: { deviceId },
    update: {
      sessionId,
      startedAt,
      endsAt,
      pausedAt: null,
      pausedDurationMinutes: 0,
    },
    create: {
      deviceId,
      sessionId,
      startedAt,
      endsAt,
      pausedAt: null,
      pausedDurationMinutes: 0,
    },
    include: {
      session: { include: { apps: true } },
    },
  });

  return active;
};

export const stopActiveSessionForDevice = async (deviceId: string) => {
  await prisma.activeFocusSession.deleteMany({ where: { deviceId } });
};

export const getActiveSessionForDevice = async (deviceId: string) => {
  const active = await prisma.activeFocusSession.findUnique({
    where: { deviceId },
    include: { session: { include: { apps: true } } },
  });
  if (!active) return null;

  // Calculate effective end time (original endsAt + paused duration)
  const effectiveEndsAt = active.endsAt.getTime() + (active.pausedDurationMinutes * 60_000);
  const now = Date.now();
  
  // If paused, don't check expiration (timer is stopped)
  if (active.pausedAt) {
    return active;
  }
  
  // If not paused and expired, delete it
  if (effectiveEndsAt <= now) {
    await prisma.activeFocusSession.deleteMany({ where: { deviceId } });
    return null;
  }

  return active;
};

export const pauseActiveSessionForDevice = async (deviceId: string) => {
  const active = await prisma.activeFocusSession.findUnique({
    where: { deviceId },
  });
  if (!active) return null;
  
  // If already paused, return as-is
  if (active.pausedAt) return active;

  const now = new Date();
  await prisma.activeFocusSession.update({
    where: { deviceId },
    data: {
      pausedAt: now,
    },
  });

  return prisma.activeFocusSession.findUnique({
    where: { deviceId },
    include: { session: { include: { apps: true } } },
  });
};

export const resumeActiveSessionForDevice = async (deviceId: string) => {
  const active = await prisma.activeFocusSession.findUnique({
    where: { deviceId },
  });
  if (!active) return null;
  
  // If not paused, return as-is
  if (!active.pausedAt) return active;

  const now = new Date();
  const pausedDuration = Math.floor((now.getTime() - active.pausedAt.getTime()) / 60_000);
  const totalPausedMinutes = active.pausedDurationMinutes + pausedDuration;
  
  // Extend endsAt by the paused duration
  const newEndsAt = new Date(active.endsAt.getTime() + (pausedDuration * 60_000));

  await prisma.activeFocusSession.update({
    where: { deviceId },
    data: {
      pausedAt: null,
      pausedDurationMinutes: totalPausedMinutes,
      endsAt: newEndsAt,
    },
  });

  return prisma.activeFocusSession.findUnique({
    where: { deviceId },
    include: { session: { include: { apps: true } } },
  });
};


