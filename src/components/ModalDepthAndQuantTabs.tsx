import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  BellRing,
  Bot,
  Calculator,
  Clock,
  Flame,
  Newspaper,
  Play,
  Plus,
  RotateCcw,
  Sliders,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wifi,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  computePearsonCorrelation,
  formatCompactUsd,
  generateSimulatedOrderBook,
  generateSocialSentimentForAsset,
  runRsiStrategyBacktest,
  type AssetAnalyticsBundle,
} from '../lib/portfolioAnalytics';

export const ModalDepthOfMarketTab: React.FC<{
  bundle: AssetAnalyticsBundle;
  onTradeSymbol: (sym: string) => void;
}> = ({ bundle, onTradeSymbol }) => {
  const uid = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const [wsActive, setWsActive] = useState(true);
  const [wsTick, setWsTick] = useState(0);
  const [zoomTransform, setZoomTransform] = useState<d3.ZoomTransform>(d3.zoomIdentity);

  // Alert Settings for Buy/Sell Volume Ratio (Item #62)
  const [ratioAlertEnabled, setRatioAlertEnabled] = useState(true);
  const [ratioThreshold, setRatioThreshold] = useState(2.0);

  // Recent Trade Execution History + TIF + Slippage Calculator (Items #3, #4, #5)
  const [timeInForce, setTimeInForce] = useState<'GTC' | 'IOC' | 'FOK'>('GTC');
  const [slippageOrderUsd, setSlippageOrderUsd] = useState('250000');
  const [slippageSide, setSlippageSide] = useState<'BUY' | 'SELL'>('BUY');

  useEffect(() => {
    if (!wsActive) return;
    const id = window.setInterval(() => {
      setWsTick((t) => t + 1);
    }, 1500);
    return () => window.clearInterval(id);
  }, [wsActive]);

  const tiers = useMemo(
    () =>
      generateSimulatedOrderBook(
        bundle.latestPoint.priceUsd,
        bundle.volatility7d.peakSigma,
        bundle.holding.symbol,
        wsTick
      ),
    [bundle.latestPoint.priceUsd, bundle.volatility7d.peakSigma, bundle.holding.symbol, wsTick]
  );

  // Attach d3-zoom to the DOM visualizer SVG (Items #1, #56)
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 6])
      .translateExtent([
        [0, 0],
        [860, 270],
      ])
      .on('zoom', (event) => {
        setZoomTransform(event.transform);
      });

    zoomBehaviorRef.current = zoom;
    const sel = d3.select(svgEl);
    sel.call(zoom);

    return () => {
      sel.on('.zoom', null);
    };
  }, []);

  const handleZoomStep = (kFactor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(220).call(zoomBehaviorRef.current.scaleBy, kFactor);
  };

  const handleZoomReset = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(240).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  };

  // Summary Stats (Item #6)
  const domStats = useMemo(() => {
    const bids = tiers.filter((t) => t.side === 'bid');
    const asks = tiers.filter((t) => t.side === 'ask');
    const totalBidVol = bids.reduce((s, t) => s + t.bidSize, 0);
    const totalAskVol = asks.reduce((s, t) => s + t.askSize, 0);
    const bestBid = bids[bids.length - 1]?.price ?? bundle.latestPoint.priceUsd * 0.998;
    const bestAsk = asks[0]?.price ?? bundle.latestPoint.priceUsd * 1.002;
    const spreadUsd = Math.max(0.01, bestAsk - bestBid);
    const spreadBps = (spreadUsd / Math.max(0.01, bundle.latestPoint.priceUsd)) * 10000;
    const ratio = totalAskVol > 0 ? totalBidVol / totalAskVol : 1;
    const maxTierVol = Math.max(1, ...tiers.map((t) => t.totalVol));
    return {
      totalBidVol,
      totalAskVol,
      ratio: Number(ratio.toFixed(2)),
      bestBid,
      bestAsk,
      spreadUsd,
      spreadBps: Number(spreadBps.toFixed(1)),
      maxTierVol,
    };
  }, [tiers, bundle.latestPoint.priceUsd]);

  const ratioBreached =
    ratioAlertEnabled && (domStats.ratio >= ratioThreshold || domStats.ratio <= 1 / ratioThreshold);

  // D3 Scales & Heatmap Colors (Items #7, #53, #58)
  const svgW = 860;
  const svgH = 270;
  const margin = { top: 18, right: 20, bottom: 32, left: 56 };
  const innerW = svgW - margin.left - margin.right;
  const innerH = svgH - margin.top - margin.bottom;

  const domGeometry = useMemo(() => {
    const minP = d3.min(tiers, (d) => d.price) ?? 0;
    const maxP = d3.max(tiers, (d) => d.price) ?? 100;
    const baseX = d3.scaleLinear().domain([minP, maxP]).range([margin.left, margin.left + innerW]);
    const rescaledX = zoomTransform.rescaleX(baseX);

    const maxCum = Math.max(
      1,
      d3.max(tiers, (d) => Math.max(d.cumBid, d.cumAsk)) ?? 100
    );
    const yScale = d3
      .scaleLinear()
      .domain([0, maxCum * 1.1])
      .range([margin.top + innerH, margin.top]);

    const heatColor = d3
      .scaleSequential(d3.interpolateYlOrRd)
      .domain([0, domStats.maxTierVol]);

    const bids = tiers.filter((t) => t.side === 'bid');
    const asks = tiers.filter((t) => t.side === 'ask');

    const bidArea = d3
      .area<(typeof tiers)[number]>()
      .x((d) => rescaledX(d.price))
      .y0(margin.top + innerH)
      .y1((d) => yScale(d.cumBid))
      .curve(d3.curveStepAfter);

    const askArea = d3
      .area<(typeof tiers)[number]>()
      .x((d) => rescaledX(d.price))
      .y0(margin.top + innerH)
      .y1((d) => yScale(d.cumAsk))
      .curve(d3.curveStepBefore);

    return {
      rescaledX,
      yScale,
      heatColor,
      bids,
      asks,
      bidPath: bidArea(bids) ?? '',
      askPath: askArea(asks) ?? '',
      xTicks: rescaledX.ticks(6),
      yTicks: yScale.ticks(4),
    };
  }, [tiers, zoomTransform, innerW, innerH, margin.left, margin.top, domStats.maxTierVol]);

  // Slippage Sensitivity Calculator (Item #4)
  const slippageCalc = useMemo(() => {
    const notional = Math.max(100, Number(slippageOrderUsd) || 1000);
    const mid = Math.max(0.01, bundle.latestPoint.priceUsd);
    const qtyRequested = notional / mid;
    const bookSide = tiers
      .filter((t) => (slippageSide === 'BUY' ? t.side === 'ask' : t.side === 'bid'))
      .sort((a, b) => (slippageSide === 'BUY' ? a.price - b.price : b.price - a.price));

    let remaining = qtyRequested;
    let filledNotional = 0;
    let filledQty = 0;
    for (const lvl of bookSide) {
      if (remaining <= 0) break;
      const avail = slippageSide === 'BUY' ? lvl.askSize : lvl.bidSize;
      const take = Math.min(remaining, avail);
      filledQty += take;
      filledNotional += take * lvl.price;
      remaining -= take;
    }

    const tifBlocked = timeInForce === 'FOK' && remaining > 0.01;
    const avgFillPrice = filledQty > 0 ? filledNotional / filledQty : mid;
    const slippagePct = Math.abs(((avgFillPrice - mid) / mid) * 100);
    const fillRatePct = qtyRequested > 0 ? (filledQty / qtyRequested) * 100 : 100;

    return {
      qtyRequested,
      filledQty,
      avgFillPrice,
      slippagePct,
      fillRatePct,
      tifBlocked,
    };
  }, [slippageOrderUsd, slippageSide, bundle.latestPoint.priceUsd, tiers, timeInForce]);

  // Simulated Recent Trade Execution History (Items #3, #5)
  const executionHistory = useMemo(() => {
    const now = Date.now();
    return tiers.slice(4, 16).map((t, idx) => {
      const ts = new Date(now - (idx * 19 + wsTick * 3) * 1000).toLocaleTimeString();
      const side = idx % 2 === 0 ? 'BUY' : 'SELL';
      const qty = Number((Math.max(5, (t.totalVol * 0.14) / (idx + 1))).toFixed(2));
      const filled =
        timeInForce === 'FOK' && qty > t.totalVol * 0.5
          ? 'KILLED (FOK)'
          : timeInForce === 'IOC' && idx % 4 === 3
          ? 'PARTIAL (IOC)'
          : `FILLED (${timeInForce})`;
      return {
        id: `${bundle.holding.symbol}-TR-${wsTick}-${idx}`,
        ts,
        side,
        qty,
        price: t.price,
        notional: qty * t.price,
        status: filled,
      };
    });
  }, [tiers, wsTick, timeInForce, bundle.holding.symbol]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* Top DOM Summary Stats & WebSocket + Zoom Controls (Items #1, #6, #8, #62) */}
      <div className="rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display font-semibold text-xs sm:text-sm text-[var(--twe-text-primary)]">
              D3 Depth of Market &amp; Liquidity Heatmap ({bundle.holding.symbol})
            </span>
            <button
              type="button"
              onClick={() => setWsActive((v) => !v)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] border cursor-pointer ${
                wsActive
                  ? 'border-emerald-500/40 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
                  : 'border-[var(--twe-border)] text-[var(--twe-text-muted)]'
              }`}
            >
              <Wifi className="w-3 h-3" />
              {wsActive ? `WS FEED LIVE (#${wsTick})` : 'WS PAUSED'}
            </button>
            <span className="font-mono text-[10px] text-[var(--twe-text-muted)]">
              Zoom: {zoomTransform.k.toFixed(1)}× (Scroll / Drag to Pan)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => handleZoomStep(1.4)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] hover:border-[#D4B475] cursor-pointer"
            >
              <ZoomIn className="w-3 h-3" /> Zoom In
            </button>
            <button
              type="button"
              onClick={() => handleZoomStep(0.72)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] hover:border-[#D4B475] cursor-pointer"
            >
              <ZoomOut className="w-3 h-3" /> Zoom Out
            </button>
            <button
              type="button"
              onClick={handleZoomReset}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] hover:border-[#D4B475] cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
        </div>

        {/* Summary Stats Row + Buy/Sell Pressure Alert Threshold Settings (Items #6, #62) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono">
          <div className="p-2.5 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)]">
            <div className="text-[10px] text-[var(--twe-text-muted)]">Buy vs Sell Ratio</div>
            <div className="mt-0.5 font-semibold tabular-nums text-[var(--twe-text-primary)]">
              {domStats.ratio.toFixed(2)} : 1{' '}
              <span className="text-[10px] text-[var(--twe-text-muted)]">
                ({Math.round(domStats.totalBidVol)} / {Math.round(domStats.totalAskVol)})
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)]">
            <div className="text-[10px] text-[var(--twe-text-muted)]">Live Spread Impact</div>
            <div className="mt-0.5 font-semibold tabular-nums text-[#A8843E] dark:text-[#D4B475]">
              ${domStats.spreadUsd.toFixed(2)} ({domStats.spreadBps} bps)
            </div>
          </div>

          <div className="p-2.5 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)]">
            <div className="text-[10px] text-[var(--twe-text-muted)]">Best Bid / Ask</div>
            <div className="mt-0.5 font-semibold tabular-nums">
              <span className="text-emerald-500">${domStats.bestBid.toFixed(2)}</span> /{' '}
              <span className="text-rose-500">${domStats.bestAsk.toFixed(2)}</span>
            </div>
          </div>

          <div className="p-2.5 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] text-[var(--twe-text-muted)]">Ratio Alert Settings</div>
              <label className="inline-flex items-center gap-1 mt-0.5">
                <input
                  type="checkbox"
                  checked={ratioAlertEnabled}
                  onChange={(e) => setRatioAlertEnabled(e.target.checked)}
                />
                <span>≥</span>
                <input
                  type="number"
                  step="0.2"
                  min="1.1"
                  max="5"
                  value={ratioThreshold}
                  onChange={(e) => setRatioThreshold(Math.max(1.1, Number(e.target.value) || 2))}
                  className="w-12 px-1 py-0.2 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] tabular-nums"
                />
                <span>:1</span>
              </label>
            </div>
          </div>
        </div>

        {ratioBreached && (
          <div className="px-3 py-2 rounded border border-amber-500/50 bg-amber-500/12 flex items-center justify-between text-xs font-mono text-amber-700 dark:text-amber-300">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              ORDER BOOK PRESSURE ALERT: Buy/Sell ratio ({domStats.ratio}:1) crossed threshold {ratioThreshold}:1!
            </span>
            <button
              type="button"
              onClick={() => onTradeSymbol(bundle.holding.symbol)}
              className="px-2 py-0.5 rounded bg-amber-500 text-black font-semibold text-[10px] cursor-pointer"
            >
              Trade Desk
            </button>
          </div>
        )}

        {/* D3 Depth of Market + Liquidity Heatmap Overlay SVG (Items #1, #7, #53, #56, #58) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-8 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] p-2.5">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="w-full h-64 overflow-hidden cursor-grab active:cursor-grabbing select-none"
            >
              <defs>
                <clipPath id={`dom-clip-${uid}`}>
                  <rect x={margin.left} y={margin.top} width={innerW} height={innerH} />
                </clipPath>
              </defs>

              <g clipPath={`url(#dom-clip-${uid})`}>
                {/* Liquidity Heatmap Vertical Density Columns (Item #7) */}
                {tiers.map((t, idx) => {
                  const xPos = domGeometry.rescaledX(t.price);
                  const colW = Math.max(8, innerW / tiers.length);
                  return (
                    <rect
                      key={`liq-${idx}`}
                      x={xPos - colW / 2}
                      y={margin.top}
                      width={colW}
                      height={innerH}
                      fill={domGeometry.heatColor(t.totalVol)}
                      opacity={0.18}
                    />
                  );
                })}

                {/* Cumulative Bid & Ask Curves */}
                <path d={domGeometry.bidPath} fill="rgba(16, 185, 129, 0.28)" stroke="#10b981" strokeWidth={2} />
                <path d={domGeometry.askPath} fill="rgba(244, 63, 94, 0.28)" stroke="#f43f5e" strokeWidth={2} />

                {/* Mid-Price Reference */}
                <line
                  x1={domGeometry.rescaledX(bundle.latestPoint.priceUsd)}
                  y1={margin.top}
                  x2={domGeometry.rescaledX(bundle.latestPoint.priceUsd)}
                  y2={margin.top + innerH}
                  stroke="#D4B475"
                  strokeDasharray="4 4"
                  strokeWidth={1.3}
                />
              </g>

              {/* Axes */}
              {domGeometry.yTicks.map((tk) => (
                <g key={tk}>
                  <line
                    x1={margin.left}
                    y1={domGeometry.yScale(tk)}
                    x2={svgW - margin.right}
                    y2={domGeometry.yScale(tk)}
                    stroke="currentColor"
                    strokeOpacity={0.09}
                  />
                  <text
                    x={margin.left - 6}
                    y={domGeometry.yScale(tk) + 3}
                    textAnchor="end"
                    fontSize="9"
                    fontFamily="var(--font-mono)"
                    fill="currentColor"
                    opacity={0.6}
                  >
                    {Math.round(tk)}
                  </text>
                </g>
              ))}
              {domGeometry.xTicks.map((pt) => (
                <text
                  key={pt}
                  x={domGeometry.rescaledX(pt)}
                  y={svgH - 8}
                  textAnchor="middle"
                  fontSize="9"
                  fontFamily="var(--font-mono)"
                  fill="currentColor"
                  opacity={0.68}
                >
                  ${pt.toFixed(2)}
                </text>
              ))}
            </svg>
          </div>

          {/* Horizontal Bar Chart Histogram of Pending Order Sizes (Item #2) */}
          <div className="lg:col-span-4 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] p-3 flex flex-col">
            <div className="text-[11px] font-mono font-semibold text-[var(--twe-text-primary)] mb-2 flex items-center justify-between">
              <span>Order Size Distribution Histogram</span>
              <span className="text-[10px] text-[var(--twe-text-muted)]">Volatility-Scaled</span>
            </div>
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1 font-mono text-[10px]">
              {tiers
                .slice()
                .reverse()
                .map((t, idx) => {
                  const pct = Math.min(100, (t.totalVol / domStats.maxTierVol) * 100);
                  return (
                    <div key={`hist-${idx}`} className="flex items-center gap-2">
                      <span className="w-16 text-right tabular-nums text-[var(--twe-text-muted)]">
                        ${t.price.toFixed(2)}
                      </span>
                      <div className="flex-1 h-2.5 rounded-sm bg-[var(--twe-bg-elevated)] overflow-hidden">
                        <div
                          className={`h-full rounded-sm transition-all ${
                            t.side === 'bid' ? 'bg-emerald-500/80' : 'bg-rose-500/80'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-12 text-right tabular-nums text-[var(--twe-text-primary)]">
                        {Math.round(t.totalVol)}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Trade Execution History + Time-in-Force + Slippage Sensitivity Calculator (Items #3, #4, #5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-xs font-semibold text-[var(--twe-text-primary)]">
              Recent Trade Execution History
            </span>
            <label className="inline-flex items-center gap-1.5 text-[11px] font-mono">
              <span className="text-[var(--twe-text-muted)]">Time-in-Force:</span>
              <select
                value={timeInForce}
                onChange={(e) => setTimeInForce(e.target.value as 'GTC' | 'IOC' | 'FOK')}
                className="px-2 py-0.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-primary)] cursor-pointer"
              >
                <option value="GTC">Good-Till-Cancelled (GTC)</option>
                <option value="IOC">Immediate-or-Cancel (IOC)</option>
                <option value="FOK">Fill-or-Kill (FOK)</option>
              </select>
            </label>
          </div>
          <div className="overflow-x-auto max-h-56 overflow-y-auto">
            <table className="w-full text-left border-collapse text-[11px] font-mono">
              <thead className="sticky top-0 bg-[var(--twe-bg-elevated)] border-b border-[var(--twe-border)] text-[var(--twe-text-muted)]">
                <tr>
                  <th className="px-3 py-1.5">Timestamp</th>
                  <th className="px-3 py-1.5">Side</th>
                  <th className="px-3 py-1.5 text-right">Amount</th>
                  <th className="px-3 py-1.5 text-right">Fill Price</th>
                  <th className="px-3 py-1.5 text-right">TIF Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--twe-border)]">
                {executionHistory.map((ex) => (
                  <tr key={ex.id} className="h-8 hover:bg-[var(--twe-bg-elevated)]">
                    <td className="px-3 py-1 text-[var(--twe-text-muted)]">{ex.ts}</td>
                    <td
                      className={`px-3 py-1 font-semibold ${
                        ex.side === 'BUY' ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {ex.side}
                    </td>
                    <td className="px-3 py-1 text-right tabular-nums">{ex.qty}</td>
                    <td className="px-3 py-1 text-right tabular-nums">${ex.price.toFixed(2)}</td>
                    <td className="px-3 py-1 text-right text-[10px] text-[#A8843E] dark:text-[#D4B475]">
                      {ex.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Slippage Sensitivity Calculator (Item #4) */}
        <div className="lg:col-span-5 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-3.5 space-y-3">
          <div className="flex items-center gap-1.5 font-display font-semibold text-xs text-[var(--twe-text-primary)]">
            <Calculator className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
            <span>Slippage Sensitivity Calculator ({timeInForce})</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <label>
              <span className="text-[10px] text-[var(--twe-text-muted)]">Order Notional (USD)</span>
              <input
                type="number"
                value={slippageOrderUsd}
                onChange={(e) => setSlippageOrderUsd(e.target.value)}
                className="mt-1 w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] tabular-nums"
              />
            </label>
            <div>
              <span className="text-[10px] text-[var(--twe-text-muted)]">Side</span>
              <div className="mt-1 grid grid-cols-2 gap-1">
                {(['BUY', 'SELL'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSlippageSide(s)}
                    className={`py-1.5 rounded border font-semibold cursor-pointer ${
                      slippageSide === s
                        ? s === 'BUY'
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                          : 'border-rose-500 bg-rose-500/20 text-rose-600 dark:text-rose-300'
                        : 'border-[var(--twe-border)] bg-[var(--twe-bg-surface)]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] text-[11px] font-mono tabular-nums">
            <div>
              <div className="text-[10px] text-[var(--twe-text-muted)]">Est. Avg Fill Price</div>
              <div className="font-semibold text-[var(--twe-text-primary)]">
                ${slippageCalc.avgFillPrice.toFixed(3)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--twe-text-muted)]">Slippage Impact</div>
              <div
                className={`font-semibold ${
                  slippageCalc.slippagePct > 0.8 ? 'text-rose-500' : 'text-emerald-500'
                }`}
              >
                {slippageCalc.slippagePct.toFixed(3)}%
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--twe-text-muted)]">Simulated Fill Rate</div>
              <div className="font-semibold">
                {slippageCalc.tifBlocked ? '0.0% (FOK Cancelled)' : `${slippageCalc.fillRatePct.toFixed(1)}%`}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--twe-text-muted)]">Filled Units</div>
              <div className="font-semibold text-[#A8843E] dark:text-[#D4B475]">
                {slippageCalc.filledQty.toFixed(2)} {bundle.holding.symbol}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const ModalSentimentAndBenchmarkTab: React.FC<{ bundle: AssetAnalyticsBundle }> = ({
  bundle,
}) => {
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'bullish' | 'bearish'>('all');
  const [pulseTick, setPulseTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setPulseTick((t) => t + 1), 6000);
    return () => window.clearInterval(id);
  }, []);

  const sentimentData = useMemo(
    () =>
      generateSocialSentimentForAsset(
        bundle.holding.symbol,
        bundle.holding.name,
        bundle.latestPoint.rsi14,
        pulseTick
      ),
    [bundle.holding.symbol, bundle.holding.name, bundle.latestPoint.rsi14, pulseTick]
  );

  const visiblePosts = sentimentData.posts.filter((p) =>
    sentimentFilter === 'all' ? true : p.sentiment === sentimentFilter
  );

  // D3 Token-to-Market Correlation Heatmap (Item #11)
  const benchmarkMatrix = useMemo(() => {
    const tokenReturns = bundle.points31d.slice(1).map((p) => p.dailyReturnPct);
    const benchmarks = [
      {
        name: 'BTC Index',
        series: tokenReturns.map((_, i) => Math.sin(0.37 * (i + 1) + 0.6) * 1.4 + Math.cos(0.2 * i) * 0.5),
      },
      {
        name: 'ETH Index',
        series: tokenReturns.map((_, i) => Math.sin(0.39 * (i + 1) + 0.4) * 1.6 + Math.sin(0.5 * i) * 0.4),
      },
      {
        name: 'SOL Ecosystem',
        series: tokenReturns.map((_, i) => Math.sin(0.45 * (i + 1)) * 2.1 + Math.cos(0.3 * i) * 0.6),
      },
      {
        name: 'Gold / RWA Index',
        series: tokenReturns.map((_, i) => Math.sin(0.41 * (i + 1) + 1.2) * 1.1),
      },
    ];
    const windows = [
      { label: '7D Window', slice: 7 },
      { label: '14D Window', slice: 14 },
      { label: '21D Window', slice: 21 },
      { label: '30D Full', slice: 30 },
    ];
    const colorScale = d3.scaleSequential(d3.interpolateRdYlGn).domain([-1, 1]);

    return {
      windows,
      rows: benchmarks.map((bm) => ({
        name: bm.name,
        cells: windows.map((w) => {
          const r = computePearsonCorrelation(
            tokenReturns.slice(-w.slice),
            bm.series.slice(-w.slice)
          );
          return { window: w.label, r, bg: colorScale(r) };
        }),
      })),
    };
  }, [bundle.points31d]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-4"
    >
      {/* Social Sentiment Feed + Filter (Items #9, #10) */}
      <div className="lg:col-span-6 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
            <div>
              <h3 className="font-display font-semibold text-xs sm:text-sm">
                Social Sentiment Feed ({bundle.holding.symbol})
              </h3>
              <div className="text-[10px] font-mono text-[var(--twe-text-muted)]">
                Live Crowd Score:{' '}
                <strong
                  className={
                    sentimentData.score >= 55 ? 'text-emerald-500' : 'text-rose-500'
                  }
                >
                  {sentimentData.score}/100
                </strong>
              </div>
            </div>
          </div>

          <select
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value as 'all' | 'bullish' | 'bearish')}
            aria-label="Filter sentiment posts"
            className="px-2.5 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-xs font-mono cursor-pointer"
          >
            <option value="all">All Posts ({sentimentData.posts.length})</option>
            <option value="bullish">Bullish Only</option>
            <option value="bearish">Bearish Only</option>
          </select>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {visiblePosts.map((post) => (
            <div
              key={post.id}
              className="p-2.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] space-y-1 text-xs"
            >
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="font-semibold text-[#A8843E] dark:text-[#D4B475]">
                  {post.handle} · {post.source}
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className={`px-1.5 py-0.2 rounded font-semibold uppercase ${
                      post.sentiment === 'bullish'
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : 'bg-rose-500/15 text-rose-500'
                    }`}
                  >
                    {post.sentiment}
                  </span>
                  <span className="text-[var(--twe-text-muted)]">{post.timestamp}</span>
                </span>
              </div>
              <p className="text-[var(--twe-text-primary)] leading-snug">{post.headline}</p>
            </div>
          ))}
        </div>
      </div>

      {/* D3 Token-to-Market Correlation Heatmap vs BTC/ETH Indices (Item #11) */}
      <div className="lg:col-span-6 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-4 space-y-3">
        <div>
          <h3 className="font-display font-semibold text-xs sm:text-sm flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
            <span>Token-to-Market Benchmark Correlation Heatmap (D3)</span>
          </h3>
          <p className="text-[11px] font-mono text-[var(--twe-text-muted)] mt-0.5">
            Rolling Pearson beta comparing {bundle.holding.symbol} market cap trajectory vs global crypto/RWA indices
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse font-mono text-xs tabular-nums">
            <thead>
              <tr className="text-[10px] text-[var(--twe-text-muted)] uppercase">
                <th className="px-2.5 py-2 text-left">Benchmark Index</th>
                {benchmarkMatrix.windows.map((w) => (
                  <th key={w.label} className="px-2 py-2">
                    {w.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--twe-border)]">
              {benchmarkMatrix.rows.map((row) => (
                <tr key={row.name}>
                  <td className="px-2.5 py-2.5 text-left font-semibold text-[var(--twe-text-primary)]">
                    {row.name}
                  </td>
                  {row.cells.map((c) => (
                    <td
                      key={`${row.name}-${c.window}`}
                      style={{ backgroundColor: c.bg }}
                      className="px-2 py-2.5 border border-[var(--twe-border)] font-bold text-[#0B0D10]"
                    >
                      {c.r >= 0 ? '+' : ''}
                      {c.r.toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export const ModalRsiBacktesterAndAlertsTab: React.FC<{ bundle: AssetAnalyticsBundle }> = ({
  bundle,
}) => {
  const sym = bundle.holding.symbol;
  const [buyRsi, setBuyRsi] = useState(32);
  const [sellRsi, setSellRsi] = useState(68);
  const [botEnabled, setBotEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`twe-autobot-${sym}`) === 'true';
    } catch {
      return false;
    }
  });
  const [rsiAlertLevel, setRsiAlertLevel] = useState(25);
  const [alertSavedMsg, setAlertSavedMsg] = useState<string | null>(null);

  // Custom Multi-Condition Strategy Alert Builder (Item #72)
  const [condRsiOp, setCondRsiOp] = useState<'<' | '>'>('<');
  const [condRsiVal, setCondRsiVal] = useState(25);
  const [condMinMcapM, setCondMinMcapM] = useState(1);
  const [condRequireVolSpike, setCondRequireVolSpike] = useState(true);
  const [condChannel, setCondChannel] = useState<'Push' | 'Email'>('Push');
  const [savedStrategies, setSavedStrategies] = useState<
    Array<{ id: string; rule: string; channel: 'Push' | 'Email'; active: boolean }>
  >(() => [
    {
      id: 'default-strat',
      rule: `RSI ${'<'} 25 AND MCap > $1M AND Volatility Spike ≥ 1.5σ`,
      channel: 'Push',
      active: true,
    },
  ]);

  const backtest = useMemo(
    () => runRsiStrategyBacktest(bundle.points31d, buyRsi, sellRsi, 100_000),
    [bundle.points31d, buyRsi, sellRsi]
  );

  const signalLog = useMemo(
    () =>
      bundle.points31d
        .filter((p) => p.rsi14 <= 35 || p.rsi14 >= 65)
        .slice()
        .reverse(),
    [bundle.points31d]
  );

  const handleSaveAutoBot = () => {
    const next = !botEnabled;
    setBotEnabled(next);
    try {
      localStorage.setItem(`twe-autobot-${sym}`, String(next));
      localStorage.setItem(
        `twe-autobot-cfg-${sym}`,
        JSON.stringify({ buyRsi, sellRsi, updatedAt: new Date().toISOString() })
      );
    } catch {
      // ignore storage quota
    }
  };

  const handleSetRsiAlert = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
    setAlertSavedMsg(
      `RSI trigger armed for ${sym} when 14D RSI crosses ${rsiAlertLevel} (Current: ${bundle.latestPoint.rsi14.toFixed(1)}).`
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* Top Grid: RSI Strategy Backtester (Items #37, #43, #46, #48) & RSI Alert Picker (Item #40) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-display font-semibold text-xs sm:text-sm">
              <Play className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
              <span>RSI Strategy Backtester ($100K Simulated Capital)</span>
            </div>
            <button
              type="button"
              onClick={handleSaveAutoBot}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-mono font-semibold cursor-pointer ${
                botEnabled
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'border-[#A8843E]/45 dark:border-[#D4B475]/45 bg-[var(--twe-bg-surface)] text-[#A8843E] dark:text-[#D4B475]'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              {botEnabled ? 'Auto-Trade Bot: ARMED' : 'Save as Auto-Trade Bot Config'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <label>
              <span className="text-[10px] text-[var(--twe-text-muted)]">Buy Threshold (≤)</span>
              <input
                type="number"
                min={10}
                max={49}
                value={buyRsi}
                onChange={(e) => setBuyRsi(Number(e.target.value) || 30)}
                className="mt-1 w-full px-2 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] tabular-nums"
              />
            </label>
            <label>
              <span className="text-[10px] text-[var(--twe-text-muted)]">Sell Threshold (≥)</span>
              <input
                type="number"
                min={51}
                max={90}
                value={sellRsi}
                onChange={(e) => setSellRsi(Number(e.target.value) || 70)}
                className="mt-1 w-full px-2 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] tabular-nums"
              />
            </label>
            <div className="p-2 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)]">
              <div className="text-[10px] text-[var(--twe-text-muted)]">Total Strategy ROI</div>
              <div
                className={`font-semibold tabular-nums ${
                  backtest.totalRoiPct >= 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {backtest.totalRoiPct >= 0 ? '+' : ''}
                {backtest.totalRoiPct.toFixed(2)}%
              </div>
            </div>
            <div className="p-2 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)]">
              <div className="text-[10px] text-[var(--twe-text-muted)]">Trades · Win Rate</div>
              <div className="font-semibold tabular-nums">
                {backtest.totalTrades} · {backtest.winRatePct}%
              </div>
            </div>
          </div>

          <div className="max-h-32 overflow-y-auto rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)]">
            <table className="w-full text-left text-[11px] font-mono">
              <thead className="border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-muted)]">
                <tr>
                  <th className="px-2.5 py-1">Date</th>
                  <th className="px-2.5 py-1">Action</th>
                  <th className="px-2.5 py-1 text-right">RSI</th>
                  <th className="px-2.5 py-1 text-right">Fill Price</th>
                  <th className="px-2.5 py-1 text-right">Closed PnL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--twe-border)]">
                {backtest.trades.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-3 text-center text-[var(--twe-text-muted)]">
                      Adjust Buy/Sell RSI thresholds to capture crossovers within the 30-day window.
                    </td>
                  </tr>
                ) : (
                  backtest.trades.map((tr, i) => (
                    <tr key={`${tr.date}-${i}`}>
                      <td className="px-2.5 py-1">{tr.date}</td>
                      <td
                        className={`px-2.5 py-1 font-semibold ${
                          tr.side === 'BUY' ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {tr.side}
                      </td>
                      <td className="px-2.5 py-1 text-right tabular-nums">{tr.rsi.toFixed(1)}</td>
                      <td className="px-2.5 py-1 text-right tabular-nums">${tr.price.toFixed(2)}</td>
                      <td className="px-2.5 py-1 text-right tabular-nums">
                        {tr.side === 'SELL' ? `${tr.pnlPct >= 0 ? '+' : ''}${tr.pnlPct}%` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Set RSI Alert & Custom Multi-Condition Strategy Alert Builder (Items #40, #72) */}
        <div className="lg:col-span-5 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-4 space-y-3">
          <div className="flex items-center gap-1.5 font-display font-semibold text-xs sm:text-sm">
            <BellRing className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
            <span>Set RSI Alert &amp; Custom Strategy Builder</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-[var(--twe-text-muted)]">Target RSI:</span>
            <input
              type="number"
              min={5}
              max={95}
              value={rsiAlertLevel}
              onChange={(e) => setRsiAlertLevel(Number(e.target.value) || 25)}
              className="w-16 px-2 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] tabular-nums"
            />
            <button
              type="button"
              onClick={handleSetRsiAlert}
              className="px-2.5 py-1 rounded bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-semibold cursor-pointer"
            >
              Set RSI Alert
            </button>
          </div>

          {alertSavedMsg && (
            <div className="px-2.5 py-1.5 rounded bg-emerald-500/12 border border-emerald-500/35 text-[10px] font-mono text-emerald-600 dark:text-emerald-300">
              {alertSavedMsg}
            </div>
          )}

          {/* Custom Multi-Condition Builder */}
          <div className="pt-2 border-t border-[var(--twe-border)] space-y-2 text-[11px] font-mono">
            <div className="text-[10px] uppercase text-[var(--twe-text-muted)] flex items-center gap-1">
              <Sliders className="w-3 h-3" /> Multi-Condition Strategy Trigger
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span>RSI</span>
              <select
                value={condRsiOp}
                onChange={(e) => setCondRsiOp(e.target.value as '<' | '>')}
                className="px-1.5 py-0.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)]"
              >
                <option value="<">&lt;</option>
                <option value=">">&gt;</option>
              </select>
              <input
                type="number"
                value={condRsiVal}
                onChange={(e) => setCondRsiVal(Number(e.target.value) || 25)}
                className="w-12 px-1.5 py-0.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)]"
              />
              <span>&amp; MCap &gt; $</span>
              <input
                type="number"
                value={condMinMcapM}
                onChange={(e) => setCondMinMcapM(Number(e.target.value) || 1)}
                className="w-12 px-1.5 py-0.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)]"
              />
              <span>M</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={condRequireVolSpike}
                  onChange={(e) => setCondRequireVolSpike(e.target.checked)}
                />
                <span>Vol Spike (≥1.5σ)</span>
              </label>
              <select
                value={condChannel}
                onChange={(e) => setCondChannel(e.target.value as 'Push' | 'Email')}
                className="px-1.5 py-0.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)]"
              >
                <option value="Push">Push Notification</option>
                <option value="Email">Email Digest</option>
              </select>
              <button
                type="button"
                onClick={() =>
                  setSavedStrategies((prev) => [
                    {
                      id: `st-${Date.now()}`,
                      rule: `RSI ${condRsiOp} ${condRsiVal} AND MCap > $${condMinMcapM}M${
                        condRequireVolSpike ? ' AND Vol Spike ≥1.5σ' : ''
                      }`,
                      channel: condChannel,
                      active: true,
                    },
                    ...prev,
                  ])
                }
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[#D4B475] text-[#A8843E] dark:text-[#D4B475] font-semibold cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Rule
              </button>
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {savedStrategies.map((st) => (
                <div
                  key={st.id}
                  className="px-2 py-1 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] flex items-center justify-between gap-2 text-[10px]"
                >
                  <span className="truncate">{st.rule}</span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[#A8843E] dark:text-[#D4B475]">{st.channel}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSavedStrategies((prev) => prev.filter((x) => x.id !== st.id))
                      }
                      aria-label="Remove alert rule"
                      className="text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Historical RSI Signal Log (Items #52, #69) */}
      <div className="rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] overflow-hidden">
        <div className="px-3.5 py-2.5 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex items-center justify-between text-xs font-mono font-semibold">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
            <span>Chronological Historical RSI Signal Log ({signalLog.length} events)</span>
          </span>
          <span className="text-[10px] text-[var(--twe-text-muted)]">Threshold Crossing Ledger</span>
        </div>
        <div className="max-h-48 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead className="sticky top-0 bg-[var(--twe-bg-elevated)] border-b border-[var(--twe-border)] text-[10px] text-[var(--twe-text-muted)] uppercase">
              <tr>
                <th className="px-3 py-1.5">Date</th>
                <th className="px-3 py-1.5">Signal Zone</th>
                <th className="px-3 py-1.5 text-right">RSI (14)</th>
                <th className="px-3 py-1.5 text-right">Price Point</th>
                <th className="px-3 py-1.5 text-right">Mock MCap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--twe-border)]">
              {signalLog.map((p) => {
                const isBuy = p.rsi14 <= 35;
                return (
                  <tr key={p.isoDate} className="h-8 hover:bg-[var(--twe-bg-elevated)]">
                    <td className="px-3 py-1">{p.isoDate}</td>
                    <td className="px-3 py-1">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                          isBuy ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'
                        }`}
                      >
                        {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {p.rsi14 < 20
                          ? 'STRONG BUY'
                          : p.rsi14 <= 30
                          ? 'BUY SIGNAL'
                          : p.rsi14 > 80
                          ? 'STRONG SELL'
                          : p.rsi14 >= 70
                          ? 'SELL SIGNAL'
                          : isBuy
                          ? 'ACCUMULATE'
                          : 'DISTRIBUTE'}
                      </span>
                    </td>
                    <td className="px-3 py-1 text-right tabular-nums font-semibold">{p.rsi14.toFixed(1)}</td>
                    <td className="px-3 py-1 text-right tabular-nums">${p.priceUsd.toFixed(2)}</td>
                    <td className="px-3 py-1 text-right tabular-nums text-[var(--twe-text-muted)]">
                      {formatCompactUsd(p.marketCapUsd)}
                    </td>
                  </tr>
                );
              })}
              {signalLog.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-[var(--twe-text-muted)]">
                    No extreme RSI threshold crossings recorded in the 30-day window.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
