import React, { useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  Bell,
  BellRing,
  CheckCircle2,
  Clock,
  Cpu,
  Flame,
  Landmark,
  Layers,
  RefreshCcw,
  Scale,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  computeAssetSharpeRatio,
  computePortfolioAggregateSummary,
  formatCompactUsd,
  inferEcosystemCluster,
  type AssetAnalyticsBundle,
  type EcosystemCluster,
} from '../lib/portfolioAnalytics';

export const PortfolioRiskGaugeAndBreakdown: React.FC<{
  bundles: AssetAnalyticsBundle[];
  stressPct: number;
  quantumNeutralizer: boolean;
}> = ({ bundles, stressPct, quantumNeutralizer }) => {
  const summary = useMemo(() => computePortfolioAggregateSummary(bundles), [bundles]);

  // Apply interactive stress & quantum hedge adjustments cleanly
  const adjustedScore = useMemo(() => {
    let score = summary.aggregateRiskScore;
    if (stressPct < 0) score += Math.abs(stressPct) * 0.45;
    if (quantumNeutralizer) score -= 12;
    return Math.round(Math.max(5, Math.min(98, score)));
  }, [summary.aggregateRiskScore, stressPct, quantumNeutralizer]);

  const adjustedSharpe = useMemo(() => {
    let s = summary.portfolioSharpe;
    if (stressPct < 0) s -= Math.abs(stressPct) * 0.028;
    if (quantumNeutralizer) s += 0.28;
    return Number(s.toFixed(2));
  }, [summary.portfolioSharpe, stressPct, quantumNeutralizer]);

  // D3 Circular Radial Gauge Geometry (Items #65, #68)
  const gaugeGeometry = useMemo(() => {
    const startAngle = -Math.PI * 0.78;
    const endAngle = Math.PI * 0.78;
    const progressAngle = startAngle + ((endAngle - startAngle) * adjustedScore) / 100;

    const bgArc =
      d3
        .arc<unknown>()
        .innerRadius(42)
        .outerRadius(54)
        .startAngle(startAngle)
        .endAngle(endAngle)
        .cornerRadius(6)({}) ?? '';

    const fgArc =
      d3
        .arc<unknown>()
        .innerRadius(42)
        .outerRadius(54)
        .startAngle(startAngle)
        .endAngle(progressAngle)
        .cornerRadius(6)({}) ?? '';

    return { bgArc, fgArc };
  }, [adjustedScore]);

  const riskColor =
    adjustedScore >= 68 ? '#f43f5e' : adjustedScore >= 42 ? '#f59e0b' : '#10b981';
  const riskLabel =
    adjustedScore >= 68 ? 'ELEVATED RISK' : adjustedScore >= 42 ? 'MODERATE BETA' : 'INSTITUTIONAL OPTIMAL';

  return (
    <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
      {/* Left: D3 Radial Risk Gauge */}
      <div className="lg:col-span-4 flex items-center gap-4 pr-2 lg:border-r border-[var(--twe-border)]">
        <svg viewBox="-65 -62 130 112" className="w-28 h-24 shrink-0 overflow-visible">
          <path d={gaugeGeometry.bgArc} fill="currentColor" opacity={0.14} />
          <path d={gaugeGeometry.fgArc} fill={riskColor} />
          <text
            x="0"
            y="2"
            textAnchor="middle"
            fontSize="20"
            fontWeight="700"
            fontFamily="var(--font-mono)"
            fill="currentColor"
          >
            {adjustedScore}
          </text>
          <text
            x="0"
            y="18"
            textAnchor="middle"
            fontSize="8"
            fontFamily="var(--font-mono)"
            fill={riskColor}
          >
            / 100 RISK
          </text>
        </svg>
        <div className="min-w-0">
          <div className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">
            Aggregate Portfolio Risk Score
          </div>
          <div className="font-display font-bold text-sm mt-0.5" style={{ color: riskColor }}>
            {riskLabel}
          </div>
          <div className="text-[11px] font-mono text-[var(--twe-text-secondary)] mt-0.5">
            Sharpe &amp; σ Volatility Weighted
          </div>
        </div>
      </div>

      {/* Right: 30D Aggregate Performance Breakdown (Item #24) */}
      <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-2.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
          <div className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">30D Aggregate PnL</div>
          <div
            className={`mt-1 font-mono text-sm font-semibold tabular-nums ${
              summary.totalPnl30dUsd >= 0 ? 'text-emerald-500' : 'text-rose-500'
            }`}
          >
            {summary.totalPnl30dUsd >= 0 ? '+' : ''}
            {formatCompactUsd(summary.totalPnl30dUsd)}
          </div>
          <div className="text-[10px] font-mono text-[var(--twe-text-muted)]">
            {summary.totalPnl30dPct >= 0 ? '+' : ''}
            {summary.totalPnl30dPct.toFixed(2)}% (30D)
          </div>
        </div>

        <div className="p-2.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
          <div className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">Max Drawdown</div>
          <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-rose-500">
            -{summary.maxDrawdownPct.toFixed(2)}%
          </div>
          <div className="text-[10px] font-mono text-[var(--twe-text-muted)]">Peak-to-Trough 30D</div>
        </div>

        <div className="p-2.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
          <div className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">Portfolio Sharpe</div>
          <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-[#A8843E] dark:text-[#D4B475]">
            {adjustedSharpe.toFixed(2)}
          </div>
          <div className="text-[10px] font-mono text-[var(--twe-text-muted)]">Risk-Adjusted Yield</div>
        </div>

        <div className="p-2.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
          <div className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">Ecosystem Diversity</div>
          <div className="mt-1 font-mono text-xs font-semibold text-[var(--twe-text-primary)]">
            {summary.ecosystemBreakdown.map((e) => `${e.cluster} ${e.pct}%`).join(' · ')}
          </div>
          <div className="text-[10px] font-mono text-[var(--twe-text-muted)]">Multi-Chain Allocation</div>
        </div>
      </div>
    </div>
  );
};

export const PortfolioQuantWorkbench: React.FC<{
  bundles: AssetAnalyticsBundle[];
  onTradeSymbol: (sym: string) => void;
  stressPct: number;
  onStressPctChange: (v: number) => void;
  quantumNeutralizer: boolean;
  onQuantumNeutralizerChange: (v: boolean) => void;
  onInjectCatalyst: (sector: string, pct: number) => void;
  rsiAlertPrefs: Record<string, boolean>;
  onToggleRsiAlertAsset: (sym: string) => void;
}> = ({
  bundles,
  onTradeSymbol,
  stressPct,
  onStressPctChange,
  quantumNeutralizer,
  onQuantumNeutralizerChange,
  onInjectCatalyst,
  rsiAlertPrefs,
  onToggleRsiAlertAsset,
}) => {
  const [activeTab, setActiveTab] = useState<'rebalance' | 'stress' | 'treemap' | 'onchain'>('rebalance');

  // Rebalancer target weights state (Items #16, #41)
  const totalVal = useMemo(
    () => Math.max(1, bundles.reduce((s, b) => s + b.latestPoint.valuationUsd, 0)),
    [bundles]
  );

  const [targetWeights, setTargetWeights] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    bundles.forEach((b) => {
      map[b.holding.symbol] = Math.round((b.latestPoint.valuationUsd / totalVal) * 100);
    });
    return map;
  });

  // Rebalancer Deviation Alert Setting (Persisted threshold + enable toggle)
  const [deviationAlertEnabled, setDeviationAlertEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('twe-rebalance-drift-alert-enabled');
    return saved ? saved === 'true' : true;
  });
  const [driftThresholdPct, setDriftThresholdPct] = useState<number>(() => {
    const saved = Number(localStorage.getItem('twe-rebalance-drift-threshold-pct'));
    return Number.isFinite(saved) && saved >= 0.5 && saved <= 25 ? saved : 5.0;
  });
  const [lastDriftAlertInfo, setLastDriftAlertInfo] = useState<{
    sentAt: string;
    summary: string;
  } | null>(null);
  const [dispatchingDriftAlert, setDispatchingDriftAlert] = useState(false);
  const lastAlertSignatureRef = React.useRef<string>('');

  useEffect(() => {
    localStorage.setItem('twe-rebalance-drift-alert-enabled', String(deviationAlertEnabled));
  }, [deviationAlertEnabled]);

  useEffect(() => {
    localStorage.setItem('twe-rebalance-drift-threshold-pct', String(driftThresholdPct));
  }, [driftThresholdPct]);

  // Tax & Compliance Framework (Item #17)
  const [taxRegion, setTaxRegion] = useState<'US_IRS' | 'EU_MICA' | 'UK_HMRC' | 'SG_MAS' | 'CH_FINMA'>('US_IRS');
  const [holdingPeriod, setHoldingPeriod] = useState<'short' | 'long'>('long');

  // Market Catalyst Sector (Item #26)
  const [catalystSector, setCatalystSector] = useState<string>('RWA & Precious Metals');
  const [lastCatalystMsg, setLastCatalystMsg] = useState<string | null>(null);

  // On-Chain Activity & Latency Tick (Items #73, #74)
  const [chainTick, setChainTick] = useState(0);
  const [alertChannel, setAlertChannel] = useState<'Push' | 'Email'>('Push');
  const [alertZone, setAlertZone] = useState<'≤30 Buy' | '≥70 Sell' | 'Both Extremes'>('Both Extremes');

  useEffect(() => {
    const id = window.setInterval(() => setChainTick((t) => t + 1), 3200);
    return () => window.clearInterval(id);
  }, []);

  const optimizeForSharpe = () => {
    const scores = bundles.map((b) => Math.max(0.25, computeAssetSharpeRatio(b.points31d) + 1.2));
    const sum = scores.reduce((a, b) => a + b, 0) || 1;
    const next: Record<string, number> = {};
    bundles.forEach((b, i) => {
      next[b.holding.symbol] = Math.round((scores[i] / sum) * 100);
    });
    setTargetWeights(next);
  };

  const syncTargetsToCurrent = () => {
    const next: Record<string, number> = {};
    bundles.forEach((b) => {
      next[b.holding.symbol] = Number(((b.latestPoint.valuationUsd / totalVal) * 100).toFixed(1));
    });
    setTargetWeights(next);
  };

  const weightSum = Object.values(targetWeights).reduce((a, b) => a + b, 0) || 100;

  const rebalancePlan = useMemo(() => {
    return bundles.map((b) => {
      const sym = b.holding.symbol;
      const curVal = b.latestPoint.valuationUsd;
      const curPct = (curVal / totalVal) * 100;
      const rawTarget = targetWeights[sym] ?? curPct;
      const normTargetPct = (rawTarget / Math.max(1, weightSum)) * 100;
      const signedDriftPct = Number((curPct - normTargetPct).toFixed(1));
      const absDriftPct = Number(Math.abs(curPct - normTargetPct).toFixed(1));
      const targetVal = (normTargetPct / 100) * totalVal;
      const deltaUsd = targetVal - curVal;
      const deltaUnits = deltaUsd / Math.max(0.01, b.latestPoint.priceUsd);
      const unrealizedGainShare = Math.max(0, b.latestPoint.pnlUsd);
      const realizedGainEstimate =
        deltaUsd < -25 ? Math.min(unrealizedGainShare, Math.abs(deltaUsd) * 0.35) : 0;

      return {
        symbol: sym,
        curPct: Number(curPct.toFixed(1)),
        targetPct: Number(normTargetPct.toFixed(1)),
        signedDriftPct,
        absDriftPct,
        isBreachingDrift: absDriftPct >= driftThresholdPct,
        deltaUsd: Number(deltaUsd.toFixed(2)),
        deltaUnits: Number(deltaUnits.toFixed(2)),
        action: Math.abs(deltaUsd) < 50 ? 'HOLD' : deltaUsd > 0 ? 'BUY' : 'SELL',
        realizedGainEstimate,
      };
    });
  }, [bundles, totalVal, targetWeights, weightSum, driftThresholdPct]);

  const driftMetrics = useMemo(() => {
    const breachedAssets = rebalancePlan
      .filter((r) => r.absDriftPct >= driftThresholdPct)
      .sort((a, b) => b.absDriftPct - a.absDriftPct);
    const maxDriftPct = rebalancePlan.reduce((m, r) => Math.max(m, r.absDriftPct), 0);
    const totalDriftPct = Number(
      (rebalancePlan.reduce((s, r) => s + r.absDriftPct, 0) / 2).toFixed(1)
    );
    return {
      breachedAssets,
      maxDriftPct: Number(maxDriftPct.toFixed(1)),
      totalDriftPct,
      hasBreach: breachedAssets.length > 0,
    };
  }, [rebalancePlan, driftThresholdPct]);

  const sendDriftSystemNotification = useMemo(
    () => async (force = false) => {
      if (!driftMetrics.hasBreach) return;
      const topSummary = driftMetrics.breachedAssets
        .slice(0, 3)
        .map(
          (r) =>
            `${r.symbol} ${r.signedDriftPct >= 0 ? '+' : ''}${r.signedDriftPct}% (Cur ${r.curPct}% vs Tgt ${r.targetPct}%)`
        )
        .join(' · ');
      const signature = `${driftThresholdPct}|${driftMetrics.breachedAssets
        .map((r) => `${r.symbol}:${Math.round(r.absDriftPct)}`)
        .join(',')}`;

      if (!force && lastAlertSignatureRef.current === signature) return;
      lastAlertSignatureRef.current = signature;
      setDispatchingDriftAlert(true);
      try {
        const res = await fetch('/api/twe/notifications/alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'rebalance_drift',
            title: `Rebalance Deviation Alert (${driftMetrics.breachedAssets.length} Asset${
              driftMetrics.breachedAssets.length > 1 ? 's' : ''
            } > ${driftThresholdPct.toFixed(1)}%)`,
            message: `Max portfolio drift ${driftMetrics.maxDriftPct}% exceeded ${driftThresholdPct.toFixed(
              1
            )}% threshold: ${topSummary}.`,
            symbol: driftMetrics.breachedAssets[0]?.symbol,
            severity: driftMetrics.maxDriftPct >= driftThresholdPct * 1.5 ? 'alert' : 'warning',
          }),
        });
        if (res.ok) {
          setLastDriftAlertInfo({
            sentAt: new Date().toLocaleTimeString(),
            summary: topSummary,
          });
        }
      } catch {
        // graceful offline fallback
      } finally {
        setDispatchingDriftAlert(false);
      }
    },
    [driftMetrics, driftThresholdPct]
  );

  // Automatically trigger system notification when drift exceeds threshold (debounced)
  useEffect(() => {
    if (!deviationAlertEnabled || !driftMetrics.hasBreach) {
      if (!driftMetrics.hasBreach) {
        lastAlertSignatureRef.current = '';
      }
      return;
    }
    const timer = window.setTimeout(() => {
      void sendDriftSystemNotification(false);
    }, 550);
    return () => window.clearTimeout(timer);
  }, [deviationAlertEnabled, driftMetrics, sendDriftSystemNotification]);

  const taxEstimate = useMemo(() => {
    const rateMap: Record<typeof taxRegion, { short: number; long: number; label: string }> = {
      US_IRS: { short: 0.32, long: 0.15, label: 'US IRS Form 8949 / Sec. 1222' },
      EU_MICA: { short: 0.26, long: 0.26, label: 'EU MiCA Harmonized Capital Levy' },
      UK_HMRC: { short: 0.2, long: 0.2, label: 'UK HMRC Cryptoassets CGT' },
      SG_MAS: { short: 0.0, long: 0.0, label: 'Singapore MAS Capital Exempt' },
      CH_FINMA: { short: 0.0, long: 0.0, label: 'Swiss FINMA Private Exemption' },
    };
    const cfg = rateMap[taxRegion];
    const rate = holdingPeriod === 'short' ? cfg.short : cfg.long;
    const totalTaxableGain = rebalancePlan.reduce((s, r) => s + r.realizedGainEstimate, 0);
    return {
      label: cfg.label,
      ratePct: Math.round(rate * 100),
      taxableGainUsd: Number(totalTaxableGain.toFixed(2)),
      estimatedTaxUsd: Number((totalTaxableGain * rate).toFixed(2)),
    };
  }, [taxRegion, holdingPeriod, rebalancePlan]);

  // Stress-Test Impact Projection (Item #25)
  const stressImpact = useMemo(() => {
    const baseSummary = computePortfolioAggregateSummary(bundles);
    const shockMult = 1 + stressPct / 100 + (quantumNeutralizer ? 0.038 : 0);
    const projectedVal = baseSummary.totalValuationUsd * shockMult;
    const deltaVal = projectedVal - baseSummary.totalValuationUsd;
    const projectedSharpe = Number(
      (baseSummary.portfolioSharpe + (stressPct / 100) * 2.4 + (quantumNeutralizer ? 0.28 : 0)).toFixed(2)
    );
    return { projectedVal, deltaVal, projectedSharpe };
  }, [bundles, stressPct, quantumNeutralizer]);

  // D3 Sovereign Asset Treemap (Item #44)
  const treemapNodes = useMemo(() => {
    interface TreemapDatum {
      name: string;
      value?: number;
      mcap?: number;
      cluster?: EcosystemCluster;
      children?: TreemapDatum[];
    }
    const w = 780;
    const h = 230;
    const rootData: TreemapDatum = {
      name: 'SovereignPortfolio',
      children: (['EVM', 'Solana', 'Quantum'] as EcosystemCluster[])
        .map((cluster) => ({
          name: cluster,
          children: bundles
            .filter((b) => inferEcosystemCluster(b.holding.chain, b.holding.symbol) === cluster)
            .map((b) => ({
              name: b.holding.symbol,
              value: Math.max(1_000_000, b.latestPoint.marketCapUsd),
              mcap: b.latestPoint.marketCapUsd,
              cluster,
            })),
        }))
        .filter((c) => c.children.length > 0),
    };

    const root = d3
      .hierarchy<TreemapDatum>(rootData)
      .sum((d) => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    d3.treemap<TreemapDatum>()
      .size([w, h])
      .paddingOuter(4)
      .paddingTop(18)
      .paddingInner(3)(root);

    return {
      width: w,
      height: h,
      groups: root.children ?? [],
      leaves: root.leaves(),
    };
  }, [bundles]);

  // On-Chain Latency Scatterplot Points (Item #74)
  const latencyPoints = useMemo(() => {
    const chains: Array<{ chain: EcosystemCluster; baseMs: number; color: string }> = [
      { chain: 'EVM', baseMs: 12000, color: '#D4B475' },
      { chain: 'Solana', baseMs: 420, color: '#10b981' },
      { chain: 'Quantum', baseMs: 850, color: '#38bdf8' },
    ];
    const pts: Array<{ idx: number; chain: EcosystemCluster; latencyMs: number; color: string }> = [];
    for (let i = 0; i < 18; i += 1) {
      const cfg = chains[i % 3];
      const jitter = ((Math.sin(i * 1.7 + chainTick) + 1) * 0.25 + 0.85) * cfg.baseMs;
      pts.push({
        idx: i,
        chain: cfg.chain,
        latencyMs: Math.round(jitter),
        color: cfg.color,
      });
    }
    return pts;
  }, [chainTick]);

  const onChainTransfers = useMemo(() => {
    return bundles.slice(0, 6).map((b, i) => {
      const cluster = inferEcosystemCluster(b.holding.chain, b.holding.symbol);
      const amt = Number((((i + 1) * 48.2 + (chainTick % 19) * 3.4)).toFixed(2));
      const hashSeed = ((chainTick + i * 7) * 2654435761) >>> 0;
      const from = `0x${hashSeed.toString(16).padStart(8, '0')}…${((hashSeed >>> 4) & 0xffff).toString(16)}`;
      const to = `0x${((hashSeed * 3) >>> 0).toString(16).padStart(8, '0')}…custody`;
      return {
        id: `${b.holding.symbol}-${chainTick}-${i}`,
        symbol: b.holding.symbol,
        cluster,
        from,
        to,
        amount: amt,
        ts: new Date(Date.now() - i * 4200).toLocaleTimeString(),
      };
    });
  }, [bundles, chainTick]);

  return (
    <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden">
      {/* Workbench Tab Header */}
      <div className="px-4 py-2.5 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-2">
        <div className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
          Portfolio Quantitative Workbench &amp; Sovereign Telemetry
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] p-0.5 text-xs">
          {(
            [
              { id: 'rebalance', label: 'Rebalancer & Tax', icon: Scale },
              { id: 'stress', label: 'Stress-Test & Quantum Hedge', icon: Flame },
              { id: 'treemap', label: 'Sovereign Treemap & APY', icon: Layers },
              { id: 'onchain', label: 'On-Chain Feed & RSI Alerts', icon: Activity },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded whitespace-nowrap cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-semibold'
                    : 'text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Portfolio Rebalancer + Rebalance Deviation Alert + Tax & Compliance Calculator */}
      {activeTab === 'rebalance' && (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 space-y-3">
            {/* Rebalance Deviation Alert Configuration Card */}
            <div
              className={`p-3 rounded-lg border space-y-2.5 ${
                deviationAlertEnabled && driftMetrics.hasBreach
                  ? 'border-amber-500/60 bg-amber-500/8'
                  : 'border-[var(--twe-border)] bg-[var(--twe-bg-elevated)]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <BellRing
                    className={`w-4 h-4 ${
                      deviationAlertEnabled && driftMetrics.hasBreach
                        ? 'text-amber-500 animate-pulse'
                        : 'text-[#A8843E] dark:text-[#D4B475]'
                    }`}
                  />
                  <span className="font-semibold text-[var(--twe-text-primary)]">
                    Rebalance Deviation Alert
                  </span>
                  <span className="text-[10px] text-[var(--twe-text-muted)] tabular-nums">
                    Max Drift {driftMetrics.maxDriftPct}% · L1 {driftMetrics.totalDriftPct}%
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={() => setDeviationAlertEnabled((v) => !v)}
                    aria-pressed={deviationAlertEnabled}
                    className={`px-2.5 py-1 rounded border font-semibold cursor-pointer ${
                      deviationAlertEnabled
                        ? 'border-emerald-500/45 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-muted)]'
                    }`}
                  >
                    Alert: {deviationAlertEnabled ? 'ON' : 'OFF'}
                  </button>
                  <button
                    type="button"
                    onClick={syncTargetsToCurrent}
                    title="Reset target weights to match current allocation"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] hover:border-[#D4B475] text-[var(--twe-text-secondary)] cursor-pointer"
                  >
                    <RefreshCcw className="w-3 h-3" /> Sync Targets
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center text-xs font-mono">
                <div className="sm:col-span-7 flex items-center gap-2.5">
                  <span className="text-[11px] text-[var(--twe-text-secondary)] whitespace-nowrap">
                    Drift Threshold:
                  </span>
                  <input
                    type="range"
                    aria-label="Rebalance deviation threshold percentage"
                    min={0.5}
                    max={25}
                    step={0.5}
                    value={driftThresholdPct}
                    onChange={(e) => setDriftThresholdPct(Number(e.target.value))}
                    className="w-full accent-[#D4B475] cursor-pointer"
                  />
                  <input
                    type="number"
                    aria-label="Drift threshold numeric input"
                    min={0.5}
                    max={25}
                    step={0.5}
                    value={driftThresholdPct}
                    onChange={(e) =>
                      setDriftThresholdPct(
                        Math.min(25, Math.max(0.5, Number(e.target.value) || 0.5))
                      )
                    }
                    className="w-16 px-2 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-right tabular-nums text-[var(--twe-text-primary)]"
                  />
                  <span className="text-[11px] text-[var(--twe-text-muted)]">%</span>
                </div>

                <div className="sm:col-span-5 flex flex-wrap items-center justify-end gap-1">
                  {[2, 5, 10, 15].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDriftThresholdPct(preset)}
                      className={`px-2 py-0.5 rounded border text-[10px] cursor-pointer ${
                        driftThresholdPct === preset
                          ? 'border-[#A8843E] dark:border-[#D4B475] bg-[var(--twe-gold-soft)] text-[#A8843E] dark:text-[#D4B475] font-semibold'
                          : 'border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-muted)]'
                      }`}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Drift Breach Banner & Dispatch Status */}
              {deviationAlertEnabled && (
                <div className="pt-2 border-t border-[var(--twe-border)] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                  {driftMetrics.hasBreach ? (
                    <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 min-w-0">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">
                        {driftMetrics.breachedAssets.length} asset(s) exceed {driftThresholdPct.toFixed(1)}% drift:{' '}
                        {driftMetrics.breachedAssets
                          .slice(0, 3)
                          .map((r) => `${r.symbol} (${r.absDriftPct}%)`)
                          .join(', ')}
                        {lastDriftAlertInfo ? ` · Notified ${lastDriftAlertInfo.sentAt}` : ''}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Portfolio aligned within ±{driftThresholdPct.toFixed(1)}% target tolerance
                      </span>
                    </div>
                  )}

                  {driftMetrics.hasBreach && (
                    <button
                      type="button"
                      disabled={dispatchingDriftAlert}
                      onClick={() => void sendDriftSystemNotification(true)}
                      className="px-2.5 py-1 rounded border border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold hover:bg-amber-500/25 disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {dispatchingDriftAlert ? 'Sending...' : 'Trigger Alert Now'}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-mono text-[var(--twe-text-secondary)]">
                Adjust Target Weights (Auto-normalized: {Math.round(weightSum)}%)
              </div>
              <button
                type="button"
                onClick={optimizeForSharpe}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#A8843E]/45 dark:border-[#D4B475]/45 bg-[var(--twe-gold-soft)] text-[11px] font-mono font-semibold cursor-pointer"
              >
                <Sliders className="w-3 h-3" /> Auto-Optimize Sharpe Ratio
              </button>
            </div>

            <div className="space-y-2">
              {rebalancePlan.map((row) => {
                const breached = deviationAlertEnabled && row.isBreachingDrift;
                return (
                  <div
                    key={row.symbol}
                    className={`p-2.5 rounded-md border grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs font-mono ${
                      breached
                        ? 'bg-amber-500/8 border-amber-500/55'
                        : 'bg-[var(--twe-bg-elevated)] border-[var(--twe-border)]'
                    }`}
                  >
                    <div className="sm:col-span-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[var(--twe-text-primary)]">{row.symbol}</span>
                        {breached && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 text-[9px] font-bold tabular-nums">
                            DRIFT {row.signedDriftPct >= 0 ? '+' : ''}
                            {row.signedDriftPct}%
                          </span>
                        )}
                      </div>
                      <span className="block text-[10px] text-[var(--twe-text-muted)] tabular-nums">
                        Cur {row.curPct}% → Tgt {row.targetPct}%
                      </span>
                    </div>
                    <div className="sm:col-span-4 flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={70}
                        value={targetWeights[row.symbol] ?? Math.round(row.curPct)}
                        onChange={(e) =>
                          setTargetWeights((prev) => ({ ...prev, [row.symbol]: Number(e.target.value) }))
                        }
                        className="w-full accent-[#D4B475] cursor-pointer"
                      />
                    </div>
                    <div className="sm:col-span-4 flex items-center justify-end gap-2">
                      <span
                        className={`font-semibold tabular-nums ${
                          row.action === 'BUY'
                            ? 'text-emerald-500'
                            : row.action === 'SELL'
                            ? 'text-rose-500'
                            : 'text-[var(--twe-text-muted)]'
                        }`}
                      >
                        {row.action} {row.action !== 'HOLD' ? `${Math.abs(row.deltaUnits)}u` : ''}
                      </span>
                      {row.action !== 'HOLD' && (
                        <button
                          type="button"
                          onClick={() => onTradeSymbol(row.symbol)}
                          className="px-2 py-0.5 rounded border border-[var(--twe-border-strong)] hover:border-[#D4B475] text-[10px] cursor-pointer"
                        >
                          Stage
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tax & Compliance Calculator (Item #17) */}
          <div className="lg:col-span-5 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-4 space-y-3">
            <div className="flex items-center gap-2 font-display font-semibold text-sm text-[var(--twe-text-primary)]">
              <Landmark className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
              <span>Tax &amp; Compliance Calculator</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <label>
                <span className="text-[10px] text-[var(--twe-text-muted)]">Jurisdiction</span>
                <select
                  value={taxRegion}
                  onChange={(e) => setTaxRegion(e.target.value as typeof taxRegion)}
                  className="mt-1 w-full px-2 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)]"
                >
                  <option value="US_IRS">US IRS (Sec. 1222)</option>
                  <option value="EU_MICA">EU MiCA Harmonized</option>
                  <option value="UK_HMRC">UK HMRC CGT</option>
                  <option value="SG_MAS">Singapore MAS</option>
                  <option value="CH_FINMA">Swiss FINMA</option>
                </select>
              </label>

              <label>
                <span className="text-[10px] text-[var(--twe-text-muted)]">Holding Horizon</span>
                <select
                  value={holdingPeriod}
                  onChange={(e) => setHoldingPeriod(e.target.value as 'short' | 'long')}
                  className="mt-1 w-full px-2 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)]"
                >
                  <option value="long">Long-Term (&gt;12m)</option>
                  <option value="short">Short-Term (&lt;12m)</option>
                </select>
              </label>
            </div>

            <div className="p-3 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] space-y-1.5 text-xs font-mono tabular-nums">
              <div className="text-[10px] text-[var(--twe-text-muted)]">{taxEstimate.label}</div>
              <div className="flex justify-between">
                <span>Applicable Rate</span>
                <span className="font-semibold">{taxEstimate.ratePct}%</span>
              </div>
              <div className="flex justify-between">
                <span>Est. Realized Gains (Rebalance Sells)</span>
                <span className="font-semibold">${taxEstimate.taxableGainUsd.toLocaleString('en-US')}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-[var(--twe-border)] text-sm">
                <span>Projected Tax Liability</span>
                <span className="font-bold text-[#A8843E] dark:text-[#D4B475]">
                  ${taxEstimate.estimatedTaxUsd.toLocaleString('en-US')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Portfolio Stress-Test Simulator, Market Catalyst Injection & Quantum Risk Neutralizer */}
      {activeTab === 'stress' && (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
                Portfolio Stress-Test Simulator
              </div>
              <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
                {[-10, -20, -35, -50, 0].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onStressPctChange(val)}
                    className={`px-2 py-0.5 rounded border cursor-pointer ${
                      stressPct === val
                        ? 'border-rose-500 bg-rose-500/20 text-rose-500 font-semibold'
                        : 'border-[var(--twe-border)] bg-[var(--twe-bg-surface)]'
                    }`}
                  >
                    {val === 0 ? 'Neutral' : `${val}% Crash`}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between">
                <span>Global Market Shock Scenario</span>
                <span className={stressPct < 0 ? 'text-rose-500 font-semibold' : 'text-emerald-500'}>
                  {stressPct > 0 ? `+${stressPct}%` : `${stressPct}%`}
                </span>
              </div>
              <input
                type="range"
                min={-60}
                max={40}
                value={stressPct}
                onChange={(e) => onStressPctChange(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-xs font-mono tabular-nums">
              <div className="p-2.5 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)]">
                <div className="text-[10px] text-[var(--twe-text-muted)]">Projected Valuation</div>
                <div className="font-semibold text-[var(--twe-text-primary)]">
                  {formatCompactUsd(stressImpact.projectedVal)}
                </div>
              </div>
              <div className="p-2.5 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)]">
                <div className="text-[10px] text-[var(--twe-text-muted)]">Simulated PnL Delta</div>
                <div
                  className={`font-semibold ${
                    stressImpact.deltaVal >= 0 ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {stressImpact.deltaVal >= 0 ? '+' : ''}
                  {formatCompactUsd(stressImpact.deltaVal)}
                </div>
              </div>
              <div className="p-2.5 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)]">
                <div className="text-[10px] text-[var(--twe-text-muted)]">Stressed Sharpe</div>
                <div className="font-semibold text-[#A8843E] dark:text-[#D4B475]">
                  {stressImpact.projectedSharpe}
                </div>
              </div>
            </div>
          </div>

          {/* Market Catalyst Injection & Quantum Risk Neutralizer (Items #26, #27) */}
          <div className="lg:col-span-5 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-4 space-y-3">
            <div className="font-display font-semibold text-sm text-[var(--twe-text-primary)] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
              <span>Market Catalyst &amp; Quantum Risk Neutralizer</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <select
                value={catalystSector}
                onChange={(e) => setCatalystSector(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)]"
              >
                <option value="RWA & Precious Metals">Sector: RWA &amp; Precious Metals</option>
                <option value="AI / DePIN Tokens">Sector: AI / DePIN Tokens</option>
                <option value="Energy Commodities">Sector: Energy Commodities</option>
                <option value="L1 / Sovereign DeFi">Sector: L1 / Sovereign DeFi</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onInjectCatalyst(catalystSector, 6.5);
                    setLastCatalystMsg(`Injected +6.5% Bullish Catalyst on ${catalystSector}`);
                  }}
                  className="inline-flex items-center justify-center gap-1 py-1.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-300 font-semibold cursor-pointer"
                >
                  <TrendingUp className="w-3.5 h-3.5" /> +6.5% Bull Catalyst
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onInjectCatalyst(catalystSector, -5.5);
                    setLastCatalystMsg(`Injected -5.5% Bearish Shock on ${catalystSector}`);
                  }}
                  className="inline-flex items-center justify-center gap-1 py-1.5 rounded bg-rose-500/15 border border-rose-500/40 text-rose-600 dark:text-rose-300 font-semibold cursor-pointer"
                >
                  <TrendingDown className="w-3.5 h-3.5" /> -5.5% Bear Shock
                </button>
              </div>
              {lastCatalystMsg && (
                <div className="text-[10px] text-[#A8843E] dark:text-[#D4B475]">{lastCatalystMsg}</div>
              )}
            </div>

            <div className="pt-2 border-t border-[var(--twe-border)] flex items-center justify-between gap-2 text-xs">
              <div>
                <div className="font-mono font-semibold text-[var(--twe-text-primary)] flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Quantum Risk Neutralizer</span>
                </div>
                <div className="text-[10px] text-[var(--twe-text-muted)]">
                  Applies post-quantum entropy hedge (+0.28 Sharpe / -12 Risk pts)
                </div>
              </div>
              <button
                type="button"
                onClick={() => onQuantumNeutralizerChange(!quantumNeutralizer)}
                className={`px-3 py-1.5 rounded font-mono text-[11px] font-semibold border cursor-pointer ${
                  quantumNeutralizer
                    ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                    : 'border-[var(--twe-border)] bg-[var(--twe-bg-surface)]'
                }`}
              >
                {quantumNeutralizer ? 'ACTIVE' : 'ENABLE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: D3 Sovereign Asset Treemap (EVM vs Solana vs Quantum) & Annualized Yield Projection */}
      {activeTab === 'treemap' && (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-semibold text-[var(--twe-text-primary)]">
                D3 Sovereign Asset Treemap (EVM vs Solana vs Quantum by Market Cap)
              </span>
              <span className="text-[10px] text-[var(--twe-text-muted)]">d3.treemap() Layout</span>
            </div>
            <svg viewBox={`0 0 ${treemapNodes.width} ${treemapNodes.height}`} className="w-full h-56 select-none">
              {treemapNodes.groups.map((grp) => {
                const g = grp as unknown as {
                  x0: number;
                  y0: number;
                  x1: number;
                  y1: number;
                  data: { name: string };
                };
                return (
                  <g key={g.data.name}>
                    <rect
                      x={g.x0}
                      y={g.y0}
                      width={Math.max(1, g.x1 - g.x0)}
                      height={Math.max(1, g.y1 - g.y0)}
                      fill="rgba(212, 180, 117, 0.08)"
                      stroke="rgba(212, 180, 117, 0.35)"
                      rx={4}
                    />
                    <text
                      x={g.x0 + 6}
                      y={g.y0 + 13}
                      fontSize="10"
                      fontWeight="700"
                      fontFamily="var(--font-mono)"
                      fill="#D4B475"
                    >
                      {g.data.name} ECOSYSTEM
                    </text>
                  </g>
                );
              })}
              {treemapNodes.leaves.map((leaf) => {
                const l = leaf as unknown as {
                  x0: number;
                  y0: number;
                  x1: number;
                  y1: number;
                  data: { name: string; cluster?: EcosystemCluster; mcap?: number };
                };
                const w = Math.max(1, l.x1 - l.x0);
                const h = Math.max(1, l.y1 - l.y0);
                const fill =
                  l.data.cluster === 'Quantum'
                    ? 'rgba(56, 189, 248, 0.25)'
                    : l.data.cluster === 'Solana'
                    ? 'rgba(16, 185, 129, 0.25)'
                    : 'rgba(212, 180, 117, 0.25)';
                return (
                  <g key={l.data.name}>
                    <rect
                      x={l.x0}
                      y={l.y0}
                      width={w}
                      height={h}
                      fill={fill}
                      stroke="currentColor"
                      strokeOpacity={0.22}
                      rx={3}
                    />
                    {w > 54 && h > 28 && (
                      <>
                        <text
                          x={l.x0 + 8}
                          y={l.y0 + 18}
                          fontSize="11"
                          fontWeight="700"
                          fontFamily="var(--font-mono)"
                          fill="currentColor"
                        >
                          {l.data.name}
                        </text>
                        <text
                          x={l.x0 + 8}
                          y={l.y0 + 32}
                          fontSize="9"
                          fontFamily="var(--font-mono)"
                          fill="currentColor"
                          opacity={0.75}
                        >
                          {formatCompactUsd(l.data.mcap ?? 0)}
                        </text>
                      </>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Annualized Yield Projection (Item #71) */}
          <div className="lg:col-span-4 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-3.5 space-y-2.5">
            <div className="font-display font-semibold text-xs text-[var(--twe-text-primary)]">
              Annualized Staking &amp; LP Yield Projections
            </div>
            {(
              [
                { chain: 'EVM (ERC-3643 Vaults)', baseApy: 6.8, lpApy: 12.4, color: 'text-[#D4B475]' },
                { chain: 'Solana (SPL Liquidity)', baseApy: 8.2, lpApy: 18.6, color: 'text-emerald-500' },
                { chain: 'Quantum (PQ-Enclave)', baseApy: 9.5, lpApy: 21.2, color: 'text-sky-400' },
              ] as const
            ).map((row) => (
              <div
                key={row.chain}
                className="p-2.5 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] text-xs font-mono space-y-1"
              >
                <div className={`font-semibold ${row.color}`}>{row.chain}</div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[var(--twe-text-muted)]">Validator Staking APY</span>
                  <span className="font-semibold tabular-nums">{row.baseApy.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[var(--twe-text-muted)]">qAMM Pool Provision</span>
                  <span className="font-semibold tabular-nums text-emerald-500">
                    {row.lpApy.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: On-Chain Activity Feed, Latency Monitor Scatterplot & RSI Alert Manager */}
      {activeTab === 'onchain' && (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* On-Chain Activity Feed (Item #73) */}
          <div className="lg:col-span-4 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-3 space-y-2">
            <div className="text-xs font-mono font-semibold text-[var(--twe-text-primary)] flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5 text-[#D4B475]" />
              <span>Real-Time On-Chain Activity Feed</span>
            </div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto font-mono text-[10px]">
              {onChainTransfers.map((tx) => (
                <div
                  key={tx.id}
                  className="p-2 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] space-y-0.5"
                >
                  <div className="flex justify-between font-semibold">
                    <span className="text-[#A8843E] dark:text-[#D4B475]">
                      {tx.amount} {tx.symbol} · {tx.cluster}
                    </span>
                    <span className="text-[var(--twe-text-muted)]">{tx.ts}</span>
                  </div>
                  <div className="text-[var(--twe-text-secondary)] truncate">
                    {tx.from} → {tx.to}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* D3 On-Chain Latency Monitor Scatterplot (Item #74) */}
          <div className="lg:col-span-4 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-3 space-y-2">
            <div className="text-xs font-mono font-semibold text-[var(--twe-text-primary)] flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>On-Chain Block Latency (D3)</span>
              </span>
              <span className="text-[10px] text-[var(--twe-text-muted)]">EVM · SOL · QNT</span>
            </div>
            <svg viewBox="0 0 320 180" className="w-full h-44 select-none">
              {[40, 85, 130].map((y) => (
                <line key={y} x1={32} y1={y} x2={305} y2={y} stroke="currentColor" strokeOpacity={0.1} />
              ))}
              {latencyPoints.map((pt) => {
                const cx = 36 + (pt.idx / 17) * 260;
                const cy = 148 - Math.min(130, (Math.log10(pt.latencyMs) / 4.3) * 120);
                return (
                  <g key={pt.idx}>
                    <circle cx={cx} cy={cy} r={4.5} fill={pt.color} opacity={0.85}>
                      <title>{`${pt.chain}: ${pt.latencyMs}ms finality`}</title>
                    </circle>
                  </g>
                );
              })}
              <text x={32} y={168} fontSize="9" fontFamily="var(--font-mono)" fill="#D4B475">
                ● EVM ~12s
              </text>
              <text x={115} y={168} fontSize="9" fontFamily="var(--font-mono)" fill="#10b981">
                ● SOL ~420ms
              </text>
              <text x={208} y={168} fontSize="9" fontFamily="var(--font-mono)" fill="#38bdf8">
                ● QNT ~850ms
              </text>
            </svg>
          </div>

          {/* RSI Alert Manager (Items #59, #63) */}
          <div className="lg:col-span-4 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-3 space-y-2.5">
            <div className="text-xs font-mono font-semibold text-[var(--twe-text-primary)] flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-emerald-500" />
              <span>RSI Alert Manager</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
              <select
                value={alertChannel}
                onChange={(e) => setAlertChannel(e.target.value as 'Push' | 'Email')}
                className="px-2 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)]"
              >
                <option value="Push">Push Alerts</option>
                <option value="Email">Email Alerts</option>
              </select>
              <select
                value={alertZone}
                onChange={(e) => setAlertZone(e.target.value as typeof alertZone)}
                className="px-2 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)]"
              >
                <option value="Both Extremes">≤30 &amp; ≥70</option>
                <option value="≤30 Buy">≤30 Buy Only</option>
                <option value="≥70 Sell">≥70 Sell Only</option>
              </select>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto text-xs font-mono">
              {bundles.map((b) => {
                const sym = b.holding.symbol;
                const active = rsiAlertPrefs[sym] ?? true;
                return (
                  <div
                    key={sym}
                    className="px-2.5 py-1.5 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold">{sym}</span>{' '}
                      <span className="text-[10px] text-[var(--twe-text-muted)]">
                        RSI {b.latestPoint.rsi14.toFixed(1)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleRsiAlertAsset(sym)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                        active
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-[var(--twe-bg-elevated)] text-[var(--twe-text-muted)]'
                      }`}
                    >
                      {active ? `ON (${alertChannel})` : 'OFF'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
