import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Cpu,
  Download,
  Eye,
  EyeOff,
  Hammer,
  Image as ImageIcon,
  KeyRound,
  Rocket,
  Search,
  ShieldCheck,
} from 'lucide-react';
import type { FoundryTokenArtifact, FoundryTokenDetail } from '../types/twe';
import { RegistryAndCompilerProSuite } from './SolidityRegistryTools';
import { DeterministicCreate2Deployer } from './DeterministicCreate2Deployer';
import { CloudDbAndFoundryWorkbench } from './CloudDbAndFoundryWorkbench';

interface PaginatedFoundryResponse {
  items: FoundryTokenArtifact[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  deployedCount: number;
}

export const TokenFoundryProView: React.FC<{ onTokensDeployed?: () => void }> = ({
  onTokensDeployed,
}) => {
  const [seed, setSeed] = useState('TWE-SOVEREIGN-10K');
  const [count, setCount] = useState(10000);
  const [preset, setPreset] = useState<'custom' | 'currencies' | 'commodities'>('custom');
  const [standard, setStandard] = useState<'ERC-3643' | 'ERC-20' | 'ERC-1400'>('ERC-3643');
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [data, setData] = useState<PaginatedFoundryResponse>({
    items: [],
    page: 1,
    pageSize: 25,
    totalCount: 0,
    totalPages: 1,
    deployedCount: 0,
  });

  const [generating, setGenerating] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [selectedDetail, setSelectedDetail] = useState<FoundryTokenDetail | null>(null);
  const [detailTab, setDetailTab] = useState<'solidity' | 'bytecode' | 'hsm' | 'nft'>('solidity');
  const [revealKey, setRevealKey] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hsmSigResult, setHsmSigResult] = useState<{
    digestSha256: string;
    signatureHex: string;
    signedAt: string;
  } | null>(null);

  const fetchTokens = useCallback(async () => {
    const qs = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      search,
      kind: kindFilter,
    });
    const res = await fetch(`/api/twe/foundry/tokens?${qs.toString()}`);
    if (res.ok) {
      const json: PaginatedFoundryResponse = await res.json();
      setData(json);
    }
  }, [page, pageSize, search, kindFilter]);

  useEffect(() => {
    void fetchTokens();
  }, [fetchTokens]);

  const handleInspect = async (id: string) => {
    const res = await fetch(`/api/twe/foundry/tokens/${id}`);
    if (res.ok) {
      const detail: FoundryTokenDetail = await res.json();
      setSelectedDetail(detail);
      setHsmSigResult(null);
      setRevealKey(false);
    }
  };

  useEffect(() => {
    if (!selectedDetail && data.items.length > 0) {
      void handleInspect(data.items[0].id);
    }
  }, [data.items, selectedDetail]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/twe/foundry/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed, count, preset, standard }),
      });
      if (res.ok) {
        const json = await res.json();
        setPage(1);
        setSelectedDetail(null);
        await fetchTokens();
        setFeedback(
          `Synthesized ${Number(json.count).toLocaleString('en-US')} fullstack ${standard} smart contracts + OpenZeppelin source + bytecode + HSM envelopes + NFT artifacts.`
        );
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleDeploy = async (id?: string, limit = 50) => {
    setDeploying(true);
    try {
      const res = await fetch('/api/twe/foundry/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { id } : { deployLimit: limit }),
      });
      if (res.ok) {
        const json = await res.json();
        setFeedback(
          `Deployed ${json.deployedCount} fullstack contract(s) to multi-chain registry & Token Atlas.`
        );
        await fetchTokens();
        if (id && selectedDetail?.id === id) {
          await handleInspect(id);
        }
        onTokensDeployed?.();
      }
    } finally {
      setDeploying(false);
    }
  };

  const handleHsmSignProbe = async () => {
    if (!selectedDetail) return;
    const res = await fetch('/api/twe/hsm/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payload: `${selectedDetail.contractAddress}:${selectedDetail.ticker}:${selectedDetail.deployTxHash}`,
      }),
    });
    if (res.ok) {
      setHsmSigResult(await res.json());
    }
  };

  const handleCopy = (label: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(label);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  const downloadFile = (filename: string, content: string, mime = 'text/plain') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Top 10,000-Token Enterprise Foundry Generator Bar */}
      <form
        onSubmit={handleGenerate}
        className="rounded-xl border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] p-4 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--twe-border)]">
          <div>
            <h2 className="text-sm font-display font-semibold text-[var(--twe-text-primary)]">
              Enterprise Smart-Contract &amp; NFT Foundry (Up to 10,000 Tokens / Batch)
            </h2>
            <p className="text-[11px] text-[var(--twe-text-secondary)]">
              Generates deterministic Contract IDs, EVM Bytecode, OpenZeppelin Solidity Source, CloudHSM Envelopes &amp; Per-Token NFTs.
            </p>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            {[100, 1000, 5000, 10000].map((qty) => (
              <button
                key={qty}
                type="button"
                onClick={() => setCount(qty)}
                className={`px-2 py-1 rounded border cursor-pointer ${
                  count === qty
                    ? 'border-[#A8843E] dark:border-[#D4B475] bg-[var(--twe-gold-soft)] text-[var(--twe-text-primary)] font-semibold'
                    : 'border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-muted)]'
                }`}
              >
                {qty.toLocaleString('en-US')}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end text-xs">
          <label className="block">
            <span className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">
              Deterministic Seed
            </span>
            <input
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] px-2.5 py-1.5 font-mono text-[var(--twe-text-primary)]"
            />
          </label>

          <label className="block">
            <span className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">
              Batch Size (1 – 10,000)
            </span>
            <input
              type="number"
              min={1}
              max={10000}
              value={count}
              onChange={(e) => setCount(Math.min(10000, Math.max(1, Number(e.target.value) || 1)))}
              className="mt-1 w-full rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] px-2.5 py-1.5 font-mono tabular-nums text-[var(--twe-text-primary)]"
            />
          </label>

          <label className="block">
            <span className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">
              Minting Preset
            </span>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as 'custom' | 'currencies' | 'commodities')}
              className="mt-1 w-full rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] px-2.5 py-1.5 text-[var(--twe-text-primary)]"
            >
              <option value="custom">Mixed Sovereign Assets</option>
              <option value="currencies">Actual World Currencies (24 FX)</option>
              <option value="commodities">World Commodities Reserve (46)</option>
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">
              OpenZeppelin Standard
            </span>
            <select
              value={standard}
              onChange={(e) => setStandard(e.target.value as 'ERC-3643' | 'ERC-20' | 'ERC-1400')}
              className="mt-1 w-full rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] px-2.5 py-1.5 font-mono text-[var(--twe-text-primary)]"
            >
              <option value="ERC-3643">ERC-3643 (T-REX KYC)</option>
              <option value="ERC-1400">ERC-1400 (Partitioned)</option>
              <option value="ERC-20">ERC-20 Permit + AccessControl</option>
            </select>
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={generating}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              <Hammer className="w-3.5 h-3.5" />
              <span>{generating ? 'Synthesizing...' : `Synthesize ${count.toLocaleString('en-US')}`}</span>
            </button>
          </div>
        </div>

        {feedback && (
          <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 pt-1">
            {feedback}
          </div>
        )}
      </form>

      {/* Main Split: Left Paginated 10k Contract Table | Right Fullstack Contract + HSM + NFT Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Left (7 cols): Paginated Token Registry */}
        <div className="xl:col-span-7 rounded-xl border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-medium text-[var(--twe-text-primary)]">
              Batch Contracts:{' '}
              <span className="font-mono font-semibold tabular-nums">
                {data.totalCount.toLocaleString('en-US')}
              </span>{' '}
              · Deployed:{' '}
              <span className="font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                {data.deployedCount.toLocaleString('en-US')}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[var(--twe-text-muted)] absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Ticker / Contract 0x..."
                  className="pl-7 pr-2.5 py-1 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-xs text-[var(--twe-text-primary)] w-44"
                />
              </div>

              <select
                value={kindFilter}
                onChange={(e) => {
                  setKindFilter(e.target.value);
                  setPage(1);
                }}
                className="px-2 py-1 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-xs text-[var(--twe-text-primary)]"
              >
                <option value="ALL">All Types</option>
                <option value="Tokens">Tokens</option>
                <option value="Currencies">Currencies</option>
                <option value="Commodities">Commodities</option>
                <option value="NFTs">NFTs</option>
              </select>

              <button
                type="button"
                disabled={deploying}
                onClick={() => handleDeploy(undefined, 50)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#A8843E]/50 dark:border-[#D4B475]/50 bg-[var(--twe-gold-soft)] text-[11px] font-semibold text-[var(--twe-text-primary)] hover:opacity-90 cursor-pointer"
              >
                <Rocket className="w-3 h-3 text-[#A8843E] dark:text-[#D4B475]" />
                <span>Deploy Batch (50)</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[540px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[10px] font-mono uppercase text-[var(--twe-text-muted)] sticky top-0">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Token / FX</th>
                  <th className="px-3 py-2">Contract ID</th>
                  <th className="px-3 py-2">Chain</th>
                  <th className="px-3 py-2 text-right">Seed Price</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--twe-border)]">
                {data.items.map((item) => {
                  const selected = selectedDetail?.id === item.id;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleInspect(item.id)}
                      className={`h-10 cursor-pointer transition-colors ${
                        selected
                          ? 'bg-[var(--twe-gold-soft)]'
                          : 'hover:bg-[var(--twe-bg-elevated)]'
                      }`}
                    >
                      <td className="px-3 py-1.5 font-mono tabular-nums text-[var(--twe-text-muted)]">
                        {item.batchIndex}
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="font-mono font-semibold text-[#A8843E] dark:text-[#D4B475]">
                          {item.ticker}{' '}
                          <span className="text-[10px] font-normal text-[var(--twe-text-muted)]">
                            {item.nftTokenId}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--twe-text-secondary)] truncate max-w-[175px]">
                          {item.name}
                        </div>
                      </td>
                      <td className="px-3 py-1.5 font-mono text-[11px] text-[var(--twe-text-primary)]">
                        {item.contractAddress.slice(0, 10)}…{item.contractAddress.slice(-6)}
                      </td>
                      <td className="px-3 py-1.5 text-[var(--twe-text-secondary)]">
                        <div>{item.chain}</div>
                        <div className="text-[10px] font-mono text-[var(--twe-text-muted)]">
                          {item.standard}
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono tabular-nums text-[var(--twe-text-primary)]">
                        ${item.initialPriceUsd.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                      </td>
                      <td className="px-3 py-1.5 text-right" onClick={(e) => e.stopPropagation()}>
                        {item.deployed ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                            <ShieldCheck className="w-3 h-3" /> Live
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeploy(item.id)}
                            className="px-2 py-0.5 rounded border border-[var(--twe-border-strong)] text-[11px] hover:border-[#D4B475] cursor-pointer"
                          >
                            Deploy
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-2.5 border-t border-[var(--twe-border)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--twe-text-secondary)]">
            <span className="font-mono tabular-nums">
              Page {data.page} / {data.totalPages} ({data.totalCount.toLocaleString('en-US')} total)
            </span>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] font-mono text-[11px]"
              >
                {[25, 50, 100].map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}/pg
                  </option>
                ))}
              </select>
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
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-[var(--twe-border)] disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Right (5 cols): Fullstack Smart Contract + Bytecode + CloudHSM + NFT Generator */}
        <div className="xl:col-span-5 rounded-xl border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] overflow-hidden">
          {selectedDetail ? (
            <>
              <div className="p-4 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[#A8843E] dark:text-[#D4B475]">
                      {selectedDetail.ticker}
                    </span>
                    <span className="px-1.5 py-0.5 rounded border border-[var(--twe-border)] font-mono text-[10px]">
                      {selectedDetail.standard}
                    </span>
                    {selectedDetail.deployed && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">
                        Deployed
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-medium text-[var(--twe-text-primary)] mt-0.5">
                    {selectedDetail.name}
                  </div>
                  <div className="font-mono text-[10px] text-[var(--twe-text-muted)] mt-0.5 break-all">
                    Contract ID: {selectedDetail.contractAddress}
                  </div>
                </div>

                {!selectedDetail.deployed && (
                  <button
                    type="button"
                    disabled={deploying}
                    onClick={() => handleDeploy(selectedDetail.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    <span>Deploy Now</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-4 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[11px] font-medium">
                {(
                  [
                    { id: 'solidity', label: 'Solidity', icon: Code2 },
                    { id: 'bytecode', label: 'Bytecode', icon: Cpu },
                    { id: 'hsm', label: 'HSM Key', icon: KeyRound },
                    { id: 'nft', label: 'NFT Gen', icon: ImageIcon },
                  ] as const
                ).map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setDetailTab(t.id)}
                      className={`py-2 flex items-center justify-center gap-1 border-b-2 cursor-pointer ${
                        detailTab === t.id
                          ? 'border-[#A8843E] dark:border-[#D4B475] bg-[var(--twe-bg-surface)] text-[var(--twe-text-primary)]'
                          : 'border-transparent text-[var(--twe-text-muted)]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="p-4 space-y-3">
                {detailTab === 'solidity' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[var(--twe-text-muted)]">
                        OpenZeppelin v5.0 Source
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy('sol', selectedDetail.soliditySource)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--twe-border)] text-[11px] cursor-pointer"
                        >
                          {copiedId === 'sol' ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>Copy .sol</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            downloadFile(
                              `${selectedDetail.ticker}.sol`,
                              selectedDetail.soliditySource
                            )
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--twe-border)] text-[11px] cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>Save .sol</span>
                        </button>
                      </div>
                    </div>
                    <pre className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[10px] leading-relaxed text-[var(--twe-text-primary)] max-h-[380px] overflow-auto">
                      {selectedDetail.soliditySource}
                    </pre>
                  </div>
                )}

                {detailTab === 'bytecode' && (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[var(--twe-text-muted)]">
                        EVM Creation Bytecode ({selectedDetail.bytecodeSizeBytes} bytes)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy('bin', selectedDetail.bytecodeHex)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--twe-border)] text-[11px] cursor-pointer"
                      >
                        {copiedId === 'bin' ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>Copy Bytecode</span>
                      </button>
                    </div>
                    <pre className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[10px] break-all whitespace-pre-wrap text-cyan-600 dark:text-cyan-300">
                      {selectedDetail.bytecodeHex}
                    </pre>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-[var(--twe-text-muted)]">
                        Contract ABI Interface
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy('abi', selectedDetail.abiJson)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--twe-border)] text-[11px] cursor-pointer"
                      >
                        {copiedId === 'abi' ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedId === 'abi' ? 'ABI Copied' : 'Copy ABI'}</span>
                      </button>
                    </div>
                    <pre className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[10px] max-h-48 overflow-auto text-[var(--twe-text-secondary)]">
                      {selectedDetail.abiJson}
                    </pre>
                  </div>
                )}

                {detailTab === 'hsm' && (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] space-y-1.5 font-mono">
                      <div className="text-[10px] uppercase text-[var(--twe-text-muted)]">
                        Enterprise AWS CloudHSM / Vault Key ARN
                      </div>
                      <div className="text-[11px] break-all text-[var(--twe-text-primary)]">
                        {selectedDetail.hsmKeyId}
                      </div>
                      <div className="text-[10px] text-[var(--twe-text-secondary)]">
                        Authorized Signer: {selectedDetail.signerAddress}
                      </div>
                      <div className="text-[10px] text-[var(--twe-text-muted)]">
                        Envelope Hash: {selectedDetail.kmsEnvelopeHash}
                      </div>
                    </div>

                    <div className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] space-y-2 font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase text-[var(--twe-text-muted)]">
                          Sandbox Envelope Signing Key (secp256k1)
                        </span>
                        <button
                          type="button"
                          onClick={() => setRevealKey((r) => !r)}
                          className="inline-flex items-center gap-1 text-[11px] text-[#A8843E] dark:text-[#D4B475] cursor-pointer"
                        >
                          {revealKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{revealKey ? 'Mask Key' : 'Reveal Sandbox Key'}</span>
                        </button>
                      </div>
                      <div className="text-[11px] break-all text-[var(--twe-text-primary)]">
                        {revealKey
                          ? selectedDetail.ephemeralPrivateKeyHex
                          : '0x••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleHsmSignProbe}
                      className="w-full py-2 rounded-md border border-[#A8843E]/50 dark:border-[#D4B475]/50 bg-[var(--twe-gold-soft)] text-xs font-semibold text-[var(--twe-text-primary)] cursor-pointer"
                    >
                      Execute Live CloudHSM ECDSA Signature Attestation
                    </button>

                    {hsmSigResult && (
                      <div className="p-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 font-mono text-[10px] space-y-1 break-all">
                        <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          HSM Signature Verified ({hsmSigResult.signedAt})
                        </div>
                        <div>Digest: {hsmSigResult.digestSha256}</div>
                        <div>Signature: {hsmSigResult.signatureHex}</div>
                      </div>
                    )}
                  </div>
                )}

                {detailTab === 'nft' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-32 h-32 rounded-lg overflow-hidden border border-[var(--twe-border)] shrink-0 bg-[#090B0F]"
                        dangerouslySetInnerHTML={{ __html: selectedDetail.nftSvgMarkup }}
                      />
                      <div className="space-y-1.5 text-xs font-mono min-w-0">
                        <div className="font-semibold text-[var(--twe-text-primary)]">
                          NFT {selectedDetail.nftTokenId}
                        </div>
                        <div className="text-[10px] text-[var(--twe-text-muted)] break-all">
                          CIDv1: {selectedDetail.nftCidV1}
                        </div>
                        <div className="text-[10px] text-[var(--twe-text-muted)] break-all">
                          SHA-256: {selectedDetail.nftSha256.slice(0, 28)}…
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              downloadFile(
                                `${selectedDetail.ticker}-emblem.svg`,
                                selectedDetail.nftSvgMarkup,
                                'image/svg+xml'
                              )
                            }
                            className="px-2 py-1 rounded border border-[var(--twe-border)] text-[10px] cursor-pointer"
                          >
                            Download SVG
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              downloadFile(
                                `${selectedDetail.ticker}-nft.json`,
                                selectedDetail.nftMetadataJson,
                                'application/json'
                              )
                            }
                            className="px-2 py-1 rounded border border-[var(--twe-border)] text-[10px] cursor-pointer"
                          >
                            Export ERC-721 JSON
                          </button>
                        </div>
                      </div>
                    </div>

                    <pre className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[10px] max-h-52 overflow-auto text-[var(--twe-text-secondary)]">
                      {selectedDetail.nftMetadataJson}
                    </pre>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>

      <DeterministicCreate2Deployer />

      <RegistryAndCompilerProSuite items={data.items} selectedDetail={selectedDetail} />

      <CloudDbAndFoundryWorkbench mode="token-foundry" />
    </div>
  );
};
