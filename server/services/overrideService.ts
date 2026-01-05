import { prisma } from "../prisma/client";
import { OverrideStatus } from "@prisma/client";
import { sendOneSignalNotificationToAdmin } from "./oneSignalService";

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

  // Notify admin phone via OneSignal (best-effort; do not block request creation)
  try {
    const userLabel =
      request.device?.user?.name ||
      request.device?.user?.email ||
      request.device?.userId ||
      "Unknown user";
    const appLabel = request.app?.name || request.app?.packageName || "Unknown app";
    const deviceLabel = request.device?.name || "Unknown device";

    const title = "Override Request";
    const message =
      `${userLabel} requested +${request.requestedMinutes} min for ${appLabel}` +
      `\nDevice: ${deviceLabel}` +
      (request.reason ? `\nReason: ${request.reason}` : "");

    // Fire-and-forget. If OneSignal isn't configured, the service logs and returns.
    sendOneSignalNotificationToAdmin(title, message, {
      type: "override_request",
      overrideRequestId: request.id,
      deviceId: request.deviceId,
      appId: request.appId,
      requestedMinutes: request.requestedMinutes,
      status: request.status,
    }).catch((err) => console.warn("[OneSignal] send failed", err));
  } catch (e) {
    // Never fail the API just because notification formatting failed
    console.warn("[OneSignal] Notification formatting failed", e);
  }

  return request;
};

export const updateOverrideRequest = async (
  id: string,
  input: UpdateOverrideRequestInput
) => {
  // Validate id is not empty
  if (!id || id.trim() === "") {
    throw new Error("Override request id is required");
  }

  const updateData: any = {
    status: input.status,
    updatedAt: new Date(),
  };

  if (input.status === OverrideStatus.APPROVED) {
    updateData.approvedById = input.approvedById;
    updateData.approvedAt = new Date();

    // If expiresAt is provided, use it; otherwise calculate from requestedMinutes
    if (input.expiresAt) {
      updateData.expiresAt = input.expiresAt;
    } else {
      // Get the request to find requestedMinutes
      const existingRequest = await prisma.overrideRequest.findUnique({
        where: { id },
        select: { requestedMinutes: true },
      });

      if (existingRequest) {
        // Set expiration to requestedMinutes from now
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + existingRequest.requestedMinutes);
        updateData.expiresAt = expiresAt;
      }
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
  // Validate id is not empty
  if (!id || id.trim() === "") {
    throw new Error("Override request id is required");
  }

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

