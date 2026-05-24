import compression from 'compression';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { corsOptions } from './config/cors';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/notFound.middleware';
import apiRoutes from './routes';

export function createServer(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(compression());
  app.use(express.json({ limit: env.MAX_JSON_BODY_SIZE }));
  app.use(express.urlencoded({ extended: true, limit: env.MAX_JSON_BODY_SIZE }));

  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      limit: env.RATE_LIMIT_MAX,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    }),
  );

  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  app.use('/api/v1', apiRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
