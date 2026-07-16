/**
 * validate.ts — Lightweight Zod middleware helpers.
 *
 * Usage:
 *   router.post("/foo", validateBody(MySchema), async (req, res) => {
 *     const data = req.body as z.infer<typeof MySchema>;
 *     ...
 *   });
 */
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

function formatIssues(issues: z.ZodIssue[]): string[] {
  return issues.map((i) => `${i.path.join(".")}: ${i.message}`);
}

/** Validate and replace req.body with the parsed, typed value. */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error:   "Geçersiz istek verisi",
        details: formatIssues(result.error.issues),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

/** Validate req.params (replaces parsed params in-place). */
export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        error:   "Geçersiz URL parametresi",
        details: formatIssues(result.error.issues),
      });
      return;
    }
    Object.assign(req.params, result.data);
    next();
  };
}

/** Validate req.query. */
export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        error:   "Geçersiz sorgu parametresi",
        details: formatIssues(result.error.issues),
      });
      return;
    }
    Object.assign(req.query, result.data);
    next();
  };
}

/* ── Common Zod schemas ───────────────────────────────────────── */

export const UuidParam = z.object({
  id: z.string().uuid("Geçersiz kayıt kimliği"),
});

export const PaginationQuery = z.object({
  limit:  z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  cursor: z.string().optional(),
});

/** Safely trim and limit string length */
export function safeStr(max = 2000) {
  return z.string().trim().min(1).max(max);
}

export function optStr(max = 2000) {
  return z.string().trim().max(max).optional();
}
