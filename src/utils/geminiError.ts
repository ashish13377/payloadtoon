import { HttpError } from './httpError';

export interface GeminiRetryOptions {
  operationName: string;
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
}

export interface GeminiErrorDetails {
  status?: number;
  name?: string;
  message: string;
  retryable: boolean;
}

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getGeminiErrorStatus(error: unknown): number | undefined {
  const maybe = error as { status?: unknown; code?: unknown };

  if (typeof maybe.status === 'number') return maybe.status;
  if (typeof maybe.code === 'number') return maybe.code;

  return undefined;
}

export function getGeminiErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown Gemini API error.';
  }
}

export function isRetryableGeminiError(error: unknown): boolean {
  const status = getGeminiErrorStatus(error);
  const message = getGeminiErrorMessage(error).toLowerCase();

  return (
    (typeof status === 'number' && RETRYABLE_STATUS_CODES.has(status)) ||
    message.includes('unavailable') ||
    message.includes('overloaded') ||
    message.includes('deadline_exceeded') ||
    message.includes('resource_exhausted') ||
    message.includes('socket hang up') ||
    message.includes('econnreset') ||
    message.includes('etimedout')
  );
}

export function getGeminiErrorDetails(error: unknown): GeminiErrorDetails {
  const status = getGeminiErrorStatus(error);
  const name = error instanceof Error ? error.name : undefined;

  return {
    status,
    name,
    message: getGeminiErrorMessage(error),
    retryable: isRetryableGeminiError(error),
  };
}

export async function withGeminiRetry<T>(
  task: () => Promise<T>,
  options: GeminiRetryOptions,
): Promise<T> {
  const maxAttempts = Math.max(1, options.maxRetries + 1);
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      const retryable = isRetryableGeminiError(error);
      const isLastAttempt = attempt >= maxAttempts;

      if (!retryable || isLastAttempt) {
        throw error;
      }

      const exponentialDelay = options.initialDelayMs * 2 ** (attempt - 1);
      const jitter = Math.floor(Math.random() * Math.max(100, options.initialDelayMs));
      const delayMs = Math.min(options.maxDelayMs, exponentialDelay + jitter);

      console.warn(
        `[gemini:retry] ${options.operationName} failed on attempt ${attempt}/${maxAttempts}. Retrying in ${delayMs}ms.`,
        getGeminiErrorDetails(error),
      );

      await sleep(delayMs);
    }
  }

  throw lastError;
}

export function toGeminiHttpError(error: unknown, messagePrefix: string): HttpError {
  const details = getGeminiErrorDetails(error);
  const upstreamStatus = details.status;

  const statusCode =
    upstreamStatus === 400 ? 400 :
    upstreamStatus === 401 || upstreamStatus === 403 ? 502 :
    upstreamStatus === 429 ? 429 :
    upstreamStatus === 503 || upstreamStatus === 504 ? 503 :
    502;

  return new HttpError(statusCode, `${messagePrefix} ${details.message}`, details);
}
