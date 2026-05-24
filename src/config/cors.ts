import type { CorsOptions } from 'cors';
import { corsOrigins, env } from './env';

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (corsOrigins.includes(origin)) return callback(null, true);

    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: env.NODE_ENV === 'production' ? 86_400 : 600,
};
