import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";

export const validateRequest = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse({
            body: req.body,
            query: req.query,
            params: req.params,
        });

        if (!result.success) {
            return res
                .status(400)
                .json({ message: "Validation failed", errors: result.error.flatten() });
        }

        // replace parsed data so downstream code can rely on types
        req.body = result.data.body;
        req.query = result.data.query;
        req.params = result.data.params;
        return next();
    };
};


