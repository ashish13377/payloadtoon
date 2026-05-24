export type Severity = "info" | "warning" | "critical";

export interface FlaggedItem {
  id: string;
  reason: string;
  severity: Severity;
}

export interface AiInsights {
  summary: string;
  queryAnswer: string;
  flaggedItems: FlaggedItem[];
  recommendations: string[];
}

export interface TokenAnalytics {
  rawTokens: number;
  optimizedTokens: number;
  tokensSaved: number;
  savingsPercentage: string;
  compressionRatio: number;
  model: string;
  calculatedAt: string;
  processingTimeMs: number;
}

export interface ToonPreview {
  schemaHeader: string;
  preview: string;
  rowCount: number;
  columnCount: number;
  keys: string[];
}

export interface ContextReference {
  contextId: string;
  createdAt: string;
  expiresAt: string;
  reused?: boolean;
}

export interface AnalyzeResponse {
  success: true;
  data: {
    insights: AiInsights;
    optimizationAnalytics: TokenAnalytics;
    toon: ToonPreview;
    context?: ContextReference;
  };
}

export interface CreateContextResponse {
  success: true;
  data: {
    context: ContextReference;
    optimizationAnalytics: TokenAnalytics;
    toon: ToonPreview;
  };
}

export interface LedgerTotals {
  total_requests_processed: number;
  total_raw_tokens: number;
  total_optimized_tokens: number;
  total_tokens_saved: number;
  estimated_cost_saved_usd: number;
}

export interface LedgerDailyPoint extends LedgerTotals {
  date: string;
}

export interface LedgerResponse {
  success: true;
  data: {
    days: number;
    allTime: LedgerTotals;
    series: LedgerDailyPoint[];
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    details?: unknown;
  };
}

export interface SavedPayload {
  id: string;
  name: string;
  userQuery: string;
  documentContext: Record<string, unknown>[];
  createdAt: string;
}

export interface SavedPayloadsStatusResponse {
  success: true;
  data: {
    enabled: boolean;
  };
}

export interface GetSavedPayloadsResponse {
  success: true;
  data: SavedPayload[];
}

export interface SavePayloadResponse {
  success: true;
  data: SavedPayload;
}

export interface DeleteSavedPayloadResponse {
  success: true;
  data: {
    id: string;
    deleted: boolean;
  };
}

/* ─── Gemini-free compress endpoint types ─── */

export interface LocalTokenAnalytics extends TokenAnalytics {
  tokenCounter: string;
  isEstimate: boolean;
  note: string;
}

export interface CompressOnlyToonResult {
  schemaHeader: string;
  toonString?: string;
  preview: string;
  rowCount: number;
  columnCount: number;
  keys: string[];
  maxDepthUsed: number;
}

export interface CompressResponse {
  success: true;
  data: {
    optimizationAnalytics: LocalTokenAnalytics;
    toon: CompressOnlyToonResult;
  };
}
