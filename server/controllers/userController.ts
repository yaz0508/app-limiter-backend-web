import { Request, Response } from "express";
import { Role } from "@prisma/client";
import {
  createUser,
  deleteUser,
  getUserById,
  listUsers,
  updateUser,
} from "../services/userService";

export const list = async (req: Request, res: Response) => {
  const users = await listUsers(req.user!);
  res.json({ users });
};

export const get = async (req: Request, res: Response) => {
  const user = await getUserById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (req.user!.role !== Role.ADMIN && req.user!.id !== user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }
  res.json({ user });
};

export const create = async (req: Request, res: Response) => {
  const { email, name, password, role } = req.body;
  try {
    const user = await createUser({ email, name, password, role });
    res.status(201).json({ user });
  } catch (err) {
    if ((err as any)?.code === "P2002") {
      return res.status(409).json({ message: "Email already exists" });
    }
    throw err;
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const user = await updateUser(req.params.id, req.user!, req.body);
    res.json({ user });
  } catch (err) {
    if ((err as Error).message === "Forbidden") {
      return res.status(403).json({ message: "Forbidden" });
    }
    throw err;
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    await deleteUser(req.params.id, req.user!);
    res.status(204).send();
  } catch (err) {
    if ((err as Error).message === "Forbidden") {
      return res.status(403).json({ message: "Forbidden" });
    }
    throw err;
  }
};

