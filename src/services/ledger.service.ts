import { createClient } from 'redis';
import { env } from '../config/env';
import type { LedgerDailyPoint, LedgerTotals, TokenAnalytics } from '../types/api.types';
import { dateRangeKeys, toDateKey } from '../utils/date';

interface RedisLike {
  connect: () => Promise<unknown>;
  isOpen: boolean;
  hIncrBy: (key: string, field: string, increment: number) => Promise<number>;
  hGetAll: (key: string) => Promise<Record<string, string>>;
  expire: (key: string, seconds: number) => Promise<number | boolean>;
}

const EMPTY_TOTALS: LedgerTotals = {
  total_requests_processed: 0,
  total_raw_tokens: 0,
  total_optimized_tokens: 0,
  total_tokens_saved: 0,
  estimated_cost_saved_usd: 0,
};

class MemoryLedgerStore {
  private readonly store = new Map<string, LedgerTotals>();

  increment(key: string, analytics: TokenAnalytics): void {
    const current = this.store.get(key) ?? { ...EMPTY_TOTALS };
    current.total_requests_processed += 1;
    current.total_raw_tokens += analytics.rawTokens;
    current.total_optimized_tokens += analytics.optimizedTokens;
    current.total_tokens_saved += analytics.tokensSaved;
    current.estimated_cost_saved_usd = this.estimateUsd(current.total_tokens_saved);
    this.store.set(key, current);
  }

  get(key: string): LedgerTotals {
    return this.store.get(key) ?? { ...EMPTY_TOTALS };
  }

  private estimateUsd(tokensSaved: number): number {
    return Number(((tokensSaved / 1_000_000) * env.GEMINI_INPUT_PRICE_PER_1M_USD).toFixed(6));
  }
}

export class LedgerService {
  private redis: RedisLike | null = null;
  private readonly memoryStore = new MemoryLedgerStore();
  private redisUnavailable = false;

  private get keyPrefix(): string {
    return env.LEDGER_KEY_PREFIX;
  }

  private get allTimeKey(): string {
    return `${this.keyPrefix}:all_time`;
  }

  private dailyKey(dateKey: string): string {
    return `${this.keyPrefix}:daily:${dateKey}`;
  }

  private async getRedis(): Promise<RedisLike | null> {
    if (!env.LEDGER_ENABLED || !env.REDIS_URL || this.redisUnavailable) return null;
    if (this.redis?.isOpen) return this.redis;

    try {
      const client = createClient({ url: env.REDIS_URL }) as unknown as RedisLike;
      await client.connect();
      this.redis = client;
      return client;
    } catch (error) {
      this.redisUnavailable = true;
      console.warn('[ledger] Redis unavailable. Falling back to in-memory ledger.', error);
      return null;
    }
  }

  async recordUsage(analytics: TokenAnalytics, now = new Date()): Promise<void> {
    const dateKey = toDateKey(now);
    const dailyKey = this.dailyKey(dateKey);

    this.memoryStore.increment(this.allTimeKey, analytics);
    this.memoryStore.increment(dailyKey, analytics);

    const redis = await this.getRedis();
    if (!redis) return;

    const estimatedMicroUsd = Math.round((analytics.tokensSaved / 1_000_000) * env.GEMINI_INPUT_PRICE_PER_1M_USD * 1_000_000);

    await Promise.all([
      this.incrementRedisTotals(redis, this.allTimeKey, analytics, estimatedMicroUsd),
      this.incrementRedisTotals(redis, dailyKey, analytics, estimatedMicroUsd),
      redis.expire(dailyKey, 60 * 60 * 24 * 400),
    ]);
  }

  async getLedger(days: number): Promise<{ allTime: LedgerTotals; series: LedgerDailyPoint[] }> {
    const redis = await this.getRedis();
    const dateKeys = dateRangeKeys(days);

    if (!redis) {
      return {
        allTime: this.memoryStore.get(this.allTimeKey),
        series: dateKeys.map((date) => ({ date, ...this.memoryStore.get(this.dailyKey(date)) })),
      };
    }

    const [allTimeRaw, ...dailyRaw] = await Promise.all([
      redis.hGetAll(this.allTimeKey),
      ...dateKeys.map((date) => redis.hGetAll(this.dailyKey(date))),
    ]);

    return {
      allTime: this.parseTotals(allTimeRaw),
      series: dailyRaw.map((raw, index) => ({ date: dateKeys[index], ...this.parseTotals(raw) })),
    };
  }

  private async incrementRedisTotals(
    redis: RedisLike,
    key: string,
    analytics: TokenAnalytics,
    estimatedMicroUsd: number,
  ): Promise<void> {
    await Promise.all([
      redis.hIncrBy(key, 'total_requests_processed', 1),
      redis.hIncrBy(key, 'total_raw_tokens', analytics.rawTokens),
      redis.hIncrBy(key, 'total_optimized_tokens', analytics.optimizedTokens),
      redis.hIncrBy(key, 'total_tokens_saved', analytics.tokensSaved),
      redis.hIncrBy(key, 'estimated_cost_saved_usd_micro', estimatedMicroUsd),
    ]);
  }

  private parseTotals(raw: Record<string, string>): LedgerTotals {
    const microUsd = Number(raw.estimated_cost_saved_usd_micro ?? 0);

    return {
      total_requests_processed: Number(raw.total_requests_processed ?? 0),
      total_raw_tokens: Number(raw.total_raw_tokens ?? 0),
      total_optimized_tokens: Number(raw.total_optimized_tokens ?? 0),
      total_tokens_saved: Number(raw.total_tokens_saved ?? 0),
      estimated_cost_saved_usd: Number((microUsd / 1_000_000).toFixed(6)),
    };
  }
}

export const ledgerService = new LedgerService();
