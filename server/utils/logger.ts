/**
 * Structured logging utility for FocusGuard backend.
 * Provides consistent logging with proper formatting and levels.
 * 
 * Future: Integrate with Winston or similar for file logging and log aggregation.
 */
const isDev = process.env.NODE_ENV !== "production";

export const logger = {
    /**
     * Debug logs - only in development
     */
    debug: (message: string, meta?: any) => {
        if (!isDev) return;
        console.log(`[DEBUG] ${message}`, meta ? JSON.stringify(meta, null, 2) : "");
    },

    /**
     * Info logs - always shown
     */
    info: (message: string, meta?: any) => {
        console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta, null, 2) : "");
    },

    /**
     * Warning logs - always shown
     */
    warn: (message: string, meta?: any) => {
        console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta, null, 2) : "");
    },

    /**
     * Error logs - always shown, should be sent to monitoring service
     */
    error: (message: string, error?: Error | any, meta?: any) => {
        const errorInfo = error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
                name: error.name
            }
            : error;

        console.error(`[ERROR] ${message}`, {
            error: errorInfo,
            ...meta
        });

        // TODO: Send to Sentry or similar monitoring service
        // if (process.env.NODE_ENV === "production") {
        //     Sentry.captureException(error, { extra: meta });
        // }
    },

    /**
     * Log HTTP request
     */
    request: (method: string, path: string, statusCode: number, duration?: number) => {
        const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
        const message = `${method} ${path} ${statusCode}${duration ? ` (${duration}ms)` : ""}`;
        logger[level](message);
    },

    /**
     * Log database query
     */
    query: (operation: string, duration: number, meta?: any) => {
        const level = duration > 1000 ? "warn" : "debug";
        logger[level](`DB Query: ${operation} (${duration}ms)`, meta);
    }
};

