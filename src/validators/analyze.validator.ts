import { z } from "zod";

export const AnalyzeRequestSchema = z.object({
  userQuery: z.string().trim().min(1, "userQuery is required").max(5_000),
  documentContext: z
    .array(z.record(z.string(), z.unknown()))
    .min(1, "documentContext must contain at least one object")
    .max(10_000),
  model: z.string().trim().min(1).optional(),
});

export type AnalyzeRequestInput = z.infer<typeof AnalyzeRequestSchema>;

export const CreateContextRequestSchema = z.object({
  documentContext: z
    .array(z.record(z.string(), z.unknown()))
    .min(1, "documentContext must contain at least one object")
    .max(10_000),
  model: z.string().trim().min(1).optional(),
});

export type CreateContextRequestInput = z.infer<
  typeof CreateContextRequestSchema
>;

export const AnalyzeStoredContextRequestSchema = z.object({
  userQuery: z.string().trim().min(1, "userQuery is required").max(5_000),
});

export type AnalyzeStoredContextRequestInput = z.infer<
  typeof AnalyzeStoredContextRequestSchema
>;

export const ContextParamsSchema = z.object({
  contextId: z.string().trim().min(1, "contextId is required").max(128),
});

export const LedgerQuerySchema = z.object({
  days: z.coerce
    .number()
    .int()
    .refine(
      (value) => [7, 30, 90].includes(value),
      "days must be one of 7, 30, or 90",
    )
    .default(7),
});

export const CompressOnlyRequestSchema = z.object({
  documentContext: z
    .array(z.record(z.string(), z.unknown()))
    .min(1, "documentContext must contain at least one object")
    .max(100_000),
  maxDepth: z.coerce.number().int().min(1).max(20).optional(),
  previewRows: z.coerce.number().int().min(1).max(100).default(10),
  includeToonString: z.boolean().optional().default(true),
});

export type CompressOnlyRequestInput = z.infer<
  typeof CompressOnlyRequestSchema
>;
