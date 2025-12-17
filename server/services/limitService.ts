import { prisma } from "../prisma/client";

export const upsertLimit = async (data: {
  deviceId: string;
  appId: string;
  dailyLimitMinutes: number;
  createdById: string;
}) => {
  return prisma.limit.upsert({
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
};

export const listLimitsForDevice = async (deviceId: string) => {
  return prisma.limit.findMany({
    where: { deviceId },
    include: { app: true },
  });
};

export const deleteLimit = async (deviceId: string, appId: string) => {
  await prisma.limit.delete({
    where: { deviceId_appId: { deviceId, appId } },
  });
};


