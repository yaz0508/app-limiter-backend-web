import { Role } from "@prisma/client";
import { prisma } from "../prisma/client";

export const createDevice = async (
  data: {
    name: string;
    os?: string;
    deviceIdentifier: string;
    userId?: string;
  },
  requester: Express.UserPayload
) => {
  const ownerId =
    requester.role === Role.ADMIN ? data.userId ?? requester.id : requester.id;

  // Idempotent device registration:
  // - If deviceIdentifier already exists for same owner, update name/os and return it.
  // - If it exists for a different owner, block non-admins; allow admins to reassign if userId provided.
  const existing = await prisma.device.findUnique({
    where: { deviceIdentifier: data.deviceIdentifier },
  });

  if (existing) {
    // If device already belongs to the same user, just update and return (idempotent).
    if (existing.userId === ownerId) {
      return prisma.device.update({
        where: { id: existing.id },
        data: {
          name: data.name ?? existing.name,
          os: data.os ?? existing.os,
          lastSeenAt: new Date(),
        },
      });
    }

    // Device belongs to a different user.
    if (requester.role !== Role.ADMIN) {
      throw new Error("DeviceIdentifierInUse");
    }

    // Admin may optionally reassign ownership by specifying userId.
    const newOwnerId = data.userId ? data.userId : existing.userId;

    return prisma.device.update({
      where: { id: existing.id },
      data: {
        name: data.name ?? existing.name,
        os: data.os ?? existing.os,
        userId: newOwnerId,
        lastSeenAt: new Date(),
      },
    });
  }

  return prisma.device.create({
    data: {
      name: data.name,
      os: data.os,
      deviceIdentifier: data.deviceIdentifier,
      user: { connect: { id: ownerId } },
      lastSeenAt: new Date(),
    },
  });
};

export const listDevicesForRequester = async (
  requester: Express.UserPayload
) => {
  const where =
    requester.role === Role.ADMIN ? {} : { userId: requester.id };

  // For admins, we need to handle orphaned devices (devices with invalid userId).
  // Prisma will throw an error if we include a required relation that doesn't exist.
  // Solution: Query devices without user, then fetch users separately and map them.
  if (requester.role === Role.ADMIN) {
    try {
      const devices = await prisma.device.findMany({
        where,
        include: {
          limits: {
            include: { app: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Get unique userIds and fetch users
      const userIds = [...new Set(devices.map((d) => d.userId).filter(Boolean))];
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, name: true, role: true },
      });

      const userMap = new Map(users.map((u) => [u.id, u]));

      // Map devices with users, filter out orphaned devices
      // Also filter out limits with missing apps (orphaned limits)
      return devices
        .map((device) => ({
          ...device,
          user: userMap.get(device.userId) || null,
          limits: device.limits.filter((limit) => limit.app !== null),
        }))
        .filter((device) => device.user !== null);
    } catch (error: any) {
      // Handle case where limits have orphaned app references
      if (error.message?.includes("Field app is required")) {
        console.warn("[DeviceService] Found orphaned limits, querying without app relation");
        const devices = await prisma.device.findMany({
          where,
          include: {
            limits: true, // Don't include app relation
          },
          orderBy: { createdAt: "desc" },
        });

        // Fetch apps separately and filter out orphaned limits
        const appIds = [...new Set(devices.flatMap((d) => d.limits.map((l) => l.appId)))];
        const apps = await prisma.app.findMany({
          where: { id: { in: appIds } },
        });
        const appMap = new Map(apps.map((a) => [a.id, a]));

        const userIds = [...new Set(devices.map((d) => d.userId).filter(Boolean))];
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, name: true, role: true },
        });
        const userMap = new Map(users.map((u) => [u.id, u]));

        return devices
          .map((device) => ({
            ...device,
            user: userMap.get(device.userId) || null,
            limits: device.limits
              .filter((limit) => appMap.has(limit.appId))
              .map((limit) => ({
                ...limit,
                app: appMap.get(limit.appId)!,
              })),
          }))
          .filter((device) => device.user !== null);
      }
      throw error;
    }
  }

  // For non-admins, user relation is not needed
  try {
    const devices = await prisma.device.findMany({
      where,
      include: {
        limits: {
          include: { app: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter out limits with missing apps (orphaned limits)
    return devices.map((device) => ({
      ...device,
      limits: device.limits.filter((limit) => limit.app !== null),
    }));
  } catch (error: any) {
    // Handle case where limits have orphaned app references
    if (error.message?.includes("Field app is required")) {
      console.warn("[DeviceService] Found orphaned limits, querying without app relation");
      const devices = await prisma.device.findMany({
        where,
        include: {
          limits: true, // Don't include app relation
        },
        orderBy: { createdAt: "desc" },
      });

      // Fetch apps separately and filter out orphaned limits
      const appIds = [...new Set(devices.flatMap((d) => d.limits.map((l) => l.appId)))];
      const apps = await prisma.app.findMany({
        where: { id: { in: appIds } },
      });
      const appMap = new Map(apps.map((a) => [a.id, a]));

      return devices.map((device) => ({
        ...device,
        limits: device.limits
          .filter((limit) => appMap.has(limit.appId))
          .map((limit) => ({
            ...limit,
            app: appMap.get(limit.appId)!,
          })),
      }));
    }
    throw error;
  }
};

export const getDeviceForRequester = async (
  id: string,
  requester: Express.UserPayload
) => {
  try {
    const device = await prisma.device.findUnique({
      where: { id },
      include: {
        limits: {
          include: { app: true },
        },
      },
    });

    if (!device) return null;
    if (requester.role !== Role.ADMIN && device.userId !== requester.id) {
      throw new Error("Forbidden");
    }

    // Filter out limits with missing apps (orphaned limits)
    return {
      ...device,
      limits: device.limits.filter((limit) => limit.app !== null),
    };
  } catch (error: any) {
    // Handle case where limits have orphaned app references
    if (error.message?.includes("Field app is required")) {
      console.warn("[DeviceService] Found orphaned limits, querying without app relation");
      const device = await prisma.device.findUnique({
        where: { id },
        include: {
          limits: true, // Don't include app relation
        },
      });

      if (!device) return null;
      if (requester.role !== Role.ADMIN && device.userId !== requester.id) {
        throw new Error("Forbidden");
      }

      // Fetch apps separately and filter out orphaned limits
      const appIds = device.limits.map((l) => l.appId);
      const apps = await prisma.app.findMany({
        where: { id: { in: appIds } },
      });
      const appMap = new Map(apps.map((a) => [a.id, a]));

      return {
        ...device,
        limits: device.limits
          .filter((limit) => appMap.has(limit.appId))
          .map((limit) => ({
            ...limit,
            app: appMap.get(limit.appId)!,
          })),
      };
    }
    throw error;
  }
};

export const updateDevice = async (
  id: string,
  data: { name?: string; os?: string; userId?: string },
  requester: Express.UserPayload
) => {
  const device = await prisma.device.findUnique({ where: { id } });
  if (!device) throw new Error("NotFound");

  // Non-admins can only update their own devices and cannot change userId
  if (requester.role !== Role.ADMIN && device.userId !== requester.id) {
    throw new Error("Forbidden");
  }

  // Only admins can reassign devices to different users
  if (data.userId && requester.role !== Role.ADMIN) {
    throw new Error("Forbidden");
  }

  // Verify target user exists if reassigning
  if (data.userId) {
    const targetUser = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!targetUser) {
      throw new Error("UserNotFound");
    }
  }

  return prisma.device.update({
    where: { id },
    data: {
      name: data.name ?? device.name,
      os: data.os ?? device.os,
      userId: data.userId ?? device.userId,
    },
  });
};

export const deleteDevice = async (
  id: string,
  requester: Express.UserPayload
) => {
  const device = await prisma.device.findUnique({ where: { id } });
  if (!device) throw new Error("NotFound");
  if (requester.role !== Role.ADMIN && device.userId !== requester.id) {
    throw new Error("Forbidden");
  }
  await prisma.device.delete({ where: { id } });
};

export const findDeviceByIdentifier = async (deviceIdentifier: string) => {
  const device = await prisma.device.findUnique({
    where: { deviceIdentifier },
  });

  if (!device) return null;

  // Touch lastSeenAt for active devices (best-effort; don't block the request)
  prisma.device
    .update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    })
    .catch(() => {});

  // Fetch user separately to handle orphaned devices
  const user = await prisma.user.findUnique({
    where: { id: device.userId },
    select: { id: true, email: true, name: true, role: true },
  });

  return {
    ...device,
    user,
  };
};


