import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { Prisma } from "@prisma/client";

// Enhanced centralized error handler with structured error responses
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    // Handle AppError instances
    if (err instanceof AppError) {
        return handleAppError(err, req, res);
    }

    // Handle Prisma errors
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        const appError = AppError.fromPrismaError(err);
        return handleAppError(appError, req, res);
    }

    // Handle Prisma validation errors
    if (err instanceof Prisma.PrismaClientValidationError) {
        const appError = AppError.validation("request", "Invalid request data");
        return handleAppError(appError, req, res);
    }

    // Handle unknown errors
    const isProd = process.env.NODE_ENV === "production";
    const status = (res.statusCode && res.statusCode !== 200) ? res.statusCode : 500;
    
    // Log error details (but not in production for security)
    if (!isProd) {
        console.error("[error]", {
            message: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method,
            body: req.body
        });
    } else {
        // In production, log minimal info
        console.error("[error]", {
            message: err.message,
            path: req.path,
            method: req.method
        });
        // TODO: Send to Sentry or similar monitoring service
        // Sentry.captureException(err, {
        //     tags: { path: req.path, method: req.method },
        //     user: { id: req.user?.id }
        // });
    }

    // Ensure CORS headers are set even on errors
    setCorsHeaders(req, res);

    const requestId = (res.getHeader("x-request-id") as string | undefined) ?? undefined;
    const message = isProd && status === 500 
        ? "An unexpected error occurred" 
        : err.message || "Server error";

    res.status(status).json({
        error: {
            code: "INTERNAL_ERROR",
            message,
            retryable: false
        },
        requestId
    });
};

function handleAppError(err: AppError, req: Request, res: Response) {
    // Log error
    if (process.env.NODE_ENV !== "production") {
        console.error("[AppError]", {
            code: err.code,
            message: err.message,
            statusCode: err.statusCode,
            details: err.details,
            path: req.path,
            method: req.method
        });
    }

    // Ensure CORS headers
    setCorsHeaders(req, res);

    const requestId = (res.getHeader("x-request-id") as string | undefined) ?? undefined;
    
    res.status(err.statusCode).json({
        error: {
            code: err.code,
            message: err.message,
            details: err.details,
            retryable: err.retryable
        },
        requestId
    });
}

function setCorsHeaders(req: Request, res: Response) {
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
}

export const notFoundHandler = (_req: Request, res: Response) => {
    res.status(404).json({
        error: {
            code: "NOT_FOUND",
            message: "Resource not found",
            retryable: false
        }
    });
};
