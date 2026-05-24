import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const booleanString = z
  .union([z.literal("true"), z.literal("false"), z.boolean()])
  .transform((value) => value === true || value === "true");

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  GEMINI_FALLBACK_MODEL: z.string().optional().default("gemini-2.5-flash-lite"),
  GEMINI_MAX_RETRIES: z.coerce.number().int().min(0).max(8).default(3),
  GEMINI_RETRY_INITIAL_DELAY_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(500),
  GEMINI_RETRY_MAX_DELAY_MS: z.coerce.number().int().positive().default(8_000),
  CORS_ORIGINS: z.string().default("http://localhost:3001"),
  MAX_JSON_BODY_SIZE: z.string().default("10mb"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
  LEDGER_ENABLED: booleanString.default("true"),
  REDIS_URL: z.string().url().optional().or(z.literal("")).default(""),
  LEDGER_KEY_PREFIX: z.string().min(1).default("payloadtoon:ledger"),
  CONTEXT_STORE_ENABLED: booleanString.default("true"),
  CONTEXT_KEY_PREFIX: z.string().min(1).default("payloadtoon:context"),
  CONTEXT_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 6),
  GEMINI_INPUT_PRICE_PER_1M_USD: z.coerce.number().nonnegative().default(0),
  FILE_STORE_ENABLED: booleanString.default("false"),
  FILE_STORE_PATH: z.string().default("./data/saved_payloads.json"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
