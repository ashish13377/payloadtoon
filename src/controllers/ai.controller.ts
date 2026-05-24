import type { Request, Response } from 'express';
import type { AnalyzeRequestInput } from '../validators/analyze.validator';
import type { AnalyzeResponseBody } from '../types/api.types';
import { HttpError } from '../utils/httpError';
import { buildToonPreview } from '../utils/toonPreview';
import { aiService } from '../services/ai.service';
import { ledgerService } from '../services/ledger.service';

export async function analyzeData(req: Request, res: Response<AnalyzeResponseBody>): Promise<void> {
  if (!req.toon) {
    throw new HttpError(500, 'TOON compression state was not initialized.');
  }

  const body = req.body as AnalyzeRequestInput;

  const insights = await aiService.analyzeWithGemini({
    userQuery: body.userQuery,
    compression: req.toon.compression,
    model: req.toon.model,
  });

  void ledgerService.recordUsage(req.toon.analytics).catch((error) => {
    console.warn('[ledger] Failed to record token analytics.', error);
  });

  res.status(200).json({
    success: true,
    data: {
      insights,
      optimizationAnalytics: {
        ...req.toon.analytics,
        processingTimeMs: Date.now() - req.toon.startedAt,
      },
      toon: buildToonPreview(req.toon.compression),
    },
  });
}
