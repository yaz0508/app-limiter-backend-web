import { NextFunction, Request, Response } from "express";

// Basic centralized error handler
export const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    const status = (res.statusCode && res.statusCode !== 200) ? res.statusCode : 500;
    const message = err.message || "Server error";

    if (process.env.NODE_ENV !== "production") {
        console.error("[error]", err);
    }

    res.status(status).json({ message });
};

export const notFoundHandler = (_req: Request, res: Response) => {
    res.status(404).json({ message: "Not Found" });
};


