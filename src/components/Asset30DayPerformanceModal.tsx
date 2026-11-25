import React, { useEffect, useId, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'motion/react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  Compass,
  Newspaper,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import {
  formatCompactUsd,
  type AssetAnalyticsBundle,
  type SigmaTier,
  type TokenTimePoint,
} from '../lib/portfolioAnalytics';
import {
  ModalDepthOfMarketTab,
  ModalRsiBacktesterAndAlertsTab,
  ModalSentimentAndBenchmarkTab,
} from './ModalDepthAndQuantTabs';

type PrimaryMetricMode = 'pnl' | 'mcap' | 'price' | 'sigma' | 'rsi';
type TrendLineMode = 'all' | 'resistance' | 'support';
type LedgerFilter = 'all' | 'buy' | 'sell' | 'spikes' | 'peaks' | 'troughs';
type ModalTab = 'overview' | 'dom' | 'sentiment' | 'backtest';

interface Asset30DayPerformanceModalProps {
  bundle: AssetAnalyticsBundle | null;
  onClose: () => void;
  onTradeSymbol: (symbol: string) => void;
}

const HEAT_FILL: Record<SigmaTier, string> = {
  low: 'rgba(16, 185, 129, 0.04)',
  moderate: 'rgba(212, 180, 117, 0.12)',
  high: 'rgba(245, 158, 11, 0.20)',
  extreme: 'rgba(244, 63, 94, 0.28)',
};

export const Asset30DayPerformanceModal: React.FC<Asset30DayPerformanceModalProps> = ({
  bundle,
  onClose,
  onTradeSymbol,
}) => {
  const uid = useId().replace(/:/g, '');
  const [modalTab, setModalTab] = useState<ModalTab>('overview');
  const [metricMode, setMetricMode] = useState<PrimaryMetricMode>('pnl');
  const [showRsiPanel, setShowRsiPanel] = useState<boolean>(true);
  const [showTrendLines, setShowTrendLines] = useState<boolean>(true);
  const [trendMode, setTrendMode] = useState<TrendLineMode>('all');
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('all');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [pinnedIdx, setPinnedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!bundle) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [bundle, onClose]);

  useEffect(() => {
    setHoverIdx(null);
    setPinnedIdx(null);
  }, [bundle?.holding.symbol]);

  const points = bundle?.points31d ?? [];
  const vol30 = bundle?.volatility30d;
  const trend = bundle?.trendAnalysis;
  const latest = bundle?.latestPoint;

  const summaryStats = useMemo(() => {
    if (points.length === 0) return null;
    const first = points[0];
    const last = points[points.length - 1];
    const netReturnUsd = last.pnlUsd - first.pnlUsd;
    const netReturnPct =
      first.valuationUsd > 0 ? ((last.valuationUsd - first.valuationUsd) / first.valuationUsd) * 100 : 0;
    const highMcap = Math.max(...points.map((p) => p.marketCapUsd));
    const lowMcap = Math.min(...points.map((p) => p.marketCapUsd));
    const buySignals = points.filter((p) => p.rsi14 <= 30).length;
    const sellSignals = points.filter((p) => p.rsi14 >= 70).length;
    return {
      netReturnUsd,
      netReturnPct,
      highMcap,
      lowMcap,
      buySignals,
      sellSignals,
    };
  }, [points]);

  // Primary Chart D3 geometry
  const chartW = 880;
  const primaryH = 225;
  const rsiH = 175;
  const margin = { top: 18, right: 24, bottom: 24, left: 64 };
  const innerW = chartW - margin.left - margin.right;
  const primaryInnerH = primaryH - margin.top - margin.bottom;
  const rsiInnerH = rsiH - margin.top - margin.bottom;

  const getMetricValue = (pt: TokenTimePoint): number => {
    switch (metricMode) {
      case 'mcap':
        return pt.marketCapUsd;
      case 'price':
        return pt.priceUsd;
      case 'sigma':
        return pt.zScore;
      case 'rsi':
        return pt.rsi14;
      case 'pnl':
      default:
        return pt.pnlUsd;
    }
  };

  const primaryD3 = useMemo(() => {
    if (points.length === 0) return null;
    const vals = points.map(getMetricValue);
    let minV = Math.min(...vals);
    let maxV = Math.max(...vals);
    if (metricMode === 'pnl') {
      minV = Math.min(minV, 0);
      maxV = Math.max(maxV, 0);
    } else if (metricMode === 'rsi') {
      minV = 0;
      maxV = 100;
    } else if (metricMode === 'sigma') {
      minV = 0;
      maxV = Math.max(2.6, maxV * 1.1);
    }
    const span = Math.max(0.1, maxV - minV);
    const dMin = metricMode === 'rsi' || metricMode === 'sigma' ? minV : minV - span * 0.1;
    const dMax = metricMode === 'rsi' ? 100 : maxV + span * 0.1;

    const xScale = d3
      .scaleLinear()
      .domain([0, Math.max(1, points.length - 1)])
      .range([margin.left, margin.left + innerW]);

    const yScale = d3
      .scaleLinear()
      .domain([dMin, dMax])
      .range([margin.top + primaryInnerH, margin.top]);

    const baselineTarget = metricMode === 'pnl' ? 0 : metricMode === 'rsi' ? 50 : metricMode === 'sigma' ? 2.0 : minV;
    const baselineY = Math.max(margin.top, Math.min(margin.top + primaryInnerH, yScale(baselineTarget)));

    const lineGen = d3
      .line<TokenTimePoint>()
      .x((d) => xScale(d.index))
      .y((d) => yScale(getMetricValue(d)))
      .curve(d3.curveMonotoneX);

    const areaGen = d3
      .area<TokenTimePoint>()
      .x((d) => xScale(d.index))
      .y0(metricMode === 'pnl' ? baselineY : margin.top + primaryInnerH)
      .y1((d) => yScale(getMetricValue(d)))
      .curve(d3.curveMonotoneX);

    const colW = innerW / Math.max(1, points.length);
    const yTicks = yScale.ticks(4);

    return {
      xScale,
      yScale,
      yTicks,
      baselineY,
      colW,
      linePath: lineGen(points) ?? '',
      areaPath: areaGen(points) ?? '',
    };
  }, [points, metricMode, innerW, primaryInnerH, margin.left, margin.top]);

  // 14D Wilder's RSI Sub-Chart D3 Geometry
  const rsiD3 = useMemo(() => {
    if (points.length === 0) return null;
    const xScale = d3
      .scaleLinear()
      .domain([0, Math.max(1, points.length - 1)])
      .range([margin.left, margin.left + innerW]);
    const yScale = d3
      .scaleLinear()
      .domain([0, 100])
      .range([margin.top + rsiInnerH, margin.top]);

    const lineGen = d3
      .line<TokenTimePoint>()
      .x((d) => xScale(d.index))
      .y((d) => yScale(d.rsi14))
      .curve(d3.curveMonotoneX);

    return {
      xScale,
      yScale,
      linePath: lineGen(points) ?? '',
      y70: yScale(70),
      y50: yScale(50),
      y30: yScale(30),
      y100: yScale(100),
      y0: yScale(0),
    };
  }, [points, innerW, rsiInnerH, margin.left, margin.top]);

  const filteredLedger = useMemo(() => {
    return points
      .filter((p) => {
        if (ledgerFilter === 'buy') return p.rsi14 <= 30;
        if (ledgerFilter === 'sell') return p.rsi14 >= 70;
        if (ledgerFilter === 'spikes') return p.zScore >= 1.5;
        if (ledgerFilter === 'peaks') return p.isPeak;
        if (ledgerFilter === 'troughs') return p.isTrough;
        return true;
      })
      .slice()
      .reverse();
  }, [points, ledgerFilter]);

  if (!bundle || !latest || !vol30 || !trend || !summaryStats) {
    return null;
  }

  const activeIdx =
    hoverIdx !== null ? hoverIdx : pinnedIdx !== null ? pinnedIdx : points.length - 1;
  const activePoint = points[activeIdx] ?? latest;

  // RSI pulse badge styling
  const rsiBadgeClass =
    latest.rsiZone === 'strong-buy'
      ? 'animate-rsi-buy-intense bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/70'
      : latest.rsiZone === 'buy'
      ? 'animate-rsi-buy-subtle bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/45'
      : latest.rsiZone === 'strong-sell'
      ? 'animate-rsi-sell-intense bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/70'
      : latest.rsiZone === 'sell'
      ? 'animate-rsi-sell-subtle bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/45'
      : 'bg-[var(--twe-bg-elevated)] text-[var(--twe-text-secondary)] border-[var(--twe-border)]';

  const rsiActionText =
    latest.rsiZone === 'strong-buy'
      ? 'STRONG BUY (<20)'
      : latest.rsiZone === 'buy'
      ? 'OVERSOLD BUY (≤30)'
      : latest.rsiZone === 'strong-sell'
      ? 'STRONG SELL (>80)'
      : latest.rsiZone === 'sell'
      ? 'OVERBOUGHT SELL (≥70)'
      : 'NEUTRAL MOMENTUM';

  const formatMetricVal = (v: number) => {
    if (metricMode === 'pnl' || metricMode === 'mcap') return formatCompactUsd(v);
    if (metricMode === 'price') return `$${v.toFixed(2)}`;
    if (metricMode === 'sigma') return `${v.toFixed(2)}σ`;
    return `${v.toFixed(1)}`;
  };

  const handleSvgMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!primaryD3) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const relX = ((e.clientX - rect.left) / rect.width) * chartW;
    const idx = Math.round(primaryD3.xScale.invert(relX));
    setHoverIdx(Math.max(0, Math.min(points.length - 1, idx)));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${bundle.holding.symbol} 30-Day Performance & Wilder RSI Breakdown`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl max-h-[94vh] overflow-y-auto rounded-xl border border-[var(--twe-border-strong)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-primary)] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-20 px-4 sm:px-6 py-3.5 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[var(--twe-gold-soft)] border border-[#A8843E]/40 dark:border-[#D4B475]/40 flex items-center justify-center font-mono font-bold text-sm text-[#A8843E] dark:text-[#D4B475] shrink-0">
              {bundle.holding.symbol.slice(0, 4)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display font-bold text-base sm:text-lg text-[var(--twe-text-primary)]">
                  {bundle.holding.symbol} · {bundle.holding.name}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-secondary)]">
                  {bundle.holding.chain}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#A8843E]/15 text-[#A8843E] dark:text-[#D4B475] border border-[#D4B475]/30">
                  Mock MCap {formatCompactUsd(latest.marketCapUsd)}
                </span>
              </div>
              <div className="text-[11px] font-mono text-[var(--twe-text-muted)] mt-0.5">
                30-Day Quantitative Breakdown · 46D Lookback Window · Wilder&apos;s 14D RSI + 2σ Volatility Engine
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Live RSI Pulsing Action Badge */}
            <div className={`px-2.5 py-1 rounded-md border text-[11px] font-mono font-semibold ${rsiBadgeClass}`}>
              RSI {latest.rsi14.toFixed(1)} · {rsiActionText}
            </div>

            {latest.rsi14 <= 30 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onTradeSymbol(bundle.holding.symbol);
                }}
                className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                Execute Buy
              </button>
            )}
            {latest.rsi14 >= 70 && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onTradeSymbol(bundle.holding.symbol);
                }}
                className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                Execute Sell
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close 30-day performance breakdown modal"
              className="p-1.5 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] hover:border-[#D4B475] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 space-y-5">
          {/* 5 Executive Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-3 rounded-lg bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
              <div className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">30D Net Return</div>
              <div
                className={`mt-1 font-mono text-base font-semibold tabular-nums flex items-center gap-1 ${
                  summaryStats.netReturnUsd >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {summaryStats.netReturnUsd >= 0 ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                {summaryStats.netReturnUsd >= 0 ? '+' : ''}
                {formatCompactUsd(summaryStats.netReturnUsd)} ({summaryStats.netReturnPct >= 0 ? '+' : ''}
                {summaryStats.netReturnPct.toFixed(2)}%)
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
              <div className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">
                Valuation vs Cost Basis
              </div>
              <div className="mt-1 font-mono text-sm font-semibold tabular-nums">
                {formatCompactUsd(latest.valuationUsd)}{' '}
                <span className="text-xs font-normal text-[var(--twe-text-muted)]">
                  / {formatCompactUsd(latest.costBasisUsd)}
                </span>
              </div>
              <div
                className={`text-[10px] font-mono mt-0.5 ${
                  latest.pnlUsd >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                Total ROI: {latest.roiPct >= 0 ? '+' : ''}
                {latest.roiPct.toFixed(2)}%
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
              <div className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">
                30D High / Low MCap
              </div>
              <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-[#A8843E] dark:text-[#D4B475]">
                {formatCompactUsd(summaryStats.highMcap)}
              </div>
              <div className="text-[10px] font-mono text-[var(--twe-text-muted)] tabular-nums">
                Low: {formatCompactUsd(summaryStats.lowMcap)}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
              <div className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">
                Volatility Spikes (30D)
              </div>
              <div className="mt-1 font-mono text-base font-semibold tabular-nums flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-rose-500" />
                <span>{vol30.twoSigmaSpikeCount} × 2σ</span>
                <span className="text-xs font-normal text-[var(--twe-text-muted)]">
                  (Peak {vol30.peakSigma.toFixed(2)}σ)
                </span>
              </div>
              <div className="text-[10px] font-mono text-[var(--twe-text-muted)]">
                High (≥1.5σ): {vol30.highSigmaCount} days
              </div>
            </div>

            <div className={`p-3 rounded-lg border ${rsiBadgeClass}`}>
              <div className="text-[10px] font-mono uppercase opacity-80">14D RSI Momentum</div>
              <div className="mt-1 font-mono text-base font-semibold tabular-nums">
                {latest.rsi14.toFixed(1)} · {rsiActionText.split(' ')[0]}
              </div>
              <div className="text-[10px] font-mono opacity-85">
                30D Signals: {summaryStats.buySignals} Buy · {summaryStats.sellSignals} Sell
              </div>
            </div>
          </div>

          {/* Modal Sub-Suite Tabs (Staggered Motion Navigation) */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-1">
            {(
              [
                { id: 'overview', label: 'Overview & Wilder RSI', icon: Activity },
                { id: 'dom', label: 'Depth of Market & Executions', icon: BarChart3 },
                { id: 'sentiment', label: 'Sentiment & Benchmark Matrix', icon: Newspaper },
                { id: 'backtest', label: 'Backtester & Signal Log', icon: Bot },
              ] as const
            ).map((tb) => {
              const Icon = tb.icon;
              return (
                <button
                  key={tb.id}
                  type="button"
                  onClick={() => setModalTab(tb.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                    modalTab === tb.id
                      ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-semibold'
                      : 'text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tb.label}</span>
                </button>
              );
            })}
          </div>

          {modalTab === 'dom' && (
            <ModalDepthOfMarketTab bundle={bundle} onTradeSymbol={onTradeSymbol} />
          )}

          {modalTab === 'sentiment' && <ModalSentimentAndBenchmarkTab bundle={bundle} />}

          {modalTab === 'backtest' && <ModalRsiBacktesterAndAlertsTab bundle={bundle} />}

          {modalTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              {/* Interactive Chart Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-1">
              {(
                [
                  { id: 'pnl', label: 'PnL ($)' },
                  { id: 'mcap', label: 'Market Cap' },
                  { id: 'price', label: 'Unit Price' },
                  { id: 'sigma', label: 'Volatility (σ)' },
                  { id: 'rsi', label: 'RSI (14)' },
                ] as Array<{ id: PrimaryMetricMode; label: string }>
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetricMode(m.id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap cursor-pointer ${
                    metricMode === m.id
                      ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-semibold'
                      : 'text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowRsiPanel((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-[11px] whitespace-nowrap cursor-pointer ${
                  showRsiPanel
                    ? 'border-[#A8843E] dark:border-[#D4B475] bg-[var(--twe-gold-soft)] text-[var(--twe-text-primary)]'
                    : 'border-[var(--twe-border)] text-[var(--twe-text-muted)]'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                RSI Panel: {showRsiPanel ? 'ON' : 'OFF'}
              </button>

              {showRsiPanel && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowTrendLines((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-[11px] whitespace-nowrap cursor-pointer ${
                      showTrendLines
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'border-[var(--twe-border)] text-[var(--twe-text-muted)]'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Dynamic Trend Lines: {showTrendLines ? 'ON' : 'OFF'}
                  </button>

                  {showTrendLines && (
                    <div className="inline-flex rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-0.5">
                      {(['all', 'resistance', 'support'] as TrendLineMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setTrendMode(mode)}
                          className={`px-2 py-0.5 rounded font-mono text-[10px] capitalize whitespace-nowrap cursor-pointer ${
                            trendMode === mode
                              ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-semibold'
                              : 'text-[var(--twe-text-secondary)]'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Synchronized Point Inspector Strip */}
          <div className="px-3.5 py-2.5 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-[#A8843E] dark:text-[#D4B475]">
                {activePoint.label} ({activePoint.isoDate})
              </span>
              <span className="tabular-nums">
                Price: <strong>${activePoint.priceUsd.toFixed(2)}</strong>
              </span>
              <span className="tabular-nums">
                MCap: <strong>{formatCompactUsd(activePoint.marketCapUsd)}</strong>
              </span>
              <span
                className={`tabular-nums font-semibold ${
                  activePoint.pnlUsd >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                PnL: {activePoint.pnlUsd >= 0 ? '+' : ''}
                {formatCompactUsd(activePoint.pnlUsd)}
              </span>
              <span className="tabular-nums">
                Volatility: <strong>{activePoint.zScore.toFixed(2)}σ</strong> ({activePoint.sigmaTier})
              </span>
              <span className="tabular-nums">
                RSI(14): <strong>{activePoint.rsi14.toFixed(1)}</strong>
              </span>
            </div>
            {pinnedIdx !== null && (
              <button
                type="button"
                onClick={() => setPinnedIdx(null)}
                className="text-[10px] px-2 py-0.5 rounded border border-[var(--twe-border-strong)] hover:border-[#D4B475] cursor-pointer"
              >
                Unpin Day
              </button>
            )}
          </div>

          {/* Primary 30-Day D3 Chart */}
          {primaryD3 && (
            <div className="rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)]/45 p-3">
              <svg
                viewBox={`0 0 ${chartW} ${primaryH}`}
                className="w-full h-56 overflow-visible select-none"
                onMouseMove={handleSvgMove}
                onMouseLeave={() => setHoverIdx(null)}
              >
                <defs>
                  <linearGradient id={`modal-area-${uid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4B475" stopOpacity={0.34} />
                    <stop offset="100%" stopColor="#D4B475" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                {/* Vertical Volatility Heat Bands */}
                {points.map((pt) => {
                  const cx = primaryD3.xScale(pt.index);
                  return (
                    <rect
                      key={`hband-${pt.index}`}
                      x={Math.max(margin.left, cx - primaryD3.colW / 2)}
                      y={margin.top}
                      width={Math.max(3, primaryD3.colW)}
                      height={primaryInnerH}
                      fill={HEAT_FILL[pt.sigmaTier]}
                    />
                  );
                })}

                {/* Y Gridlines */}
                {primaryD3.yTicks.map((t) => {
                  const y = primaryD3.yScale(t);
                  return (
                    <g key={t}>
                      <line
                        x1={margin.left}
                        y1={y}
                        x2={chartW - margin.right}
                        y2={y}
                        stroke="currentColor"
                        strokeOpacity={0.12}
                      />
                      <text
                        x={margin.left - 8}
                        y={y + 3}
                        textAnchor="end"
                        fontSize="10"
                        fontFamily="var(--font-mono)"
                        fill="currentColor"
                        opacity={0.65}
                      >
                        {formatMetricVal(t)}
                      </text>
                    </g>
                  );
                })}

                {/* Reference Baseline */}
                <line
                  x1={margin.left}
                  y1={primaryD3.baselineY}
                  x2={chartW - margin.right}
                  y2={primaryD3.baselineY}
                  stroke="#D4B475"
                  strokeOpacity={0.55}
                  strokeDasharray="4 4"
                />

                {/* Primary Area & Line */}
                <path d={primaryD3.areaPath} fill={`url(#modal-area-${uid})`} />
                <path
                  d={primaryD3.linePath}
                  fill="none"
                  stroke="#D4B475"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                />

                {/* 2-Sigma Extreme Shock Diamonds */}
                {points.map((pt) => {
                  if (pt.zScore < 2.0) return null;
                  const cx = primaryD3.xScale(pt.index);
                  const cy = primaryD3.yScale(getMetricValue(pt));
                  return (
                    <g key={`p-spike-${pt.index}`}>
                      <circle cx={cx} cy={cy} r={6} fill="none" stroke="#f43f5e" strokeOpacity={0.6} />
                      <polygon
                        points={`${cx},${cy - 4.5} ${cx + 4.5},${cy} ${cx},${cy + 4.5} ${cx - 4.5},${cy}`}
                        fill="#f43f5e"
                        stroke="#ffffff"
                        strokeWidth={0.9}
                      />
                    </g>
                  );
                })}

                {/* Synchronized Crosshair */}
                <line
                  x1={primaryD3.xScale(activePoint.index)}
                  y1={margin.top}
                  x2={primaryD3.xScale(activePoint.index)}
                  y2={margin.top + primaryInnerH}
                  stroke="#D4B475"
                  strokeDasharray="3 3"
                  strokeWidth={1.2}
                />
                <circle
                  cx={primaryD3.xScale(activePoint.index)}
                  cy={primaryD3.yScale(getMetricValue(activePoint))}
                  r={4.5}
                  fill="#D4B475"
                  stroke="#ffffff"
                  strokeWidth={1.5}
                />

                {/* X-Axis Labels */}
                {points
                  .filter((_, idx) => idx % 5 === 0 || idx === points.length - 1)
                  .map((pt) => (
                    <text
                      key={`px-${pt.index}`}
                      x={primaryD3.xScale(pt.index)}
                      y={primaryH - 6}
                      textAnchor={pt.index === 0 ? 'start' : pt.index === points.length - 1 ? 'end' : 'middle'}
                      fontSize="10"
                      fontFamily="var(--font-mono)"
                      fill="currentColor"
                      opacity={0.62}
                    >
                      {pt.shortLabel}
                    </text>
                  ))}
              </svg>
            </div>
          )}

          {/* Synchronized 14D Wilder's Smoothed RSI Oscillator Sub-Chart + Pattern Card */}
          {showRsiPanel && rsiD3 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-9 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)]/45 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5 text-[11px] font-mono">
                  <span className="font-semibold text-[var(--twe-text-primary)]">
                    14-Period Wilder&apos;s Smoothed RSI Oscillator &amp; Dynamic Extrema Channels
                  </span>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="text-rose-500">≥70 Overbought (SELL)</span>
                    <span className="text-[var(--twe-text-muted)]">50 Neutral</span>
                    <span className="text-emerald-500">≤30 Oversold (BUY)</span>
                  </div>
                </div>

                <svg
                  viewBox={`0 0 ${chartW} ${rsiH}`}
                  className="w-full h-44 overflow-visible select-none"
                  onMouseMove={handleSvgMove}
                  onMouseLeave={() => setHoverIdx(null)}
                >
                  <defs>
                    <linearGradient id={`rsi-overbought-${uid}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id={`rsi-oversold-${uid}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.05} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.28} />
                    </linearGradient>
                    {/* Multi-stop vertical gradient coloring RSI curve across thresholds */}
                    <linearGradient id={`rsi-stroke-${uid}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" />
                      <stop offset="30%" stopColor="#f43f5e" />
                      <stop offset="31%" stopColor="#D4B475" />
                      <stop offset="69%" stopColor="#D4B475" />
                      <stop offset="70%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>

                  {/* Overbought Zone (70..100) */}
                  <rect
                    x={margin.left}
                    y={rsiD3.y100}
                    width={innerW}
                    height={Math.max(1, rsiD3.y70 - rsiD3.y100)}
                    fill={`url(#rsi-overbought-${uid})`}
                  />

                  {/* Oversold Zone (0..30) */}
                  <rect
                    x={margin.left}
                    y={rsiD3.y30}
                    width={innerW}
                    height={Math.max(1, rsiD3.y0 - rsiD3.y30)}
                    fill={`url(#rsi-oversold-${uid})`}
                  />

                  {/* Threshold Lines 70, 50, 30 */}
                  {[
                    { val: 70, y: rsiD3.y70, color: '#f43f5e', label: '70 SELL' },
                    { val: 50, y: rsiD3.y50, color: '#94a3b8', label: '50' },
                    { val: 30, y: rsiD3.y30, color: '#10b981', label: '30 BUY' },
                  ].map((th) => (
                    <g key={th.val}>
                      <line
                        x1={margin.left}
                        y1={th.y}
                        x2={chartW - margin.right}
                        y2={th.y}
                        stroke={th.color}
                        strokeOpacity={th.val === 50 ? 0.35 : 0.7}
                        strokeDasharray="4 4"
                      />
                      <text
                        x={margin.left - 8}
                        y={th.y + 3}
                        textAnchor="end"
                        fontSize="10"
                        fontFamily="var(--font-mono)"
                        fill={th.color}
                      >
                        {th.label}
                      </text>
                    </g>
                  ))}

                  {/* Dynamic Upper Resistance Trend Line */}
                  {showTrendLines &&
                    (trendMode === 'all' || trendMode === 'resistance') &&
                    trend.resistanceLine && (
                      <line
                        x1={rsiD3.xScale(trend.resistanceLine.startIdx)}
                        y1={rsiD3.yScale(trend.resistanceLine.startRsi)}
                        x2={rsiD3.xScale(trend.resistanceLine.endIdx)}
                        y2={rsiD3.yScale(trend.resistanceLine.endRsi)}
                        stroke="#f43f5e"
                        strokeWidth={1.6}
                        strokeDasharray="6 3"
                      />
                    )}

                  {/* Dynamic Lower Support Trend Line */}
                  {showTrendLines &&
                    (trendMode === 'all' || trendMode === 'support') &&
                    trend.supportLine && (
                      <line
                        x1={rsiD3.xScale(trend.supportLine.startIdx)}
                        y1={rsiD3.yScale(trend.supportLine.startRsi)}
                        x2={rsiD3.xScale(trend.supportLine.endIdx)}
                        y2={rsiD3.yScale(trend.supportLine.endRsi)}
                        stroke="#10b981"
                        strokeWidth={1.6}
                        strokeDasharray="6 3"
                      />
                    )}

                  {/* Dynamic Multi-Stop RSI Curve */}
                  <path
                    d={rsiD3.linePath}
                    fill="none"
                    stroke={`url(#rsi-stroke-${uid})`}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                  />

                  {/* Local Peaks (▲) & Troughs (▼) */}
                  {points.map((pt) => {
                    const cx = rsiD3.xScale(pt.index);
                    const cy = rsiD3.yScale(pt.rsi14);
                    return (
                      <g key={`rsi-pt-${pt.index}`}>
                        {showTrendLines && pt.isPeak && (trendMode === 'all' || trendMode === 'resistance') && (
                          <polygon
                            points={`${cx},${cy - 7} ${cx - 4.5},${cy} ${cx + 4.5},${cy}`}
                            fill="#f43f5e"
                          />
                        )}
                        {showTrendLines && pt.isTrough && (trendMode === 'all' || trendMode === 'support') && (
                          <polygon
                            points={`${cx},${cy + 7} ${cx - 4.5},${cy} ${cx + 4.5},${cy}`}
                            fill="#10b981"
                          />
                        )}
                        {pt.rsi14 >= 70 && (
                          <circle cx={cx} cy={cy} r={3} fill="#f43f5e" stroke="#ffffff" strokeWidth={0.8} />
                        )}
                        {pt.rsi14 <= 30 && (
                          <circle cx={cx} cy={cy} r={3} fill="#10b981" stroke="#ffffff" strokeWidth={0.8} />
                        )}
                      </g>
                    );
                  })}

                  {/* Synchronized Crosshair */}
                  <line
                    x1={rsiD3.xScale(activePoint.index)}
                    y1={margin.top}
                    x2={rsiD3.xScale(activePoint.index)}
                    y2={margin.top + rsiInnerH}
                    stroke="#D4B475"
                    strokeDasharray="3 3"
                    strokeWidth={1.2}
                  />
                  <circle
                    cx={rsiD3.xScale(activePoint.index)}
                    cy={rsiD3.yScale(activePoint.rsi14)}
                    r={4}
                    fill={
                      activePoint.rsi14 >= 70
                        ? '#f43f5e'
                        : activePoint.rsi14 <= 30
                        ? '#10b981'
                        : '#D4B475'
                    }
                    stroke="#ffffff"
                    strokeWidth={1.3}
                  />
                </svg>
              </div>

              {/* Momentum Pattern Recognition Card */}
              <div className="lg:col-span-3 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-3.5 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">
                    <Compass className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
                    Pattern Recognition
                  </div>
                  <div className="mt-1 font-display font-semibold text-sm text-[var(--twe-text-primary)] flex items-center gap-1.5">
                    {trend.patternBias === 'bullish' && (
                      <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                    {trend.patternBias === 'bearish' && (
                      <TrendingDown className="w-4 h-4 text-rose-500 shrink-0" />
                    )}
                    <span>{trend.patternName}</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-[var(--twe-text-muted)]">Resistance Slope</span>
                    <span className="text-rose-600 dark:text-rose-400 tabular-nums">
                      {trend.resistanceLine
                        ? `${trend.resistanceLine.slopePerDay >= 0 ? '+' : ''}${trend.resistanceLine.slopePerDay} pts/d`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--twe-text-muted)]">Support Slope</span>
                    <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {trend.supportLine
                        ? `${trend.supportLine.slopePerDay >= 0 ? '+' : ''}${trend.supportLine.slopePerDay} pts/d`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-[var(--twe-border)]">
                    <span className="text-[var(--twe-text-muted)]">Projected Ceiling</span>
                    <span className="tabular-nums font-semibold">
                      {trend.projectedCeilingToday !== null ? trend.projectedCeilingToday.toFixed(1) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--twe-text-muted)]">Projected Floor</span>
                    <span className="tabular-nums font-semibold">
                      {trend.projectedFloorToday !== null ? trend.projectedFloorToday.toFixed(1) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--twe-text-muted)]">Channel Spread</span>
                    <span className="tabular-nums text-[#A8843E] dark:text-[#D4B475]">
                      {trend.channelSpreadToday !== null ? `${trend.channelSpreadToday.toFixed(1)} pts` : '—'}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-[var(--twe-text-muted)]">
                  Detected {trend.peaks.length} ▲ peaks · {trend.troughs.length} ▼ troughs
                </div>
              </div>
            </div>
          )}

          {/* Longitudinal Historical RSI Heatmap (Item #61) */}
          {showRsiPanel && (
            <div className="rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)]/60 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                <span className="font-semibold text-[var(--twe-text-primary)]">
                  Longitudinal Historical RSI Heatmap (31-Day Momentum Density)
                </span>
                <div className="flex items-center gap-3 text-[10px] text-[var(--twe-text-muted)]">
                  <span className="text-emerald-500">■ Oversold Cluster (≤30)</span>
                  <span className="text-[#D4B475]">■ Neutral Balance</span>
                  <span className="text-rose-500">■ Overbought Cluster (≥70)</span>
                </div>
              </div>
              <div className="grid grid-cols-[repeat(31,minmax(0,1fr))] gap-0.5 h-6">
                {points.map((pt) => {
                  const bg =
                    pt.rsi14 < 20
                      ? '#059669'
                      : pt.rsi14 <= 30
                      ? '#10b981'
                      : pt.rsi14 > 80
                      ? '#e11d48'
                      : pt.rsi14 >= 70
                      ? '#f43f5e'
                      : pt.rsi14 >= 55
                      ? 'rgba(212, 180, 117, 0.55)'
                      : 'rgba(148, 163, 184, 0.25)';
                  return (
                    <button
                      key={`rsi-heat-${pt.index}`}
                      type="button"
                      onClick={() => setPinnedIdx(pt.index)}
                      title={`${pt.isoDate}: RSI ${pt.rsi14.toFixed(1)}`}
                      style={{ backgroundColor: bg }}
                      className={`h-full rounded-[2px] cursor-pointer transition-transform hover:scale-y-110 ${
                        activePoint.index === pt.index ? 'ring-2 ring-white dark:ring-[#D4B475]' : ''
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Filterable 30-Day Daily Audit Ledger */}
          <div className="rounded-lg border border-[var(--twe-border)] overflow-hidden">
            <div className="px-3.5 py-2.5 bg-[var(--twe-bg-elevated)] border-b border-[var(--twe-border)] flex flex-wrap items-center justify-between gap-2">
              <div className="font-mono text-xs font-semibold text-[var(--twe-text-primary)]">
                30-Day Daily Quantitative Audit Ledger (Click row to focus day)
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {(
                  [
                    { id: 'all', label: 'All (31)' },
                    { id: 'buy', label: 'Buy Signals' },
                    { id: 'sell', label: 'Sell Signals' },
                    { id: 'spikes', label: 'Volatility Spikes' },
                    { id: 'peaks', label: '▲ Peaks' },
                    { id: 'troughs', label: '▼ Troughs' },
                  ] as Array<{ id: LedgerFilter; label: string }>
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setLedgerFilter(f.id)}
                    className={`px-2 py-0.5 rounded font-mono text-[10px] whitespace-nowrap cursor-pointer ${
                      ledgerFilter === f.id
                        ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-semibold'
                        : 'bg-[var(--twe-bg-surface)] text-[var(--twe-text-secondary)] border border-[var(--twe-border)]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto max-h-60 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-[var(--twe-bg-elevated)] border-b border-[var(--twe-border)] text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2 text-right">Mock MCap</th>
                    <th className="px-3 py-2 text-right">Price</th>
                    <th className="px-3 py-2 text-right">1D %</th>
                    <th className="px-3 py-2 text-right">PnL ($)</th>
                    <th className="px-3 py-2 text-right">Sigma (σ)</th>
                    <th className="px-3 py-2 text-right">RSI (14)</th>
                    <th className="px-3 py-2 text-right">Extrema / Signal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--twe-border)] font-mono">
                  {filteredLedger.map((pt) => {
                    const selected = activePoint.index === pt.index;
                    return (
                      <tr
                        key={pt.index}
                        onClick={() => setPinnedIdx(pt.index)}
                        className={`h-9 cursor-pointer transition-colors ${
                          selected
                            ? 'bg-[var(--twe-gold-soft)]'
                            : 'hover:bg-[var(--twe-bg-elevated)]'
                        }`}
                      >
                        <td className="px-3 py-1.5 text-[var(--twe-text-primary)]">
                          {pt.shortLabel} <span className="text-[10px] text-[var(--twe-text-muted)]">({pt.isoDate})</span>
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-[var(--twe-text-secondary)]">
                          {formatCompactUsd(pt.marketCapUsd)}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">${pt.priceUsd.toFixed(2)}</td>
                        <td
                          className={`px-3 py-1.5 text-right tabular-nums ${
                            pt.dailyReturnPct >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {pt.dailyReturnPct >= 0 ? '+' : ''}
                          {pt.dailyReturnPct.toFixed(2)}%
                        </td>
                        <td
                          className={`px-3 py-1.5 text-right tabular-nums ${
                            pt.pnlUsd >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {pt.pnlUsd >= 0 ? '+' : ''}
                          {formatCompactUsd(pt.pnlUsd)}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          <span
                            className={
                              pt.zScore >= 2.0
                                ? 'text-rose-500 font-semibold'
                                : pt.zScore >= 1.5
                                ? 'text-amber-500 font-semibold'
                                : 'text-[var(--twe-text-muted)]'
                            }
                          >
                            {pt.zScore.toFixed(2)}σ
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{pt.rsi14.toFixed(1)}</td>
                        <td className="px-3 py-1.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            {pt.isPeak && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-500 text-[10px]">
                                ▲ Peak
                              </span>
                            )}
                            {pt.isTrough && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-500 text-[10px]">
                                ▼ Trough
                              </span>
                            )}
                            {pt.rsi14 <= 30 && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[10px] font-semibold">
                                {pt.rsi14 < 20 ? 'STRONG BUY' : 'BUY'}
                              </span>
                            )}
                            {pt.rsi14 >= 70 && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-600 dark:text-rose-300 text-[10px] font-semibold">
                                {pt.rsi14 > 80 ? 'STRONG SELL' : 'SELL'}
                              </span>
                            )}
                            {!pt.isPeak && !pt.isTrough && pt.rsi14 > 30 && pt.rsi14 < 70 && (
                              <span className="text-[10px] text-[var(--twe-text-muted)]">Nominal</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredLedger.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-[var(--twe-text-muted)]">
                        No days matched the selected audit filter in the 30-day window.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
