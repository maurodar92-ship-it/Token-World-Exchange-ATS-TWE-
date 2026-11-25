import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Globe,
  RefreshCw,
  Search,
  Shuffle,
} from 'lucide-react';

interface OverviewPageRecord {
  pageIndex: string;
  pageId: string;
  title: string;
  domainId: string;
  domainLabel: string;
  settlementRail: string;
  jurisdiction: string;
  complianceTier: string;
  sovereignNavUsd: number;
  paperCashUsd: number;
  activeInstrumentsCount: number;
  settledVolume24hUsd: number;
  avgLatencyMs: number;
  wilderRsiComposite: number;
  vaultEpochBlock: string;
  vaultUuid: string;
  nodeFingerprint: string;
  merkleAuditRoot: string;
  webpagePath: string;
  prevPageIndex: string;
  nextPageIndex: string;
  ceilingIndex: string;
  ceilingDigits: number;
  highlights: Array<{ metric: string; value: string; status: string }>;
}

interface FourTokenPageRecord {
  pageIndex: string;
  recordId: string;
  tableId: string;
  tableName: string;
  systemId: string;
  systemLabel: string;
  writeMode: string;
  primaryKey: string;
  columns: string[];
  invariant: string;
  partitionShard: string;
  sequenceCursor: string;
  sha256Fingerprint: string;
  merkleRoot: string;
  sqlDdlSnippet: string;
  deterministicRow: Record<string, string | number | boolean>;
  webpagePath: string;
  prevPageIndex: string;
  nextPageIndex: string;
  ceilingIndex: string;
  ceilingDigits: number;
}

type HubPageRecord = OverviewPageRecord | FourTokenPageRecord;

interface RangePayload {
  startIndex: string;
  limit: number;
  prevStartIndex: string;
  nextStartIndex: string;
  ceilingIndex: string;
  ceilingDigits: number;
  scientificCeiling: string;
  maxSupportedDigits: number;
  activeDomain?: string;
  activeSystemId?: string;
  domains?: Array<{ id: string; label: string }>;
  systems?: Array<{ id: string; label: string; tableCount: number }>;
  items: HubPageRecord[];
}

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

const UINT256_MAX_STR =
  '115792089237316195423570985008687907853269984665640564039457584007913129639935';

function normalizeInputDigits(raw: string): string {
  const ascii = raw.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => SUPERSCRIPT_MAP[c] ?? '');
  const clean = ascii.replace(/[^0-9]/g, '').slice(0, 2048);
  return clean || '1';
}

function abbrevIndex(idx: string): string {
  if (idx.length <= 15) {
    return idx.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  return `${idx.slice(0, 6)}…${idx.slice(-6)} (${idx.length}d)`;
}

function generateRandom64Digit(): string {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  let digits = '';
  for (let i = 0; i < bytes.length; i++) {
    digits += String(bytes[i] % 10);
    digits += String((bytes[i] >> 4) % 10);
  }
  return digits.replace(/^0+/, '') || '1';
}

function isFourTokenRecord(item: HubPageRecord): item is FourTokenPageRecord {
  return 'tableName' in item;
}

export const HyperScaleWebpageExplorer: React.FC<{
  hub: 'overview' | 'four-token-systems';
  externalFilter?: string;
}> = ({ hub, externalFilter }) => {
  const isOverview = hub === 'overview';
  const [cursorIndex, setCursorIndex] = useState<string>('1');
  const [jumpInput, setJumpInput] = useState<string>('1');
  const [filterValue, setFilterValue] = useState<string>(externalFilter || 'ALL');
  const [data, setData] = useState<RangePayload | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<string>('1');
  const [inspectorTab, setInspectorTab] = useState<'webpage' | 'spec'>('webpage');
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);

  useEffect(() => {
    if (externalFilter !== undefined) {
      setFilterValue(externalFilter);
    }
  }, [externalFilter]);

  const fetchSlice = useCallback(
    async (start: string, activeFilter: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          start,
          limit: '10',
        });
        if (isOverview) {
          params.set('domain', activeFilter);
        } else {
          params.set('system', activeFilter);
        }
        const endpoint = isOverview
          ? `/api/twe/overview/pages/range?${params.toString()}`
          : `/api/twe/four-token-systems/pages/range?${params.toString()}`;
        const res = await fetch(endpoint);
        if (!res.ok) return;
        const payload = (await res.json()) as RangePayload;
        setData(payload);
        if (payload.items.length > 0) {
          setSelectedIndex((prev) =>
            payload.items.some((it) => it.pageIndex === prev)
              ? prev
              : payload.items[0].pageIndex
          );
        }
      } catch {
        // Ignore transient network errors
      } finally {
        setLoading(false);
      }
    },
    [isOverview]
  );

  useEffect(() => {
    void fetchSlice(cursorIndex, filterValue);
  }, [cursorIndex, filterValue, fetchSlice]);

  const navigateToIndex = (raw: string) => {
    const clean = normalizeInputDigits(raw);
    setCursorIndex(clean);
    setJumpInput(clean);
    setSelectedIndex(clean);
  };

  const shiftCursor = (delta: bigint) => {
    try {
      const cur = BigInt(normalizeInputDigits(cursorIndex));
      const next = cur + delta;
      navigateToIndex(next < 1n ? '1' : next.toString());
    } catch {
      navigateToIndex('1');
    }
  };

  const activeItem =
    data?.items.find((it) => it.pageIndex === selectedIndex) ?? data?.items[0] ?? null;

  const handleCopyUrl = async () => {
    if (!activeItem) return;
    try {
      const fullUrl = `${window.location.origin}${activeItem.webpagePath}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 1800);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const handleDownloadHtml = async () => {
    if (!activeItem || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(activeItem.webpagePath);
      if (!res.ok) return;
      const htmlText = await res.text();
      const blob = new Blob([htmlText], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const prefix = isOverview ? 'twe-overview-page' : 'twe-4token-page';
      const suffix =
        activeItem.pageIndex.length > 16
          ? `${activeItem.pageIndex.slice(0, 8)}-${activeItem.pageIndex.slice(-6)}`
          : activeItem.pageIndex;
      a.download = `${prefix}-${suffix}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const filterOptions = isOverview
    ? [
        { id: 'ALL', label: 'All Overview Domains' },
        ...(data?.domains ?? []),
      ]
    : [
        { id: 'ALL', label: 'All 4 Token Systems (22 Tables)' },
        ...(data?.systems ?? []),
      ];

  return (
    <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden">
      {/* Header Banner */}
      <div className="px-4 py-3.5 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
            <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
              {isOverview
                ? 'Overview Hyper-Scale Webpages · O(1) Arbitrary-Precision Directory'
                : '4-Token Systems Hyper-Scale Webpages · O(1) Arbitrary-Precision Directory'}
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-[var(--twe-text-secondary)]">
            Live deterministic HTML5 webpages addressable up to{' '}
            <span className="font-mono font-medium text-[#A8843E] dark:text-[#D4B475]">
              {data ? `${data.ceilingDigits}-digit ceiling (${data.scientificCeiling})` : 'arbitrary-precision BigInt'}
            </span>{' '}
            · max {data?.maxSupportedDigits ?? 2048} digits per route.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter webpage domain"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            className="px-2.5 py-1.5 rounded-md bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] text-xs text-[var(--twe-text-primary)] focus:outline-none focus:border-[#D4B475]"
          >
            {filterOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void fetchSlice(cursorIndex, filterValue)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] hover:border-[#D4B475] text-xs text-[var(--twe-text-primary)] cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Arbitrary-Precision BigInt Jump Bar & Scale Presets */}
      <div className="p-4 border-b border-[var(--twe-border)] space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigateToIndex(jumpInput);
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[var(--twe-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              placeholder="Paste any arbitrary-precision webpage index (up to 2,048 digits, superscripts ⁹ auto-normalized)..."
              className="w-full pl-8 pr-3 py-1.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-xs text-[var(--twe-text-primary)] focus:outline-none focus:border-[#D4B475]"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-md bg-[#A8843E] hover:bg-[#937131] text-white font-medium text-xs transition-colors cursor-pointer shrink-0"
          >
            Jump to Webpage
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-[var(--twe-text-muted)] mr-1">Jump Presets:</span>
            <button
              type="button"
              onClick={() => navigateToIndex('1')}
              className="px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] hover:border-[#D4B475] font-mono text-[11px] text-[var(--twe-text-primary)] cursor-pointer"
            >
              #1
            </button>
            <button
              type="button"
              onClick={() => navigateToIndex('1000000')}
              className="px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] hover:border-[#D4B475] font-mono text-[11px] text-[var(--twe-text-primary)] cursor-pointer"
            >
              #1,000,000
            </button>
            <button
              type="button"
              onClick={() => navigateToIndex(UINT256_MAX_STR)}
              className="px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] hover:border-[#D4B475] font-mono text-[11px] text-[var(--twe-text-primary)] cursor-pointer"
            >
              2^256 - 1
            </button>
            {data?.ceilingIndex && (
              <button
                type="button"
                onClick={() => navigateToIndex(data.ceilingIndex)}
                className="px-2.5 py-1 rounded bg-[var(--twe-gold-soft)] border border-[#A8843E] dark:border-[#D4B475] font-mono text-[11px] font-medium text-[#A8843E] dark:text-[#D4B475] cursor-pointer"
              >
                Target Ceiling ({data.ceilingDigits} digits)
              </button>
            )}
            <button
              type="button"
              onClick={() => navigateToIndex(generateRandom64Digit())}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] hover:border-[#D4B475] font-mono text-[11px] text-[var(--twe-text-primary)] cursor-pointer"
            >
              <Shuffle className="w-3 h-3" />
              Random 64-Digit
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shiftCursor(-1000n)}
              className="px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] hover:border-[#D4B475] font-mono text-[11px] text-[var(--twe-text-secondary)] cursor-pointer"
            >
              -1,000
            </button>
            <button
              type="button"
              onClick={() => shiftCursor(-10n)}
              className="inline-flex items-center gap-0.5 px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] hover:border-[#D4B475] text-[11px] text-[var(--twe-text-primary)] cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev 10
            </button>
            <button
              type="button"
              onClick={() => shiftCursor(10n)}
              className="inline-flex items-center gap-0.5 px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] hover:border-[#D4B475] text-[11px] text-[var(--twe-text-primary)] cursor-pointer"
            >
              Next 10
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => shiftCursor(1000n)}
              className="px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] hover:border-[#D4B475] font-mono text-[11px] text-[var(--twe-text-secondary)] cursor-pointer"
            >
              +1,000
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Directory + Live Webpage / Spec Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 divide-y xl:divide-y-0 xl:divide-x divide-[var(--twe-border)]">
        {/* Left Directory Slice */}
        <div className="xl:col-span-5 divide-y divide-[var(--twe-border)] max-h-[540px] overflow-y-auto">
          {data?.items.map((item) => {
            const selected = activeItem?.pageIndex === item.pageIndex;
            const fourTok = isFourTokenRecord(item);
            return (
              <button
                key={item.pageIndex}
                type="button"
                onClick={() => setSelectedIndex(item.pageIndex)}
                className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${
                  selected
                    ? 'bg-[var(--twe-gold-soft)]'
                    : 'hover:bg-[var(--twe-bg-elevated)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-[#A8843E] dark:text-[#D4B475]">
                    {fourTok ? item.recordId : item.pageId}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--twe-text-muted)]">
                    #{abbrevIndex(item.pageIndex)}
                  </span>
                </div>
                <div className="mt-1 font-mono text-xs text-[var(--twe-text-primary)] truncate">
                  {fourTok ? item.tableName : item.title}
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-[var(--twe-text-muted)]">
                  <span className="truncate">
                    {fourTok ? item.systemLabel : item.domainLabel}
                  </span>
                  <span className="font-mono shrink-0">
                    {fourTok ? item.partitionShard : item.vaultEpochBlock}
                  </span>
                </div>
              </button>
            );
          })}
          {!data && (
            <div className="p-6 text-center text-xs text-[var(--twe-text-muted)]">
              Resolving arbitrary-precision webpage slice...
            </div>
          )}
        </div>

        {/* Right Inspector */}
        <div className="xl:col-span-7 flex flex-col">
          {activeItem ? (
            <>
              <div className="px-4 py-2.5 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setInspectorTab('webpage')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                      inspectorTab === 'webpage'
                        ? 'bg-[#A8843E] text-white'
                        : 'text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)]'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Live HTML Webpage
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectorTab('spec')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                      inspectorTab === 'spec'
                        ? 'bg-[#A8843E] text-white'
                        : 'text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)]'
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    Spec & Schema
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void handleCopyUrl()}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] hover:border-[#D4B475] text-[11px] text-[var(--twe-text-primary)] cursor-pointer"
                  >
                    {copiedUrl ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    {copiedUrl ? 'Copied' : 'Copy URL'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDownloadHtml()}
                    disabled={downloading}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] hover:border-[#D4B475] text-[11px] text-[var(--twe-text-primary)] cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3 h-3" />
                    .HTML
                  </button>
                  <a
                    href={activeItem.webpagePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] hover:border-[#D4B475] text-[11px] text-[#A8843E] dark:text-[#D4B475]"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open
                  </a>
                </div>
              </div>

              {inspectorTab === 'webpage' ? (
                <div className="bg-[#090b0f] flex-1 min-h-[470px]">
                  <iframe
                    key={activeItem.webpagePath}
                    title={`Hyper-Scale Webpage ${activeItem.pageIndex}`}
                    src={activeItem.webpagePath}
                    sandbox="allow-same-origin"
                    className="w-full h-[490px] border-0 bg-[#090b0f]"
                  />
                </div>
              ) : (
                <div className="p-4 space-y-3 max-h-[490px] overflow-y-auto text-xs">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                      Exact Arbitrary-Precision Webpage Index ({activeItem.pageIndex.length} digits)
                    </div>
                    <div className="mt-1 p-2.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[11px] break-all text-[#A8843E] dark:text-[#D4B475]">
                      {activeItem.pageIndex}
                    </div>
                  </div>

                  {isFourTokenRecord(activeItem) ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="p-2.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
                          <div className="text-[10px] uppercase text-[var(--twe-text-muted)]">Table & Write Mode</div>
                          <div className="mt-0.5 font-mono text-[var(--twe-text-primary)]">
                            {activeItem.tableName} · {activeItem.writeMode}
                          </div>
                        </div>
                        <div className="p-2.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
                          <div className="text-[10px] uppercase text-[var(--twe-text-muted)]">Partition Shard</div>
                          <div className="mt-0.5 font-mono text-[var(--twe-text-primary)]">
                            {activeItem.partitionShard}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)] mb-1">
                          PostgreSQL Modular Monolith DDL
                        </div>
                        <pre className="p-3 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[11px] text-[var(--twe-text-primary)] overflow-x-auto">
                          {activeItem.sqlDdlSnippet}
                        </pre>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)] mb-1">
                          Deterministic Row Snapshot
                        </div>
                        <pre className="p-3 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[11px] text-[var(--twe-text-primary)] overflow-x-auto">
                          {JSON.stringify(activeItem.deterministicRow, null, 2)}
                        </pre>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="p-2.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
                          <div className="text-[10px] uppercase text-[var(--twe-text-muted)]">Settlement Rail</div>
                          <div className="mt-0.5 font-medium text-[var(--twe-text-primary)]">
                            {activeItem.settlementRail}
                          </div>
                        </div>
                        <div className="p-2.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
                          <div className="text-[10px] uppercase text-[var(--twe-text-muted)]">Jurisdiction & Tier</div>
                          <div className="mt-0.5 font-medium text-[var(--twe-text-primary)]">
                            {activeItem.jurisdiction} · {activeItem.complianceTier}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)] mb-1">
                          Deterministic Executive Telemetry
                        </div>
                        <pre className="p-3 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[11px] text-[var(--twe-text-primary)] overflow-x-auto">
                          {JSON.stringify(
                            {
                              pageId: activeItem.pageId,
                              domain: activeItem.domainLabel,
                              sovereignNavUsd: activeItem.sovereignNavUsd,
                              paperCashUsd: activeItem.paperCashUsd,
                              settledVolume24hUsd: activeItem.settledVolume24hUsd,
                              wilderRsiComposite: activeItem.wilderRsiComposite,
                              vaultEpochBlock: activeItem.vaultEpochBlock,
                              nodeFingerprint: activeItem.nodeFingerprint,
                              merkleAuditRoot: activeItem.merkleAuditRoot,
                            },
                            null,
                            2
                          )}
                        </pre>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-xs text-[var(--twe-text-muted)]">
              Select a webpage index to inspect its live rendered HTML5 document and specification.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
