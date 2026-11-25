import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Cloud,
  Flame,
  Hammer,
  Layers,
  RefreshCw,
  Rocket,
  X,
  Zap,
} from 'lucide-react';
import type {
  HubId,
  MarketOrder,
  TweAssetRecord,
} from '../types/twe';

interface QuickActionMenuProps {
  activeHub: HubId;
  assets: TweAssetRecord[];
  orders: MarketOrder[];
  totalNavUsd: number;
  sseConnected: boolean;
  onNavigateHub: (hub: HubId) => void;
  onAdvanceTick: () => Promise<void>;
  onRefreshWorkspace: () => Promise<void>;
}

type MenuPanel = 'menu' | 'deploy' | 'market';

export const QuickActionMenu: React.FC<QuickActionMenuProps> = ({
  activeHub,
  assets,
  orders,
  totalNavUsd,
  sseConnected,
  onNavigateHub,
  onAdvanceTick,
  onRefreshWorkspace,
}) => {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<MenuPanel>('menu');
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Quick Deploy Token state
  const [seed, setSeed] = useState('TWE-QUICK-LAUNCH');
  const [standard, setStandard] = useState<'ERC-3643' | 'ERC-1400' | 'ERC-20'>('ERC-3643');
  const [preset, setPreset] = useState<'custom' | 'currencies' | 'commodities'>('custom');
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{
    kind: 'ok' | 'err';
    message: string;
    contractAddress?: string;
    ticker?: string;
  } | null>(null);

  // Market status actions state
  const [ticking, setTicking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Close on Escape or outside click
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const marketSummary = useMemo(() => {
    const gainers = assets.filter((a) => a.change24hPct >= 0).length;
    const losers = assets.length - gainers;
    const openOrders = orders.filter((o) => o.status === 'OPEN').length;
    const totalVolume24h = assets.reduce((sum, a) => sum + (a.volume24hUsd || 0), 0);
    const topMovers = [...assets]
      .sort((a, b) => Math.abs(b.change24hPct) - Math.abs(a.change24hPct))
      .slice(0, 4);

    return {
      gainers,
      losers,
      openOrders,
      totalVolume24h,
      topMovers,
    };
  }, [assets, orders]);

  const handleToggleOpen = () => {
    setOpen((prev) => {
      if (prev) return false;
      setPanel('menu');
      setDeployResult(null);
      return true;
    });
  };

  const handleQuickNavigate = (hub: HubId) => {
    onNavigateHub(hub);
    setOpen(false);
  };

  const handleQuickDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedSeed = seed.trim() || 'TWE-QUICK-LAUNCH';
    setDeploying(true);
    setDeployResult(null);

    try {
      const genRes = await fetch('/api/twe/foundry/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed: trimmedSeed,
          count: 1,
          preset,
          standard,
        }),
      });
      if (!genRes.ok) {
        throw new Error(`Token synthesis failed (HTTP ${genRes.status}).`);
      }
      const genJson = await genRes.json();
      const firstToken = genJson?.summary?.items?.[0];

      const deployRes = await fetch('/api/twe/foundry/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(firstToken?.id ? { id: firstToken.id } : { deployLimit: 1 }),
      });
      if (!deployRes.ok) {
        throw new Error(`Token deployment failed (HTTP ${deployRes.status}).`);
      }

      await onRefreshWorkspace();
      setDeployResult({
        kind: 'ok',
        message: `Deployed ${firstToken?.ticker || 'new token'} (${standard}) to Token Atlas.`,
        contractAddress: firstToken?.contractAddress,
        ticker: firstToken?.ticker,
      });
    } catch (err) {
      setDeployResult({
        kind: 'err',
        message: err instanceof Error ? err.message : 'Unable to deploy token.',
      });
    } finally {
      setDeploying(false);
    }
  };

  const handleRunTick = async () => {
    setTicking(true);
    try {
      await onAdvanceTick();
    } finally {
      setTicking(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefreshWorkspace();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div ref={containerRef} className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2.5">
      {/* Floating Popover Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Quick Actions Menu"
          className="w-[340px] max-w-[calc(100vw-2.5rem)] rounded-xl border border-[var(--twe-border-strong)] bg-[var(--twe-bg-surface)] shadow-2xl overflow-hidden"
        >
          {/* Panel Header */}
          <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {panel !== 'menu' && (
                <button
                  type="button"
                  onClick={() => {
                    setPanel('menu');
                    setDeployResult(null);
                  }}
                  aria-label="Back to Quick Actions"
                  className="p-1 rounded hover:bg-[var(--twe-bg-surface)] text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)] cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              )}
              <div className="min-w-0">
                <div className="text-xs font-display font-semibold text-[var(--twe-text-primary)] truncate">
                  {panel === 'menu'
                    ? 'Quick Actions'
                    : panel === 'deploy'
                      ? 'Deploy New Token'
                      : 'Market Status'}
                </div>
                <div className="text-[11px] text-[var(--twe-text-muted)] truncate">
                  {panel === 'menu'
                    ? 'Available from any workspace hub'
                    : panel === 'deploy'
                      ? 'Synthesize & register contract to Token Atlas'
                      : 'Live ATS telemetry & order pulse'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close Quick Actions"
              className="p-1 rounded hover:bg-[var(--twe-bg-surface)] text-[var(--twe-text-muted)] hover:text-[var(--twe-text-primary)] cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* VIEW 1: Main Quick Actions List */}
          {panel === 'menu' && (
            <div className="p-2.5 space-y-1">
              <button
                type="button"
                onClick={() => setPanel('deploy')}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[var(--twe-bg-elevated)] flex items-center justify-between gap-3 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-md bg-[var(--twe-gold-soft)] border border-[#A8843E]/40 dark:border-[#D4B475]/40 flex items-center justify-center shrink-0">
                    <Rocket className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[var(--twe-text-primary)]">
                      Deploy New Token
                    </div>
                    <div className="text-[11px] text-[var(--twe-text-muted)] truncate">
                      Quick-mint &amp; deploy smart contract immediately
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-[var(--twe-text-muted)] group-hover:text-[var(--twe-text-primary)] shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => setPanel('market')}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[var(--twe-bg-elevated)] flex items-center justify-between gap-3 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[var(--twe-text-primary)]">
                      Check Market Status
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-[var(--twe-text-muted)] truncate">
                      {assets.length} instruments · {marketSummary.openOrders} open orders
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-[var(--twe-text-muted)] group-hover:text-[var(--twe-text-primary)] shrink-0" />
              </button>

              <div className="my-1.5 border-t border-[var(--twe-border)]" />

              <button
                type="button"
                onClick={() => handleQuickNavigate('asset-vault')}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--twe-bg-elevated)] flex items-center justify-between gap-2.5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Flame className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="text-xs font-medium text-[var(--twe-text-primary)] truncate">
                    Open Token Burner &amp; Vault
                  </span>
                </div>
                <span className="text-[11px] text-[var(--twe-text-muted)] shrink-0">
                  {activeHub === 'asset-vault' ? 'Active' : 'Go'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickNavigate('nft-studio')}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--twe-bg-elevated)] flex items-center justify-between gap-2.5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Layers className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475] shrink-0" />
                  <span className="text-xs font-medium text-[var(--twe-text-primary)] truncate">
                    NFT Studio &amp; Rarity Matrix
                  </span>
                </div>
                <span className="text-[11px] text-[var(--twe-text-muted)] shrink-0">
                  {activeHub === 'nft-studio' ? 'Active' : 'Go'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickNavigate('cloud-database')}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--twe-bg-elevated)] flex items-center justify-between gap-2.5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-xs font-medium text-[var(--twe-text-primary)] truncate">
                    Cloud Database Ledger
                  </span>
                </div>
                <span className="text-[11px] text-[var(--twe-text-muted)] shrink-0">
                  {activeHub === 'cloud-database' ? 'Active' : 'Go'}
                </span>
              </button>

              <button
                type="button"
                disabled={refreshing}
                onClick={() => void handleRefresh()}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--twe-bg-elevated)] flex items-center justify-between gap-2.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <RefreshCw
                    className={`w-4 h-4 text-[var(--twe-text-secondary)] shrink-0 ${
                      refreshing ? 'animate-spin' : ''
                    }`}
                  />
                  <span className="text-xs font-medium text-[var(--twe-text-primary)] truncate">
                    {refreshing ? 'Refreshing Workspace...' : 'Refresh Workspace Data'}
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* VIEW 2: Inline Deploy New Token Panel */}
          {panel === 'deploy' && (
            <form onSubmit={handleQuickDeploy} className="p-4 space-y-3 text-xs">
              <label className="block space-y-1">
                <span className="text-[11px] text-[var(--twe-text-secondary)]">
                  Token Seed / Launch Identifier
                </span>
                <input
                  type="text"
                  required
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="e.g. TWE-RESERVE-2026"
                  className="w-full px-2.5 py-2 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] font-mono text-xs text-[var(--twe-text-primary)] focus:outline-none focus:border-[#A8843E] dark:focus:border-[#D4B475]"
                />
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                <label className="block space-y-1">
                  <span className="text-[11px] text-[var(--twe-text-secondary)]">Standard</span>
                  <select
                    value={standard}
                    onChange={(e) =>
                      setStandard(e.target.value as 'ERC-3643' | 'ERC-1400' | 'ERC-20')
                    }
                    className="w-full px-2 py-2 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] font-mono text-xs text-[var(--twe-text-primary)]"
                  >
                    <option value="ERC-3643">ERC-3643</option>
                    <option value="ERC-1400">ERC-1400</option>
                    <option value="ERC-20">ERC-20</option>
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-[11px] text-[var(--twe-text-secondary)]">Asset Class</span>
                  <select
                    value={preset}
                    onChange={(e) =>
                      setPreset(e.target.value as 'custom' | 'currencies' | 'commodities')
                    }
                    className="w-full px-2 py-2 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs text-[var(--twe-text-primary)]"
                  >
                    <option value="custom">Sovereign Token</option>
                    <option value="currencies">FX Currency</option>
                    <option value="commodities">Commodity</option>
                  </select>
                </label>
              </div>

              <button
                type="submit"
                disabled={deploying}
                className="w-full py-2.5 px-4 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Rocket className="w-3.5 h-3.5" />
                <span>{deploying ? 'Deploying Token...' : 'Deploy Token Now'}</span>
              </button>

              {deployResult && (
                <div
                  className={`rounded-lg border p-2.5 text-[11px] space-y-1 ${
                    deployResult.kind === 'ok'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium">
                    {deployResult.kind === 'ok' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                    <span>{deployResult.message}</span>
                  </div>
                  {deployResult.contractAddress && (
                    <div className="font-mono text-[10px] break-all opacity-90">
                      {deployResult.contractAddress}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-[var(--twe-border)] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickNavigate('token-foundry')}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#A8843E] dark:text-[#D4B475] hover:underline cursor-pointer"
                >
                  <Hammer className="w-3 h-3" />
                  <span>Open Full Token Foundry</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickNavigate('token-atlas')}
                  className="text-[11px] text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)] hover:underline cursor-pointer"
                >
                  View Token Atlas
                </button>
              </div>
            </form>
          )}

          {/* VIEW 3: Inline Live Market Status Panel */}
          {panel === 'market' && (
            <div className="p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between text-[11px] font-mono text-[var(--twe-text-secondary)]">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      sseConnected ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <span>{sseConnected ? 'ATS Feed Connected' : 'Reconnecting Feed'}</span>
                </span>
                <span className="tabular-nums">
                  {marketSummary.gainers} Up / {marketSummary.losers} Down
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)]">
                  <div className="text-[11px] text-[var(--twe-text-muted)]">Portfolio NAV</div>
                  <div className="mt-0.5 font-mono font-semibold tabular-nums text-[var(--twe-text-primary)]">
                    ${totalNavUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)]">
                  <div className="text-[11px] text-[var(--twe-text-muted)]">24h Volume</div>
                  <div className="mt-0.5 font-mono font-semibold tabular-nums text-[var(--twe-text-primary)]">
                    ${(marketSummary.totalVolume24h / 1_000_000).toFixed(2)}M
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] text-[var(--twe-text-muted)]">Top Active Movers</div>
                <div className="divide-y divide-[var(--twe-border)] rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)]">
                  {marketSummary.topMovers.length === 0 ? (
                    <div className="p-3 text-center text-[11px] text-[var(--twe-text-muted)]">
                      No market instruments loaded yet.
                    </div>
                  ) : (
                    marketSummary.topMovers.map((item) => {
                      const up = item.change24hPct >= 0;
                      return (
                        <div
                          key={item.id}
                          className="px-3 py-2 flex items-center justify-between gap-2 font-mono tabular-nums"
                        >
                          <span className="font-semibold text-[var(--twe-text-primary)]">
                            {item.symbol}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-[var(--twe-text-secondary)]">
                              ${item.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span
                              className={`w-14 text-right font-medium ${
                                up
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {up ? '+' : ''}
                              {item.change24hPct.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={ticking}
                  onClick={() => void handleRunTick()}
                  className="flex-1 py-2 px-3 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] text-xs font-medium text-[var(--twe-text-primary)] hover:border-[#A8843E] dark:hover:border-[#D4B475] disabled:opacity-50 inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${ticking ? 'animate-spin' : ''}`} />
                  <span>{ticking ? 'Updating...' : 'Advance Tick'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickNavigate('market-exchange')}
                  className="flex-1 py-2 px-3 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold hover:opacity-90 cursor-pointer whitespace-nowrap"
                >
                  Open Exchange
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Bottom-Right Trigger Button */}
      <button
        type="button"
        onClick={handleToggleOpen}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={open ? 'Close Quick Actions menu' : 'Open Quick Actions menu'}
        className="h-11 px-4 rounded-xl bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] shadow-lg border border-black/10 dark:border-white/15 hover:opacity-95 active:scale-[0.98] transition-all inline-flex items-center gap-2 text-xs font-semibold whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4B475]"
      >
        {open ? <X className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
        <span>Quick Actions</span>
      </button>
    </div>
  );
};
