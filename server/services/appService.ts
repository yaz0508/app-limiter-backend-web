import { prisma } from "../prisma/client";

export const findOrCreateApp = async (
  packageName: string,
  name?: string
) => {
  const existing = await prisma.app.findUnique({ where: { packageName } });
  if (existing) {
    // Update the app name if a new name is provided and it's different
    if (name && name !== existing.name && name !== packageName) {
      return prisma.app.update({
        where: { packageName },
        data: { name },
      });
    }
    return existing;
  }

  return prisma.app.create({
    data: {
      packageName,
      name: name ?? packageName,
    },
  });
};

export const listApps = async () => {
  return prisma.app.findMany({
    orderBy: { name: "asc" },
  });
};

export const getAppsUsedOnDevice = async (deviceId: string) => {
  // Get unique apps that have usage logs for this device
  const usageLogs = await prisma.usageLog.findMany({
    where: { deviceId },
    select: {
      app: {
        select: {
          id: true,
          name: true,
          packageName: true,
        },
      },
    },
  });

  // Extract unique apps
  const uniqueApps = new Map<string, { id: string; name: string; packageName: string }>();
  for (const log of usageLogs) {
    if (log.app && !uniqueApps.has(log.app.id)) {
      uniqueApps.set(log.app.id, log.app);
    }
  }

  // Sort by name
  return Array.from(uniqueApps.values()).sort((a, b) => a.name.localeCompare(b.name));
};


