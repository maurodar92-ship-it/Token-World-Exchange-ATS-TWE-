import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Database,
  Infinity as InfinityIcon,
  Search,
  Shuffle,
  Star,
  Trash2,
} from 'lucide-react';
import type {
  AssetClassificationSummary,
  AssetKind,
  BatchJobStatus,
  PaginatedAssetsResponse,
  SortDirection,
  SortField,
  TweAssetRecord,
} from '../types/twe';
import { RsiSignalLabel, SparklineChart } from './SparklineChart';
import { ItemVisualModal, type ItemVisualTarget } from './ItemVisualModal';
import {
  ASSET_CLASS_ICONS,
  buildItemOrbitalSvgMarkup,
  svgToDataUrl,
} from '../lib/visualRegistry';

interface TokenAtlasViewProps {
  onSelectAssetForTrade?: (symbol: string) => void;
}

type AtlasMode = 'hyperscale' | 'core';

interface InfiniteAtlasAssetRecord extends TweAssetRecord {
  atlasIndex: string;
  contractId: string;
  sha256Fingerprint: string;
  sector: string;
  isHyperScale: true;
}

interface InfiniteAtlasSummary {
  total: string;
  digits: number;
  scientific: string;
  Tokens: string;
  NFTs: string;
  Commodities: string;
  Currencies: string;
}

interface InfiniteAtlasSliceResponse {
  cursorIndex: string;
  pageSize: number;
  nextCursorIndex: string;
  prevCursorIndex: string;
  ceilingIndex: string;
  ceilingDigits: number;
  maxSupportedDigits: number;
  activeKind: string;
  activeChain: string;
  classificationSummary: InfiniteAtlasSummary;
  items: InfiniteAtlasAssetRecord[];
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 25, 50] as const;

const SUPERSCRIPT_MAP: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
};

const UINT256_MAX =
  '115792089237316195423570985008687907853269984665640564039457584007913129639935';

function normalizeBigIntInput(raw: string): string {
  const ascii = raw.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (ch) => SUPERSCRIPT_MAP[ch] ?? '');
  return ascii.replace(/[^0-9]/g, '').slice(0, 2048);
}

function formatCompactBigInt(raw: string): string {
  if (!raw) return '0';
  if (raw.length <= 14) return raw;
  return `${raw.slice(0, 6)}…${raw.slice(-6)}`;
}

function generateRandom64DigitBigInt(): string {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) {
    out += String(b % 10);
    out += String(Math.floor(b / 10) % 10);
  }
  const stripped = out.replace(/^0+/, '');
  return stripped.length > 0 ? stripped.slice(0, 64) : '999999999999999999';
}

const AssetClassLogo: React.FC<{ kind: AssetKind; size?: 'sm' | 'md' }> = ({
  kind,
  size = 'sm',
}) => {
  const [failed, setFailed] = useState(false);
  const dim = size === 'md' ? 'w-9 h-9 rounded-lg' : 'w-6 h-6 rounded-md';

  if (failed) {
    return (
      <span
        aria-hidden="true"
        className={`${dim} inline-flex items-center justify-center shrink-0 border border-[#A8843E]/40 dark:border-[#D4B475]/40 bg-[#0B0D10] font-mono text-[10px] font-semibold text-[#D4B475]`}
      >
        {kind.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <span
      className={`${dim} inline-flex overflow-hidden shrink-0 border border-[var(--twe-border-strong)] bg-[#0B0D10]`}
    >
      <img
        src={ASSET_CLASS_ICONS[kind]}
        alt={`${kind} asset class icon`}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-full h-full object-contain"
      />
    </span>
  );
};

export const TokenAtlasView: React.FC<TokenAtlasViewProps> = ({ onSelectAssetForTrade }) => {
  const [atlasMode, setAtlasMode] = useState<AtlasMode>('hyperscale');

  // Shared filters
  const [pageSize, setPageSize] = useState<number>(10);
  const [kindFilter, setKindFilter] = useState<string>('ALL');
  const [chainFilter, setChainFilter] = useState<string>('ALL');

  // Core Live Ledger state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [data, setData] = useState<PaginatedAssetsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hyper-Scale BigInt Atlas state
  const [cursorIndex, setCursorIndex] = useState<string>('1');
  const [jumpInput, setJumpInput] = useState<string>('1');
  const [hyperData, setHyperData] = useState<InfiniteAtlasSliceResponse | null>(null);
  const [hyperLoading, setHyperLoading] = useState<boolean>(true);
  const [promotingIndex, setPromotingIndex] = useState<string | null>(null);
  const [promotedBanner, setPromotedBanner] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Cross-page persistent selection (Core Live Ledger)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [activeBatchJob, setActiveBatchJob] = useState<BatchJobStatus | null>(null);
  const [visualTarget, setVisualTarget] = useState<ItemVisualTarget | null>(null);

  const fetchCoreAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search,
        kind: kindFilter,
        chain: chainFilter,
        sortField,
        sortDir: sortDirection,
      });
      const res = await fetch(`/api/twe/assets?${qs.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: PaginatedAssetsResponse = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load Token Atlas data.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, kindFilter, chainFilter, sortField, sortDirection]);

  const fetchHyperAssets = useCallback(async () => {
    setHyperLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        cursor: cursorIndex,
        pageSize: String(pageSize),
        kind: kindFilter,
        chain: chainFilter,
      });
      const res = await fetch(`/api/twe/atlas/infinite?${qs.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: InfiniteAtlasSliceResponse = await res.json();
      setHyperData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resolve Hyper-Scale Token Atlas.');
    } finally {
      setHyperLoading(false);
    }
  }, [cursorIndex, pageSize, kindFilter, chainFilter]);

  useEffect(() => {
    if (atlasMode === 'core') {
      void fetchCoreAssets();
    } else {
      void fetchHyperAssets();
    }
  }, [atlasMode, fetchCoreAssets, fetchHyperAssets]);

  // Poll active batch job progress for synchronized <thead> + banner BatchProgressIndicator
  useEffect(() => {
    if (!activeBatchJob || activeBatchJob.status !== 'running') return;
    const timer = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/twe/batch/${activeBatchJob.jobId}`);
        if (!res.ok) return;
        const job: BatchJobStatus = await res.json();
        setActiveBatchJob(job);
        if (job.status === 'completed' || job.status === 'failed') {
          window.clearInterval(timer);
          if (job.operation === 'delete') {
            setSelectedIds((prev) => {
              const next = new Set(prev);
              for (const id of job.affectedIds) next.delete(id);
              return next;
            });
          } else {
            setSelectedIds(new Set());
          }
          setConfirmingDelete(false);
          void fetchCoreAssets();
        }
      } catch {
        window.clearInterval(timer);
      }
    }, 90);
    return () => window.clearInterval(timer);
  }, [activeBatchJob, fetchCoreAssets]);

  const jumpToAtlasIndex = (raw: string) => {
    const cleaned = normalizeBigIntInput(raw).replace(/^0+/, '') || '1';
    setJumpInput(cleaned);
    setCursorIndex(cleaned);
    setPromotedBanner(null);
  };

  const stepBigIntCursor = (delta: bigint) => {
    try {
      const cur = BigInt(cursorIndex || '1');
      const next = cur + delta;
      jumpToAtlasIndex(next < 1n ? '1' : next.toString());
    } catch {
      jumpToAtlasIndex('1');
    }
  };

  const handlePromoteAndTrade = async (asset: InfiniteAtlasAssetRecord, openTradeDesk: boolean) => {
    setPromotingIndex(asset.atlasIndex);
    setError(null);
    try {
      const res = await fetch('/api/twe/atlas/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          atlasIndex: asset.atlasIndex,
          kind: kindFilter !== 'ALL' ? kindFilter : undefined,
          chain: chainFilter !== 'ALL' ? chainFilter : undefined,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: { asset: TweAssetRecord; created: boolean } = await res.json();
      setPromotedBanner(
        json.created
          ? `Promoted ${json.asset.symbol} (${json.asset.name}) into the Live ATS Trading Book.`
          : `${json.asset.symbol} is active in the Live ATS Trading Book.`
      );
      if (openTradeDesk && onSelectAssetForTrade) {
        onSelectAssetForTrade(json.asset.symbol);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to promote Atlas instrument.');
    } finally {
      setPromotingIndex(null);
    }
  };

  const handleCopyText = (id: string, value: string) => {
    void navigator.clipboard.writeText(value);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1500);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const pageItems = data?.items ?? [];
  const allOnPageSelected =
    pageItems.length > 0 && pageItems.every((item) => selectedIds.has(item.id));

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        for (const item of pageItems) next.delete(item.id);
      } else {
        for (const item of pageItems) next.add(item.id);
      }
      return next;
    });
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setConfirmingDelete(false);
  };

  const runBatchDuplicate = async () => {
    if (selectedIds.size === 0) return;
    setConfirmingDelete(false);
    try {
      const res = await fetch('/api/twe/assets/batch-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error('Failed to start duplicate batch');
      const job: BatchJobStatus = await res.json();
      setActiveBatchJob(job);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Batch duplicate failed');
    }
  };

  const runBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      const res = await fetch('/api/twe/assets/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error('Failed to start delete batch');
      const job: BatchJobStatus = await res.json();
      setActiveBatchJob(job);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Batch delete failed');
    }
  };

  const handleToggleWatchlist = async (asset: TweAssetRecord) => {
    try {
      const res = await fetch(`/api/twe/assets/${asset.id}/watchlist`, { method: 'POST' });
      if (res.ok) {
        void fetchCoreAssets();
      }
    } catch {
      // ignore transient error
    }
  };

  const summary: AssetClassificationSummary = data?.classificationSummary ?? {
    Tokens: 0,
    NFTs: 0,
    Commodities: 0,
    Currencies: 0,
    total: 0,
  };

  const hyperSummary = hyperData?.classificationSummary;

  const batchProgressPct = useMemo(() => {
    if (!activeBatchJob || activeBatchJob.total === 0) return 0;
    return Math.min(100, Math.round((activeBatchJob.processed / activeBatchJob.total) * 100));
  }, [activeBatchJob]);

  const totalPages = data?.totalPages ?? 1;
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxButtons = 5;
    let start = Math.max(1, page - Math.floor(maxButtons / 2));
    const end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
  }, [page, totalPages]);

  const renderSortIndicator = (field: SortField, label: string) => {
    const active = sortField === field;
    const dirLabel = active ? sortDirection.toUpperCase() : 'ASC';
    return (
      <button
        type="button"
        onClick={() => handleSort(field)}
        className="inline-flex items-center gap-1.5 text-left font-medium tracking-wider uppercase text-[11px] hover:text-[var(--twe-gold)] transition-colors cursor-pointer"
      >
        <span>{label}</span>
        <span
          className={`inline-flex items-center gap-0.5 font-mono text-[10px] ${
            active
              ? 'text-[#A8843E] dark:text-[#D4B475]'
              : 'text-neutral-400 dark:text-neutral-500'
          }`}
        >
          {active && sortDirection === 'desc' ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
          <span>{dirLabel}</span>
        </span>
      </button>
    );
  };

  const classificationCards: Array<{ key: AssetKind; label: string }> = [
    { key: 'Tokens', label: 'Tokens' },
    { key: 'NFTs', label: 'NFTs' },
    { key: 'Commodities', label: 'Commodities' },
    { key: 'Currencies', label: 'Currencies' },
  ];

  const hyperItems = hyperData?.items ?? [];

  return (
    <div className="space-y-4">
      {/* Atlas Scale Mode Header */}
      <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-sm font-semibold text-[var(--twe-text-primary)]">
            {atlasMode === 'hyperscale'
              ? `Hyper-Scale Token Atlas · O(1) Arbitrary-Precision BigInt Index (${hyperData?.ceilingDigits ?? 783}-Digit Target)`
              : 'Core Live ATS Token Atlas · Mutable Institutional Market Book'}
          </div>
          <div className="text-xs text-[var(--twe-text-secondary)] mt-0.5 font-mono tabular-nums">
            {atlasMode === 'hyperscale'
              ? `Exact Capacity: ${hyperSummary?.scientific ?? '9.99 × 10^782'} instruments (up to 2,048-digit BigInt addressing) · Promote any index straight to live ATS trading`
              : `${summary.total} live tradable instruments with watchlist, multi-row batch actions, and instant ATS order routing`}
          </div>
        </div>

        <div className="inline-flex items-center p-1 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] shrink-0">
          <button
            type="button"
            onClick={() => setAtlasMode('hyperscale')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              atlasMode === 'hyperscale'
                ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-semibold'
                : 'text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)]'
            }`}
          >
            <InfinityIcon className="w-3.5 h-3.5" />
            <span>Hyper-Scale BigInt Atlas</span>
          </button>
          <button
            type="button"
            onClick={() => setAtlasMode('core')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              atlasMode === 'core'
                ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-semibold'
                : 'text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Core Live Ledger</span>
          </button>
        </div>
      </div>

      {/* AssetClassificationSummary */}
      <section aria-label="Asset Classification Summary" className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => {
            setKindFilter('ALL');
            setPage(1);
          }}
          title={atlasMode === 'hyperscale' && hyperSummary ? `Exact total: ${hyperSummary.total}` : undefined}
          className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
            kindFilter === 'ALL'
              ? 'bg-[var(--twe-bg-surface)] border-[#A8843E] dark:border-[#D4B475]'
              : 'bg-[var(--twe-bg-surface)] border-[var(--twe-border)] hover:border-[var(--twe-border-strong)]'
          }`}
        >
          <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">
            All Classifications
          </div>
          <div className="mt-1 text-xl font-display font-semibold tabular-nums text-[var(--twe-text-primary)] font-mono truncate">
            {atlasMode === 'hyperscale'
              ? hyperSummary?.scientific ?? '9.99 × 10^782'
              : summary.total}
          </div>
          <div className="mt-0.5 text-[11px] text-[var(--twe-text-secondary)] font-mono truncate">
            {atlasMode === 'hyperscale'
              ? `${hyperSummary?.digits ?? 783}-digit BigInt Atlas`
              : 'Server-indexed instruments'}
          </div>
        </button>

        {classificationCards.map((item) => {
          const isActive = kindFilter === item.key;
          const hyperCountStr = hyperSummary?.[item.key] ?? '';
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setKindFilter(isActive ? 'ALL' : item.key);
                setPage(1);
              }}
              title={
                atlasMode === 'hyperscale' && hyperCountStr
                  ? `Exact ${item.label} count: ${hyperCountStr}`
                  : undefined
              }
              className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[var(--twe-bg-surface)] border-[#A8843E] dark:border-[#D4B475]'
                  : 'bg-[var(--twe-bg-surface)] border-[var(--twe-border)] hover:border-[var(--twe-border-strong)]'
              }`}
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                    {item.label}
                  </div>
                  <div className="mt-1 text-lg sm:text-xl font-display font-semibold tabular-nums text-[var(--twe-text-primary)] font-mono truncate">
                    {atlasMode === 'hyperscale'
                      ? hyperCountStr
                        ? formatCompactBigInt(hyperCountStr)
                        : '2.50 × 10^782'
                      : summary[item.key]}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--twe-text-secondary)]">
                    {atlasMode === 'hyperscale'
                      ? '25.0% O(1) partition'
                      : summary.total > 0
                        ? `${((summary[item.key] / summary.total) * 100).toFixed(1)}% share`
                        : '0.0% share'}
                  </div>
                </div>
                <AssetClassLogo kind={item.key} size="md" />
              </div>
            </button>
          );
        })}
      </section>

      {/* Hyper-Scale BigInt Navigator OR Core Ledger Toolbar */}
      {atlasMode === 'hyperscale' ? (
        <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-3.5 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              jumpToAtlasIndex(jumpInput);
            }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-end"
          >
            <label className="lg:col-span-6 block space-y-1">
              <span className="text-[11px] text-[var(--twe-text-secondary)]">
                Jump to Arbitrary-Precision BigInt Instrument Index (accepts superscripts like ⁹, up to 2,048 digits)
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={jumpInput}
                onChange={(e) => setJumpInput(normalizeBigIntInput(e.target.value))}
                placeholder="Paste any BigInt index e.g. 999999999999999999999999..."
                className="w-full px-3 py-1.5 text-xs font-mono tabular-nums rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-[var(--twe-text-primary)] focus:outline-none focus:border-[#D4B475]"
              />
            </label>

            <label className="lg:col-span-3 block space-y-1">
              <span className="text-[11px] text-[var(--twe-text-secondary)]">Network Filter</span>
              <select
                aria-label="Filter by Network"
                value={chainFilter}
                onChange={(e) => setChainFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-[var(--twe-text-primary)] focus:outline-none focus:border-[#D4B475]"
              >
                <option value="ALL">All Networks</option>
                <option value="Ethereum">Ethereum</option>
                <option value="Base">Base</option>
                <option value="Arbitrum">Arbitrum</option>
                <option value="Polygon">Polygon</option>
                <option value="Solana">Solana</option>
                <option value="Sepolia">Sepolia</option>
              </select>
            </label>

            <div className="lg:col-span-3 flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] hover:opacity-90 cursor-pointer whitespace-nowrap"
              >
                Resolve Slice
              </button>
              <button
                type="button"
                onClick={() => jumpToAtlasIndex(generateRandom64DigitBigInt())}
                title="Jump to random 64-digit BigInt Atlas index"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-primary)] hover:border-[#D4B475] cursor-pointer whitespace-nowrap"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Random</span>
              </button>
            </div>
          </form>

          {/* Scale Presets including User's Exact Target Ceiling */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--twe-border)]">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: '#1 (Genesis)', value: '1' },
                { label: '#1,000,000', value: '1000000' },
                { label: '2^256 - 1', value: UINT256_MAX },
                ...(hyperData?.ceilingIndex
                  ? [
                      {
                        label: `Target Ceiling (${hyperData.ceilingDigits} digits · 999…0999…)`,
                        value: hyperData.ceilingIndex,
                      },
                    ]
                  : []),
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => jumpToAtlasIndex(preset.value)}
                  className={`px-2.5 py-1 rounded border text-[11px] font-mono transition-colors cursor-pointer ${
                    cursorIndex === preset.value
                      ? 'border-[#A8843E] dark:border-[#D4B475] bg-[var(--twe-gold-soft)] text-[var(--twe-text-primary)] font-semibold'
                      : 'border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="text-[11px] font-mono text-[var(--twe-text-muted)] tabular-nums">
              Cursor: #{formatCompactBigInt(cursorIndex)} ({cursorIndex.length} digits)
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--twe-text-muted)]" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name, ticker, or 0x contract..."
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-[var(--twe-text-primary)] placeholder:text-[var(--twe-text-muted)] focus:outline-none focus:border-[#D4B475]"
              />
            </div>

            <select
              aria-label="Filter by Network"
              value={chainFilter}
              onChange={(e) => {
                setChainFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-sm rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-[var(--twe-text-primary)] focus:outline-none focus:border-[#D4B475]"
            >
              <option value="ALL">All Networks</option>
              <option value="Ethereum">Ethereum</option>
              <option value="Base">Base</option>
              <option value="Arbitrum">Arbitrum</option>
              <option value="Polygon">Polygon</option>
              <option value="Solana">Solana</option>
              <option value="Sepolia">Sepolia</option>
            </select>
          </div>

          {/* Multi-Row / Cross-Page Batch Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono tabular-nums text-[var(--twe-text-secondary)] mr-1">
              {selectedIds.size} selected
            </span>

            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedIds(new Set());
                  setConfirmingDelete(false);
                }}
                className="px-2.5 py-1.5 text-xs rounded-md border border-[var(--twe-border)] text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)] cursor-pointer"
              >
                Clear
              </button>
            )}

            <button
              type="button"
              disabled={selectedIds.size === 0 || activeBatchJob?.status === 'running'}
              onClick={runBatchDuplicate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-primary)] hover:border-[#D4B475] disabled:opacity-40 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
              <span>Duplicate</span>
            </button>

            {!confirmingDelete ? (
              <button
                type="button"
                disabled={selectedIds.size === 0 || activeBatchJob?.status === 'running'}
                onClick={() => setConfirmingDelete(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-40 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={runBatchDelete}
                  className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                >
                  Confirm Delete ({selectedIds.size})
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="px-2.5 py-1.5 text-xs rounded-md border border-[var(--twe-border)] text-[var(--twe-text-secondary)] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Synchronized Banner BatchProgressIndicator (Core Ledger) */}
      {atlasMode === 'core' && activeBatchJob && (
        <div
          role="status"
          className="bg-[var(--twe-bg-surface)] border border-[#A8843E]/60 dark:border-[#D4B475]/50 rounded-lg px-4 py-3 space-y-2"
        >
          <div className="flex items-center justify-between text-xs">
            <div className="font-medium text-[var(--twe-text-primary)]">
              Batch {activeBatchJob.operation === 'duplicate' ? 'Duplicate' : 'Delete'} ·{' '}
              <span className="text-[var(--twe-text-secondary)]">{activeBatchJob.message}</span>
            </div>
            <div className="flex items-center gap-3 font-mono tabular-nums text-[#A8843E] dark:text-[#D4B475]">
              <span>
                {activeBatchJob.processed} / {activeBatchJob.total} ({batchProgressPct}%)
              </span>
              {activeBatchJob.status !== 'running' && (
                <button
                  type="button"
                  onClick={() => setActiveBatchJob(null)}
                  className="text-[var(--twe-text-muted)] hover:text-[var(--twe-text-primary)] cursor-pointer"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[var(--twe-bg-muted)] overflow-hidden">
            <div
              className="h-full transition-all duration-150 bg-[#A8843E] dark:bg-[#D4B475]"
              style={{ width: `${batchProgressPct}%` }}
            />
          </div>
        </div>
      )}

      {promotedBanner && (
        <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-2">
          <span>{promotedBanner}</span>
          <button
            type="button"
            onClick={() => setPromotedBanner(null)}
            className="underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Main High-Density Data Table */}
      <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {atlasMode === 'hyperscale' ? (
            <table className="w-full text-left border-collapse">
              <thead className="bg-[var(--twe-bg-elevated)] border-b border-[var(--twe-border)] text-[11px] uppercase tracking-wider font-medium text-[var(--twe-text-secondary)]">
                <tr>
                  <th className="px-3 py-2.5">Atlas Index / Contract ID</th>
                  <th className="px-3 py-2.5">Instrument &amp; CREATE2</th>
                  <th className="px-3 py-2.5">Classification</th>
                  <th className="px-3 py-2.5">Network</th>
                  <th className="px-3 py-2.5 text-right">Price (USD)</th>
                  <th className="px-3 py-2.5 text-right">24h %</th>
                  <th className="px-3 py-2.5 w-32">24h Sparkline</th>
                  <th className="px-3 py-2.5">Wilder RSI(14)</th>
                  <th className="px-3 py-2.5 text-right">ATS Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--twe-border)] text-sm">
                {hyperLoading && hyperItems.length === 0 ? (
                  Array.from({ length: Math.min(pageSize, 6) }).map((_, idx) => (
                    <tr key={idx} className="h-11">
                      <td colSpan={9} className="px-4 py-2">
                        <div className="h-4 w-full rounded bg-[var(--twe-bg-muted)] animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : (
                  hyperItems.map((asset) => {
                    const positive = asset.change24hPct >= 0;
                    const busy = promotingIndex === asset.atlasIndex;
                    return (
                      <tr
                        key={`${asset.atlasIndex}-${asset.contractId}`}
                        className="h-12 hover:bg-[var(--twe-bg-elevated)] transition-colors"
                      >
                        <td className="px-3 py-2 align-middle">
                          <div className="font-mono text-xs font-semibold text-[#A8843E] dark:text-[#D4B475] tabular-nums">
                            {asset.contractId}
                          </div>
                          <div
                            title={`Exact BigInt Index: #${asset.atlasIndex}`}
                            className="text-[11px] font-mono text-[var(--twe-text-muted)] tabular-nums"
                          >
                            #{formatCompactBigInt(asset.atlasIndex)}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() =>
                                setVisualTarget({
                                  code: asset.symbol,
                                  name: asset.name,
                                  subtitle: `${asset.kind} · ${asset.standard} on ${asset.chain} · ${asset.sector}`,
                                  kind: asset.kind,
                                  metaLine: `Index #${formatCompactBigInt(asset.atlasIndex)} · $${asset.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} · RSI(14) ${asset.rsi14.toFixed(1)} · ${asset.contractAddress}`,
                                })
                              }
                              title={`Inspect ${asset.name} rotating planetary emblem`}
                              className="w-8 h-8 rounded-full overflow-hidden border border-[#D4B475]/50 bg-[#0B0D10] shrink-0 cursor-pointer hover:scale-110 transition-transform"
                            >
                              <img
                                src={svgToDataUrl(
                                  buildItemOrbitalSvgMarkup({
                                    ticker: asset.symbol,
                                    title: asset.name,
                                    subtitle: asset.chain,
                                  })
                                )}
                                alt={`${asset.symbol} orbital emblem`}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain twe-spin-slow"
                              />
                            </button>
                            <div className="min-w-0">
                              <div className="font-medium text-[var(--twe-text-primary)] leading-tight truncate max-w-[220px]">
                                {asset.name}
                              </div>
                              <div className="text-[11px] font-mono text-[var(--twe-text-muted)]">
                                {asset.symbol} · {asset.standard} · {asset.contractAddress.slice(0, 10)}…
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-[var(--twe-text-secondary)]">
                          <div className="inline-flex items-center gap-2 whitespace-nowrap">
                            <AssetClassLogo kind={asset.kind} size="sm" />
                            <span className="font-medium text-[var(--twe-text-primary)]">
                              {asset.kind}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-[var(--twe-text-secondary)] whitespace-nowrap">
                          {asset.chain}{' '}
                          <span className="font-mono text-[10px] text-[var(--twe-text-muted)]">
                            #{asset.chainId}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-[var(--twe-text-primary)]">
                          $
                          {asset.priceUsd.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4,
                          })}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-mono tabular-nums text-xs ${
                            positive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {positive ? '+' : ''}
                          {asset.change24hPct.toFixed(2)}%
                        </td>
                        <td className="px-3 py-1">
                          <SparklineChart
                            data={asset.sparkline24h}
                            positive={positive}
                            height={32}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <RsiSignalLabel rsi={asset.rsi14} />
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopyText(asset.contractId, asset.contractAddress)}
                              title="Copy CREATE2 contract address"
                              className="p-1.5 rounded border border-[var(--twe-border)] hover:border-[#D4B475] text-[var(--twe-text-secondary)] cursor-pointer"
                            >
                              {copiedId === asset.contractId ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handlePromoteAndTrade(asset, true)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border border-[#A8843E]/60 dark:border-[#D4B475]/60 bg-[var(--twe-gold-soft)] text-[var(--twe-text-primary)] hover:border-[#D4B475] disabled:opacity-50 cursor-pointer"
                            >
                              <span>{busy ? 'Listing…' : 'Trade'}</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-[var(--twe-bg-elevated)] border-b border-[var(--twe-border)]">
                <tr>
                  <th className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label="Select all rows on page"
                      checked={allOnPageSelected}
                      onChange={toggleSelectAllOnPage}
                      className="rounded border-[var(--twe-border-strong)] accent-[#D4B475] cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-2.5 text-[var(--twe-text-secondary)]">
                    {renderSortIndicator('name', 'Asset Name')}
                  </th>
                  <th className="px-3 py-2.5 text-[var(--twe-text-secondary)]">
                    {renderSortIndicator('kind', 'Classification')}
                  </th>
                  <th className="px-3 py-2.5 text-[var(--twe-text-secondary)]">
                    {renderSortIndicator('chain', 'Network')}
                  </th>
                  <th className="px-3 py-2.5 text-right text-[11px] uppercase tracking-wider font-medium text-[var(--twe-text-secondary)]">
                    Price (USD)
                  </th>
                  <th className="px-3 py-2.5 text-right text-[11px] uppercase tracking-wider font-medium text-[var(--twe-text-secondary)]">
                    24h %
                  </th>
                  <th className="px-3 py-2.5 w-32 text-[11px] uppercase tracking-wider font-medium text-[var(--twe-text-secondary)]">
                    24h Sparkline
                  </th>
                  <th className="px-3 py-2.5 text-[11px] uppercase tracking-wider font-medium text-[var(--twe-text-secondary)]">
                    Wilder RSI(14)
                  </th>
                  <th className="px-3 py-2.5 text-right text-[11px] uppercase tracking-wider font-medium text-[var(--twe-text-secondary)]">
                    Actions
                  </th>
                </tr>

                {/* Synchronized <thead> BatchProgressIndicator Row */}
                {activeBatchJob?.status === 'running' && (
                  <tr>
                    <th colSpan={9} className="p-0">
                      <div className="h-1 w-full bg-[var(--twe-bg-muted)]">
                        <div
                          className="h-full transition-all duration-150 bg-[#A8843E] dark:bg-[#D4B475]"
                          style={{ width: `${batchProgressPct}%` }}
                        />
                      </div>
                    </th>
                  </tr>
                )}
              </thead>

              <tbody className="divide-y divide-[var(--twe-border)] text-sm">
                {loading && pageItems.length === 0 ? (
                  Array.from({ length: Math.min(pageSize, 6) }).map((_, idx) => (
                    <tr key={idx} className="h-11">
                      <td colSpan={9} className="px-4 py-2">
                        <div className="h-4 w-full rounded bg-[var(--twe-bg-muted)] animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : pageItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-10 text-center text-[var(--twe-text-secondary)]"
                    >
                      No assets match your active classification or search criteria.{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setSearch('');
                          setKindFilter('ALL');
                          setChainFilter('ALL');
                          setPage(1);
                        }}
                        className="underline text-[#A8843E] dark:text-[#D4B475] cursor-pointer"
                      >
                        Reset filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  pageItems.map((asset) => {
                    const isSelected = selectedIds.has(asset.id);
                    const positive = asset.change24hPct >= 0;
                    return (
                      <tr
                        key={asset.id}
                        className={`h-11 transition-colors ${
                          isSelected
                            ? 'bg-[var(--twe-gold-soft)]'
                            : 'hover:bg-[var(--twe-bg-elevated)]'
                        }`}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            aria-label={`Select ${asset.name}`}
                            checked={isSelected}
                            onChange={() => toggleSelectRow(asset.id)}
                            className="rounded border-[var(--twe-border-strong)] accent-[#D4B475] cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() =>
                                setVisualTarget({
                                  code: asset.symbol,
                                  name: asset.name,
                                  subtitle: `${asset.kind} · ${asset.standard} on ${asset.chain}`,
                                  kind: asset.kind,
                                  metaLine: `$${asset.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} · RSI(14) ${asset.rsi14.toFixed(1)} · ${asset.contractAddress}`,
                                })
                              }
                              title={`Inspect ${asset.name} rotating planetary emblem`}
                              className="w-8 h-8 rounded-full overflow-hidden border border-[#D4B475]/50 bg-[#0B0D10] shrink-0 cursor-pointer hover:scale-110 transition-transform"
                            >
                              <img
                                src={svgToDataUrl(
                                  buildItemOrbitalSvgMarkup({
                                    ticker: asset.symbol,
                                    title: asset.name,
                                    subtitle: asset.chain,
                                  })
                                )}
                                alt={`${asset.symbol} orbital emblem`}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain twe-spin-slow"
                              />
                            </button>
                            <div>
                              <div className="font-medium text-[var(--twe-text-primary)] leading-tight">
                                {asset.name}
                              </div>
                              <div className="text-[11px] font-mono text-[var(--twe-text-muted)]">
                                {asset.symbol} · {asset.standard} ·{' '}
                                {asset.contractAddress.slice(0, 10)}…
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-[var(--twe-text-secondary)]">
                          <div className="inline-flex items-center gap-2 whitespace-nowrap">
                            <AssetClassLogo kind={asset.kind} size="sm" />
                            <span className="font-medium text-[var(--twe-text-primary)]">
                              {asset.kind}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-[var(--twe-text-secondary)]">
                          {asset.chain}{' '}
                          <span className="font-mono text-[10px] text-[var(--twe-text-muted)]">
                            #{asset.chainId}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-[var(--twe-text-primary)]">
                          $
                          {asset.priceUsd.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4,
                          })}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-mono tabular-nums text-xs ${
                            positive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {positive ? '+' : ''}
                          {asset.change24hPct.toFixed(2)}%
                        </td>
                        <td className="px-3 py-1">
                          <SparklineChart
                            data={asset.sparkline24h}
                            positive={positive}
                            height={32}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <RsiSignalLabel rsi={asset.rsi14} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleWatchlist(asset)}
                              title={
                                asset.watchlisted ? 'Remove from watchlist' : 'Add to watchlist'
                              }
                              className="p-1 rounded hover:bg-[var(--twe-bg-muted)] cursor-pointer"
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  asset.watchlisted
                                    ? 'fill-[#D4B475] text-[#D4B475]'
                                    : 'text-[var(--twe-text-muted)]'
                                }`}
                              />
                            </button>
                            {onSelectAssetForTrade && (
                              <button
                                type="button"
                                onClick={() => onSelectAssetForTrade(asset.symbol)}
                                className="px-2 py-1 text-[11px] font-medium rounded border border-[var(--twe-border-strong)] hover:border-[#D4B475] text-[var(--twe-text-primary)] cursor-pointer"
                              >
                                Trade
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* FooterPaginationControls */}
        <footer className="px-4 py-3 border-t border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-[var(--twe-text-secondary)]">
            {atlasMode === 'hyperscale' ? (
              <span className="font-mono tabular-nums">
                Showing {hyperItems.length} instruments starting at #
                {formatCompactBigInt(cursorIndex)} of {hyperSummary?.scientific ?? '9.99 × 10^782'}
              </span>
            ) : (
              <span className="font-mono tabular-nums">
                Showing {pageItems.length === 0 ? 0 : (page - 1) * pageSize + 1}–
                {(page - 1) * pageSize + pageItems.length} of {data?.totalCount ?? 0}
              </span>
            )}
            <label className="inline-flex items-center gap-1.5">
              <span>Rows:</span>
              <select
                aria-label="Rows per page"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] text-[var(--twe-text-primary)] font-mono tabular-nums cursor-pointer"
              >
                {PAGE_SIZE_OPTIONS.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {atlasMode === 'hyperscale' ? (
            <div className="flex flex-wrap items-center gap-1.5 font-mono">
              <button
                type="button"
                aria-label="Genesis Index #1"
                disabled={cursorIndex === '1'}
                onClick={() => jumpToAtlasIndex('1')}
                className="p-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)] disabled:opacity-35 cursor-pointer"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                aria-label="Previous slice"
                disabled={cursorIndex === '1'}
                onClick={() => stepBigIntCursor(-BigInt(pageSize))}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)] disabled:opacity-35 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <button
                type="button"
                onClick={() => stepBigIntCursor(-1000n)}
                disabled={cursorIndex === '1'}
                className="px-2 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)] disabled:opacity-35 cursor-pointer"
              >
                -1k
              </button>
              <button
                type="button"
                onClick={() => stepBigIntCursor(1000n)}
                className="px-2 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)] cursor-pointer"
              >
                +1k
              </button>
              <button
                type="button"
                aria-label="Next slice"
                onClick={() => stepBigIntCursor(BigInt(pageSize))}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)] cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              {hyperData?.ceilingIndex && (
                <button
                  type="button"
                  aria-label="Jump to target ceiling"
                  onClick={() => jumpToAtlasIndex(hyperData.ceilingIndex)}
                  title={`Jump to ${hyperData.ceilingDigits}-digit ceiling`}
                  className="p-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[#A8843E] dark:text-[#D4B475] hover:border-[#D4B475] cursor-pointer"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="First page"
                disabled={page <= 1}
                onClick={() => setPage(1)}
                className="p-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)] disabled:opacity-35 cursor-pointer"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)] disabled:opacity-35 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {pageNumbers.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPage(num)}
                  className={`px-2.5 py-1 rounded font-mono tabular-nums border cursor-pointer ${
                    num === page
                      ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] border-transparent font-semibold'
                      : 'bg-[var(--twe-bg-surface)] border-[var(--twe-border)] text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)]'
                  }`}
                >
                  {num}
                </button>
              ))}

              <button
                type="button"
                aria-label="Next page"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)] disabled:opacity-35 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                aria-label="Last page"
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
                className="p-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)] disabled:opacity-35 cursor-pointer"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </footer>
      </div>

      <ItemVisualModal item={visualTarget} onClose={() => setVisualTarget(null)} />
    </div>
  );
};
