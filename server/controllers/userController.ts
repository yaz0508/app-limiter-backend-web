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
  try {
    // Validate id parameter
    if (!req.params.id || req.params.id.trim() === "") {
      return res.status(400).json({ message: "User id is required" });
    }

    const user = await getUserById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (req.user!.role !== Role.ADMIN && req.user!.id !== user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    res.json({ user });
  } catch (err) {
    const error = err as Error;
    if (error.message === "User id is required") {
      return res.status(400).json({ message: error.message });
    }
    throw err;
  }
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
    // Validate id parameter
    if (!req.params.id || req.params.id.trim() === "") {
      return res.status(400).json({ message: "User id is required" });
    }

    const user = await updateUser(req.params.id, req.user!, req.body);
    res.json({ user });
  } catch (err) {
    const error = err as Error;
    if (error.message === "Forbidden") {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (error.message === "User id is required" || error.message === "No updates provided") {
      return res.status(400).json({ message: error.message });
    }
    if ((err as any)?.code === "P2025") {
      return res.status(404).json({ message: "User not found" });
    }
    throw err;
  }
};

export const updateMe = async (req: Request, res: Response) => {
  try {
    // Ensure this is the /me route, not /:id
    if (req.params.id && req.params.id !== "me") {
      console.error("[updateMe] Route mismatch - params.id exists:", req.params.id);
      return res.status(400).json({ message: "Invalid route - use /users/me to update your profile" });
    }

    // Use the authenticated user's ID from JWT token
    if (!req.user || !req.user.id) {
      console.error("[updateMe] User not authenticated:", { user: req.user });
      return res.status(401).json({ message: "Unauthorized - user not authenticated" });
    }

    const userId = req.user.id;
    
    if (!userId || userId.trim() === "") {
      console.error("[updateMe] User ID is empty:", { userId, user: req.user, email: req.user.email });
      
      // Fallback: try to get user by email if ID is missing
      if (req.user.email) {
        try {
          const { prisma } = await import("../prisma/client");
          const userByEmail = await prisma.user.findUnique({
            where: { email: req.user.email },
            select: { id: true },
          });
          if (userByEmail) {
            console.log("[updateMe] Found user by email, using ID:", userByEmail.id);
            const user = await updateUser(userByEmail.id, req.user, req.body);
            return res.json({ user });
          }
        } catch (fallbackErr) {
          console.error("[updateMe] Fallback failed:", fallbackErr);
        }
      }
      
      return res.status(400).json({ message: "User id is required" });
    }

    console.log("[updateMe] Updating user:", { userId, email: req.user.email, body: req.body });

    const user = await updateUser(userId, req.user, req.body);
    res.json({ user });
  } catch (err) {
    const error = err as Error;
    console.error("[updateMe] Error:", error, { stack: error.stack });
    if (error.message === "Forbidden") {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (error.message === "User id is required" || error.message === "No updates provided") {
      return res.status(400).json({ message: error.message });
    }
    if ((err as any)?.code === "P2025") {
      return res.status(404).json({ message: "User not found" });
    }
    // Check for Prisma validation errors
    if ((err as any)?.code === "P2003" || error.message.includes("Required")) {
      console.error("[updateMe] Prisma validation error:", err);
      return res.status(400).json({ message: "Invalid user data - please check your input" });
    }
    throw err;
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    // Validate id parameter
    if (!req.params.id || req.params.id.trim() === "") {
      return res.status(400).json({ message: "User id is required" });
    }

    await deleteUser(req.params.id, req.user!);
    res.status(204).send();
  } catch (err) {
    const error = err as Error;
    if (error.message === "Forbidden") {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (error.message === "User id is required") {
      return res.status(400).json({ message: error.message });
    }
    if ((err as any)?.code === "P2025") {
      return res.status(404).json({ message: "User not found" });
    }
    throw err;
  }
};

