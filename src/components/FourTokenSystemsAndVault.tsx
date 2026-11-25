import React, { useMemo, useState } from 'react';
import { Copy, Check, Database, Hammer, ShieldCheck, Vault } from 'lucide-react';
import type {
  DomainTableSpec,
  FoundryBatchConcept,
  SovereignVaultState,
  TweAssetRecord,
} from '../types/twe';
import { TokenBurner } from './TokenBurner';
import { HyperScaleWebpageExplorer } from './HyperScaleWebpageExplorer';

export const FourTokenSystemsView: React.FC<{ tables: DomainTableSpec[] }> = ({ tables }) => {
  const [selectedSystem, setSelectedSystem] = useState<string>('ALL');
  const [selectedTableId, setSelectedTableId] = useState<string>(tables[0]?.id ?? '');

  const systems = [
    { id: 'ai-generation-batches', label: 'System I · AI Generation Batches', count: 5 },
    { id: 'auth-session-tokens', label: 'System II · Auth & Session Tokens', count: 5 },
    { id: 'digital-assets', label: 'System III · Digital Assets', count: 7 },
    { id: 'application-credits', label: 'System IV · Append-Only Credits', count: 5 },
  ];

  const filteredTables = useMemo(
    () =>
      selectedSystem === 'ALL'
        ? tables
        : tables.filter((t) => t.systemId === selectedSystem),
    [tables, selectedSystem]
  );

  const activeTable =
    filteredTables.find((t) => t.id === selectedTableId) ?? filteredTables[0];

  return (
    <div className="space-y-4">
      {/* 4 Systems Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {systems.map((sys) => {
          const active = selectedSystem === sys.id;
          const totalRows = tables
            .filter((t) => t.systemId === sys.id)
            .reduce((acc, t) => acc + t.rowCount, 0);
          return (
            <button
              key={sys.id}
              type="button"
              onClick={() => setSelectedSystem(active ? 'ALL' : sys.id)}
              className={`text-left p-4 rounded-lg border transition-colors cursor-pointer ${
                active
                  ? 'bg-[var(--twe-bg-surface)] border-[#A8843E] dark:border-[#D4B475]'
                  : 'bg-[var(--twe-bg-surface)] border-[var(--twe-border)] hover:border-[var(--twe-border-strong)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                  {sys.count} Tables
                </span>
                <Database className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
              </div>
              <div className="mt-1.5 font-display font-semibold text-sm text-[var(--twe-text-primary)]">
                {sys.label}
              </div>
              <div className="mt-2 font-mono text-xs tabular-nums text-[var(--twe-text-secondary)]">
                {totalRows.toLocaleString('en-US')} indexed records
              </div>
            </button>
          );
        })}
      </div>

      {/* 22-Table List + Active Schema Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex items-center justify-between">
            <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
              Modular Monolith Domain Tables ({filteredTables.length} / {tables.length})
            </h3>
            {selectedSystem !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedSystem('ALL')}
                className="text-xs text-[#A8843E] dark:text-[#D4B475] underline cursor-pointer"
              >
                Show all 22 tables
              </button>
            )}
          </div>
          <div className="divide-y divide-[var(--twe-border)] max-h-[520px] overflow-y-auto">
            {filteredTables.map((tbl) => {
              const isSelected = activeTable?.id === tbl.id;
              return (
                <button
                  key={tbl.id}
                  type="button"
                  onClick={() => setSelectedTableId(tbl.id)}
                  className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--twe-gold-soft)]'
                      : 'hover:bg-[var(--twe-bg-elevated)]'
                  }`}
                >
                  <div>
                    <div className="font-mono text-xs font-medium text-[var(--twe-text-primary)]">
                      {tbl.tableName}
                    </div>
                    <div className="text-[11px] text-[var(--twe-text-muted)]">
                      {tbl.systemLabel} · {tbl.writeMode}
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs tabular-nums text-[var(--twe-text-secondary)] shrink-0">
                    {tbl.rowCount.toLocaleString('en-US')} rows
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4 space-y-4">
          {activeTable ? (
            <>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-[#A8843E] dark:text-[#D4B475]">
                  {activeTable.systemLabel}
                </div>
                <h3 className="mt-1 font-mono font-semibold text-base text-[var(--twe-text-primary)]">
                  {activeTable.tableName}
                </h3>
                <p className="mt-1 text-xs text-[var(--twe-text-secondary)] leading-relaxed">
                  {activeTable.invariant}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs border-y border-[var(--twe-border)] py-3">
                <div>
                  <span className="text-[var(--twe-text-muted)]">Primary Key</span>
                  <div className="font-mono text-[var(--twe-text-primary)] mt-0.5">
                    {activeTable.primaryKey}
                  </div>
                </div>
                <div>
                  <span className="text-[var(--twe-text-muted)]">Write Policy</span>
                  <div className="font-mono text-[var(--twe-text-primary)] mt-0.5">
                    {activeTable.writeMode}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)] mb-2">
                  Indexed Columns ({activeTable.columns.length})
                </div>
                <div className="font-mono text-xs text-[var(--twe-text-secondary)] leading-relaxed">
                  {activeTable.columns.join(' · ')}
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)] mb-2">
                  Sample Ledger Payload
                </div>
                <pre className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[11px] text-[var(--twe-text-primary)] overflow-x-auto">
                  {JSON.stringify(activeTable.sampleRows, null, 2)}
                </pre>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Hyper-Scale O(1) Arbitrary-Precision 4-Token Systems Webpages */}
      <HyperScaleWebpageExplorer hub="four-token-systems" externalFilter={selectedSystem} />
    </div>
  );
};

export const AssetVaultView: React.FC<{
  vault: SovereignVaultState;
  assets?: TweAssetRecord[];
}> = ({ vault, assets = [] }) => {
  const [copiedUuid, setCopiedUuid] = useState(false);
  const [splitSharePct, setSplitSharePct] = useState('12.5');

  const computedUnits = useMemo(() => {
    try {
      const max = (1n << 256n) - 1n;
      const pctNum = Number(splitSharePct);
      if (!Number.isFinite(pctNum) || pctNum <= 0 || pctNum > 100) return '0';
      const basisPoints = BigInt(Math.round(pctNum * 100));
      const slice = (max * basisPoints) / 10000n;
      return slice.toString();
    } catch {
      return '0';
    }
  }, [splitSharePct]);

  const handleCopy = () => {
    void navigator.clipboard.writeText(vault.vaultUuid);
    setCopiedUuid(true);
    window.setTimeout(() => setCopiedUuid(false), 1800);
  };

  return (
    <div className="space-y-4">
      {/* Sovereign Possession Header Card */}
      <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-[#A8843E] dark:text-[#D4B475]">
              <Vault className="w-4 h-4" />
              <span>{vault.custodian}</span>
            </div>
            <h2 className="mt-1 font-display text-xl font-semibold text-[var(--twe-text-primary)]">
              {vault.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] font-mono text-xs text-[var(--twe-text-primary)] hover:border-[#D4B475] cursor-pointer"
          >
            <span>UUID: {vault.vaultUuid}</span>
            {copiedUuid ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-[var(--twe-border)]">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">Possession Ceiling</div>
            <div className="mt-1 font-mono text-lg font-semibold text-[var(--twe-text-primary)]">
              {vault.maxUnitsFormula} units
            </div>
            <div className="text-[11px] text-[var(--twe-text-secondary)]">Full uint256 BigInt range</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">Paper Liquidity Cash</div>
            <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-[var(--twe-text-primary)]">
              ${vault.paperCashUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-[var(--twe-text-secondary)]">Available for instant fills</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">Reserved Open Orders</div>
            <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-[#A8843E] dark:text-[#D4B475]">
              ${vault.reservedUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-[var(--twe-text-secondary)]">Escrowed limit buy orders</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">Last Audit Block</div>
            <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-[var(--twe-text-primary)]">
              #{vault.lastAuditBlock.toLocaleString('en-US')}
            </div>
            <div className="text-[11px] text-[var(--twe-text-secondary)]">{vault.unallocatedReserveFormula}</div>
          </div>
        </div>

        <div className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] space-y-1.5">
          <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">
            Canonical uint256 Decimal & Hex State
          </div>
          <div className="font-mono text-xs break-all text-[var(--twe-text-primary)]">
            DEC: {vault.maxUnitsDecimal}
          </div>
          <div className="font-mono text-xs break-all text-[var(--twe-text-secondary)]">
            HEX: {vault.maxUnitsHex}
          </div>
        </div>
      </div>

      {/* Tranches & BigInt Tranche Allocation Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex items-center justify-between">
            <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
              Custodial Vault Tranches
            </h3>
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> Multi-Sig Verified
            </span>
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead className="border-b border-[var(--twe-border)] text-[var(--twe-text-muted)] uppercase">
              <tr>
                <th className="px-4 py-2.5">Tranche</th>
                <th className="px-4 py-2.5">Asset</th>
                <th className="px-4 py-2.5 text-right">Share</th>
                <th className="px-4 py-2.5">Allocated Magnitude</th>
                <th className="px-4 py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--twe-border)]">
              {vault.tranches.map((tr) => (
                <tr key={tr.id} className="h-10 hover:bg-[var(--twe-bg-elevated)]">
                  <td className="px-4 py-2 font-medium text-[var(--twe-text-primary)]">{tr.label}</td>
                  <td className="px-4 py-2 font-mono text-[#A8843E] dark:text-[#D4B475]">{tr.assetSymbol}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-[var(--twe-text-primary)]">
                    {tr.allocationSharePct.toFixed(1)}%
                  </td>
                  <td className="px-4 py-2 font-mono text-[var(--twe-text-secondary)]">{tr.unitsFormula}</td>
                  <td className="px-4 py-2 text-right text-[var(--twe-text-secondary)]">{tr.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="lg:col-span-4 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4 space-y-3">
          <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
            uint256 BigInt Tranche Calculator
          </h3>
          <p className="text-xs text-[var(--twe-text-secondary)]">
            Compute exact integer possession units out of <span className="font-mono">2^256 - 1</span> without IEEE-754 floating-point loss.
          </p>
          <label className="block text-xs">
            <span className="text-[var(--twe-text-muted)]">Allocation Share (%)</span>
            <input
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              value={splitSharePct}
              onChange={(e) => setSplitSharePct(e.target.value)}
              className="mt-1 w-full px-3 py-1.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-sm text-[var(--twe-text-primary)]"
            />
          </label>
          <div className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
            <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">
              Exact BigInt Units
            </div>
            <div className="mt-1 font-mono text-[11px] break-all text-[var(--twe-text-primary)]">
              {computedUnits}
            </div>
          </div>
        </div>
      </div>

      {/* Irreversible Supply Token Burner & Real-Time D3 Circulating Supply Graph */}
      <TokenBurner vault={vault} assets={assets} />
    </div>
  );
};

export const TokenFoundryView: React.FC<{ initialConcepts: FoundryBatchConcept[] }> = ({
  initialConcepts,
}) => {
  const [seed, setSeed] = useState('TWE-GENESIS-2026');
  const [count, setCount] = useState(25);
  const [concepts, setConcepts] = useState<FoundryBatchConcept[]>(initialConcepts);
  const [filterText, setFilterText] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/twe/foundry/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed, count }),
      });
      if (res.ok) {
        const json = await res.json();
        setConcepts(json.concepts ?? []);
        setPage(1);
      }
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return concepts;
    return concepts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.ticker.toLowerCase().includes(q) ||
        c.chain.toLowerCase().includes(q) ||
        c.kind.toLowerCase().includes(q)
    );
  }, [concepts, filterText]);

  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const slice = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleGenerate}
        className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4 flex flex-wrap items-end gap-3"
      >
        <label className="flex-1 min-w-[200px] text-xs">
          <span className="text-[var(--twe-text-muted)] uppercase tracking-wider">Deterministic Batch Seed</span>
          <input
            type="text"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            className="mt-1 w-full px-3 py-1.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-sm text-[var(--twe-text-primary)]"
          />
        </label>
        <label className="w-40 text-xs">
          <span className="text-[var(--twe-text-muted)] uppercase tracking-wider">Concepts (1–1,000)</span>
          <input
            type="number"
            min={1}
            max={1000}
            value={count}
            onChange={(e) => setCount(Math.min(1000, Math.max(1, Number(e.target.value) || 1)))}
            className="mt-1 w-full px-3 py-1.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-sm tabular-nums text-[var(--twe-text-primary)]"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          <Hammer className="w-3.5 h-3.5" />
          <span>{busy ? 'Synthesizing...' : 'Synthesize Batch'}</span>
        </button>
      </form>

      <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-medium text-[var(--twe-text-primary)]">
            Synthesized Concepts ({filtered.length} matching) · Seed: <span className="font-mono">{seed}</span>
          </div>
          <input
            type="text"
            value={filterText}
            onChange={(e) => {
              setFilterText(e.target.value);
              setPage(1);
            }}
            placeholder="Filter generated concepts..."
            className="px-3 py-1 text-xs rounded-md bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] text-[var(--twe-text-primary)]"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="border-b border-[var(--twe-border)] text-[var(--twe-text-muted)] uppercase">
              <tr>
                <th className="px-4 py-2.5">#</th>
                <th className="px-4 py-2.5">Ticker</th>
                <th className="px-4 py-2.5">Concept Name</th>
                <th className="px-4 py-2.5">Classification</th>
                <th className="px-4 py-2.5">Network</th>
                <th className="px-4 py-2.5 text-right">Trillion-Scale Supply</th>
                <th className="px-4 py-2.5 text-right">Seed Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--twe-border)]">
              {slice.map((item) => (
                <tr key={item.id} className="h-10 hover:bg-[var(--twe-bg-elevated)]">
                  <td className="px-4 py-2 font-mono tabular-nums text-[var(--twe-text-muted)]">{item.batchIndex}</td>
                  <td className="px-4 py-2 font-mono font-semibold text-[#A8843E] dark:text-[#D4B475]">{item.ticker}</td>
                  <td className="px-4 py-2 text-[var(--twe-text-primary)]">{item.name}</td>
                  <td className="px-4 py-2 text-[var(--twe-text-secondary)]">{item.kind}</td>
                  <td className="px-4 py-2 text-[var(--twe-text-secondary)]">{item.chain}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-[var(--twe-text-primary)]">{item.simulatedSupply}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-[var(--twe-text-primary)]">${item.initialPriceUsd.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-[var(--twe-border)] flex items-center justify-between text-xs text-[var(--twe-text-secondary)]">
          <span className="font-mono tabular-nums">Page {page} / {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded border border-[var(--twe-border)] disabled:opacity-40 cursor-pointer"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded border border-[var(--twe-border)] disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
