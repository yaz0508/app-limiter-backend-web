import { Request, Response } from "express";
import { findOrCreateApp, listApps } from "../services/appService";

export const list = async (_req: Request, res: Response) => {
  const apps = await listApps();
  res.json({ apps });
};

export const create = async (req: Request, res: Response) => {
  const { packageName, name } = req.body;
  const app = await findOrCreateApp(packageName, name);
  res.status(201).json({ app });
};


