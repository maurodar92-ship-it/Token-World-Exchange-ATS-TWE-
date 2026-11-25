import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Globe,
  Radio,
  Search,
  Shuffle,
  Square,
  TrendingUp,
} from 'lucide-react';
import type { TradeExecution, TweAssetRecord } from '../types/twe';

interface ChartPoint {
  label: string;
  formattedTimestamp: string;
  priceUsd: number;
  volumeUnits: number;
  notionalUsd: number;
  side: 'BUY' | 'SELL' | 'MARK' | 'TICK';
  venue: string;
  id: string;
  symbol: string;
  timestamp: string;
}

const CustomTradeHoverTooltip: React.FC<{
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ChartPoint }>;
  vwapUsd: number;
}> = ({ active, payload, vwapUsd }) => {
  const pt = payload?.[0]?.payload;
  if (!active || !pt) return null;
  const deltaVwapPct = vwapUsd > 0 ? ((pt.priceUsd - vwapUsd) / vwapUsd) * 100 : 0;

  return (
    <div className="rounded-lg border border-[#A8843E] dark:border-[#D4B475] bg-[var(--twe-bg-surface)]/95 backdrop-blur-sm px-3.5 py-2.5 shadow-xl text-[11px] font-mono min-w-[235px] space-y-1.5">
      <div className="flex items-center justify-between gap-4 pb-1 border-b border-[var(--twe-border)]">
        <span className="font-semibold text-[#A8843E] dark:text-[#D4B475]">
          {pt.symbol} · {pt.id}
        </span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
            pt.side === 'BUY'
              ? 'bg-emerald-500/15 text-emerald-500'
              : pt.side === 'SELL'
                ? 'bg-rose-500/15 text-rose-500'
                : pt.side === 'TICK'
                  ? 'bg-cyan-500/15 text-cyan-400'
                  : 'bg-[var(--twe-bg-elevated)] text-[var(--twe-text-muted)]'
          }`}
        >
          {pt.side}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="text-[var(--twe-text-muted)]">Timestamp</span>
        <span className="text-[var(--twe-text-primary)] tabular-nums">{pt.formattedTimestamp}</span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="text-[var(--twe-text-muted)]">Trade Price</span>
        <span className="font-semibold text-[#A8843E] dark:text-[#D4B475] tabular-nums">
          ${pt.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="text-[var(--twe-text-muted)]">Volume</span>
        <span className="text-[var(--twe-text-primary)] tabular-nums">
          {pt.volumeUnits.toLocaleString('en-US', { maximumFractionDigits: 4 })} {pt.symbol}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="text-[var(--twe-text-muted)]">Notional USD</span>
        <span className="text-[var(--twe-text-secondary)] tabular-nums">
          ${pt.notionalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 pt-1 border-t border-[var(--twe-border)] text-[10px]">
        <span className="text-[var(--twe-text-muted)]">{pt.venue}</span>
        <span className={deltaVwapPct >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
          {deltaVwapPct >= 0 ? '+' : ''}
          {deltaVwapPct.toFixed(2)}% vs VWAP
        </span>
      </div>
    </div>
  );
};

export const RecentTradesRechartsCard: React.FC<{
  activeAsset: TweAssetRecord;
  recentTrades: TradeExecution[];
  onAdvanceTick?: () => void;
}> = ({ activeAsset, recentTrades, onAdvanceTick }) => {
  const [scope, setScope] = useState<'asset' | 'all'>('asset');
  const [autoTicker, setAutoTicker] = useState<boolean>(false);
  const [tickerEvents, setTickerEvents] = useState<ChartPoint[]>([]);

  // Reset live ticker buffer when user switches instrument
  useEffect(() => {
    setTickerEvents([]);
  }, [activeAsset.symbol]);

  // Dynamically record every live ticker price event for the active instrument
  useEffect(() => {
    const now = new Date();
    const clock = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const fullTs = now.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    setTickerEvents((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.priceUsd === activeAsset.priceUsd && prev.length > 0) {
        return prev;
      }
      const nextPt: ChartPoint = {
        label: clock,
        formattedTimestamp: fullTs,
        priceUsd: activeAsset.priceUsd,
        volumeUnits: Number((activeAsset.volume24hUsd / Math.max(activeAsset.priceUsd, 0.01) / 288).toFixed(2)),
        notionalUsd: Number((activeAsset.volume24hUsd / 288).toFixed(2)),
        side: 'TICK',
        venue: 'SSE Live Ticker',
        id: `TICK-${prev.length + 1}`,
        symbol: activeAsset.symbol,
        timestamp: now.toISOString(),
      };
      return [...prev.slice(-24), nextPt];
    });
  }, [activeAsset.priceUsd, activeAsset.volume24hUsd, activeAsset.symbol]);

  // Optional live Auto-Ticker stream invoking parent ticker event every 2.5s
  useEffect(() => {
    if (!autoTicker || !onAdvanceTick) return;
    const id = window.setInterval(() => {
      onAdvanceTick();
    }, 2500);
    return () => window.clearInterval(id);
  }, [autoTicker, onAdvanceTick]);

  const { chartData, assetTradeCount, vwapUsd, highUsd, lowUsd } = useMemo(() => {
    const matchingTrades = recentTrades
      .filter((t) => (scope === 'all' ? true : t.symbol === activeAsset.symbol))
      .slice()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const formatClock = (iso: string, fallbackIdx: number) => {
      const dt = new Date(iso);
      if (Number.isNaN(dt.getTime())) return `#${fallbackIdx + 1}`;
      return dt.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    };

    const formatFullTimestamp = (iso: string, fallbackLabel: string) => {
      const dt = new Date(iso);
      if (Number.isNaN(dt.getTime())) return fallbackLabel;
      return dt.toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    };

    const points: ChartPoint[] = [];

    if (scope === 'asset' && matchingTrades.length < 3) {
      const baseline = activeAsset.sparkline24h.slice(-8);
      baseline.forEach((pt, idx) => {
        const priceUsd = Number(pt.price.toFixed(activeAsset.priceUsd < 10 ? 4 : 2));
        const unitVol = Number((pt.volume / Math.max(priceUsd, 0.01)).toFixed(2));
        points.push({
          label: pt.hour || `T-${baseline.length - idx}`,
          formattedTimestamp: `24h Tape · ${pt.hour || `T-${baseline.length - idx}`}`,
          priceUsd,
          volumeUnits: unitVol,
          notionalUsd: Number(pt.volume.toFixed(2)),
          side: 'MARK',
          venue: 'TWE Mark Feed',
          id: `MARK-${idx + 1}`,
          symbol: activeAsset.symbol,
          timestamp: pt.hour,
        });
      });
    }

    matchingTrades.forEach((tr, idx) => {
      const clock = formatClock(tr.timestamp, idx);
      points.push({
        label: clock,
        formattedTimestamp: formatFullTimestamp(tr.timestamp, clock),
        priceUsd: tr.priceUsd,
        volumeUnits: tr.quantity,
        notionalUsd: tr.notionalUsd,
        side: tr.side,
        venue: tr.venue,
        id: tr.id,
        symbol: tr.symbol,
        timestamp: tr.timestamp,
      });
    });

    if (scope === 'asset' && tickerEvents.length > 0) {
      points.push(...tickerEvents);
    }

    const prices = points.map((p) => p.priceUsd);
    const high = prices.length ? Math.max(...prices) : activeAsset.priceUsd;
    const low = prices.length ? Math.min(...prices) : activeAsset.priceUsd;

    const totalNotional = matchingTrades.reduce((acc, t) => acc + t.notionalUsd, 0);
    const totalQty = matchingTrades.reduce((acc, t) => acc + t.quantity, 0);
    const computedVwap =
      totalQty > 0
        ? totalNotional / totalQty
        : prices.reduce((acc, p) => acc + p, 0) / Math.max(1, prices.length);

    return {
      chartData: points,
      assetTradeCount: matchingTrades.length,
      vwapUsd: Number(computedVwap.toFixed(activeAsset.priceUsd < 10 ? 4 : 2)),
      highUsd: high,
      lowUsd: low,
    };
  }, [activeAsset, recentTrades, scope, tickerEvents]);

  const yDomain = useMemo<[number, number]>(() => {
    const span = Math.max(highUsd - lowUsd, activeAsset.priceUsd * 0.005, 0.01);
    return [Number((lowUsd - span * 0.15).toFixed(4)), Number((highUsd + span * 0.15).toFixed(4))];
  }, [highUsd, lowUsd, activeAsset.priceUsd]);

  return (
    <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
            <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
              Recent Trades Price Trend · {scope === 'asset' ? activeAsset.symbol : 'All Tape Executions'}
            </h3>
          </div>
          <p className="text-[11px] text-[var(--twe-text-muted)] mt-0.5">
            Live Recharts execution price curve synced from settled <span className="font-mono">recentTrades</span> fills ({assetTradeCount} settled fills)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-3 font-mono text-[11px] px-2.5 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
            <span className="text-[var(--twe-text-muted)]">
              VWAP:{' '}
              <strong className="text-[#A8843E] dark:text-[#D4B475] tabular-nums">
                ${vwapUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </strong>
            </span>
            <span className="text-[var(--twe-text-muted)]">
              H/L:{' '}
              <strong className="text-[var(--twe-text-primary)] tabular-nums">
                ${highUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })} / $
                {lowUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </strong>
            </span>
          </div>

          <div className="inline-flex rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setScope('asset')}
              className={`px-2 py-1 rounded font-medium cursor-pointer ${
                scope === 'asset'
                  ? 'bg-[#A8843E] text-white'
                  : 'text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)]'
              }`}
            >
              {activeAsset.symbol}
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`px-2 py-1 rounded font-medium cursor-pointer ${
                scope === 'all'
                  ? 'bg-[#A8843E] text-white'
                  : 'text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)]'
              }`}
            >
              All Tape ({recentTrades.length})
            </button>
          </div>

          {onAdvanceTick && (
            <button
              type="button"
              onClick={() => setAutoTicker((v) => !v)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-mono font-medium cursor-pointer ${
                autoTicker
                  ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-500'
                  : 'border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-primary)] hover:border-[#D4B475]'
              }`}
            >
              {autoTicker ? (
                <>
                  <Square className="w-3 h-3" />
                  <span>Stop Ticker ({tickerEvents.length})</span>
                </>
              ) : (
                <>
                  <Radio className="w-3 h-3 text-[#A8843E] dark:text-[#D4B475]" />
                  <span>Live Ticker</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="w-full h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 6, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              stroke="rgba(148,163,184,0.3)"
            />
            <YAxis
              domain={yDomain}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              stroke="rgba(148,163,184,0.3)"
              width={66}
              tickFormatter={(v: number) => `$${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
            />
            <Tooltip
              cursor={{ stroke: '#D4B475', strokeWidth: 1, strokeDasharray: '3 3' }}
              content={({ active, payload }) => (
                <CustomTradeHoverTooltip
                  active={active}
                  payload={payload as ReadonlyArray<{ payload?: ChartPoint }> | undefined}
                  vwapUsd={vwapUsd}
                />
              )}
            />
            <ReferenceLine
              y={vwapUsd}
              stroke="#D4B475"
              strokeDasharray="4 4"
              strokeOpacity={0.75}
              label={{
                value: `VWAP $${vwapUsd.toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
                position: 'insideTopRight',
                fill: '#D4B475',
                fontSize: 10,
              }}
            />
            <Line
              type="monotone"
              dataKey="priceUsd"
              stroke="#D4B475"
              strokeWidth={2.2}
              isAnimationActive={false}
              dot={(props: { cx?: number; cy?: number; payload?: ChartPoint; index?: number }) => {
                const { cx, cy, payload, index } = props;
                if (cx == null || cy == null || !payload) return <g key={index} />;
                const fill =
                  payload.side === 'BUY'
                    ? '#10b981'
                    : payload.side === 'SELL'
                      ? '#f43f5e'
                      : payload.side === 'TICK'
                        ? '#38bdf8'
                        : '#94a3b8';
                return (
                  <circle
                    key={`dot-${payload.id}-${index}`}
                    cx={cx}
                    cy={cy}
                    r={payload.side === 'MARK' ? 2.5 : 4.5}
                    fill={fill}
                    stroke="#090b0f"
                    strokeWidth={1.4}
                  />
                );
              }}
              activeDot={{ r: 6, stroke: '#D4B475', strokeWidth: 2, fill: '#090b0f' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

/* ============================================================================
 * HYPER-SCALE 590-DIGIT MARKET EXCHANGE WEBPAGES EXPLORER
 * ============================================================================ */

interface MarketPageItem {
  pageIndex: string;
  pageId: string;
  symbol: string;
  assetName: string;
  venue: string;
  markPriceUsd: number;
  vwapUsd: number;
  change24hPct: number;
  webpagePath: string;
}

interface MarketRangeResponse {
  startIndex: string;
  ceilingIndex: string;
  ceilingDigits: number;
  scientificCeiling: string;
  maxSupportedDigits: number;
  symbols: string[];
  items: MarketPageItem[];
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

const UINT256_MAX =
  '115792089237316195423570985008687907853269984665640564039457584007913129639935';

function normalizeDigits(raw: string): string {
  const ascii = raw.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => SUPERSCRIPT_MAP[c] ?? '');
  return ascii.replace(/[^0-9]/g, '').slice(0, 2048) || '1';
}

function abbrevIdx(idx: string): string {
  if (idx.length <= 15) return idx.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${idx.slice(0, 6)}…${idx.slice(-6)} (${idx.length}d)`;
}

function random64Digit(): string {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += String(bytes[i] % 10) + String((bytes[i] >> 4) % 10);
  }
  return out.replace(/^0+/, '') || '1';
}

export const MarketExchangeHyperScaleExplorer: React.FC<{ activeSymbol?: string }> = ({
  activeSymbol,
}) => {
  const [cursorIndex, setCursorIndex] = useState('1');
  const [jumpInput, setJumpInput] = useState('1');
  const [symbolFilter, setSymbolFilter] = useState('ALL');
  const [range, setRange] = useState<MarketRangeResponse | null>(null);
  const [selectedIndex, setSelectedIndex] = useState('1');
  const [copied, setCopied] = useState(false);

  const loadRange = useCallback(async (start: string, sym: string) => {
    const qs = new URLSearchParams({ start, limit: '10', symbol: sym });
    const res = await fetch(`/api/twe/market-exchange/pages/range?${qs.toString()}`);
    if (!res.ok) return;
    const json = (await res.json()) as MarketRangeResponse;
    setRange(json);
    if (json.items.length > 0) {
      setSelectedIndex((prev) =>
        json.items.some((it) => it.pageIndex === prev) ? prev : json.items[0].pageIndex
      );
    }
  }, []);

  useEffect(() => {
    void loadRange(cursorIndex, symbolFilter);
  }, [cursorIndex, symbolFilter, loadRange]);

  const jumpTo = (raw: string) => {
    const clean = normalizeDigits(raw);
    setCursorIndex(clean);
    setJumpInput(clean);
    setSelectedIndex(clean);
  };

  const shift = (delta: bigint) => {
    const next = BigInt(normalizeDigits(cursorIndex)) + delta;
    jumpTo(next < 1n ? '1' : next.toString());
  };

  const activeItem =
    range?.items.find((it) => it.pageIndex === selectedIndex) ?? range?.items[0] ?? null;

  const handleCopy = async () => {
    if (!activeItem) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${activeItem.webpagePath}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleDownload = async () => {
    if (!activeItem) return;
    const res = await fetch(activeItem.webpagePath);
    if (!res.ok) return;
    const html = await res.text();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `twe-market-exchange-page-${activeItem.pageIndex.slice(0, 12)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
            <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
              Market &amp; Exchange Hyper-Scale Trade Tape Webpages
            </h3>
          </div>
          <p className="text-xs text-[var(--twe-text-secondary)] mt-0.5">
            O(1) arbitrary-precision trade trend webpages addressable up to{' '}
            <span className="font-mono font-medium text-[#A8843E] dark:text-[#D4B475]">
              {range ? `${range.ceilingDigits}-digit ceiling (${range.scientificCeiling})` : '590-digit target ceiling'}
            </span>
          </p>
        </div>

        <select
          aria-label="Filter market webpage symbol"
          value={symbolFilter}
          onChange={(e) => setSymbolFilter(e.target.value)}
          className="px-2.5 py-1.5 rounded-md bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] text-xs text-[var(--twe-text-primary)]"
        >
          <option value="ALL">All Market Instruments</option>
          {(range?.symbols ?? (activeSymbol ? [activeSymbol] : [])).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="p-4 border-b border-[var(--twe-border)] space-y-2.5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            jumpTo(jumpInput);
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[var(--twe-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              placeholder="Paste any arbitrary-precision Market Exchange webpage index (up to 2,048 digits)..."
              className="w-full pl-8 pr-3 py-1.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-xs text-[var(--twe-text-primary)]"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-md bg-[#A8843E] hover:bg-[#937131] text-white text-xs font-medium cursor-pointer shrink-0"
          >
            Jump to Page
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => jumpTo('1')}
              className="px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[11px] cursor-pointer"
            >
              #1
            </button>
            <button
              type="button"
              onClick={() => jumpTo(UINT256_MAX)}
              className="px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[11px] cursor-pointer"
            >
              2^256 - 1
            </button>
            {range?.ceilingIndex && (
              <button
                type="button"
                onClick={() => jumpTo(range.ceilingIndex)}
                className="px-2.5 py-1 rounded bg-[var(--twe-gold-soft)] border border-[#A8843E] dark:border-[#D4B475] font-mono text-[11px] font-medium text-[#A8843E] dark:text-[#D4B475] cursor-pointer"
              >
                Target Ceiling ({range.ceilingDigits} digits)
              </button>
            )}
            <button
              type="button"
              onClick={() => jumpTo(random64Digit())}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[11px] cursor-pointer"
            >
              <Shuffle className="w-3 h-3" />
              Random 64-Digit
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shift(-1000n)}
              className="px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[11px] cursor-pointer"
            >
              -1,000
            </button>
            <button
              type="button"
              onClick={() => shift(-10n)}
              className="inline-flex items-center gap-0.5 px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-[11px] cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev 10
            </button>
            <button
              type="button"
              onClick={() => shift(10n)}
              className="inline-flex items-center gap-0.5 px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-[11px] cursor-pointer"
            >
              Next 10
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => shift(1000n)}
              className="px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[11px] cursor-pointer"
            >
              +1,000
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 divide-y xl:divide-y-0 xl:divide-x divide-[var(--twe-border)]">
        <div className="xl:col-span-5 divide-y divide-[var(--twe-border)] max-h-[470px] overflow-y-auto">
          {range?.items.map((item) => {
            const sel = activeItem?.pageIndex === item.pageIndex;
            const pos = item.change24hPct >= 0;
            return (
              <button
                key={item.pageIndex}
                type="button"
                onClick={() => setSelectedIndex(item.pageIndex)}
                className={`w-full text-left px-4 py-2.5 cursor-pointer ${
                  sel ? 'bg-[var(--twe-gold-soft)]' : 'hover:bg-[var(--twe-bg-elevated)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-[#A8843E] dark:text-[#D4B475]">
                    {item.symbol} · {item.pageId}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--twe-text-muted)]">
                    #{abbrevIdx(item.pageIndex)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[var(--twe-text-primary)]">
                    ${item.markPriceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </span>
                  <span className={pos ? 'text-emerald-500' : 'text-rose-500'}>
                    {pos ? '+' : ''}
                    {item.change24hPct.toFixed(2)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="xl:col-span-7 flex flex-col">
          {activeItem && (
            <>
              <div className="px-4 py-2 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-[var(--twe-text-secondary)] truncate max-w-[260px]">
                  {activeItem.webpagePath}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void handleCopy()}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] text-[11px] cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy URL'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDownload()}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] text-[11px] cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    .HTML
                  </button>
                  <a
                    href={activeItem.webpagePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] text-[11px] text-[#A8843E] dark:text-[#D4B475]"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open
                  </a>
                </div>
              </div>
              <iframe
                key={activeItem.webpagePath}
                title={`Market Exchange Webpage ${activeItem.pageIndex}`}
                src={activeItem.webpagePath}
                sandbox="allow-same-origin allow-scripts"
                className="w-full h-[430px] border-0 bg-[#090b0f]"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};
