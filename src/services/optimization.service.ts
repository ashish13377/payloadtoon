import { tokenService } from './token.service';
import { convertJsonToToon } from '../utils/toonParser';
import type { TokenAnalytics, ToonCompressionResult } from '../types/api.types';

export interface OptimizeDocumentContextParams {
  documentContext: Record<string, unknown>[];
  model: string;
  maxDepth?: number;
}

export interface OptimizeDocumentContextResult {
  compression: ToonCompressionResult;
  analytics: TokenAnalytics;
  rawPayload: string;
  optimizedPayload: string;
}

export class OptimizationService {
  async optimizeDocumentContext(params: OptimizeDocumentContextParams): Promise<OptimizeDocumentContextResult> {
    const startedAt = Date.now();
    const compression = convertJsonToToon(params.documentContext, { maxDepth: params.maxDepth ?? 5 });
    const rawPayload = JSON.stringify(params.documentContext);
    const optimizedPayload = `${compression.schemaHeader}\n${compression.toonString}`;

    const [rawTokens, optimizedTokens] = await Promise.all([
      tokenService.countTokens(rawPayload, params.model),
      tokenService.countTokens(optimizedPayload, params.model),
    ]);

    const tokensSaved = rawTokens - optimizedTokens;
    const savingsPercentageNumber = rawTokens === 0 ? 0 : (tokensSaved / rawTokens) * 100;

    return {
      compression,
      rawPayload,
      optimizedPayload,
      analytics: {
        rawTokens,
        optimizedTokens,
        tokensSaved,
        savingsPercentage: `${savingsPercentageNumber.toFixed(1)}%`,
        compressionRatio: rawTokens === 0 ? 0 : Number((optimizedTokens / rawTokens).toFixed(4)),
        model: params.model,
        calculatedAt: new Date().toISOString(),
        processingTimeMs: Date.now() - startedAt,
      },
    };
  }
}

export const optimizationService = new OptimizationService();
