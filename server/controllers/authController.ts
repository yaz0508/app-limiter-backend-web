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

  // Log login attempts (sanitized for security)
  const emailPrefix = email ? email.substring(0, 5) + "..." : "(empty)";
  console.log(`[LOGIN] Attempt for email: ${emailPrefix}`);

  const user = await validateUserCredentials(email, password);
  if (!user) {
    // Log failed login attempt details
    const { prisma } = await import("../prisma/client");
    const normalizedEmail = email?.trim().toLowerCase();
    const userExists = normalizedEmail
      ? await prisma.user.findUnique({ where: { email: normalizedEmail } })
      : null;

    console.log(`[LOGIN] Failed for: ${emailPrefix}`);
    console.log(`[LOGIN] User exists: ${userExists ? "yes" : "no"}`);
    if (userExists) {
      console.log(`[LOGIN] User role: ${userExists.role}`);
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

