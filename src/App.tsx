import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Archive,
  Bell,
  BookOpen,
  Building2,
  Cloud,
  Code2,
  Coins,
  Cpu,
  Database,
  Download,
  FileCheck2,
  Globe,
  Globe2,
  Hammer,
  Landmark,
  Layers,
  LayoutDashboard,
  Lock,
  LogIn,
  LogOut,
  Menu,
  Moon,
  PanelRight,
  Rocket,
  Rss,
  ShieldAlert,
  Sparkles,
  Sun,
  Tags,
  Vault,
  Wallet,
  X,
} from 'lucide-react';
import { WORKSPACE_HUBS } from './data/hubs';
import type {
  HubId,
  TradeNotificationEvent,
  TweAssetRecord,
  WorkspaceBootstrapPayload,
} from './types/twe';
import { TokenAtlasView } from './components/TokenAtlasView';
import {
  AssetVaultView,
  FourTokenSystemsView,
} from './components/FourTokenSystemsAndVault';
import { TokenFoundryProView } from './components/TokenFoundryProView';
import { CmdtxCodexView, NftStudioView } from './components/CodexAndNftStudio';
import {
  MarketExchangeView,
  PortfolioWatchlistView,
  RiskSecurityView,
} from './components/MarketAndRiskViews';
import {
  ChainConnectionsView,
  ComplianceEdgarView,
  CompanyDirectoryView,
  DeployRegistryView,
  OverviewView,
  ProjectArchiveView,
  SourcesStudioView,
} from './components/GovernanceAndInfraViews';
import { AiArtStudioView } from './components/AiArtStudioView';
import { PlanetarySystemView } from './components/PlanetarySystemView';
import { SecMonitorComponent } from './components/SecMonitorComponent';
import { GovernancePortal } from './components/GovernancePortal';
import { StakingPool } from './components/StakingPool';
import { TokenNamer } from './components/TokenNamer';
import { CloudDatabaseView } from './components/CloudDatabaseView';
import { InfiniteFoundryHub } from './components/InfiniteFoundryHub';
import { SectionVisualBanner } from './components/SectionVisualBanner';
import { SplitPaneSandbox } from './components/SplitPaneSandbox';
import { NotificationDrawer, TradeToastStack } from './components/NotificationCenter';
import { QuickActionMenu } from './components/QuickActionMenu';
import { initAnalyticsTracker, trackWorkspaceEvent } from './lib/analytics';
import { isAiEnabled, setAiModeEnabled } from './lib/aiMode';
import { useFirebase } from './contexts/FirebaseContext';

const HUB_ICONS: Record<HubId, React.ComponentType<{ className?: string }>> = {
  overview: LayoutDashboard,
  'four-token-systems': Database,
  'token-atlas': Coins,
  'token-foundry': Hammer,
  'asset-vault': Vault,
  'nft-studio': Layers,
  'cmdtx-codex': BookOpen,
  'company-directory': Building2,
  'sources-studio': Layers,
  'project-archive': Archive,
  'portfolio-watchlist': Wallet,
  'market-exchange': Activity,
  'deploy-registry': Rocket,
  'risk-security': ShieldAlert,
  'compliance-edgar': FileCheck2,
  'sec-monitor': Rss,
  'chain-connections': Globe2,
  'ai-art-studio': Sparkles,
  'planetary-system': Globe,
  'governance-portal': Landmark,
  'staking-pool': Lock,
  'token-namer': Tags,
  'cloud-database': Cloud,
  'infinite-foundry': Code2,
};

export default function App() {
  const { user, signingIn, signInWithGoogle, signOutUser } = useFirebase();
  const [activeHub, setActiveHub] = useState<HubId>('overview');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('twe-theme');
    return saved ? saved === 'dark' : true;
  });
  const [aiModeEnabled, setAiModeState] = useState<boolean>(() => isAiEnabled());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [splitPaneOpen, setSplitPaneOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [bootstrap, setBootstrap] = useState<WorkspaceBootstrapPayload | null>(null);
  const [allAssets, setAllAssets] = useState<TweAssetRecord[]>([]);
  const [notifications, setNotifications] = useState<TradeNotificationEvent[]>([]);
  const [toasts, setToasts] = useState<TradeNotificationEvent[]>([]);
  const [sseConnected, setSseConnected] = useState(false);
  const [tradeSymbolPrefill, setTradeSymbolPrefill] = useState<string | undefined>(undefined);
  const [codexArtifact, setCodexArtifact] = useState<{
    dataUrl: string;
    name: string;
    traits: { trait_type: string; value: string }[];
  } | null>(null);

  // Sync dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('twe-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Sync global AI Mode toggle with localStorage and helper registry
  useEffect(() => {
    setAiModeEnabled(aiModeEnabled);
  }, [aiModeEnabled]);

  const loadWorkspaceData = useCallback(async () => {
    try {
      const [bootRes, assetsRes] = await Promise.all([
        fetch('/api/twe/bootstrap'),
        fetch('/api/twe/assets/all'),
      ]);
      if (bootRes.ok) {
        const bootJson: WorkspaceBootstrapPayload = await bootRes.json();
        setBootstrap(bootJson);
        setNotifications(bootJson.notifications);
      }
      if (assetsRes.ok) {
        const assetsJson = await assetsRes.json();
        setAllAssets(assetsJson.assets ?? []);
      }
    } catch {
      // handled gracefully via retry or initial loading state
    }
  }, []);

  useEffect(() => {
    void loadWorkspaceData();
  }, [loadWorkspaceData]);

  // Initialize first-party Plausible-compatible analytics & track hub pageviews
  useEffect(() => {
    const cleanup = initAnalyticsTracker();
    return cleanup;
  }, []);

  useEffect(() => {
    trackWorkspaceEvent('pageview', { hub: activeHub });
  }, [activeHub]);

  // Real-time Server-Sent Events (SSE) Trade Notifications
  useEffect(() => {
    const es = new EventSource('/api/twe/notifications/stream');
    es.addEventListener('connected', () => {
      setSseConnected(true);
    });
    es.addEventListener('trade_notification', (ev: MessageEvent) => {
      try {
        const parsed: TradeNotificationEvent = JSON.parse(ev.data);
        setNotifications((prev) => [parsed, ...prev.filter((n) => n.id !== parsed.id)].slice(0, 60));
        setToasts((prev) => [parsed, ...prev.filter((t) => t.id !== parsed.id)].slice(0, 3));
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== parsed.id));
        }, 5000);
        void loadWorkspaceData();
      } catch {
        // ignore malformed event
      }
    });
    es.onerror = () => {
      setSseConnected(false);
    };
    return () => {
      es.close();
    };
  }, [loadWorkspaceData]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const activeHubDef = useMemo(
    () => WORKSPACE_HUBS.find((h) => h.id === activeHub) ?? WORKSPACE_HUBS[0],
    [activeHub]
  );

  const groupedHubs = useMemo(() => {
    const groups = ['Core Systems', 'Assets & Studio', 'Markets & Custody', 'Governance & Infra'] as const;
    return groups.map((g) => ({
      group: g,
      items: WORKSPACE_HUBS.filter((h) => h.group === g),
    }));
  }, []);

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await fetch('/api/twe/notifications/read-all', { method: 'POST' });
  };

  const handleAdvanceTick = async () => {
    await fetch('/api/twe/market/tick', { method: 'POST' });
    await loadWorkspaceData();
  };

  const handleTradeNavigate = (symbol: string) => {
    setTradeSymbolPrefill(symbol);
    setActiveHub('market-exchange');
  };

  const handleSendToCodex = (artifact: {
    dataUrl: string;
    name: string;
    traits: { trait_type: string; value: string }[];
  }) => {
    setCodexArtifact(artifact);
    setActiveHub('cmdtx-codex');
  };

  const renderHubContent = () => {
    if (!bootstrap) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 rounded-lg bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] animate-pulse"
              />
            ))}
          </div>
          <div className="h-72 rounded-lg bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] animate-pulse" />
        </div>
      );
    }

    switch (activeHub) {
      case 'overview':
        return (
          <OverviewView
            vault={bootstrap.vault}
            tables={bootstrap.tables}
            assets={allAssets}
            recentTrades={bootstrap.recentTrades}
            totalNavUsd={bootstrap.portfolio.totalNavUsd}
            onNavigateHub={setActiveHub}
          />
        );
      case 'four-token-systems':
        return <FourTokenSystemsView tables={bootstrap.tables} />;
      case 'token-atlas':
        return <TokenAtlasView onSelectAssetForTrade={handleTradeNavigate} />;
      case 'token-foundry':
        return <TokenFoundryProView onTokensDeployed={loadWorkspaceData} />;
      case 'asset-vault':
        return <AssetVaultView vault={bootstrap.vault} assets={allAssets} />;
      case 'nft-studio':
        return <NftStudioView onSendArtifactToCodex={handleSendToCodex} />;
      case 'cmdtx-codex':
        return <CmdtxCodexView incomingArtifact={codexArtifact} />;
      case 'company-directory':
        return <CompanyDirectoryView companies={bootstrap.companies} />;
      case 'sources-studio':
        return <SourcesStudioView />;
      case 'project-archive':
        return <ProjectArchiveView assets={allAssets} vault={bootstrap.vault} />;
      case 'portfolio-watchlist':
        return (
          <PortfolioWatchlistView
            holdings={bootstrap.portfolio.holdings}
            paperCashUsd={bootstrap.portfolio.paperCashUsd}
            reservedUsd={bootstrap.portfolio.reservedUsd}
            totalNavUsd={bootstrap.portfolio.totalNavUsd}
            assets={allAssets}
            onTradeSymbol={handleTradeNavigate}
          />
        );
      case 'market-exchange':
        return (
          <MarketExchangeView
            assets={allAssets}
            orders={bootstrap.orders}
            trades={bootstrap.recentTrades}
            recentTrades={bootstrap.recentTrades}
            paperCashUsd={bootstrap.portfolio.paperCashUsd}
            selectedSymbol={tradeSymbolPrefill}
            onOrderPlaced={loadWorkspaceData}
            onAdvanceTick={handleAdvanceTick}
          />
        );
      case 'deploy-registry':
        return <DeployRegistryView gates={bootstrap.readinessGates} />;
      case 'risk-security':
        return (
          <RiskSecurityView
            holdings={bootstrap.portfolio.holdings}
            assets={allAssets}
          />
        );
      case 'compliance-edgar':
        return <ComplianceEdgarView filings={bootstrap.filings} />;
      case 'sec-monitor':
        return <SecMonitorComponent />;
      case 'chain-connections':
        return <ChainConnectionsView chains={bootstrap.chains} />;
      case 'ai-art-studio':
        return (
          <AiArtStudioView
            aiModeEnabled={aiModeEnabled}
            onSendArtifactToCodex={handleSendToCodex}
          />
        );
      case 'planetary-system':
        return (
          <PlanetarySystemView
            onCommoditiesTokenized={loadWorkspaceData}
            assets={allAssets}
            onNavigateHub={setActiveHub}
          />
        );
      case 'governance-portal':
        return (
          <GovernancePortal
            onOpenStaking={() => setActiveHub('staking-pool')}
          />
        );
      case 'staking-pool':
        return (
          <StakingPool
            onOpenGovernance={() => setActiveHub('governance-portal')}
          />
        );
      case 'token-namer':
        return <TokenNamer />;
      case 'cloud-database':
        return <CloudDatabaseView workspaceAssets={allAssets} />;
      case 'infinite-foundry':
        return <InfiniteFoundryHub />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen h-screen flex flex-col bg-[var(--twe-bg-canvas)] text-[var(--twe-text-primary)] overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="h-14 shrink-0 border-b border-[var(--twe-border)] bg-[var(--twe-bg-surface)] px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label="Toggle workspace navigation"
            className="lg:hidden p-1.5 rounded border border-[var(--twe-border)] text-[var(--twe-text-secondary)] cursor-pointer"
          >
            {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-display font-bold text-xs flex items-center justify-center shrink-0">
              TWE
            </div>
            <div className="min-w-0">
              <div className="text-xs font-display font-semibold tracking-tight truncate">
                Token World Exchange ATS® <span className="text-[var(--twe-text-muted)] font-normal">/ {activeHubDef.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Top Bar Controls (Single-line whitespace-nowrap) */}
        <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
          <a
            href="/readme.md?download=1"
            download="TWE-Workspace-README.md"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-medium text-[var(--twe-text-primary)] hover:border-[#D4B475] transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
            <span className="hidden sm:inline">README.md</span>
          </a>

          <button
            type="button"
            onClick={() => setDarkMode((d) => !d)}
            aria-label={darkMode ? 'Switch to Platinum Light Mode' : 'Switch to Graphite Dark Mode'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-medium text-[var(--twe-text-primary)] hover:border-[#D4B475] transition-colors cursor-pointer"
          >
            {darkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-[#D4B475]" />
                <span className="hidden md:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-[#A8843E]" />
                <span className="hidden md:inline">Dark</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setAiModeState((enabled) => !enabled)}
            aria-pressed={aiModeEnabled}
            aria-label={aiModeEnabled ? 'Disable AI Mode' : 'Enable AI Mode'}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
              aiModeEnabled
                ? 'border-emerald-500/45 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:border-emerald-500'
                : 'border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-secondary)] hover:border-[#D4B475]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                aiModeEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400 dark:bg-zinc-600'
              }`}
            />
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {aiModeEnabled ? 'AI Mode' : 'AI Paused'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSplitPaneOpen((s) => !s)}
            className={`hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
              splitPaneOpen
                ? 'border-[#A8843E] dark:border-[#D4B475] bg-[var(--twe-gold-soft)] text-[var(--twe-text-primary)]'
                : 'border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-secondary)]'
            }`}
          >
            <PanelRight className="w-3.5 h-3.5" />
            <span>Sandbox</span>
          </button>

          <button
            type="button"
            onClick={() => setNotificationsOpen(true)}
            aria-label="Open Real-Time Trade Notifications"
            className="relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-medium text-[var(--twe-text-primary)] hover:border-[#D4B475] cursor-pointer"
          >
            <span
              className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}
              title={sseConnected ? 'Live SSE Stream Active' : 'Connecting SSE...'}
            />
            <Bell className="w-3.5 h-3.5" />
            {unreadCount > 0 && (
              <span className="font-mono text-[10px] font-semibold tabular-nums px-1.5 py-0.2 rounded bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10]">
                {unreadCount}
              </span>
            )}
          </button>

          {user ? (
            <div className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-xs">
              <button
                type="button"
                onClick={() => setActiveHub('cloud-database')}
                className="font-medium text-emerald-700 dark:text-emerald-300 truncate max-w-[110px] cursor-pointer"
                title={user.email ?? 'Signed in'}
              >
                {user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Account'}
              </button>
              <button
                type="button"
                onClick={() => void signOutUser()}
                aria-label="Sign out"
                title="Sign out"
                className="p-0.5 rounded text-[var(--twe-text-secondary)] hover:text-rose-500 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={signingIn}
              onClick={() => void signInWithGoogle()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{signingIn ? 'Signing in...' : 'Sign In'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Hybrid 3-Column + Split-Pane Body */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Column 1: Left Navigation Rail (17 Hubs) */}
        <aside
          className={`${
            mobileNavOpen ? 'fixed inset-y-14 left-0 z-40 block' : 'hidden'
          } lg:block w-64 shrink-0 border-r border-[var(--twe-border)] bg-[var(--twe-bg-surface)] overflow-y-auto py-3 px-2.5`}
        >
          <div className="space-y-4">
            {groupedHubs.map((grp) => (
              <div key={grp.group} className="space-y-1">
                <div className="px-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--twe-text-muted)]">
                  {grp.group}
                </div>
                {grp.items.map((hub) => {
                  const Icon = HUB_ICONS[hub.id];
                  const active = activeHub === hub.id;
                  return (
                    <button
                      key={hub.id}
                      type="button"
                      onClick={() => {
                        setActiveHub(hub.id);
                        setMobileNavOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-md text-xs flex items-center gap-2.5 transition-colors cursor-pointer ${
                        active
                          ? 'bg-[var(--twe-gold-soft)] text-[var(--twe-text-primary)] font-semibold border border-[#A8843E]/40 dark:border-[#D4B475]/40'
                          : 'text-[var(--twe-text-secondary)] hover:bg-[var(--twe-bg-elevated)] hover:text-[var(--twe-text-primary)] border border-transparent'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          active
                            ? 'text-[#A8843E] dark:text-[#D4B475]'
                            : 'text-[var(--twe-text-muted)]'
                        }`}
                      />
                      <span className="truncate">{hub.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        {/* Column 2: Main Hub Workspace */}
        <main className="flex-1 min-w-0 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-[1400px] mx-auto space-y-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-[var(--twe-border)]">
              <div>
                <h1 className="font-display text-lg sm:text-xl font-semibold text-[var(--twe-text-primary)]">
                  {activeHubDef.label}
                </h1>
                <p className="text-xs text-[var(--twe-text-secondary)] mt-0.5">
                  {activeHubDef.description}
                </p>
              </div>
              <div className="font-mono text-[11px] text-[var(--twe-text-muted)]">
                {WORKSPACE_HUBS.length} Hubs · Vault af230af8…e565
              </div>
            </div>

            <SectionVisualBanner
              activeHub={activeHub}
              onOpenPlanetarySystem={() => setActiveHub('planetary-system')}
            />

            {renderHubContent()}
          </div>
        </main>

        {/* Column 3: Split-Pane Cloud Sandbox Inspector */}
        {splitPaneOpen && bootstrap && (
          <div className="hidden xl:block h-full">
            <SplitPaneSandbox
              activeHub={activeHub}
              vault={bootstrap.vault}
              recentTrades={bootstrap.recentTrades}
              aiModeEnabled={aiModeEnabled}
              onClose={() => setSplitPaneOpen(false)}
              onAdvanceTick={handleAdvanceTick}
            />
          </div>
        )}
      </div>

      {/* Real-Time Trade Notification Drawer & Live Toast Stack */}
      <NotificationDrawer
        open={notificationsOpen}
        notifications={notifications}
        sseConnected={sseConnected}
        onClose={() => setNotificationsOpen(false)}
        onMarkAllRead={handleMarkAllRead}
      />
      <TradeToastStack
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />

      {/* Global Floating Quick Action Menu */}
      <QuickActionMenu
        activeHub={activeHub}
        assets={allAssets}
        orders={bootstrap?.orders ?? []}
        totalNavUsd={bootstrap?.portfolio.totalNavUsd ?? 0}
        sseConnected={sseConnected}
        onNavigateHub={setActiveHub}
        onAdvanceTick={handleAdvanceTick}
        onRefreshWorkspace={loadWorkspaceData}
      />
    </div>
  );
}
