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

    // Retry logic for transaction deadlocks (MongoDB P2034 error)
    const maxRetries = 5;
    let lastError: any = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            // Use transaction with timeout to prevent long-running transactions
            await prisma.$transaction(
                async (tx) => {
                    // Get all devices owned by this user
                    const userDevices = await tx.device.findMany({
                        where: { userId: id },
                        select: { id: true }
                    });
                    const deviceIds = userDevices.map(d => d.id);

                    // Delete all data related to user's devices
                    // Order matters: delete child records first, then parent records
                    if (deviceIds.length > 0) {
                        // 1. Delete active focus sessions (no dependencies)
                        await tx.activeFocusSession.deleteMany({
                            where: { deviceId: { in: deviceIds } }
                        });

                        // 2. Get focus sessions before deleting their apps
                        const sessions = await tx.focusSession.findMany({
                            where: { deviceId: { in: deviceIds } },
                            select: { id: true }
                        });
                        const sessionIds = sessions.map(s => s.id);
                        
                        // 3. Delete focus session apps (depends on sessions)
                        if (sessionIds.length > 0) {
                            await tx.focusSessionApp.deleteMany({
                                where: { sessionId: { in: sessionIds } }
                            });
                        }

                        // 4. Delete focus sessions (depends on session apps being deleted)
                        await tx.focusSession.deleteMany({
                            where: { deviceId: { in: deviceIds } }
                        });

                        // 5. Delete limits (depends on devices)
                        await tx.limit.deleteMany({
                            where: { deviceId: { in: deviceIds } }
                        });

                        // 6. Delete category limits (depends on devices)
                        await tx.categoryLimit.deleteMany({
                            where: { deviceId: { in: deviceIds } }
                        });

                        // 7. Delete override requests (depends on devices)
                        await tx.overrideRequest.deleteMany({
                            where: { deviceId: { in: deviceIds } }
                        });

                        // 8. Delete usage logs (depends on devices)
                        await tx.usageLog.deleteMany({
                            where: { deviceId: { in: deviceIds } }
                        });

                        // 9. Delete goals (depends on devices)
                        await tx.usageGoal.deleteMany({
                            where: { deviceId: { in: deviceIds } }
                        });

                        // 10. Finally, delete the devices themselves
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

                    // Update override requests approved by this user (set approvedById to null instead of deleting)
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
                },
                {
                    maxWait: 10000, // Maximum time to wait for a transaction slot (10 seconds)
                    timeout: 30000, // Maximum time the transaction can run (30 seconds)
                }
            );

            // Success - break out of retry loop
            console.log(`[deleteUser] User and all related data deleted: ${id}`);
            return;
        } catch (error: any) {
            lastError = error;
            
            // Check if it's a transaction conflict error (P2034)
            if (error.code === 'P2034') {
                // Calculate exponential backoff delay: 100ms, 200ms, 400ms, 800ms, 1600ms
                const delayMs = Math.min(100 * Math.pow(2, attempt), 2000);
                
                console.warn(
                    `[deleteUser] Transaction conflict (P2034) on attempt ${attempt + 1}/${maxRetries} for user deletion ${id}. Retrying in ${delayMs}ms...`
                );
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, delayMs));
                continue; // Retry
            } else {
                // Not a transaction conflict - throw immediately
                throw error;
            }
        }
    }

    // All retries exhausted
    console.error(`[deleteUser] Failed to delete user ${id} after ${maxRetries} attempts`, lastError);
    throw new Error(`Failed to delete user after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
};


