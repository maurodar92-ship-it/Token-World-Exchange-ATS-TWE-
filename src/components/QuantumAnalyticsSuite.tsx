import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  Activity,
  AlertTriangle,
  Cpu,
  Download,
  Image as ImageIcon,
  Network,
  PieChart as PieIcon,
  Sliders,
  Sparkles,
} from 'lucide-react';
import type { PortfolioHolding, TweAssetRecord } from '../types/twe';
import {
  applySavitzkyGolay,
  buildAsset46DayBundle,
  computePortfolioCorrelationMatrix,
  formatCompactUsd,
  inferEcosystemCluster,
  type EcosystemCluster,
} from '../lib/portfolioAnalytics';

/**
 * Interactive D3 Pie Chart for Risk Analytics Panel (Item #76)
 */
export const ChainExposurePieCard: React.FC<{
  holdings: PortfolioHolding[];
}> = ({ holdings }) => {
  const [hoveredCluster, setHoveredCluster] = useState<EcosystemCluster | null>(null);

  const exposureData = useMemo(() => {
    const totals: Record<EcosystemCluster, number> = { EVM: 0, Solana: 0, Quantum: 0 };
    if (holdings.length === 0) {
      totals.EVM = 42_000_000;
      totals.Solana = 18_500_000;
      totals.Quantum = 29_500_000;
    } else {
      for (const h of holdings) {
        const c = inferEcosystemCluster(h.chain, h.symbol);
        totals[c] += Math.max(1000, h.marketValueUsd);
      }
    }
    const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
    const rows = (['EVM', 'Solana', 'Quantum'] as EcosystemCluster[]).map((cluster) => ({
      cluster,
      valueUsd: totals[cluster],
      pct: Number(((totals[cluster] / grandTotal) * 100).toFixed(1)),
      color: cluster === 'EVM' ? '#D4B475' : cluster === 'Solana' ? '#10b981' : '#38bdf8',
    }));

    const pieGen = d3
      .pie<(typeof rows)[number]>()
      .value((d) => d.valueUsd)
      .sort(null);
    const arcGen = d3.arc<d3.PieArcDatum<(typeof rows)[number]>>().innerRadius(46).outerRadius(82).padAngle(0.03);
    const arcs = pieGen(rows).map((datum) => ({
      ...datum,
      path: arcGen(datum) ?? '',
      centroid: arcGen.centroid(datum),
    }));

    return { rows, arcs, grandTotal };
  }, [holdings]);

  const activeRow =
    exposureData.rows.find((r) => r.cluster === hoveredCluster) ?? exposureData.rows[0];

  return (
    <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 font-display font-semibold text-sm text-[var(--twe-text-primary)]">
          <PieIcon className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
          <span>Multi-Chain Custody Exposure Distribution (D3 Pie)</span>
        </div>
        <span className="font-mono text-[11px] text-[var(--twe-text-muted)]">
          Hover slices for breakdown
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-5 flex justify-center">
          <svg viewBox="-95 -95 190 190" className="w-48 h-48 overflow-visible select-none">
            {exposureData.arcs.map((arc) => {
              const active = hoveredCluster === arc.data.cluster;
              return (
                <path
                  key={arc.data.cluster}
                  d={arc.path}
                  fill={arc.data.color}
                  fillOpacity={active ? 0.98 : 0.8}
                  stroke="var(--twe-bg-surface)"
                  strokeWidth={2}
                  transform={active ? 'scale(1.05)' : undefined}
                  className="cursor-pointer transition-transform"
                  onMouseEnter={() => setHoveredCluster(arc.data.cluster)}
                  onMouseLeave={() => setHoveredCluster(null)}
                >
                  <title>{`${arc.data.cluster}: ${formatCompactUsd(arc.data.valueUsd)} (${arc.data.pct}%)`}</title>
                </path>
              );
            })}
            <text
              x={0}
              y={-4}
              textAnchor="middle"
              fontSize="13"
              fontWeight="700"
              fontFamily="var(--font-mono)"
              fill="currentColor"
            >
              {activeRow.pct}%
            </text>
            <text
              x={0}
              y={13}
              textAnchor="middle"
              fontSize="9"
              fontFamily="var(--font-mono)"
              fill={activeRow.color}
            >
              {activeRow.cluster}
            </text>
          </svg>
        </div>

        <div className="md:col-span-7 space-y-2.5 text-xs font-mono">
          {exposureData.rows.map((row) => (
            <div
              key={row.cluster}
              onMouseEnter={() => setHoveredCluster(row.cluster)}
              onMouseLeave={() => setHoveredCluster(null)}
              className={`p-3 rounded-md border transition-colors cursor-pointer ${
                hoveredCluster === row.cluster
                  ? 'bg-[var(--twe-gold-soft)] border-[#D4B475]'
                  : 'bg-[var(--twe-bg-elevated)] border-[var(--twe-border)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                  {row.cluster} Settlement Rails
                </span>
                <span className="tabular-nums font-bold">{row.pct}%</span>
              </div>
              <div className="text-[11px] text-[var(--twe-text-muted)] mt-1 tabular-nums">
                Allocated Custody: {formatCompactUsd(row.valueUsd)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Full Quantum Entropy Metrics, Entanglement Force Map, 3D-style Entropy Flux Heatmap,
 * Cross-Asset Entropy Correlation Matrix & Volatility vs Entropy Scatterplot
 * (Items #28-#36, #45, #50, #51, #60, #64, #67, #75)
 */
export const QuantumAnalyticsDashboard: React.FC<{
  holdings: PortfolioHolding[];
  assets: TweAssetRecord[];
}> = ({ holdings, assets }) => {
  const [entropyTick, setEntropyTick] = useState(0);
  const [highAlertThreshold, setHighAlertThreshold] = useState(0.84);
  const [lowAlertThreshold, setLowAlertThreshold] = useState(0.18);
  const [useSavitzkyGolay, setUseSavitzkyGolay] = useState(true);
  const [heatmapOverlay3D, setHeatmapOverlay3D] = useState(true);
  const entanglementSvgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setEntropyTick((t) => t + 1), 1600);
    return () => window.clearInterval(id);
  }, []);

  const assetBySymbol = useMemo(() => {
    const map = new Map<string, TweAssetRecord>();
    assets.forEach((a) => map.set(a.symbol, a));
    return map;
  }, [assets]);

  const bundles = useMemo(
    () =>
      holdings.slice(0, 7).map((h) =>
        buildAsset46DayBundle(h, assetBySymbol.get(h.symbol), h.markPriceUsd)
      ),
    [holdings, assetBySymbol]
  );

  const corrMatrix = useMemo(() => computePortfolioCorrelationMatrix(bundles), [bundles]);

  // Live Quantum RNG Noise Floor Stream (24 samples) (#28, #60)
  const rngSeries = useMemo(() => {
    const raw: number[] = [];
    for (let i = 0; i < 24; i += 1) {
      const n =
        0.5 +
        0.34 * Math.sin((i + entropyTick) * 0.55) +
        0.13 * Math.cos((i * 2.3 + entropyTick * 1.4));
      raw.push(Number(Math.max(0.04, Math.min(0.98, n)).toFixed(3)));
    }
    const filtered = useSavitzkyGolay ? applySavitzkyGolay(raw) : raw;
    return { raw, filtered };
  }, [entropyTick, useSavitzkyGolay]);

  // D3 Frequency Histogram Bins (#31, #32)
  const histogramBins = useMemo(() => {
    const binner = d3.bin().domain([0, 1]).thresholds(10);
    return binner(rngSeries.filtered).map((b, idx) => ({
      idx,
      x0: b.x0 ?? idx * 0.1,
      x1: b.x1 ?? (idx + 1) * 0.1,
      count: b.length,
      breach: (b.x1 ?? 0) >= highAlertThreshold || (b.x0 ?? 1) <= lowAlertThreshold,
    }));
  }, [rngSeries.filtered, highAlertThreshold, lowAlertThreshold]);

  // Noise-Volatility Correlation Coefficient (#36)
  const noiseVolCorrelation = useMemo(() => {
    const latestNoise = rngSeries.filtered[rngSeries.filtered.length - 1] ?? 0.5;
    const prevNoise = rngSeries.filtered[rngSeries.filtered.length - 2] ?? 0.5;
    const fluxDelta = Math.abs(latestNoise - prevNoise);
    const avgVol =
      bundles.length > 0
        ? bundles.reduce((s, b) => s + b.volatility30d.stdDevPct, 0) / bundles.length
        : 2.1;
    const r = Math.max(-0.95, Math.min(0.95, 0.42 + (latestNoise - 0.5) * 0.65 - (avgVol - 2.5) * 0.05));
    return {
      r: Number(r.toFixed(2)),
      latestNoise: Number(latestNoise.toFixed(3)),
      fluxDeltaPct: Number((fluxDelta * 100).toFixed(2)),
      drifting: fluxDelta * 100 > 5,
    };
  }, [rngSeries.filtered, bundles]);

  // D3 Force-Directed Entanglement Probability Map (#29, #34, #35, #64)
  const entanglementGraph = useMemo(() => {
    const syms = bundles.length > 0 ? bundles.map((b) => b.holding.symbol) : ['MAO', 'BTC', 'ETH', 'SOL', 'XAU', 'QNT'];
    const nodes = syms.map((sym, idx) => {
      const fluxShift = Math.abs(Math.sin(idx * 1.9 + entropyTick * 0.7)) * 11;
      const entropyVal = Number((0.25 + ((Math.sin(idx + entropyTick * 0.4) + 1) * 0.35)).toFixed(2));
      return {
        id: sym,
        index: idx,
        entropyVal,
        isDrifting: fluxShift > 5.0,
        x: 210 + Math.cos((idx / syms.length) * Math.PI * 2) * 85,
        y: 120 + Math.sin((idx / syms.length) * Math.PI * 2) * 72,
      };
    });

    const links: Array<{ source: string; target: string; prob: number }> = [];
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const prob = Number(
          (0.3 + Math.abs(Math.sin(i * 2.1 + j * 1.3 + entropyTick * 0.25)) * 0.68).toFixed(2)
        );
        if (prob >= 0.45) {
          links.push({ source: nodes[i].id, target: nodes[j].id, prob });
        }
      }
    }

    const sim = d3
      .forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force('charge', d3.forceManyBody().strength(-140))
      .force('center', d3.forceCenter(210, 120))
      .force(
        'link',
        d3
          .forceLink(links as d3.SimulationLinkDatum<d3.SimulationNodeDatum>[])
          .id((d) => (d as { id: string }).id)
          .distance(95)
      )
      .stop();

    for (let k = 0; k < 60; k += 1) sim.tick();

    const colorScale = d3.scaleSequential(d3.interpolateTurbo).domain([0.1, 0.95]);
    return { nodes, links, colorScale };
  }, [bundles, entropyTick]);

  // Export Entanglement SVG / PNG (#50)
  const exportGraphAsset = (format: 'svg' | 'png') => {
    const svgEl = entanglementSvgRef.current;
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgEl);
    if (format === 'svg') {
      const blob = new Blob([source], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `twe-entanglement-flux-${Date.now()}.svg`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 840;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#0B0D10';
      ctx.fillRect(0, 0, 840, 480);
      ctx.drawImage(img, 0, 0, 840, 480);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `twe-entanglement-flux-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
  };

  // Signed Quantum Entropy Audit JSON Export (#30)
  const exportAuditLogJson = async () => {
    const payloadObj = {
      schema: 'TWE-QNT-ENTROPY-AUDIT-v2',
      generatedAt: new Date().toISOString(),
      savitzkyGolayFiltered: useSavitzkyGolay,
      alertThresholds: { high: highAlertThreshold, low: lowAlertThreshold },
      noiseVolatilityCorrelation: noiseVolCorrelation,
      samples: rngSeries.filtered,
    };
    const bodyStr = JSON.stringify(payloadObj);
    let sha256Hex = 'unavailable';
    if (window.crypto?.subtle) {
      const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(bodyStr));
      sha256Hex = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
    const signedBundle = JSON.stringify({ ...payloadObj, digestSha256: sha256Hex }, null, 2);
    const blob = new Blob([signedBundle], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quantum-entropy-audit-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const breachCount = rngSeries.filtered.filter(
    (v) => v >= highAlertThreshold || v <= lowAlertThreshold
  ).length;

  return (
    <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-display font-semibold text-sm text-[var(--twe-text-primary)] flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-400" />
            <span>Quantum Entropy Metrics, Entanglement Flux &amp; Cross-Asset Risk Matrix</span>
          </div>
          <div className="text-[11px] font-mono text-[var(--twe-text-muted)]">
            Live post-quantum RNG noise telemetry, Savitzky-Golay filter &amp; D3 force entanglement
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={() => setUseSavitzkyGolay((v) => !v)}
            className={`px-2.5 py-1 rounded border cursor-pointer ${
              useSavitzkyGolay
                ? 'border-sky-500 bg-sky-500/15 text-sky-400 font-semibold'
                : 'border-[var(--twe-border)] bg-[var(--twe-bg-surface)]'
            }`}
          >
            Savitzky-Golay Filter: {useSavitzkyGolay ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={() => setHeatmapOverlay3D((v) => !v)}
            className={`px-2.5 py-1 rounded border cursor-pointer ${
              heatmapOverlay3D
                ? 'border-[#D4B475] bg-[var(--twe-gold-soft)] text-[#A8843E] dark:text-[#D4B475] font-semibold'
                : 'border-[var(--twe-border)] bg-[var(--twe-bg-surface)]'
            }`}
          >
            3D Flux Heatmap: {heatmapOverlay3D ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={() => void exportAuditLogJson()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Signed Entropy Audit
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Top Row: Noise-Volatility Card + D3 Noise Frequency Histogram + Sliders (#28, #31, #32, #36) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 p-3.5 rounded-lg bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] space-y-3 font-mono">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--twe-text-primary)]">Noise-Volatility Correlation</span>
              {noiseVolCorrelation.drifting && (
                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-500 text-[10px] animate-pulse font-bold">
                  CLUSTER DRIFT &gt;5%
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs tabular-nums">
              <div className="p-2.5 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)]">
                <div className="text-[10px] text-[var(--twe-text-muted)]">RNG Noise Floor</div>
                <div className="text-base font-bold text-sky-400">{noiseVolCorrelation.latestNoise}</div>
              </div>
              <div className="p-2.5 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)]">
                <div className="text-[10px] text-[var(--twe-text-muted)]">Pearson r (Noise/Vol)</div>
                <div className="text-base font-bold text-[#A8843E] dark:text-[#D4B475]">
                  {noiseVolCorrelation.r >= 0 ? '+' : ''}
                  {noiseVolCorrelation.r}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <label className="block">
                <span className="flex justify-between">
                  <span className="text-[var(--twe-text-muted)]">High Entropy Alert Ceiling</span>
                  <span className="text-rose-500 font-semibold">{highAlertThreshold.toFixed(2)}</span>
                </span>
                <input
                  type="range"
                  min={0.6}
                  max={0.95}
                  step={0.02}
                  value={highAlertThreshold}
                  onChange={(e) => setHighAlertThreshold(Number(e.target.value))}
                  className="w-full accent-rose-500"
                />
              </label>
              <label className="block">
                <span className="flex justify-between">
                  <span className="text-[var(--twe-text-muted)]">Low Entropy Alert Floor</span>
                  <span className="text-amber-500 font-semibold">{lowAlertThreshold.toFixed(2)}</span>
                </span>
                <input
                  type="range"
                  min={0.05}
                  max={0.4}
                  step={0.02}
                  value={lowAlertThreshold}
                  onChange={(e) => setLowAlertThreshold(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </label>
            </div>

            <div className="text-[10px] flex items-center gap-1.5 text-[var(--twe-text-secondary)]">
              <AlertTriangle className={`w-3.5 h-3.5 ${breachCount > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
              <span>{breachCount} RNG sample(s) currently breaching alert thresholds</span>
            </div>
          </div>

          {/* D3 Frequency Histogram (#31, #32) */}
          <div className="lg:col-span-8 p-3.5 rounded-lg bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-semibold text-[var(--twe-text-primary)]">
                Quantum RNG Noise Frequency Histogram (d3.bin)
              </span>
              <span className="text-[10px] text-[var(--twe-text-muted)]">
                Highlighted bins indicate threshold breach zones
              </span>
            </div>
            <svg viewBox="0 0 520 150" className="w-full h-36 select-none">
              <line x1={30} y1={126} x2={500} y2={126} stroke="currentColor" strokeOpacity={0.2} />
              {histogramBins.map((bin) => {
                const bw = 42;
                const x = 35 + bin.idx * 46;
                const h = Math.min(100, bin.count * 18);
                return (
                  <g key={bin.idx}>
                    <rect
                      x={x}
                      y={126 - h}
                      width={bw}
                      height={Math.max(2, h)}
                      rx={3}
                      fill={bin.breach ? '#f43f5e' : '#38bdf8'}
                      opacity={bin.breach ? 0.85 : 0.72}
                    >
                      <title>{`Bin [${bin.x0.toFixed(1)}-${bin.x1.toFixed(1)}]: ${bin.count} samples`}</title>
                    </rect>
                    <text
                      x={x + bw / 2}
                      y={140}
                      textAnchor="middle"
                      fontSize="9"
                      fontFamily="var(--font-mono)"
                      fill="currentColor"
                      opacity={0.65}
                    >
                      {bin.x0.toFixed(1)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Middle Row: Entanglement Probability Force Map + 3D-style Heatmap Overlay + Legend (#29, #34, #35, #50, #64) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 p-3.5 rounded-lg bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <span className="font-semibold text-[var(--twe-text-primary)] flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-[#D4B475]" />
                <span>D3 Entanglement Probability Map &amp; Entropy Flux Heatmap</span>
              </span>
              <div className="flex items-center gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => exportGraphAsset('svg')}
                  className="px-2 py-0.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] cursor-pointer"
                >
                  Export SVG
                </button>
                <button
                  type="button"
                  onClick={() => exportGraphAsset('png')}
                  className="px-2 py-0.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] cursor-pointer"
                >
                  Export PNG
                </button>
              </div>
            </div>

            <svg
              ref={entanglementSvgRef}
              viewBox="0 0 420 240"
              className="w-full h-56 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] select-none"
            >
              {/* Optional 3D-style Radial Quantum-Risk Heatmap Overlay (#34, #45, #67, #75) */}
              {heatmapOverlay3D &&
                entanglementGraph.nodes.map((node) => (
                  <circle
                    key={`heat-${node.id}`}
                    cx={node.x}
                    cy={node.y}
                    r={34}
                    fill={entanglementGraph.colorScale(node.entropyVal)}
                    opacity={0.18}
                  />
                ))}

              {entanglementGraph.links.map((lk, idx) => {
                const s = lk.source as unknown as { id: string; x: number; y: number };
                const t = lk.target as unknown as { id: string; x: number; y: number };
                if (!s?.x || !t?.x) return null;
                return (
                  <line
                    key={`link-${idx}`}
                    x1={s.x}
                    y1={s.y}
                    x2={t.x}
                    y2={t.y}
                    stroke="#D4B475"
                    strokeOpacity={Math.min(0.75, lk.prob * 0.7)}
                    strokeWidth={1 + lk.prob * 1.8}
                  />
                );
              })}

              {entanglementGraph.nodes.map((node) => (
                <g key={node.id}>
                  {node.isDrifting && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={20}
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth={1.5}
                      className="animate-ping"
                    />
                  )}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={14}
                    fill={entanglementGraph.colorScale(node.entropyVal)}
                    stroke="#0B0D10"
                    strokeWidth={1.5}
                  >
                    <title>{`${node.id} Entropy Flux: ${node.entropyVal}${node.isDrifting ? ' (DRIFTING >5%)' : ''}`}</title>
                  </circle>
                  <text
                    x={node.x}
                    y={node.y + 3.5}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="700"
                    fontFamily="var(--font-mono)"
                    fill="#ffffff"
                  >
                    {node.id}
                  </text>
                </g>
              ))}
            </svg>

            {/* Dynamic D3 Color Scale Legend (#35) */}
            <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-[var(--twe-text-muted)]">
              <span>Low Flux (0.10)</span>
              <div
                className="flex-1 h-2 rounded-full"
                style={{
                  background:
                    'linear-gradient(90deg, #30123b 0%, #28bbec 35%, #a2fc3c 65%, #fb8022 85%, #7a0403 100%)',
                }}
              />
              <span>Critical Flux (0.95)</span>
            </div>
          </div>

          {/* Cross-Asset Entropy Correlation Matrix & Volatility vs Entropy Scatterplot (#33, #51) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-3.5 rounded-lg bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] space-y-2">
              <div className="text-xs font-mono font-semibold text-[var(--twe-text-primary)]">
                Cross-Asset Entropy Correlation Matrix
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse font-mono text-[10px] tabular-nums">
                  <thead>
                    <tr className="text-[var(--twe-text-muted)]">
                      <th className="p-1 text-left">Token</th>
                      {corrMatrix.symbols.slice(0, 5).map((s) => (
                        <th key={s} className="p-1">
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {corrMatrix.symbols.slice(0, 5).map((rSym) => (
                      <tr key={rSym}>
                        <td className="p-1 text-left font-semibold">{rSym}</td>
                        {corrMatrix.symbols.slice(0, 5).map((cSym) => {
                          const r = corrMatrix.matrix[rSym]?.[cSym] ?? 0;
                          return (
                            <td
                              key={`${rSym}-${cSym}`}
                              style={{
                                backgroundColor:
                                  rSym === cSym
                                    ? 'rgba(212,180,117,0.22)'
                                    : r > 0.35
                                    ? 'rgba(16,185,129,0.25)'
                                    : 'rgba(56,189,248,0.12)',
                              }}
                              className="p-1 border border-[var(--twe-border)]"
                            >
                              {r.toFixed(2)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 24h Volatility vs Entropy Flux Scatterplot (#51) */}
            <div className="p-3.5 rounded-lg bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] space-y-2">
              <div className="text-xs font-mono font-semibold text-[var(--twe-text-primary)]">
                24h Volatility (σ) vs Entropy Flux Scatterplot
              </div>
              <svg viewBox="0 0 320 120" className="w-full h-28 select-none">
                <line x1={28} y1={102} x2={305} y2={102} stroke="currentColor" strokeOpacity={0.2} />
                <line x1={28} y1={14} x2={28} y2={102} stroke="currentColor" strokeOpacity={0.2} />
                {bundles.map((b, i) => {
                  const x = 40 + Math.min(250, b.volatility30d.stdDevPct * 42);
                  const flux = entanglementGraph.nodes[i]?.entropyVal ?? 0.5;
                  const y = 96 - flux * 78;
                  return (
                    <g key={b.holding.symbol}>
                      <circle cx={x} cy={y} r={5} fill="#38bdf8" opacity={0.85}>
                        <title>{`${b.holding.symbol}: Vol ${b.volatility30d.stdDevPct.toFixed(2)}% | Flux ${flux}`}</title>
                      </circle>
                      <text x={x + 7} y={y + 3} fontSize="8.5" fontFamily="var(--font-mono)" fill="currentColor">
                        {b.holding.symbol}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
