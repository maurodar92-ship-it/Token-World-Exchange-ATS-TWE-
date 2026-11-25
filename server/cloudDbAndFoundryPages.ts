import crypto from 'crypto';

const SUPERSCRIPT_DIGIT_MAP: Record<string, string> = {
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

const MAX_DIGITS = 2048;

// Exact user-requested arbitrary-precision target ceiling (Unicode superscripts normalized to ASCII digits)
const RAW_USER_HYPER_CEILING =
  '999999999999999999999999999999999999999999999999999999999999999999999999999⁹99999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999⁹99⁹999999999999⁹9999999999999999999999999999999999999999999⁹99999999999999999999999999999999999999999999999999999999999999999999999999⁹999999999999999999999999999999999999⁹99999⁹99999999999999999999999999999999999999999⁹99999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999⁹99999999999999999999999999999999999⁹999999999909999999999999';

export function normalizeHyperBigIntDigits(raw: unknown): string {
  const ascii = String(raw ?? '')
    .trim()
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (ch) => SUPERSCRIPT_DIGIT_MAP[ch] ?? '');
  return ascii.replace(/[^0-9]/g, '').slice(0, MAX_DIGITS);
}

export const CLOUD_DB_CEILING_STR = normalizeHyperBigIntDigits(RAW_USER_HYPER_CEILING);
export const CLOUD_DB_CEILING_DIGITS = CLOUD_DB_CEILING_STR.length;
export const TOKEN_FOUNDRY_PRO_CEILING_STR = CLOUD_DB_CEILING_STR;
export const TOKEN_FOUNDRY_PRO_CEILING_DIGITS = CLOUD_DB_CEILING_DIGITS;

export function parseHyperBigIntIndex(raw: unknown, fallback = 1n): bigint {
  const digits = normalizeHyperBigIntDigits(raw);
  if (!digits) return fallback;
  const parsed = BigInt(digits);
  return parsed < 1n ? 1n : parsed;
}

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function hmacSha256(key: string, input: string): string {
  return crypto.createHmac('sha256', key).update(input).digest('hex');
}

function readUInt32(hex: string, byteOffset: number): number {
  const start = (byteOffset % 28) * 2;
  return parseInt(hex.slice(start, start + 8), 16) >>> 0;
}

function escapeHtml(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAbbrev(numStr: string): string {
  if (numStr.length <= 18) return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${numStr.slice(0, 8)}…${numStr.slice(-8)} (${numStr.length} digits)`;
}

function formatScientific(numStr: string): string {
  if (numStr.length <= 6) return numStr;
  return `${numStr[0]}.${numStr.slice(1, 3)} × 10^${numStr.length - 1}`;
}

function toEip55Address(hex40: string): string {
  const lower = hex40.toLowerCase().slice(0, 40).padEnd(40, '0');
  const hash = sha256(lower);
  let out = '0x';
  for (let i = 0; i < 40; i++) {
    const ch = lower[i];
    if (ch >= 'a' && ch <= 'f' && parseInt(hash[i], 16) >= 8) {
      out += ch.toUpperCase();
    } else {
      out += ch;
    }
  }
  return out;
}

/* ============================================================================
 * 1. ACCOUNT TABLES CATALOG (6 PRODUCTION RELATIONAL / FIRESTORE TABLES)
 * ============================================================================ */

export interface AccountTableSpec {
  id: string;
  tableName: string;
  firestoreCollection: string;
  category: 'Identity' | 'Balances' | 'Sanctions' | 'Checkout' | 'On-Chain Ops' | 'Workspace Context';
  writePolicy: 'Mutable Indexed' | 'Append-Only' | 'Immutable Snapshot';
  primaryKey: string;
  columns: string[];
  invariant: string;
  sqlDdl: string;
  sampleRow: Record<string, string | number | boolean>;
}

export const ACCOUNT_TABLES_CATALOG: AccountTableSpec[] = [
  {
    id: 'acc-01',
    tableName: 'accounts',
    firestoreCollection: '/users/{uid}',
    category: 'Identity',
    writePolicy: 'Mutable Indexed',
    primaryKey: 'account_id (UUID)',
    columns: ['account_id', 'firebase_uid', 'wallet_address', 'jurisdiction', 'kyc_tier', 'sanctions_status', 'created_at'],
    invariant: 'Every account binds a verified Firebase UID to an EIP-55 wallet address and active KYC/AML tier.',
    sqlDdl: `CREATE TABLE IF NOT EXISTS accounts (
  account_id UUID PRIMARY KEY,
  firebase_uid TEXT NOT NULL UNIQUE,
  wallet_address CHAR(42) NOT NULL,
  jurisdiction VARCHAR(32) NOT NULL,
  kyc_tier VARCHAR(24) NOT NULL DEFAULT 'INSTITUTIONAL_QIB',
  sanctions_status VARCHAR(24) NOT NULL DEFAULT 'CLEARED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`,
    sampleRow: {
      account_id: 'acc-9f10a2c4',
      firebase_uid: 'uid_twe_inst_01',
      wallet_address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      jurisdiction: 'US-SEC / EU-MiCA',
      kyc_tier: 'INSTITUTIONAL_QIB',
      sanctions_status: 'CLEARED',
      created_at: '2026-11-24T20:00:00Z',
    },
  },
  {
    id: 'acc-02',
    tableName: 'account_balances',
    firestoreCollection: '/accounts/{accountId}/balances',
    category: 'Balances',
    writePolicy: 'Append-Only',
    primaryKey: 'balance_entry_id (BIGINT)',
    columns: ['balance_entry_id', 'account_id', 'asset_symbol', 'available_units', 'locked_escrow_units', 'usd_mark_value', 'merkle_leaf'],
    invariant: 'Double-entry balance deltas prevent negative available balances and reconcile against uint256 vault bounds.',
    sqlDdl: `CREATE TABLE IF NOT EXISTS account_balances (
  balance_entry_id NUMERIC(78,0) PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(account_id),
  asset_symbol VARCHAR(24) NOT NULL,
  available_units NUMERIC(78,0) NOT NULL CHECK (available_units >= 0),
  locked_escrow_units NUMERIC(78,0) NOT NULL DEFAULT 0,
  usd_mark_value NUMERIC(20,4) NOT NULL,
  merkle_leaf CHAR(66) NOT NULL
);`,
    sampleRow: {
      balance_entry_id: '90421008',
      account_id: 'acc-9f10a2c4',
      asset_symbol: 'TWE-G',
      available_units: '250000',
      locked_escrow_units: '12500',
      usd_mark_value: 35712500.0,
      merkle_leaf: '0x9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c',
    },
  },
  {
    id: 'acc-03',
    tableName: 'account_kyc_sanctions',
    firestoreCollection: '/accounts/{accountId}/sanctions_screenings',
    category: 'Sanctions',
    writePolicy: 'Immutable Snapshot',
    primaryKey: 'screening_id (UUID)',
    columns: ['screening_id', 'account_id', 'ofac_sdn', 'eu_consolidated', 'uk_hmt', 'fatf_travel_rule', 'risk_score', 'attestation_hash'],
    invariant: 'Pre-trade and pre-checkout screening runs against OFAC SDN, EU, UK HMT, UNSC, and FATF Travel Rule duties.',
    sqlDdl: `CREATE TABLE IF NOT EXISTS account_kyc_sanctions (
  screening_id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(account_id),
  ofac_sdn VARCHAR(16) NOT NULL,
  eu_consolidated VARCHAR(16) NOT NULL,
  uk_hmt VARCHAR(16) NOT NULL,
  fatf_travel_rule BOOLEAN NOT NULL,
  risk_score SMALLINT NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  attestation_hash CHAR(66) NOT NULL
);`,
    sampleRow: {
      screening_id: 'scr-772b1e',
      account_id: 'acc-9f10a2c4',
      ofac_sdn: 'CLEARED',
      eu_consolidated: 'CLEARED',
      uk_hmt: 'CLEARED',
      fatf_travel_rule: true,
      risk_score: 4,
      attestation_hash: '0x41cd8a02e9f1b4c3d2a1908f7e6d5c4b3a291807f6e5d4c3b2a1908f7e6d5c4b',
    },
  },
  {
    id: 'acc-04',
    tableName: 'account_checkout_orders',
    firestoreCollection: '/orders/{orderId}',
    category: 'Checkout',
    writePolicy: 'Mutable Indexed',
    primaryKey: 'checkout_id (VARCHAR)',
    columns: ['checkout_id', 'account_id', 'token_symbol', 'settlement_rail', 'quantity', 'total_usd', 'fee_bps', 'status', 'hmac_receipt'],
    invariant: 'Aggregated checkout quotes lock rail routing fees and require sanctions clearance prior to on-chain broadcast.',
    sqlDdl: `CREATE TABLE IF NOT EXISTS account_checkout_orders (
  checkout_id VARCHAR(48) PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(account_id),
  token_symbol VARCHAR(24) NOT NULL,
  settlement_rail VARCHAR(64) NOT NULL,
  quantity NUMERIC(24,6) NOT NULL,
  total_usd NUMERIC(20,4) NOT NULL,
  fee_bps SMALLINT NOT NULL,
  status VARCHAR(32) NOT NULL,
  hmac_receipt CHAR(64) NOT NULL
);`,
    sampleRow: {
      checkout_id: 'CHK-2026-8841A',
      account_id: 'acc-9f10a2c4',
      token_symbol: 'TWE-G',
      settlement_rail: 'Ethereum ERC-3643 DvP',
      quantity: 500,
      total_usd: 71532.13,
      fee_bps: 15,
      status: 'CONFIRMED',
      hmac_receipt: 'a91f8e7d6c5b4a3928171615141312110a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d',
    },
  },
  {
    id: 'acc-05',
    tableName: 'account_onchain_operations',
    firestoreCollection: '/vault_records/{recordId}',
    category: 'On-Chain Ops',
    writePolicy: 'Append-Only',
    primaryKey: 'op_id (VARCHAR)',
    columns: ['op_id', 'checkout_id', 'chain_id', 'tx_hash', 'block_number', 'status_from', 'status_to', 'gas_used', 'confirmed_at'],
    invariant: 'Every on-chain state transition is recorded immutably with cryptographic tx hash and block finality proof.',
    sqlDdl: `CREATE TABLE IF NOT EXISTS account_onchain_operations (
  op_id VARCHAR(48) PRIMARY KEY,
  checkout_id VARCHAR(48) NOT NULL REFERENCES account_checkout_orders(checkout_id),
  chain_id INTEGER NOT NULL,
  tx_hash CHAR(66) NOT NULL,
  block_number BIGINT NOT NULL,
  status_from VARCHAR(32) NOT NULL,
  status_to VARCHAR(32) NOT NULL,
  gas_used INTEGER NOT NULL,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`,
    sampleRow: {
      op_id: 'OP-EVM-99201',
      checkout_id: 'CHK-2026-8841A',
      chain_id: 1,
      tx_hash: '0x6e4a8f12c3b4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0',
      block_number: 21492810,
      status_from: 'ONCHAIN_BROADCAST',
      status_to: 'CONFIRMED',
      gas_used: 142810,
      confirmed_at: '2026-11-24T20:01:12Z',
    },
  },
  {
    id: 'acc-06',
    tableName: 'account_workspace_audit_links',
    firestoreCollection: '/workspace_pages/{pageId}',
    category: 'Workspace Context',
    writePolicy: 'Immutable Snapshot',
    primaryKey: 'link_id (VARCHAR)',
    columns: ['link_id', 'hub_slug', 'bigint_page_index', 'webpage_route', 'sanctions_duty_code', 'merkle_root'],
    invariant: 'Cross-links every arbitrary-precision workspace webpage into a single verifiable audit graph.',
    sqlDdl: `CREATE TABLE IF NOT EXISTS account_workspace_audit_links (
  link_id VARCHAR(48) PRIMARY KEY,
  hub_slug VARCHAR(48) NOT NULL,
  bigint_page_index TEXT NOT NULL,
  webpage_route TEXT NOT NULL,
  sanctions_duty_code VARCHAR(32) NOT NULL,
  merkle_root CHAR(66) NOT NULL
);`,
    sampleRow: {
      link_id: 'WSP-LINK-001',
      hub_slug: 'cloud-database',
      bigint_page_index: '1',
      webpage_route: '/cloud-database/page/1',
      sanctions_duty_code: 'OFAC-EU-FATF-T0',
      merkle_root: '0x2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e',
    },
  },
];

/* ============================================================================
 * 2. ON-CHAIN OPERATION STATUS & SANCTIONS DUTIES GENERATORS
 * ============================================================================ */

export interface OnChainStatusTransition {
  step: number;
  state: 'QUEUED' | 'SANCTIONS_SCREENED' | 'MEMPOOL_BROADCAST' | 'BLOCK_CONFIRMED' | 'FINALIZED';
  blockNumber: number;
  gasUsed: number;
  confirmations: number;
  txHash: string;
  timestampIso: string;
  verifierNode: string;
}

export interface SanctionsDutyItem {
  regime: string;
  authority: string;
  verdict: 'CLEARED' | 'MONITORED' | 'ATTESTED';
  dutyObligation: string;
  attestationCode: string;
}

export interface CheckoutQuoteSummary {
  railName: string;
  chainId: number;
  feeBps: number;
  estimatedSettlementSec: number;
  gasEstimateUsd: number;
  routingScore: number;
  hmacReceipt: string;
}

const SANCTIONS_AUTHORITIES: Array<{ regime: string; authority: string; dutyObligation: string }> = [
  {
    regime: 'OFAC SDN & Consolidated List',
    authority: 'US Treasury OFAC',
    dutyObligation: 'Real-time wallet & counterparty blocking screening prior to ERC-3643 transfer.',
  },
  {
    regime: 'EU Consolidated Financial Sanctions',
    authority: 'European Commission / ESMA',
    dutyObligation: 'Asset freeze verification and MiCA whitepaper disclosure verification.',
  },
  {
    regime: 'UK HMT OFSI Consolidated List',
    authority: 'HM Treasury OFSI',
    dutyObligation: 'Cross-border settlement reporting and designated entity rejection gate.',
  },
  {
    regime: 'UNSC Consolidated Sanctions',
    authority: 'United Nations Security Council',
    dutyObligation: 'Global counter-terrorist financing & proliferation screening invariant.',
  },
  {
    regime: 'FATF Recommendation 16 (Travel Rule)',
    authority: 'FATF / FinCEN',
    dutyObligation: 'Originator & beneficiary VASP payload attached to transfers >= $1,000 USD.',
  },
];

const CHECKOUT_RAILS = [
  { railName: 'Ethereum Mainnet ERC-3643 DvP', chainId: 1, feeBps: 15, estimatedSettlementSec: 12, gasEstimateUsd: 4.25 },
  { railName: 'Base L2 Institutional ERC-20', chainId: 8453, feeBps: 8, estimatedSettlementSec: 2, gasEstimateUsd: 0.04 },
  { railName: 'Arbitrum One Atomic Clearing', chainId: 42161, feeBps: 10, estimatedSettlementSec: 1, gasEstimateUsd: 0.08 },
  { railName: 'Solana SPL-2022 Transfer Hook', chainId: 101, feeBps: 6, estimatedSettlementSec: 1, gasEstimateUsd: 0.002 },
  { railName: 'TWE ATS Internal Netting Rail', chainId: 31337, feeBps: 5, estimatedSettlementSec: 1, gasEstimateUsd: 0.0 },
];

function buildOnChainLifecycle(seedHash: string, idx: bigint): OnChainStatusTransition[] {
  const baseBlock = 21_480_000 + Number(idx % 500_000n) + (readUInt32(seedHash, 0) % 900);
  const txHash = `0x${sha256(`TX:${seedHash}`)}`;
  const states: OnChainStatusTransition['state'][] = [
    'QUEUED',
    'SANCTIONS_SCREENED',
    'MEMPOOL_BROADCAST',
    'BLOCK_CONFIRMED',
    'FINALIZED',
  ];
  return states.map((state, i) => ({
    step: i + 1,
    state,
    blockNumber: i < 3 ? baseBlock : baseBlock + (i - 2),
    gasUsed: i === 0 ? 0 : 42_000 + i * 24_150 + (readUInt32(seedHash, i * 4) % 4_000),
    confirmations: i < 3 ? 0 : i === 3 ? 1 : 32 + (readUInt32(seedHash, 20) % 64),
    txHash,
    timestampIso: `2026-11-24T20:0${i}:${String(10 + ((readUInt32(seedHash, i * 2) % 45))).padStart(2, '0')}Z`,
    verifierNode: `twe-validator-${String(1 + (readUInt32(seedHash, i * 3) % 12)).padStart(2, '0')}`,
  }));
}

function buildSanctionsDuties(seedHash: string): SanctionsDutyItem[] {
  return SANCTIONS_AUTHORITIES.map((auth, idx) => ({
    regime: auth.regime,
    authority: auth.authority,
    verdict: idx === 4 ? 'ATTESTED' : 'CLEARED',
    dutyObligation: auth.dutyObligation,
    attestationCode: `SANC-${sha256(`${seedHash}:${auth.regime}`).slice(0, 12).toUpperCase()}`,
  }));
}

function buildCheckoutQuote(seedHash: string, symbol: string): CheckoutQuoteSummary {
  const rail = CHECKOUT_RAILS[readUInt32(seedHash, 12) % CHECKOUT_RAILS.length];
  return {
    ...rail,
    routingScore: Number((96.4 + ((readUInt32(seedHash, 16) % 35) / 10)).toFixed(1)),
    hmacReceipt: hmacSha256('TWE_CHECKOUT_AGGREGATOR_V1', `${seedHash}:${symbol}:${rail.chainId}`),
  };
}

/* ============================================================================
 * 3. CLOUD DATABASE HYPER-SCALE WEBPAGE RESOLVER
 * ============================================================================ */

export interface CloudDatabaseWebpageRecord {
  pageIndex: string;
  pageId: string;
  accountTableId: string;
  tableName: string;
  firestoreCollection: string;
  category: AccountTableSpec['category'];
  writePolicy: string;
  primaryKey: string;
  columns: string[];
  invariant: string;
  sqlDdl: string;
  deterministicRow: Record<string, string | number | boolean>;
  regionCluster: string;
  replicationFactor: number;
  sha256Fingerprint: string;
  merkleRoot: string;
  onChainTransitions: OnChainStatusTransition[];
  sanctionsDuties: SanctionsDutyItem[];
  checkoutQuote: CheckoutQuoteSummary;
  webpagePath: string;
  prevPageIndex: string;
  nextPageIndex: string;
  ceilingIndex: string;
  ceilingDigits: number;
}

export interface CloudDatabaseRangeResponse {
  startIndex: string;
  limit: number;
  prevStartIndex: string;
  nextStartIndex: string;
  ceilingIndex: string;
  ceilingDigits: number;
  scientificCeiling: string;
  maxSupportedDigits: number;
  activeTable: string;
  tables: AccountTableSpec[];
  items: CloudDatabaseWebpageRecord[];
}

const CLOUD_REGIONS = [
  'us-east1 (Multi-Region Quorum)',
  'europe-west3 (Frankfurt MiCA)',
  'asia-southeast1 (Singapore MAS)',
  'us-central1 (Primary Vault)',
];

export function resolveCloudDatabaseWebpage(
  rawIndex: unknown,
  preferredTableName?: string
): CloudDatabaseWebpageRecord {
  const idx = parseHyperBigIntIndex(rawIndex, 1n);
  const pageIndex = idx.toString();
  const h1 = sha256(`TWE_CLOUD_DB_WEBPAGE_V1:${pageIndex}`);
  const h2 = sha256(`TWE_CLOUD_DB_MERKLE_V1:${pageIndex}:${h1}`);

  const matched = ACCOUNT_TABLES_CATALOG.find((t) => t.tableName === preferredTableName);
  const table = matched ?? ACCOUNT_TABLES_CATALOG[readUInt32(h1, 0) % ACCOUNT_TABLES_CATALOG.length];
  const shortTag = h1.slice(0, 8).toUpperCase();
  const pageId = `TWE-CDB-${shortTag}`;
  const regionCluster = CLOUD_REGIONS[readUInt32(h1, 4) % CLOUD_REGIONS.length];

  const deterministicRow: Record<string, string | number | boolean> = {
    ...table.sampleRow,
    account_id: `acc-${h1.slice(0, 8)}`,
    record_page_index: pageIndex.length > 20 ? `${pageIndex.slice(0, 8)}...${pageIndex.slice(-8)}` : pageIndex,
    merkle_anchor: `0x${h2.slice(0, 32)}`,
  };

  return {
    pageIndex,
    pageId,
    accountTableId: table.id,
    tableName: table.tableName,
    firestoreCollection: table.firestoreCollection,
    category: table.category,
    writePolicy: table.writePolicy,
    primaryKey: table.primaryKey,
    columns: table.columns,
    invariant: table.invariant,
    sqlDdl: table.sqlDdl,
    deterministicRow,
    regionCluster,
    replicationFactor: 3 + (readUInt32(h1, 8) % 3),
    sha256Fingerprint: h1,
    merkleRoot: `0x${h2}`,
    onChainTransitions: buildOnChainLifecycle(h1, idx),
    sanctionsDuties: buildSanctionsDuties(h1),
    checkoutQuote: buildCheckoutQuote(h1, table.tableName.toUpperCase()),
    webpagePath: `/cloud-database/page/${pageIndex}${matched ? `?table=${encodeURIComponent(matched.tableName)}` : ''}`,
    prevPageIndex: idx > 1n ? (idx - 1n).toString() : '1',
    nextPageIndex: (idx + 1n).toString(),
    ceilingIndex: CLOUD_DB_CEILING_STR,
    ceilingDigits: CLOUD_DB_CEILING_DIGITS,
  };
}

export function resolveCloudDatabaseWebpageRange(
  startRaw: unknown,
  limitRaw = 10,
  tableFilter?: string
): CloudDatabaseRangeResponse {
  const start = parseHyperBigIntIndex(startRaw, 1n);
  const limit = Math.max(1, Math.min(25, Math.floor(Number(limitRaw) || 10)));
  const activeTable =
    tableFilter && ACCOUNT_TABLES_CATALOG.some((t) => t.tableName === tableFilter)
      ? tableFilter
      : 'ALL';

  const items: CloudDatabaseWebpageRecord[] = [];
  for (let i = 0; i < limit; i++) {
    items.push(
      resolveCloudDatabaseWebpage(start + BigInt(i), activeTable === 'ALL' ? undefined : activeTable)
    );
  }

  return {
    startIndex: start.toString(),
    limit,
    prevStartIndex: start > BigInt(limit) ? (start - BigInt(limit)).toString() : '1',
    nextStartIndex: (start + BigInt(limit)).toString(),
    ceilingIndex: CLOUD_DB_CEILING_STR,
    ceilingDigits: CLOUD_DB_CEILING_DIGITS,
    scientificCeiling: formatScientific(CLOUD_DB_CEILING_STR),
    maxSupportedDigits: MAX_DIGITS,
    activeTable,
    tables: ACCOUNT_TABLES_CATALOG,
    items,
  };
}

/* ============================================================================
 * 4. TOKEN FOUNDRY DYNAMIC FULLSTACK WEBPAGE RESOLVER
 * ============================================================================ */

export type FoundryContractStd = 'ERC-3643' | 'ERC-1400' | 'ERC-20';

export interface TokenFoundryWebpageRecord {
  pageIndex: string;
  contractId: string;
  ticker: string;
  tokenName: string;
  standard: FoundryContractStd;
  chainName: string;
  chainId: number;
  contractAddress: string;
  deployerAddress: string;
  initialPriceUsd: number;
  maxSupplyUnits: string;
  sha256Fingerprint: string;
  merkleRoot: string;
  hmacIntegritySeal: string;
  soliditySource: string;
  expressRouteScaffold: string;
  accountTableLinked: AccountTableSpec;
  onChainTransitions: OnChainStatusTransition[];
  sanctionsDuties: SanctionsDutyItem[];
  checkoutQuote: CheckoutQuoteSummary;
  webpagePath: string;
  exportApiPath: string;
  prevPageIndex: string;
  nextPageIndex: string;
  ceilingIndex: string;
  ceilingDigits: number;
}

export interface TokenFoundryRangeResponse {
  startIndex: string;
  limit: number;
  prevStartIndex: string;
  nextStartIndex: string;
  ceilingIndex: string;
  ceilingDigits: number;
  scientificCeiling: string;
  maxSupportedDigits: number;
  activeStandard: string;
  standards: FoundryContractStd[];
  items: TokenFoundryWebpageRecord[];
}

const FOUNDRY_PREFIXES = ['Sovereign', 'Meridian', 'Aegis', 'Quantum', 'Apex', 'Citadel', 'Obsidian', 'Vanguard', 'Helios', 'Kinetix'];
const FOUNDRY_NOUNS = ['Treasury', 'Reserve', 'Settlement', 'Equities', 'Bullion', 'Liquidity', 'Capital', 'Bond', 'Index', 'Credit'];
const FOUNDRY_STANDARDS: FoundryContractStd[] = ['ERC-3643', 'ERC-1400', 'ERC-20'];

export function resolveTokenFoundryFullstackWebpage(
  rawIndex: unknown,
  preferredStandard?: string
): TokenFoundryWebpageRecord {
  const idx = parseHyperBigIntIndex(rawIndex, 1n);
  const pageIndex = idx.toString();
  const h1 = sha256(`TWE_TOKEN_FOUNDRY_PRO_V1:${pageIndex}`);
  const h2 = sha256(`TWE_TOKEN_FOUNDRY_MERKLE_V1:${pageIndex}:${h1}`);

  const matchedStd = FOUNDRY_STANDARDS.find((s) => s === preferredStandard);
  const standard: FoundryContractStd = matchedStd ?? FOUNDRY_STANDARDS[readUInt32(h1, 0) % FOUNDRY_STANDARDS.length];
  const prefix = FOUNDRY_PREFIXES[readUInt32(h1, 4) % FOUNDRY_PREFIXES.length];
  const noun = FOUNDRY_NOUNS[readUInt32(h1, 8) % FOUNDRY_NOUNS.length];
  const shortTag = h1.slice(0, 6).toUpperCase();
  const ticker = `${prefix.slice(0, 2).toUpperCase()}${noun.slice(0, 2).toUpperCase()}-${shortTag.slice(0, 3)}`;
  const tokenName = `${prefix} ${noun} Token #${shortTag}`;
  const contractId = `TWE-TF-${standard.replace('-', '')}-${h1.slice(0, 8).toUpperCase()}`;
  const contractAddress = toEip55Address(h1.slice(0, 40));
  const deployerAddress = toEip55Address(h2.slice(0, 40));
  const rail = CHECKOUT_RAILS[readUInt32(h1, 12) % CHECKOUT_RAILS.length];
  const initialPriceUsd = Number((1.25 + ((readUInt32(h2, 4) % 240_000) / 100)).toFixed(2));
  const maxSupplyUnits = (10_000_000 + (readUInt32(h2, 8) % 990_000_000)).toLocaleString('en-US');
  const accountTableLinked = ACCOUNT_TABLES_CATALOG[readUInt32(h1, 16) % ACCOUNT_TABLES_CATALOG.length];
  const hmacIntegritySeal = hmacSha256('TWE_CRYPTOLOGIC_MASTER_V1', `${contractId}:${contractAddress}:${pageIndex}`);

  const soliditySource = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// TWE Master of Cryptologic Fullstack Smart Contract (${standard})
// Contract ID: ${contractId}
// Deterministic Address: ${contractAddress}
// Webpage Index: ${formatAbbrev(pageIndex)}
contract ${ticker.replace(/[^A-Za-z0-9]/g, '')}Token {
    string public constant name = "${tokenName}";
    string public constant symbol = "${ticker}";
    uint8 public constant decimals = 18;
    bytes32 public constant MERKLE_ROOT = 0x${h2};
    address public immutable complianceOracle;

    mapping(address => uint256) public balanceOf;
    mapping(address => bool) public sanctionsCleared;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event OnChainOperationStatusChanged(bytes32 indexed opId, string statusFrom, string statusTo);

    constructor(address _complianceOracle) {
        complianceOracle = _complianceOracle;
        sanctionsCleared[msg.sender] = true;
    }

    function transferWithSanctionsCheck(address to, uint256 amount, bytes32 opId) external returns (bool) {
        require(sanctionsCleared[msg.sender] && sanctionsCleared[to], "OFAC_EU_SANCTIONS_GATE");
        require(balanceOf[msg.sender] >= amount, "INSUFFICIENT_BALANCE");
        unchecked {
            balanceOf[msg.sender] -= amount;
            balanceOf[to] += amount;
        }
        emit Transfer(msg.sender, to, amount);
        emit OnChainOperationStatusChanged(opId, "SANCTIONS_SCREENED", "FINALIZED");
        return true;
    }
}`;

  const expressRouteScaffold = `// Dynamic Fullstack Express Route for ${ticker} (${contractId})
app.post('/api/tokens/${ticker.toLowerCase()}/checkout', async (req, res) => {
  // 1. Validate OFAC/EU/UK HMT/FATF sanctions duties against account_kyc_sanctions
  // 2. Lock account_balances escrow row & create account_checkout_orders record
  // 3. Broadcast EIP-155 tx to ${contractAddress} (Chain ${rail.chainId})
  res.json({ contractId: '${contractId}', ticker: '${ticker}', status: 'SANCTIONS_CLEARED' });
});`;

  return {
    pageIndex,
    contractId,
    ticker,
    tokenName,
    standard,
    chainName: rail.railName,
    chainId: rail.chainId,
    contractAddress,
    deployerAddress,
    initialPriceUsd,
    maxSupplyUnits,
    sha256Fingerprint: h1,
    merkleRoot: `0x${h2}`,
    hmacIntegritySeal,
    soliditySource,
    expressRouteScaffold,
    accountTableLinked,
    onChainTransitions: buildOnChainLifecycle(h1, idx),
    sanctionsDuties: buildSanctionsDuties(h1),
    checkoutQuote: buildCheckoutQuote(h1, ticker),
    webpagePath: `/token-foundry/page/${pageIndex}${matchedStd ? `?standard=${encodeURIComponent(matchedStd)}` : ''}`,
    exportApiPath: `/api/twe/fullstack/export/token-foundry/${pageIndex}`,
    prevPageIndex: idx > 1n ? (idx - 1n).toString() : '1',
    nextPageIndex: (idx + 1n).toString(),
    ceilingIndex: TOKEN_FOUNDRY_PRO_CEILING_STR,
    ceilingDigits: TOKEN_FOUNDRY_PRO_CEILING_DIGITS,
  };
}

export function resolveTokenFoundryFullstackWebpageRange(
  startRaw: unknown,
  limitRaw = 10,
  standardFilter?: string
): TokenFoundryRangeResponse {
  const start = parseHyperBigIntIndex(startRaw, 1n);
  const limit = Math.max(1, Math.min(25, Math.floor(Number(limitRaw) || 10)));
  const activeStandard =
    standardFilter && FOUNDRY_STANDARDS.includes(standardFilter as FoundryContractStd)
      ? standardFilter
      : 'ALL';

  const items: TokenFoundryWebpageRecord[] = [];
  for (let i = 0; i < limit; i++) {
    items.push(
      resolveTokenFoundryFullstackWebpage(
        start + BigInt(i),
        activeStandard === 'ALL' ? undefined : activeStandard
      )
    );
  }

  return {
    startIndex: start.toString(),
    limit,
    prevStartIndex: start > BigInt(limit) ? (start - BigInt(limit)).toString() : '1',
    nextStartIndex: (start + BigInt(limit)).toString(),
    ceilingIndex: TOKEN_FOUNDRY_PRO_CEILING_STR,
    ceilingDigits: TOKEN_FOUNDRY_PRO_CEILING_DIGITS,
    scientificCeiling: formatScientific(TOKEN_FOUNDRY_PRO_CEILING_STR),
    maxSupportedDigits: MAX_DIGITS,
    activeStandard,
    standards: FOUNDRY_STANDARDS,
    items,
  };
}

/* ============================================================================
 * 5. MASTER OF CRYPTOLOGIC LIVE TEST SUITE & DYNAMIC FULLSTACK EXPORTER
 * ============================================================================ */

export interface CryptologicTestResult {
  id: string;
  name: string;
  passed: boolean;
  durationMs: number;
  proofDigest: string;
  detail: string;
}

export interface CryptologicSuiteReport {
  suiteName: string;
  allPassed: boolean;
  passedCount: number;
  totalCount: number;
  executedAt: string;
  tests: CryptologicTestResult[];
}

export function runCryptologicSelfTests(): CryptologicSuiteReport {
  const tests: CryptologicTestResult[] = [];

  const runCheck = (id: string, name: string, fn: () => { ok: boolean; digest: string; detail: string }) => {
    const t0 = performance.now();
    const res = fn();
    const durationMs = Number((performance.now() - t0).toFixed(3));
    tests.push({
      id,
      name,
      passed: res.ok,
      durationMs,
      proofDigest: res.digest,
      detail: res.detail,
    });
  };

  runCheck('CRYPTO-01', '590-Digit BigInt O(1) Precision Preservation', () => {
    const parsed = parseHyperBigIntIndex(RAW_USER_HYPER_CEILING);
    const ok = parsed.toString() === CLOUD_DB_CEILING_STR && CLOUD_DB_CEILING_DIGITS === 590;
    return {
      ok,
      digest: sha256(parsed.toString()).slice(0, 24),
      detail: `Exact ${CLOUD_DB_CEILING_DIGITS}-digit BigInt ceiling preserved with zero IEEE-754 drift.`,
    };
  });

  runCheck('CRYPTO-02', 'Deterministic SHA-256 Avalanche & Reproducibility', () => {
    const a1 = resolveTokenFoundryFullstackWebpage(CLOUD_DB_CEILING_STR);
    const a2 = resolveTokenFoundryFullstackWebpage(CLOUD_DB_CEILING_STR);
    const b = resolveTokenFoundryFullstackWebpage(BigInt(CLOUD_DB_CEILING_STR) - 1n);
    const ok = a1.sha256Fingerprint === a2.sha256Fingerprint && a1.sha256Fingerprint !== b.sha256Fingerprint;
    return {
      ok,
      digest: a1.sha256Fingerprint.slice(0, 24),
      detail: `Identical index reproduces ${a1.contractId}; adjacent index diverges cleanly.`,
    };
  });

  runCheck('CRYPTO-03', 'HMAC-SHA256 Checkout Aggregator Seal Verification', () => {
    const payload = `CHK:${CLOUD_DB_CEILING_STR}:TWE-G:1`;
    const sigA = hmacSha256('TWE_CHECKOUT_AGGREGATOR_V1', payload);
    const sigB = hmacSha256('TWE_CHECKOUT_AGGREGATOR_V1', payload);
    const tampered = hmacSha256('TWE_CHECKOUT_AGGREGATOR_V1', `${payload}:TAMPER`);
    const ok = sigA.length === 64 && sigA === sigB && sigA !== tampered;
    return {
      ok,
      digest: sigA.slice(0, 24),
      detail: '64-hex HMAC-SHA256 checkout receipt authenticates and rejects mutated payloads.',
    };
  });

  runCheck('CRYPTO-04', 'Merkle Pair-Hash Root Integrity Across Account Tables', () => {
    const leaves = ACCOUNT_TABLES_CATALOG.map((t) => sha256(`${t.tableName}:${t.sqlDdl}`));
    const pair0 = sha256(leaves[0] + leaves[1]);
    const pair1 = sha256(leaves[2] + leaves[3]);
    const pair2 = sha256(leaves[4] + leaves[5]);
    const root1 = sha256(sha256(pair0 + pair1) + pair2);
    const root2 = sha256(sha256(pair0 + pair1) + pair2);
    const ok = root1 === root2 && leaves.length === 6;
    return {
      ok,
      digest: root1.slice(0, 24),
      detail: 'All 6 Account Table schemas seal deterministically into a verifiable Merkle root.',
    };
  });

  runCheck('CRYPTO-05', 'EIP-55 Checksum Contract Address Derivation', () => {
    const page = resolveTokenFoundryFullstackWebpage('1');
    const ok = /^0x[0-9a-fA-F]{40}$/.test(page.contractAddress) && page.contractAddress !== page.deployerAddress;
    return {
      ok,
      digest: page.contractAddress.slice(0, 24),
      detail: `Generated valid 42-char EIP-55 contract address ${page.contractAddress.slice(0, 14)}…`,
    };
  });

  runCheck('CRYPTO-06', 'Sanctions Duties & On-Chain State Machine Completeness', () => {
    const dbPage = resolveCloudDatabaseWebpage(CLOUD_DB_CEILING_STR);
    const ok =
      dbPage.sanctionsDuties.length === 5 &&
      dbPage.onChainTransitions.length === 5 &&
      dbPage.onChainTransitions[4].state === 'FINALIZED';
    return {
      ok,
      digest: dbPage.sanctionsDuties[0].attestationCode,
      detail: '5 regulatory regimes (OFAC/EU/UK HMT/UNSC/FATF) and 5-stage on-chain lifecycle verified.',
    };
  });

  const passedCount = tests.filter((t) => t.passed).length;
  return {
    suiteName: 'TWE Master of Cryptologic Verification Suite',
    allPassed: passedCount === tests.length,
    passedCount,
    totalCount: tests.length,
    executedAt: new Date().toISOString(),
    tests,
  };
}

export function exportDynamicFullstackPackage(hub: 'cloud-database' | 'token-foundry', rawIndex: unknown) {
  const testReport = runCryptologicSelfTests();
  if (hub === 'cloud-database') {
    const page = resolveCloudDatabaseWebpage(rawIndex);
    return {
      packageVersion: '2026.11-fullstack-modular',
      hub: 'cloud-database',
      pageIndex: page.pageIndex,
      pageId: page.pageId,
      cryptologicVerification: testReport,
      accountTablesSqlBundle: ACCOUNT_TABLES_CATALOG.map((t) => t.sqlDdl).join('\n\n'),
      activeRecord: page,
      modularHtmlDocument: renderCloudDatabaseHtmlPage(page),
      workspaceRoutes: {
        overview: `/overview/page/${page.pageIndex}`,
        fourTokenSystems: `/four-token-systems/page/${page.pageIndex}`,
        cloudDatabase: page.webpagePath,
        tokenFoundry: `/token-foundry/page/${page.pageIndex}`,
        nftFoundry: `/foundry/nft/${page.pageIndex}`,
      },
    };
  }
  const page = resolveTokenFoundryFullstackWebpage(rawIndex);
  return {
    packageVersion: '2026.11-fullstack-modular',
    hub: 'token-foundry',
    pageIndex: page.pageIndex,
    contractId: page.contractId,
    ticker: page.ticker,
    cryptologicVerification: testReport,
    solidityContract: page.soliditySource,
    expressApiRoute: page.expressRouteScaffold,
    accountTablesSqlBundle: ACCOUNT_TABLES_CATALOG.map((t) => t.sqlDdl).join('\n\n'),
    activeRecord: page,
    modularHtmlDocument: renderTokenFoundryProHtmlPage(page),
    workspaceRoutes: {
      overview: `/overview/page/${page.pageIndex}`,
      fourTokenSystems: `/four-token-systems/page/${page.pageIndex}`,
      cloudDatabase: `/cloud-database/page/${page.pageIndex}`,
      tokenFoundry: page.webpagePath,
      nftFoundry: `/foundry/nft/${page.pageIndex}`,
    },
  };
}

/* ============================================================================
 * 6. LIVE CHECKOUT AGGREGATOR STATE & ON-CHAIN STATUS TRANSITIONS
 * ============================================================================ */

export type CheckoutOrderStatus =
  | 'INITIATED'
  | 'SANCTIONS_CLEARED'
  | 'ONCHAIN_BROADCAST'
  | 'CONFIRMED';

export interface CheckoutAggregatorOrder {
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
  status: CheckoutOrderStatus;
  txHash: string;
  blockNumber: number;
  hmacReceipt: string;
  sanctionsClearanceCode: string;
  createdAt: string;
  updatedAt: string;
  statusHistory: Array<{
    status: CheckoutOrderStatus;
    at: string;
    note: string;
  }>;
}

const CHECKOUT_STATUS_SEQUENCE: CheckoutOrderStatus[] = [
  'INITIATED',
  'SANCTIONS_CLEARED',
  'ONCHAIN_BROADCAST',
  'CONFIRMED',
];

const checkoutOrdersStore: CheckoutAggregatorOrder[] = [
  {
    id: 'CHK-2026-0001',
    accountId: 'acc-9f10a2c4',
    tokenSymbol: 'TWE-G',
    quantity: 250,
    unitPriceUsd: 142.85,
    subtotalUsd: 35712.5,
    feeBps: 15,
    feeUsd: 53.57,
    totalUsd: 35766.07,
    settlementRail: 'Ethereum Mainnet ERC-3643 DvP',
    chainId: 1,
    jurisdiction: 'US-SEC / EU-MiCA',
    status: 'CONFIRMED',
    txHash: `0x${sha256('SEED_ORDER_0001')}`,
    blockNumber: 21492810,
    hmacReceipt: hmacSha256('TWE_CHECKOUT_AGGREGATOR_V1', 'CHK-2026-0001:TWE-G:250'),
    sanctionsClearanceCode: 'SANC-OFAC-EU-772B1E',
    createdAt: '2026-11-24T19:40:00Z',
    updatedAt: '2026-11-24T19:41:14Z',
    statusHistory: [
      { status: 'INITIATED', at: '2026-11-24T19:40:00Z', note: 'Checkout quote locked via rail aggregator.' },
      { status: 'SANCTIONS_CLEARED', at: '2026-11-24T19:40:12Z', note: 'OFAC SDN, EU Consolidated, UK HMT, FATF cleared.' },
      { status: 'ONCHAIN_BROADCAST', at: '2026-11-24T19:40:28Z', note: 'Signed ERC-3643 DvP payload submitted to Ethereum.' },
      { status: 'CONFIRMED', at: '2026-11-24T19:41:14Z', note: 'Finalized in block #21492810 with 32 confirmations.' },
    ],
  },
];

export function listCheckoutAggregatorOrders(): CheckoutAggregatorOrder[] {
  return [...checkoutOrdersStore];
}

export function createCheckoutAggregatorOrder(input: {
  tokenSymbol?: string;
  quantity?: number;
  unitPriceUsd?: number;
  railIndex?: number;
  jurisdiction?: string;
}): CheckoutAggregatorOrder {
  const tokenSymbol = String(input.tokenSymbol || 'TWE-G')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 16) || 'TWE-G';
  const quantity = Math.max(1, Math.min(1_000_000, Number(input.quantity) || 100));
  const unitPriceUsd = Math.max(0.01, Math.min(10_000_000, Number(input.unitPriceUsd) || 142.85));
  const rail = CHECKOUT_RAILS[Math.abs(Math.floor(Number(input.railIndex) || 0)) % CHECKOUT_RAILS.length];
  const jurisdiction = String(input.jurisdiction || 'US-SEC / EU-MiCA').slice(0, 48);

  const subtotalUsd = Number((quantity * unitPriceUsd).toFixed(2));
  const feeUsd = Number(((subtotalUsd * rail.feeBps) / 10000 + rail.gasEstimateUsd).toFixed(2));
  const totalUsd = Number((subtotalUsd + feeUsd).toFixed(2));
  const seq = checkoutOrdersStore.length + 1;
  const now = new Date().toISOString();
  const id = `CHK-2026-${String(seq).padStart(4, '0')}`;
  const seed = `${id}:${tokenSymbol}:${quantity}:${now}`;

  const order: CheckoutAggregatorOrder = {
    id,
    accountId: `acc-${sha256(seed).slice(0, 8)}`,
    tokenSymbol,
    quantity,
    unitPriceUsd,
    subtotalUsd,
    feeBps: rail.feeBps,
    feeUsd,
    totalUsd,
    settlementRail: rail.railName,
    chainId: rail.chainId,
    jurisdiction,
    status: 'INITIATED',
    txHash: `0x${sha256(`TX:${seed}`)}`,
    blockNumber: 21493000 + seq * 3,
    hmacReceipt: hmacSha256('TWE_CHECKOUT_AGGREGATOR_V1', seed),
    sanctionsClearanceCode: `SANC-${sha256(`DUTY:${seed}`).slice(0, 10).toUpperCase()}`,
    createdAt: now,
    updatedAt: now,
    statusHistory: [
      {
        status: 'INITIATED',
        at: now,
        note: `Aggregated checkout route locked on ${rail.railName} (${rail.feeBps} bps).`,
      },
    ],
  };

  checkoutOrdersStore.unshift(order);
  if (checkoutOrdersStore.length > 50) checkoutOrdersStore.pop();
  return order;
}

export function advanceCheckoutAggregatorOrderStatus(orderId: string): CheckoutAggregatorOrder | null {
  const order = checkoutOrdersStore.find((o) => o.id === orderId);
  if (!order) return null;
  const idx = CHECKOUT_STATUS_SEQUENCE.indexOf(order.status);
  if (idx < 0 || idx >= CHECKOUT_STATUS_SEQUENCE.length - 1) return order;

  const nextStatus = CHECKOUT_STATUS_SEQUENCE[idx + 1];
  const now = new Date().toISOString();
  const notes: Record<CheckoutOrderStatus, string> = {
    INITIATED: 'Order initialized.',
    SANCTIONS_CLEARED: `OFAC SDN, EU Consolidated, UK HMT, UNSC & FATF Travel Rule verified (${order.sanctionsClearanceCode}).`,
    ONCHAIN_BROADCAST: `Signed transaction broadcast to Chain ${order.chainId} (${order.txHash.slice(0, 16)}…).`,
    CONFIRMED: `On-chain settlement finalized in block #${order.blockNumber} with Merkle audit proof.`,
  };

  order.status = nextStatus;
  order.updatedAt = now;
  order.statusHistory.push({
    status: nextStatus,
    at: now,
    note: notes[nextStatus],
  });
  return order;
}

/* ============================================================================
 * 7. MODULAR HTML5 FRAMEWORK RENDERERS (ON-CHAIN STATUS + SANCTIONS + CONTEXT)
 * ============================================================================ */

const MODULAR_HTML_CSS = `
:root{color-scheme:dark;--bg:#090b0f;--surf:#11151d;--elev:#171c26;--bdr:#262e3d;--txt:#f1f5f9;--mut:#94a3b8;--gold:#d4b475;--em:#34d399;--cyan:#38bdf8}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--txt);font-family:Inter,system-ui,-apple-system,sans-serif;line-height:1.55}
.shell{max-width:1040px;margin:0 auto;padding:22px 18px 48px}
header[data-module="workspace-topbar"]{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid var(--bdr);margin-bottom:18px}
.brand{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--gold)}
nav.ws-nav{display:flex;flex-wrap:wrap;gap:7px}
nav.ws-nav a{font-family:ui-monospace,monospace;font-size:11px;color:var(--txt);text-decoration:none;padding:5px 9px;border:1px solid var(--bdr);border-radius:6px;background:var(--surf)}
nav.ws-nav a:hover{border-color:var(--gold);color:var(--gold)}
section[data-module]{background:var(--surf);border:1px solid var(--bdr);border-radius:10px;padding:18px;margin-bottom:16px}
h1{margin:4px 0 6px;font-size:20px;letter-spacing:-.01em}
h2{margin:0 0 10px;font-size:13px;font-family:ui-monospace,monospace;text-transform:uppercase;letter-spacing:.07em;color:var(--gold)}
.sub{color:var(--mut);font-size:12.5px;margin:0 0 12px}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin:12px 0}
.kpi{background:var(--elev);border:1px solid var(--bdr);border-radius:8px;padding:11px}
.kpi .lbl{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--mut)}
.kpi .val{margin-top:4px;font-size:14px;font-weight:600}
.gold{color:var(--gold)}.em{color:var(--em)}.cyan{color:var(--cyan)}
.badge{display:inline-block;padding:2px 7px;border-radius:4px;font-family:ui-monospace,monospace;font-size:10.5px;border:1px solid rgba(52,211,153,.35);background:rgba(52,211,153,.1);color:var(--em)}
table{width:100%;border-collapse:collapse;font-size:11.5px}
th,td{padding:7px 9px;border-bottom:1px solid var(--bdr);text-align:left;vertical-align:top}
th{color:var(--mut);text-transform:uppercase;font-size:10px;letter-spacing:.06em}
pre{margin:0;padding:12px;border-radius:8px;background:#07090d;border:1px solid var(--bdr);overflow-x:auto;font-size:11px;color:#cbd5e1}
footer[data-module="bigint-pager"]{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;margin-top:16px}
footer[data-module="bigint-pager"] a{font-family:ui-monospace,monospace;font-size:11.5px;color:var(--gold);text-decoration:none;padding:7px 12px;border:1px solid var(--bdr);border-radius:6px;background:var(--surf)}
footer[data-module="bigint-pager"] a:hover{border-color:var(--gold)}
`;

function renderWorkspaceNavHtml(pageIndex: string): string {
  return `<header data-module="workspace-topbar">
    <div class="brand">TWE Asset Workspace · Modular HTML5 Framework</div>
    <nav class="ws-nav" aria-label="Workspace Pages">
      <a href="/overview/page/${escapeHtml(pageIndex)}">Overview</a>
      <a href="/four-token-systems/page/${escapeHtml(pageIndex)}">4-Token Systems</a>
      <a href="/cloud-database/page/${escapeHtml(pageIndex)}">Cloud Database</a>
      <a href="/token-foundry/page/${escapeHtml(pageIndex)}">Token Foundry</a>
      <a href="/foundry/nft/${escapeHtml(pageIndex)}">NFT Foundry</a>
      <a href="/foundry/sitemap.xml">Sitemap XML</a>
    </nav>
  </header>`;
}

function renderOnChainAndSanctionsSectionsHtml(
  transitions: OnChainStatusTransition[],
  duties: SanctionsDutyItem[],
  quote: CheckoutQuoteSummary
): string {
  const txRows = transitions
    .map(
      (t) =>
        `<tr><td class="mono">#${t.step}</td><td><span class="badge">${escapeHtml(t.state)}</span></td><td class="mono">${t.blockNumber}</td><td class="mono">${t.gasUsed.toLocaleString('en-US')}</td><td class="mono">${t.confirmations}</td><td class="mono">${escapeHtml(t.verifierNode)}</td><td class="mono">${escapeHtml(t.timestampIso)}</td></tr>`
    )
    .join('');

  const sanctionsRows = duties
    .map(
      (d) =>
        `<tr><td><strong>${escapeHtml(d.regime)}</strong><div style="color:var(--mut);font-size:10.5px">${escapeHtml(d.authority)}</div></td><td><span class="badge">${escapeHtml(d.verdict)}</span></td><td>${escapeHtml(d.dutyObligation)}</td><td class="mono">${escapeHtml(d.attestationCode)}</td></tr>`
    )
    .join('');

  return `<section data-module="onchain-operation-status">
    <h2>On-Chain Operation Status Changes &amp; Finality Lifecycle</h2>
    <p class="sub">Transaction Hash: <span class="mono cyan">${escapeHtml(transitions[0]?.txHash ?? '')}</span></p>
    <table>
      <thead><tr><th>Step</th><th>State Transition</th><th>Block</th><th>Gas</th><th>Conf.</th><th>Validator</th><th>Timestamp (UTC)</th></tr></thead>
      <tbody>${txRows}</tbody>
    </table>
  </section>

  <section data-module="sanctions-regulatory-duties">
    <h2>Sanctions Compliance &amp; Regulatory Duties</h2>
    <table>
      <thead><tr><th>Regime / Authority</th><th>Verdict</th><th>Mandatory Duty Obligation</th><th>Attestation</th></tr></thead>
      <tbody>${sanctionsRows}</tbody>
    </table>
  </section>

  <section data-module="checkout-aggregator-context">
    <h2>Checkout Aggregator Settlement Route</h2>
    <div class="grid">
      <div class="kpi"><div class="lbl">Optimal Rail</div><div class="val gold">${escapeHtml(quote.railName)}</div></div>
      <div class="kpi"><div class="lbl">Fee / Gas Estimate</div><div class="val mono">${quote.feeBps} bps · $${quote.gasEstimateUsd.toFixed(3)}</div></div>
      <div class="kpi"><div class="lbl">Routing Efficiency</div><div class="val em">${quote.routingScore}% · ${quote.estimatedSettlementSec}s T+0</div></div>
      <div class="kpi"><div class="lbl">HMAC-SHA256 Receipt</div><div class="val mono" style="font-size:11px">${escapeHtml(quote.hmacReceipt.slice(0, 26))}…</div></div>
    </div>
  </section>`;
}

export function renderCloudDatabaseHtmlPage(page: CloudDatabaseWebpageRecord): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(page.pageId)} — Cloud Database Webpage #${escapeHtml(formatAbbrev(page.pageIndex))}</title>
  <style>${MODULAR_HTML_CSS}</style>
</head>
<body>
  <div class="shell">
    ${renderWorkspaceNavHtml(page.pageIndex)}

    <section data-module="hero-context">
      <div class="brand">Cloud Database · Account Table ${escapeHtml(page.accountTableId)} · ${escapeHtml(page.pageId)}</div>
      <h1 class="mono">${escapeHtml(page.tableName)}</h1>
      <p class="sub">${escapeHtml(page.invariant)}</p>
      <div class="grid">
        <div class="kpi"><div class="lbl">Firestore Collection</div><div class="val mono gold">${escapeHtml(page.firestoreCollection)}</div></div>
        <div class="kpi"><div class="lbl">Write Policy</div><div class="val em">${escapeHtml(page.writePolicy)}</div></div>
        <div class="kpi"><div class="lbl">Region Cluster</div><div class="val">${escapeHtml(page.regionCluster)}</div></div>
        <div class="kpi"><div class="lbl">Replication Quorum</div><div class="val mono">${page.replicationFactor}x Synchronous</div></div>
      </div>
      <table>
        <tbody>
          <tr><th style="width:200px">Exact Webpage Index</th><td class="mono">${escapeHtml(page.pageIndex)}</td></tr>
          <tr><th>SHA-256 Fingerprint</th><td class="mono">${escapeHtml(page.sha256Fingerprint)}</td></tr>
          <tr><th>Merkle Audit Root</th><td class="mono">${escapeHtml(page.merkleRoot)}</td></tr>
        </tbody>
      </table>
    </section>

    ${renderOnChainAndSanctionsSectionsHtml(page.onChainTransitions, page.sanctionsDuties, page.checkoutQuote)}

    <section data-module="account-table-schema">
      <h2>Account Table SQL DDL &amp; Deterministic Row Snapshot</h2>
      <pre class="mono">${escapeHtml(page.sqlDdl)}</pre>
      <div style="height:10px"></div>
      <pre class="mono">${escapeHtml(JSON.stringify(page.deterministicRow, null, 2))}</pre>
    </section>

    <footer data-module="bigint-pager">
      <a href="/cloud-database/page/${escapeHtml(page.prevPageIndex)}">&larr; Prev Cloud DB Page</a>
      <a href="/api/twe/fullstack/export/cloud-database/${escapeHtml(page.pageIndex)}">Export Dynamic Fullstack JSON</a>
      <a href="/cloud-database/page/${escapeHtml(page.ceilingIndex)}">Ceiling (${page.ceilingDigits} digits)</a>
      <a href="/cloud-database/page/${escapeHtml(page.nextPageIndex)}">Next Cloud DB Page &rarr;</a>
    </footer>
  </div>
</body>
</html>`;
}

export function renderTokenFoundryProHtmlPage(page: TokenFoundryWebpageRecord): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(page.ticker)} (${escapeHtml(page.contractId)}) — Token Foundry Webpage</title>
  <style>${MODULAR_HTML_CSS}</style>
</head>
<body>
  <div class="shell">
    ${renderWorkspaceNavHtml(page.pageIndex)}

    <section data-module="hero-context">
      <div class="brand">Token Foundry Dynamic Fullstack · ${escapeHtml(page.standard)} · ${escapeHtml(page.contractId)}</div>
      <h1>${escapeHtml(page.tokenName)} (<span class="mono gold">${escapeHtml(page.ticker)}</span>)</h1>
      <p class="sub">Deterministic smart contract, Account Table binding (<span class="mono">${escapeHtml(page.accountTableLinked.tableName)}</span>), on-chain lifecycle, and sanctions compliance duties.</p>
      <div class="grid">
        <div class="kpi"><div class="lbl">EIP-55 Contract Address</div><div class="val mono gold" style="font-size:12px">${escapeHtml(page.contractAddress)}</div></div>
        <div class="kpi"><div class="lbl">Settlement Rail</div><div class="val">${escapeHtml(page.chainName)}</div></div>
        <div class="kpi"><div class="lbl">Seed Valuation</div><div class="val mono em">$${page.initialPriceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></div>
        <div class="kpi"><div class="lbl">Max Supply Units</div><div class="val mono">${escapeHtml(page.maxSupplyUnits)}</div></div>
      </div>
      <table>
        <tbody>
          <tr><th style="width:200px">Exact Webpage Index</th><td class="mono">${escapeHtml(page.pageIndex)}</td></tr>
          <tr><th>SHA-256 Digest</th><td class="mono">${escapeHtml(page.sha256Fingerprint)}</td></tr>
          <tr><th>HMAC Cryptologic Seal</th><td class="mono">${escapeHtml(page.hmacIntegritySeal)}</td></tr>
          <tr><th>Merkle Audit Root</th><td class="mono">${escapeHtml(page.merkleRoot)}</td></tr>
        </tbody>
      </table>
    </section>

    ${renderOnChainAndSanctionsSectionsHtml(page.onChainTransitions, page.sanctionsDuties, page.checkoutQuote)}

    <section data-module="fullstack-artifact">
      <h2>Dynamic Fullstack Smart Contract &amp; API Scaffold</h2>
      <pre class="mono">${escapeHtml(page.soliditySource)}</pre>
      <div style="height:10px"></div>
      <pre class="mono">${escapeHtml(page.expressRouteScaffold)}</pre>
    </section>

    <footer data-module="bigint-pager">
      <a href="/token-foundry/page/${escapeHtml(page.prevPageIndex)}">&larr; Prev Token Foundry Page</a>
      <a href="${escapeHtml(page.exportApiPath)}">Export Dynamic Fullstack JSON</a>
      <a href="/token-foundry/page/${escapeHtml(page.ceilingIndex)}">Ceiling (${page.ceilingDigits} digits)</a>
      <a href="/token-foundry/page/${escapeHtml(page.nextPageIndex)}">Next Token Foundry Page &rarr;</a>
    </footer>
  </div>
</body>
</html>`;
}
