import { prisma } from "../prisma/client";

export const upsertLimit = async (data: {
  deviceId: string;
  appId: string;
  dailyLimitMinutes: number;
  createdById: string;
}) => {
  try {
    return await prisma.limit.upsert({
      where: {
        deviceId_appId: { deviceId: data.deviceId, appId: data.appId },
      },
      update: {
        dailyLimitMinutes: data.dailyLimitMinutes,
        createdById: data.createdById,
      },
      create: {
        deviceId: data.deviceId,
        appId: data.appId,
        dailyLimitMinutes: data.dailyLimitMinutes,
        createdById: data.createdById,
      },
      include: { app: true, device: true },
    });
  } catch (error: any) {
    // Handle case where app or device references are orphaned
    if (error.message?.includes("Field app is required") || error.message?.includes("Field device is required")) {
      console.warn("[LimitService] Found orphaned references, querying without relations");
      const limit = await prisma.limit.upsert({
        where: {
          deviceId_appId: { deviceId: data.deviceId, appId: data.appId },
        },
        update: {
          dailyLimitMinutes: data.dailyLimitMinutes,
          createdById: data.createdById,
        },
        create: {
          deviceId: data.deviceId,
          appId: data.appId,
          dailyLimitMinutes: data.dailyLimitMinutes,
          createdById: data.createdById,
        },
        // Don't include relations
      });

      // Fetch app and device separately
      const [app, device] = await Promise.all([
        prisma.app.findUnique({ where: { id: data.appId } }),
        prisma.device.findUnique({ where: { id: data.deviceId } }),
      ]);

      if (!app || !device) {
        throw new Error("App or device not found");
      }

      return {
        ...limit,
        app,
        device,
      };
    }
    throw error;
  }
};

export const listLimitsForDevice = async (deviceId: string) => {
  try {
    const limits = await prisma.limit.findMany({
      where: { deviceId },
      include: { app: true },
    });

    // Filter out limits with missing apps (orphaned limits)
    return limits.filter((limit) => limit.app !== null);
  } catch (error: any) {
    // Handle case where limits have orphaned app references
    if (error.message?.includes("Field app is required")) {
      console.warn("[LimitService] Found orphaned limits, querying without app relation");
      const limits = await prisma.limit.findMany({
        where: { deviceId },
        // Don't include app relation
      });

      // Fetch apps separately and filter out orphaned limits
      const appIds = limits.map((l) => l.appId);
      const apps = await prisma.app.findMany({
        where: { id: { in: appIds } },
      });
      const appMap = new Map(apps.map((a) => [a.id, a]));

      return limits
        .filter((limit) => appMap.has(limit.appId))
        .map((limit) => ({
          ...limit,
          app: appMap.get(limit.appId)!,
        }));
    }
    throw error;
  }
};

export const deleteLimit = async (deviceId: string, appId: string) => {
  await prisma.limit.delete({
    where: { deviceId_appId: { deviceId, appId } },
  });
};


