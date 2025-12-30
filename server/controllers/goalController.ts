import { Request, Response } from "express";
import { prisma } from "../prisma/client";
import {
  createGoal,
  getGoals,
  getGoalProgress,
  getAllGoalProgress,
  updateGoal,
  deleteGoal,
} from "../services/goalService";
import { ensureDeviceAccess } from "../services/usageService";

export const create = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }
    ensureDeviceAccess(device.userId, req.user!);

    const goal = await createGoal({
      ...req.body,
      deviceId,
      createdById: req.user!.id,
    });

    res.status(201).json({ goal });
  } catch (error: any) {
    console.error("[GoalController] Error creating goal:", error);
    res.status(400).json({ message: error.message || "Failed to create goal" });
  }
};

export const list = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { status } = req.query;
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }
    ensureDeviceAccess(device.userId, req.user!);

    const goals = await getGoals(deviceId, status as any);
    res.json({ goals });
  } catch (error) {
    console.error("[GoalController] Error listing goals:", error);
    res.status(500).json({ message: "Failed to list goals" });
  }
};

export const getProgress = async (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;
    // @ts-ignore - Prisma client will be regenerated on build
    const goal = await prisma.usageGoal.findUnique({
      where: { id: goalId },
      include: { device: true },
    });
    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }
    ensureDeviceAccess(goal.device.userId, req.user!);

    const progress = await getGoalProgress(goalId);
    if (!progress) {
      return res.status(404).json({ message: "Goal not found" });
    }

    res.json({ progress });
  } catch (error) {
    console.error("[GoalController] Error getting goal progress:", error);
    res.status(500).json({ message: "Failed to get goal progress" });
  }
};

export const getAllProgress = async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }
    ensureDeviceAccess(device.userId, req.user!);

    const progress = await getAllGoalProgress(deviceId);
    res.json({ progress });
  } catch (error) {
    console.error("[GoalController] Error getting all goal progress:", error);
    res.status(500).json({ message: "Failed to get goal progress" });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;
    // @ts-ignore - Prisma client will be regenerated on build
    const goal = await prisma.usageGoal.findUnique({
      where: { id: goalId },
      include: { device: true },
    });
    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }
    ensureDeviceAccess(goal.device.userId, req.user!);

    const updated = await updateGoal(goalId, req.body);
    res.json({ goal: updated });
  } catch (error) {
    console.error("[GoalController] Error updating goal:", error);
    res.status(500).json({ message: "Failed to update goal" });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;
    // @ts-ignore - Prisma client will be regenerated on build
    const goal = await prisma.usageGoal.findUnique({
      where: { id: goalId },
      include: { device: true },
    });
    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }
    ensureDeviceAccess(goal.device.userId, req.user!);

    await deleteGoal(goalId);
    res.json({ message: "Goal deleted" });
  } catch (error) {
    console.error("[GoalController] Error deleting goal:", error);
    res.status(500).json({ message: "Failed to delete goal" });
  }
};

