import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Optional authentication middleware.
 * Tries JWT authentication first, but doesn't fail if it's missing.
 * Sets req.user if JWT is valid, otherwise leaves it undefined.
 */
export const optionalAuthenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");

    if (JWT_SECRET) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as Express.UserPayload;
        req.user = decoded;
      } catch (err) {
        // JWT invalid, but don't fail - allow API key fallback
        // req.user remains undefined
      }
    }
  }

  // Continue regardless of auth status
  next();
};
