import { prisma } from "../prisma/client";
import { OverrideStatus } from "@prisma/client";

export interface CreateOverrideRequestInput {
  deviceId: string;
  appId: string;
  requestedMinutes: number;
  reason?: string;
}

export interface UpdateOverrideRequestInput {
  status: OverrideStatus;
  approvedById?: string;
  expiresAt?: Date;
}

export const createOverrideRequest = async (input: CreateOverrideRequestInput) => {
  // Calculate expiration (default: 24 hours from now)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  const request = await prisma.overrideRequest.create({
    data: {
      deviceId: input.deviceId,
      appId: input.appId,
      requestedMinutes: input.requestedMinutes,
      reason: input.reason,
      status: OverrideStatus.PENDING,
      expiresAt,
    },
    include: {
      app: true,
      device: {
        include: {
          user: true,
        },
      },
    },
  });

  return request;
};

export const updateOverrideRequest = async (
  id: string,
  input: UpdateOverrideRequestInput
) => {
  const updateData: any = {
    status: input.status,
    updatedAt: new Date(),
  };

  if (input.status === OverrideStatus.APPROVED) {
    updateData.approvedById = input.approvedById;
    updateData.approvedAt = new Date();
    if (input.expiresAt) {
      updateData.expiresAt = input.expiresAt;
    }
  }

  const request = await prisma.overrideRequest.update({
    where: { id },
    data: updateData,
    include: {
      app: true,
      device: {
        include: {
          user: true,
        },
      },
      approvedBy: true,
    },
  });

  return request;
};

export const getOverrideRequests = async (filters?: {
  deviceId?: string;
  status?: OverrideStatus;
}) => {
  const where: any = {};
  if (filters?.deviceId) where.deviceId = filters.deviceId;
  if (filters?.status) where.status = filters.status;

  return prisma.overrideRequest.findMany({
    where,
    include: {
      app: true,
      device: {
        include: {
          user: true,
        },
      },
      approvedBy: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getOverrideRequest = async (id: string) => {
  return prisma.overrideRequest.findUnique({
    where: { id },
    include: {
      app: true,
      device: {
        include: {
          user: true,
        },
      },
      approvedBy: true,
    },
  });
};

export const getActiveOverridesForDevice = async (deviceId: string) => {
  const now = new Date();
  return prisma.overrideRequest.findMany({
    where: {
      deviceId,
      status: OverrideStatus.APPROVED,
      expiresAt: {
        gt: now,
      },
    },
    include: {
      app: true,
    },
  });
};

export const expireOverrides = async () => {
  const now = new Date();
  const result = await prisma.overrideRequest.updateMany({
    where: {
      status: OverrideStatus.APPROVED,
      expiresAt: {
        lte: now,
      },
    },
    data: {
      status: OverrideStatus.EXPIRED,
    },
  });

  return result.count;
};

