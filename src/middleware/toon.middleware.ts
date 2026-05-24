import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { optimizationService } from '../services/optimization.service';
import { ToonParserError } from '../utils/toonParser';
import { HttpError } from '../utils/httpError';
import { AnalyzeRequestSchema } from '../validators/analyze.validator';

export async function compressPayload(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const startedAt = Date.now();

  try {
    const parsed = AnalyzeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'Invalid analyze request body.', parsed.error.flatten());
    }

    const model = parsed.data.model ?? env.GEMINI_MODEL;
    const optimized = await optimizationService.optimizeDocumentContext({
      documentContext: parsed.data.documentContext,
      model,
      maxDepth: 5,
    });

    req.body = parsed.data;
    req.toon = {
      compression: optimized.compression,
      analytics: optimized.analytics,
      model,
      startedAt,
    };

    next();
  } catch (error) {
    if (error instanceof ToonParserError) {
      next(new HttpError(400, error.message));
      return;
    }

    next(error);
  }
}
