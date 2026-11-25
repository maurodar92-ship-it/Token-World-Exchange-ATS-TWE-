import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  KeyRound,
  Layers,
  Lock,
  RefreshCw,
  Rocket,
  Server,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import type {
  AnalyticsSummary,
  ChainConnection,
  ComplianceFiling,
  CorporateEntity,
  DomainTableSpec,
  HubId,
  ReadinessGate,
  SovereignVaultState,
  SurveillanceAlert,
  TradeExecution,
  TweAssetRecord,
} from '../types/twe';
import { getAnalyticsIgnored, setAnalyticsIgnored } from '../lib/analytics';
import { RsiSignalLabel, SparklineChart } from './SparklineChart';
import { EdgarPipelineWorkbench } from './EdgarPipelineWorkbench';
import { AtsOperationsSuite } from './AtsOperationsSuite';
import {
  RegulatoryFilingMonitor,
  buildDocumentFromComplianceFiling,
  type TrackedEightKFiling,
} from './RegulatoryFilingMonitor';
import { HyperScaleWebpageExplorer } from './HyperScaleWebpageExplorer';

export const OverviewView: React.FC<{
  vault: SovereignVaultState;
  tables: DomainTableSpec[];
  assets: TweAssetRecord[];
  recentTrades: TradeExecution[];
  totalNavUsd: number;
  onNavigateHub: (hub: HubId) => void;
}> = ({ vault, tables, assets, recentTrades, totalNavUsd, onNavigateHub }) => {
  const watchlisted = assets.filter((a) => a.watchlisted).slice(0, 4);

  return (
    <div className="space-y-5">
      {/* Executive KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4">
          <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">Portfolio Net Asset Value</div>
          <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[var(--twe-text-primary)]">
            ${totalNavUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs text-[var(--twe-text-secondary)]">
            Paper cash ${vault.paperCashUsd.toLocaleString('en-US')}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateHub('asset-vault')}
          className="text-left bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] hover:border-[#D4B475] rounded-lg p-4 transition-colors cursor-pointer"
        >
          <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">Sovereign Vault Ceiling</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-[#A8843E] dark:text-[#D4B475]">
            {vault.maxUnitsFormula}
          </div>
          <div className="mt-1 font-mono text-[11px] truncate text-[var(--twe-text-secondary)]">
            UUID {vault.vaultUuid}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateHub('four-token-systems')}
          className="text-left bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] hover:border-[#D4B475] rounded-lg p-4 transition-colors cursor-pointer"
        >
          <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">4-Token Systems Monolith</div>
          <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[var(--twe-text-primary)]">
            {tables.length} Tables
          </div>
          <div className="mt-1 text-xs text-[var(--twe-text-secondary)]">
            AI Batches · Auth · Assets · Credits
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateHub('token-atlas')}
          className="text-left bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] hover:border-[#D4B475] rounded-lg p-4 transition-colors cursor-pointer"
        >
          <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">Indexed Digital Assets</div>
          <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[var(--twe-text-primary)]">
            {assets.length}
          </div>
          <div className="mt-1 text-xs text-[var(--twe-text-secondary)]">
            Tokens, NFTs, Commodities, Currencies
          </div>
        </button>
      </div>

      {/* Watchlist 24h Sparklines + Wilder RSI */}
      <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
            Core Sovereign Instruments · 24h Sparklines & Wilder RSI(14)
          </h3>
          <button
            type="button"
            onClick={() => onNavigateHub('market-exchange')}
            className="text-xs text-[#A8843E] dark:text-[#D4B475] underline cursor-pointer"
          >
            Open Market & Exchange
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {watchlisted.map((item) => {
            const pos = item.change24hPct >= 0;
            return (
              <div
                key={item.id}
                className="p-3.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono font-semibold text-xs text-[var(--twe-text-primary)]">{item.symbol}</div>
                    <div className="text-[11px] text-[var(--twe-text-muted)] truncate max-w-[140px]">{item.name}</div>
                  </div>
                  <div className="text-right font-mono text-xs tabular-nums">
                    <div className="text-[var(--twe-text-primary)]">
                      ${item.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className={pos ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                      {pos ? '+' : ''}
                      {item.change24hPct.toFixed(2)}%
                    </div>
                  </div>
                </div>
                <SparklineChart data={item.sparkline24h} positive={pos} height={46} />
                <div className="flex items-center justify-between text-[11px] text-[var(--twe-text-muted)]">
                  <span>{item.chain}</span>
                  <RsiSignalLabel rsi={item.rsi14} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Executions */}
      <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex items-center justify-between">
          <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
            Latest Settled Trade Executions
          </h3>
          <span className="font-mono text-xs text-[var(--twe-text-muted)]">SSE Live Feed Synchronized</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="border-b border-[var(--twe-border)] text-[var(--twe-text-muted)] uppercase">
              <tr>
                <th className="px-4 py-2">Trade ID</th>
                <th className="px-4 py-2">Instrument</th>
                <th className="px-4 py-2">Side</th>
                <th className="px-4 py-2 text-right">Qty</th>
                <th className="px-4 py-2 text-right">Fill Price</th>
                <th className="px-4 py-2 text-right">Notional</th>
                <th className="px-4 py-2">Venue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--twe-border)]">
              {recentTrades.slice(0, 6).map((tr) => (
                <tr key={tr.id} className="h-9 hover:bg-[var(--twe-bg-elevated)]">
                  <td className="px-4 py-1.5 font-mono text-[var(--twe-text-muted)]">{tr.id}</td>
                  <td className="px-4 py-1.5 font-mono font-semibold text-[var(--twe-text-primary)]">{tr.symbol}</td>
                  <td
                    className={`px-4 py-1.5 font-mono font-medium ${
                      tr.side === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {tr.side}
                  </td>
                  <td className="px-4 py-1.5 text-right font-mono tabular-nums">{tr.quantity}</td>
                  <td className="px-4 py-1.5 text-right font-mono tabular-nums">
                    ${tr.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-1.5 text-right font-mono tabular-nums font-medium">
                    ${tr.notionalUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-1.5 text-[var(--twe-text-secondary)]">{tr.venue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hyper-Scale O(1) Arbitrary-Precision Overview Webpages */}
      <HyperScaleWebpageExplorer hub="overview" />
    </div>
  );
};

export const CompanyDirectoryView: React.FC<{ companies: CorporateEntity[] }> = ({ companies }) => (
  <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden">
    <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex items-center gap-2 font-display font-semibold text-sm text-[var(--twe-text-primary)]">
      <Building2 className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
      <span>Corporate Entities, Issuers & Qualified Custodians</span>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs">
        <thead className="border-b border-[var(--twe-border)] text-[var(--twe-text-muted)] uppercase">
          <tr>
            <th className="px-4 py-2.5">Legal Entity</th>
            <th className="px-4 py-2.5">LEI</th>
            <th className="px-4 py-2.5">Jurisdiction</th>
            <th className="px-4 py-2.5">Role</th>
            <th className="px-4 py-2.5 text-right">Assets Issued</th>
            <th className="px-4 py-2.5 text-right">KYB Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--twe-border)]">
          {companies.map((c) => (
            <tr key={c.id} className="h-10 hover:bg-[var(--twe-bg-elevated)]">
              <td className="px-4 py-2 font-medium text-[var(--twe-text-primary)]">{c.legalName}</td>
              <td className="px-4 py-2 font-mono text-[var(--twe-text-secondary)]">{c.lei}</td>
              <td className="px-4 py-2 text-[var(--twe-text-secondary)]">{c.jurisdiction}</td>
              <td className="px-4 py-2 text-[var(--twe-text-primary)]">{c.role} · {c.tier}</td>
              <td className="px-4 py-2 text-right font-mono tabular-nums">{c.assetsIssued}</td>
              <td className="px-4 py-2 text-right font-mono text-emerald-600 dark:text-emerald-400">{c.kybStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const SourcesStudioView: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [ignored, setIgnored] = useState<boolean>(() => getAnalyticsIgnored());

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/summary');
      if (res.ok) {
        setSummary(await res.json());
      }
    } catch {
      // ignore transient fetch failure
    }
  }, []);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  const toggleIgnore = () => {
    const next = !ignored;
    setAnalyticsIgnored(next);
    setIgnored(next);
  };

  const handleClearEvents = async () => {
    await fetch('/api/analytics/events', { method: 'DELETE' });
    void fetchSummary();
  };

  const boundaries = [
    {
      title: '4-Token-Systems Modular Monolith',
      detail: 'Clean separation across AI Generation Batches, Auth/Session Tokens, Digital Assets, and Append-Only Application Credits without cross-system direct table mutations.',
    },
    {
      title: 'BigInt & uint256 Serialization Boundary',
      detail: 'Sovereign Vault af230af8-bf63-4308-968a-9962ed14e565 caps at 2^256 - 1 and serializes as decimal/hex strings over JSON & tRPC to preserve bit-exact fidelity.',
    },
    {
      title: 'Server-Authoritative SSE & Batch Workers',
      detail: 'All market fills, tick updates, and cross-page Duplicate/Delete batch jobs emit authoritative SSE payloads from server.ts on port 3000.',
    },
    {
      title: 'First-Party Event & Download Collector',
      detail: 'Captures hub pageviews, engagement duration/scroll depth, README.md/PNG/JSON File Downloads, and tagged events locally via POST /api/event with zero external tracking.',
    },
  ];

  const [hsmTestOutput, setHsmTestOutput] = useState<{
    keyId: string;
    algorithm: string;
    digestSha256: string;
    signatureHex: string;
  } | null>(null);

  const testCloudHsm = async () => {
    const res = await fetch('/api/twe/hsm/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: `TWE_BFF_CHECKPOINT:${new Date().toISOString()}` }),
    });
    if (res.ok) setHsmTestOutput(await res.json());
  };

  return (
    <div className="space-y-4">
      {/* Event-Driven ATS Microservices Architecture Flow */}
      <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
              Event-Driven ATS Microservice Pipeline &amp; BFF / CloudHSM Security
            </h3>
            <p className="text-xs text-[var(--twe-text-secondary)]">
              Sub-millisecond execution separated from compliance checks across Apache Kafka, Double-Entry Ledger, and ERC-3643 Settlement.
            </p>
          </div>
          <button
            type="button"
            onClick={testCloudHsm}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#A8843E]/50 dark:border-[#D4B475]/50 bg-[var(--twe-gold-soft)] text-xs font-medium text-[var(--twe-text-primary)] cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
            <span>Test CloudHSM ECDSA Signer</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] space-y-1">
            <div className="text-[10px] uppercase text-[#A8843E] dark:text-[#D4B475]">1 · API Gateway / BFF</div>
            <div className="font-semibold text-[var(--twe-text-primary)]">gRPC-Web · WS · QuickFIX</div>
            <div className="text-[11px] font-sans text-[var(--twe-text-secondary)]">
              HttpOnly SameSite=Strict sessions, AWS CloudHSM / Vault signing, sub-100ms Canvas UI feeds.
            </div>
          </div>
          <div className="p-3.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] space-y-1">
            <div className="text-[10px] uppercase text-cyan-600 dark:text-cyan-400">2 · Matching Engine &amp; Bus</div>
            <div className="font-semibold text-[var(--twe-text-primary)]">C++ / Rust + Redis + Kafka</div>
            <div className="text-[11px] font-sans text-[var(--twe-text-secondary)]">
              In-memory Price-Time Priority (&lt;1ms), Redis Enterprise snapshots, Kafka order event streams.
            </div>
          </div>
          <div className="p-3.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] space-y-1">
            <div className="text-[10px] uppercase text-emerald-600 dark:text-emerald-400">3 · DvP &amp; Compliance</div>
            <div className="font-semibold text-[var(--twe-text-primary)]">Rule 144 · PostgreSQL · ERC-3643</div>
            <div className="text-[11px] font-sans text-[var(--twe-text-secondary)]">
              Double-entry SQL ledger, Fireblocks/BitGo custody DvP settlement, ONCHAINID transfer hooks.
            </div>
          </div>
        </div>

        {hsmTestOutput && (
          <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/35 font-mono text-[11px] break-all space-y-1">
            <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {hsmTestOutput.algorithm} · {hsmTestOutput.keyId}
            </div>
            <div className="text-[var(--twe-text-primary)]">Signature: {hsmTestOutput.signatureHex}</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {boundaries.map((b) => (
          <div key={b.title} className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-5 space-y-2">
            <div className="inline-flex items-center gap-2 font-display font-semibold text-sm text-[var(--twe-text-primary)]">
              <Layers className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
              <span>{b.title}</span>
            </div>
            <p className="text-xs text-[var(--twe-text-secondary)] leading-relaxed">{b.detail}</p>
          </div>
        ))}
      </div>

      {/* First-Party Analytics Audit & Privacy Opt-Out */}
      <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
              First-Party Workspace Event Collector (/api/event)
            </h3>
            <p className="text-xs text-[var(--twe-text-secondary)]">
              Privacy-first self-hosted event metrics respecting <span className="font-mono">localStorage.plausible_ignore</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={toggleIgnore}
              className={`px-3 py-1.5 rounded-md border font-medium cursor-pointer ${
                ignored
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-primary)]'
              }`}
            >
              {ignored ? 'Tracking Paused (plausible_ignore=true)' : 'Tracking Active'}
            </button>
            <button
              type="button"
              onClick={fetchSummary}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-primary)] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleClearEvents}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-red-500/40 text-red-600 dark:text-red-400 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
            <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">Hub Pageviews</div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-[var(--twe-text-primary)]">
              {summary?.pageviews ?? 0}
            </div>
          </div>
          <div className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
            <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">File Downloads</div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-[#A8843E] dark:text-[#D4B475]">
              {summary?.fileDownloads ?? 0}
            </div>
          </div>
          <div className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
            <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">Avg Engagement</div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-[var(--twe-text-primary)]">
              {((summary?.avgEngagementMs ?? 0) / 1000).toFixed(1)}s
            </div>
          </div>
          <div className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
            <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">Avg Scroll Depth</div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-[var(--twe-text-primary)]">
              {summary?.avgScrollDepthPct ?? 0}%
            </div>
          </div>
        </div>

        {summary && summary.recentEvents.length > 0 && (
          <div className="overflow-x-auto border border-[var(--twe-border)] rounded-md">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[var(--twe-bg-elevated)] border-b border-[var(--twe-border)] text-[var(--twe-text-muted)] uppercase">
                <tr>
                  <th className="px-3 py-2">Event</th>
                  <th className="px-3 py-2">Attributes</th>
                  <th className="px-3 py-2 text-right">Engagement / Depth</th>
                  <th className="px-3 py-2 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--twe-border)] font-mono">
                {summary.recentEvents.slice(0, 8).map((ev) => (
                  <tr key={ev.id} className="h-9">
                    <td className="px-3 py-1.5 font-semibold text-[var(--twe-text-primary)]">{ev.name}</td>
                    <td className="px-3 py-1.5 text-[var(--twe-text-secondary)]">
                      {ev.props ? JSON.stringify(ev.props) : ev.url}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-[var(--twe-text-secondary)]">
                      {ev.engagementMs !== undefined ? `${ev.engagementMs}ms · ${ev.scrollDepthPct ?? 0}%` : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right text-[var(--twe-text-muted)]">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export const ProjectArchiveView: React.FC<{
  assets: TweAssetRecord[];
  vault: SovereignVaultState;
}> = ({ assets, vault }) => {
  const downloadSnapshotJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      vaultUuid: vault.vaultUuid,
      maxUnitsFormula: vault.maxUnitsFormula,
      assetCount: assets.length,
      assets: assets.map(({ id, symbol, name, kind, chain, contractAddress, priceUsd, rsi14 }) => ({
        id,
        symbol,
        name,
        kind,
        chain,
        contractAddress,
        priceUsd,
        rsi14,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `twe-workspace-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold text-base text-[var(--twe-text-primary)]">
            Project Archive & Snapshot Exports
          </h3>
          <p className="text-xs text-[var(--twe-text-secondary)]">
            Download deterministic workspace manifests, Sovereign Vault state, and indexed digital assets.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadSnapshotJson}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON Snapshot</span>
          </button>
          <a
            href="/readme.md?download=1"
            download="TWE-Workspace-README.md"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] text-xs font-medium text-[var(--twe-text-primary)]"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Download README.md</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="p-3.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
          <div className="text-[var(--twe-text-muted)]">Snapshot Anchor</div>
          <div className="mt-1 font-mono font-semibold text-[var(--twe-text-primary)]">
            Block #{vault.lastAuditBlock.toLocaleString('en-US')}
          </div>
        </div>
        <div className="p-3.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
          <div className="text-[var(--twe-text-muted)]">Archived Instruments</div>
          <div className="mt-1 font-mono font-semibold tabular-nums text-[var(--twe-text-primary)]">
            {assets.length} active records
          </div>
        </div>
        <div className="p-3.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
          <div className="text-[var(--twe-text-muted)]">Documentation Endpoint</div>
          <div className="mt-1 font-mono text-[#A8843E] dark:text-[#D4B475]">GET /readme.md</div>
        </div>
      </div>
    </div>
  );
};

export const DeployRegistryView: React.FC<{ gates: ReadinessGate[] }> = ({ gates }) => {
  const [trpcTestOutput, setTrpcTestOutput] = useState<string>('');

  const runLiveTrpcProbe = async (proc: string) => {
    const res = await fetch(`/api/trpc/${proc}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: 1, pageSize: 5, sort: { field: 'name', direction: 'asc' } }),
    });
    const json = await res.json();
    setTrpcTestOutput(JSON.stringify(json, null, 2));
  };

  return (
    <div className="space-y-4">
      <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex items-center justify-between">
          <div className="inline-flex items-center gap-2 font-display font-semibold text-sm text-[var(--twe-text-primary)]">
            <Rocket className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
            <span>Pre-Flight Deployment Readiness Gates</span>
          </div>
          <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
            {gates.filter((g) => g.passed).length} / {gates.length} Passed
          </span>
        </div>
        <div className="divide-y divide-[var(--twe-border)] text-xs">
          {gates.map((g) => (
            <div key={g.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium text-[var(--twe-text-primary)]">{g.gateName}</div>
                <div className="text-[11px] text-[var(--twe-text-muted)]">
                  {g.category} · Owner: {g.owner}
                </div>
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span className="text-[var(--twe-text-secondary)]">{g.evidenceRef}</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live tweRouter & Express API Tester */}
      <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 font-display font-semibold text-sm text-[var(--twe-text-primary)]">
            <Server className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
            <span>Backend tRPC (tweRouter) & Express API Live Inspector</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {['twe.assets.list', 'twe.vault.getSovereignState', 'twe.systems.listTables'].map((proc) => (
              <button
                key={proc}
                type="button"
                onClick={() => runLiveTrpcProbe(proc)}
                className="px-2.5 py-1 rounded border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] font-mono text-[11px] text-[var(--twe-text-primary)] hover:border-[#D4B475] cursor-pointer"
              >
                Invoke {proc}
              </button>
            ))}
          </div>
        </div>
        {trpcTestOutput && (
          <pre className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[11px] text-[var(--twe-text-primary)] max-h-64 overflow-auto">
            {trpcTestOutput}
          </pre>
        )}
      </div>

      {/* Token World ATS Regulatory Workplan, CSV Sanitizer, CLOB Unit Tests & Security Controls */}
      <AtsOperationsSuite />
    </div>
  );
};

export const ComplianceEdgarView: React.FC<{ filings: ComplianceFiling[] }> = ({ filings }) => {
  const [alerts, setAlerts] = useState<SurveillanceAlert[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<TrackedEightKFiling | null>(null);
  const [docViewMode, setDocViewMode] = useState<'rendered' | 'plaintext'>('rendered');
  const [copiedAccession, setCopiedAccession] = useState(false);
  const docViewerRef = useRef<HTMLDivElement>(null);

  const loadAlerts = useCallback(async () => {
    const res = await fetch('/api/twe/surveillance/alerts');
    if (res.ok) {
      const json = await res.json();
      setAlerts(json.alerts ?? []);
    }
  }, []);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const ackAlert = async (id: string) => {
    await fetch(`/api/twe/surveillance/alerts/${id}/ack`, { method: 'POST' });
    void loadAlerts();
  };

  const handleSelectDocument = useCallback((doc: TrackedEightKFiling) => {
    setSelectedDoc(doc);
    setCopiedAccession(false);
    window.requestAnimationFrame(() => {
      docViewerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, []);

  const handleCopyAccession = async (acc: string) => {
    try {
      await navigator.clipboard.writeText(acc);
      setCopiedAccession(true);
      window.setTimeout(() => setCopiedAccession(false), 1800);
    } catch {
      // Clipboard API unavailable in restricted context
    }
  };

  const handleDownloadDocument = (doc: TrackedEightKFiling) => {
    const blob = new Blob([doc.plainText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.ticker}-${doc.formType.replace(/[^A-Za-z0-9-]/g, '')}-${doc.accessionNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Regulatory Exporter Bar (SEC Form ATS-N / FINRA CAT / SEC Rule 17a-4) */}
      <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
            ATS Regulatory Reporting Exporter
          </h3>
          <p className="text-xs text-[var(--twe-text-secondary)]">
            Generate machine-readable SEC Form ATS-N, FINRA Consolidated Audit Trail (CAT), and Rule 17a-4 WORM logs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <a
            href="/api/twe/compliance/export?type=ats-n"
            download="TWE-ats-n-report.json"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] font-medium hover:border-[#D4B475]"
          >
            <Download className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
            <span>SEC Form ATS-N</span>
          </a>
          <a
            href="/api/twe/compliance/export?type=finra-cat"
            download="TWE-finra-cat-report.json"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] font-medium hover:border-[#D4B475]"
          >
            <Download className="w-3.5 h-3.5 text-cyan-500" />
            <span>FINRA CAT Daily Batch</span>
          </a>
          <a
            href="/api/twe/compliance/export?type=rule-17a4"
            download="TWE-rule-17a4-report.json"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] font-medium hover:border-[#D4B475]"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>SEC Rule 17a-4 Log</span>
          </a>
        </div>
      </div>

      {/* Real-Time Regulatory Filing Monitor (Simulated SEC 8-K RSS Stream) */}
      <RegulatoryFilingMonitor
        selectedFilingId={selectedDoc?.id ?? null}
        onSelectDocument={handleSelectDocument}
      />

      {/* Integrated ComplianceEdgarView Document Content Viewer */}
      <div
        id="edgar-document-viewer"
        ref={docViewerRef}
        className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden"
      >
        {selectedDoc ? (
          <>
            <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-1.5 py-0.5 rounded font-mono font-semibold text-[10px] bg-[#A8843E]/15 dark:bg-[#D4B475]/20 text-[#A8843E] dark:text-[#D4B475] border border-[#A8843E]/40">
                    FORM {selectedDoc.formType}
                  </span>
                  <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] text-[var(--twe-text-secondary)]">
                    Item {selectedDoc.itemCode} · {selectedDoc.itemTitle}
                  </span>
                  <span className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
                    {selectedDoc.companyName} ({selectedDoc.ticker})
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[var(--twe-text-muted)] tabular-nums">
                  <span>Accession: {selectedDoc.accessionNumber}</span>
                  <span>CIK: {selectedDoc.cik}</span>
                  <span>Filed: {selectedDoc.filedAt}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="inline-flex rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-surface)] p-0.5">
                  <button
                    type="button"
                    onClick={() => setDocViewMode('rendered')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer ${
                      docViewMode === 'rendered'
                        ? 'bg-[#A8843E] text-white dark:bg-[#D4B475] dark:text-[#111318]'
                        : 'text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)]'
                    }`}
                  >
                    Rendered Form
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocViewMode('plaintext')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer ${
                      docViewMode === 'plaintext'
                        ? 'bg-[#A8843E] text-white dark:bg-[#D4B475] dark:text-[#111318]'
                        : 'text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)]'
                    }`}
                  >
                    Plain Text
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => void handleCopyAccession(selectedDoc.accessionNumber)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-surface)] hover:border-[#D4B475] text-[11px] font-mono cursor-pointer"
                >
                  {copiedAccession ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Accession</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadDocument(selectedDoc)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-surface)] hover:border-[#D4B475] text-[11px] font-medium cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
                  <span>.txt</span>
                </button>

                <a
                  href={selectedDoc.secArchiveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-surface)] hover:border-[#D4B475] text-[11px] font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>SEC Archive</span>
                </a>

                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  aria-label="Close document viewer"
                  className="p-1.5 rounded-md border border-[var(--twe-border)] text-[var(--twe-text-muted)] hover:text-[var(--twe-text-primary)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {docViewMode === 'rendered' ? (
              <div className="p-5 space-y-5 text-xs text-[var(--twe-text-primary)]">
                <div className="border border-[var(--twe-border)] rounded-md bg-[var(--twe-bg-elevated)] p-4 space-y-2">
                  <div className="text-center space-y-0.5 border-b border-[var(--twe-border)] pb-3">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--twe-text-muted)]">
                      United States Securities and Exchange Commission · Washington, D.C. 20549
                    </div>
                    <div className="font-display text-base font-semibold">
                      FORM {selectedDoc.formType} — CURRENT REPORT
                    </div>
                    <div className="text-[11px] text-[var(--twe-text-secondary)]">
                      Pursuant to Section 13 or 15(d) of the Securities Exchange Act of 1934
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 font-mono text-[11px]">
                    <div>
                      <span className="text-[var(--twe-text-muted)] block text-[10px]">REGISTRANT</span>
                      <span className="font-semibold">{selectedDoc.companyName}</span>
                    </div>
                    <div>
                      <span className="text-[var(--twe-text-muted)] block text-[10px]">STATE / FILE NO. / EIN</span>
                      <span>
                        {selectedDoc.stateOfIncorp} · {selectedDoc.commissionFileNumber} · {selectedDoc.irsEin}
                      </span>
                    </div>
                    <div>
                      <span className="text-[var(--twe-text-muted)] block text-[10px]">DATE OF REPORT</span>
                      <span className="tabular-nums">{selectedDoc.filedAt}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedDoc.htmlSections.map((sec) => (
                    <div key={sec.heading} className="space-y-1.5">
                      <h4 className="font-display font-semibold text-sm text-[#A8843E] dark:text-[#D4B475]">
                        {sec.heading}
                      </h4>
                      <p className="leading-relaxed whitespace-pre-line text-[var(--twe-text-secondary)]">
                        {sec.body}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[var(--twe-border)] pt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[var(--twe-text-muted)]">
                  <span>SIGNATURE: /s/ Office of the Corporate Secretary ({selectedDoc.companyName})</span>
                  <span>Accession {selectedDoc.accessionNumber}</span>
                </div>
              </div>
            ) : (
              <pre className="p-4 font-mono text-[11px] leading-relaxed text-[var(--twe-text-primary)] bg-[var(--twe-bg-elevated)] max-h-[420px] overflow-auto whitespace-pre-wrap">
                {selectedDoc.plainText}
              </pre>
            )}
          </>
        ) : (
          <div className="px-4 py-3 flex items-center justify-between gap-3 text-xs text-[var(--twe-text-muted)]">
            <div className="inline-flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
              <span>
                ComplianceEdgarView Document Content Viewer — click{' '}
                <strong className="text-[var(--twe-text-primary)]">View Document in ComplianceEdgarView</strong> on any
                8-K RSS filing above or register row below to inspect the full SEC filing.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Market Surveillance Engine (Wash Trading, Spoofing, Layering, Quote Stuffing) */}
      <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex items-center justify-between">
          <div className="inline-flex items-center gap-2 font-display font-semibold text-sm text-[var(--twe-text-primary)]">
            <ShieldAlert className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
            <span>Real-Time Market Surveillance Engine</span>
          </div>
          <span className="font-mono text-xs text-[var(--twe-text-muted)]">
            Wash Trading · Spoofing · Layering · Quote Stuffing
          </span>
        </div>
        <div className="divide-y divide-[var(--twe-border)]">
          {alerts.map((al) => (
            <div key={al.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5 max-w-2xl">
                <div className="flex items-center gap-2 font-mono">
                  <AlertTriangle
                    className={`w-3.5 h-3.5 ${
                      al.severity === 'High' ? 'text-rose-500' : 'text-[#A8843E] dark:text-[#D4B475]'
                    }`}
                  />
                  <span className="font-semibold text-[var(--twe-text-primary)]">{al.pattern}</span>
                  <span className="px-1.5 py-0.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-[10px]">
                    {al.symbol}
                  </span>
                  <span className="text-[10px] text-[var(--twe-text-muted)]">
                    Confidence {al.confidenceScore}%
                  </span>
                </div>
                <p className="text-[var(--twe-text-secondary)]">{al.detail}</p>
              </div>
              <div className="flex items-center gap-3 font-mono">
                {al.status === 'Open' ? (
                  <button
                    type="button"
                    onClick={() => ackAlert(al.id)}
                    className="px-2.5 py-1 rounded border border-[var(--twe-border-strong)] hover:border-[#D4B475] text-[11px] cursor-pointer"
                  >
                    Acknowledge
                  </button>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">Acknowledged</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EDGAR & MiCA Filings Register */}
      <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex items-center gap-2 font-display font-semibold text-sm text-[var(--twe-text-primary)]">
          <Lock className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
          <span>Compliance, EDGAR Filings &amp; Jurisdiction Register</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="border-b border-[var(--twe-border)] text-[var(--twe-text-muted)] uppercase">
              <tr>
                <th className="px-4 py-2.5">Form / Filing</th>
                <th className="px-4 py-2.5">Asset</th>
                <th className="px-4 py-2.5">Issuer</th>
                <th className="px-4 py-2.5">Accession Number</th>
                <th className="px-4 py-2.5">Jurisdiction</th>
                <th className="px-4 py-2.5">Filed Date</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Document</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--twe-border)]">
              {filings.map((f) => (
                <tr key={f.id} className="h-10 hover:bg-[var(--twe-bg-elevated)]">
                  <td className="px-4 py-2 font-semibold text-[var(--twe-text-primary)]">{f.formType}</td>
                  <td className="px-4 py-2 font-mono text-[#A8843E] dark:text-[#D4B475]">{f.assetSymbol}</td>
                  <td className="px-4 py-2 text-[var(--twe-text-secondary)]">{f.issuer}</td>
                  <td className="px-4 py-2 font-mono text-[var(--twe-text-primary)]">{f.accessionNumber}</td>
                  <td className="px-4 py-2 text-[var(--twe-text-secondary)]">{f.jurisdiction}</td>
                  <td className="px-4 py-2 font-mono tabular-nums text-[var(--twe-text-muted)]">{f.filedDate}</td>
                  <td className="px-4 py-2 font-mono text-emerald-600 dark:text-emerald-400">{f.status}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleSelectDocument(buildDocumentFromComplianceFiling(f))}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--twe-border-strong)] hover:border-[#D4B475] text-[11px] font-medium text-[#A8843E] dark:text-[#D4B475] cursor-pointer"
                    >
                      <FileText className="w-3 h-3" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SEC EDGAR Next, data.sec.gov XBRL & Hybrid PostgreSQL Pipeline Workbench */}
      <EdgarPipelineWorkbench />
    </div>
  );
};

export const ChainConnectionsView: React.FC<{ chains: ChainConnection[] }> = ({ chains }) => {
  const [sourceChain, setSourceChain] = useState<'EVM (Ethereum / Polygon)' | 'Solana Mainnet' | 'Quantum PQ-Enclave'>('EVM (Ethereum / Polygon)');
  const [destChain, setDestChain] = useState<'EVM (Ethereum / Polygon)' | 'Solana Mainnet' | 'Quantum PQ-Enclave'>('Quantum PQ-Enclave');
  const [bridgeAsset, setBridgeAsset] = useState<'MAO' | 'USDC-TWE' | 'XAU-TWE' | 'ETH' | 'SOL'>('MAO');
  const [bridgeAmount, setBridgeAmount] = useState(25000);
  const [bridgeLog, setBridgeLog] = useState<
    Array<{ id: string; route: string; amount: string; feeUsd: number; etaSec: number; txHash: string }>
  >([]);

  const bridgeQuote = useMemo(() => {
    const sameChain = sourceChain === destChain;
    const baseSlippagePct = sameChain
      ? 0
      : sourceChain.includes('Quantum') || destChain.includes('Quantum')
      ? 0.08
      : 0.14;
    const sizeImpactPct = Math.min(0.85, (bridgeAmount / 1_000_000) * 0.28);
    const totalSlippagePct = Number((baseSlippagePct + sizeImpactPct).toFixed(3));
    const bridgeFeeUsd = sameChain ? 0 : Number((12.5 + bridgeAmount * 0.0004).toFixed(2));
    const etaSeconds = sameChain
      ? 0
      : destChain.includes('Solana')
      ? 4
      : destChain.includes('Quantum')
      ? 9
      : 28;
    const estBlocks = sameChain ? 0 : Math.max(1, Math.round(etaSeconds / 2.2));
    return { sameChain, totalSlippagePct, bridgeFeeUsd, etaSeconds, estBlocks };
  }, [sourceChain, destChain, bridgeAmount]);

  const executeBridgeTransfer = () => {
    if (bridgeQuote.sameChain || bridgeAmount <= 0) return;
    const randHex = ((Date.now() ^ (bridgeAmount * 31)) >>> 0).toString(16).padStart(8, '0');
    setBridgeLog((prev) => [
      {
        id: `${Date.now()}`,
        route: `${sourceChain.split(' ')[0]} → ${destChain.split(' ')[0]}`,
        amount: `${bridgeAmount.toLocaleString('en-US')} ${bridgeAsset}`,
        feeUsd: bridgeQuote.bridgeFeeUsd,
        etaSec: bridgeQuote.etaSeconds,
        txHash: `0x${randHex}c8f4...pq91`,
      },
      ...prev.slice(0, 5),
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {chains.map((ch) => (
          <div
            key={ch.id}
            className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 font-display font-semibold text-sm text-[var(--twe-text-primary)]">
                <Globe2 className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
                <span>{ch.name}</span>
              </div>
              <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">{ch.status}</span>
            </div>
            <div className="font-mono text-[11px] text-[var(--twe-text-muted)] break-all">{ch.rpcEndpoint}</div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--twe-border)] text-xs font-mono tabular-nums">
              <div>
                <span className="text-[var(--twe-text-muted)] text-[10px] block">EIP-155</span>
                <span>{ch.eip155}</span>
              </div>
              <div>
                <span className="text-[var(--twe-text-muted)] text-[10px] block">Block Height</span>
                <span>#{ch.blockHeight.toLocaleString('en-US')}</span>
              </div>
              <div>
                <span className="text-[var(--twe-text-muted)] text-[10px] block">Finality</span>
                <span>{ch.finalitySeconds}s</span>
              </div>
              <div>
                <span className="text-[var(--twe-text-muted)] text-[10px] block">Indexed Assets</span>
                <span>{ch.indexedAssets}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Inter-Chain Liquidity Bridge Simulator (Item #42) */}
      <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
              Inter-Chain Sovereign Liquidity Bridge (EVM ↔ Solana ↔ Quantum)
            </h3>
            <p className="text-[11px] font-mono text-[var(--twe-text-muted)]">
              Simulates cross-chain DvP asset relays with slippage bounds &amp; block finality windows
            </p>
          </div>
          <span className="px-2.5 py-1 rounded border border-emerald-500/35 bg-emerald-500/10 font-mono text-[11px] text-emerald-500 font-semibold">
            CCIP + Post-Quantum Relayer Ready
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
          <label>
            <span className="text-[10px] text-[var(--twe-text-muted)] uppercase">Source Network</span>
            <select
              value={sourceChain}
              onChange={(e) => setSourceChain(e.target.value as typeof sourceChain)}
              className="mt-1 w-full px-2.5 py-2 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)]"
            >
              <option value="EVM (Ethereum / Polygon)">EVM (Ethereum / Polygon)</option>
              <option value="Solana Mainnet">Solana Mainnet</option>
              <option value="Quantum PQ-Enclave">Quantum PQ-Enclave</option>
            </select>
          </label>
          <label>
            <span className="text-[10px] text-[var(--twe-text-muted)] uppercase">Destination Network</span>
            <select
              value={destChain}
              onChange={(e) => setDestChain(e.target.value as typeof destChain)}
              className="mt-1 w-full px-2.5 py-2 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)]"
            >
              <option value="Quantum PQ-Enclave">Quantum PQ-Enclave</option>
              <option value="EVM (Ethereum / Polygon)">EVM (Ethereum / Polygon)</option>
              <option value="Solana Mainnet">Solana Mainnet</option>
            </select>
          </label>
          <label>
            <span className="text-[10px] text-[var(--twe-text-muted)] uppercase">Settlement Asset</span>
            <select
              value={bridgeAsset}
              onChange={(e) => setBridgeAsset(e.target.value as typeof bridgeAsset)}
              className="mt-1 w-full px-2.5 py-2 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)]"
            >
              <option value="MAO">MAO (Sovereign Reserve)</option>
              <option value="USDC-TWE">USDC-TWE (Settlement USD)</option>
              <option value="XAU-TWE">XAU-TWE (Bullion Reserve)</option>
              <option value="ETH">ETH (Wrapped Ether)</option>
              <option value="SOL">SOL (Solana Native)</option>
            </select>
          </label>
          <label>
            <span className="text-[10px] text-[var(--twe-text-muted)] uppercase">Bridge Amount</span>
            <input
              type="number"
              min={10}
              value={bridgeAmount}
              onChange={(e) => setBridgeAmount(Math.max(0, Number(e.target.value) || 0))}
              className="mt-1 w-full px-2.5 py-2 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] tabular-nums"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center p-3.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-xs font-mono tabular-nums">
          <div>
            <span className="text-[10px] text-[var(--twe-text-muted)] block">Simulated Slippage</span>
            <span className="font-semibold text-[var(--twe-text-primary)]">{bridgeQuote.totalSlippagePct}%</span>
          </div>
          <div>
            <span className="text-[10px] text-[var(--twe-text-muted)] block">Relayer Fee (USD)</span>
            <span className="font-semibold text-[#A8843E] dark:text-[#D4B475]">${bridgeQuote.bridgeFeeUsd.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-[10px] text-[var(--twe-text-muted)] block">Est. Arrival Time</span>
            <span className="font-semibold text-emerald-500">
              {bridgeQuote.sameChain ? 'Select distinct chains' : `~${bridgeQuote.etaSeconds}s (${bridgeQuote.estBlocks} blocks)`}
            </span>
          </div>
          <div className="text-right">
            <button
              type="button"
              disabled={bridgeQuote.sameChain || bridgeAmount <= 0}
              onClick={executeBridgeTransfer}
              className="px-4 py-2 rounded bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-semibold disabled:opacity-45 cursor-pointer"
            >
              Simulate Bridge Transfer
            </button>
          </div>
        </div>

        {bridgeLog.length > 0 && (
          <div className="space-y-1.5 font-mono text-[11px]">
            {bridgeLog.map((entry) => (
              <div
                key={entry.id}
                className="px-3 py-2 rounded bg-[var(--twe-bg-elevated)] border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2"
              >
                <span className="font-semibold text-emerald-500">{entry.route}</span>
                <span>{entry.amount}</span>
                <span className="text-[var(--twe-text-muted)]">Fee ${entry.feeUsd.toFixed(2)} · ETA {entry.etaSec}s</span>
                <span className="text-[10px] text-[var(--twe-text-muted)]">{entry.txHash}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
