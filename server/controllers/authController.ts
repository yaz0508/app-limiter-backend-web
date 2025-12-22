import { Request, Response } from "express";
import { Role } from "@prisma/client";
import {
  createUser,
  getUserById,
} from "../services/userService";
import {
  generateToken,
  validateUserCredentials,
} from "../services/authService";

export const register = async (req: Request, res: Response) => {
  const { email, name, password } = req.body;
  try {
    // Mobile users register as USER. The web dashboard is intended for admins only.
    const user = await createUser({ email, name, password, role: Role.USER });
    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    res.status(201).json({ user, token });
  } catch (err) {
    if ((err as any)?.code === "P2002") {
      return res.status(409).json({ message: "Email already exists" });
    }
    throw err;
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Temporary debug logging (remove after fixing the issue).
  if (process.env.NODE_ENV !== "production") {
    console.log(`[LOGIN] Attempt for email: ${email?.substring(0, 5)}...`);
  }

  const user = await validateUserCredentials(email, password);
  if (!user) {
    // Temporary: log if admin user exists at all (for debugging).
    if (process.env.NODE_ENV !== "production") {
      const { prisma } = await import("../prisma/client");
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      console.log(`[LOGIN] Failed. Total admin users in DB: ${adminCount}`);
    }
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
};

export const me = async (req: Request, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  const user = await getUserById(req.user.id);
  res.json({ user });
};

