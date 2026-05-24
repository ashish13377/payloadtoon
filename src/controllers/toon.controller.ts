import type { Request, Response } from 'express';
import type { CompressOnlyResponseBody, LocalTokenAnalytics } from '../types/api.types';
import { localTokenService } from '../services/localToken.service';
import { HttpError } from '../utils/httpError';
import { convertJsonToToon, ToonParserError } from '../utils/toonParser';
import { CompressOnlyRequestSchema } from '../validators/analyze.validator';
import { ledgerService } from '../services/ledger.service';

function buildLocalAnalytics(params: {
  rawPayload: string;
  optimizedPayload: string;
  startedAt: number;
}): LocalTokenAnalytics {
  const raw = localTokenService.countTokens(params.rawPayload);
  const optimized = localTokenService.countTokens(params.optimizedPayload);
  const tokensSaved = raw.tokens - optimized.tokens;
  const savingsPercentageNumber = raw.tokens === 0 ? 0 : (tokensSaved / raw.tokens) * 100;

  return {
    rawTokens: raw.tokens,
    optimizedTokens: optimized.tokens,
    tokensSaved,
    savingsPercentage: `${savingsPercentageNumber.toFixed(1)}%`,
    compressionRatio: raw.tokens === 0 ? 0 : Number((optimized.tokens / raw.tokens).toFixed(4)),
    model: 'local-token-counter',
    calculatedAt: new Date().toISOString(),
    processingTimeMs: Date.now() - params.startedAt,
    tokenCounter: optimized.tokenizer,
    isEstimate: raw.isEstimate || optimized.isEstimate,
    note: optimized.note,
  };
}

export async function compressOnly(req: Request, res: Response<CompressOnlyResponseBody>): Promise<void> {
  const startedAt = Date.now();
  const parsed = CompressOnlyRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new HttpError(400, 'Invalid compression request body.', parsed.error.flatten());
  }

  try {
    const compression = convertJsonToToon(parsed.data.documentContext, {
      maxDepth: parsed.data.maxDepth ?? 5,
    });

    const rawPayload = JSON.stringify(parsed.data.documentContext);
    const optimizedPayload = `${compression.schemaHeader}\n${compression.toonString}`;
    const analytics = buildLocalAnalytics({ rawPayload, optimizedPayload, startedAt });

    void ledgerService.recordUsage(analytics).catch((error) => {
      console.warn('[ledger] Failed to record token analytics for local compression.', error);
    });

    res.status(200).json({
      success: true,
      data: {
        optimizationAnalytics: analytics,
        toon: {
          schemaHeader: compression.schemaHeader,
          toonString: parsed.data.includeToonString === false ? undefined : compression.toonString,
          preview: compression.rows.slice(0, parsed.data.previewRows ?? 10).join('\n'),
          rowCount: compression.rowCount,
          columnCount: compression.columnCount,
          keys: compression.keys,
          maxDepthUsed: compression.maxDepthUsed,
        },
      },
    });
  } catch (error) {
    if (error instanceof ToonParserError) {
      throw new HttpError(400, error.message);
    }

    throw error;
  }
}
