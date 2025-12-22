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
    if (requester.role !== Role.ADMIN && existing.userId !== requester.id) {
      throw new Error("DeviceIdentifierInUse");
    }

    // Admin may optionally reassign ownership by specifying userId.
    const newOwnerId =
      requester.role === Role.ADMIN && data.userId ? data.userId : existing.userId;

    return prisma.device.update({
      where: { id: existing.id },
      data: {
        name: data.name ?? existing.name,
        os: data.os ?? existing.os,
        userId: newOwnerId,
      },
    });
  }

  return prisma.device.create({
    data: {
      name: data.name,
      os: data.os,
      deviceIdentifier: data.deviceIdentifier,
      user: { connect: { id: ownerId } },
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
    return devices
      .map((device) => ({
        ...device,
        user: userMap.get(device.userId) || null,
      }))
      .filter((device) => device.user !== null);
  }

  // For non-admins, user relation is not needed
  return prisma.device.findMany({
    where,
    include: {
      limits: {
        include: { app: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getDeviceForRequester = async (
  id: string,
  requester: Express.UserPayload
) => {
  const device = await prisma.device.findUnique({
    where: { id },
    include: {
      limits: { include: { app: true } },
    },
  });

  if (!device) return null;
  if (requester.role !== Role.ADMIN && device.userId !== requester.id) {
    throw new Error("Forbidden");
  }
  return device;
};

export const updateDevice = async (
  id: string,
  data: { name?: string; os?: string },
  requester: Express.UserPayload
) => {
  const device = await prisma.device.findUnique({ where: { id } });
  if (!device) throw new Error("NotFound");
  if (requester.role !== Role.ADMIN && device.userId !== requester.id) {
    throw new Error("Forbidden");
  }

  return prisma.device.update({
    where: { id },
    data: {
      name: data.name ?? device.name,
      os: data.os ?? device.os,
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


