import type { ErrorRequestHandler } from 'express';
import { env } from '../config/env';
import { isHttpError } from '../utils/httpError';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const statusCode = isHttpError(error) ? error.statusCode : 500;
  const message = isHttpError(error) ? error.message : 'Internal server error.';

  if (statusCode >= 500) {
    console.error('[api:error]', error);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      details: isHttpError(error) ? error.details : undefined,
      stack: env.NODE_ENV === 'development' ? error.stack : undefined,
    },
  });
};
