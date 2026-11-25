import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  BookOpenCheck,
  Cable,
  CheckCircle2,
  Clock,
  Download,
  GitCompare,
  GripVertical,
  LayoutGrid,
  Maximize2,
  Play,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Table2,
  XCircle,
  Zap,
} from 'lucide-react';
import type {
  DoubleEntryJournalRow,
  FixSessionConfig,
  InstitutionalOrderType,
  MarketOrder,
  PortfolioHolding,
  TradeExecution,
  TweAssetRecord,
} from '../types/twe';
import { RsiSignalLabel, SparklineChart } from './SparklineChart';
import { RealTimePnLGraph } from './RealTimePnLGraph';
import { D3TokenPnLSparkline } from './D3TokenPnLSparkline';
import { Asset30DayPerformanceModal } from './Asset30DayPerformanceModal';
import { PortfolioQuantWorkbench, PortfolioRiskGaugeAndBreakdown } from './PortfolioQuantTools';
import { ChainExposurePieCard, QuantumAnalyticsDashboard } from './QuantumAnalyticsSuite';
import {
  buildAsset46DayBundle,
  classifyCorrelation,
  computeAssetSharpeRatio,
  computePortfolioCorrelationMatrix,
  formatCompactUsd,
  generateSocialSentimentForAsset,
  type CorrelationBasisMode,
} from '../lib/portfolioAnalytics';
import { buildItemOrbitalSvgMarkup, svgToDataUrl } from '../lib/visualRegistry';
import {
  MarketExchangeHyperScaleExplorer,
  RecentTradesRechartsCard,
} from './MarketExchangePriceTrendAndPages';

const D3CardCorrelationHeatmap: React.FC<{
  rollingValues: number[];
  anchorSymbol: string;
  symbol: string;
  overallR: number;
  basisMode: CorrelationBasisMode;
}> = ({ rollingValues, anchorSymbol, symbol, overallR, basisMode }) => {
  const colorScale = useMemo(
    () => d3.scaleSequential(d3.interpolateRdYlGn).domain([-1, 1]),
    []
  );
  const cells = rollingValues.length > 0 ? rollingValues : [overallR];
  const cellW = 240 / Math.max(1, cells.length);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[9px] font-mono text-[var(--twe-text-muted)]">
        <span>
          D3 Rolling {basisMode === 'mcap' ? 'MCap' : 'Return'} Heatmap ({symbol} vs {anchorSymbol})
        </span>
        <span className="tabular-nums font-semibold text-[var(--twe-text-primary)]">
          r = {overallR >= 0 ? '+' : ''}
          {overallR.toFixed(2)}
        </span>
      </div>
      <svg
        viewBox="0 0 240 16"
        preserveAspectRatio="none"
        className="w-full h-3.5 rounded border border-[var(--twe-border)] overflow-hidden"
        aria-label={`D3 correlation heatmap for ${symbol} vs ${anchorSymbol}`}
      >
        {cells.map((val, idx) => (
          <rect
            key={idx}
            x={idx * cellW}
            y={0}
            width={Math.max(1, cellW + 0.5)}
            height={16}
            fill={colorScale(Math.max(-1, Math.min(1, val)))}
            fillOpacity={0.86}
          >
            <title>{`7D Window #${idx + 1}: Pearson r = ${val >= 0 ? '+' : ''}${val.toFixed(2)}`}</title>
          </rect>
        ))}
      </svg>
    </div>
  );
};

const CanvasDepthChart: React.FC<{
  bids: Array<{ price: number; size: number }>;
  asks: Array<{ price: number; size: number }>;
}> = ({ bids, asks }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const cumBids: Array<{ price: number; cum: number }> = [];
    let bAcc = 0;
    for (const b of bids) {
      bAcc += b.size;
      cumBids.push({ price: b.price, cum: bAcc });
    }
    const cumAsks: Array<{ price: number; cum: number }> = [];
    let aAcc = 0;
    for (const a of [...asks].reverse()) {
      aAcc += a.size;
      cumAsks.push({ price: a.price, cum: aAcc });
    }
    const maxCum = Math.max(bAcc, aAcc, 1);

    // Subtle gridlines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const y = (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const halfW = w / 2 - 4;

    // Bids curve (emerald, right-to-center)
    ctx.beginPath();
    ctx.moveTo(halfW, h);
    cumBids.forEach((pt, idx) => {
      const x = halfW - ((idx + 1) / Math.max(1, cumBids.length)) * halfW;
      const y = h - (pt.cum / maxCum) * (h - 10);
      ctx.lineTo(x, y);
    });
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Asks curve (rose, center-to-right)
    const rightStart = w / 2 + 4;
    ctx.beginPath();
    ctx.moveTo(rightStart, h);
    cumAsks.forEach((pt, idx) => {
      const x = rightStart + ((idx + 1) / Math.max(1, cumAsks.length)) * halfW;
      const y = h - (pt.cum / maxCum) * (h - 10);
      ctx.lineTo(x, y);
    });
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = 'rgba(244, 63, 94, 0.22)';
    ctx.fill();
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }, [bids, asks]);

  return <canvas ref={canvasRef} width={380} height={88} className="w-full h-[88px] rounded" />;
};

export const MarketExchangeView: React.FC<{
  assets: TweAssetRecord[];
  orders: MarketOrder[];
  trades: TradeExecution[];
  recentTrades?: TradeExecution[];
  paperCashUsd: number;
  selectedSymbol?: string;
  onOrderPlaced: () => void;
  onAdvanceTick: () => void;
}> = ({
  assets,
  orders,
  trades,
  recentTrades,
  paperCashUsd,
  selectedSymbol,
  onOrderPlaced,
  onAdvanceTick,
}) => {
  const effectiveRecentTrades = recentTrades ?? trades;
  const [symbol, setSymbol] = useState(selectedSymbol || assets[0]?.symbol || 'TWE-G');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<InstitutionalOrderType>('MARKET');
  const [quantity, setQuantity] = useState('15');
  const [limitPrice, setLimitPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deskTab, setDeskTab] = useState<'orders' | 'fix' | 'ledger'>('orders');

  const [fixSessions, setFixSessions] = useState<FixSessionConfig[]>([]);
  const [newSenderComp, setNewSenderComp] = useState('PRIME_BROKER_NYC');
  const [newFixVersion, setNewFixVersion] = useState<'FIX 4.2' | 'FIX 4.4' | 'FIX 5.0'>('FIX 4.4');
  const [newThrottle, setNewThrottle] = useState('2500');
  const [journalEntries, setJournalEntries] = useState<DoubleEntryJournalRow[]>([]);

  const loadDeskSubData = useCallback(async () => {
    const [fixRes, ledRes] = await Promise.all([
      fetch('/api/twe/fix/sessions'),
      fetch('/api/twe/ledger/entries'),
    ]);
    if (fixRes.ok) {
      const fj = await fixRes.json();
      setFixSessions(fj.sessions ?? []);
    }
    if (ledRes.ok) {
      const lj = await ledRes.json();
      setJournalEntries(lj.entries ?? []);
    }
  }, []);

  useEffect(() => {
    void loadDeskSubData();
  }, [loadDeskSubData, orders.length, trades.length]);

  const activeAsset = useMemo(
    () => assets.find((a) => a.symbol === symbol) ?? assets[0],
    [assets, symbol]
  );

  React.useEffect(() => {
    if (selectedSymbol) setSymbol(selectedSymbol);
  }, [selectedSymbol]);

  React.useEffect(() => {
    if (activeAsset && orderType === 'LIMIT' && !limitPrice) {
      setLimitPrice(String(activeAsset.priceUsd));
    }
  }, [activeAsset, orderType, limitPrice]);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAsset) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/twe/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: activeAsset.symbol,
          side,
          orderType,
          quantity: Number(quantity || 1),
          limitPriceUsd: orderType === 'LIMIT' ? Number(limitPrice || activeAsset.priceUsd) : activeAsset.priceUsd,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Order failed');
      setFeedback(json.notification?.message || `Submitted ${side} ${quantity} ${activeAsset.symbol}`);
      onOrderPlaced();
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : 'Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const res = await fetch(`/api/twe/orders/${orderId}`, { method: 'DELETE' });
    if (res.ok) onOrderPlaced();
  };

  // Simulated Orderbook around activeAsset mark price
  const orderbook = useMemo(() => {
    const mark = activeAsset?.priceUsd ?? 100;
    const asks = [4, 3, 2, 1].map((step) => ({
      price: Number((mark * (1 + step * 0.0018)).toFixed(mark < 10 ? 4 : 2)),
      size: Math.round(180 + step * 95),
    }));
    const bids = [1, 2, 3, 4].map((step) => ({
      price: Number((mark * (1 - step * 0.0018)).toFixed(mark < 10 ? 4 : 2)),
      size: Math.round(210 + step * 110),
    }));
    return { asks, bids };
  }, [activeAsset]);

  if (!activeAsset) return null;

  const positive = activeAsset.change24hPct >= 0;

  return (
    <div className="space-y-4">
      {/* Top Quantitative Header + Wilder RSI Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <select
                aria-label="Select Market Instrument"
                value={activeAsset.symbol}
                onChange={(e) => {
                  setSymbol(e.target.value);
                  setLimitPrice('');
                }}
                className="px-3 py-1.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border-strong)] font-display font-semibold text-sm text-[var(--twe-text-primary)]"
              >
                {assets.map((a) => (
                  <option key={a.id} value={a.symbol}>
                    {a.symbol} — {a.name}
                  </option>
                ))}
              </select>
              <div>
                <div className="font-mono text-xl font-semibold tabular-nums text-[var(--twe-text-primary)]">
                  ${activeAsset.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </div>
                <div className="text-[11px] font-mono text-[var(--twe-text-muted)]">
                  {activeAsset.chain} · {activeAsset.standard} · Vol 24h ${activeAsset.volume24hUsd.toLocaleString('en-US')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                  14-Period Wilder RSI
                </div>
                <RsiSignalLabel rsi={activeAsset.rsi14} />
              </div>
              <button
                type="button"
                onClick={onAdvanceTick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] text-xs font-medium text-[var(--twe-text-primary)] hover:border-[#D4B475] cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
                <span>Advance Tick</span>
              </button>
            </div>
          </div>

          <div className="pt-2">
            <SparklineChart data={activeAsset.sparkline24h} positive={positive} height={175} showTooltip />
          </div>
        </div>

        {/* Simulated Order Ticket */}
        <form
          onSubmit={handleSubmitOrder}
          className="lg:col-span-4 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
              Paper ATS Order Ticket
            </h3>
            <span className="font-mono text-xs tabular-nums text-[var(--twe-text-secondary)]">
              Cash: ${paperCashUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
            {(['BUY', 'SELL'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSide(s)}
                className={`py-1.5 rounded text-xs font-semibold cursor-pointer ${
                  side === s
                    ? s === 'BUY'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-red-600 text-white'
                    : 'text-[var(--twe-text-secondary)]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <label>
              <span className="text-[var(--twe-text-muted)]">Execution Algo / Order Type</span>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as InstitutionalOrderType)}
                className="mt-1 w-full px-2.5 py-1.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-[var(--twe-text-primary)] font-mono"
              >
                <option value="MARKET">MARKET</option>
                <option value="LIMIT">LIMIT</option>
                <option value="PEGGED">PEGGED (Midpoint)</option>
                <option value="ICEBERG">ICEBERG (Hidden)</option>
                <option value="FOK">FOK (Fill-or-Kill)</option>
                <option value="IOC">IOC (Immediate/Cancel)</option>
                <option value="TWAP">TWAP Algo</option>
                <option value="VWAP">VWAP Algo</option>
              </select>
            </label>
            <label>
              <span className="text-[var(--twe-text-muted)]">Quantity ({activeAsset.symbol})</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1 w-full px-2.5 py-1.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono tabular-nums text-[var(--twe-text-primary)]"
              />
            </label>
          </div>

          {(orderType === 'LIMIT' || orderType === 'ICEBERG') && (
            <label className="block text-xs">
              <span className="text-[var(--twe-text-muted)]">Limit Price (USD)</span>
              <input
                type="number"
                step="0.01"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                className="mt-1 w-full px-2.5 py-1.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono tabular-nums text-[var(--twe-text-primary)]"
              />
            </label>
          )}

          <div className="px-2.5 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
            <span>Pre-Trade Compliance</span>
            <span>ERC-3643 · Rule 144 Cleared</span>
          </div>

          <div className="p-2.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] flex items-center justify-between text-xs">
            <span className="text-[var(--twe-text-muted)]">Estimated Notional</span>
            <span className="font-mono font-semibold tabular-nums text-[var(--twe-text-primary)]">
              $
              {(
                Number(quantity || 0) *
                (orderType === 'LIMIT' ? Number(limitPrice || activeAsset.priceUsd) : activeAsset.priceUsd)
              ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Routing Order...' : `Execute ${side} ${activeAsset.symbol}`}
          </button>

          {feedback && (
            <div className="text-[11px] font-mono text-[var(--twe-text-secondary)]">
              {feedback}
            </div>
          )}
        </form>
      </div>

      {/* Recharts Line Chart: Asset Price Trend from recentTrades + live ticker events */}
      <RecentTradesRechartsCard
        activeAsset={activeAsset}
        recentTrades={effectiveRecentTrades}
        onAdvanceTick={onAdvanceTick}
      />

      {/* 14-Period Wilder RSI Multi-Asset Signal Strip */}
      <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
            Quantitative Signal Panel · 14-Period Wilder's RSI & 24h Sparklines
          </h3>
          <span className="text-[11px] text-[var(--twe-text-muted)]">Click any instrument to load ticket</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {assets.slice(0, 8).map((item) => {
            const pos = item.change24hPct >= 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSymbol(item.symbol)}
                className={`text-left p-3 rounded-md border transition-colors cursor-pointer ${
                  item.symbol === activeAsset.symbol
                    ? 'bg-[var(--twe-gold-soft)] border-[#A8843E] dark:border-[#D4B475]'
                    : 'bg-[var(--twe-bg-elevated)] border-[var(--twe-border)] hover:border-[var(--twe-border-strong)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-xs text-[var(--twe-text-primary)]">
                    {item.symbol}
                  </span>
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      pos ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {pos ? '+' : ''}
                    {item.change24hPct.toFixed(2)}%
                  </span>
                </div>
                <div className="my-1.5">
                  <SparklineChart data={item.sparkline24h} positive={pos} height={36} />
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono tabular-nums text-[var(--twe-text-primary)]">
                    ${item.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <RsiSignalLabel rsi={item.rsi14} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Canvas L2/L3 Orderbook Depth + Orders / FIX 4.4 / Double-Entry Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
              Canvas L2/L3 Depth · {activeAsset.symbol}
            </h3>
            <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
              &lt;1ms Match
            </span>
          </div>
          <CanvasDepthChart bids={orderbook.bids} asks={orderbook.asks} />
          <div className="space-y-1 font-mono text-xs tabular-nums">
            {orderbook.asks.map((lvl, idx) => (
              <div key={idx} className="flex justify-between text-red-600 dark:text-red-400">
                <span>${lvl.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                <span className="text-[var(--twe-text-secondary)]">{lvl.size}</span>
              </div>
            ))}
            <div className="py-1 border-y border-[var(--twe-border)] text-center font-semibold text-[#A8843E] dark:text-[#D4B475]">
              Mark ${activeAsset.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            {orderbook.bids.map((lvl, idx) => (
              <div key={idx} className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>${lvl.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                <span className="text-[var(--twe-text-secondary)]">{lvl.size}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-8 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs">
              {(
                [
                  { id: 'orders', label: 'Orders & Tape', icon: Activity },
                  { id: 'fix', label: `FIX 4.2/4.4/5.0 (${fixSessions.length})`, icon: Cable },
                  { id: 'ledger', label: `Double-Entry Ledger (${journalEntries.length})`, icon: BookOpenCheck },
                ] as const
              ).map((tb) => {
                const Icon = tb.icon;
                return (
                  <button
                    key={tb.id}
                    type="button"
                    onClick={() => setDeskTab(tb.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium cursor-pointer ${
                      deskTab === tb.id
                        ? 'bg-[var(--twe-bg-surface)] border border-[#A8843E]/60 dark:border-[#D4B475]/60 text-[var(--twe-text-primary)]'
                        : 'text-[var(--twe-text-muted)] hover:text-[var(--twe-text-primary)]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tb.label}</span>
                  </button>
                );
              })}
            </div>
            <span className="font-mono text-[11px] text-[var(--twe-text-muted)]">
              {orders.filter((o) => o.status === 'OPEN').length} open · {trades.length} fills
            </span>
          </div>

          {deskTab === 'orders' && (
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="border-b border-[var(--twe-border)] text-[var(--twe-text-muted)] uppercase">
                  <tr>
                    <th className="px-4 py-2">Order ID</th>
                    <th className="px-4 py-2">Instrument</th>
                    <th className="px-4 py-2">Side / Algo</th>
                    <th className="px-4 py-2 text-right">Qty</th>
                    <th className="px-4 py-2 text-right">Price</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--twe-border)]">
                  {orders.slice(0, 12).map((ord) => (
                    <tr key={ord.id} className="h-9 hover:bg-[var(--twe-bg-elevated)]">
                      <td className="px-4 py-1.5 font-mono text-[var(--twe-text-muted)]">{ord.id}</td>
                      <td className="px-4 py-1.5 font-mono font-semibold text-[var(--twe-text-primary)]">{ord.symbol}</td>
                      <td
                        className={`px-4 py-1.5 font-mono ${
                          ord.side === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {ord.side} · {ord.orderType}
                      </td>
                      <td className="px-4 py-1.5 text-right font-mono tabular-nums">{ord.quantity}</td>
                      <td className="px-4 py-1.5 text-right font-mono tabular-nums">
                        ${(ord.executedPriceUsd || ord.limitPriceUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-1.5 font-mono text-[var(--twe-text-secondary)]">{ord.status}</td>
                      <td className="px-4 py-1.5 text-right">
                        {ord.status === 'OPEN' ? (
                          <button
                            type="button"
                            onClick={() => handleCancelOrder(ord.id)}
                            className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Cancel
                          </button>
                        ) : (
                          <span className="text-[var(--twe-text-muted)]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {deskTab === 'fix' && (
            <div className="p-4 space-y-3">
              <div className="flex flex-wrap items-end gap-2 text-xs">
                <label>
                  <span className="text-[10px] font-mono text-[var(--twe-text-muted)]">FIX Version</span>
                  <select
                    value={newFixVersion}
                    onChange={(e) => setNewFixVersion(e.target.value as 'FIX 4.2' | 'FIX 4.4' | 'FIX 5.0')}
                    className="mt-1 block px-2 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] font-mono"
                  >
                    <option value="FIX 4.2">FIX 4.2</option>
                    <option value="FIX 4.4">FIX 4.4</option>
                    <option value="FIX 5.0">FIX 5.0</option>
                  </select>
                </label>
                <label className="flex-1 min-w-[140px]">
                  <span className="text-[10px] font-mono text-[var(--twe-text-muted)]">SenderCompID</span>
                  <input
                    type="text"
                    value={newSenderComp}
                    onChange={(e) => setNewSenderComp(e.target.value)}
                    className="mt-1 w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] font-mono"
                  />
                </label>
                <label className="w-28">
                  <span className="text-[10px] font-mono text-[var(--twe-text-muted)]">Max msg/s</span>
                  <input
                    type="number"
                    value={newThrottle}
                    onChange={(e) => setNewThrottle(e.target.value)}
                    className="mt-1 w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] font-mono tabular-nums"
                  />
                </label>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch('/api/twe/fix/sessions', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        version: newFixVersion,
                        senderCompId: newSenderComp,
                        throttleMsgPerSec: Number(newThrottle),
                      }),
                    });
                    void loadDeskSubData();
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Issue Session
                </button>
              </div>

              <div className="overflow-x-auto max-h-52 overflow-y-auto border border-[var(--twe-border)] rounded">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">
                    <tr>
                      <th className="px-3 py-2">Version</th>
                      <th className="px-3 py-2">SenderCompID</th>
                      <th className="px-3 py-2">IP Whitelist</th>
                      <th className="px-3 py-2 text-right">Throttle</th>
                      <th className="px-3 py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--twe-border)] font-mono">
                    {fixSessions.map((fs) => (
                      <tr key={fs.id} className="h-9">
                        <td className="px-3 py-1.5">{fs.version}</td>
                        <td className="px-3 py-1.5 text-[#A8843E] dark:text-[#D4B475]">{fs.senderCompId}</td>
                        <td className="px-3 py-1.5 text-[var(--twe-text-muted)]">{fs.ipWhitelist}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{fs.throttleMsgPerSec}/s</td>
                        <td className="px-3 py-1.5 text-right">
                          <button
                            type="button"
                            onClick={async () => {
                              await fetch(`/api/twe/fix/sessions/${fs.id}/toggle`, { method: 'POST' });
                              void loadDeskSubData();
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                              fs.active
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-[var(--twe-bg-elevated)] text-[var(--twe-text-muted)]'
                            }`}
                          >
                            {fs.active ? 'ACTIVE' : 'PAUSED'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {deskTab === 'ledger' && (
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="border-b border-[var(--twe-border)] text-[var(--twe-text-muted)] uppercase">
                  <tr>
                    <th className="px-3 py-2">Seq</th>
                    <th className="px-3 py-2">Account</th>
                    <th className="px-3 py-2">D/C</th>
                    <th className="px-3 py-2 text-right">USD Amount</th>
                    <th className="px-3 py-2">Asset</th>
                    <th className="px-3 py-2">Memo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--twe-border)] font-mono">
                  {journalEntries.slice(0, 20).map((row) => (
                    <tr key={row.seq} className="h-9 hover:bg-[var(--twe-bg-elevated)]">
                      <td className="px-3 py-1.5 text-[var(--twe-text-muted)]">#{row.seq}</td>
                      <td className="px-3 py-1.5 text-[var(--twe-text-primary)]">{row.account}</td>
                      <td
                        className={`px-3 py-1.5 font-semibold ${
                          row.entryType === 'DEBIT'
                            ? 'text-cyan-600 dark:text-cyan-400'
                            : 'text-[#A8843E] dark:text-[#D4B475]'
                        }`}
                      >
                        {row.entryType}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        ${row.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-1.5">{row.assetSymbol}</td>
                      <td className="px-3 py-1.5 text-[var(--twe-text-secondary)] truncate max-w-[180px]">
                        {row.memo}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Hyper-Scale 590-Digit Market Exchange Trade Tape Webpages */}
      <MarketExchangeHyperScaleExplorer activeSymbol={activeAsset.symbol} />
    </div>
  );
};

export const PortfolioWatchlistView: React.FC<{
  holdings: PortfolioHolding[];
  paperCashUsd: number;
  reservedUsd: number;
  totalNavUsd: number;
  assets: TweAssetRecord[];
  onTradeSymbol: (sym: string) => void;
}> = ({ holdings, paperCashUsd, reservedUsd, totalNavUsd, assets, onTradeSymbol }) => {
  const watchlisted = assets.filter((a) => a.watchlisted);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [volatilityAlertEnabled, setVolatilityAlertEnabled] = useState<boolean>(true);
  const [filterTwoSigmaOnly, setFilterTwoSigmaOnly] = useState<boolean>(false);
  const [correlationMatrixEnabled, setCorrelationMatrixEnabled] = useState<boolean>(false);
  const [correlationBasis, setCorrelationBasis] = useState<CorrelationBasisMode>('mcap');
  const [selectedCorrelationSymbol, setSelectedCorrelationSymbol] = useState<string>(
    () => holdings[0]?.symbol ?? ''
  );
  const [modalSymbol, setModalSymbol] = useState<string | null>(null);
  const [quickSort, setQuickSort] = useState<
    'custom' | 'perf7d' | 'volatility' | 'mcap' | 'sharpe' | 'socialRoi'
  >('custom');
  const [customOrder, setCustomOrder] = useState<string[]>(() => holdings.map((h) => h.symbol));
  const [draggedSymbol, setDraggedSymbol] = useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);
  const [stressPct, setStressPct] = useState<number>(0);
  const [quantumNeutralizer, setQuantumNeutralizer] = useState<boolean>(false);
  const [rsiAlertPrefs, setRsiAlertPrefs] = useState<Record<string, boolean>>({});
  const [livePrices, setLivePrices] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    holdings.forEach((h) => {
      init[h.symbol] = h.markPriceUsd;
    });
    return init;
  });

  // Sync newly added holdings into livePrices & customOrder & ensure selectedCorrelationSymbol stays valid
  useEffect(() => {
    if (holdings.length > 0 && !holdings.some((h) => h.symbol === selectedCorrelationSymbol)) {
      setSelectedCorrelationSymbol(holdings[0].symbol);
    }
    setCustomOrder((prev) => {
      const existing = prev.filter((s) => holdings.some((h) => h.symbol === s));
      const added = holdings.map((h) => h.symbol).filter((s) => !existing.includes(s));
      return added.length > 0 || existing.length !== prev.length ? [...existing, ...added] : prev;
    });
    setLivePrices((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const h of holdings) {
        if (next[h.symbol] === undefined) {
          next[h.symbol] = h.markPriceUsd;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [holdings, selectedCorrelationSymbol]);

  // Real-Time Portfolio Auto-Refresh (10s interval) (Item #18)
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const id = window.setInterval(() => {
      setLivePrices((prev) => {
        const next: Record<string, number> = { ...prev };
        for (const h of holdings) {
          const base = next[h.symbol] ?? h.markPriceUsd;
          const jitter = 1 + (Math.random() - 0.49) * 0.008;
          next[h.symbol] = Number(Math.max(0.01, base * jitter).toFixed(4));
        }
        return next;
      });
    }, 10_000);
    return () => window.clearInterval(id);
  }, [autoRefreshEnabled, holdings]);

  const handleInjectCatalyst = useCallback(
    (sector: string, pct: number) => {
      setLivePrices((prev) => {
        const next = { ...prev };
        for (const h of holdings) {
          const s = `${h.name} ${h.kind} ${h.symbol}`.toLowerCase();
          const match =
            (sector.includes('RWA') && (s.includes('xau') || s.includes('silver') || s.includes('rwa') || s.includes('mao'))) ||
            (sector.includes('AI') && (s.includes('ai') || s.includes('cmdtx') || s.includes('eth'))) ||
            (sector.includes('Energy') && (s.includes('wti') || s.includes('brent') || s.includes('gas') || s.includes('commod'))) ||
            sector.includes('L1');
          if (match) {
            const cur = next[h.symbol] ?? h.markPriceUsd;
            next[h.symbol] = Number(Math.max(0.01, cur * (1 + pct / 100)).toFixed(4));
          }
        }
        return next;
      });
    },
    [holdings]
  );

  const assetBySymbol = useMemo(() => {
    const map = new Map<string, TweAssetRecord>();
    assets.forEach((a) => map.set(a.symbol, a));
    return map;
  }, [assets]);

  const assetBundles = useMemo(() => {
    return holdings.map((h) =>
      buildAsset46DayBundle(h, assetBySymbol.get(h.symbol), livePrices[h.symbol] ?? h.markPriceUsd)
    );
  }, [holdings, assetBySymbol, livePrices]);

  const totalHoldingsValuationUsd = useMemo(
    () => assetBundles.reduce((sum, b) => sum + b.latestPoint.valuationUsd, 0),
    [assetBundles]
  );

  const twoSigmaCount = useMemo(
    () => assetBundles.filter((b) => b.volatility7d.hasTwoSigmaSpike).length,
    [assetBundles]
  );

  const correlationData = useMemo(
    () => computePortfolioCorrelationMatrix(assetBundles, correlationBasis),
    [assetBundles, correlationBasis]
  );

  const activeAnchorSymbol =
    correlationData.symbols.includes(selectedCorrelationSymbol)
      ? selectedCorrelationSymbol
      : correlationData.symbols[0] ?? '';

  const highCorrPeersCount = useMemo(() => {
    if (!activeAnchorSymbol) return 0;
    const row = correlationData.matrix[activeAnchorSymbol] ?? {};
    return Object.entries(row).filter(
      ([sym, r]) => sym !== activeAnchorSymbol && classifyCorrelation(r, false).isHighCorrelation
    ).length;
  }, [correlationData, activeAnchorSymbol]);

  const bundleQuantMetrics = useMemo(() => {
    const map = new Map<string, { sharpe: number; socialScore: number; socialAdjustedRoiPct: number; perf7dPct: number }>();
    for (const b of assetBundles) {
      const sharpe = computeAssetSharpeRatio(b.points31d);
      const sent = generateSocialSentimentForAsset(b.holding.symbol, b.holding.name, b.latestPoint.rsi14);
      const socialMultiplier = 0.85 + (sent.score / 100) * 0.35;
      const socialAdjustedRoiPct = Number((b.latestPoint.roiPct * socialMultiplier).toFixed(2));
      const p0 = b.points7d[0]?.priceUsd ?? b.latestPoint.priceUsd;
      const perf7dPct = p0 > 0 ? ((b.latestPoint.priceUsd - p0) / p0) * 100 : 0;
      map.set(b.holding.symbol, { sharpe, socialScore: sent.score, socialAdjustedRoiPct, perf7dPct });
    }
    return map;
  }, [assetBundles]);

  const displayedBundles = useMemo(() => {
    let list = filterTwoSigmaOnly
      ? assetBundles.filter((b) => b.volatility7d.hasTwoSigmaSpike)
      : [...assetBundles];

    if (quickSort === 'custom') {
      const orderIdx = new Map(customOrder.map((s, idx) => [s, idx]));
      list.sort(
        (a, b) =>
          (orderIdx.get(a.holding.symbol) ?? 999) - (orderIdx.get(b.holding.symbol) ?? 999)
      );
    } else if (quickSort === 'perf7d') {
      list.sort(
        (a, b) =>
          (bundleQuantMetrics.get(b.holding.symbol)?.perf7dPct ?? 0) -
          (bundleQuantMetrics.get(a.holding.symbol)?.perf7dPct ?? 0)
      );
    } else if (quickSort === 'volatility') {
      list.sort((a, b) => b.volatility7d.peakSigma - a.volatility7d.peakSigma);
    } else if (quickSort === 'mcap') {
      list.sort((a, b) => b.latestPoint.marketCapUsd - a.latestPoint.marketCapUsd);
    } else if (quickSort === 'sharpe') {
      list.sort(
        (a, b) =>
          (bundleQuantMetrics.get(b.holding.symbol)?.sharpe ?? 0) -
          (bundleQuantMetrics.get(a.holding.symbol)?.sharpe ?? 0)
      );
    } else if (quickSort === 'socialRoi') {
      list.sort(
        (a, b) =>
          (bundleQuantMetrics.get(b.holding.symbol)?.socialAdjustedRoiPct ?? 0) -
          (bundleQuantMetrics.get(a.holding.symbol)?.socialAdjustedRoiPct ?? 0)
      );
    }
    return list;
  }, [assetBundles, filterTwoSigmaOnly, quickSort, customOrder, bundleQuantMetrics]);

  const handleDownloadCsvReport = () => {
    const header = [
      'Symbol',
      'Name',
      'Chain',
      'Quantity',
      'PriceUSD',
      'ValuationUSD',
      'UnrealizedPnL_USD',
      'ROI_Pct',
      'SocialAdjustedROI_Pct',
      'SharpeRatio',
      'RSI_14',
      'PeakSigma_7D',
      'TwoSigmaSpikes_7D',
    ].join(',');
    const rows = assetBundles.map((b) => {
      const q = bundleQuantMetrics.get(b.holding.symbol);
      return [
        b.holding.symbol,
        `"${b.holding.name.replace(/"/g, '""')}"`,
        b.holding.chain,
        b.holding.quantity,
        b.latestPoint.priceUsd.toFixed(4),
        b.latestPoint.valuationUsd.toFixed(2),
        b.latestPoint.pnlUsd.toFixed(2),
        b.latestPoint.roiPct.toFixed(2),
        (q?.socialAdjustedRoiPct ?? b.latestPoint.roiPct).toFixed(2),
        (q?.sharpe ?? 0).toFixed(2),
        b.latestPoint.rsi14.toFixed(2),
        b.volatility7d.peakSigma.toFixed(2),
        b.volatility7d.twoSigmaSpikeCount,
      ].join(',');
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `twe-portfolio-quant-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeModalBundle = useMemo(
    () => assetBundles.find((b) => b.holding.symbol === modalSymbol) ?? null,
    [assetBundles, modalSymbol]
  );

  return (
    <div className="space-y-4">
      {/* Accreditation & Onboarding Pipeline (Rule 506(c) / Qualified Custody / FinCEN) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4">
          <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">Total Portfolio NAV</div>
          <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[var(--twe-text-primary)]">
            ${totalNavUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4">
          <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">Qualified Custodian USD</div>
          <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#A8843E] dark:text-[#D4B475]">
            ${paperCashUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] font-mono text-[var(--twe-text-muted)] mt-0.5">
            Reserved: ${reservedUsd.toLocaleString('en-US')}
          </div>
        </div>
        <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4">
          <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">SEC Rule 506(c) Status</div>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4" /> Accredited QIB Verified
          </div>
          <div className="text-[11px] text-[var(--twe-text-secondary)] mt-0.5">
            KYC/AML &amp; FinCEN Sanctions Clear
          </div>
        </div>
        <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4">
          <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">DvP Custody Rails</div>
          <div className="mt-1 font-mono text-xs font-semibold text-[var(--twe-text-primary)]">
            Fireblocks · BitGo · TWE Trust
          </div>
          <div className="text-[11px] text-[var(--twe-text-secondary)] mt-0.5">
            ONCHAINID ERC-3643 Whitelisted
          </div>
        </div>
      </div>

      {/* Real-Time Profit & Loss (PnL) Graph & Live Tick Engine */}
      <RealTimePnLGraph
        holdings={holdings}
        assets={assets}
        onTradeSymbol={onTradeSymbol}
        onExpandAsset30Day={(sym) => setModalSymbol(sym)}
        onFocusedSymbolChange={(sym) => setSelectedCorrelationSymbol(sym)}
        livePrices={livePrices}
        onUpdateLivePrices={setLivePrices}
      />

      {/* D3 Radial Risk Gauge & 30D Aggregate Performance Breakdown */}
      <PortfolioRiskGaugeAndBreakdown
        bundles={assetBundles}
        stressPct={stressPct}
        quantumNeutralizer={quantumNeutralizer}
      />

      {/* Portfolio Holdings Toolbar: Asset Cards (D3) vs Table View + Volatility Alert (2σ) */}
      <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
              Institutional Positions, Cost Basis &amp; D3 Quantitative Sparks
            </div>
            <div className="text-[11px] text-[var(--twe-text-muted)] font-mono">
              Click any 7D D3 sparkline to launch full-screen 30-day breakdown &amp; Wilder&apos;s 14D RSI channels
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Sort Menu (Items #13, #54) */}
            <select
              aria-label="Quick sort holdings"
              value={quickSort}
              onChange={(e) => setQuickSort(e.target.value as typeof quickSort)}
              className="px-2.5 py-1 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[11px] font-mono text-[var(--twe-text-primary)] cursor-pointer"
            >
              <option value="custom">Sort: Custom Drag Order</option>
              <option value="perf7d">Sort: 7-Day Performance</option>
              <option value="volatility">Sort: Volatility Spike (σ)</option>
              <option value="mcap">Sort: Market Cap Magnitude</option>
              <option value="sharpe">Sort: Risk-Adjusted Yield (Sharpe)</option>
              <option value="socialRoi">Sort: Social-Adjusted ROI</option>
            </select>

            {/* Auto-Refresh Toggle (Item #18) */}
            <button
              type="button"
              onClick={() => setAutoRefreshEnabled((v) => !v)}
              aria-pressed={autoRefreshEnabled}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-mono whitespace-nowrap cursor-pointer ${
                autoRefreshEnabled
                  ? 'border-emerald-500/45 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-muted)]'
              }`}
            >
              <RefreshCw className={`w-3 h-3 ${autoRefreshEnabled ? 'animate-spin' : ''}`} />
              Auto: {autoRefreshEnabled ? '10s' : 'OFF'}
            </button>

            {/* Download CSV Report (Item #14) */}
            <button
              type="button"
              onClick={handleDownloadCsvReport}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[11px] font-mono text-[var(--twe-text-secondary)] hover:border-[#D4B475] whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3 h-3" />
              Download Report
            </button>

            {/* Correlation Matrix Toggle */}
            <button
              type="button"
              onClick={() => setCorrelationMatrixEnabled((v) => !v)}
              aria-pressed={correlationMatrixEnabled}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono whitespace-nowrap cursor-pointer transition-colors ${
                correlationMatrixEnabled
                  ? 'border-[#A8843E] dark:border-[#D4B475] bg-[var(--twe-gold-soft)] text-[#A8843E] dark:text-[#D4B475] font-semibold'
                  : 'border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-secondary)] hover:border-[#D4B475]'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              Correlation Matrix: {correlationMatrixEnabled ? 'ON' : 'OFF'}
              {correlationMatrixEnabled && (
                <span className="px-1.5 py-0.2 rounded bg-[#A8843E]/20 dark:bg-[#D4B475]/20 text-[10px] tabular-nums">
                  {activeAnchorSymbol} · {highCorrPeersCount}
                </span>
              )}
            </button>

            {/* Volatility Alert (2σ) Toggle */}
            <button
              type="button"
              onClick={() => setVolatilityAlertEnabled((v) => !v)}
              aria-pressed={volatilityAlertEnabled}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-mono whitespace-nowrap cursor-pointer transition-colors ${
                volatilityAlertEnabled
                  ? 'border-rose-500/45 bg-rose-500/12 text-rose-700 dark:text-rose-300 font-semibold'
                  : 'border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-muted)]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Volatility Alert (2σ): {volatilityAlertEnabled ? 'ON' : 'OFF'}
              <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-[10px] tabular-nums">
                {twoSigmaCount}
              </span>
            </button>

            {/* Filter 2σ Chip */}
            <button
              type="button"
              onClick={() => setFilterTwoSigmaOnly((v) => !v)}
              aria-pressed={filterTwoSigmaOnly}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-mono whitespace-nowrap cursor-pointer ${
                filterTwoSigmaOnly
                  ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold'
                  : 'border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-secondary)] hover:border-[#D4B475]'
              }`}
            >
              Filter 2σ ({twoSigmaCount})
            </button>

            {/* Asset Cards (D3) vs Table View Switcher */}
            <div className="inline-flex rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-semibold'
                    : 'text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Asset Cards (D3)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-semibold'
                    : 'text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)]'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                Table View
              </button>
            </div>
          </div>
        </div>

        {/* Correlation Matrix Heatmap Panel (Visible when Correlation Matrix toggle is ON) */}
        {correlationMatrixEnabled && correlationData.symbols.length > 0 && (
          <div className="px-4 py-3.5 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)]/60 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono font-semibold text-[#A8843E] dark:text-[#D4B475]">
                  30D {correlationBasis === 'mcap' ? 'Market Cap History' : 'Daily Return'} Correlation Matrix (D3)
                </span>
                <div className="inline-flex rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] p-0.5 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => setCorrelationBasis('mcap')}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      correlationBasis === 'mcap'
                        ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-semibold'
                        : 'text-[var(--twe-text-muted)]'
                    }`}
                  >
                    Market Cap History
                  </button>
                  <button
                    type="button"
                    onClick={() => setCorrelationBasis('returns')}
                    className={`px-2 py-0.5 rounded cursor-pointer ${
                      correlationBasis === 'returns'
                        ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-semibold'
                        : 'text-[var(--twe-text-muted)]'
                    }`}
                  >
                    Daily Returns
                  </button>
                </div>
                <span className="text-[11px] font-mono text-[var(--twe-text-muted)]">
                  Selected Anchor:{' '}
                  <strong className="text-[var(--twe-text-primary)]">{activeAnchorSymbol}</strong> ·{' '}
                  {highCorrPeersCount} strongly correlated peer(s)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/45 border border-emerald-500/70" />
                  r ≥ +0.60 High Co-Movement
                </span>
                <span className="inline-flex items-center gap-1 text-[var(--twe-text-muted)]">
                  <span className="w-2.5 h-2.5 rounded-sm bg-slate-500/20 border border-slate-500/40" />
                  |r| &lt; 0.25 Uncorrelated
                </span>
                <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/40 border border-rose-500/70" />
                  r ≤ -0.55 Inverse Hedge
                </span>
              </div>
            </div>

            {/* Interactive N x N Correlation Grid + Anchor Selector */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-center">
              <div className="xl:col-span-4 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)] mr-1">
                  Anchor Token:
                </span>
                {correlationData.symbols.map((sym) => {
                  const selected = sym === activeAnchorSymbol;
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => setSelectedCorrelationSymbol(sym)}
                      className={`px-2 py-1 rounded font-mono text-[11px] whitespace-nowrap cursor-pointer border transition-colors ${
                        selected
                          ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] border-[#A8843E] dark:border-[#D4B475] font-semibold'
                          : 'bg-[var(--twe-bg-surface)] text-[var(--twe-text-secondary)] border-[var(--twe-border)] hover:border-[#D4B475]'
                      }`}
                    >
                      {sym}
                    </button>
                  );
                })}
              </div>

              <div className="xl:col-span-8 overflow-x-auto">
                <table className="w-full text-center border-collapse font-mono text-[10px] tabular-nums">
                  <thead>
                    <tr className="text-[var(--twe-text-muted)]">
                      <th className="px-2 py-1 text-left">Pair (r)</th>
                      {correlationData.symbols.map((colSym) => (
                        <th
                          key={colSym}
                          className={`px-2 py-1 cursor-pointer hover:text-[#D4B475] ${
                            colSym === activeAnchorSymbol
                              ? 'text-[#A8843E] dark:text-[#D4B475] font-bold underline'
                              : ''
                          }`}
                          onClick={() => setSelectedCorrelationSymbol(colSym)}
                        >
                          {colSym}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {correlationData.symbols.map((rowSym) => {
                      const isRowActive = rowSym === activeAnchorSymbol;
                      return (
                        <tr
                          key={rowSym}
                          className={
                            isRowActive ? 'bg-[var(--twe-gold-soft)]/50' : ''
                          }
                        >
                          <td
                            onClick={() => setSelectedCorrelationSymbol(rowSym)}
                            className={`px-2 py-1 text-left font-semibold cursor-pointer whitespace-nowrap ${
                              isRowActive
                                ? 'text-[#A8843E] dark:text-[#D4B475]'
                                : 'text-[var(--twe-text-primary)] hover:text-[#D4B475]'
                            }`}
                          >
                            {rowSym}
                          </td>
                          {correlationData.symbols.map((colSym) => {
                            const r = correlationData.matrix[rowSym]?.[colSym] ?? 0;
                            const isSelf = rowSym === colSym;
                            const alpha = isSelf ? 0.16 : Math.min(0.55, Math.abs(r) * 0.58 + 0.05);
                            const cellBg = isSelf
                              ? 'rgba(212, 180, 117, 0.20)'
                              : r >= 0.25
                              ? `rgba(16, 185, 129, ${alpha.toFixed(2)})`
                              : r <= -0.22
                              ? `rgba(244, 63, 94, ${alpha.toFixed(2)})`
                              : 'rgba(148, 163, 184, 0.08)';
                            const isHighlightedCell =
                              !isSelf &&
                              (rowSym === activeAnchorSymbol || colSym === activeAnchorSymbol) &&
                              Math.abs(r) >= 0.55;

                            return (
                              <td
                                key={`${rowSym}-${colSym}`}
                                onClick={() => setSelectedCorrelationSymbol(rowSym)}
                                title={`${rowSym} vs ${colSym}: Pearson r = ${r >= 0 ? '+' : ''}${r.toFixed(2)} (Click to select ${rowSym})`}
                                style={{ backgroundColor: cellBg }}
                                className={`px-2 py-1 border border-[var(--twe-border)] cursor-pointer transition-all ${
                                  isHighlightedCell
                                    ? 'font-bold text-[var(--twe-text-primary)] ring-1 ring-inset ring-emerald-400/70'
                                    : isSelf
                                    ? 'font-bold text-[#A8843E] dark:text-[#D4B475]'
                                    : 'text-[var(--twe-text-primary)]'
                                }`}
                              >
                                {isSelf ? '1.00' : `${r >= 0 ? '+' : ''}${r.toFixed(2)}`}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Asset Cards (D3) Grid View */}
        {viewMode === 'cards' && (
          <div className="p-4">
            {displayedBundles.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-[var(--twe-text-muted)]">
                No portfolio holdings currently exhibit a ≥2.0σ extreme volatility shock in the 7-day window.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {displayedBundles.map((bundle) => {
                  const { holding, asset, latestPoint, points7d, volatility7d } = bundle;
                  const gain = latestPoint.pnlUsd >= 0;
                  const weightPct =
                    totalHoldingsValuationUsd > 0
                      ? (latestPoint.valuationUsd / totalHoldingsValuationUsd) * 100
                      : 0;
                  const isShockAlert = volatilityAlertEnabled && volatility7d.hasTwoSigmaSpike;
                  const avatarUrl = svgToDataUrl(
                    buildItemOrbitalSvgMarkup({
                      ticker: holding.symbol,
                      title: holding.name,
                      subtitle: holding.chain,
                    })
                  );
                  const change24h = asset?.change24hPct ?? latestPoint.dailyReturnPct;

                  // Correlation Matrix Heatmap Overlay state for this card
                  const isAnchor = holding.symbol === activeAnchorSymbol;
                  const corrVal =
                    correlationData.matrix[activeAnchorSymbol]?.[holding.symbol] ?? (isAnchor ? 1 : 0);
                  const rollingCorrSeries =
                    correlationData.rollingMatrix[activeAnchorSymbol]?.[holding.symbol] ?? [corrVal];
                  const corrInfo = classifyCorrelation(corrVal, isAnchor);
                  const d3HeatTint = d3.color(d3.interpolateRdYlGn((corrVal + 1) / 2));
                  if (d3HeatTint) {
                    d3HeatTint.opacity = isAnchor ? 0.16 : Math.min(0.24, Math.abs(corrVal) * 0.24 + 0.04);
                  }

                  const cardHeatmapOverlayStyle: React.CSSProperties | undefined =
                    correlationMatrixEnabled
                      ? {
                          backgroundImage: isAnchor
                            ? 'linear-gradient(135deg, rgba(212, 180, 117, 0.20) 0%, rgba(212, 180, 117, 0.04) 70%)'
                            : `linear-gradient(135deg, ${d3HeatTint?.formatRgb() ?? 'rgba(148,163,184,0.1)'} 0%, transparent 72%)`,
                        }
                      : undefined;

                  const cardBorderClass = correlationMatrixEnabled
                    ? isAnchor
                      ? 'border-[#A8843E] dark:border-[#D4B475] ring-2 ring-[#D4B475]/45 shadow-lg'
                      : corrInfo.tier === 'high-positive'
                      ? 'border-emerald-500/80 ring-2 ring-emerald-500/35 shadow-md'
                      : corrInfo.tier === 'high-inverse'
                      ? 'border-rose-500/75 ring-2 ring-rose-500/30 shadow-md'
                      : 'border-[var(--twe-border)] opacity-85 hover:opacity-100'
                    : isShockAlert
                    ? 'border-rose-500/65 animate-sigma-pulse'
                    : 'border-[var(--twe-border)] hover:border-[#A8843E]/60 dark:hover:border-[#D4B475]/60';

                  const quantMeta = bundleQuantMetrics.get(holding.symbol);
                  const socialRoi = quantMeta?.socialAdjustedRoiPct ?? latestPoint.roiPct;
                  return (
                    <motion.div
                      layout
                      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                      key={holding.symbol}
                      draggable
                      onDragStart={() => setDraggedSymbol(holding.symbol)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (!draggedSymbol || draggedSymbol === holding.symbol) return;
                        setQuickSort('custom');
                        setCustomOrder((prev) => {
                          const arr = prev.filter((s) => s !== draggedSymbol);
                          const targetIdx = arr.indexOf(holding.symbol);
                          arr.splice(targetIdx >= 0 ? targetIdx : arr.length, 0, draggedSymbol);
                          return arr;
                        });
                        setDraggedSymbol(null);
                      }}
                      style={cardHeatmapOverlayStyle}
                      onClick={() => {
                        if (correlationMatrixEnabled) {
                          setSelectedCorrelationSymbol(holding.symbol);
                        }
                      }}
                      className={`relative rounded-lg border bg-[var(--twe-bg-surface)] p-4 flex flex-col justify-between gap-3 transition-colors ${
                        draggedSymbol === holding.symbol ? 'opacity-60 ring-2 ring-[#D4B475]' : ''
                      } ${correlationMatrixEnabled ? 'cursor-pointer' : ''} ${cardBorderClass}`}
                    >
                      {/* D3 Correlation Matrix Heatmap Overlay on Asset Card */}
                      {correlationMatrixEnabled && (
                        <div className="space-y-2">
                          <div
                            className={`px-2.5 py-1.5 rounded border flex items-center justify-between gap-2 text-[10px] font-mono ${
                              isAnchor
                                ? 'bg-[#A8843E]/15 dark:bg-[#D4B475]/18 border-[#D4B475]/55 text-[#A8843E] dark:text-[#D4B475]'
                                : corrInfo.tier === 'high-positive'
                                ? 'bg-emerald-500/16 border-emerald-500/45 text-emerald-700 dark:text-emerald-300'
                                : corrInfo.tier === 'high-inverse'
                                ? 'bg-rose-500/16 border-rose-500/45 text-rose-700 dark:text-rose-300'
                                : 'bg-[var(--twe-bg-elevated)] border-[var(--twe-border)] text-[var(--twe-text-secondary)]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <GitCompare className="w-3 h-3 shrink-0" />
                              <span className="font-semibold truncate">
                                {isAnchor
                                  ? `SELECTED ANCHOR`
                                  : `${corrInfo.label.toUpperCase()} vs ${activeAnchorSymbol}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="font-bold tabular-nums">
                                r = {corrVal >= 0 ? '+' : ''}
                                {corrVal.toFixed(2)}
                              </span>
                              {!isAnchor && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCorrelationSymbol(holding.symbol);
                                  }}
                                  className="px-1.5 py-0.2 rounded border border-current/35 hover:bg-white/10 text-[9px] font-semibold cursor-pointer"
                                >
                                  Anchor
                                </button>
                              )}
                            </div>
                          </div>

                          <D3CardCorrelationHeatmap
                            rollingValues={rollingCorrSeries}
                            anchorSymbol={activeAnchorSymbol}
                            symbol={holding.symbol}
                            overallR={corrVal}
                            basisMode={correlationBasis}
                          />
                        </div>
                      )}

                      {/* Optional 2σ Spike Alert Banner */}
                      {isShockAlert && (
                        <div className="px-2.5 py-1.5 rounded bg-rose-500/12 border border-rose-500/35 flex items-center justify-between text-[10px] font-mono text-rose-700 dark:text-rose-300">
                          <span className="inline-flex items-center gap-1 font-semibold">
                            <Zap className="w-3 h-3 text-rose-500" />
                            2σ VOLATILITY SPIKE ALERT
                          </span>
                          <span className="tabular-nums font-bold">
                            Peak {volatility7d.peakSigma.toFixed(2)}σ ({volatility7d.twoSigmaSpikeCount}×)
                          </span>
                        </div>
                      )}

                      {/* Card Header: Avatar + Symbol/Badges + Price/24h Delta */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={avatarUrl}
                            alt={`${holding.symbol} emblem`}
                            className="w-10 h-10 rounded-full border border-[var(--twe-border)] shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-sm text-[var(--twe-text-primary)]">
                                {holding.symbol}
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 text-[9px] font-mono font-semibold">
                                VERIFIED
                              </span>
                            </div>
                            <div className="text-[11px] text-[var(--twe-text-muted)] truncate">
                              {holding.name} · {holding.chain}
                            </div>
                          </div>
                        </div>

                        <div className="text-right font-mono tabular-nums shrink-0">
                          <div className="text-sm font-semibold text-[var(--twe-text-primary)]">
                            ${latestPoint.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div
                            className={`text-[10px] ${
                              change24h >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {change24h >= 0 ? '+' : ''}
                            {change24h.toFixed(2)}% (24h)
                          </div>
                        </div>
                      </div>

                      {/* Position Holdings Metrics */}
                      <div className="grid grid-cols-3 gap-2 px-2.5 py-2 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-[11px] font-mono">
                        <div>
                          <div className="text-[9px] uppercase text-[var(--twe-text-muted)]">Quantity</div>
                          <div className="font-semibold tabular-nums text-[var(--twe-text-primary)]">
                            {holding.quantity.toLocaleString('en-US')}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase text-[var(--twe-text-muted)]">Valuation</div>
                          <div className="font-semibold tabular-nums text-[var(--twe-text-primary)]">
                            {formatCompactUsd(latestPoint.valuationUsd)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] uppercase text-[var(--twe-text-muted)]">Net PnL</div>
                          <div
                            className={`font-semibold tabular-nums ${
                              gain ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {gain ? '+' : ''}
                            {formatCompactUsd(latestPoint.pnlUsd)}
                          </div>
                        </div>
                      </div>

                      {/* Embedded D3 7-Day Sparkline Overlay */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <D3TokenPnLSparkline
                          symbol={holding.symbol}
                          points={points7d}
                          height={78}
                          showVolatilityAlerts={volatilityAlertEnabled}
                          onExpand30Day={() => setModalSymbol(holding.symbol)}
                        />
                      </div>

                      {/* Correlation Bar OR Portfolio Weight Progress Bar */}
                      {correlationMatrixEnabled ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono text-[var(--twe-text-muted)]">
                            <span>Co-Movement Heatmap Strength</span>
                            <span className="tabular-nums text-[var(--twe-text-primary)] font-semibold">
                              {(Math.abs(corrVal) * 100).toFixed(0)}% ({corrVal >= 0 ? '+' : ''}
                              {corrVal.toFixed(2)})
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[var(--twe-bg-muted)] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isAnchor
                                  ? 'bg-[#D4B475]'
                                  : corrVal >= 0.6
                                  ? 'bg-emerald-500'
                                  : corrVal >= 0.25
                                  ? 'bg-sky-500'
                                  : corrVal <= -0.22
                                  ? 'bg-rose-500'
                                  : 'bg-slate-400'
                              }`}
                              style={{ width: `${Math.max(4, Math.abs(corrVal) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono text-[var(--twe-text-muted)]">
                            <span>Portfolio Weight</span>
                            <span className="tabular-nums text-[var(--twe-text-primary)] font-semibold">
                              {weightPct.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[var(--twe-bg-muted)] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#A8843E] dark:bg-[#D4B475]"
                              style={{ width: `${Math.min(100, Math.max(2, weightPct))}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Quick Action Footer */}
                      <div className="pt-2 border-t border-[var(--twe-border)] flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--twe-text-muted)]">
                          <span title="Drag card to reorder">
                            <GripVertical className="w-3.5 h-3.5 opacity-60 cursor-grab" />
                          </span>
                          <span>
                            RSI(14):{' '}
                            <strong
                              className={
                                latestPoint.rsi14 <= 30
                                  ? 'text-emerald-500'
                                  : latestPoint.rsi14 >= 70
                                  ? 'text-rose-500'
                                  : 'text-[var(--twe-text-primary)]'
                              }
                            >
                              {latestPoint.rsi14.toFixed(1)}
                            </strong>
                          </span>
                          <span>
                            Soc-ROI:{' '}
                            <strong className={socialRoi >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                              {socialRoi >= 0 ? '+' : ''}
                              {socialRoi}%
                            </strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setModalSymbol(holding.symbol);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[var(--twe-border-strong)] hover:border-[#D4B475] text-[11px] font-mono whitespace-nowrap cursor-pointer"
                          >
                            <Maximize2 className="w-3 h-3" /> 30D View
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTradeSymbol(holding.symbol);
                            }}
                            className="px-2.5 py-1 rounded bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-[11px] font-semibold whitespace-nowrap cursor-pointer"
                          >
                            Trade
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Table View (Includes 7D PnL Trend (D3) & Optional Correlation vs Selected Anchor Column) */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="border-b border-[var(--twe-border)] text-[var(--twe-text-muted)] uppercase">
                <tr>
                  <th className="px-4 py-2.5">Asset</th>
                  <th className="px-4 py-2.5">Network</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2.5 text-right">Live Mark Price</th>
                  <th className="px-4 py-2.5 text-right">Market Value</th>
                  <th className="px-4 py-2.5 text-right">Unrealized P&amp;L</th>
                  <th className="px-4 py-2.5 text-right">Sharpe (Yield)</th>
                  {correlationMatrixEnabled && (
                    <th className="px-4 py-2.5 text-right">Corr ({activeAnchorSymbol})</th>
                  )}
                  <th className="px-4 py-2.5 min-w-[180px]">7D PnL Trend (D3)</th>
                  <th className="px-4 py-2.5 text-right">Rule 144 Lockup</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--twe-border)]">
                {displayedBundles.map((bundle) => {
                  const { holding: h, latestPoint, points7d, volatility7d } = bundle;
                  const gain = latestPoint.pnlUsd >= 0;
                  const lockDays = h.rule144LockupDaysRemaining ?? 0;
                  const isAnchor = h.symbol === activeAnchorSymbol;
                  const corrVal =
                    correlationData.matrix[activeAnchorSymbol]?.[h.symbol] ?? (isAnchor ? 1 : 0);
                  const corrInfo = classifyCorrelation(corrVal, isAnchor);
                  const sharpeVal = bundleQuantMetrics.get(h.symbol)?.sharpe ?? 0;
                  return (
                    <tr
                      key={h.symbol}
                      onClick={() => {
                        if (correlationMatrixEnabled) {
                          setSelectedCorrelationSymbol(h.symbol);
                        }
                      }}
                      className={`transition-colors ${
                        correlationMatrixEnabled ? 'cursor-pointer' : ''
                      } ${
                        correlationMatrixEnabled && isAnchor
                          ? 'bg-[var(--twe-gold-soft)]/70'
                          : correlationMatrixEnabled && corrInfo.tier === 'high-positive'
                          ? 'bg-emerald-500/8'
                          : 'hover:bg-[var(--twe-bg-elevated)]'
                      }`}
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-[var(--twe-text-primary)]">
                            {h.symbol}
                          </span>
                          {volatilityAlertEnabled && volatility7d.hasTwoSigmaSpike && (
                            <span className="px-1 py-0.2 rounded bg-rose-500/15 text-rose-500 font-mono text-[9px] font-semibold">
                              2σ
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[var(--twe-text-muted)]">{h.name}</div>
                      </td>
                      <td className="px-4 py-2 text-[var(--twe-text-secondary)]">{h.chain}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums">
                        {h.quantity.toLocaleString('en-US')}
                      </td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums">
                        ${latestPoint.priceUsd.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums font-semibold">
                        ${latestPoint.valuationUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td
                        className={`px-4 py-2 text-right font-mono tabular-nums ${
                          gain ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {gain ? '+' : ''}$
                        {latestPoint.pnlUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })} (
                        {latestPoint.roiPct.toFixed(2)}%)
                      </td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums font-semibold text-[#A8843E] dark:text-[#D4B475]">
                        {sharpeVal.toFixed(2)}
                      </td>
                      {correlationMatrixEnabled && (
                        <td className="px-4 py-2 text-right font-mono tabular-nums">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              isAnchor
                                ? 'bg-[#A8843E]/20 text-[#A8843E] dark:text-[#D4B475]'
                                : corrInfo.tier === 'high-positive'
                                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                : corrInfo.tier === 'high-inverse'
                                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                                : 'bg-[var(--twe-bg-elevated)] text-[var(--twe-text-muted)]'
                            }`}
                          >
                            {isAnchor ? 'ANCHOR' : `${corrVal >= 0 ? '+' : ''}${corrVal.toFixed(2)}`}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-1.5" onClick={(e) => e.stopPropagation()}>
                        <D3TokenPnLSparkline
                          symbol={h.symbol}
                          points={points7d}
                          height={46}
                          compact
                          showVolatilityAlerts={volatilityAlertEnabled}
                          onExpand30Day={() => setModalSymbol(h.symbol)}
                        />
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-[11px]">
                        {lockDays === 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400">Free-Trading</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#A8843E] dark:text-[#D4B475]">
                            <Clock className="w-3 h-3" /> {lockDays}d
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setModalSymbol(h.symbol);
                            }}
                            className="px-2 py-1 rounded border border-[var(--twe-border-strong)] hover:border-[#D4B475] font-mono text-[10px] cursor-pointer"
                          >
                            30D
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTradeSymbol(h.symbol);
                            }}
                            className="px-2.5 py-1 rounded border border-[var(--twe-border-strong)] hover:border-[#D4B475] cursor-pointer"
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
        )}
      </div>

      {/* Quantitative Workbench: Rebalancer, Tax, Stress-Test, Sovereign Treemap, On-Chain Feed & RSI Alerts */}
      <PortfolioQuantWorkbench
        bundles={assetBundles}
        onTradeSymbol={onTradeSymbol}
        stressPct={stressPct}
        onStressPctChange={setStressPct}
        quantumNeutralizer={quantumNeutralizer}
        onQuantumNeutralizerChange={setQuantumNeutralizer}
        onInjectCatalyst={handleInjectCatalyst}
        rsiAlertPrefs={rsiAlertPrefs}
        onToggleRsiAlertAsset={(sym) =>
          setRsiAlertPrefs((prev) => ({ ...prev, [sym]: !(prev[sym] ?? true) }))
        }
      />

      {/* Watchlist */}
      <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4 space-y-3">
        <div className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
          Watchlisted Instruments ({watchlisted.length})
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {watchlisted.map((w) => {
            const pos = w.change24hPct >= 0;
            return (
              <div
                key={w.id}
                className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono font-semibold text-xs text-[var(--twe-text-primary)]">{w.symbol}</div>
                    <div className="text-[11px] text-[var(--twe-text-muted)]">{w.name}</div>
                  </div>
                  <div className="text-right font-mono text-xs tabular-nums">
                    <div>${w.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                    <div className={pos ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                      {pos ? '+' : ''}
                      {w.change24hPct.toFixed(2)}%
                    </div>
                  </div>
                </div>
                <SparklineChart data={w.sparkline24h} positive={pos} height={42} />
                <div className="flex items-center justify-between pt-1 text-[10px] font-mono">
                  <span className="text-[var(--twe-text-muted)]">MCap {formatCompactUsd(w.marketCapUsd)}</span>
                  <button
                    type="button"
                    onClick={() => onTradeSymbol(w.symbol)}
                    className="text-[#A8843E] dark:text-[#D4B475] font-semibold hover:underline cursor-pointer"
                  >
                    Trade →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full-Screen 30-Day Performance & Wilder RSI Breakdown Modal */}
      <Asset30DayPerformanceModal
        bundle={activeModalBundle}
        onClose={() => setModalSymbol(null)}
        onTradeSymbol={onTradeSymbol}
      />
    </div>
  );
};

export const RiskSecurityView: React.FC<{
  holdings?: PortfolioHolding[];
  assets?: TweAssetRecord[];
}> = ({ holdings = [], assets = [] }) => {
  // ERC-20 0xa9059cbb Calldata Auditor
  const [calldata, setCalldata] = useState(
    '0xa9059cbb00000000000000000000000071c7656ec7ab88b098defb751b7401b5f6d8976f0000000000000000000000000000000000000000000000056bc75e2d63100000'
  );

  // Constant-Product AMM (x * y = k)
  const [reserveX, setReserveX] = useState('500000');
  const [reserveY, setReserveY] = useState('12000000');
  const [dxInput, setDxInput] = useState('12500');
  const [feeBps, setFeeBps] = useState('30');

  const calldataAudit = useMemo(() => {
    const clean = calldata.trim().toLowerCase().replace(/^0x/, '');
    const selector = clean.slice(0, 8);
    const validSelector = selector === 'a9059cbb';
    const validLength = clean.length === 136; // 4 bytes selector + 32 bytes addr + 32 bytes uint256 = 68 bytes = 136 hex chars
    const recipientSlot = clean.slice(8, 72);
    const amountSlot = clean.slice(72, 136);
    const recipient = recipientSlot.length === 64 ? `0x${recipientSlot.slice(24)}` : 'Invalid';
    const isZeroAddr = recipient === '0x0000000000000000000000000000000000000000';
    let rawAmount = '0';
    let formatted18 = '0';
    try {
      if (amountSlot.length === 64) {
        const bi = BigInt(`0x${amountSlot}`);
        rawAmount = bi.toString();
        const whole = bi / 10n ** 18n;
        const frac = (bi % 10n ** 18n).toString().padStart(18, '0').slice(0, 6);
        formatted18 = `${whole.toLocaleString('en-US')}.${frac}`;
      }
    } catch {
      rawAmount = 'Parse Error';
    }

    const flags: string[] = [];
    if (!validSelector) flags.push('Selector mismatch: expected 0xa9059cbb (transfer(address,uint256)).');
    if (!validLength) flags.push(`Unexpected byte length (${clean.length / 2} bytes; standard ERC-20 transfer is 68 bytes).`);
    if (isZeroAddr) flags.push('CRITICAL: Recipient is the zero burn address (0x000...000).');
    if (recipientSlot.length === 64 && !/^0{24}/.test(recipientSlot)) {
      flags.push('WARNING: Non-zero upper 12 padding bytes detected in address slot.');
    }

    return {
      selector: `0x${selector}`,
      validSelector,
      validLength,
      recipient,
      rawAmount,
      formatted18,
      flags,
      passed: validSelector && validLength && flags.length === 0,
    };
  }, [calldata]);

  const ammStats = useMemo(() => {
    const x = Math.max(1, Number(reserveX) || 1);
    const y = Math.max(1, Number(reserveY) || 1);
    const dx = Math.max(0, Number(dxInput) || 0);
    const bps = Math.max(0, Math.min(500, Number(feeBps) || 0));

    const k = x * y;
    const dxAfterFee = dx * (1 - bps / 10000);
    const dy = (y * dxAfterFee) / (x + dxAfterFee);
    const spotPrice = y / x;
    const execPrice = dx > 0 ? dy / dx : spotPrice;
    const priceImpactPct = dx > 0 ? Math.max(0, ((spotPrice - execPrice) / spotPrice) * 100) : 0;

    return {
      k,
      dy,
      spotPrice,
      execPrice,
      priceImpactPct,
      newX: x + dx,
      newY: y - dy,
    };
  }, [reserveX, reserveY, dxInput, feeBps]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ERC-20 0xa9059cbb Calldata Auditor */}
        <div className="lg:col-span-6 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 font-display font-semibold text-sm text-[var(--twe-text-primary)]">
              <ShieldAlert className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
              <span>ERC-20 0xa9059cbb Calldata Security Auditor</span>
            </div>
            <button
              type="button"
              onClick={() =>
                setCalldata(
                  '0xa9059cbb00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000056bc75e2d63100000'
                )
              }
              className="text-[11px] text-[#A8843E] dark:text-[#D4B475] underline cursor-pointer"
            >
              Test Zero-Address Anomaly
            </button>
          </div>

          <label className="block text-xs">
            <span className="text-[var(--twe-text-muted)]">Raw Hex Calldata</span>
            <textarea
              rows={3}
              value={calldata}
              onChange={(e) => setCalldata(e.target.value)}
              className="mt-1 w-full p-2.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-xs text-[var(--twe-text-primary)] break-all"
            />
          </label>

          <div className="p-3.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[var(--twe-text-muted)]">Audit Verdict</span>
              {calldataAudit.passed ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Clean 0xa9059cbb Transfer
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" /> Security Flag Raised
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-1.5 font-mono pt-1 border-t border-[var(--twe-border)]">
              <div>
                <span className="text-[var(--twe-text-muted)]">Selector: </span>
                <span className="text-[var(--twe-text-primary)]">{calldataAudit.selector}</span>
              </div>
              <div className="break-all">
                <span className="text-[var(--twe-text-muted)]">Recipient: </span>
                <span className="text-[var(--twe-text-primary)]">{calldataAudit.recipient}</span>
              </div>
              <div>
                <span className="text-[var(--twe-text-muted)]">18-Dec Amount: </span>
                <span className="text-[#A8843E] dark:text-[#D4B475]">{calldataAudit.formatted18} tokens</span>
              </div>
              <div className="break-all">
                <span className="text-[var(--twe-text-muted)]">Raw uint256: </span>
                <span className="text-[var(--twe-text-secondary)]">{calldataAudit.rawAmount}</span>
              </div>
            </div>

            {calldataAudit.flags.length > 0 && (
              <ul className="pt-2 border-t border-[var(--twe-border)] space-y-1 text-red-600 dark:text-red-400">
                {calldataAudit.flags.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Constant-Product AMM (x * y = k) Simulator */}
        <div className="lg:col-span-6 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-5 space-y-4">
          <div className="inline-flex items-center gap-2 font-display font-semibold text-sm text-[var(--twe-text-primary)]">
            <ArrowRightLeft className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
            <span>Constant-Product AMM (x × y = k) Impact Simulator</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <label>
              <span className="text-[var(--twe-text-muted)]">Pool Reserve X (Token)</span>
              <input
                type="number"
                value={reserveX}
                onChange={(e) => setReserveX(e.target.value)}
                className="mt-1 w-full px-3 py-1.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono tabular-nums text-[var(--twe-text-primary)]"
              />
            </label>
            <label>
              <span className="text-[var(--twe-text-muted)]">Pool Reserve Y (USD-TWE)</span>
              <input
                type="number"
                value={reserveY}
                onChange={(e) => setReserveY(e.target.value)}
                className="mt-1 w-full px-3 py-1.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono tabular-nums text-[var(--twe-text-primary)]"
              />
            </label>
            <label>
              <span className="text-[var(--twe-text-muted)]">Swap Input dx (Token)</span>
              <input
                type="number"
                value={dxInput}
                onChange={(e) => setDxInput(e.target.value)}
                className="mt-1 w-full px-3 py-1.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono tabular-nums text-[var(--twe-text-primary)]"
              />
            </label>
            <label>
              <span className="text-[var(--twe-text-muted)]">Pool Fee (bps)</span>
              <input
                type="number"
                value={feeBps}
                onChange={(e) => setFeeBps(e.target.value)}
                className="mt-1 w-full px-3 py-1.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono tabular-nums text-[var(--twe-text-primary)]"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-xs font-mono tabular-nums">
            <div>
              <div className="text-[11px] text-[var(--twe-text-muted)]">Invariant k = x × y</div>
              <div className="mt-0.5 text-[var(--twe-text-primary)]">{ammStats.k.toExponential(4)}</div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--twe-text-muted)]">Expected Output dy</div>
              <div className="mt-0.5 font-semibold text-[#A8843E] dark:text-[#D4B475]">
                {ammStats.dy.toLocaleString('en-US', { maximumFractionDigits: 2 })} USD-TWE
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--twe-text-muted)]">Spot vs Exec Price</div>
              <div className="mt-0.5 text-[var(--twe-text-primary)]">
                ${ammStats.spotPrice.toFixed(2)} → ${ammStats.execPrice.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--twe-text-muted)]">Price Impact</div>
              <div
                className={`mt-0.5 font-semibold ${
                  ammStats.priceImpactPct > 1.5
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {ammStats.priceImpactPct.toFixed(3)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive D3 Multi-Chain Exposure Pie Chart (Item #76) */}
      <ChainExposurePieCard holdings={holdings} />

      {/* Quantum Entropy Metrics, Entanglement Map & Cross-Asset Entropy Matrix */}
      <QuantumAnalyticsDashboard holdings={holdings} assets={assets} />
    </div>
  );
};
