import { NextFunction, Request, Response } from "express";

// Basic centralized error handler
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    const status = (res.statusCode && res.statusCode !== 200) ? res.statusCode : 500;
    const isProd = process.env.NODE_ENV === "production";
    const message = isProd && status === 500 ? "Server error" : (err.message || "Server error");

    if (process.env.NODE_ENV !== "production") {
        console.error("[error]", err);
    }

    // Ensure CORS headers are set even on errors
    const origin = req.headers.origin;
    if (origin) {
        const corsOrigin = process.env.CORS_ORIGIN;
        const allowedOrigins = corsOrigin && corsOrigin.trim() !== ""
            ? corsOrigin.split(",").map((o) => o.trim()).filter(Boolean)
            : [];
        
        const normalizedOrigin = origin.endsWith("/") ? origin.slice(0, -1) : origin;
        const isAllowed = allowedOrigins.some(allowed => {
            const allowedNormalized = allowed.toLowerCase().endsWith("/") 
                ? allowed.toLowerCase().slice(0, -1) 
                : allowed.toLowerCase();
            return normalizedOrigin.toLowerCase() === allowedNormalized;
        });
        
        if (isAllowed) {
            res.setHeader("Access-Control-Allow-Origin", origin);
            res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
            res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        }
    }

    const requestId = (res.getHeader("x-request-id") as string | undefined) ?? undefined;
    res.status(status).json({ message, requestId });
};

export const notFoundHandler = (_req: Request, res: Response) => {
    res.status(404).json({ message: "Not Found" });
};


