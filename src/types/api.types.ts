export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue | undefined };

export type Severity = "info" | "warning" | "critical";

export interface AnalyzeRequestBody {
  userQuery: string;
  documentContext: Record<string, unknown>[];
  model?: string;
}

export interface CreateContextRequestBody {
  documentContext: Record<string, unknown>[];
  model?: string;
}

export interface CompressOnlyRequestBody {
  documentContext: Record<string, unknown>[];
  maxDepth?: number;
  previewRows?: number;
  includeToonString?: boolean;
}

export interface AnalyzeStoredContextRequestBody {
  userQuery: string;
}

export interface ToonCompressionOptions {
  delimiter?: string;
  maxDepth?: number;
}

export interface ToonCompressionResult {
  schemaHeader: string;
  toonString: string;
  keys: string[];
  rows: string[];
  rowCount: number;
  columnCount: number;
  maxDepthUsed: number;
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

export interface RequestToonState {
  compression: ToonCompressionResult;
  analytics: TokenAnalytics;
  model: string;
  startedAt: number;
}

export interface StoredToonContext {
  contextId: string;
  compression: ToonCompressionResult;
  analytics: TokenAnalytics;
  model: string;
  createdAt: string;
  expiresAt: string;
}

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
  reused: boolean;
}

export interface AnalyzeResponseBody {
  success: true;
  data: {
    insights: AiInsights;
    optimizationAnalytics: TokenAnalytics;
    toon: ToonPreview;
    context?: ContextReference;
  };
}

export interface CompressOnlyResponseBody {
  success: true;
  data: {
    optimizationAnalytics: LocalTokenAnalytics;
    toon: CompressOnlyToonResult;
  };
}

export interface CreateContextResponseBody {
  success: true;
  data: {
    context: Omit<ContextReference, "reused">;
    optimizationAnalytics: TokenAnalytics;
    toon: ToonPreview;
  };
}

export interface DeleteContextResponseBody {
  success: true;
  data: {
    contextId: string;
    deleted: boolean;
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
