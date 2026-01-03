import { Role, User } from "@prisma/client";
import { prisma } from "../prisma/client";
import { hashPassword } from "./authService";

export const createUser = async (data: {
    email: string;
    name: string;
    password: string;
    role?: Role;
}) => {
    const hashed = await hashPassword(data.password);
    return prisma.user.create({
        data: {
            email: data.email.toLowerCase(),
            name: data.name,
            passwordHash: hashed,
            role: data.role ?? Role.USER,
        },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
        },
    });
};

export const listUsers = async (requester: Express.UserPayload) => {
    if (requester.role === Role.ADMIN) {
        return prisma.user.findMany({
            select: { id: true, email: true, name: true, role: true, createdAt: true },
            orderBy: { createdAt: "desc" },
        });
    }

    return prisma.user.findMany({
        where: { id: requester.id },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
};

export const getUserById = async (id: string) => {
    // Validate id is not empty
    if (!id || id.trim() === "") {
        throw new Error("User id is required");
    }

    return prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
};

export const updateUser = async (
    id: string,
    requester: Express.UserPayload,
    data: Partial<Pick<User, "name" | "email" | "role">> & { password?: string }
) => {
    // Validate id is not empty
    if (!id || id.trim() === "") {
        throw new Error("User id is required");
    }

    if (requester.role !== Role.ADMIN && requester.id !== id) {
        throw new Error("Forbidden");
    }

    const payload: any = {};
    if (data.email) payload.email = data.email.toLowerCase();
    if (data.name) payload.name = data.name;
    if (data.role && requester.role === Role.ADMIN) payload.role = data.role;
    if (data.password) payload.passwordHash = await hashPassword(data.password);

    // Ensure at least one field is being updated
    if (Object.keys(payload).length === 0) {
        throw new Error("No updates provided");
    }

    return prisma.user.update({
        where: { id },
        data: payload,
        select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
};

export const deleteUser = async (id: string, requester: Express.UserPayload) => {
    // Validate id is not empty
    if (!id || id.trim() === "") {
        throw new Error("User id is required");
    }

    if (requester.role !== Role.ADMIN) {
        throw new Error("Forbidden");
    }

    // Prevent self-deletion
    if (requester.id === id) {
        throw new Error("Cannot delete your own account");
    }

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
        // Get all devices owned by this user
        const userDevices = await tx.device.findMany({
            where: { userId: id },
            select: { id: true }
        });
        const deviceIds = userDevices.map(d => d.id);

        // Delete all data related to user's devices
        if (deviceIds.length > 0) {
            // Delete active focus sessions for these devices
            await tx.activeFocusSession.deleteMany({
                where: { deviceId: { in: deviceIds } }
            });

            // Delete focus session apps (via sessions)
            const sessions = await tx.focusSession.findMany({
                where: { deviceId: { in: deviceIds } },
                select: { id: true }
            });
            const sessionIds = sessions.map(s => s.id);
            
            if (sessionIds.length > 0) {
                await tx.focusSessionApp.deleteMany({
                    where: { sessionId: { in: sessionIds } }
                });
            }

            // Delete focus sessions
            await tx.focusSession.deleteMany({
                where: { deviceId: { in: deviceIds } }
            });

            // Delete limits for these devices
            await tx.limit.deleteMany({
                where: { deviceId: { in: deviceIds } }
            });

            // Delete category limits for these devices
            await tx.categoryLimit.deleteMany({
                where: { deviceId: { in: deviceIds } }
            });

            // Delete override requests for these devices
            await tx.overrideRequest.deleteMany({
                where: { deviceId: { in: deviceIds } }
            });

            // Delete usage logs for these devices
            await tx.usageLog.deleteMany({
                where: { deviceId: { in: deviceIds } }
            });

            // Delete goals for these devices
            await tx.usageGoal.deleteMany({
                where: { deviceId: { in: deviceIds } }
            });

            // Delete the devices themselves
            await tx.device.deleteMany({
                where: { id: { in: deviceIds } }
            });
        }

        // Delete limits created by this user (that may belong to other users' devices)
        await tx.limit.deleteMany({
            where: { createdById: id }
        });

        // Delete category limits created by this user
        await tx.categoryLimit.deleteMany({
            where: { createdById: id }
        });

        // Delete override requests approved by this user (set approvedById to null instead of deleting)
        // This preserves the request history but removes the approval link
        await tx.overrideRequest.updateMany({
            where: { approvedById: id },
            data: {
                approvedById: null
            }
        });

        // Delete goals created by this user (that may belong to other users' devices)
        await tx.usageGoal.deleteMany({
            where: { createdById: id }
        });

        // Delete usage logs associated with this user
        await tx.usageLog.deleteMany({
            where: { userId: id }
        });

        // Finally, delete the user
        await tx.user.delete({
            where: { id }
        });
    });
};


