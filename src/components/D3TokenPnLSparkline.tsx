import React, { useId, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { Maximize2, Zap } from 'lucide-react';
import {
  computeTokenVolatilityMetrics,
  formatCompactUsd,
  type SigmaTier,
  type TokenTimePoint,
} from '../lib/portfolioAnalytics';

export { computeTokenVolatilityMetrics };

interface D3TokenPnLSparklineProps {
  symbol: string;
  points: TokenTimePoint[];
  height?: number;
  compact?: boolean;
  showVolatilityAlerts?: boolean;
  onExpand30Day?: () => void;
}

const TIER_FILL: Record<SigmaTier, string> = {
  low: 'rgba(16, 185, 129, 0.05)',
  moderate: 'rgba(212, 180, 117, 0.14)',
  high: 'rgba(245, 158, 11, 0.24)',
  extreme: 'rgba(244, 63, 94, 0.34)',
};

const TIER_RIBBON_HEX: Record<SigmaTier, string> = {
  low: '#10b981',
  moderate: '#D4B475',
  high: '#f59e0b',
  extreme: '#f43f5e',
};

const TIER_LABEL: Record<SigmaTier, string> = {
  low: 'Nominal',
  moderate: 'Moderate',
  high: 'High (≥1.5σ)',
  extreme: 'Extreme (≥2.0σ)',
};

export const D3TokenPnLSparkline: React.FC<D3TokenPnLSparklineProps> = ({
  symbol,
  points,
  height = 76,
  compact = false,
  showVolatilityAlerts = true,
  onExpand30Day,
}) => {
  const uid = useId().replace(/:/g, '');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const width = compact ? 168 : 300;
  const padTop = 8;
  const padBottom = 10; // includes 3px bottom thermal micro-ribbon
  const padX = 6;
  const chartHeight = Math.max(44, height);

  const volMetrics = useMemo(() => computeTokenVolatilityMetrics(points), [points]);

  const geometry = useMemo(() => {
    if (points.length === 0) {
      return null;
    }

    const pnls = points.map((p) => p.pnlUsd);
    const minVal = Math.min(...pnls, 0);
    const maxVal = Math.max(...pnls, 0);
    const span = Math.max(1, maxVal - minVal);
    const domainMin = minVal - span * 0.14;
    const domainMax = maxVal + span * 0.14;

    const xScale = d3
      .scaleLinear()
      .domain([0, Math.max(1, points.length - 1)])
      .range([padX, width - padX]);

    const yScale = d3
      .scaleLinear()
      .domain([domainMin, domainMax])
      .range([chartHeight - padBottom, padTop]);

    const zeroY = yScale(0);
    const firstPnl = points[0].pnlUsd;
    const lastPnl = points[points.length - 1].pnlUsd;
    const netPositive = lastPnl >= firstPnl && lastPnl >= 0;

    const lineGen = d3
      .line<TokenTimePoint>()
      .x((_, i) => xScale(i))
      .y((d) => yScale(d.pnlUsd))
      .curve(d3.curveMonotoneX);

    const areaGen = d3
      .area<TokenTimePoint>()
      .x((_, i) => xScale(i))
      .y0(Math.min(chartHeight - padBottom, Math.max(padTop, zeroY)))
      .y1((d) => yScale(d.pnlUsd))
      .curve(d3.curveMonotoneX);

    const colWidth = (width - padX * 2) / Math.max(1, points.length);

    return {
      xScale,
      yScale,
      zeroY,
      netPositive,
      linePath: lineGen(points) ?? '',
      areaPath: areaGen(points) ?? '',
      colWidth,
    };
  }, [points, width, chartHeight]);

  if (!geometry || points.length === 0) {
    return null;
  }

  const activeIdx = hoverIdx !== null ? hoverIdx : points.length - 1;
  const activePoint = points[activeIdx] ?? points[points.length - 1];
  const strokeColor = geometry.netPositive ? '#10b981' : '#f43f5e';

  const handlePointerMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    const approxIdx = Math.round(geometry.xScale.invert(relX));
    const clamped = Math.max(0, Math.min(points.length - 1, approxIdx));
    setHoverIdx(clamped);
  };

  return (
    <div
      className={`group relative rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)]/70 transition-colors ${
        onExpand30Day ? 'cursor-pointer hover:border-[#A8843E] dark:hover:border-[#D4B475]' : ''
      } ${compact ? 'p-1.5' : 'p-2.5'}`}
      onClick={() => onExpand30Day?.()}
      role={onExpand30Day ? 'button' : undefined}
      tabIndex={onExpand30Day ? 0 : undefined}
      onKeyDown={(e) => {
        if (onExpand30Day && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onExpand30Day();
        }
      }}
      aria-label={`${symbol} 7-day PnL D3 sparkline. Peak volatility ${volMetrics.peakSigma.toFixed(2)} sigma. Click for 30-day breakdown.`}
    >
      {/* Top Micro Telemetry Strip */}
      {!compact && (
        <div className="flex items-center justify-between gap-2 mb-1 text-[10px] font-mono">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[var(--twe-text-muted)] uppercase">7D PnL · MCap</span>
            <span className="font-semibold text-[var(--twe-text-primary)] tabular-nums truncate">
              {formatCompactUsd(activePoint.marketCapUsd)}
            </span>
            {showVolatilityAlerts && volMetrics.hasTwoSigmaSpike && (
              <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-semibold whitespace-nowrap">
                <Zap className="w-2.5 h-2.5" />
                {volMetrics.peakSigma.toFixed(1)}σ
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`tabular-nums font-semibold ${
                activePoint.pnlUsd >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {activePoint.pnlUsd >= 0 ? '+' : ''}
              {formatCompactUsd(activePoint.pnlUsd)}
            </span>
            {onExpand30Day && (
              <span className="inline-flex items-center gap-0.5 text-[var(--twe-text-muted)] group-hover:text-[#A8843E] dark:group-hover:text-[#D4B475] transition-colors">
                <Maximize2 className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">30D</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* D3 SVG Canvas */}
      <svg
        viewBox={`0 0 ${width} ${chartHeight}`}
        className="w-full overflow-visible block select-none"
        style={{ height: `${chartHeight}px` }}
        onMouseMove={handlePointerMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id={`area-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.34} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0.02} />
          </linearGradient>

          <linearGradient id={`ribbon-${uid}`} x1="0" y1="0" x2="1" y2="0">
            {points.map((pt, idx) => (
              <stop
                key={pt.dayOffset}
                offset={`${(idx / Math.max(1, points.length - 1)) * 100}%`}
                stopColor={TIER_RIBBON_HEX[pt.sigmaTier]}
              />
            ))}
          </linearGradient>
        </defs>

        {/* Layer 1: Vertical Thermal Volatility Heat Bands */}
        {points.map((pt, idx) => {
          const cx = geometry.xScale(idx);
          const bandX = Math.max(padX, cx - geometry.colWidth / 2);
          const bandW = Math.min(width - padX - bandX, geometry.colWidth);
          return (
            <rect
              key={`band-${pt.dayOffset}`}
              x={bandX}
              y={padTop}
              width={Math.max(2, bandW)}
              height={chartHeight - padBottom - padTop}
              fill={TIER_FILL[pt.sigmaTier]}
              rx={1}
            />
          );
        })}

        {/* Layer 2: Break-Even Dashed Reference Line */}
        {geometry.zeroY >= padTop && geometry.zeroY <= chartHeight - padBottom && (
          <line
            x1={padX}
            y1={geometry.zeroY}
            x2={width - padX}
            y2={geometry.zeroY}
            stroke="currentColor"
            strokeOpacity={0.22}
            strokeDasharray="3 3"
            strokeWidth={1}
          />
        )}

        {/* Layer 3: D3 Monotone Area Fill & Curve */}
        <path d={geometry.areaPath} fill={`url(#area-${uid})`} />
        <path
          d={geometry.linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={compact ? 1.6 : 2}
          strokeLinecap="round"
        />

        {/* Layer 4: 2-Sigma Extreme Shock Diamond & Radar Pulse Markers */}
        {points.map((pt, idx) => {
          if (pt.zScore < 2.0) return null;
          const cx = geometry.xScale(idx);
          const cy = geometry.yScale(pt.pnlUsd);
          return (
            <g key={`spike-${pt.dayOffset}`}>
              <circle
                cx={cx}
                cy={cy}
                r={compact ? 4.5 : 6}
                fill="none"
                stroke="#f43f5e"
                strokeOpacity={0.55}
                strokeWidth={1}
              />
              <polygon
                points={`${cx},${cy - 4} ${cx + 4},${cy} ${cx},${cy + 4} ${cx - 4},${cy}`}
                fill="#f43f5e"
                stroke="#ffffff"
                strokeWidth={0.8}
              />
            </g>
          );
        })}

        {/* Layer 5: 3px Bottom Thermal Volatility Micro-Ribbon */}
        <rect
          x={padX}
          y={chartHeight - 4}
          width={width - padX * 2}
          height={3}
          rx={1.5}
          fill={`url(#ribbon-${uid})`}
          opacity={0.9}
        />

        {/* Layer 6: Interactive Hover Crosshair Dot */}
        {hoverIdx !== null && (
          <g>
            <line
              x1={geometry.xScale(hoverIdx)}
              y1={padTop}
              x2={geometry.xScale(hoverIdx)}
              y2={chartHeight - padBottom}
              stroke="#D4B475"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            <circle
              cx={geometry.xScale(hoverIdx)}
              cy={geometry.yScale(activePoint.pnlUsd)}
              r={3.5}
              fill={strokeColor}
              stroke="#ffffff"
              strokeWidth={1.2}
            />
          </g>
        )}
      </svg>

      {/* Bottom Interactive Crosshair Readout / Expand Prompt */}
      {!compact && (
        <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-[var(--twe-text-muted)]">
          <span className="truncate">
            {hoverIdx !== null
              ? `${activePoint.shortLabel} · $${activePoint.priceUsd.toFixed(2)} · ${activePoint.zScore.toFixed(1)}σ ${TIER_LABEL[activePoint.sigmaTier]}`
              : `7D σ Peak: ${volMetrics.peakSigma.toFixed(2)}σ (${TIER_LABEL[volMetrics.highestTier]})`}
          </span>
          {onExpand30Day && (
            <span className="hidden group-hover:inline text-[#A8843E] dark:text-[#D4B475] font-semibold whitespace-nowrap ml-2">
              Expand 30D Breakdown →
            </span>
          )}
        </div>
      )}
    </div>
  );
};
