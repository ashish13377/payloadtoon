import type {
  AnalyzeResponse,
  ApiErrorResponse,
  CompressResponse,
  CreateContextResponse,
  LedgerResponse,
  SavedPayloadsStatusResponse,
  GetSavedPayloadsResponse,
  SavePayloadResponse,
  DeleteSavedPayloadResponse,
} from "../types/api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1";

async function request<T extends object>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json()) as T | ApiErrorResponse;

  if (!response.ok || ("success" in payload && payload.success === false)) {
    const message =
      "error" in payload
        ? payload.error.message
        : `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export async function analyzePayload(params: {
  userQuery: string;
  documentContext: unknown[];
}): Promise<AnalyzeResponse> {
  return request<AnalyzeResponse>("/analyze", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function createStoredContext(params: {
  documentContext: unknown[];
}): Promise<CreateContextResponse> {
  return request<CreateContextResponse>("/contexts", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function analyzeStoredContext(params: {
  contextId: string;
  userQuery: string;
}): Promise<AnalyzeResponse> {
  return request<AnalyzeResponse>(
    `/contexts/${encodeURIComponent(params.contextId)}/analyze`,
    {
      method: "POST",
      body: JSON.stringify({ userQuery: params.userQuery }),
    },
  );
}

export async function fetchLedger(days: number): Promise<LedgerResponse> {
  return request<LedgerResponse>(`/analytics/ledger?days=${days}`, {
    method: "GET",
    cache: "no-store",
  });
}

export async function fetchSavedPayloadsStatus(): Promise<SavedPayloadsStatusResponse> {
  return request<SavedPayloadsStatusResponse>("/saved-payloads/status", {
    method: "GET",
    cache: "no-store",
  });
}

export async function fetchSavedPayloads(): Promise<GetSavedPayloadsResponse> {
  return request<GetSavedPayloadsResponse>("/saved-payloads", {
    method: "GET",
    cache: "no-store",
  });
}

export async function savePayload(params: {
  name?: string;
  userQuery: string;
  documentContext: unknown[];
}): Promise<SavePayloadResponse> {
  return request<SavePayloadResponse>("/saved-payloads", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function deleteSavedPayload(id: string): Promise<DeleteSavedPayloadResponse> {
  return request<DeleteSavedPayloadResponse>(`/saved-payloads/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/* ─── Gemini-free compress endpoint ─── */

export async function compressPayload(params: {
  documentContext: unknown[];
  maxDepth?: number;
  previewRows?: number;
  includeToonString?: boolean;
}): Promise<CompressResponse> {
  return request<CompressResponse>("/toon/compress", {
    method: "POST",
    body: JSON.stringify(params),
  });
}
