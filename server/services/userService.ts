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
    await prisma.user.delete({ where: { id } });
};


