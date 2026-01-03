/**
 * Unified error handling system for FocusGuard backend API.
 * Provides structured error types with HTTP status codes and user-friendly messages.
 */
export class AppError extends Error {
    public readonly code: string;
    public readonly statusCode: number;
    public readonly details?: any;
    public readonly retryable: boolean;

    constructor(
        code: string,
        message: string,
        statusCode: number = 500,
        details?: any,
        retryable: boolean = false
    ) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.retryable = retryable;
        
        // Maintains proper stack trace for where error was thrown
        Error.captureStackTrace(this, this.constructor);
    }

    // Static factory methods for common error types
    static network(message: string = 'Network error occurred', details?: any): AppError {
        return new AppError('NETWORK_ERROR', message, 503, details, true);
    }

    static validation(field: string, message: string, details?: any): AppError {
        return new AppError('VALIDATION_ERROR', message, 400, { field, ...details }, false);
    }

    static auth(message: string = 'Authentication required', details?: any): AppError {
        return new AppError('AUTH_ERROR', message, 401, details, false);
    }

    static forbidden(message: string = 'Access denied', details?: any): AppError {
        return new AppError('FORBIDDEN', message, 403, details, false);
    }

    static notFound(resource: string = 'Resource', details?: any): AppError {
        return new AppError('NOT_FOUND', `${resource} not found`, 404, details, false);
    }

    static conflict(message: string = 'Resource conflict', details?: any): AppError {
        return new AppError('CONFLICT', message, 409, details, false);
    }

    static rateLimit(message: string = 'Too many requests', retryAfter?: number): AppError {
        return new AppError(
            'RATE_LIMIT',
            message,
            429,
            { retryAfter },
            true
        );
    }

    static server(message: string = 'Internal server error', details?: any): AppError {
        return new AppError('SERVER_ERROR', message, 500, details, false);
    }

    static database(message: string = 'Database error', details?: any): AppError {
        return new AppError('DATABASE_ERROR', message, 500, details, false);
    }

    // Convert Prisma errors to AppError
    static fromPrismaError(error: any): AppError {
        if (error.code === 'P2002') {
            return AppError.conflict('A record with this value already exists', {
                field: error.meta?.target
            });
        }
        if (error.code === 'P2025') {
            return AppError.notFound('Record');
        }
        return AppError.database('Database operation failed', { prismaCode: error.code });
    }
}

