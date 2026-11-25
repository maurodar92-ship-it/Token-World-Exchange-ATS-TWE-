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

const MAX_WEBPAGE_DIGITS = 2048;

// Exact user-requested arbitrary-precision Overview Webpages ceiling (superscripts normalized, apostrophe stripped)
const RAW_OVERVIEW_CEILING =
  "999999999999999999999999999999999999999999999999999999999999999999999999999⁹99999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999⁹99⁹999999999999⁹9999999999999999999999999999999999999999999⁹99999999999999999999999999999999999999999999999999999999999999999999999999⁹999999999999999999999999999999999999⁹99999⁹99999999999999999999999999999999999999999⁹99999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999⁹99999999999999999999999999999999999⁹999999999909999999999999999999999999999999999999999999999999999999999999999999999999999'99999";

// Exact user-requested arbitrary-precision 4-Token Systems Webpages ceiling (superscripts normalized)
const RAW_FOUR_TOKEN_SYSTEMS_CEILING =
  '999999999999999999999999999999999999999999999999999999999999999999999999999⁹99999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999⁹99⁹999999999999⁹9999999999999999999999999999999999999999999⁹99999999999999999999999999999999999999999999999999999999999999999999999999⁹999999999999999999999999999999999999⁹99999⁹99999999999999999999999999999999999999999⁹99999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999⁹99999999999999999999999999999999999⁹999999999909999999999999';

export function normalizeHubBigIntDigits(raw: unknown): string {
  const ascii = String(raw ?? '')
    .trim()
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (ch) => SUPERSCRIPT_DIGIT_MAP[ch] ?? '');
  return ascii.replace(/[^0-9]/g, '').slice(0, MAX_WEBPAGE_DIGITS);
}

export const OVERVIEW_CEILING_STR = normalizeHubBigIntDigits(RAW_OVERVIEW_CEILING);
export const OVERVIEW_CEILING = BigInt(OVERVIEW_CEILING_STR);
export const OVERVIEW_CEILING_DIGITS = OVERVIEW_CEILING_STR.length;

export const FOUR_TOKEN_SYSTEMS_CEILING_STR = normalizeHubBigIntDigits(RAW_FOUR_TOKEN_SYSTEMS_CEILING);
export const FOUR_TOKEN_SYSTEMS_CEILING = BigInt(FOUR_TOKEN_SYSTEMS_CEILING_STR);
export const FOUR_TOKEN_SYSTEMS_CEILING_DIGITS = FOUR_TOKEN_SYSTEMS_CEILING_STR.length;

export function parseHubBigIntIndex(raw: unknown, fallback = 1n): bigint {
  const digits = normalizeHubBigIntDigits(raw);
  if (!digits) return fallback;
  const parsed = BigInt(digits);
  return parsed < 1n ? 1n : parsed;
}

function sha256Hex(seed: string): string {
  return crypto.createHash('sha256').update(seed).digest('hex');
}

function readUInt32(hex: string, offsetBytes: number): number {
  const start = (offsetBytes % 28) * 2;
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

function formatBigIntAbbrev(numStr: string): string {
  if (numStr.length <= 18) {
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  return `${numStr.slice(0, 8)}…${numStr.slice(-8)} (${numStr.length} digits)`;
}

function formatScientific(numStr: string): string {
  if (numStr.length <= 6) return numStr;
  const exp = numStr.length - 1;
  return `${numStr[0]}.${numStr.slice(1, 3)} × 10^${exp}`;
}

/* ============================================================================
 * 1. OVERVIEW HYPER-SCALE WEBPAGES
 * ============================================================================ */

export type OverviewDomainId =
  | 'executive-nav'
  | 'ats-markets'
  | 'sovereign-vault'
  | 'custody-clearing'
  | 'token-atlas'
  | 'foundry-fabric';

export interface OverviewDomainMeta {
  id: OverviewDomainId;
  label: string;
  settlementRail: string;
  jurisdiction: string;
  complianceTier: string;
}

export const OVERVIEW_DOMAINS: OverviewDomainMeta[] = [
  {
    id: 'executive-nav',
    label: 'Executive NAV & Liquidity',
    settlementRail: 'TWE DvP Atomic Clearing',
    jurisdiction: 'US-SEC / EU-MiCA',
    complianceTier: 'Reg D 506(c) / QIB',
  },
  {
    id: 'ats-markets',
    label: 'ATS Orderbook & Execution',
    settlementRail: 'FIX 4.4 / SSE Match Engine',
    jurisdiction: 'FINRA ATS-N',
    complianceTier: 'Institutional Tier I',
  },
  {
    id: 'sovereign-vault',
    label: 'Sovereign Vault Custody',
    settlementRail: 'uint256 Tranche Escrow',
    jurisdiction: 'US / CH-FINMA',
    complianceTier: 'Multi-Sig 3-of-5 HSM',
  },
  {
    id: 'custody-clearing',
    label: 'Settlement & Clearing Rail',
    settlementRail: 'EIP-155 / ISO-20022 Bridge',
    jurisdiction: 'UK-FCA / MAS',
    complianceTier: 'T+0 Continuous Netting',
  },
  {
    id: 'token-atlas',
    label: 'Token Atlas Registry',
    settlementRail: 'ERC-3643 / SPL-2022 Indexer',
    jurisdiction: 'Global Multi-Chain',
    complianceTier: 'Merkle Verified',
  },
  {
    id: 'foundry-fabric',
    label: 'Token & NFT Foundry Fabric',
    settlementRail: 'Deterministic SHA-256 Mint',
    jurisdiction: 'IPFS CIDv1 / On-Chain',
    complianceTier: 'Immutable Snapshot',
  },
];

export interface OverviewWebpageRecord {
  pageIndex: string;
  pageId: string;
  title: string;
  domainId: OverviewDomainId;
  domainLabel: string;
  settlementRail: string;
  jurisdiction: string;
  complianceTier: string;
  sovereignNavUsd: number;
  paperCashUsd: number;
  activeInstrumentsCount: number;
  settledVolume24hUsd: number;
  avgLatencyMs: number;
  wilderRsiComposite: number;
  vaultEpochBlock: string;
  vaultUuid: string;
  nodeFingerprint: string;
  merkleAuditRoot: string;
  webpagePath: string;
  prevPageIndex: string;
  nextPageIndex: string;
  ceilingIndex: string;
  ceilingDigits: number;
  highlights: Array<{ metric: string; value: string; status: string }>;
}

export interface OverviewWebpageRangeResponse {
  startIndex: string;
  limit: number;
  prevStartIndex: string;
  nextStartIndex: string;
  ceilingIndex: string;
  ceilingDigits: number;
  scientificCeiling: string;
  maxSupportedDigits: number;
  activeDomain: string;
  domains: OverviewDomainMeta[];
  items: OverviewWebpageRecord[];
}

const OVERVIEW_TITLE_PREFIXES = [
  'Sovereign Executive Brief',
  'Institutional Liquidity Snapshot',
  'ATS Market Telemetry Dossier',
  'Custody & Clearing Verification',
  'Cross-Venue NAV Reconciliation',
  'Capital Adequacy & Risk Ledger',
  'Multi-Chain Treasury Dispatch',
  'Governance & Compliance Checkpoint',
];

export function resolveOverviewWebpage(
  rawIndex: unknown,
  preferredDomainId?: string
): OverviewWebpageRecord {
  const idx = parseHubBigIntIndex(rawIndex, 1n);
  const pageIndex = idx.toString();
  const h1 = sha256Hex(`TWE_OVERVIEW_WEBPAGE_V1:${pageIndex}`);
  const h2 = sha256Hex(`TWE_OVERVIEW_AUDIT_V1:${pageIndex}:${h1}`);

  const matchedDomain = OVERVIEW_DOMAINS.find((d) => d.id === preferredDomainId);
  const domain = matchedDomain ?? OVERVIEW_DOMAINS[readUInt32(h1, 0) % OVERVIEW_DOMAINS.length];

  const titlePrefix = OVERVIEW_TITLE_PREFIXES[readUInt32(h1, 4) % OVERVIEW_TITLE_PREFIXES.length];
  const shortTag = h1.slice(0, 8).toUpperCase();
  const pageId = `TWE-OVW-${shortTag}`;

  const baseNav = 14_850_000 + (readUInt32(h1, 8) % 85_000_000) + ((readUInt32(h1, 12) % 99) / 100);
  const paperCashUsd = Number((baseNav * (0.14 + ((readUInt32(h1, 16) % 24) / 100))).toFixed(2));
  const settledVolume24hUsd = Number((2_400_000 + (readUInt32(h2, 0) % 44_000_000)).toFixed(2));
  const activeInstrumentsCount = 24 + (readUInt32(h2, 4) % 96);
  const avgLatencyMs = Number((1.4 + ((readUInt32(h2, 8) % 185) / 10)).toFixed(1));
  const wilderRsiComposite = Number((28 + ((readUInt32(h2, 12) % 480) / 10)).toFixed(1));
  const vaultEpochBlock = `BLK-${(21_000_000n + (idx % 9_000_000_000n)).toString()}`;

  const prevPageIndex = idx > 1n ? (idx - 1n).toString() : '1';
  const nextPageIndex = (idx + 1n).toString();

  const rsiState =
    wilderRsiComposite >= 68
      ? 'Overbought Guard'
      : wilderRsiComposite <= 34
        ? 'Oversold Watch'
        : 'Balanced Regime';

  return {
    pageIndex,
    pageId,
    title: `${titlePrefix} · Node ${shortTag}`,
    domainId: domain.id,
    domainLabel: domain.label,
    settlementRail: domain.settlementRail,
    jurisdiction: domain.jurisdiction,
    complianceTier: domain.complianceTier,
    sovereignNavUsd: Number(baseNav.toFixed(2)),
    paperCashUsd,
    activeInstrumentsCount,
    settledVolume24hUsd,
    avgLatencyMs,
    wilderRsiComposite,
    vaultEpochBlock,
    vaultUuid: 'af230af8-bf63-4308-968a-9962ed14e565',
    nodeFingerprint: h1,
    merkleAuditRoot: `0x${h2}`,
    webpagePath: `/overview/page/${pageIndex}${matchedDomain ? `?domain=${encodeURIComponent(matchedDomain.id)}` : ''}`,
    prevPageIndex,
    nextPageIndex,
    ceilingIndex: OVERVIEW_CEILING_STR,
    ceilingDigits: OVERVIEW_CEILING_DIGITS,
    highlights: [
      { metric: 'Portfolio NAV Snapshot', value: `$${Number(baseNav.toFixed(2)).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, status: 'Verified' },
      { metric: '24h Settled Volume', value: `$${settledVolume24hUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, status: 'T+0 Netted' },
      { metric: 'Wilder RSI(14) Composite', value: `${wilderRsiComposite.toFixed(1)}`, status: rsiState },
      { metric: 'Order Match Latency', value: `${avgLatencyMs.toFixed(1)} ms`, status: 'SLA Optimal' },
      { metric: 'Vault Tranche Ceiling', value: '2^256 - 1 uint256', status: 'Locked' },
    ],
  };
}

export function resolveOverviewWebpageRange(
  startRaw: unknown,
  limitRaw = 10,
  domainFilter?: string
): OverviewWebpageRangeResponse {
  const start = parseHubBigIntIndex(startRaw, 1n);
  const limit = Math.max(1, Math.min(25, Math.floor(Number(limitRaw) || 10)));
  const normalizedDomain =
    domainFilter && OVERVIEW_DOMAINS.some((d) => d.id === domainFilter) ? domainFilter : 'ALL';

  const items: OverviewWebpageRecord[] = [];
  for (let i = 0; i < limit; i++) {
    items.push(
      resolveOverviewWebpage(
        start + BigInt(i),
        normalizedDomain === 'ALL' ? undefined : normalizedDomain
      )
    );
  }

  const prevStart = start > BigInt(limit) ? start - BigInt(limit) : 1n;
  const nextStart = start + BigInt(limit);

  return {
    startIndex: start.toString(),
    limit,
    prevStartIndex: prevStart.toString(),
    nextStartIndex: nextStart.toString(),
    ceilingIndex: OVERVIEW_CEILING_STR,
    ceilingDigits: OVERVIEW_CEILING_DIGITS,
    scientificCeiling: formatScientific(OVERVIEW_CEILING_STR),
    maxSupportedDigits: MAX_WEBPAGE_DIGITS,
    activeDomain: normalizedDomain,
    domains: OVERVIEW_DOMAINS,
    items,
  };
}

/* ============================================================================
 * 2. 4-TOKEN SYSTEMS HYPER-SCALE WEBPAGES (22 MODULAR MONOLITH TABLES)
 * ============================================================================ */

export type FourTokenSystemId =
  | 'ai-generation-batches'
  | 'auth-session-tokens'
  | 'digital-assets'
  | 'application-credits';

export interface DomainTableBlueprint {
  id: string;
  tableName: string;
  systemId: FourTokenSystemId;
  systemLabel: string;
  writeMode: 'Mutable Indexed' | 'Append-Only' | 'Immutable Snapshot';
  primaryKey: string;
  columns: string[];
  invariant: string;
}

export const FOUR_TOKEN_SYSTEM_SPECS: Array<{
  id: FourTokenSystemId;
  label: string;
  tableCount: number;
}> = [
  { id: 'ai-generation-batches', label: 'System I · AI Generation Batches', tableCount: 5 },
  { id: 'auth-session-tokens', label: 'System II · Auth & Session Tokens', tableCount: 5 },
  { id: 'digital-assets', label: 'System III · Digital Assets', tableCount: 7 },
  { id: 'application-credits', label: 'System IV · Append-Only Credits', tableCount: 5 },
];

export const TWENTY_TWO_DOMAIN_TABLES: DomainTableBlueprint[] = [
  // System I (5)
  { id: 't-01', tableName: 'ai_generation_batches', systemId: 'ai-generation-batches', systemLabel: 'System I · AI Generation Batches', writeMode: 'Mutable Indexed', primaryKey: 'batch_id (UUID)', columns: ['batch_id', 'seed_hash', 'model_alias', 'concept_count', 'status', 'created_at'], invariant: 'Seed determinism guarantees reproducible concept generation up to 1,000 items/batch.' },
  { id: 't-02', tableName: 'ai_concept_prompts', systemId: 'ai-generation-batches', systemLabel: 'System I · AI Generation Batches', writeMode: 'Append-Only', primaryKey: 'prompt_id (UUID)', columns: ['prompt_id', 'batch_id', 'system_prompt', 'aspect_ratio', 'created_at'], invariant: 'Prompts are never mutated post-execution to preserve audit lineage.' },
  { id: 't-03', tableName: 'ai_rendered_outputs', systemId: 'ai-generation-batches', systemLabel: 'System I · AI Generation Batches', writeMode: 'Immutable Snapshot', primaryKey: 'output_id (UUID)', columns: ['output_id', 'prompt_id', 'sha256_digest', 'ipfs_cidv1', 'mime_type'], invariant: 'Every rendered artifact carries a verified Web Crypto SHA-256 digest.' },
  { id: 't-04', tableName: 'ai_trait_matrices', systemId: 'ai-generation-batches', systemLabel: 'System I · AI Generation Batches', writeMode: 'Mutable Indexed', primaryKey: 'matrix_id (UUID)', columns: ['matrix_id', 'collection_slug', 'layer_name', 'rarity_weights_json'], invariant: 'Layer rarity weights normalize strictly to 100.00% per collection.' },
  { id: 't-05', tableName: 'ai_batch_audit_logs', systemId: 'ai-generation-batches', systemLabel: 'System I · AI Generation Batches', writeMode: 'Append-Only', primaryKey: 'log_seq (BIGINT)', columns: ['log_seq', 'batch_id', 'actor_id', 'event_type', 'recorded_at'], invariant: 'Strict append-only sequence without UPDATE/DELETE privileges.' },
  // System II (5)
  { id: 't-06', tableName: 'auth_session_tokens', systemId: 'auth-session-tokens', systemLabel: 'System II · Auth & Session Tokens', writeMode: 'Mutable Indexed', primaryKey: 'jti (UUID)', columns: ['jti', 'subject_id', 'scope', 'issued_at', 'expires_at'], invariant: 'Short-lived bearer sessions expire after 900s unless refreshed via family.' },
  { id: 't-07', tableName: 'auth_refresh_families', systemId: 'auth-session-tokens', systemLabel: 'System II · Auth & Session Tokens', writeMode: 'Mutable Indexed', primaryKey: 'family_id (UUID)', columns: ['family_id', 'parent_jti', 'generation', 'compromised'], invariant: 'Refresh token reuse immediately invalidates the entire token family.' },
  { id: 't-08', tableName: 'auth_csrf_nonces', systemId: 'auth-session-tokens', systemLabel: 'System II · Auth & Session Tokens', writeMode: 'Mutable Indexed', primaryKey: 'nonce (CHAR 32)', columns: ['nonce', 'session_jti', 'consumed', 'ttl_expires'], invariant: 'Single-use cryptographic nonces prevent state-changing replay attacks.' },
  { id: 't-09', tableName: 'auth_api_keys', systemId: 'auth-session-tokens', systemLabel: 'System II · Auth & Session Tokens', writeMode: 'Mutable Indexed', primaryKey: 'key_id (UUID)', columns: ['key_id', 'prefix', 'sha256_secret', 'rate_limit_rpm', 'active'], invariant: 'Raw secret never persisted; only salted SHA-256 digest stored.' },
  { id: 't-10', tableName: 'auth_revocation_lists', systemId: 'auth-session-tokens', systemLabel: 'System II · Auth & Session Tokens', writeMode: 'Append-Only', primaryKey: 'revocation_id (UUID)', columns: ['revocation_id', 'jti_or_key', 'reason_code', 'revoked_at'], invariant: 'Checked prior to all privileged Sovereign Vault or batch mutations.' },
  // System III (7)
  { id: 't-11', tableName: 'digital_assets', systemId: 'digital-assets', systemLabel: 'System III · Digital Assets', writeMode: 'Mutable Indexed', primaryKey: 'asset_id (VARCHAR)', columns: ['asset_id', 'symbol', 'name', 'kind', 'chain', 'price_usd', 'rsi_14'], invariant: 'Canonical asset registry supporting server-side sorting & chunked pagination.' },
  { id: 't-12', tableName: 'asset_chain_deployments', systemId: 'digital-assets', systemLabel: 'System III · Digital Assets', writeMode: 'Mutable Indexed', primaryKey: 'deployment_id (UUID)', columns: ['deployment_id', 'asset_id', 'eip155_chain', 'contract_address', 'standard'], invariant: 'Contract addresses validated against EIP-55 checksum rules.' },
  { id: 't-13', tableName: 'asset_orderbooks', systemId: 'digital-assets', systemLabel: 'System III · Digital Assets', writeMode: 'Mutable Indexed', primaryKey: 'level_id (UUID)', columns: ['level_id', 'symbol', 'side', 'price_usd', 'size'], invariant: 'Best bid remains strictly below best ask in rested orderbook snapshots.' },
  { id: 't-14', tableName: 'asset_trade_executions', systemId: 'digital-assets', systemLabel: 'System III · Digital Assets', writeMode: 'Append-Only', primaryKey: 'trade_id (UUID)', columns: ['trade_id', 'order_id', 'symbol', 'side', 'qty', 'fill_price_usd', 'executed_at'], invariant: 'Every trade execution broadcasts an immutable SSE event to subscribers.' },
  { id: 't-15', tableName: 'asset_vault_custody', systemId: 'digital-assets', systemLabel: 'System III · Digital Assets', writeMode: 'Mutable Indexed', primaryKey: 'custody_id (UUID)', columns: ['custody_id', 'vault_uuid', 'asset_id', 'uint256_units', 'tranche_status'], invariant: 'Sum of allocated uint256 units never exceeds 2^256 - 1 ceiling.' },
  { id: 't-16', tableName: 'asset_compliance_attestations', systemId: 'digital-assets', systemLabel: 'System III · Digital Assets', writeMode: 'Immutable Snapshot', primaryKey: 'attestation_id (UUID)', columns: ['attestation_id', 'asset_id', 'jurisdiction', 'kyc_tier', 'approved'], invariant: 'Restricted assets blocked from retail order matching unless attested.' },
  { id: 't-17', tableName: 'asset_edgar_filings', systemId: 'digital-assets', systemLabel: 'System III · Digital Assets', writeMode: 'Immutable Snapshot', primaryKey: 'accession_no (VARCHAR)', columns: ['accession_no', 'form_type', 'asset_symbol', 'jurisdiction', 'status'], invariant: 'Accession numbers cross-linked to EDGAR & MiCA public registries.' },
  // System IV (5)
  { id: 't-18', tableName: 'credit_ledger_entries', systemId: 'application-credits', systemLabel: 'System IV · Append-Only Credits', writeMode: 'Append-Only', primaryKey: 'entry_seq (BIGINT)', columns: ['entry_seq', 'account_id', 'delta_credits', 'balance_after', 'reason'], invariant: 'Double-entry append-only journal; corrections require offsetting entries.' },
  { id: 't-19', tableName: 'credit_mint_batches', systemId: 'application-credits', systemLabel: 'System IV · Append-Only Credits', writeMode: 'Append-Only', primaryKey: 'mint_id (UUID)', columns: ['mint_id', 'authorized_by', 'total_credits', 'merkle_root'], invariant: 'Requires dual-custody sign-off before emitting ledger entries.' },
  { id: 't-20', tableName: 'credit_consumption_events', systemId: 'application-credits', systemLabel: 'System IV · Append-Only Credits', writeMode: 'Append-Only', primaryKey: 'event_id (UUID)', columns: ['event_id', 'feature', 'units_consumed', 'ledger_entry_seq'], invariant: 'Idempotency key prevents duplicate debiting on network retries.' },
  { id: 't-21', tableName: 'credit_settlement_checkpoints', systemId: 'application-credits', systemLabel: 'System IV · Append-Only Credits', writeMode: 'Immutable Snapshot', primaryKey: 'checkpoint_id (INT)', columns: ['checkpoint_id', 'up_to_seq', 'total_supply_credits', 'root_hash'], invariant: 'Cryptographic Merkle proof seals ledger state every 100 entries.' },
  { id: 't-22', tableName: 'credit_sovereign_allocations', systemId: 'application-credits', systemLabel: 'System IV · Append-Only Credits', writeMode: 'Append-Only', primaryKey: 'alloc_id (UUID)', columns: ['alloc_id', 'vault_uuid', 'tranche_label', 'uint256_bound'], invariant: 'Anchored directly to Sovereign Vault UUID af230af8-bf63-4308-968a-9962ed14e565.' },
];

export interface FourTokenSystemWebpageRecord {
  pageIndex: string;
  recordId: string;
  tableId: string;
  tableName: string;
  systemId: FourTokenSystemId;
  systemLabel: string;
  writeMode: string;
  primaryKey: string;
  columns: string[];
  invariant: string;
  partitionShard: string;
  sequenceCursor: string;
  sha256Fingerprint: string;
  merkleRoot: string;
  sqlDdlSnippet: string;
  deterministicRow: Record<string, string | number | boolean>;
  webpagePath: string;
  prevPageIndex: string;
  nextPageIndex: string;
  ceilingIndex: string;
  ceilingDigits: number;
}

export interface FourTokenSystemWebpageRangeResponse {
  startIndex: string;
  limit: number;
  prevStartIndex: string;
  nextStartIndex: string;
  ceilingIndex: string;
  ceilingDigits: number;
  scientificCeiling: string;
  maxSupportedDigits: number;
  activeSystemId: string;
  systems: typeof FOUR_TOKEN_SYSTEM_SPECS;
  totalTables: number;
  items: FourTokenSystemWebpageRecord[];
}

function buildDeterministicRow(
  table: DomainTableBlueprint,
  pageIndex: string,
  h1: string,
  h2: string
): Record<string, string | number | boolean> {
  const shortHex = h1.slice(0, 10);
  const amount = 100 + (readUInt32(h1, 8) % 950_000);
  const price = Number((12.5 + ((readUInt32(h2, 4) % 450_000) / 100)).toFixed(2));
  const row: Record<string, string | number | boolean> = {};

  for (const col of table.columns) {
    if (col.endsWith('_id') || col === 'jti' || col === 'nonce' || col === 'accession_no') {
      row[col] = `${table.id}-${shortHex}`;
    } else if (col.includes('seq') || col.includes('generation')) {
      row[col] = pageIndex.length > 16 ? `${pageIndex.slice(0, 8)}...${pageIndex.slice(-6)}` : pageIndex;
    } else if (col.includes('hash') || col.includes('digest') || col.includes('root') || col.includes('secret')) {
      row[col] = `0x${h2.slice(0, 32)}`;
    } else if (col.includes('cid')) {
      row[col] = `bafybei${h1.slice(0, 44)}`;
    } else if (col.includes('address')) {
      row[col] = `0x${h1.slice(0, 40)}`;
    } else if (col.includes('vault_uuid')) {
      row[col] = 'af230af8-bf63-4308-968a-9962ed14e565';
    } else if (col.includes('price')) {
      row[col] = price;
    } else if (col.includes('rsi')) {
      row[col] = Number((30 + ((readUInt32(h2, 12) % 420) / 10)).toFixed(1));
    } else if (col.includes('credits') || col.includes('count') || col.includes('size') || col.includes('qty') || col.includes('rpm') || col.includes('units')) {
      row[col] = amount;
    } else if (col === 'active' || col === 'approved' || col === 'consumed' || col === 'compromised') {
      row[col] = col === 'compromised' ? false : true;
    } else if (col.includes('_at') || col.includes('expires')) {
      row[col] = '2026-11-24T20:00:00Z';
    } else if (col === 'symbol' || col === 'asset_symbol') {
      row[col] = `TWE-${h1.slice(0, 4).toUpperCase()}`;
    } else if (col === 'status') {
      row[col] = 'VERIFIED_COMMITTED';
    } else if (col === 'side') {
      row[col] = readUInt32(h1, 16) % 2 === 0 ? 'BUY' : 'SELL';
    } else if (col === 'standard') {
      row[col] = 'ERC-3643';
    } else if (col === 'jurisdiction') {
      row[col] = 'US-SEC / EU-MiCA';
    } else if (col === 'uint256_bound') {
      row[col] = '2^256 - 1';
    } else {
      row[col] = `${table.tableName}:${shortHex}`;
    }
  }
  return row;
}

function buildSqlDdl(table: DomainTableBlueprint, partitionShard: string): string {
  const colLines = table.columns.map((c, idx) => {
    const type =
      c.includes('seq') || c.includes('credits') || c.includes('count')
        ? 'NUMERIC(78, 0) NOT NULL'
        : c.includes('price') || c.includes('rsi')
          ? 'NUMERIC(18, 4) NOT NULL'
          : c === 'active' || c === 'approved' || c === 'consumed' || c === 'compromised'
            ? 'BOOLEAN NOT NULL DEFAULT TRUE'
            : c.includes('_at') || c.includes('expires')
              ? 'TIMESTAMPTZ NOT NULL DEFAULT NOW()'
              : 'TEXT NOT NULL';
    const pkSuffix = idx === 0 ? ' PRIMARY KEY' : '';
    return `  ${c} ${type}${pkSuffix}`;
  });
  return `-- ${table.systemLabel} | Write Policy: ${table.writeMode}\n-- Partition Shard: ${partitionShard}\nCREATE TABLE IF NOT EXISTS ${table.tableName} (\n${colLines.join(',\n')}\n);`;
}

export function resolveFourTokenSystemWebpage(
  rawIndex: unknown,
  preferredSystemId?: string
): FourTokenSystemWebpageRecord {
  const idx = parseHubBigIntIndex(rawIndex, 1n);
  const pageIndex = idx.toString();
  const h1 = sha256Hex(`TWE_4TS_WEBPAGE_V1:${pageIndex}`);
  const h2 = sha256Hex(`TWE_4TS_MERKLE_V1:${pageIndex}:${h1}`);

  const candidateTables =
    preferredSystemId && FOUR_TOKEN_SYSTEM_SPECS.some((s) => s.id === preferredSystemId)
      ? TWENTY_TWO_DOMAIN_TABLES.filter((t) => t.systemId === preferredSystemId)
      : TWENTY_TWO_DOMAIN_TABLES;

  const table = candidateTables[readUInt32(h1, 0) % candidateTables.length];
  const shortTag = h1.slice(0, 8).toUpperCase();
  const recordId = `TWE-4TS-${table.id.toUpperCase()}-${shortTag}`;
  const shardNo = (readUInt32(h1, 4) % 4096).toString().padStart(4, '0');
  const partitionShard = `SHARD-${table.systemId.slice(0, 4).toUpperCase()}-${shardNo}`;
  const deterministicRow = buildDeterministicRow(table, pageIndex, h1, h2);
  const sqlDdlSnippet = buildSqlDdl(table, partitionShard);

  const prevPageIndex = idx > 1n ? (idx - 1n).toString() : '1';
  const nextPageIndex = (idx + 1n).toString();
  const activeFilterQuery =
    preferredSystemId && FOUR_TOKEN_SYSTEM_SPECS.some((s) => s.id === preferredSystemId)
      ? `?system=${encodeURIComponent(preferredSystemId)}`
      : '';

  return {
    pageIndex,
    recordId,
    tableId: table.id,
    tableName: table.tableName,
    systemId: table.systemId,
    systemLabel: table.systemLabel,
    writeMode: table.writeMode,
    primaryKey: table.primaryKey,
    columns: table.columns,
    invariant: table.invariant,
    partitionShard,
    sequenceCursor: `SEQ-${formatBigIntAbbrev(pageIndex)}`,
    sha256Fingerprint: h1,
    merkleRoot: `0x${h2}`,
    sqlDdlSnippet,
    deterministicRow,
    webpagePath: `/four-token-systems/page/${pageIndex}${activeFilterQuery}`,
    prevPageIndex,
    nextPageIndex,
    ceilingIndex: FOUR_TOKEN_SYSTEMS_CEILING_STR,
    ceilingDigits: FOUR_TOKEN_SYSTEMS_CEILING_DIGITS,
  };
}

export function resolveFourTokenSystemWebpageRange(
  startRaw: unknown,
  limitRaw = 10,
  systemFilter?: string
): FourTokenSystemWebpageRangeResponse {
  const start = parseHubBigIntIndex(startRaw, 1n);
  const limit = Math.max(1, Math.min(25, Math.floor(Number(limitRaw) || 10)));
  const normalizedSystem =
    systemFilter && FOUR_TOKEN_SYSTEM_SPECS.some((s) => s.id === systemFilter)
      ? systemFilter
      : 'ALL';

  const items: FourTokenSystemWebpageRecord[] = [];
  for (let i = 0; i < limit; i++) {
    items.push(
      resolveFourTokenSystemWebpage(
        start + BigInt(i),
        normalizedSystem === 'ALL' ? undefined : normalizedSystem
      )
    );
  }

  const prevStart = start > BigInt(limit) ? start - BigInt(limit) : 1n;
  const nextStart = start + BigInt(limit);

  return {
    startIndex: start.toString(),
    limit,
    prevStartIndex: prevStart.toString(),
    nextStartIndex: nextStart.toString(),
    ceilingIndex: FOUR_TOKEN_SYSTEMS_CEILING_STR,
    ceilingDigits: FOUR_TOKEN_SYSTEMS_CEILING_DIGITS,
    scientificCeiling: formatScientific(FOUR_TOKEN_SYSTEMS_CEILING_STR),
    maxSupportedDigits: MAX_WEBPAGE_DIGITS,
    activeSystemId: normalizedSystem,
    systems: FOUR_TOKEN_SYSTEM_SPECS,
    totalTables: TWENTY_TWO_DOMAIN_TABLES.length,
    items,
  };
}

/* ============================================================================
 * 3. STANDALONE SIGNAL TERMINAL HTML5 WEBPAGE RENDERERS
 * ============================================================================ */

const SHARED_HTML_STYLES = `
:root{color-scheme:dark;--bg:#090b0f;--surf:#11151d;--elev:#171c26;--bdr:#262e3d;--txt:#f1f5f9;--mut:#94a3b8;--gold:#d4b475;--em:#34d399}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--txt);font-family:Inter,system-ui,-apple-system,sans-serif;line-height:1.55}
.wrap{max-width:980px;margin:0 auto;padding:24px 18px 48px}
.topbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid var(--bdr);margin-bottom:20px}
.brand{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--gold)}
.nav{display:flex;flex-wrap:wrap;gap:8px}
.nav a{font-family:ui-monospace,monospace;font-size:11px;color:var(--txt);text-decoration:none;padding:5px 10px;border:1px solid var(--bdr);border-radius:6px;background:var(--surf)}
.nav a:hover{border-color:var(--gold);color:var(--gold)}
.card{background:var(--surf);border:1px solid var(--bdr);border-radius:10px;padding:18px;margin-bottom:16px}
h1{margin:0 0 6px;font-size:20px;letter-spacing:-.01em}
.sub{color:var(--mut);font-size:13px;margin:0 0 12px}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;margin:14px 0}
.kpi{background:var(--elev);border:1px solid var(--bdr);border-radius:8px;padding:12px}
.kpi .lbl{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--mut)}
.kpi .val{margin-top:4px;font-size:15px;font-weight:600;color:var(--txt)}
.kpi .val.gold{color:var(--gold)}
.kpi .val.em{color:var(--em)}
table{width:100%;border-collapse:collapse;font-size:12px}
th,td{padding:8px 10px;border-bottom:1px solid var(--bdr);text-align:left}
th{color:var(--mut);text-transform:uppercase;font-size:10px;letter-spacing:.06em}
pre{margin:0;padding:12px;border-radius:8px;background:#07090d;border:1px solid var(--bdr);overflow-x:auto;font-size:11.5px;color:#cbd5e1}
.pager{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;margin-top:18px}
.pager a{font-family:ui-monospace,monospace;font-size:12px;color:var(--gold);text-decoration:none;padding:7px 12px;border:1px solid var(--bdr);border-radius:6px;background:var(--surf)}
.pager a:hover{border-color:var(--gold)}
`;

export function renderOverviewHtmlPage(page: OverviewWebpageRecord): string {
  const rowsHtml = page.highlights
    .map(
      (h) =>
        `<tr><td>${escapeHtml(h.metric)}</td><td class="mono">${escapeHtml(h.value)}</td><td style="color:var(--em)">${escapeHtml(h.status)}</td></tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(page.pageId)} — TWE Overview Webpage #${escapeHtml(formatBigIntAbbrev(page.pageIndex))}</title>
  <style>${SHARED_HTML_STYLES}</style>
</head>
<body>
  <div class="wrap">
    <div class="topbar">
      <div class="brand">TWE Asset Workspace · Overview Hyper-Scale Index</div>
      <div class="nav">
        <a href="/overview/page/1">Overview #1</a>
        <a href="/overview/page/${escapeHtml(page.ceilingIndex)}">Overview Ceiling (${page.ceilingDigits} digits)</a>
        <a href="/four-token-systems/page/1">4-Token Systems #1</a>
        <a href="/foundry/token/1">Token Foundry #1</a>
        <a href="/foundry/nft/1">NFT Foundry #1</a>
      </div>
    </div>

    <div class="card">
      <div class="brand" style="margin-bottom:6px">${escapeHtml(page.domainLabel)} · ${escapeHtml(page.pageId)}</div>
      <h1>${escapeHtml(page.title)}</h1>
      <p class="sub">Deterministic O(1) arbitrary-precision Overview webpage resolving up to ${page.ceilingDigits}-digit ceiling (${escapeHtml(formatScientific(page.ceilingIndex))}).</p>

      <div class="grid">
        <div class="kpi"><div class="lbl">Portfolio NAV Snapshot</div><div class="val gold mono">$${escapeHtml(page.sovereignNavUsd.toLocaleString('en-US', { minimumFractionDigits: 2 }))}</div></div>
        <div class="kpi"><div class="lbl">Paper Cash Liquidity</div><div class="val mono">$${escapeHtml(page.paperCashUsd.toLocaleString('en-US', { minimumFractionDigits: 2 }))}</div></div>
        <div class="kpi"><div class="lbl">Settlement Rail</div><div class="val">${escapeHtml(page.settlementRail)}</div></div>
        <div class="kpi"><div class="lbl">Jurisdiction & Tier</div><div class="val em">${escapeHtml(page.jurisdiction)} · ${escapeHtml(page.complianceTier)}</div></div>
      </div>

      <table>
        <thead><tr><th>Executive Metric</th><th>Deterministic Reading</th><th>State</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>

    <div class="card">
      <div class="brand" style="margin-bottom:8px">Arbitrary-Precision Webpage Coordinates & Cryptographic Audit</div>
      <table>
        <tbody>
          <tr><th style="width:210px">Exact Webpage Index</th><td class="mono">${escapeHtml(page.pageIndex)}</td></tr>
          <tr><th>Vault Epoch Block</th><td class="mono">${escapeHtml(page.vaultEpochBlock)}</td></tr>
          <tr><th>Sovereign Vault UUID</th><td class="mono">${escapeHtml(page.vaultUuid)}</td></tr>
          <tr><th>SHA-256 Node Fingerprint</th><td class="mono">${escapeHtml(page.nodeFingerprint)}</td></tr>
          <tr><th>Merkle Audit Root</th><td class="mono">${escapeHtml(page.merkleAuditRoot)}</td></tr>
          <tr><th>JSON API Endpoint</th><td class="mono"><a style="color:var(--gold)" href="/api/twe/overview/pages/${escapeHtml(page.pageIndex)}">/api/twe/overview/pages/${escapeHtml(formatBigIntAbbrev(page.pageIndex))}</a></td></tr>
        </tbody>
      </table>
    </div>

    <div class="pager">
      <a href="/overview/page/${escapeHtml(page.prevPageIndex)}">← Prev Overview Page</a>
      <a href="/overview/page/${escapeHtml(page.nextPageIndex)}">Next Overview Page →</a>
    </div>
  </div>
</body>
</html>`;
}

export function renderFourTokenSystemHtmlPage(page: FourTokenSystemWebpageRecord): string {
  const columnsHtml = page.columns
    .map((col) => `<span class="mono" style="display:inline-block;margin:2px 6px 2px 0;padding:2px 7px;border:1px solid var(--bdr);border-radius:4px;background:var(--elev);font-size:11px">${escapeHtml(col)}</span>`)
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(page.recordId)} — 4-Token Systems Webpage #${escapeHtml(formatBigIntAbbrev(page.pageIndex))}</title>
  <style>${SHARED_HTML_STYLES}</style>
</head>
<body>
  <div class="wrap">
    <div class="topbar">
      <div class="brand">TWE Asset Workspace · 4-Token Systems Modular Monolith Index</div>
      <div class="nav">
        <a href="/four-token-systems/page/1">4-Token Systems #1</a>
        <a href="/four-token-systems/page/${escapeHtml(page.ceilingIndex)}">Ceiling (${page.ceilingDigits} digits)</a>
        <a href="/overview/page/1">Overview #1</a>
        <a href="/foundry/token/1">Token Foundry #1</a>
      </div>
    </div>

    <div class="card">
      <div class="brand" style="margin-bottom:6px">${escapeHtml(page.systemLabel)} · ${escapeHtml(page.recordId)}</div>
      <h1 class="mono">${escapeHtml(page.tableName)}</h1>
      <p class="sub">${escapeHtml(page.invariant)}</p>

      <div class="grid">
        <div class="kpi"><div class="lbl">Primary Key</div><div class="val mono gold">${escapeHtml(page.primaryKey)}</div></div>
        <div class="kpi"><div class="lbl">Write Policy</div><div class="val em">${escapeHtml(page.writeMode)}</div></div>
        <div class="kpi"><div class="lbl">Partition Shard</div><div class="val mono">${escapeHtml(page.partitionShard)}</div></div>
        <div class="kpi"><div class="lbl">Sequence Cursor</div><div class="val mono">${escapeHtml(page.sequenceCursor)}</div></div>
      </div>

      <div style="margin:12px 0">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--mut);margin-bottom:6px">Indexed Domain Columns (${page.columns.length})</div>
        <div>${columnsHtml}</div>
      </div>
    </div>

    <div class="card">
      <div class="brand" style="margin-bottom:8px">Deterministic Row Snapshot (JSON)</div>
      <pre class="mono">${escapeHtml(JSON.stringify(page.deterministicRow, null, 2))}</pre>
    </div>

    <div class="card">
      <div class="brand" style="margin-bottom:8px">PostgreSQL Modular Monolith DDL</div>
      <pre class="mono">${escapeHtml(page.sqlDdlSnippet)}</pre>
    </div>

    <div class="card">
      <div class="brand" style="margin-bottom:8px">Arbitrary-Precision Webpage Verification</div>
      <table>
        <tbody>
          <tr><th style="width:210px">Exact Webpage Index</th><td class="mono">${escapeHtml(page.pageIndex)}</td></tr>
          <tr><th>SHA-256 Fingerprint</th><td class="mono">${escapeHtml(page.sha256Fingerprint)}</td></tr>
          <tr><th>Merkle Proof Root</th><td class="mono">${escapeHtml(page.merkleRoot)}</td></tr>
          <tr><th>JSON API Endpoint</th><td class="mono"><a style="color:var(--gold)" href="/api/twe/four-token-systems/pages/${escapeHtml(page.pageIndex)}">/api/twe/four-token-systems/pages/${escapeHtml(formatBigIntAbbrev(page.pageIndex))}</a></td></tr>
        </tbody>
      </table>
    </div>

    <div class="pager">
      <a href="/four-token-systems/page/${escapeHtml(page.prevPageIndex)}">← Prev 4-Token Page</a>
      <a href="/four-token-systems/page/${escapeHtml(page.nextPageIndex)}">Next 4-Token Page →</a>
    </div>
  </div>
</body>
</html>`;
}
