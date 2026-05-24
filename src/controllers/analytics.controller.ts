import type { Request, Response } from 'express';
import type { LedgerResponse } from '../types/api.types';
import { ledgerService } from '../services/ledger.service';
import { HttpError } from '../utils/httpError';
import { LedgerQuerySchema } from '../validators/analyze.validator';

export async function getLedger(req: Request, res: Response<LedgerResponse>): Promise<void> {
  const parsed = LedgerQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new HttpError(400, 'Invalid ledger query.', parsed.error.flatten());
  }

  const { allTime, series } = await ledgerService.getLedger(parsed.data.days);

  res.status(200).json({
    success: true,
    data: {
      days: parsed.data.days,
      allTime,
      series,
    },
  });
}
