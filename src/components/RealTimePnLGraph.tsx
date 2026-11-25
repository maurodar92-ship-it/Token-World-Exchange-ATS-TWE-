import React, { useEffect, useId, useMemo, useState } from 'react';
import * as d3 from 'd3';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Pause,
  Play,
  RotateCcw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { PortfolioHolding, TweAssetRecord } from '../types/twe';
import {
  buildAsset46DayBundle,
  formatCompactUsd,
  type AssetAnalyticsBundle,
} from '../lib/portfolioAnalytics';

type TimeframeKey = '1H' | '24H' | '7D' | '30D' | '90D' | '1Y' | 'ALL';
type DisplayMode = 'pnl' | 'roi' | 'valuation' | 'multi';
type TickIntervalSec = 1 | 2 | 5;

interface RealTimePnLGraphProps {
  holdings: PortfolioHolding[];
  assets: TweAssetRecord[];
  onTradeSymbol: (symbol: string) => void;
  onExpandAsset30Day?: (symbol: string) => void;
  onFocusedSymbolChange?: (symbol: string) => void;
  livePrices: Record<string, number>;
  onUpdateLivePrices: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

const TIMEFRAME_FACTORS: Record<TimeframeKey, { points: number; spanDays: number; label: string }> = {
  '1H': { points: 24, spanDays: 1 / 24, label: 'Intraday 1H' },
  '24H': { points: 24, spanDays: 1, label: '24 Hours' },
  '7D': { points: 14, spanDays: 7, label: '7 Days' },
  '30D': { points: 31, spanDays: 30, label: '30 Days' },
  '90D': { points: 30, spanDays: 90, label: '90 Days' },
  '1Y': { points: 26, spanDays: 365, label: '1 Year' },
  ALL: { points: 32, spanDays: 730, label: 'All History' },
};

const MULTI_LINE_PALETTE = [
  '#D4B475',
  '#10b981',
  '#38bdf8',
  '#a78bfa',
  '#f59e0b',
  '#f43f5e',
];

export const RealTimePnLGraph: React.FC<RealTimePnLGraphProps> = ({
  holdings,
  assets,
  onTradeSymbol,
  onExpandAsset30Day,
  onFocusedSymbolChange,
  livePrices,
  onUpdateLivePrices,
}) => {
  const uid = useId().replace(/:/g, '');
  const [timeframe, setTimeframe] = useState<TimeframeKey>('30D');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('pnl');
  const [focusSymbol, setFocusSymbol] = useState<string>('ALL');
  const [tickIntervalSec, setTickIntervalSec] = useState<TickIntervalSec>(2);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [impulsePct, setImpulsePct] = useState<number>(0);
  const [latencyMs, setLatencyMs] = useState<number>(16);
  const [tickCount, setTickCount] = useState<number>(0);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const assetBySymbol = useMemo(() => {
    const map = new Map<string, TweAssetRecord>();
    assets.forEach((a) => map.set(a.symbol, a));
    return map;
  }, [assets]);

  // Live Tick Simulation Engine
  useEffect(() => {
    if (!isStreaming || holdings.length === 0) return;

    const timer = window.setInterval(() => {
      const started = performance.now();
      onUpdateLivePrices((prev) => {
        const next: Record<string, number> = { ...prev };
        for (const h of holdings) {
          const base = prev[h.symbol] ?? h.markPriceUsd;
          const isStable = h.symbol.toUpperCase().includes('USD') || h.kind === 'Currencies';
          const jitterScale = isStable ? 0.0003 : 0.0038;
          const delta = (Math.random() - 0.492) * jitterScale;
          const minPrice = Math.max(0.0001, h.markPriceUsd * 0.72);
          const maxPrice = h.markPriceUsd * 1.38;
          next[h.symbol] = Number(Math.max(minPrice, Math.min(maxPrice, base * (1 + delta))).toFixed(4));
        }
        return next;
      });
      setTickCount((c) => c + 1);
      const elapsed = Math.max(11, Math.min(24, Math.round(performance.now() - started + 14)));
      setLatencyMs(elapsed);
    }, tickIntervalSec * 1000);

    return () => window.clearInterval(timer);
  }, [isStreaming, tickIntervalSec, holdings, onUpdateLivePrices]);

  const applyStressImpulse = (pct: number) => {
    setImpulsePct((prev) => Number((prev + pct).toFixed(2)));
    onUpdateLivePrices((prev) => {
      const next: Record<string, number> = { ...prev };
      for (const h of holdings) {
        const base = prev[h.symbol] ?? h.markPriceUsd;
        const isStable = h.symbol.toUpperCase().includes('USD') || h.kind === 'Currencies';
        const effectivePct = isStable ? pct * 0.05 : pct;
        next[h.symbol] = Number(Math.max(0.0001, base * (1 + effectivePct / 100)).toFixed(4));
      }
      return next;
    });
  };

  const resetToBaseline = () => {
    setImpulsePct(0);
    const resetMap: Record<string, number> = {};
    for (const h of holdings) {
      resetMap[h.symbol] = h.markPriceUsd;
    }
    onUpdateLivePrices(resetMap);
  };

  // Compute bundles for each holding using live simulated prices
  const bundles = useMemo<AssetAnalyticsBundle[]>(() => {
    return holdings.map((h) => {
      const price = livePrices[h.symbol] ?? h.markPriceUsd;
      return buildAsset46DayBundle(h, assetBySymbol.get(h.symbol), price);
    });
  }, [holdings, assetBySymbol, livePrices]);

  const filteredBundles = useMemo(() => {
    if (focusSymbol === 'ALL') return bundles;
    const match = bundles.filter((b) => b.holding.symbol === focusSymbol);
    return match.length > 0 ? match : bundles;
  }, [bundles, focusSymbol]);

  // Build portfolio / focused series across selected timeframe
  const chartSeries = useMemo(() => {
    if (filteredBundles.length === 0) return [];
    const cfg = TIMEFRAME_FACTORS[timeframe];
    const count = cfg.points;
    const totalCostBasis = filteredBundles.reduce(
      (s, b) => s + b.holding.quantity * b.holding.avgCostUsd,
      0
    );

    const rows: Array<{
      index: number;
      label: string;
      pnlUsd: number;
      roiPct: number;
      valuationUsd: number;
      costBasisUsd: number;
      marketCapUsd: number;
      perAssetRoi: Record<string, number>;
    }> = [];

    for (let i = 0; i < count; i += 1) {
      const ratio = count > 1 ? i / (count - 1) : 1;
      const srcIdx = Math.min(30, Math.max(0, Math.round(ratio * 30)));
      const tfScale =
        timeframe === '1H'
          ? 0.14
          : timeframe === '24H'
          ? 0.35
          : timeframe === '7D'
          ? 0.72
          : timeframe === '30D'
          ? 1
          : timeframe === '90D'
          ? 1.35
          : timeframe === '1Y'
          ? 1.9
          : 2.35;

      let aggValuation = 0;
      let aggPnl = 0;
      let aggMcap = 0;
      const perAssetRoi: Record<string, number> = {};

      for (const b of filteredBundles) {
        const pt31 = b.points31d[srcIdx] ?? b.latestPoint;
        const latest = b.latestPoint;
        // Blend historical offset scaled cleanly by timeframe while anchoring final point exact!
        const pnlDeltaFromToday = (pt31.pnlUsd - latest.pnlUsd) * tfScale;
        const simulatedPnl = i === count - 1 ? latest.pnlUsd : latest.pnlUsd + pnlDeltaFromToday;
        const cost = b.holding.quantity * b.holding.avgCostUsd;
        const simulatedVal = cost + simulatedPnl;
        const mcapRatio = cost > 0 ? Math.max(0.4, simulatedVal / Math.max(1, latest.valuationUsd)) : 1;

        aggValuation += simulatedVal;
        aggPnl += simulatedPnl;
        aggMcap += b.baselineMarketCapUsd * mcapRatio;
        perAssetRoi[b.holding.symbol] = cost > 0 ? Number(((simulatedPnl / cost) * 100).toFixed(2)) : 0;
      }

      let label = '';
      if (i === count - 1) {
        label = 'Live Now';
      } else if (timeframe === '1H') {
        const minsAgo = Math.round((1 - ratio) * 60);
        label = `-${minsAgo}m`;
      } else if (timeframe === '24H') {
        const hrsAgo = Math.round((1 - ratio) * 24);
        label = `-${hrsAgo}h`;
      } else {
        const daysAgo = Math.max(1, Math.round((1 - ratio) * cfg.spanDays));
        label = `-${daysAgo}d`;
      }

      const roiPct = totalCostBasis > 0 ? (aggPnl / totalCostBasis) * 100 : 0;

      rows.push({
        index: i,
        label,
        pnlUsd: Number(aggPnl.toFixed(2)),
        roiPct: Number(roiPct.toFixed(2)),
        valuationUsd: Number(aggValuation.toFixed(2)),
        costBasisUsd: Number(totalCostBasis.toFixed(2)),
        marketCapUsd: Number(aggMcap.toFixed(0)),
        perAssetRoi,
      });
    }

    return rows;
  }, [filteredBundles, timeframe]);

  // Aggregate summary metrics
  const summary = useMemo(() => {
    const valuation = filteredBundles.reduce((s, b) => s + b.latestPoint.valuationUsd, 0);
    const costBasis = filteredBundles.reduce((s, b) => s + b.latestPoint.costBasisUsd, 0);
    const pnl = valuation - costBasis;
    const roi = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
    const mcap = filteredBundles.reduce((s, b) => s + b.latestPoint.marketCapUsd, 0);
    return { valuation, costBasis, pnl, roi, mcap };
  }, [filteredBundles]);

  // D3 SVG Layout
  const svgW = 860;
  const svgH = 260;
  const margin = { top: 18, right: 20, bottom: 28, left: 66 };
  const innerW = svgW - margin.left - margin.right;
  const innerH = svgH - margin.top - margin.bottom;

  const d3Chart = useMemo(() => {
    if (chartSeries.length === 0) return null;

    const getVal = (row: (typeof chartSeries)[number]) => {
      if (displayMode === 'roi') return row.roiPct;
      if (displayMode === 'valuation') return row.valuationUsd;
      return row.pnlUsd;
    };

    let values = chartSeries.map(getVal);
    if (displayMode === 'multi') {
      values = [];
      for (const row of chartSeries) {
        for (const sym of Object.keys(row.perAssetRoi)) {
          values.push(row.perAssetRoi[sym]);
        }
      }
    }

    const rawMin = Math.min(...values, displayMode === 'valuation' ? summary.costBasis : 0);
    const rawMax = Math.max(...values, displayMode === 'valuation' ? summary.costBasis : 0);
    const span = Math.max(0.5, rawMax - rawMin);
    const yMin = rawMin - span * 0.12;
    const yMax = rawMax + span * 0.12;

    const xScale = d3
      .scaleLinear()
      .domain([0, Math.max(1, chartSeries.length - 1)])
      .range([margin.left, margin.left + innerW]);

    const yScale = d3
      .scaleLinear()
      .domain([yMin, yMax])
      .range([margin.top + innerH, margin.top]);

    const baselineTarget = displayMode === 'valuation' ? summary.costBasis : 0;
    const baselineY = yScale(baselineTarget);
    const clampedBaselineY = Math.max(margin.top, Math.min(margin.top + innerH, baselineY));

    const lineGen = d3
      .line<(typeof chartSeries)[number]>()
      .x((d) => xScale(d.index))
      .y((d) => yScale(getVal(d)))
      .curve(d3.curveMonotoneX);

    const areaGen = d3
      .area<(typeof chartSeries)[number]>()
      .x((d) => xScale(d.index))
      .y0(clampedBaselineY)
      .y1((d) => yScale(getVal(d)))
      .curve(d3.curveMonotoneX);

    const multiPaths = filteredBundles.map((b, idx) => {
      const sym = b.holding.symbol;
      const gen = d3
        .line<(typeof chartSeries)[number]>()
        .x((d) => xScale(d.index))
        .y((d) => yScale(d.perAssetRoi[sym] ?? 0))
        .curve(d3.curveMonotoneX);
      return {
        symbol: sym,
        color: MULTI_LINE_PALETTE[idx % MULTI_LINE_PALETTE.length],
        path: gen(chartSeries) ?? '',
        latestRoi: chartSeries[chartSeries.length - 1]?.perAssetRoi[sym] ?? 0,
      };
    });

    const yTicks = yScale.ticks(5);
    const zeroRatioPct = Math.max(
      0,
      Math.min(100, ((clampedBaselineY - margin.top) / Math.max(1, innerH)) * 100)
    );

    return {
      xScale,
      yScale,
      yTicks,
      baselineTarget,
      baselineY: clampedBaselineY,
      zeroRatioPct,
      linePath: lineGen(chartSeries) ?? '',
      areaPath: areaGen(chartSeries) ?? '',
      multiPaths,
    };
  }, [chartSeries, displayMode, filteredBundles, innerH, innerW, margin.left, margin.top, summary.costBasis]);

  const activeIndex = hoverIdx !== null ? hoverIdx : Math.max(0, chartSeries.length - 1);
  const activePoint = chartSeries[activeIndex];
  const isGain = summary.pnl >= 0;

  const formatYAxis = (v: number) => {
    if (displayMode === 'roi' || displayMode === 'multi') return `${v.toFixed(1)}%`;
    return formatCompactUsd(v);
  };

  return (
    <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden">
      {/* Header Bar: Live Stream Controls & Stress-Test Impulses */}
      <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-md bg-[var(--twe-gold-soft)] border border-[#A8843E]/30 dark:border-[#D4B475]/30 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
                Real-Time Portfolio Profit &amp; Loss (PnL) Engine
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border ${
                  isStreaming
                    ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-[var(--twe-bg-muted)] text-[var(--twe-text-muted)] border-[var(--twe-border)]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isStreaming ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                {isStreaming ? `LIVE · ${latencyMs}ms · #${tickCount}` : 'PAUSED'}
              </span>
              {impulsePct !== 0 && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#A8843E]/15 text-[#A8843E] dark:text-[#D4B475] border border-[#D4B475]/30">
                  Stress: {impulsePct > 0 ? '+' : ''}
                  {impulsePct}%
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--twe-text-secondary)] truncate">
              Market-cap trajectory &amp; cost-basis modeling across {filteredBundles.length} holding(s)
            </p>
          </div>
        </div>

        {/* Stream Interval + Stress Test Controls */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <div className="inline-flex rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] p-0.5">
            {([1, 2, 5] as TickIntervalSec[]).map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setTickIntervalSec(sec)}
                className={`px-2 py-1 rounded font-mono text-[10px] whitespace-nowrap cursor-pointer ${
                  tickIntervalSec === sec
                    ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-semibold'
                    : 'text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)]'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsStreaming((s) => !s)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] hover:border-[#D4B475] text-[var(--twe-text-primary)] font-mono text-[10px] whitespace-nowrap cursor-pointer"
          >
            {isStreaming ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {isStreaming ? 'Pause' : 'Resume'}
          </button>

          <button
            type="button"
            onClick={() => applyStressImpulse(2.5)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-semibold whitespace-nowrap cursor-pointer"
            title="Apply +2.5% bullish market cap impulse"
          >
            <TrendingUp className="w-3 h-3" /> +2.5% Bull
          </button>

          <button
            type="button"
            onClick={() => applyStressImpulse(-2.0)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-rose-500/35 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-mono text-[10px] font-semibold whitespace-nowrap cursor-pointer"
            title="Apply -2.0% bearish stress shock"
          >
            <TrendingDown className="w-3 h-3" /> -2.0% Bear
          </button>

          <button
            type="button"
            onClick={resetToBaseline}
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] hover:border-[var(--twe-border-strong)] text-[var(--twe-text-secondary)] font-mono text-[10px] whitespace-nowrap cursor-pointer"
            title="Reset to neutral baseline prices"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      </div>

      {/* Metrics Strip + Interactive Selectors */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
            <div className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">
              Cumulative Net PnL
            </div>
            <div
              className={`mt-1 font-mono text-lg font-semibold tabular-nums flex items-center gap-1 ${
                isGain ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {isGain ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {isGain ? '+' : ''}${summary.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
            <div className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">
              Weighted ROI (%)
            </div>
            <div
              className={`mt-1 font-mono text-lg font-semibold tabular-nums ${
                summary.roi >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {summary.roi >= 0 ? '+' : ''}
              {summary.roi.toFixed(2)}%
            </div>
          </div>

          <div className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
            <div className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">
              Live Valuation / Cost
            </div>
            <div className="mt-1 font-mono text-sm sm:text-base font-semibold tabular-nums text-[var(--twe-text-primary)]">
              {formatCompactUsd(summary.valuation)}{' '}
              <span className="text-xs font-normal text-[var(--twe-text-muted)]">
                / {formatCompactUsd(summary.costBasis)}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
            <div className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">
              Tracked Mock Market Cap
            </div>
            <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-[#A8843E] dark:text-[#D4B475]">
              {formatCompactUsd(summary.mcap)}
            </div>
          </div>
        </div>

        {/* Control Ribbon: Display Mode, Timeframe, Token Focus */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* 4 Display Modes */}
          <div className="flex flex-wrap items-center gap-1 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-1">
            {(
              [
                { id: 'pnl', label: 'PnL ($)' },
                { id: 'roi', label: 'ROI (%)' },
                { id: 'valuation', label: 'Valuation' },
                { id: 'multi', label: 'Multi-Asset' },
              ] as Array<{ id: DisplayMode; label: string }>
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setDisplayMode(mode.id)}
                className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  displayMode === mode.id
                    ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-semibold'
                    : 'text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)]'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* 7 Timeframes */}
          <div className="flex flex-wrap items-center gap-1 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-1">
            {(Object.keys(TIMEFRAME_FACTORS) as TimeframeKey[]).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 rounded font-mono text-[11px] whitespace-nowrap cursor-pointer transition-colors ${
                  timeframe === tf
                    ? 'bg-[var(--twe-bg-surface)] text-[#A8843E] dark:text-[#D4B475] border border-[#A8843E]/40 dark:border-[#D4B475]/40 font-semibold'
                    : 'text-[var(--twe-text-muted)] hover:text-[var(--twe-text-primary)]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Token Focus Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono text-[11px] uppercase text-[var(--twe-text-muted)]">Focus:</span>
            <select
              value={focusSymbol}
              onChange={(e) => {
                const sym = e.target.value;
                setFocusSymbol(sym);
                if (sym !== 'ALL') {
                  onFocusedSymbolChange?.(sym);
                }
              }}
              aria-label="Filter PnL graph by token"
              className="px-2.5 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-mono text-[var(--twe-text-primary)] cursor-pointer"
            >
              <option value="ALL">Aggregate Portfolio ({holdings.length})</option>
              {holdings.map((h) => (
                <option key={h.symbol} value={h.symbol}>
                  {h.symbol} · {h.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Interactive D3 Chart Area */}
        {d3Chart && activePoint && (
          <div className="relative rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)]/50 p-3">
            {/* Live Crosshair Readout Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-[var(--twe-border)] text-[11px] font-mono">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[#A8843E] dark:text-[#D4B475] font-semibold">
                  {activePoint.label}
                </span>
                <span className="text-[var(--twe-text-primary)] tabular-nums">
                  PnL:{' '}
                  <strong
                    className={
                      activePoint.pnlUsd >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }
                  >
                    {activePoint.pnlUsd >= 0 ? '+' : ''}
                    ${activePoint.pnlUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </strong>
                </span>
                <span className="text-[var(--twe-text-secondary)] tabular-nums">
                  ROI: {activePoint.roiPct >= 0 ? '+' : ''}
                  {activePoint.roiPct.toFixed(2)}%
                </span>
                <span className="text-[var(--twe-text-secondary)] tabular-nums">
                  Val: {formatCompactUsd(activePoint.valuationUsd)}
                </span>
                <span className="text-[var(--twe-text-muted)] tabular-nums">
                  Mock MCap: {formatCompactUsd(activePoint.marketCapUsd)}
                </span>
              </div>

              {displayMode === 'multi' && (
                <div className="flex flex-wrap items-center gap-2">
                  {d3Chart.multiPaths.map((mp) => (
                    <span key={mp.symbol} className="inline-flex items-center gap-1 text-[10px]">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: mp.color }}
                      />
                      <span className="text-[var(--twe-text-primary)]">{mp.symbol}</span>
                      <span
                        className={
                          mp.latestRoi >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }
                      >
                        {mp.latestRoi >= 0 ? '+' : ''}
                        {mp.latestRoi.toFixed(1)}%
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="w-full h-56 sm:h-64 overflow-visible select-none"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                if (rect.width <= 0) return;
                const relX = ((e.clientX - rect.left) / rect.width) * svgW;
                const idx = Math.round(d3Chart.xScale.invert(relX));
                setHoverIdx(Math.max(0, Math.min(chartSeries.length - 1, idx)));
              }}
              onMouseLeave={() => setHoverIdx(null)}
            >
              <defs>
                {/* Dual-polarity emerald/rose gradient split cleanly at zero baseline */}
                <linearGradient id={`pnl-stroke-${uid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset={`${d3Chart.zeroRatioPct}%`} stopColor="#10b981" />
                  <stop offset={`${d3Chart.zeroRatioPct}%`} stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
                <linearGradient id={`pnl-fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.32} />
                  <stop offset={`${d3Chart.zeroRatioPct}%`} stopColor="#10b981" stopOpacity={0.05} />
                  <stop offset={`${d3Chart.zeroRatioPct}%`} stopColor="#f43f5e" stopOpacity={0.06} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.32} />
                </linearGradient>
                <linearGradient id={`val-fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D4B475" stopOpacity={0.34} />
                  <stop offset="100%" stopColor="#D4B475" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              {/* Gridlines & Y-Axis Labels */}
              {d3Chart.yTicks.map((tick) => {
                const y = d3Chart.yScale(tick);
                return (
                  <g key={tick}>
                    <line
                      x1={margin.left}
                      y1={y}
                      x2={svgW - margin.right}
                      y2={y}
                      stroke="currentColor"
                      strokeOpacity={0.1}
                    />
                    <text
                      x={margin.left - 8}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="10"
                      fontFamily="var(--font-mono)"
                      fill="currentColor"
                      opacity={0.62}
                    >
                      {formatYAxis(tick)}
                    </text>
                  </g>
                );
              })}

              {/* Break-Even / Cost-Basis Reference Baseline */}
              <line
                x1={margin.left}
                y1={d3Chart.baselineY}
                x2={svgW - margin.right}
                y2={d3Chart.baselineY}
                stroke="#D4B475"
                strokeOpacity={0.65}
                strokeDasharray="4 4"
                strokeWidth={1.2}
              />
              <text
                x={svgW - margin.right}
                y={d3Chart.baselineY - 4}
                textAnchor="end"
                fontSize="9"
                fontFamily="var(--font-mono)"
                fill="#D4B475"
              >
                {displayMode === 'valuation'
                  ? `Cost Basis (${formatCompactUsd(summary.costBasis)})`
                  : 'Break-Even (0)'}
              </text>

              {/* Curves */}
              {displayMode === 'multi' ? (
                d3Chart.multiPaths.map((mp) => (
                  <path
                    key={mp.symbol}
                    d={mp.path}
                    fill="none"
                    stroke={mp.color}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                ))
              ) : (
                <>
                  <path
                    d={d3Chart.areaPath}
                    fill={
                      displayMode === 'valuation'
                        ? `url(#val-fill-${uid})`
                        : `url(#pnl-fill-${uid})`
                    }
                  />
                  <path
                    d={d3Chart.linePath}
                    fill="none"
                    stroke={
                      displayMode === 'valuation' ? '#D4B475' : `url(#pnl-stroke-${uid})`
                    }
                    strokeWidth={2.2}
                    strokeLinecap="round"
                  />
                </>
              )}

              {/* X-Axis Labels */}
              {chartSeries
                .filter((_, idx) => idx === 0 || idx === Math.floor(chartSeries.length / 2) || idx === chartSeries.length - 1)
                .map((pt) => (
                  <text
                    key={`x-${pt.index}`}
                    x={d3Chart.xScale(pt.index)}
                    y={svgH - 6}
                    textAnchor={
                      pt.index === 0
                        ? 'start'
                        : pt.index === chartSeries.length - 1
                        ? 'end'
                        : 'middle'
                    }
                    fontSize="10"
                    fontFamily="var(--font-mono)"
                    fill="currentColor"
                    opacity={0.62}
                  >
                    {pt.label}
                  </text>
                ))}

              {/* Active Crosshair Cursor */}
              <g>
                <line
                  x1={d3Chart.xScale(activePoint.index)}
                  y1={margin.top}
                  x2={d3Chart.xScale(activePoint.index)}
                  y2={margin.top + innerH}
                  stroke="#D4B475"
                  strokeDasharray="3 3"
                  strokeWidth={1.2}
                />
                {displayMode !== 'multi' && (
                  <circle
                    cx={d3Chart.xScale(activePoint.index)}
                    cy={d3Chart.yScale(
                      displayMode === 'roi'
                        ? activePoint.roiPct
                        : displayMode === 'valuation'
                        ? activePoint.valuationUsd
                        : activePoint.pnlUsd
                    )}
                    r={4.5}
                    fill={
                      displayMode === 'valuation'
                        ? '#D4B475'
                        : activePoint.pnlUsd >= 0
                        ? '#10b981'
                        : '#f43f5e'
                    }
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />
                )}
              </g>
            </svg>
          </div>
        )}

        {/* Tokens Performance Breakdown Table */}
        <div className="rounded-lg border border-[var(--twe-border)] overflow-hidden">
          <div className="px-3 py-2 bg-[var(--twe-bg-elevated)] border-b border-[var(--twe-border)] flex items-center justify-between text-[11px] font-mono uppercase text-[var(--twe-text-muted)]">
            <span>Tokens Performance Breakdown (Live Simulated Ticks)</span>
            <span>{TIMEFRAME_FACTORS[timeframe].label} Anchor</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="border-b border-[var(--twe-border)] text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">
                <tr>
                  <th className="px-3 py-2">Token</th>
                  <th className="px-3 py-2 text-right">Mock Market Cap</th>
                  <th className="px-3 py-2 text-right">Live Price</th>
                  <th className="px-3 py-2 text-right">Cost Basis</th>
                  <th className="px-3 py-2 text-right">Valuation</th>
                  <th className="px-3 py-2 text-right">Net PnL / ROI</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--twe-border)]">
                {bundles.map((b) => {
                  const pt = b.latestPoint;
                  const pos = pt.pnlUsd >= 0;
                  const isFocused = focusSymbol === b.holding.symbol;
                  return (
                    <tr
                      key={b.holding.symbol}
                      className={`h-10 transition-colors ${
                        isFocused
                          ? 'bg-[var(--twe-gold-soft)]'
                          : 'hover:bg-[var(--twe-bg-elevated)]'
                      }`}
                    >
                      <td className="px-3 py-2">
                        <div className="font-mono font-semibold text-[var(--twe-text-primary)]">
                          {b.holding.symbol}
                        </div>
                        <div className="text-[10px] text-[var(--twe-text-muted)]">{b.holding.name}</div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-[var(--twe-text-secondary)]">
                        {formatCompactUsd(pt.marketCapUsd)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        ${pt.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-[var(--twe-text-muted)]">
                        ${pt.costBasisUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold">
                        ${pt.valuationUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono tabular-nums ${
                          pos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {pos ? '+' : ''}${pt.pnlUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                        <span className="text-[10px]">
                          ({pt.roiPct >= 0 ? '+' : ''}
                          {pt.roiPct.toFixed(2)}%)
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setFocusSymbol((cur) => {
                                const next = cur === b.holding.symbol ? 'ALL' : b.holding.symbol;
                                if (next !== 'ALL') onFocusedSymbolChange?.(next);
                                return next;
                              })
                            }
                            className={`px-2 py-0.5 rounded border text-[10px] font-mono whitespace-nowrap cursor-pointer ${
                              isFocused
                                ? 'border-[#A8843E] dark:border-[#D4B475] bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-semibold'
                                : 'border-[var(--twe-border-strong)] hover:border-[#D4B475]'
                            }`}
                          >
                            {isFocused ? 'Focused' : 'Focus'}
                          </button>
                          {onExpandAsset30Day && (
                            <button
                              type="button"
                              onClick={() => onExpandAsset30Day(b.holding.symbol)}
                              className="px-2 py-0.5 rounded border border-[var(--twe-border-strong)] hover:border-[#D4B475] text-[10px] font-mono whitespace-nowrap cursor-pointer"
                            >
                              30D
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onTradeSymbol(b.holding.symbol)}
                            className="px-2 py-0.5 rounded border border-[#A8843E]/40 dark:border-[#D4B475]/40 text-[#A8843E] dark:text-[#D4B475] hover:bg-[var(--twe-gold-soft)] text-[10px] font-mono font-semibold whitespace-nowrap cursor-pointer"
                          >
                            Trade
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
