"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  ChevronRight,
  Code2,
  Cpu,
  Database,
  Gauge,
  Loader2,
  PiggyBank,
  RefreshCw,
  Save,
  Sparkles,
  Terminal,
  Trash2,
  WifiOff,
  Zap,
} from "lucide-react";
import {
  analyzePayload,
  analyzeStoredContext,
  compressPayload,
  createStoredContext,
  fetchLedger,
  fetchSavedPayloadsStatus,
  fetchSavedPayloads,
  savePayload,
  deleteSavedPayload,
} from "../lib/api";
import { FlaggedItems } from "../components/FlaggedItems";
import { MetricCard } from "../components/MetricCard";
import { TokenChart } from "../components/TokenChart";
import type { AnalyzeResponse, CompressResponse, LedgerResponse, SavedPayload } from "../types/api";

const sampleContext = JSON.stringify(
  [
    {
      serverId: "svr_01",
      endpoint: "/auth",
      status: 200,
      latencyMs: 121,
      user: { id: 101, role: "admin" },
      tags: ["auth", "healthy"],
    },
    {
      serverId: "svr_02",
      endpoint: "/payout",
      status: 500,
      latencyMs: 843,
      user: { id: 102, role: "operator" },
      tags: ["payments", "critical"],
      retry: { count: 3, lastAt: "2026-05-24T05:30:00Z" },
    },
    {
      serverId: "svr_03",
      endpoint: "/webhook",
      status: 429,
      latencyMs: 402,
      user: { id: 103, role: "integration" },
      tags: ["webhook", "throttled"],
    },
  ],
  null,
  2,
);

function formatNumber(value: number | undefined): string {
  return Number(value ?? 0).toLocaleString();
}

/** Gemini 2.0 Flash input token pricing: $0.10 per 1M tokens */
const COST_PER_TOKEN_USD = 0.10 / 1_000_000;

const endpoints = [
  { method: "POST", path: "/api/v1/analyze" },
  { method: "POST", path: "/api/v1/toon/compress", tag: "no-ai" },
  { method: "POST", path: "/api/v1/contexts" },
  { method: "POST", path: "/api/v1/contexts/:id/analyze" },
  { method: "GET", path: "/api/v1/analytics/ledger" },
];

export default function DashboardPage() {
  const [userQuery, setUserQuery] = useState(
    "Summarize operational issues and flag critical records.",
  );
  const [jsonInput, setJsonInput] = useState(sampleContext);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [contextId, setContextId] = useState<string | null>(null);
  const [contextExpiresAt, setContextExpiresAt] = useState<string | null>(null);
  const [ledger, setLedger] = useState<LedgerResponse | null>(null);
  const [days, setDays] = useState(7);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreatingContext, setIsCreatingContext] = useState(false);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gemini-free compress state
  const [compressResult, setCompressResult] = useState<CompressResponse | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Session-level accumulator for compress-only savings
  const [sessionTokensSaved, setSessionTokensSaved] = useState(0);
  const [sessionCompressCount, setSessionCompressCount] = useState(0);

  const [isStoreEnabled, setIsStoreEnabled] = useState(false);
  const [savedPayloads, setSavedPayloads] = useState<SavedPayload[]>([]);
  const [isSavedPayloadsLoading, setIsSavedPayloadsLoading] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const [isBackendOffline, setIsBackendOffline] = useState(false);
  const [isCheckingBackend, setIsCheckingBackend] = useState(false);

  async function testBackendConnection() {
    setIsCheckingBackend(true);
    setError(null);
    try {
      // Direct simple call to check connectivity
      await fetchSavedPayloadsStatus();
      setIsBackendOffline(false);
      
      // Proactively load required configs
      void checkStoreStatus();
      void loadLedger(days);
    } catch (err) {
      console.warn("[Backend-Check] API server offline:", err);
      setIsBackendOffline(true);
    } finally {
      setIsCheckingBackend(false);
    }
  }

  async function checkStoreStatus() {
    try {
      const response = await fetchSavedPayloadsStatus();
      if (response.success) {
        setIsBackendOffline(false);
        if (response.data.enabled) {
          setIsStoreEnabled(true);
          void loadSavedPayloads();
        } else {
          setIsStoreEnabled(false);
        }
      }
    } catch (err) {
      console.warn("Failed to check file store status:", err);
      setIsBackendOffline(true);
    }
  }

  async function loadSavedPayloads() {
    setIsSavedPayloadsLoading(true);
    try {
      const response = await fetchSavedPayloads();
      if (response.success) {
        setSavedPayloads(response.data);
        setIsBackendOffline(false);
      }
    } catch (err) {
      console.warn("Failed to load saved payloads:", err);
      setIsBackendOffline(true);
    } finally {
      setIsSavedPayloadsLoading(false);
    }
  }

  useEffect(() => {
    void testBackendConnection();
  }, []);

  async function loadLedger(range = days) {
    setIsLedgerLoading(true);
    try {
      const response = await fetchLedger(range);
      setLedger(response);
      setIsBackendOffline(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ledger.");
      setIsBackendOffline(true);
    } finally {
      setIsLedgerLoading(false);
    }
  }

  useEffect(() => {
    void loadLedger(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const parsedPreview = useMemo(() => {
    try {
      const parsed = JSON.parse(jsonInput) as unknown;
      return Array.isArray(parsed)
        ? `${parsed.length} records ready`
        : "Input must be a JSON array";
    } catch {
      return "Invalid JSON";
    }
  }, [jsonInput]);

  const isValidJson = parsedPreview.includes("ready");

  async function handleAnalyze() {
    setError(null);
    setIsAnalyzing(true);

    try {
      const parsed = JSON.parse(jsonInput) as unknown;
      if (!Array.isArray(parsed))
        throw new Error("Context payload must be a JSON array.");

      const response = await analyzePayload({
        userQuery,
        documentContext: parsed,
      });
      setResult(response);
      await loadLedger(days);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to analyze payload.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleCreateContext() {
    setError(null);
    setIsCreatingContext(true);

    try {
      const parsed = JSON.parse(jsonInput) as unknown;
      if (!Array.isArray(parsed))
        throw new Error("Context payload must be a JSON array.");

      const response = await createStoredContext({ documentContext: parsed });
      setContextId(response.data.context.contextId);
      setContextExpiresAt(response.data.context.expiresAt);
      setResult(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create stored context.",
      );
    } finally {
      setIsCreatingContext(false);
    }
  }

  async function handleAnalyzeStoredContext() {
    if (!contextId) {
      setError("Create a stored context first.");
      return;
    }

    setError(null);
    setIsAnalyzing(true);

    try {
      const response = await analyzeStoredContext({ contextId, userQuery });
      setResult(response);
      await loadLedger(days);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to analyze stored context.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleCompressOnly() {
    setError(null);
    setIsCompressing(true);

    try {
      const parsed = JSON.parse(jsonInput) as unknown;
      if (!Array.isArray(parsed))
        throw new Error("Context payload must be a JSON array.");

      const response = await compressPayload({
        documentContext: parsed,
      });
      setCompressResult(response);
      setResult(null); // clear AI results

      // Accumulate session savings
      const saved = response.data.optimizationAnalytics.tokensSaved;
      if (saved > 0) {
        setSessionTokensSaved((prev) => prev + saved);
        setSessionCompressCount((prev) => prev + 1);
      }
      await loadLedger(days);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to compress payload.",
      );
    } finally {
      setIsCompressing(false);
    }
  }

  async function handleSavePayload() {
    if (!saveName.trim()) {
      setError("Please enter a name to save the payload.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      const parsed = JSON.parse(jsonInput) as unknown;
      if (!Array.isArray(parsed)) {
        throw new Error("Context payload must be a JSON array.");
      }
      const response = await savePayload({
        name: saveName,
        userQuery,
        documentContext: parsed,
      });
      if (response.success) {
        setSaveName("");
        setShowSaveModal(false);
        await loadSavedPayloads();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save payload.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeletePayload(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const response = await deleteSavedPayload(id);
      if (response.success) {
        await loadSavedPayloads();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete saved payload.",
      );
    }
  }

  function handleLoadPayload(payload: SavedPayload) {
    setUserQuery(payload.userQuery);
    setJsonInput(JSON.stringify(payload.documentContext, null, 2));
  }

  const analytics = result?.data.optimizationAnalytics ?? compressResult?.data.optimizationAnalytics;
  const allTime = ledger?.data.allTime;
  const compressAnalytics = compressResult?.data.optimizationAnalytics;
  const compressToon = compressResult?.data.toon;

  // Combine ledger all-time + session compress savings
  const totalTokensSaved = (allTime?.total_tokens_saved ?? 0) + sessionTokensSaved;
  const totalCostSaved = (allTime?.estimated_cost_saved_usd ?? 0) + (sessionTokensSaved * COST_PER_TOKEN_USD);

  if (isBackendOffline) {
    return (
      <main className="min-h-screen flex items-center justify-center px-3 py-8 sm:px-4 sm:py-12 relative overflow-hidden bg-[#070a13]">
        {/* Glowing decorative mesh background */}
        <div className="absolute -top-20 -right-20 w-48 sm:w-80 h-48 sm:h-80 rounded-full bg-danger/10 blur-3xl animate-pulse pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 sm:w-80 h-48 sm:h-80 rounded-full bg-accent/10 blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />

        <div className="relative glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 max-w-lg w-full text-center border border-white/10 shadow-glow animate-scale-in">
          {/* Animated pulsing warning server icon */}
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center mb-4 sm:mb-6 shadow-[0_0_30px_rgba(239,68,68,0.15)] animate-pulse-glow">
            <WifiOff size={32} className="text-danger animate-pulse sm:hidden" />
            <WifiOff size={40} className="text-danger animate-pulse hidden sm:block" />
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-none mb-2 sm:mb-3">
            Diagnostics Server Offline
          </h1>
          
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4 sm:mb-6">
            We couldn&apos;t establish a connection to the PayloadTOON backend. Ensure the backend diagnostics server is actively running.
          </p>

          {/* Start instructions codebox */}
          <div className="rounded-lg sm:rounded-xl border border-white/[0.06] bg-[#0a0d18] p-3 sm:p-5 text-left mb-4 sm:mb-6 font-mono text-xs text-slate-300">
            <div className="flex items-center gap-2 mb-2 sm:mb-3 text-slate-400 font-semibold font-sans">
              <Terminal size={14} className="text-accent-light flex-shrink-0" />
              <span>How to start the backend:</span>
            </div>
            <div className="space-y-2 text-slate-400 font-sans text-[11px] sm:text-xs">
              <p>1. Open a new terminal in the project root directory.</p>
              <p>2. Execute the start command:</p>
              <div className="bg-white/[0.03] border border-white/[0.04] p-2.5 sm:p-3 rounded-lg text-emerald-400 font-mono font-semibold select-all my-1.5 flex items-center justify-between gap-2">
                <span>yarn dev</span>
                <span className="text-[9px] sm:text-[10px] text-slate-500 font-sans font-normal hidden xs:inline">Double-click to copy</span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-500 mt-2 font-sans break-all">
                Server defaults to port <span className="font-mono bg-white/[0.04] px-1 py-0.5 rounded text-slate-400">3000</span>.
                API: <code className="text-accent-light font-mono bg-accent-muted px-1 py-0.5 rounded">http://localhost:3000/api/v1</code>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={testBackendConnection}
              disabled={isCheckingBackend}
              className="group inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-accent to-accent-dark px-5 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-white shadow-glow transition-all duration-300 hover:shadow-glow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed w-full cursor-pointer"
            >
              <RefreshCw size={16} className={`transition-transform ${isCheckingBackend ? 'animate-spin' : 'group-hover:rotate-180 duration-500'}`} />
              {isCheckingBackend ? "Reconnecting..." : "Retry Connection"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-3 py-4 sm:px-5 sm:py-6 md:px-6 md:py-8 lg:px-10 lg:py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:gap-6 lg:gap-8">
        {/* ─── Hero Header ─── */}
        <header className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 lg:p-10 animate-fade-in opacity-0 overflow-hidden relative">
          {/* Decorative accent orb */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-accent/10 blur-3xl animate-float pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-success/8 blur-3xl animate-float pointer-events-none" style={{ animationDelay: '3s' }} />

          <div className="relative flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1 min-w-0">
              <div className="mb-3 sm:mb-4 inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-accent/20 bg-accent-muted px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-accent-light">
                <Sparkles size={14} className="animate-pulse sm:hidden" />
                <Sparkles size={16} className="animate-pulse hidden sm:block" />
                PayloadTOON Optimizer
              </div>
              <h1 className="max-w-4xl text-2xl font-extrabold tracking-tight text-white sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl leading-[1.15] sm:leading-[1.1]">
                Compress heavy JSON into{" "}
                <span className="bg-gradient-to-r from-accent-light via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  LLM-friendly TOON
                </span>{" "}
                and measure the token savings.
              </h1>
              <p className="mt-3 sm:mt-4 max-w-2xl text-sm sm:text-base md:text-lg text-slate-400 leading-relaxed">
                Test local JSON-to-TOON compression, optional Gemini AI analysis,
                and Redis-backed token savings trends in one operational dashboard.
              </p>
            </div>

            {/* API Endpoints card */}
            <div className="flex-shrink-0 rounded-xl sm:rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 sm:p-4 backdrop-blur-sm lg:min-w-[280px]">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <Terminal size={14} className="text-accent-light flex-shrink-0" />
                <p className="font-semibold text-xs sm:text-sm text-slate-300">API Endpoints</p>
              </div>
              <div className="space-y-1 sm:space-y-1.5">
                {endpoints.map((ep) => (
                  <div key={ep.path} className="flex items-center gap-1.5 sm:gap-2 group">
                    <span className={`text-[9px] sm:text-[10px] font-bold tracking-wider rounded px-1 sm:px-1.5 py-0.5 flex-shrink-0 ${
                      ep.method === "GET"
                        ? "bg-success-muted text-success"
                        : "bg-accent-muted text-accent-light"
                    }`}>
                      {ep.method}
                    </span>
                    <code className="text-[10px] sm:text-xs text-slate-500 group-hover:text-slate-300 transition-colors font-mono truncate">
                      {ep.path}
                    </code>
                    {"tag" in ep && ep.tag === "no-ai" && (
                      <span className="text-[8px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-1 py-0.5 flex-shrink-0 hidden sm:inline">
                        no AI
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* ─── Metric Cards ─── */}
        <section className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="stagger-1">
            <MetricCard
              label="Raw Tokens"
              value={formatNumber(analytics?.rawTokens)}
              helper="Native JSON footprint"
              icon={<Activity size={22} />}
              accentColor="accent"
            />
          </div>
          <div className="stagger-2">
            <MetricCard
              label="TOON Tokens"
              value={formatNumber(analytics?.optimizedTokens)}
              helper="Compressed payload footprint"
              icon={<Gauge size={22} />}
              accentColor="success"
            />
          </div>
          <div className="stagger-3">
            <MetricCard
              label="Tokens Saved"
              value={formatNumber(analytics?.tokensSaved)}
              helper={analytics?.savingsPercentage ?? "Run an analysis"}
              icon={<BarChart3 size={22} />}
              accentColor="warning"
            />
          </div>
          <div className="stagger-4">
            <MetricCard
              label="All-Time Saved"
              value={formatNumber(totalTokensSaved)}
              helper={`$${totalCostSaved.toFixed(4)} est. · ${sessionCompressCount > 0 ? `${sessionCompressCount} local` : 'Gemini Flash rate'}`}
              icon={<PiggyBank size={22} />}
              accentColor="danger"
            />
          </div>
        </section>

        {/* ─── Main Grid: Analyzer + Results ─── */}
        <section className="grid gap-4 sm:gap-5 lg:gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left: Analyze Panel */}
          <div className="glass-card min-w-0 rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 animate-slide-up opacity-0" style={{ animationDelay: '0.2s' }}>
            <div className="mb-4 sm:mb-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Code2 size={16} className="text-accent-light flex-shrink-0 sm:hidden" />
                  <Code2 size={18} className="text-accent-light flex-shrink-0 hidden sm:block" />
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    Analyze JSON Payload
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-500">
                  Paste any flat or nested JSON array. The backend will generate
                  the TOON schema dynamically.
                </p>
              </div>
              <span className={`self-start flex-shrink-0 rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold tracking-wide transition-colors ${
                isValidJson
                  ? "bg-success-muted text-success border border-success/20"
                  : "bg-danger-muted text-danger border border-danger/20"
              }`}>
                {parsedPreview}
              </span>
            </div>

            <label
              className="text-sm font-semibold text-slate-300"
              htmlFor="query"
            >
              User Query
            </label>
            <textarea
              id="query"
              value={userQuery}
              onChange={(event) => setUserQuery(event.target.value)}
              className="mt-1.5 sm:mt-2 min-h-16 sm:min-h-24 w-full rounded-lg sm:rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 sm:p-4 text-sm sm:text-base text-slate-200 placeholder-slate-600 outline-none transition-all duration-300 focus:border-accent/40 focus:bg-white/[0.05] focus:ring-2 focus:ring-accent/20 resize-none"
            />

            <label
              className="mt-5 block text-sm font-semibold text-slate-300"
              htmlFor="json-input"
            >
              Context Payload Editor
            </label>
            <textarea
              id="json-input"
              value={jsonInput}
              onChange={(event) => setJsonInput(event.target.value)}
              spellCheck={false}
              className="mt-1.5 sm:mt-2 min-h-[14rem] sm:min-h-[20rem] md:min-h-[24rem] lg:min-h-[28rem] w-full rounded-lg sm:rounded-xl border border-white/[0.06] bg-[#0a0d18] p-3 sm:p-4 font-mono text-xs sm:text-sm text-emerald-300/80 outline-none transition-all duration-300 focus:border-accent/40 focus:ring-2 focus:ring-accent/20 resize-y"
            />

            {error ? (
              <div className="mt-4 rounded-xl border border-danger/20 bg-danger-muted p-4 text-sm font-medium text-danger flex items-start gap-2 animate-scale-in">
                <span className="mt-0.5">⚠</span>
                <span>{error}</span>
              </div>
            ) : null}

            <div className="mt-4 sm:mt-5 grid grid-cols-2 sm:flex sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing || isCreatingContext}
                className="group inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-accent to-accent-dark px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-glow transition-all duration-300 hover:shadow-glow-lg hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                {isAnalyzing && !contextId ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Zap size={16} className="transition-transform group-hover:rotate-12" />
                )}
                <span className="truncate">One-shot analyze</span>
              </button>
              <button
                type="button"
                onClick={handleCreateContext}
                disabled={isAnalyzing || isCreatingContext}
                className="group inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border border-white/10 bg-white/[0.04] px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-300 transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20 hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreatingContext ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Gauge size={16} className="transition-transform group-hover:scale-110" />
                )}
                <span className="truncate">Stored context</span>
              </button>
              <button
                type="button"
                onClick={handleAnalyzeStoredContext}
                disabled={!contextId || isAnalyzing || isCreatingContext}
                className="group inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all duration-300 hover:shadow-[0_0_40px_rgba(16,185,129,0.25)] hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                {isAnalyzing && contextId ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Sparkles size={16} className="transition-transform group-hover:rotate-12" />
                )}
                <span className="truncate">Analyze stored</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSaveModal(true)}
                disabled={!isValidJson}
                className="group inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border border-white/10 bg-white/[0.04] px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-300 transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20 hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={16} className="transition-transform group-hover:scale-110" />
                <span className="truncate">Save template</span>
              </button>
              <button
                type="button"
                onClick={handleCompressOnly}
                disabled={isCompressing || isAnalyzing || !isValidJson}
                className="group col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white shadow-[0_0_20px_rgba(245,158,11,0.15)] transition-all duration-300 hover:shadow-[0_0_40px_rgba(245,158,11,0.25)] hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                {isCompressing ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Cpu size={16} className="transition-transform group-hover:scale-110" />
                )}
                <span className="truncate">Compress only</span>
                <span className="hidden sm:inline text-[9px] font-bold uppercase tracking-wider text-amber-200/60 bg-amber-900/30 rounded px-1 py-0.5">no AI</span>
              </button>
            </div>

            {contextId ? (
              <div className="mt-4 rounded-xl border border-accent/20 bg-accent-muted p-4 text-sm text-accent-light animate-scale-in">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent-light animate-pulse" />
                  <p className="font-semibold">Stored context ready</p>
                </div>
                <p className="mt-1.5 break-all font-mono text-xs text-accent-light/70">
                  {contextId}
                </p>
                {contextExpiresAt ? (
                  <p className="mt-1 text-xs text-accent-light/50">
                    Expires: {new Date(contextExpiresAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* Saved Templates Panel */}
            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <Database size={14} className="text-accent-light flex-shrink-0 sm:hidden" />
                  <Database size={16} className="text-accent-light flex-shrink-0 hidden sm:block" />
                  <h3 className="text-xs sm:text-sm font-semibold text-white">Saved Templates</h3>
                  {isStoreEnabled ? (
                    <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1 sm:px-1.5 py-0.5 flex-shrink-0" title="Saved configurations persist to disk">
                      Disk
                    </span>
                  ) : (
                    <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-1 sm:px-1.5 py-0.5 flex-shrink-0" title="Temporary session only. Set FILE_STORE_ENABLED=true in backend .env to persist to disk.">
                      Session
                    </span>
                  )}
                </div>
                {isSavedPayloadsLoading && <Loader2 className="animate-spin text-slate-500" size={14} />}
              </div>

              {savedPayloads.length === 0 ? (
                <p className="text-[10px] sm:text-xs text-slate-500 italic">No saved templates yet. Click &quot;Save Template&quot; to persist the current input.</p>
              ) : (
                <div className="grid gap-2 grid-cols-1 md:grid-cols-2 max-h-36 sm:max-h-48 overflow-y-auto pr-1">
                  {savedPayloads.map((payload) => (
                    <div
                      key={payload.id}
                      onClick={() => handleLoadPayload(payload)}
                      className="group/item flex items-center justify-between gap-2 sm:gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] px-2.5 sm:px-3 py-2 text-left cursor-pointer transition-all duration-200 hover:bg-white/[0.06] hover:border-white/10"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] sm:text-xs font-semibold text-slate-300 truncate group-hover/item:text-white transition-colors">{payload.name}</p>
                        <p className="text-[9px] sm:text-[10px] text-slate-500 truncate">{payload.userQuery}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeletePayload(payload.id, e)}
                        className="text-slate-500 hover:text-danger p-1 rounded transition-colors sm:opacity-0 sm:group-hover/item:opacity-100 flex-shrink-0"
                        title="Delete template"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Results Panel */}
          <div className="flex flex-col gap-6 min-w-0">
            {/* AI Response */}
            <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 animate-slide-up opacity-0" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} className="text-accent-light sm:hidden" />
                <Sparkles size={18} className="text-accent-light hidden sm:block" />
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Structured AI Response
                </h2>
              </div>
              {result ? (
                <div className="mt-4 sm:mt-5 flex flex-col gap-4 sm:gap-6">
                  <div>
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5 sm:mb-2">
                      Summary
                    </p>
                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                      {result.data.insights.summary}
                    </p>
                  </div>
                  <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <div>
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5 sm:mb-2">
                      Answer
                    </p>
                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                      {result.data.insights.queryAnswer}
                    </p>
                  </div>
                  <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <div>
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 mb-2 sm:mb-3">
                      Flagged Items
                    </p>
                    <FlaggedItems items={result.data.insights.flaggedItems} />
                  </div>
                  <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <div>
                    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5 sm:mb-2">
                      Recommendations
                    </p>
                    <ul className="space-y-2">
                      {result.data.insights.recommendations.map(
                        (recommendation, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 text-sm text-slate-400"
                          >
                            <ChevronRight
                              size={14}
                              className="mt-0.5 text-accent-light flex-shrink-0"
                            />
                            <span>{recommendation}</span>
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                </div>
              ) : compressResult ? (
                <div className="mt-4 sm:mt-5 flex flex-col gap-4 sm:gap-5 animate-scale-in">
                  {/* Compress mode banner */}
                  <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                    <Cpu size={14} className="text-amber-400 flex-shrink-0" />
                    <p className="text-xs font-semibold text-amber-300">
                      Gemini-free mode — local TOON compression only
                    </p>
                  </div>

                  {/* Token analytics grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Raw Tokens</p>
                      <p className="text-lg sm:text-xl font-bold text-white tabular-nums">{formatNumber(compressAnalytics?.rawTokens)}</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">TOON Tokens</p>
                      <p className="text-lg sm:text-xl font-bold text-emerald-400 tabular-nums">{formatNumber(compressAnalytics?.optimizedTokens)}</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Tokens Saved</p>
                      <p className="text-lg sm:text-xl font-bold text-amber-400 tabular-nums">{formatNumber(compressAnalytics?.tokensSaved)}</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Savings</p>
                      <p className="text-lg sm:text-xl font-bold text-accent-light tabular-nums">{compressAnalytics?.savingsPercentage ?? '—'}</p>
                    </div>
                  </div>

                  {/* Visual savings bar */}
                  {compressAnalytics && compressAnalytics.rawTokens > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5">
                        <span>Compression ratio</span>
                        <span className="font-mono">{compressAnalytics.compressionRatio.toFixed(4)}x</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-700 ease-out"
                          style={{ width: `${Math.max(2, (1 - compressAnalytics.compressionRatio) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-2 text-[10px]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2.5 py-1 text-slate-400 font-medium">
                      ⏱ {compressAnalytics?.processingTimeMs}ms
                    </span>
                    {compressAnalytics?.isEstimate && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-amber-400 font-medium">
                        ≈ Estimate
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2.5 py-1 text-slate-400 font-medium">
                      model: {compressAnalytics?.model}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-6 flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-2xl bg-white/[0.03] p-5 mb-4">
                    <Sparkles size={32} className="text-slate-600" />
                  </div>
                  <p className="text-sm text-slate-500">
                    Run an analysis or compress to see results here.
                  </p>
                </div>
              )}
            </div>

            {/* TOON Preview */}
            <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 animate-slide-up opacity-0" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center gap-2 mb-1">
                <Terminal size={16} className="text-success sm:hidden" />
                <Terminal size={18} className="text-success hidden sm:block" />
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Generated TOON Preview
                </h2>
              </div>
              {result || compressToon ? (
                <div className="mt-4">
                  <p className="rounded-lg sm:rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5 sm:p-3 font-mono text-[10px] sm:text-xs text-accent-light/80 break-all">
                    {result?.data.toon.schemaHeader ?? compressToon?.schemaHeader}
                  </p>
                  <pre className="mt-2 sm:mt-3 max-h-40 sm:max-h-56 overflow-auto rounded-lg sm:rounded-xl bg-[#0a0d18] border border-white/[0.04] p-3 sm:p-4 text-[10px] sm:text-xs text-emerald-300/70 font-mono">
                    {result?.data.toon.preview ?? compressToon?.preview}
                  </pre>
                  <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-xs font-medium">
                      {(result?.data.toon.rowCount ?? compressToon?.rowCount)} rows
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-xs font-medium">
                      {(result?.data.toon.columnCount ?? compressToon?.columnCount)} columns
                    </span>
                    {compressToon && (
                      <>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-xs font-medium">
                          depth {compressToon.maxDepthUsed}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-xs font-medium">
                          {compressToon.keys.length} keys
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-6 flex flex-col items-center justify-center py-8 text-center">
                  <div className="rounded-2xl bg-white/[0.03] p-5 mb-4">
                    <Terminal size={32} className="text-slate-600" />
                  </div>
                  <p className="text-sm text-slate-500">
                    The compressed schema and first 10 rows will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ─── Historical Ledger ─── */}
        <section className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 animate-slide-up opacity-0" style={{ animationDelay: '0.5s' }}>
          <div className="mb-4 sm:mb-5 flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 size={16} className="text-warning sm:hidden" />
                <BarChart3 size={18} className="text-warning hidden sm:block" />
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Historical Ledger
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                Redis-backed series with automatic in-memory fallback during
                local development.
              </p>
            </div>
            <select
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              className="self-start sm:self-auto rounded-lg sm:rounded-xl border border-white/10 bg-white/[0.04] px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-300 outline-none transition-all duration-300 focus:border-accent/40 focus:ring-2 focus:ring-accent/20 cursor-pointer hover:bg-white/[0.06] appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '36px' }}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
          {isLedgerLoading && !ledger ? (
            <div className="flex h-72 items-center justify-center text-slate-500 gap-2">
              <Loader2 className="animate-spin" size={18} />
              <span className="text-sm">Loading ledger...</span>
            </div>
          ) : (
            <TokenChart data={ledger?.data.series ?? []} />
          )}
        </section>

        {/* ─── Footer ─── */}
        <footer className="text-center pb-3 sm:pb-4 animate-fade-in opacity-0" style={{ animationDelay: '0.6s' }}>
          <p className="text-[10px] sm:text-xs text-slate-600">
            PayloadTOON Dashboard · Built with Next.js &amp; optional Gemini AI
          </p>
        </footer>
        {/* Save Template Modal */}
        {showSaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-3 sm:px-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md animate-scale-in border border-white/10">
              <h3 className="text-lg font-bold text-white mb-2">Save Input Template</h3>
              <p className="text-xs text-slate-400 mb-4">
                Persist the current JSON payload and query as a template on the backend.
              </p>

              <label htmlFor="save-name" className="text-xs font-semibold text-slate-300 block mb-1.5">
                Template Name
              </label>
              <input
                type="text"
                id="save-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g., Auth Server Logs, Payout Errors..."
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none transition-all duration-200 focus:border-accent/40 focus:bg-white/[0.06] focus:ring-2 focus:ring-accent/20 mb-4"
                autoFocus
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowSaveModal(false);
                    setSaveName("");
                  }}
                  className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-white/[0.06] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePayload}
                  disabled={isSaving || !saveName.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white shadow-glow hover:bg-accent-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving && <Loader2 className="animate-spin" size={12} />}
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
