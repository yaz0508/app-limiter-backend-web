import { NextFunction, Request, Response } from "express";

// Basic centralized error handler
export const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {
    const status = (res.statusCode && res.statusCode !== 200) ? res.statusCode : 500;
    const isProd = process.env.NODE_ENV === "production";
    const message = isProd && status === 500 ? "Server error" : (err.message || "Server error");

    if (process.env.NODE_ENV !== "production") {
        console.error("[error]", err);
    }

    const requestId = (res.getHeader("x-request-id") as string | undefined) ?? undefined;
    res.status(status).json({ message, requestId });
};

export const notFoundHandler = (_req: Request, res: Response) => {
    res.status(404).json({ message: "Not Found" });
};


