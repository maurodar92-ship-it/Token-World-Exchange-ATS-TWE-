import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code2,
  Copy,
  CreditCard,
  Database,
  Download,
  ExternalLink,
  Globe,
  RefreshCw,
  Search,
  ShieldCheck,
  Shuffle,
  Terminal,
} from 'lucide-react';

interface OnChainTransition {
  step: number;
  state: string;
  blockNumber: number;
  gasUsed: number;
  confirmations: number;
  txHash: string;
  timestampIso: string;
  verifierNode: string;
}

interface SanctionsDuty {
  regime: string;
  authority: string;
  verdict: string;
  dutyObligation: string;
  attestationCode: string;
}

interface AccountTableSpec {
  id: string;
  tableName: string;
  firestoreCollection: string;
  category: string;
  writePolicy: string;
  primaryKey: string;
  columns: string[];
  invariant: string;
  sqlDdl: string;
  sampleRow: Record<string, string | number | boolean>;
}

interface CloudDbPageRecord {
  pageIndex: string;
  pageId: string;
  tableName: string;
  firestoreCollection: string;
  category: string;
  writePolicy: string;
  regionCluster: string;
  replicationFactor: number;
  sha256Fingerprint: string;
  merkleRoot: string;
  onChainTransitions: OnChainTransition[];
  sanctionsDuties: SanctionsDuty[];
  webpagePath: string;
  ceilingIndex: string;
  ceilingDigits: number;
}

interface TokenFoundryPageRecord {
  pageIndex: string;
  contractId: string;
  ticker: string;
  tokenName: string;
  standard: string;
  chainName: string;
  contractAddress: string;
  initialPriceUsd: number;
  maxSupplyUnits: string;
  sha256Fingerprint: string;
  merkleRoot: string;
  hmacIntegritySeal: string;
  soliditySource: string;
  expressRouteScaffold: string;
  onChainTransitions: OnChainTransition[];
  sanctionsDuties: SanctionsDuty[];
  webpagePath: string;
  exportApiPath: string;
  ceilingIndex: string;
  ceilingDigits: number;
}

type WorkbenchPageRecord = CloudDbPageRecord | TokenFoundryPageRecord;

interface RangePayload {
  startIndex: string;
  ceilingIndex: string;
  ceilingDigits: number;
  scientificCeiling: string;
  maxSupportedDigits: number;
  tables?: AccountTableSpec[];
  standards?: string[];
  items: WorkbenchPageRecord[];
}

interface CheckoutOrder {
  id: string;
  accountId: string;
  tokenSymbol: string;
  quantity: number;
  unitPriceUsd: number;
  subtotalUsd: number;
  feeBps: number;
  feeUsd: number;
  totalUsd: number;
  settlementRail: string;
  chainId: number;
  jurisdiction: string;
  status: 'INITIATED' | 'SANCTIONS_CLEARED' | 'ONCHAIN_BROADCAST' | 'CONFIRMED';
  txHash: string;
  blockNumber: number;
  hmacReceipt: string;
  sanctionsClearanceCode: string;
  statusHistory: Array<{ status: string; at: string; note: string }>;
}

interface CryptologicReport {
  suiteName: string;
  allPassed: boolean;
  passedCount: number;
  totalCount: number;
  executedAt: string;
  tests: Array<{
    id: string;
    name: string;
    passed: boolean;
    durationMs: number;
    proofDigest: string;
    detail: string;
  }>;
}

const SUPERSCRIPT_MAP: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
};

const UINT256_MAX_STR =
  '115792089237316195423570985008687907853269984665640564039457584007913129639935';

const CHECKOUT_RAIL_OPTIONS = [
  { index: 0, label: 'Ethereum Mainnet ERC-3643 DvP (15 bps)' },
  { index: 1, label: 'Base L2 Institutional ERC-20 (8 bps)' },
  { index: 2, label: 'Arbitrum One Atomic Clearing (10 bps)' },
  { index: 3, label: 'Solana SPL-2022 Transfer Hook (6 bps)' },
  { index: 4, label: 'TWE ATS Internal Netting Rail (5 bps)' },
];

function normalizeDigits(raw: string): string {
  const ascii = raw.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => SUPERSCRIPT_MAP[c] ?? '');
  return ascii.replace(/[^0-9]/g, '').slice(0, 2048) || '1';
}

function abbrevIdx(idx: string): string {
  if (idx.length <= 15) return idx.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${idx.slice(0, 6)}…${idx.slice(-6)} (${idx.length}d)`;
}

function random64Digit(): string {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += String(bytes[i] % 10) + String((bytes[i] >> 4) % 10);
  }
  return out.replace(/^0+/, '') || '1';
}

function isTokenFoundryPage(item: WorkbenchPageRecord): item is TokenFoundryPageRecord {
  return 'contractId' in item;
}

export const CloudDbAndFoundryWorkbench: React.FC<{
  mode: 'cloud-database' | 'token-foundry';
}> = ({ mode }) => {
  const isCloudDb = mode === 'cloud-database';
  const [activeTab, setActiveTab] = useState<'webpages' | 'accounts' | 'checkout' | 'cryptologic'>('webpages');

  // Hyper-scale webpage state
  const [cursorIndex, setCursorIndex] = useState<string>('1');
  const [jumpInput, setJumpInput] = useState<string>('1');
  const [filterVal, setFilterVal] = useState<string>('ALL');
  const [rangeData, setRangeData] = useState<RangePayload | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<string>('1');
  const [loadingSlice, setLoadingSlice] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  // Account tables state
  const [accountTables, setAccountTables] = useState<AccountTableSpec[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>('acc-01');

  // Checkout aggregator state
  const [orders, setOrders] = useState<CheckoutOrder[]>([]);
  const [chkSymbol, setChkSymbol] = useState<string>('TWE-G');
  const [chkQty, setChkQty] = useState<string>('250');
  const [chkPrice, setChkPrice] = useState<string>('142.85');
  const [chkRailIndex, setChkRailIndex] = useState<number>(0);
  const [chkJurisdiction, setChkJurisdiction] = useState<string>('US-SEC / EU-MiCA');
  const [submittingCheckout, setSubmittingCheckout] = useState<boolean>(false);
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  // Cryptologic test suite state
  const [cryptoReport, setCryptoReport] = useState<CryptologicReport | null>(null);
  const [runningTests, setRunningTests] = useState<boolean>(false);

  const fetchSlice = useCallback(
    async (start: string, filter: string) => {
      setLoadingSlice(true);
      try {
        const qs = new URLSearchParams({ start, limit: '10' });
        if (isCloudDb) qs.set('table', filter);
        else qs.set('standard', filter);
        const url = isCloudDb
          ? `/api/twe/cloud-database/pages/range?${qs.toString()}`
          : `/api/twe/token-foundry/pages/range?${qs.toString()}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const json = (await res.json()) as RangePayload;
        setRangeData(json);
        if (json.items.length > 0) {
          setSelectedIndex((prev) =>
            json.items.some((it) => it.pageIndex === prev) ? prev : json.items[0].pageIndex
          );
        }
      } finally {
        setLoadingSlice(false);
      }
    },
    [isCloudDb]
  );

  const fetchAccountTables = useCallback(async () => {
    const res = await fetch('/api/twe/account-tables');
    if (res.ok) {
      const json = (await res.json()) as { tables: AccountTableSpec[] };
      setAccountTables(json.tables);
    }
  }, []);

  const fetchCheckoutOrders = useCallback(async () => {
    const res = await fetch('/api/twe/checkout-aggregator/orders');
    if (res.ok) {
      const json = (await res.json()) as { orders: CheckoutOrder[] };
      setOrders(json.orders);
    }
  }, []);

  const runCryptoSuite = useCallback(async () => {
    setRunningTests(true);
    try {
      const res = await fetch('/api/twe/cryptologic/tests');
      if (res.ok) {
        setCryptoReport((await res.json()) as CryptologicReport);
      }
    } finally {
      setRunningTests(false);
    }
  }, []);

  useEffect(() => {
    void fetchSlice(cursorIndex, filterVal);
  }, [cursorIndex, filterVal, fetchSlice]);

  useEffect(() => {
    void fetchAccountTables();
    void fetchCheckoutOrders();
    void runCryptoSuite();
  }, [fetchAccountTables, fetchCheckoutOrders, runCryptoSuite]);

  const navigateIndex = (raw: string) => {
    const clean = normalizeDigits(raw);
    setCursorIndex(clean);
    setJumpInput(clean);
    setSelectedIndex(clean);
  };

  const shiftCursor = (delta: bigint) => {
    try {
      const next = BigInt(normalizeDigits(cursorIndex)) + delta;
      navigateIndex(next < 1n ? '1' : next.toString());
    } catch {
      navigateIndex('1');
    }
  };

  const activePage =
    rangeData?.items.find((it) => it.pageIndex === selectedIndex) ?? rangeData?.items[0] ?? null;

  const activeAccountTable =
    accountTables.find((t) => t.id === selectedTableId) ?? accountTables[0] ?? null;

  const handleCopyUrl = async () => {
    if (!activePage) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${activePage.webpagePath}`);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleDownloadFullstack = async () => {
    if (!activePage) return;
    const res = await fetch(`/api/twe/fullstack/export/${mode}/${activePage.pageIndex}`);
    if (!res.ok) return;
    const text = await res.text();
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug =
      activePage.pageIndex.length > 14
        ? `${activePage.pageIndex.slice(0, 6)}-${activePage.pageIndex.slice(-6)}`
        : activePage.pageIndex;
    a.download = `twe-${mode}-fullstack-${slug}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadHtml = async () => {
    if (!activePage) return;
    const res = await fetch(activePage.webpagePath);
    if (!res.ok) return;
    const text = await res.text();
    const blob = new Blob([text], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `twe-${mode}-page-${activePage.pageIndex.slice(0, 12)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCreateCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCheckout(true);
    try {
      const res = await fetch('/api/twe/checkout-aggregator/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenSymbol: chkSymbol,
          quantity: Number(chkQty) || 100,
          unitPriceUsd: Number(chkPrice) || 100,
          railIndex: chkRailIndex,
          jurisdiction: chkJurisdiction,
        }),
      });
      if (res.ok) {
        await fetchCheckoutOrders();
      }
    } finally {
      setSubmittingCheckout(false);
    }
  };

  const handleAdvanceStatus = async (orderId: string) => {
    setAdvancingId(orderId);
    try {
      const res = await fetch(`/api/twe/checkout-aggregator/orders/${orderId}/advance`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchCheckoutOrders();
      }
    } finally {
      setAdvancingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] overflow-hidden">
      {/* Header + 4-Tab Bar */}
      <div className="px-4 py-3.5 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
            <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
              {isCloudDb
                ? 'Cloud Database Hyper-Scale Webpages · Account Tables · Checkout Aggregator'
                : 'Token Foundry Hyper-Scale Webpages · Dynamic Fullstack · Checkout Aggregator'}
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-[var(--twe-text-secondary)]">
            Modular HTML5 webpages up to{' '}
            <span className="font-mono font-medium text-[#A8843E] dark:text-[#D4B475]">
              {rangeData
                ? `${rangeData.ceilingDigits}-digit ceiling (${rangeData.scientificCeiling})`
                : '590-digit target ceiling'}
            </span>{' '}
            with on-chain operation status lifecycles, sanctions compliance duties &amp; cryptologic proofs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'webpages', label: 'Hyper-Scale Webpages', icon: Globe },
              { id: 'accounts', label: `Account Tables (${accountTables.length || 6})`, icon: Database },
              { id: 'checkout', label: `Checkout Aggregator (${orders.length})`, icon: CreditCard },
              {
                id: 'cryptologic',
                label: cryptoReport
                  ? `Cryptologic Tests (${cryptoReport.passedCount}/${cryptoReport.totalCount})`
                  : 'Cryptologic Tests',
                icon: ShieldCheck,
              },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#A8843E] text-white'
                    : 'bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] text-[var(--twe-text-secondary)] hover:border-[#D4B475] hover:text-[var(--twe-text-primary)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: HYPER-SCALE WEBPAGES */}
      {activeTab === 'webpages' && (
        <div>
          <div className="p-4 border-b border-[var(--twe-border)] space-y-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                navigateIndex(jumpInput);
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[var(--twe-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  placeholder="Enter any arbitrary-precision webpage index (up to 2,048 digits, superscripts ⁹ normalized)..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-xs text-[var(--twe-text-primary)] focus:outline-none focus:border-[#D4B475]"
                />
              </div>

              <select
                value={filterVal}
                onChange={(e) => setFilterVal(e.target.value)}
                className="px-2.5 py-1.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-xs text-[var(--twe-text-primary)]"
              >
                <option value="ALL">
                  {isCloudDb ? 'All 6 Account Tables' : 'All Standards (ERC-3643/1400/20)'}
                </option>
                {isCloudDb
                  ? accountTables.map((t) => (
                      <option key={t.id} value={t.tableName}>
                        {t.tableName}
                      </option>
                    ))
                  : ['ERC-3643', 'ERC-1400', 'ERC-20'].map((std) => (
                      <option key={std} value={std}>
                        {std}
                      </option>
                    ))}
              </select>

              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-md bg-[#A8843E] hover:bg-[#937131] text-white font-medium text-xs cursor-pointer shrink-0"
              >
                Jump to Page
              </button>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => navigateIndex('1')}
                  className="px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] hover:border-[#D4B475] font-mono text-[11px] cursor-pointer"
                >
                  #1
                </button>
                <button
                  type="button"
                  onClick={() => navigateIndex('1000000')}
                  className="px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] hover:border-[#D4B475] font-mono text-[11px] cursor-pointer"
                >
                  #1,000,000
                </button>
                <button
                  type="button"
                  onClick={() => navigateIndex(UINT256_MAX_STR)}
                  className="px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] hover:border-[#D4B475] font-mono text-[11px] cursor-pointer"
                >
                  2^256 - 1
                </button>
                {rangeData?.ceilingIndex && (
                  <button
                    type="button"
                    onClick={() => navigateIndex(rangeData.ceilingIndex)}
                    className="px-2.5 py-1 rounded bg-[var(--twe-gold-soft)] border border-[#A8843E] dark:border-[#D4B475] font-mono text-[11px] font-medium text-[#A8843E] dark:text-[#D4B475] cursor-pointer"
                  >
                    Target Ceiling ({rangeData.ceilingDigits} digits)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigateIndex(random64Digit())}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] hover:border-[#D4B475] font-mono text-[11px] cursor-pointer"
                >
                  <Shuffle className="w-3 h-3" />
                  Random 64-Digit
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => shiftCursor(-1000n)}
                  className="px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[11px] cursor-pointer"
                >
                  -1,000
                </button>
                <button
                  type="button"
                  onClick={() => shiftCursor(-10n)}
                  className="inline-flex items-center gap-0.5 px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-[11px] cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev 10
                </button>
                <button
                  type="button"
                  onClick={() => shiftCursor(10n)}
                  className="inline-flex items-center gap-0.5 px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-[11px] cursor-pointer"
                >
                  Next 10
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => shiftCursor(1000n)}
                  className="px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[11px] cursor-pointer"
                >
                  +1,000
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 divide-y xl:divide-y-0 xl:divide-x divide-[var(--twe-border)]">
            {/* Left Directory */}
            <div className="xl:col-span-5 divide-y divide-[var(--twe-border)] max-h-[540px] overflow-y-auto">
              {rangeData?.items.map((item) => {
                const selected = activePage?.pageIndex === item.pageIndex;
                const isTf = isTokenFoundryPage(item);
                return (
                  <button
                    key={item.pageIndex}
                    type="button"
                    onClick={() => setSelectedIndex(item.pageIndex)}
                    className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${
                      selected ? 'bg-[var(--twe-gold-soft)]' : 'hover:bg-[var(--twe-bg-elevated)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-[#A8843E] dark:text-[#D4B475]">
                        {isTf ? `${item.ticker} · ${item.contractId}` : `${item.pageId} · ${item.tableName}`}
                      </span>
                      <span className="font-mono text-[11px] text-[var(--twe-text-muted)]">
                        #{abbrevIdx(item.pageIndex)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-[var(--twe-text-primary)] truncate">
                      {isTf ? item.tokenName : item.firestoreCollection}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between text-[11px] text-[var(--twe-text-muted)]">
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                        FINALIZED · OFAC/EU CLEARED
                      </span>
                      <span className="font-mono">
                        {isTf ? item.standard : item.writePolicy}
                      </span>
                    </div>
                  </button>
                );
              })}
              {loadingSlice && !rangeData && (
                <div className="p-6 text-center text-xs text-[var(--twe-text-muted)]">
                  Loading hyper-scale directory...
                </div>
              )}
            </div>

            {/* Right Live Modular HTML5 Webpage Preview */}
            <div className="xl:col-span-7 flex flex-col">
              {activePage ? (
                <>
                  <div className="px-4 py-2.5 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-[var(--twe-text-secondary)] truncate max-w-[260px]">
                      {activePage.webpagePath}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleCopyUrl()}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] hover:border-[#D4B475] text-[11px] cursor-pointer"
                      >
                        {copiedUrl ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        {copiedUrl ? 'Copied' : 'Copy URL'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDownloadHtml()}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] hover:border-[#D4B475] text-[11px] cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        .HTML
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDownloadFullstack()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#A8843E] text-white text-[11px] font-medium hover:bg-[#937131] cursor-pointer"
                      >
                        <Code2 className="w-3 h-3" />
                        Export Fullstack (.JSON)
                      </button>
                      <a
                        href={activePage.webpagePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] text-[11px] text-[#A8843E] dark:text-[#D4B475]"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open
                      </a>
                    </div>
                  </div>
                  <iframe
                    key={activePage.webpagePath}
                    title={`Modular HTML5 Webpage ${activePage.pageIndex}`}
                    src={activePage.webpagePath}
                    sandbox="allow-same-origin"
                    className="w-full h-[500px] border-0 bg-[#090b0f]"
                  />
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACCOUNT TABLES & SANCTIONS DUTIES */}
      {activeTab === 'accounts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[var(--twe-border)]">
          <div className="lg:col-span-5 divide-y divide-[var(--twe-border)]">
            {accountTables.map((tbl) => {
              const selected = activeAccountTable?.id === tbl.id;
              return (
                <button
                  key={tbl.id}
                  type="button"
                  onClick={() => setSelectedTableId(tbl.id)}
                  className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${
                    selected ? 'bg-[var(--twe-gold-soft)]' : 'hover:bg-[var(--twe-bg-elevated)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-[var(--twe-text-primary)]">
                      {tbl.tableName}
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-[#A8843E] dark:text-[#D4B475]">
                      {tbl.category}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-[var(--twe-text-muted)]">
                    {tbl.firestoreCollection} · {tbl.writePolicy}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7 p-4 space-y-3 text-xs">
            {activeAccountTable && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#A8843E] dark:text-[#D4B475]">
                      {activeAccountTable.category} · {activeAccountTable.writePolicy}
                    </div>
                    <h4 className="font-mono text-base font-semibold text-[var(--twe-text-primary)]">
                      {activeAccountTable.tableName}
                    </h4>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--twe-text-muted)]">
                    PK: {activeAccountTable.primaryKey}
                  </span>
                </div>

                <p className="text-[var(--twe-text-secondary)]">{activeAccountTable.invariant}</p>

                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)] mb-1">
                    PostgreSQL Account Table DDL
                  </div>
                  <pre className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[11px] overflow-x-auto text-[var(--twe-text-primary)]">
                    {activeAccountTable.sqlDdl}
                  </pre>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--twe-text-muted)] mb-1">
                    Verified Sample Row
                  </div>
                  <pre className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[11px] overflow-x-auto text-[var(--twe-text-secondary)]">
                    {JSON.stringify(activeAccountTable.sampleRow, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CHECKOUT AGGREGATOR & ON-CHAIN STATUS TRANSITIONS */}
      {activeTab === 'checkout' && (
        <div className="p-4 grid grid-cols-1 xl:grid-cols-12 gap-4">
          <form
            onSubmit={handleCreateCheckout}
            className="xl:col-span-4 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-4 space-y-3 h-fit"
          >
            <div className="flex items-center gap-2 text-xs font-display font-semibold text-[var(--twe-text-primary)]">
              <CreditCard className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
              <span>Multi-Rail Checkout Aggregator</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <label className="block space-y-1">
                <span className="text-[10px] uppercase text-[var(--twe-text-muted)]">Token Symbol</span>
                <input
                  type="text"
                  required
                  value={chkSymbol}
                  onChange={(e) => setChkSymbol(e.target.value.toUpperCase())}
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] font-mono text-[var(--twe-text-primary)]"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] uppercase text-[var(--twe-text-muted)]">Quantity</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  value={chkQty}
                  onChange={(e) => setChkQty(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] font-mono tabular-nums text-[var(--twe-text-primary)]"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <label className="block space-y-1">
                <span className="text-[10px] uppercase text-[var(--twe-text-muted)]">Unit Price (USD)</span>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={chkPrice}
                  onChange={(e) => setChkPrice(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] font-mono tabular-nums text-[var(--twe-text-primary)]"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] uppercase text-[var(--twe-text-muted)]">Jurisdiction</span>
                <input
                  type="text"
                  value={chkJurisdiction}
                  onChange={(e) => setChkJurisdiction(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-primary)]"
                />
              </label>
            </div>

            <label className="block space-y-1 text-xs">
              <span className="text-[10px] uppercase text-[var(--twe-text-muted)]">Settlement Rail</span>
              <select
                value={chkRailIndex}
                onChange={(e) => setChkRailIndex(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-primary)]"
              >
                {CHECKOUT_RAIL_OPTIONS.map((r) => (
                  <option key={r.index} value={r.index}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={submittingCheckout}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-[#A8843E] hover:bg-[#937131] text-white font-semibold text-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{submittingCheckout ? 'Routing Checkout...' : 'Execute Aggregated Checkout'}</span>
            </button>
          </form>

          <div className="xl:col-span-8 space-y-3">
            {orders.map((ord) => {
              const isConfirmed = ord.status === 'CONFIRMED';
              return (
                <div
                  key={ord.id}
                  className="rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-3.5 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#A8843E] dark:text-[#D4B475]">
                        {ord.id}
                      </span>
                      <span className="font-mono text-xs font-semibold text-[var(--twe-text-primary)]">
                        {ord.quantity.toLocaleString('en-US')} {ord.tokenSymbol}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-semibold">
                        {ord.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold tabular-nums text-[var(--twe-text-primary)]">
                        ${ord.totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      {!isConfirmed && (
                        <button
                          type="button"
                          disabled={advancingId === ord.id}
                          onClick={() => void handleAdvanceStatus(ord.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#A8843E] hover:bg-[#937131] text-white text-[11px] font-medium cursor-pointer disabled:opacity-50"
                        >
                          <span>Advance On-Chain Status</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono text-[var(--twe-text-secondary)]">
                    <div>Rail: {ord.settlementRail}</div>
                    <div>Sanctions: {ord.sanctionsClearanceCode}</div>
                    <div className="truncate">Tx: {ord.txHash.slice(0, 18)}…</div>
                  </div>

                  <div className="border-t border-[var(--twe-border)] pt-2 space-y-1">
                    {ord.statusHistory.map((h, i) => (
                      <div key={`${ord.id}-${i}`} className="flex items-start gap-2 text-[11px]">
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                          [{h.status}]
                        </span>
                        <span className="text-[var(--twe-text-secondary)]">{h.note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: MASTER OF CRYPTOLOGIC TESTS & FULLSTACK EXPORT */}
      {activeTab === 'cryptologic' && (
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
                <h4 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
                  {cryptoReport?.suiteName ?? 'TWE Master of Cryptologic Verification Suite'}
                </h4>
              </div>
              <p className="text-xs text-[var(--twe-text-secondary)] mt-0.5">
                Verifies 590-digit BigInt precision, SHA-256 avalanche, HMAC-SHA256 checkout seals, Merkle roots, EIP-55 checksums, and sanctions invariants.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void runCryptoSuite()}
                disabled={runningTests}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] hover:border-[#D4B475] text-xs font-medium cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${runningTests ? 'animate-spin' : ''}`} />
                Re-Run All Tests
              </button>
              <button
                type="button"
                onClick={() => void handleDownloadFullstack()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#A8843E] hover:bg-[#937131] text-white text-xs font-semibold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export Dynamic Fullstack Bundle
              </button>
            </div>
          </div>

          {cryptoReport && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cryptoReport.tests.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-3.5 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-[var(--twe-text-primary)] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      {t.id} · {t.name}
                    </span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      {t.passed ? 'PASS' : 'FAIL'} · {t.durationMs}ms
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--twe-text-secondary)]">{t.detail}</p>
                  <div className="font-mono text-[10px] text-[var(--twe-text-muted)]">
                    Proof Digest: {t.proofDigest}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
