import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Coins,
  Landmark,
  Lock,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

export const DAO_STAKING_STORAGE_KEY = 'twe-dao-staking-v1';
export const DAO_STAKING_EVENT = 'twe:dao-stake-changed';

export interface LockupTier {
  id: 'flexible' | 'tier-30' | 'tier-90' | 'tier-365';
  label: string;
  lockDays: number;
  apyPct: number;
  votingMultiplier: number;
  description: string;
}

export const STAKING_LOCK_TIERS: LockupTier[] = [
  {
    id: 'flexible',
    label: 'Flexible Reserve',
    lockDays: 0,
    apyPct: 8.5,
    votingMultiplier: 1.0,
    description: 'Instant liquidity withdrawal with 1.00× base DAO voting weight.',
  },
  {
    id: 'tier-30',
    label: '30-Day Governance',
    lockDays: 30,
    apyPct: 12.4,
    votingMultiplier: 1.25,
    description: 'Short-horizon lock with 1.25× boosted quorum weight.',
  },
  {
    id: 'tier-90',
    label: '90-Day Council',
    lockDays: 90,
    apyPct: 18.2,
    votingMultiplier: 1.75,
    description: 'Quarterly treasury alignment with 1.75× voting multiplier.',
  },
  {
    id: 'tier-365',
    label: '365-Day Sovereign',
    lockDays: 365,
    apyPct: 26.0,
    votingMultiplier: 2.5,
    description: 'Maximum protocol fee share and 2.50× Omega DAO voting power.',
  },
];

export interface StakingActivityEntry {
  id: string;
  action: 'STAKE' | 'UNSTAKE' | 'CLAIM';
  amount: number;
  tierLabel: string;
  txHash: string;
  timestamp: string;
}

export interface DaoStakingSnapshot {
  walletBalance: number;
  stakedAmount: number;
  lockTierId: LockupTier['id'];
  multiplier: number;
  apyPct: number;
  accruedRewards: number;
  claimedRewardsTotal: number;
  lastUpdated: number;
  history: StakingActivityEntry[];
}

const DEFAULT_SNAPSHOT: DaoStakingSnapshot = {
  walletBalance: 180_000,
  stakedAmount: 65_000,
  lockTierId: 'tier-90',
  multiplier: 1.75,
  apyPct: 18.2,
  accruedRewards: 412.85,
  claimedRewardsTotal: 3_240.5,
  lastUpdated: Date.now(),
  history: [
    {
      id: 'stk-genesis-1',
      action: 'STAKE',
      amount: 65_000,
      tierLabel: '90-Day Council',
      txHash: '0x9d4f7c2183a05b6611e9f0c84b2a19d55a0e7712c8e0f104917a2c88d9103f4a',
      timestamp: '2026-11-18T14:20:00.000Z',
    },
    {
      id: 'stk-genesis-2',
      action: 'CLAIM',
      amount: 3_240.5,
      tierLabel: '90-Day Council',
      txHash: '0x3b81e04492f7c0135d6e1008a7f902c4e318d2b6f10c5592837a10fe4c9012d1',
      timestamp: '2026-11-20T09:05:00.000Z',
    },
  ],
};

export function loadDaoStakingSnapshot(): DaoStakingSnapshot {
  try {
    const raw = window.localStorage.getItem(DAO_STAKING_STORAGE_KEY);
    if (!raw) return DEFAULT_SNAPSHOT;
    const parsed = JSON.parse(raw) as Partial<DaoStakingSnapshot>;
    const tier =
      STAKING_LOCK_TIERS.find((t) => t.id === parsed.lockTierId) ?? STAKING_LOCK_TIERS[2];
    return {
      walletBalance:
        typeof parsed.walletBalance === 'number' && Number.isFinite(parsed.walletBalance)
          ? Math.max(0, parsed.walletBalance)
          : DEFAULT_SNAPSHOT.walletBalance,
      stakedAmount:
        typeof parsed.stakedAmount === 'number' && Number.isFinite(parsed.stakedAmount)
          ? Math.max(0, parsed.stakedAmount)
          : DEFAULT_SNAPSHOT.stakedAmount,
      lockTierId: tier.id,
      multiplier: tier.votingMultiplier,
      apyPct: tier.apyPct,
      accruedRewards:
        typeof parsed.accruedRewards === 'number' && Number.isFinite(parsed.accruedRewards)
          ? Math.max(0, parsed.accruedRewards)
          : DEFAULT_SNAPSHOT.accruedRewards,
      claimedRewardsTotal:
        typeof parsed.claimedRewardsTotal === 'number' &&
        Number.isFinite(parsed.claimedRewardsTotal)
          ? Math.max(0, parsed.claimedRewardsTotal)
          : DEFAULT_SNAPSHOT.claimedRewardsTotal,
      lastUpdated:
        typeof parsed.lastUpdated === 'number' ? parsed.lastUpdated : Date.now(),
      history: Array.isArray(parsed.history) ? parsed.history : DEFAULT_SNAPSHOT.history,
    };
  } catch {
    return DEFAULT_SNAPSHOT;
  }
}

export function saveDaoStakingSnapshot(snapshot: DaoStakingSnapshot): void {
  try {
    window.localStorage.setItem(DAO_STAKING_STORAGE_KEY, JSON.stringify(snapshot));
    window.dispatchEvent(new CustomEvent(DAO_STAKING_EVENT, { detail: snapshot }));
  } catch {
    // ignore storage quota failures
  }
}

function makeDeterministicTxHash(seed: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < seed.length; i += 1) {
    h1 ^= seed.charCodeAt(i);
    h1 = Math.imul(h1, 16777619);
    h2 ^= seed.charCodeAt(i) + i;
    h2 = Math.imul(h2, 2246822519);
  }
  const seg = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return (
    '0x' +
    seg(h1) +
    seg(h2) +
    seg(h1 ^ 0xa5a5a5a5) +
    seg(h2 ^ 0x5a5a5a5a) +
    seg(Math.imul(h1, 31) ^ h2) +
    seg(Math.imul(h2, 17) ^ h1) +
    seg(h1 + h2) +
    seg((h1 ^ h2) >>> 1)
  );
}

export const StakingPool: React.FC<{
  onOpenGovernance?: () => void;
}> = ({ onOpenGovernance }) => {
  const [snapshot, setSnapshot] = useState<DaoStakingSnapshot>(() => loadDaoStakingSnapshot());
  const [mode, setMode] = useState<'stake' | 'unstake'>('stake');
  const [amountInput, setAmountInput] = useState<string>('25000');
  const [selectedTierId, setSelectedTierId] = useState<LockupTier['id']>(snapshot.lockTierId);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeTier = useMemo(
    () => STAKING_LOCK_TIERS.find((t) => t.id === snapshot.lockTierId) ?? STAKING_LOCK_TIERS[2],
    [snapshot.lockTierId]
  );

  const selectedTier = useMemo(
    () => STAKING_LOCK_TIERS.find((t) => t.id === selectedTierId) ?? STAKING_LOCK_TIERS[2],
    [selectedTierId]
  );

  // Live streaming reward accrual every 2 seconds
  useEffect(() => {
    const timer = window.setInterval(() => {
      setSnapshot((prev) => {
        if (prev.stakedAmount <= 0) return prev;
        const perSecond = (prev.stakedAmount * (prev.apyPct / 100)) / 31_536_000;
        const next: DaoStakingSnapshot = {
          ...prev,
          accruedRewards: Number((prev.accruedRewards + perSecond * 2).toFixed(6)),
          lastUpdated: Date.now(),
        };
        saveDaoStakingSnapshot(next);
        return next;
      });
    }, 2000);
    return () => window.clearInterval(timer);
  }, []);

  const boostedVotingPower = Math.round(snapshot.stakedAmount * snapshot.multiplier);
  const totalPoolTvlTokens = 48_250_000 + snapshot.stakedAmount;
  const userPoolSharePct = (snapshot.stakedAmount / totalPoolTvlTokens) * 100;

  const projectedAnnualYield = useMemo(() => {
    const amt = Math.max(0, Number(amountInput) || 0);
    const futureStake =
      mode === 'stake'
        ? snapshot.stakedAmount + amt
        : Math.max(0, snapshot.stakedAmount - amt);
    const tier = mode === 'stake' ? selectedTier : activeTier;
    return {
      futureStake,
      annualTokens: futureStake * (tier.apyPct / 100),
      monthlyTokens: (futureStake * (tier.apyPct / 100)) / 12,
      votingPower: Math.round(futureStake * tier.votingMultiplier),
    };
  }, [amountInput, mode, snapshot.stakedAmount, selectedTier, activeTier]);

  const handlePresetPct = (pct: number) => {
    const base = mode === 'stake' ? snapshot.walletBalance : snapshot.stakedAmount;
    setAmountInput(String(Math.floor(base * pct)));
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const amt = Number(amountInput);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Enter a valid positive TWATS quantity.');
      return;
    }

    if (mode === 'stake') {
      if (amt > snapshot.walletBalance) {
        setError(
          `Insufficient wallet balance (${snapshot.walletBalance.toLocaleString('en-US')} TWATS available).`
        );
        return;
      }
      const txHash = makeDeterministicTxHash(`stake:${amt}:${selectedTier.id}:${Date.now()}`);
      const next: DaoStakingSnapshot = {
        ...snapshot,
        walletBalance: Number((snapshot.walletBalance - amt).toFixed(4)),
        stakedAmount: Number((snapshot.stakedAmount + amt).toFixed(4)),
        lockTierId: selectedTier.id,
        multiplier: selectedTier.votingMultiplier,
        apyPct: selectedTier.apyPct,
        lastUpdated: Date.now(),
        history: [
          {
            id: `stk-${Date.now()}`,
            action: 'STAKE' as const,
            amount: amt,
            tierLabel: selectedTier.label,
            txHash,
            timestamp: new Date().toISOString(),
          },
          ...snapshot.history,
        ].slice(0, 20),
      };
      setSnapshot(next);
      saveDaoStakingSnapshot(next);
      setNotice(
        `Staked ${amt.toLocaleString('en-US')} TWATS in ${selectedTier.label} (${selectedTier.votingMultiplier.toFixed(2)}× voting weight).`
      );
    } else {
      if (amt > snapshot.stakedAmount) {
        setError(
          `Cannot unstake more than your active stake (${snapshot.stakedAmount.toLocaleString('en-US')} TWATS).`
        );
        return;
      }
      const txHash = makeDeterministicTxHash(`unstake:${amt}:${activeTier.id}:${Date.now()}`);
      const next: DaoStakingSnapshot = {
        ...snapshot,
        walletBalance: Number((snapshot.walletBalance + amt).toFixed(4)),
        stakedAmount: Number((snapshot.stakedAmount - amt).toFixed(4)),
        lastUpdated: Date.now(),
        history: [
          {
            id: `unstk-${Date.now()}`,
            action: 'UNSTAKE' as const,
            amount: amt,
            tierLabel: activeTier.label,
            txHash,
            timestamp: new Date().toISOString(),
          },
          ...snapshot.history,
        ].slice(0, 20),
      };
      setSnapshot(next);
      saveDaoStakingSnapshot(next);
      setNotice(
        `Unstaked ${amt.toLocaleString('en-US')} TWATS back to operator wallet balance.`
      );
    }
  };

  const handleClaimRewards = () => {
    if (snapshot.accruedRewards <= 0) return;
    const claimed = Number(snapshot.accruedRewards.toFixed(4));
    const txHash = makeDeterministicTxHash(`claim:${claimed}:${Date.now()}`);
    const next: DaoStakingSnapshot = {
      ...snapshot,
      walletBalance: Number((snapshot.walletBalance + claimed).toFixed(4)),
      accruedRewards: 0,
      claimedRewardsTotal: Number((snapshot.claimedRewardsTotal + claimed).toFixed(4)),
      lastUpdated: Date.now(),
      history: [
        {
          id: `clm-${Date.now()}`,
          action: 'CLAIM' as const,
          amount: claimed,
          tierLabel: activeTier.label,
          txHash,
          timestamp: new Date().toISOString(),
        },
        ...snapshot.history,
      ].slice(0, 20),
    };
    setSnapshot(next);
    saveDaoStakingSnapshot(next);
    setNotice(`Claimed ${claimed.toLocaleString('en-US', { maximumFractionDigits: 4 })} TWATS rewards into wallet.`);
  };

  return (
    <div className="space-y-4">
      {/* Top KPI Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">
            <span>Total Staked Position</span>
            <Lock className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
          </div>
          <div className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-[var(--twe-text-primary)]">
            {snapshot.stakedAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })} TWATS
          </div>
          <div className="mt-1 text-[11px] text-[var(--twe-text-secondary)]">
            Tier: {activeTier.label} · {userPoolSharePct.toFixed(3)}% of pool TVL
          </div>
        </div>

        <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">
            <span>Boosted DAO Voting Power</span>
            <Landmark className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {boostedVotingPower.toLocaleString('en-US')} vTWATS
          </div>
          <div className="mt-1 text-[11px] text-[var(--twe-text-secondary)]">
            {snapshot.multiplier.toFixed(2)}× multiplier synced to TokenGovernanceDAO
          </div>
        </div>

        <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">
            <span>Active Yield Rate</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
          </div>
          <div className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-[#A8843E] dark:text-[#D4B475]">
            {snapshot.apyPct.toFixed(1)}% APY
          </div>
          <div className="mt-1 text-[11px] text-[var(--twe-text-secondary)]">
            Protocol fee treasury redistribution
          </div>
        </div>

        <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">
            <span>Claimable Rewards</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-2">
            <span className="font-mono text-xl font-semibold tabular-nums text-[var(--twe-text-primary)]">
              {snapshot.accruedRewards.toLocaleString('en-US', {
                minimumFractionDigits: 4,
                maximumFractionDigits: 4,
              })}
            </span>
            <button
              type="button"
              onClick={handleClaimRewards}
              disabled={snapshot.accruedRewards <= 0}
              className="px-2.5 py-1 rounded bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-[11px] font-semibold hover:opacity-90 disabled:opacity-40 cursor-pointer"
            >
              Claim
            </button>
          </div>
          <div className="mt-1 text-[11px] font-mono tabular-nums text-[var(--twe-text-secondary)]">
            Lifetime claimed: {snapshot.claimedRewardsTotal.toLocaleString('en-US', { maximumFractionDigits: 2 })} TWATS
          </div>
        </div>
      </div>

      {/* Main Split: Left Lockup Tiers + Action Form | Right Pool Metrics & Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMode('stake');
                  setError(null);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded font-medium cursor-pointer ${
                  mode === 'stake'
                    ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10]'
                    : 'text-[var(--twe-text-secondary)]'
                }`}
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                <span>Stake TWATS</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('unstake');
                  setError(null);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded font-medium cursor-pointer ${
                  mode === 'unstake'
                    ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10]'
                    : 'text-[var(--twe-text-secondary)]'
                }`}
              >
                <ArrowUpFromLine className="w-3.5 h-3.5" />
                <span>Unstake TWATS</span>
              </button>
            </div>

            <div className="text-xs font-mono tabular-nums text-[var(--twe-text-secondary)]">
              Wallet:{' '}
              <span className="font-semibold text-[var(--twe-text-primary)]">
                {snapshot.walletBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })} TWATS
              </span>
            </div>
          </div>

          {/* Lockup Tier Selector */}
          {mode === 'stake' && (
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                Select Governance Lockup Tier
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {STAKING_LOCK_TIERS.map((tier) => {
                  const chosen = selectedTierId === tier.id;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setSelectedTierId(tier.id)}
                      className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                        chosen
                          ? 'border-[#A8843E] dark:border-[#D4B475] bg-[var(--twe-gold-soft)]'
                          : 'border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] hover:border-[var(--twe-border-strong)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[var(--twe-text-primary)]">
                          {tier.label}
                        </span>
                        <span className="font-mono text-xs font-bold text-[#A8843E] dark:text-[#D4B475]">
                          {tier.apyPct.toFixed(1)}% APY
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-[var(--twe-text-secondary)]">
                        <span>{tier.lockDays === 0 ? 'No lockup' : `${tier.lockDays}-day lock`}</span>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {tier.votingMultiplier.toFixed(2)}× Vote Weight
                        </span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-[var(--twe-text-muted)] leading-snug">
                        {tier.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 pt-1">
            <label className="block text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[var(--twe-text-muted)] uppercase tracking-wider">
                  {mode === 'stake' ? 'Amount to Stake (TWATS)' : 'Amount to Unstake (TWATS)'}
                </span>
                <div className="flex items-center gap-1.5">
                  {[0.25, 0.5, 0.75, 1].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handlePresetPct(pct)}
                      className="px-1.5 py-0.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] font-mono text-[10px] text-[var(--twe-text-secondary)] hover:border-[#D4B475] cursor-pointer"
                    >
                      {pct === 1 ? 'MAX' : `${pct * 100}%`}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="number"
                min="1"
                step="any"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-sm tabular-nums text-[var(--twe-text-primary)]"
              />
            </label>

            {/* Projection Strip */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-xs font-mono tabular-nums">
              <div>
                <div className="text-[10px] uppercase text-[var(--twe-text-muted)]">Resulting Stake</div>
                <div className="mt-0.5 font-semibold text-[var(--twe-text-primary)]">
                  {projectedAnnualYield.futureStake.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-[var(--twe-text-muted)]">Est. Monthly Yield</div>
                <div className="mt-0.5 font-semibold text-[#A8843E] dark:text-[#D4B475]">
                  +{projectedAnnualYield.monthlyTokens.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase text-[var(--twe-text-muted)]">Projected vTWATS</div>
                <div className="mt-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                  {projectedAnnualYield.votingPower.toLocaleString('en-US')}
                </div>
              </div>
            </div>

            {error && (
              <div className="p-2.5 rounded border border-red-500/40 bg-red-500/10 text-xs text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
            {notice && (
              <div className="p-2.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold hover:opacity-90 cursor-pointer"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>{mode === 'stake' ? 'Confirm Stake into DAO Pool' : 'Confirm Unstake'}</span>
              </button>
              {onOpenGovernance && (
                <button
                  type="button"
                  onClick={onOpenGovernance}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] text-xs font-medium text-[var(--twe-text-primary)] hover:border-[#D4B475] cursor-pointer"
                >
                  <Landmark className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
                  <span>Vote in DAO</span>
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right Column: Global Pool Telemetry + Transaction Activity */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
                TokenGovernanceDAO Pool Telemetry
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Audited
              </span>
            </div>
            <div className="divide-y divide-[var(--twe-border)] text-xs">
              <div className="py-2 flex items-center justify-between">
                <span className="text-[var(--twe-text-muted)]">Pool Total Value Locked</span>
                <span className="font-mono font-semibold tabular-nums text-[var(--twe-text-primary)]">
                  {totalPoolTvlTokens.toLocaleString('en-US', { maximumFractionDigits: 0 })} TWATS
                </span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-[var(--twe-text-muted)]">DAO Quorum Requirement</span>
                <span className="font-mono tabular-nums text-[var(--twe-text-primary)]">
                  100,000 TWATS
                </span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-[var(--twe-text-muted)]">Voting Duration Window</span>
                <span className="font-mono text-[var(--twe-text-primary)]">3 Days (259,200s)</span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-[var(--twe-text-muted)]">Fee Treasury Contract</span>
                <span className="font-mono text-[11px] text-[#A8843E] dark:text-[#D4B475]">
                  0x777D…4810
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex items-center justify-between">
              <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
                Staking Ledger Activity
              </h3>
              <span className="font-mono text-[11px] text-[var(--twe-text-muted)]">
                {snapshot.history.length} events
              </span>
            </div>
            <div className="divide-y divide-[var(--twe-border)] max-h-[300px] overflow-y-auto">
              {snapshot.history.map((entry) => (
                <div key={entry.id} className="px-4 py-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-mono font-semibold ${
                        entry.action === 'STAKE'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : entry.action === 'CLAIM'
                          ? 'text-[#A8843E] dark:text-[#D4B475]'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {entry.action}
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-[var(--twe-text-primary)]">
                      {entry.amount.toLocaleString('en-US', { maximumFractionDigits: 4 })} TWATS
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[var(--twe-text-muted)]">
                    <span>{entry.tierLabel}</span>
                    <span className="font-mono">{entry.txHash.slice(0, 10)}…{entry.txHash.slice(-6)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
