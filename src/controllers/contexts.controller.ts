import type { Request, Response } from 'express';
import { env } from '../config/env';
import type { AnalyzeResponseBody, CreateContextResponseBody, DeleteContextResponseBody, TokenAnalytics } from '../types/api.types';
import { aiService } from '../services/ai.service';
import { contextStoreService } from '../services/contextStore.service';
import { ledgerService } from '../services/ledger.service';
import { optimizationService } from '../services/optimization.service';
import { HttpError } from '../utils/httpError';
import { buildToonPreview } from '../utils/toonPreview';
import { ToonParserError } from '../utils/toonParser';
import {
  AnalyzeStoredContextRequestSchema,
  ContextParamsSchema,
  CreateContextRequestSchema,
} from '../validators/analyze.validator';

function withProcessingTime(analytics: TokenAnalytics, startedAt: number): TokenAnalytics {
  return {
    ...analytics,
    calculatedAt: new Date().toISOString(),
    processingTimeMs: Date.now() - startedAt,
  };
}

export async function createContext(req: Request, res: Response<CreateContextResponseBody>): Promise<void> {
  const parsed = CreateContextRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Invalid create context request body.', parsed.error.flatten());
  }

  try {
    const model = parsed.data.model ?? env.GEMINI_MODEL;
    const optimized = await optimizationService.optimizeDocumentContext({
      documentContext: parsed.data.documentContext,
      model,
      maxDepth: 5,
    });

    const context = await contextStoreService.create({
      compression: optimized.compression,
      analytics: optimized.analytics,
      model,
    });

    res.status(201).json({
      success: true,
      data: {
        context: {
          contextId: context.contextId,
          createdAt: context.createdAt,
          expiresAt: context.expiresAt,
        },
        optimizationAnalytics: optimized.analytics,
        toon: buildToonPreview(optimized.compression),
      },
    });
  } catch (error) {
    if (error instanceof ToonParserError) {
      throw new HttpError(400, error.message);
    }

    throw error;
  }
}

export async function analyzeStoredContext(req: Request, res: Response<AnalyzeResponseBody>): Promise<void> {
  const startedAt = Date.now();
  const params = ContextParamsSchema.safeParse(req.params);
  if (!params.success) {
    throw new HttpError(400, 'Invalid context id.', params.error.flatten());
  }

  const body = AnalyzeStoredContextRequestSchema.safeParse(req.body);
  if (!body.success) {
    throw new HttpError(400, 'Invalid analyze context request body.', body.error.flatten());
  }

  const context = await contextStoreService.get(params.data.contextId);
  if (!context) {
    throw new HttpError(404, 'Stored TOON context was not found or has expired. Create the context again.');
  }

  const insights = await aiService.analyzeWithGemini({
    userQuery: body.data.userQuery,
    compression: context.compression,
    model: context.model,
  });

  const analytics = withProcessingTime(context.analytics, startedAt);

  void ledgerService.recordUsage(analytics).catch((error) => {
    console.warn('[ledger] Failed to record token analytics for stored context.', error);
  });

  res.status(200).json({
    success: true,
    data: {
      insights,
      optimizationAnalytics: analytics,
      toon: buildToonPreview(context.compression),
      context: {
        contextId: context.contextId,
        createdAt: context.createdAt,
        expiresAt: context.expiresAt,
        reused: true,
      },
    },
  });
}

export async function deleteContext(req: Request, res: Response<DeleteContextResponseBody>): Promise<void> {
  const params = ContextParamsSchema.safeParse(req.params);
  if (!params.success) {
    throw new HttpError(400, 'Invalid context id.', params.error.flatten());
  }

  const deleted = await contextStoreService.delete(params.data.contextId);

  res.status(200).json({
    success: true,
    data: {
      contextId: params.data.contextId,
      deleted,
    },
  });
}
