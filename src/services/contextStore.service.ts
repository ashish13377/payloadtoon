import { randomUUID } from 'node:crypto';
import { createClient } from 'redis';
import { env } from '../config/env';
import type { StoredToonContext, TokenAnalytics, ToonCompressionResult } from '../types/api.types';

interface RedisContextClient {
  connect: () => Promise<unknown>;
  isOpen: boolean;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, options?: { EX?: number }) => Promise<unknown>;
  del: (key: string) => Promise<number>;
}

class MemoryContextStore {
  private readonly store = new Map<string, StoredToonContext>();

  set(context: StoredToonContext): void {
    this.store.set(context.contextId, context);
  }

  get(contextId: string): StoredToonContext | null {
    const context = this.store.get(contextId);
    if (!context) return null;

    if (new Date(context.expiresAt).getTime() <= Date.now()) {
      this.store.delete(contextId);
      return null;
    }

    return context;
  }

  delete(contextId: string): boolean {
    return this.store.delete(contextId);
  }
}

export interface CreateContextParams {
  compression: ToonCompressionResult;
  analytics: TokenAnalytics;
  model: string;
}

export class ContextStoreService {
  private redis: RedisContextClient | null = null;
  private redisUnavailable = false;
  private readonly memoryStore = new MemoryContextStore();

  private key(contextId: string): string {
    return `${env.CONTEXT_KEY_PREFIX}:${contextId}`;
  }

  private async getRedis(): Promise<RedisContextClient | null> {
    if (!env.CONTEXT_STORE_ENABLED || !env.REDIS_URL || this.redisUnavailable) return null;
    if (this.redis?.isOpen) return this.redis;

    try {
      const client = createClient({ url: env.REDIS_URL }) as unknown as RedisContextClient;
      await client.connect();
      this.redis = client;
      return client;
    } catch (error) {
      this.redisUnavailable = true;
      console.warn('[context-store] Redis unavailable. Falling back to in-memory context store.', error);
      return null;
    }
  }

  async create(params: CreateContextParams): Promise<StoredToonContext> {
    const now = Date.now();
    const context: StoredToonContext = {
      contextId: `ctx_${randomUUID().replace(/-/g, '')}`,
      compression: params.compression,
      analytics: params.analytics,
      model: params.model,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + env.CONTEXT_TTL_SECONDS * 1000).toISOString(),
    };

    this.memoryStore.set(context);

    const redis = await this.getRedis();
    if (redis) {
      await redis.set(this.key(context.contextId), JSON.stringify(context), { EX: env.CONTEXT_TTL_SECONDS });
    }

    return context;
  }

  async get(contextId: string): Promise<StoredToonContext | null> {
    const memoryContext = this.memoryStore.get(contextId);
    if (memoryContext) return memoryContext;

    const redis = await this.getRedis();
    if (!redis) return null;

    const raw = await redis.get(this.key(contextId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredToonContext;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      await redis.del(this.key(contextId));
      return null;
    }

    this.memoryStore.set(parsed);
    return parsed;
  }

  async delete(contextId: string): Promise<boolean> {
    const deletedFromMemory = this.memoryStore.delete(contextId);
    const redis = await this.getRedis();

    if (!redis) return deletedFromMemory;

    const deletedFromRedis = await redis.del(this.key(contextId));
    return deletedFromMemory || deletedFromRedis > 0;
  }
}

export const contextStoreService = new ContextStoreService();
