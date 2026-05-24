import type { Request, Response } from 'express';
import { env } from '../config/env';

export function healthCheck(_req: Request, res: Response): void {
  res.status(200).json({
    success: true,
    data: {
      service: '@toon/api',
      status: 'ok',
      environment: env.NODE_ENV,
      model: env.GEMINI_MODEL,
      timestamp: new Date().toISOString(),
    },
  });
}
