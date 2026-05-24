import type { RequestToonState } from './api.types';

declare global {
  namespace Express {
    interface Request {
      toon?: RequestToonState;
    }
  }
}

export {};
