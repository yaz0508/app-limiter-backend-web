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
    const user = await createUser({ email, name, password, role: Role.PARENT });
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
  const user = await validateUserCredentials(email, password);
  if (!user) {
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

