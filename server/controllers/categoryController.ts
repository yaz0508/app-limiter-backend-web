import { Request, Response } from "express";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  listCategories,
  getCategory,
  createCategoryLimit,
  getCategoryLimitsForDevice,
  deleteCategoryLimit,
  syncAppCategories,
} from "../services/categoryService";
import { getDeviceForRequester, findDeviceByIdentifier } from "../services/deviceService";

export const create = async (req: Request, res: Response) => {
  try {
    const category = await createCategory(req.body);
    res.status(201).json({ category });
  } catch (err: any) {
    if (err.code === "P2002") {
      return res.status(409).json({ message: "Category name already exists" });
    }
    res.status(500).json({ message: err.message || "Failed to create category" });
  }
};

export const list = async (_req: Request, res: Response) => {
  try {
    const categories = await listCategories();
    res.json({ categories });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to list categories" });
  }
};

export const get = async (req: Request, res: Response) => {
  try {
    const category = await getCategory(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.json({ category });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to get category" });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const category = await updateCategory(req.params.id, req.body);
    res.json({ category });
  } catch (err: any) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Category not found" });
    }
    res.status(500).json({ message: err.message || "Failed to update category" });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    await deleteCategory(req.params.id);
    res.status(204).send();
  } catch (err: any) {
    if (err.code === "P2025") {
      return res.status(404).json({ message: "Category not found" });
    }
    res.status(500).json({ message: err.message || "Failed to delete category" });
  }
};

export const createLimit = async (req: Request, res: Response) => {
  try {
    const device = await getDeviceForRequester(req.body.deviceId, req.user!);
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    const limit = await createCategoryLimit({
      ...req.body,
      createdById: req.user!.id,
    });
    res.status(201).json({ limit });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to create category limit" });
  }
};

export const getDeviceLimits = async (req: Request, res: Response) => {
  try {
    const device = await getDeviceForRequester(req.params.deviceId, req.user!);
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    const limits = await getCategoryLimitsForDevice(req.params.deviceId);
    res.json({ limits });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to get category limits" });
  }
};

export const removeLimit = async (req: Request, res: Response) => {
  try {
    const device = await getDeviceForRequester(req.params.deviceId, req.user!);
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    await deleteCategoryLimit(req.params.deviceId, req.params.categoryId);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to delete category limit" });
  }
};

export const syncApps = async (req: Request, res: Response) => {
  try {
    const { deviceIdentifier, appCategories } = req.body;
    
    // Verify device exists
    const device = await findDeviceByIdentifier(deviceIdentifier);
    if (!device) {
      return res.status(400).json({ message: "Device not registered" });
    }

    // Ensure user has access (if JWT present)
    if (req.user) {
      if (req.user.role !== "ADMIN" && device.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    const synced = await syncAppCategories({
      deviceIdentifier,
      appCategories,
    });

    res.json({ synced });
  } catch (err: any) {
    res.status(500).json({ message: err.message || "Failed to sync app categories" });
  }
};

