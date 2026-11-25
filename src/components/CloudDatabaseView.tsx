import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Database,
  Lock,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';
import {
  createNftEdition,
  createPersistedAsset,
  createPersistedOrder,
  createVaultRecord,
  deleteNftEdition,
  deletePersistedAsset,
  deletePersistedOrder,
  deleteVaultRecord,
  finalizeVaultRecord,
  settleOrCancelOrder,
  syncWorkspaceAssetsToFirestore,
  toggleAssetWatchlist,
  updateAssetPriceAndNotes,
  updateAssetStatus,
  type PersistedAssetDoc,
} from '../lib/firestoreStore';
import { BLUEPRINT_LIMITS } from '../lib/firebase';
import type { AssetKind, InstitutionalOrderType, TweAssetRecord } from '../types/twe';
import type { RarityTier } from '../lib/rarityService';
import { CloudDbAndFoundryWorkbench } from './CloudDbAndFoundryWorkbench';

interface CloudDatabaseViewProps {
  workspaceAssets: TweAssetRecord[];
}

type DbTab = 'assets' | 'orders' | 'vault' | 'nfts';

const ASSET_KINDS: AssetKind[] = ['Tokens', 'NFTs', 'Commodities', 'Currencies'];
const ORDER_TYPES: InstitutionalOrderType[] = [
  'LIMIT',
  'MARKET',
  'PEGGED',
  'ICEBERG',
  'FOK',
  'IOC',
  'TWAP',
  'VWAP',
];
const RARITY_TIERS: RarityTier[] = ['Mythic', 'Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'];

export const CloudDatabaseView: React.FC<CloudDatabaseViewProps> = ({ workspaceAssets }) => {
  const {
    user,
    authReady,
    profile,
    assets,
    orders,
    vaultRecords,
    nftEditions,
    signingIn,
    authError,
    firestoreError,
    signInWithGoogle,
    signOutUser,
    saveProfile,
    clearErrors,
  } = useFirebase();

  const [activeTab, setActiveTab] = useState<DbTab>('assets');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Profile editor state
  const [orgInput, setOrgInput] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);

  // New Asset Form
  const [assetSymbol, setAssetSymbol] = useState('TWATS');
  const [assetName, setAssetName] = useState('TokenWorld ATS Reserve');
  const [assetKind, setAssetKind] = useState<AssetKind>('Tokens');
  const [assetChain, setAssetChain] = useState('Ethereum Mainnet');
  const [assetStandard, setAssetStandard] = useState('ERC-3643');
  const [assetContract, setAssetContract] = useState('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D');
  const [assetPrice, setAssetPrice] = useState('125.00');
  const [assetSupply, setAssetSupply] = useState('1,000,000,000');
  const [assetNotes, setAssetNotes] = useState('Sovereign treasury reserve tranche');

  // Inline asset edit
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // New Order Form
  const [orderAssetId, setOrderAssetId] = useState('');
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<InstitutionalOrderType>('LIMIT');
  const [orderQty, setOrderQty] = useState('250');
  const [orderLimitPrice, setOrderLimitPrice] = useState('125.00');

  // New Vault Ledger Form
  const [vaultType, setVaultType] = useState<'TRANCHE' | 'BURN' | 'AUDIT'>('TRANCHE');
  const [vaultSymbol, setVaultSymbol] = useState('TWATS');
  const [vaultAmount, setVaultAmount] = useState('500,000');
  const [vaultMemo, setVaultMemo] = useState('Sovereign vault treasury allocation');

  // New NFT Edition Form
  const [nftName, setNftName] = useState('Cosmic Sovereign #001');
  const [nftCollection, setNftCollection] = useState('Infinite Horizon Cosmic Nexus');
  const [nftScore, setNftScore] = useState('42.85');
  const [nftTier, setNftTier] = useState<RarityTier>('Legendary');
  const [nftTraits, setNftTraits] = useState('Obsidian Graphite · Meridian Cube · Brushed Gold · Sovereign Seal');

  const selectedOrderAsset: PersistedAssetDoc | undefined = useMemo(() => {
    if (!assets.length) return undefined;
    return assets.find((a) => a.id === orderAssetId) ?? assets[0];
  }, [assets, orderAssetId]);

  const runAction = async (label: string, fn: () => Promise<string | void>) => {
    setBusyAction(label);
    setFeedback(null);
    clearErrors();
    try {
      const msg = await fn();
      if (msg) setFeedback({ kind: 'ok', text: msg });
    } catch (err) {
      setFeedback({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Operation failed.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  if (!authReady) {
    return (
      <div className="rounded-xl border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] p-8 text-center">
        <div className="text-xs font-mono text-[var(--twe-text-muted)]">
          Initializing persistent cloud database session...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] p-6 sm:p-8 max-w-2xl mx-auto space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--twe-gold-soft)] border border-[#A8843E]/40 dark:border-[#D4B475]/40 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5 text-[#A8843E] dark:text-[#D4B475]" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-[var(--twe-text-primary)]">
              Persistent Cloud Ledger & Database
            </h2>
            <p className="text-xs text-[var(--twe-text-secondary)] mt-1 leading-relaxed">
              Sign in with Google to persist your TWE digital asset registry, parent-linked ATS
              orders, Sovereign Vault tranche &amp; burn receipts, and NFT Studio rarity editions
              across sessions with strict owner-isolated security rules.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-3 space-y-1">
            <div className="font-semibold text-[var(--twe-text-primary)] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Zero-Trust Owner Isolation
            </div>
            <p className="text-[var(--twe-text-muted)] text-[11px]">
              Every record is bound to your verified Firebase UID with immutable timestamps and
              terminal-state locks.
            </p>
          </div>
          <div className="rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-3 space-y-1">
            <div className="font-semibold text-[var(--twe-text-primary)] flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
              Real-Time Live Sync
            </div>
            <p className="text-[var(--twe-text-muted)] text-[11px]">
              Changes to assets, orders, vault entries, and NFT editions synchronize instantly
              across tabs and devices.
            </p>
          </div>
        </div>

        {authError && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-600 dark:text-rose-300">
            {authError}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-[var(--twe-border)]">
          <span className="text-[11px] font-mono text-[var(--twe-text-muted)]">
            Google Sign-In · Firestore Enterprise
          </span>
          <button
            type="button"
            disabled={signingIn}
            onClick={() => void signInWithGoogle()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{signingIn ? 'Signing in...' : 'Sign in with Google'}</span>
          </button>
        </div>
        </div>
        <CloudDbAndFoundryWorkbench mode="cloud-database" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Authenticated Operator Bar */}
      <div className="rounded-xl border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-[var(--twe-gold-soft)] border border-[#A8843E]/40 dark:border-[#D4B475]/40 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[var(--twe-text-primary)] truncate">
              {profile?.displayName || user.displayName || 'TWE Operator'}
              <span className="ml-2 font-mono text-[10px] font-normal text-[var(--twe-text-muted)]">
                {user.email}
              </span>
            </div>
            <div className="text-[11px] text-[var(--twe-text-secondary)] flex items-center gap-2 mt-0.5">
              {editingProfile ? (
                <form
                  className="inline-flex items-center gap-1.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void runAction('profile', async () => {
                      await saveProfile({ organization: orgInput });
                      setEditingProfile(false);
                      return 'Operator organization updated in Firestore.';
                    });
                  }}
                >
                  <input
                    type="text"
                    value={orgInput}
                    maxLength={BLUEPRINT_LIMITS.organizationMaxLength}
                    onChange={(e) => setOrgInput(e.target.value)}
                    placeholder="Organization name"
                    className="px-2 py-0.5 text-[11px] rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-primary)]"
                  />
                  <button
                    type="submit"
                    disabled={busyAction === 'profile'}
                    className="px-2 py-0.5 rounded bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-[10px] font-semibold cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProfile(false)}
                    className="px-1.5 py-0.5 text-[10px] text-[var(--twe-text-muted)] cursor-pointer"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <span>{profile?.organization || 'Token World Exchange ATS'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setOrgInput(profile?.organization || 'Token World Exchange ATS');
                      setEditingProfile(true);
                    }}
                    className="text-[10px] underline text-[#A8843E] dark:text-[#D4B475] cursor-pointer"
                  >
                    Edit Org
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busyAction === 'sync'}
            onClick={() =>
              void runAction('sync', async () => {
                const existingIds = new Set(assets.map((a) => a.id));
                const count = await syncWorkspaceAssetsToFirestore(
                  user.uid,
                  workspaceAssets,
                  existingIds,
                  8
                );
                return count > 0
                  ? `Synced ${count} Token Atlas assets to your persistent Firestore registry.`
                  : 'Top Token Atlas assets are already persisted in your registry.';
              })
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#A8843E]/50 dark:border-[#D4B475]/50 bg-[var(--twe-gold-soft)] text-xs font-semibold text-[var(--twe-text-primary)] hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${busyAction === 'sync' ? 'animate-spin' : ''}`} />
            <span>Sync Token Atlas</span>
          </button>

          <button
            type="button"
            onClick={() => void signOutUser()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-medium text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)] cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Feedback & Error Banners */}
      {feedback && (
        <div
          className={`rounded-lg border px-3.5 py-2.5 text-xs flex items-center justify-between gap-2 ${
            feedback.kind === 'ok'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
          }`}
        >
          <span className="break-all">{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[11px] underline shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {firestoreError && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2">
          <span className="font-mono break-all">{firestoreError}</span>
          <button
            type="button"
            onClick={clearErrors}
            className="text-[11px] underline shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            id: 'assets' as DbTab,
            label: 'Persisted Assets',
            count: assets.length,
            sub: `${assets.filter((a) => a.watchlisted).length} watchlisted`,
          },
          {
            id: 'orders' as DbTab,
            label: 'ATS Orders',
            count: orders.length,
            sub: `${orders.filter((o) => o.status === 'OPEN').length} open · ${orders.filter((o) => o.status === 'FILLED').length} filled`,
          },
          {
            id: 'vault' as DbTab,
            label: 'Vault & Burn Ledger',
            count: vaultRecords.length,
            sub: `${vaultRecords.filter((v) => v.status === 'FINALIZED').length} finalized`,
          },
          {
            id: 'nfts' as DbTab,
            label: 'NFT Rarity Editions',
            count: nftEditions.length,
            sub: `${nftEditions.filter((n) => n.rarityTier === 'Mythic' || n.rarityTier === 'Legendary').length} mythic/legendary`,
          },
        ].map((kpi) => {
          const active = activeTab === kpi.id;
          return (
            <button
              key={kpi.id}
              type="button"
              onClick={() => setActiveTab(kpi.id)}
              className={`text-left rounded-lg border p-3.5 transition-colors cursor-pointer ${
                active
                  ? 'border-[#A8843E] dark:border-[#D4B475] bg-[var(--twe-gold-soft)]'
                  : 'border-[var(--twe-border)] bg-[var(--twe-bg-surface)] hover:border-[#A8843E]/50'
              }`}
            >
              <div className="text-[11px] text-[var(--twe-text-muted)]">{kpi.label}</div>
              <div className="font-mono text-2xl font-bold tabular-nums text-[var(--twe-text-primary)] mt-1">
                {kpi.count}
              </div>
              <div className="text-[10px] font-mono text-[var(--twe-text-secondary)] mt-0.5">
                {kpi.sub}
              </div>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DIGITAL ASSETS */}
      {activeTab === 'assets' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <form
            className="xl:col-span-4 rounded-xl border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] p-4 space-y-3 h-fit"
            onSubmit={(e) => {
              e.preventDefault();
              void runAction('create-asset', async () => {
                await createPersistedAsset(user.uid, {
                  symbol: assetSymbol,
                  name: assetName,
                  kind: assetKind,
                  chain: assetChain,
                  standard: assetStandard,
                  contractAddress: assetContract,
                  priceUsd: Number(assetPrice) || 0,
                  supplyFormatted: assetSupply,
                  notes: assetNotes,
                });
                return `Persisted ${assetSymbol.toUpperCase()} to Firestore /assets.`;
              });
            }}
          >
            <div className="text-xs font-display font-semibold text-[var(--twe-text-primary)] flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
              Register Persistent Asset
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <label className="space-y-1 block">
                <span className="text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                  Ticker Symbol
                </span>
                <input
                  type="text"
                  required
                  maxLength={BLUEPRINT_LIMITS.tickerMaxLength}
                  value={assetSymbol}
                  onChange={(e) => setAssetSymbol(e.target.value.toUpperCase())}
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-mono text-[var(--twe-text-primary)]"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                  Class
                </span>
                <select
                  value={assetKind}
                  onChange={(e) => setAssetKind(e.target.value as AssetKind)}
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs text-[var(--twe-text-primary)]"
                >
                  {ASSET_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="space-y-1 block">
              <span className="text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                Asset Name
              </span>
              <input
                type="text"
                required
                maxLength={BLUEPRINT_LIMITS.assetNameMaxLength}
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs text-[var(--twe-text-primary)]"
              />
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              <label className="space-y-1 block">
                <span className="text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                  Chain
                </span>
                <input
                  type="text"
                  required
                  maxLength={BLUEPRINT_LIMITS.chainMaxLength}
                  value={assetChain}
                  onChange={(e) => setAssetChain(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs text-[var(--twe-text-primary)]"
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                  Standard
                </span>
                <input
                  type="text"
                  required
                  maxLength={BLUEPRINT_LIMITS.standardMaxLength}
                  value={assetStandard}
                  onChange={(e) => setAssetStandard(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-mono text-[var(--twe-text-primary)]"
                />
              </label>
            </div>

            <label className="space-y-1 block">
              <span className="text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                Contract / Spec ID
              </span>
              <input
                type="text"
                required
                maxLength={BLUEPRINT_LIMITS.contractAddressMaxLength}
                value={assetContract}
                onChange={(e) => setAssetContract(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-mono text-[var(--twe-text-primary)]"
              />
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              <label className="space-y-1 block">
                <span className="text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                  Mark Price (USD)
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={assetPrice}
                  onChange={(e) => setAssetPrice(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-mono tabular-nums text-[var(--twe-text-primary)]"
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                  Supply
                </span>
                <input
                  type="text"
                  required
                  maxLength={BLUEPRINT_LIMITS.supplyFormattedMaxLength}
                  value={assetSupply}
                  onChange={(e) => setAssetSupply(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-mono text-[var(--twe-text-primary)]"
                />
              </label>
            </div>

            <label className="space-y-1 block">
              <span className="text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                Notes ({assetNotes.length}/{BLUEPRINT_LIMITS.notesMaxLength})
              </span>
              <textarea
                rows={2}
                maxLength={BLUEPRINT_LIMITS.notesMaxLength}
                value={assetNotes}
                onChange={(e) => setAssetNotes(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs text-[var(--twe-text-primary)]"
              />
            </label>

            <button
              type="submit"
              disabled={busyAction === 'create-asset'}
              className="w-full py-2 rounded-md text-xs font-semibold bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {busyAction === 'create-asset' ? 'Saving...' : 'Save Asset to Cloud Database'}
            </button>
          </form>

          <div className="xl:col-span-8 rounded-xl border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--twe-border)] flex items-center justify-between">
              <span className="text-xs font-display font-semibold text-[var(--twe-text-primary)]">
                Persisted Assets Registry ({assets.length})
              </span>
              <span className="text-[10px] font-mono text-[var(--twe-text-muted)]">
                Collection: /assets
              </span>
            </div>

            {assets.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--twe-text-muted)] space-y-2">
                <p>No assets persisted yet.</p>
                <p>Use the form on the left or click &ldquo;Sync Token Atlas&rdquo; above to populate your registry.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--twe-bg-elevated)] text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                    <tr>
                      <th className="text-left px-3 py-2.5">Asset</th>
                      <th className="text-left px-3 py-2.5">Class / Chain</th>
                      <th className="text-right px-3 py-2.5">Mark Price</th>
                      <th className="text-left px-3 py-2.5">Status</th>
                      <th className="text-right px-3 py-2.5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--twe-border)]">
                    {assets.map((row) => {
                      const isLocked = row.status === 'Archived';
                      const isEditing = editingAssetId === row.id;
                      return (
                        <tr key={row.id} className="hover:bg-[var(--twe-bg-elevated)]/60">
                          <td className="px-3 py-2.5">
                            <div className="font-mono font-semibold text-[var(--twe-text-primary)]">
                              {row.symbol}
                            </div>
                            <div className="text-[11px] text-[var(--twe-text-secondary)] truncate max-w-[180px]">
                              {row.name}
                            </div>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editNotes}
                                maxLength={BLUEPRINT_LIMITS.notesMaxLength}
                                onChange={(e) => setEditNotes(e.target.value)}
                                className="mt-1 w-full px-1.5 py-0.5 text-[11px] rounded border border-[var(--twe-border)] bg-[var(--twe-bg-canvas)]"
                              />
                            ) : (
                              row.notes && (
                                <div className="text-[10px] text-[var(--twe-text-muted)] truncate max-w-[180px]">
                                  {row.notes}
                                </div>
                              )
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="text-[var(--twe-text-primary)]">{row.kind}</div>
                            <div className="text-[10px] font-mono text-[var(--twe-text-muted)]">
                              {row.chain} · {row.standard}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                            {isEditing ? (
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                className="w-24 px-1.5 py-0.5 text-right rounded border border-[var(--twe-border)] bg-[var(--twe-bg-canvas)]"
                              />
                            ) : (
                              <span>${row.priceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {isLocked ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-500/15 text-[10px] font-mono text-[var(--twe-text-muted)]">
                                <Lock className="w-2.5 h-2.5" />
                                Archived
                              </span>
                            ) : (
                              <select
                                value={row.status}
                                onChange={(e) =>
                                  void runAction(`status-${row.id}`, async () => {
                                    await updateAssetStatus(
                                      row.id,
                                      e.target.value as PersistedAssetDoc['status']
                                    );
                                    return `Updated ${row.symbol} status to ${e.target.value}.`;
                                  })
                                }
                                className="px-1.5 py-0.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[11px]"
                              >
                                <option value="Active">Active</option>
                                <option value="Review">Review</option>
                                <option value="Restricted">Restricted</option>
                                <option value="Archived">Archive (Lock)</option>
                              </select>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {!isLocked && (
                                <button
                                  type="button"
                                  title={row.watchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
                                  onClick={() =>
                                    void runAction(`watch-${row.id}`, async () => {
                                      await toggleAssetWatchlist(row.id, !row.watchlisted);
                                    })
                                  }
                                  className={`p-1 rounded border border-[var(--twe-border)] cursor-pointer ${
                                    row.watchlisted
                                      ? 'text-[#A8843E] dark:text-[#D4B475] bg-[var(--twe-gold-soft)]'
                                      : 'text-[var(--twe-text-muted)]'
                                  }`}
                                >
                                  <Star className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {!isLocked &&
                                (isEditing ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void runAction(`edit-${row.id}`, async () => {
                                        await updateAssetPriceAndNotes(
                                          row.id,
                                          Number(editPrice) || 0,
                                          editNotes
                                        );
                                        setEditingAssetId(null);
                                        return `Updated ${row.symbol} price and notes.`;
                                      })
                                    }
                                    className="px-2 py-1 rounded bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-[10px] font-semibold cursor-pointer"
                                  >
                                    Save
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingAssetId(row.id);
                                      setEditPrice(String(row.priceUsd));
                                      setEditNotes(row.notes);
                                    }}
                                    className="px-2 py-1 rounded border border-[var(--twe-border)] text-[10px] text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)] cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                ))}
                              <button
                                type="button"
                                title="Delete asset"
                                onClick={() =>
                                  void runAction(`del-${row.id}`, async () => {
                                    await deletePersistedAsset(row.id);
                                    return `Deleted ${row.symbol} from Firestore.`;
                                  })
                                }
                                className="p-1 rounded border border-[var(--twe-border)] text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* TAB 2: ATS ORDERS */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <form
            className="xl:col-span-4 rounded-xl border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] p-4 space-y-3 h-fit"
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedOrderAsset) return;
              void runAction('create-order', async () => {
                await createPersistedOrder(user.uid, {
                  assetId: selectedOrderAsset.id,
                  symbol: selectedOrderAsset.symbol,
                  side: orderSide,
                  orderType,
                  quantity: Number(orderQty) || 1,
                  limitPriceUsd: Number(orderLimitPrice) || selectedOrderAsset.priceUsd,
                });
                return `Created OPEN ${orderSide} order for ${selectedOrderAsset.symbol}.`;
              });
            }}
          >
            <div className="text-xs font-display font-semibold text-[var(--twe-text-primary)] flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
              Create Parent-Linked ATS Order
            </div>

            {assets.length === 0 ? (
              <div className="text-xs text-[var(--twe-text-muted)] p-3 rounded border border-dashed border-[var(--twe-border)]">
                Add or sync at least one asset in the Assets tab first. Orders enforce relational
                parent-asset verification in Firestore rules.
              </div>
            ) : (
              <>
                <label className="space-y-1 block">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                    Parent Persisted Asset
                  </span>
                  <select
                    value={selectedOrderAsset?.id || ''}
                    onChange={(e) => {
                      setOrderAssetId(e.target.value);
                      const found = assets.find((a) => a.id === e.target.value);
                      if (found) setOrderLimitPrice(String(found.priceUsd));
                    }}
                    className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs text-[var(--twe-text-primary)]"
                  >
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.symbol} — {a.name} (${a.priceUsd})
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-2.5">
                  <label className="space-y-1 block">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                      Side
                    </span>
                    <select
                      value={orderSide}
                      onChange={(e) => setOrderSide(e.target.value as 'BUY' | 'SELL')}
                      className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-mono text-[var(--twe-text-primary)]"
                    >
                      <option value="BUY">BUY</option>
                      <option value="SELL">SELL</option>
                    </select>
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                      Order Type
                    </span>
                    <select
                      value={orderType}
                      onChange={(e) => setOrderType(e.target.value as InstitutionalOrderType)}
                      className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-mono text-[var(--twe-text-primary)]"
                    >
                      {ORDER_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <label className="space-y-1 block">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                      Quantity
                    </span>
                    <input
                      type="number"
                      min="0.0001"
                      step="any"
                      required
                      value={orderQty}
                      onChange={(e) => setOrderQty(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-mono tabular-nums text-[var(--twe-text-primary)]"
                    />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                      Limit Price (USD)
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={orderLimitPrice}
                      onChange={(e) => setOrderLimitPrice(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-mono tabular-nums text-[var(--twe-text-primary)]"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={busyAction === 'create-order'}
                  className="w-full py-2 rounded-md text-xs font-semibold bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {busyAction === 'create-order' ? 'Submitting...' : 'Submit Persistent Order'}
                </button>
              </>
            )}
          </form>

          <div className="xl:col-span-8 rounded-xl border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--twe-border)] flex items-center justify-between">
              <span className="text-xs font-display font-semibold text-[var(--twe-text-primary)]">
                Persisted ATS Orders ({orders.length})
              </span>
              <span className="text-[10px] font-mono text-[var(--twe-text-muted)]">
                Collection: /orders
              </span>
            </div>

            {orders.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--twe-text-muted)]">
                No persisted ATS orders yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--twe-bg-elevated)] text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                    <tr>
                      <th className="text-left px-3 py-2.5">Symbol / Type</th>
                      <th className="text-left px-3 py-2.5">Side</th>
                      <th className="text-right px-3 py-2.5">Qty &amp; Limit</th>
                      <th className="text-left px-3 py-2.5">Status</th>
                      <th className="text-right px-3 py-2.5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--twe-border)]">
                    {orders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-[var(--twe-bg-elevated)]/60">
                        <td className="px-3 py-2.5">
                          <div className="font-mono font-semibold text-[var(--twe-text-primary)]">
                            {ord.symbol}
                          </div>
                          <div className="text-[10px] font-mono text-[var(--twe-text-muted)]">
                            {ord.orderType} · {ord.assetId.slice(0, 14)}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                              ord.side === 'BUY'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-300'
                            }`}
                          >
                            {ord.side}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                          <div>{ord.quantity.toLocaleString()}</div>
                          <div className="text-[10px] text-[var(--twe-text-muted)]">
                            @ ${ord.limitPriceUsd.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono ${
                              ord.status === 'FILLED'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                                : ord.status === 'CANCELLED'
                                  ? 'bg-zinc-500/15 text-[var(--twe-text-muted)]'
                                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
                            }`}
                          >
                            {ord.status !== 'OPEN' && <Lock className="w-2.5 h-2.5" />}
                            {ord.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {ord.status === 'OPEN' && (
                              <>
                                <button
                                  type="button"
                                  title="Mark Filled (Terminal)"
                                  onClick={() =>
                                    void runAction(`fill-${ord.id}`, async () => {
                                      await settleOrCancelOrder(ord.id, 'FILLED');
                                      return `Settled order ${ord.symbol} as FILLED.`;
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 text-[10px] font-semibold cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  Fill
                                </button>
                                <button
                                  type="button"
                                  title="Cancel Order (Terminal)"
                                  onClick={() =>
                                    void runAction(`cancel-${ord.id}`, async () => {
                                      await settleOrCancelOrder(ord.id, 'CANCELLED');
                                      return `Cancelled order ${ord.symbol}.`;
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/15 text-amber-600 dark:text-amber-300 text-[10px] font-semibold cursor-pointer"
                                >
                                  <XCircle className="w-3 h-3" />
                                  Cancel
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              title="Delete order"
                              onClick={() =>
                                void runAction(`del-ord-${ord.id}`, async () => {
                                  await deletePersistedOrder(ord.id);
                                  return 'Deleted order record.';
                                })
                              }
                              className="p-1 rounded border border-[var(--twe-border)] text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: VAULT & BURN LEDGER */}
      {activeTab === 'vault' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <form
            className="xl:col-span-4 rounded-xl border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] p-4 space-y-3 h-fit"
            onSubmit={(e) => {
              e.preventDefault();
              void runAction('create-vault', async () => {
                await createVaultRecord(user.uid, {
                  recordType: vaultType,
                  symbol: vaultSymbol,
                  amountFormatted: vaultAmount,
                  memo: vaultMemo,
                });
                return `Recorded PENDING ${vaultType} entry for ${vaultSymbol.toUpperCase()}.`;
              });
            }}
          >
            <div className="text-xs font-display font-semibold text-[var(--twe-text-primary)] flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
              Log Vault Tranche / Burn Entry
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <label className="space-y-1 block">
                <span className="text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                  Record Type
                </span>
                <select
                  value={vaultType}
                  onChange={(e) => setVaultType(e.target.value as 'TRANCHE' | 'BURN' | 'AUDIT')}
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-mono text-[var(--twe-text-primary)]"
                >
                  <option value="TRANCHE">TRANCHE</option>
                  <option value="BURN">BURN</option>
                  <option value="AUDIT">AUDIT</option>
                </select>
              </label>

              <label className="space-y-1 block">
                <span className="text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                  Symbol
                </span>
                <input
                  type="text"
                  required
                  maxLength={BLUEPRINT_LIMITS.tickerMaxLength}
                  value={vaultSymbol}
                  onChange={(e) => setVaultSymbol(e.target.value.toUpperCase())}
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-mono text-[var(--twe-text-primary)]"
                />
              </label>
            </div>

            <label className="space-y-1 block">
              <span className="text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                Amount / Units
              </span>
              <input
                type="text"
                required
                maxLength={BLUEPRINT_LIMITS.supplyFormattedMaxLength}
                value={vaultAmount}
                onChange={(e) => setVaultAmount(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-mono text-[var(--twe-text-primary)]"
              />
            </label>

            <label className="space-y-1 block">
              <span className="text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                Audit Memo ({vaultMemo.length}/{BLUEPRINT_LIMITS.memoMaxLength})
              </span>
              <textarea
                rows={2}
                maxLength={BLUEPRINT_LIMITS.memoMaxLength}
                value={vaultMemo}
                onChange={(e) => setVaultMemo(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs text-[var(--twe-text-primary)]"
              />
            </label>

            <button
              type="submit"
              disabled={busyAction === 'create-vault'}
              className="w-full py-2 rounded-md text-xs font-semibold bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {busyAction === 'create-vault' ? 'Logging...' : 'Write to Vault Ledger'}
            </button>
          </form>

          <div className="xl:col-span-8 rounded-xl border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--twe-border)] flex items-center justify-between">
              <span className="text-xs font-display font-semibold text-[var(--twe-text-primary)]">
                Sovereign Vault &amp; Burn Ledger ({vaultRecords.length})
              </span>
              <span className="text-[10px] font-mono text-[var(--twe-text-muted)]">
                Collection: /vaultRecords
              </span>
            </div>

            {vaultRecords.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--twe-text-muted)]">
                No vault ledger records persisted yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--twe-bg-elevated)] text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                    <tr>
                      <th className="text-left px-3 py-2.5">Type / Symbol</th>
                      <th className="text-left px-3 py-2.5">Amount &amp; Memo</th>
                      <th className="text-left px-3 py-2.5">Tx Reference</th>
                      <th className="text-left px-3 py-2.5">State</th>
                      <th className="text-right px-3 py-2.5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--twe-border)]">
                    {vaultRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-[var(--twe-bg-elevated)]/60">
                        <td className="px-3 py-2.5">
                          <span className="font-mono font-semibold text-[var(--twe-text-primary)]">
                            {rec.recordType}
                          </span>
                          <div className="text-[10px] font-mono text-[#A8843E] dark:text-[#D4B475]">
                            {rec.symbol}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-mono tabular-nums text-[var(--twe-text-primary)]">
                            {rec.amountFormatted}
                          </div>
                          {rec.memo && (
                            <div className="text-[10px] text-[var(--twe-text-muted)] truncate max-w-[220px]">
                              {rec.memo}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[10px] text-[var(--twe-text-secondary)]">
                          {rec.txHash.slice(0, 18)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono ${
                              rec.status === 'FINALIZED'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
                            }`}
                          >
                            {rec.status === 'FINALIZED' && <Lock className="w-2.5 h-2.5" />}
                            {rec.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          {rec.status === 'PENDING' ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  void runAction(`fin-${rec.id}`, async () => {
                                    await finalizeVaultRecord(rec.id);
                                    return `Finalized ${rec.recordType} entry (now immutable).`;
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 text-[10px] font-semibold cursor-pointer"
                              >
                                <Lock className="w-3 h-3" />
                                Finalize
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void runAction(`del-vlt-${rec.id}`, async () => {
                                    await deleteVaultRecord(rec.id);
                                    return 'Deleted pending vault entry.';
                                  })
                                }
                                className="p-1 rounded border border-[var(--twe-border)] text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-mono text-[var(--twe-text-muted)]">
                              Locked
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: NFT RARITY EDITIONS */}
      {activeTab === 'nfts' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <form
            className="xl:col-span-4 rounded-xl border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] p-4 space-y-3 h-fit"
            onSubmit={(e) => {
              e.preventDefault();
              void runAction('create-nft', async () => {
                await createNftEdition(user.uid, {
                  name: nftName,
                  collection: nftCollection,
                  rarityScore: Number(nftScore) || 0,
                  rarityTier: nftTier,
                  traitsSummary: nftTraits,
                });
                return `Saved NFT edition "${nftName}" to Firestore.`;
              });
            }}
          >
            <div className="text-xs font-display font-semibold text-[var(--twe-text-primary)] flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
              Archive NFT Rarity Edition
            </div>

            <label className="space-y-1 block">
              <span className="text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                Edition Name
              </span>
              <input
                type="text"
                required
                maxLength={BLUEPRINT_LIMITS.assetNameMaxLength}
                value={nftName}
                onChange={(e) => setNftName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs text-[var(--twe-text-primary)]"
              />
            </label>

            <label className="space-y-1 block">
              <span className="text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                Collection
              </span>
              <input
                type="text"
                required
                maxLength={BLUEPRINT_LIMITS.assetNameMaxLength}
                value={nftCollection}
                onChange={(e) => setNftCollection(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs text-[var(--twe-text-primary)]"
              />
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              <label className="space-y-1 block">
                <span className="text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                  Rarity Score
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={nftScore}
                  onChange={(e) => setNftScore(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-mono tabular-nums text-[var(--twe-text-primary)]"
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                  Rarity Tier
                </span>
                <select
                  value={nftTier}
                  onChange={(e) => setNftTier(e.target.value as RarityTier)}
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs text-[var(--twe-text-primary)]"
                >
                  {RARITY_TIERS.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="space-y-1 block">
              <span className="text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                Traits Summary
              </span>
              <textarea
                rows={2}
                required
                maxLength={BLUEPRINT_LIMITS.traitsSummaryMaxLength}
                value={nftTraits}
                onChange={(e) => setNftTraits(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs text-[var(--twe-text-primary)]"
              />
            </label>

            <button
              type="submit"
              disabled={busyAction === 'create-nft'}
              className="w-full py-2 rounded-md text-xs font-semibold bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {busyAction === 'create-nft' ? 'Saving...' : 'Persist NFT Edition'}
            </button>
          </form>

          <div className="xl:col-span-8 rounded-xl border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--twe-border)] flex items-center justify-between">
              <span className="text-xs font-display font-semibold text-[var(--twe-text-primary)]">
                Persisted NFT Studio Editions ({nftEditions.length})
              </span>
              <span className="text-[10px] font-mono text-[var(--twe-text-muted)]">
                Collection: /nftEditions
              </span>
            </div>

            {nftEditions.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--twe-text-muted)]">
                No NFT editions archived yet. Save one here or directly from NFT Studio.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[var(--twe-bg-elevated)] text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                    <tr>
                      <th className="text-left px-3 py-2.5">Edition &amp; Collection</th>
                      <th className="text-left px-3 py-2.5">Traits</th>
                      <th className="text-right px-3 py-2.5">Rarity</th>
                      <th className="text-left px-3 py-2.5">CID</th>
                      <th className="text-right px-3 py-2.5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--twe-border)]">
                    {nftEditions.map((ed) => (
                      <tr key={ed.id} className="hover:bg-[var(--twe-bg-elevated)]/60">
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-[var(--twe-text-primary)]">{ed.name}</div>
                          <div className="text-[10px] text-[var(--twe-text-muted)]">{ed.collection}</div>
                        </td>
                        <td className="px-3 py-2.5 text-[11px] text-[var(--twe-text-secondary)] max-w-[220px] truncate">
                          {ed.traitsSummary}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                          <div className="font-semibold text-[#A8843E] dark:text-[#D4B475]">
                            {ed.rarityScore.toFixed(2)} pts
                          </div>
                          <div className="text-[10px] text-[var(--twe-text-muted)]">{ed.rarityTier}</div>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[10px] text-[var(--twe-text-muted)]">
                          {ed.ipfsCid.slice(0, 16)}…
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              void runAction(`del-nft-${ed.id}`, async () => {
                                await deleteNftEdition(ed.id);
                                return `Deleted ${ed.name}.`;
                              })
                            }
                            className="p-1 rounded border border-[var(--twe-border)] text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hyper-Scale 590-Digit Cloud Database Webpages + Account Tables + Checkout Aggregator */}
      <CloudDbAndFoundryWorkbench mode="cloud-database" />
    </div>
  );
};
