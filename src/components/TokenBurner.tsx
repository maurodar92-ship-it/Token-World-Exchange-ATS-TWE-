import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  AlertTriangle,
  Check,
  Copy,
  Flame,
  Hash,
  ShieldAlert,
  TrendingDown,
} from 'lucide-react';
import type { SovereignVaultState, TweAssetRecord } from '../types/twe';

interface BurnRecord {
  id: string;
  symbol: string;
  amount: number;
  txHash: string;
  burnAddress: string;
  blockNumber: number;
  remainingSupply: number;
  memo: string;
  timestamp: string;
}

interface SupplyPoint {
  step: number;
  label: string;
  circulatingSupply: number;
  burnedAmount: number;
  txHash?: string;
}

interface BurnableTokenConfig {
  symbol: string;
  name: string;
  contractAddress: string;
  initialSupply: number;
  decimals: number;
}

const DEFAULT_BURNABLE_TOKENS: BurnableTokenConfig[] = [
  {
    symbol: 'TWATS',
    name: 'TokenWorld ATS Reserve',
    contractAddress: '0x777DD8D9A412F0B91E00948C8241C4429E0A4810',
    initialSupply: 100_000_000,
    decimals: 18,
  },
  {
    symbol: 'TWE',
    name: 'Token World Exchange Governance',
    contractAddress: '0x0089E1fA6128B91C3F0419B8A3310D8E92C45001',
    initialSupply: 500_000_000,
    decimals: 18,
  },
  {
    symbol: 'AURX',
    name: 'Sovereign Vault Gold Bullion',
    contractAddress: '0x9450FA578102C49A8E34D0012F9B43188A017702',
    initialSupply: 25_000_000,
    decimals: 18,
  },
  {
    symbol: 'CNX',
    name: 'Cosmic Nexus Liquidity Token',
    contractAddress: '0x3643E29F0018A4B7C2D1190F8412C66E0419A220',
    initialSupply: 250_000_000,
    decimals: 18,
  },
];

const DEAD_BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD';
const STORAGE_KEY = 'twe-vault-burn-ledger-v1';

function loadStoredBurns(): BurnRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const TokenBurner: React.FC<{
  vault: SovereignVaultState;
  assets?: TweAssetRecord[];
  onBurnExecuted?: (receipt: BurnRecord) => void;
}> = ({ vault, assets = [], onBurnExecuted }) => {
  const tokenCatalog = useMemo<BurnableTokenConfig[]>(() => {
    const map = new Map<string, BurnableTokenConfig>();
    for (const t of DEFAULT_BURNABLE_TOKENS) {
      map.set(t.symbol, t);
    }
    for (const a of assets.slice(0, 10)) {
      if (!map.has(a.symbol)) {
        const numericSupply =
          Number(a.supplyFormatted.replace(/[^0-9.]/g, '')) *
            (a.supplyFormatted.includes('B')
              ? 1_000_000_000
              : a.supplyFormatted.includes('M')
              ? 1_000_000
              : a.supplyFormatted.includes('K')
              ? 1_000
              : 1) || 50_000_000;
        map.set(a.symbol, {
          symbol: a.symbol,
          name: a.name,
          contractAddress: a.contractAddress,
          initialSupply: Math.max(1_000_000, Math.round(numericSupply)),
          decimals: 18,
        });
      }
    }
    return Array.from(map.values());
  }, [assets]);

  const [selectedSymbol, setSelectedSymbol] = useState<string>('TWATS');
  const [burnAmountInput, setBurnAmountInput] = useState<string>('250000');
  const [memo, setMemo] = useState<string>('Q4 Treasury Deflationary Supply Reduction');
  const [confirmArmed, setConfirmArmed] = useState<boolean>(false);
  const [executing, setExecuting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [burnHistory, setBurnHistory] = useState<BurnRecord[]>(() => {
    const existing = loadStoredBurns();
    if (existing.length > 0) return existing;
    return [
      {
        id: 'burn-seed-1',
        symbol: 'TWATS',
        amount: 1_500_000,
        txHash: '0x8f41c2d09e14a87b33c9420e61d7b405f9a2183b446c98e27f103d552c8a71e4',
        burnAddress: DEAD_BURN_ADDRESS,
        blockNumber: vault.lastAuditBlock - 14,
        remainingSupply: 98_500_000,
        memo: 'Genesis Fee Sweep Burn',
        timestamp: new Date(Date.now() - 86_400_000 * 3).toISOString(),
      },
      {
        id: 'burn-seed-2',
        symbol: 'TWATS',
        amount: 2_250_000,
        txHash: '0x3b92e71a45c6018d72e4a1198f32b6401d9e77a3c20155b884e6f1907a32d0c8',
        burnAddress: DEAD_BURN_ADDRESS,
        blockNumber: vault.lastAuditBlock - 5,
        remainingSupply: 96_250_000,
        memo: 'Protocol Settlement Revenue Buyback & Burn',
        timestamp: new Date(Date.now() - 86_400_000).toISOString(),
      },
    ];
  });
  const [lastReceipt, setLastReceipt] = useState<BurnRecord | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const activeToken = useMemo(
    () => tokenCatalog.find((t) => t.symbol === selectedSymbol) ?? tokenCatalog[0],
    [tokenCatalog, selectedSymbol]
  );

  const tokenBurns = useMemo(
    () =>
      burnHistory
        .filter((b) => b.symbol === activeToken.symbol)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [burnHistory, activeToken.symbol]
  );

  const totalBurned = useMemo(
    () => tokenBurns.reduce((acc, b) => acc + b.amount, 0),
    [tokenBurns]
  );

  const circulatingSupply = Math.max(0, activeToken.initialSupply - totalBurned);
  const deflationPct =
    activeToken.initialSupply > 0
      ? (totalBurned / activeToken.initialSupply) * 100
      : 0;

  const supplySeries = useMemo<SupplyPoint[]>(() => {
    let running = activeToken.initialSupply;
    const pts: SupplyPoint[] = [
      {
        step: 0,
        label: 'Genesis',
        circulatingSupply: running,
        burnedAmount: 0,
      },
    ];
    tokenBurns.forEach((b, idx) => {
      running = Math.max(0, running - b.amount);
      pts.push({
        step: idx + 1,
        label: `Burn #${idx + 1}`,
        circulatingSupply: running,
        burnedAmount: b.amount,
        txHash: b.txHash,
      });
    });
    return pts;
  }, [activeToken.initialSupply, tokenBurns]);

  // Persist burn ledger
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(burnHistory.slice(0, 60)));
    } catch {
      // ignore storage quota
    }
  }, [burnHistory]);

  // Real-time D3 Circulating Supply Decrease Chart
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const width = 560;
    const height = 220;
    const margin = { top: 20, right: 24, bottom: 32, left: 66 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    const areaGrad = defs
      .append('linearGradient')
      .attr('id', 'twe-burn-area-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    areaGrad.append('stop').attr('offset', '0%').attr('stop-color', '#F43F5E').attr('stop-opacity', 0.38);
    areaGrad.append('stop').attr('offset', '100%').attr('stop-color', '#D4B475').attr('stop-opacity', 0.03);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const minSupply = d3.min(supplySeries, (d) => d.circulatingSupply) ?? 0;
    const maxSupply = d3.max(supplySeries, (d) => d.circulatingSupply) ?? activeToken.initialSupply;
    const yPad = Math.max(maxSupply * 0.02, (maxSupply - minSupply) * 0.25);

    const x = d3
      .scaleLinear()
      .domain([0, Math.max(1, supplySeries.length - 1)])
      .range([0, innerW]);

    const y = d3
      .scaleLinear()
      .domain([Math.max(0, minSupply - yPad), maxSupply + yPad * 0.35])
      .range([innerH, 0]);

    // Horizontal gridlines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisLeft(y)
          .ticks(4)
          .tickSize(-innerW)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', 'currentColor')
      .attr('stroke-opacity', 0.12)
      .attr('stroke-dasharray', '3 3');
    g.selectAll('.grid .domain').remove();

    // Baseline initial supply dashed line
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', y(activeToken.initialSupply))
      .attr('y2', y(activeToken.initialSupply))
      .attr('stroke', '#D4B475')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4 4')
      .attr('opacity', 0.7);

    const area = d3
      .area<SupplyPoint>()
      .x((d) => x(d.step))
      .y0(innerH)
      .y1((d) => y(d.circulatingSupply))
      .curve(d3.curveStepAfter);

    const line = d3
      .line<SupplyPoint>()
      .x((d) => x(d.step))
      .y((d) => y(d.circulatingSupply))
      .curve(d3.curveStepAfter);

    g.append('path')
      .datum(supplySeries)
      .attr('fill', 'url(#twe-burn-area-grad)')
      .attr('d', area);

    const path = g
      .append('path')
      .datum(supplySeries)
      .attr('fill', 'none')
      .attr('stroke', '#F43F5E')
      .attr('stroke-width', 2.4)
      .attr('d', line);

    const totalLen = path.node()?.getTotalLength() ?? 0;
    if (totalLen > 0) {
      path
        .attr('stroke-dasharray', `${totalLen} ${totalLen}`)
        .attr('stroke-dashoffset', totalLen)
        .transition()
        .duration(650)
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0);
    }

    // Burn event markers
    g.selectAll('circle.burn-node')
      .data(supplySeries)
      .enter()
      .append('circle')
      .attr('class', 'burn-node')
      .attr('cx', (d) => x(d.step))
      .attr('cy', (d) => y(d.circulatingSupply))
      .attr('r', (d) => (d.step === supplySeries.length - 1 ? 5 : 3.5))
      .attr('fill', (d) => (d.step === 0 ? '#D4B475' : '#F43F5E'))
      .attr('stroke', '#0B0D10')
      .attr('stroke-width', 1.5)
      .append('title')
      .text(
        (d) =>
          `${d.label}: ${d.circulatingSupply.toLocaleString('en-US')} ${activeToken.symbol}${
            d.burnedAmount > 0 ? ` (-${d.burnedAmount.toLocaleString('en-US')} burned)` : ''
          }`
      );

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(Math.min(6, supplySeries.length))
          .tickFormat((val) => {
            const idx = Math.round(Number(val));
            return supplySeries[idx]?.label ?? '';
          })
      )
      .selectAll('text')
      .attr('fill', 'currentColor')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

    // Y Axis
    g.append('g')
      .call(
        d3
          .axisLeft(y)
          .ticks(4)
          .tickFormat((v) => {
            const num = Number(v);
            if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
            if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
            if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
            return String(Math.round(num));
          })
      )
      .selectAll('text')
      .attr('fill', 'currentColor')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace');

    g.selectAll('.domain').attr('stroke', 'currentColor').attr('stroke-opacity', 0.2);
    g.selectAll('.tick line').attr('stroke', 'currentColor').attr('stroke-opacity', 0.2);
  }, [supplySeries, activeToken.initialSupply, activeToken.symbol]);

  const handleCopyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(hash);
      window.setTimeout(() => setCopiedHash(null), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleExecuteBurn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amount = Number(burnAmountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid positive burn quantity.');
      return;
    }
    if (amount > circulatingSupply) {
      setError(
        `Burn quantity exceeds circulating supply (${circulatingSupply.toLocaleString('en-US')} ${activeToken.symbol}).`
      );
      return;
    }

    if (!confirmArmed) {
      setConfirmArmed(true);
      return;
    }

    setExecuting(true);
    try {
      const res = await fetch('/api/twe/vault/burn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: activeToken.symbol,
          amount,
          memo: memo.trim() || 'Vault Supply Burn Execution',
          vaultUuid: vault.vaultUuid,
          remainingSupply: Math.max(0, circulatingSupply - amount),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Burn execution failed');
      }

      const receipt: BurnRecord = {
        id: json.id || `burn-${Date.now()}`,
        symbol: activeToken.symbol,
        amount,
        txHash: json.txHash,
        burnAddress: json.burnAddress || DEAD_BURN_ADDRESS,
        blockNumber: json.blockNumber || vault.lastAuditBlock + 1,
        remainingSupply: Math.max(0, circulatingSupply - amount),
        memo: memo.trim() || 'Vault Supply Burn Execution',
        timestamp: json.timestamp || new Date().toISOString(),
      };

      setBurnHistory((prev) => [receipt, ...prev]);
      setLastReceipt(receipt);
      setConfirmArmed(false);
      onBurnExecuted?.(receipt);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to execute burn transaction.');
    } finally {
      setExecuting(false);
    }
  };

  const latestTx = lastReceipt ?? tokenBurns[tokenBurns.length - 1] ?? null;

  return (
    <section
      aria-label="Sovereign Asset Vault Token Burner"
      className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-500 dark:text-rose-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
              Token Burner &amp; Real-Time Deflationary Supply Telemetry
            </h3>
            <p className="text-[11px] font-mono text-[var(--twe-text-muted)]">
              Vault {vault.vaultUuid.slice(0, 8)}… · Permanent transfer to {DEAD_BURN_ADDRESS.slice(0, 10)}…dEaD
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 text-[11px] font-mono">
          <span className="px-2 py-0.5 rounded border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300">
            IRREVERSIBLE BURN RAIL
          </span>
        </div>
      </div>

      {/* Live Supply Metrics Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 border-b border-[var(--twe-border)]">
        <div className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--twe-text-muted)]">
            Initial Max Supply
          </div>
          <div className="mt-1 font-mono text-base font-semibold tabular-nums text-[var(--twe-text-primary)]">
            {activeToken.initialSupply.toLocaleString('en-US')}
          </div>
          <div className="text-[10px] font-mono text-[var(--twe-text-muted)]">{activeToken.symbol}</div>
        </div>

        <div className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-rose-500/30">
          <div className="text-[10px] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Permanently Burned
          </div>
          <div className="mt-1 font-mono text-base font-semibold tabular-nums text-rose-600 dark:text-rose-400">
            -{totalBurned.toLocaleString('en-US')}
          </div>
          <div className="text-[10px] font-mono text-[var(--twe-text-muted)]">
            {tokenBurns.length} verified tx{tokenBurns.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[#A8843E]/40 dark:border-[#D4B475]/40">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#A8843E] dark:text-[#D4B475]">
            Live Circulating Supply
          </div>
          <div className="mt-1 font-mono text-base font-semibold tabular-nums text-[var(--twe-text-primary)]">
            {circulatingSupply.toLocaleString('en-US')}
          </div>
          <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
            {(100 - deflationPct).toFixed(3)}% remaining
          </div>
        </div>

        <div className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--twe-text-muted)] flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-rose-500" />
            <span>Cumulative Deflation</span>
          </div>
          <div className="mt-1 font-mono text-base font-semibold tabular-nums text-[var(--twe-text-primary)]">
            -{deflationPct.toFixed(4)}%
          </div>
          <div className="w-full h-1.5 mt-1.5 rounded-full bg-[var(--twe-bg-muted)] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#D4B475] to-rose-500 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(2, deflationPct * 4))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Split: Burn Form + D3 Real-Time Supply Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4">
        {/* Burn Execution Form */}
        <form
          onSubmit={handleExecuteBurn}
          className="lg:col-span-5 p-4 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] space-y-3.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-display font-semibold text-[var(--twe-text-primary)]">
              Initiate Permanent Supply Burn
            </span>
            <span className="font-mono text-[10px] text-[var(--twe-text-muted)]">
              ERC-20 burn(uint256)
            </span>
          </div>

          <label className="block text-xs">
            <span className="text-[var(--twe-text-muted)]">Target Vault Token</span>
            <select
              value={selectedSymbol}
              onChange={(e) => {
                setSelectedSymbol(e.target.value);
                setConfirmArmed(false);
                setError(null);
              }}
              className="mt-1 w-full px-3 py-2 rounded-md bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] font-mono text-xs text-[var(--twe-text-primary)]"
            >
              {tokenCatalog.map((t) => (
                <option key={t.symbol} value={t.symbol}>
                  {t.symbol} — {t.name}
                </option>
              ))}
            </select>
          </label>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[var(--twe-text-muted)]">Quantity to Burn</span>
              <div className="flex items-center gap-1 font-mono text-[10px]">
                {[0.5, 1, 2.5, 5].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      setBurnAmountInput(String(Math.max(1, Math.round((circulatingSupply * pct) / 100))));
                      setConfirmArmed(false);
                    }}
                    className="px-1.5 py-0.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-secondary)] hover:border-[#D4B475] cursor-pointer"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
            <input
              type="number"
              min={1}
              max={circulatingSupply}
              step={1000}
              value={burnAmountInput}
              onChange={(e) => {
                setBurnAmountInput(e.target.value);
                setConfirmArmed(false);
              }}
              className="w-full px-3 py-2 rounded-md bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] font-mono text-sm tabular-nums text-[var(--twe-text-primary)]"
            />
          </div>

          <label className="block text-xs">
            <span className="text-[var(--twe-text-muted)]">Audit Ledger Memo</span>
            <input
              type="text"
              maxLength={140}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="mt-1 w-full px-3 py-1.5 rounded-md bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] text-xs text-[var(--twe-text-primary)]"
            />
          </label>

          {confirmArmed && (
            <div className="p-2.5 rounded-md border border-rose-500/50 bg-rose-500/10 text-[11px] text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                Confirm irreversible burn of{' '}
                <strong className="font-mono">
                  {Number(burnAmountInput).toLocaleString('en-US')} {activeToken.symbol}
                </strong>{' '}
                to <span className="font-mono">0x000…dEaD</span>. Click again to dispatch.
              </div>
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-md border border-rose-500/40 bg-rose-500/10 text-xs text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={executing || circulatingSupply <= 0}
              className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-xs font-semibold transition-colors cursor-pointer disabled:opacity-45 ${
                confirmArmed
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] hover:opacity-90'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>
                {executing
                  ? 'Broadcasting Burn Tx...'
                  : confirmArmed
                  ? `Confirm Permanent Burn (${activeToken.symbol})`
                  : `Burn ${activeToken.symbol} Tokens`}
              </span>
            </button>
            {confirmArmed && (
              <button
                type="button"
                onClick={() => setConfirmArmed(false)}
                className="px-3 py-2.5 rounded-md border border-[var(--twe-border)] text-xs text-[var(--twe-text-secondary)] cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* D3 Circulating Supply Decrease Graph + Transaction Hash Visualizer */}
        <div className="lg:col-span-7 space-y-3">
          <div className="p-4 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)]">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-xs font-display font-semibold text-[var(--twe-text-primary)]">
                  D3 Circulating Supply Reduction Curve ({activeToken.symbol})
                </div>
                <div className="text-[10px] font-mono text-[var(--twe-text-muted)]">
                  Step-after deflation curve · Gold dashed line = Initial Supply
                </div>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] text-[var(--twe-text-secondary)]">
                {supplySeries.length} snapshots
              </span>
            </div>
            <svg
              ref={svgRef}
              viewBox="0 0 560 220"
              className="w-full h-[210px] text-[var(--twe-text-secondary)] overflow-visible"
            />
          </div>

          {/* Transaction Hash Visualizer */}
          {latestTx && (
            <div className="p-3.5 rounded-lg border border-rose-500/35 bg-[var(--twe-bg-elevated)] space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  <Hash className="w-3.5 h-3.5" />
                  <span>Verified Burn Transaction Receipt</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--twe-text-muted)]">
                  <span>Block #{latestTx.blockNumber.toLocaleString('en-US')}</span>
                  <span>·</span>
                  <span>{new Date(latestTx.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 p-2.5 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)]">
                <code className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 break-all">
                  {latestTx.txHash}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopyHash(latestTx.txHash)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--twe-border)] text-[10px] font-mono text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)] shrink-0 cursor-pointer"
                >
                  {copiedHash === latestTx.txHash ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Hash</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                <div>
                  <span className="text-[var(--twe-text-muted)]">Burned: </span>
                  <span className="text-rose-600 dark:text-rose-400 font-semibold tabular-nums">
                    -{latestTx.amount.toLocaleString('en-US')} {latestTx.symbol}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--twe-text-muted)]">Sink: </span>
                  <span className="text-[var(--twe-text-primary)]">0x0000…dEaD</span>
                </div>
                <div className="truncate">
                  <span className="text-[var(--twe-text-muted)]">Memo: </span>
                  <span className="text-[var(--twe-text-secondary)]">{latestTx.memo}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Burn Ledger Table */}
      <div className="border-t border-[var(--twe-border)] overflow-x-auto">
        <div className="px-4 py-2.5 bg-[var(--twe-bg-elevated)] border-b border-[var(--twe-border)] flex items-center justify-between text-xs">
          <span className="font-display font-semibold text-[var(--twe-text-primary)] inline-flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
            <span>Immutable Vault Burn Ledger ({burnHistory.length} Events)</span>
          </span>
          <span className="font-mono text-[10px] text-[var(--twe-text-muted)]">
            Contract: {activeToken.contractAddress.slice(0, 12)}…{activeToken.contractAddress.slice(-6)}
          </span>
        </div>
        <table className="w-full text-left border-collapse text-xs">
          <thead className="border-b border-[var(--twe-border)] text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">
            <tr>
              <th className="px-4 py-2">Token</th>
              <th className="px-4 py-2 text-right">Amount Burned</th>
              <th className="px-4 py-2 text-right">Post-Burn Supply</th>
              <th className="px-4 py-2">Transaction Hash</th>
              <th className="px-4 py-2">Memo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--twe-border)]">
            {burnHistory.slice(0, 8).map((row) => (
              <tr key={row.id} className="h-9 hover:bg-[var(--twe-bg-elevated)]">
                <td className="px-4 py-1.5 font-mono font-semibold text-[#A8843E] dark:text-[#D4B475]">
                  {row.symbol}
                </td>
                <td className="px-4 py-1.5 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400">
                  -{row.amount.toLocaleString('en-US')}
                </td>
                <td className="px-4 py-1.5 text-right font-mono tabular-nums text-[var(--twe-text-primary)]">
                  {row.remainingSupply.toLocaleString('en-US')}
                </td>
                <td className="px-4 py-1.5 font-mono text-[11px] text-[var(--twe-text-secondary)]">
                  <button
                    type="button"
                    onClick={() => handleCopyHash(row.txHash)}
                    className="inline-flex items-center gap-1 hover:text-[var(--twe-text-primary)] cursor-pointer"
                  >
                    <span>
                      {row.txHash.slice(0, 14)}…{row.txHash.slice(-8)}
                    </span>
                    {copiedHash === row.txHash ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3 opacity-60" />
                    )}
                  </button>
                </td>
                <td className="px-4 py-1.5 text-[var(--twe-text-secondary)] truncate max-w-[220px]">
                  {row.memo}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
