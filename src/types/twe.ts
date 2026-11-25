export type HubId =
  | 'overview'
  | 'four-token-systems'
  | 'token-atlas'
  | 'token-foundry'
  | 'asset-vault'
  | 'nft-studio'
  | 'cmdtx-codex'
  | 'company-directory'
  | 'sources-studio'
  | 'project-archive'
  | 'portfolio-watchlist'
  | 'market-exchange'
  | 'deploy-registry'
  | 'risk-security'
  | 'compliance-edgar'
  | 'sec-monitor'
  | 'chain-connections'
  | 'ai-art-studio'
  | 'planetary-system'
  | 'governance-portal'
  | 'staking-pool'
  | 'token-namer'
  | 'cloud-database'
  | 'infinite-foundry';

export interface HubDefinition {
  id: HubId;
  label: string;
  group: 'Core Systems' | 'Assets & Studio' | 'Markets & Custody' | 'Governance & Infra';
  description: string;
}

export type AssetKind = 'Tokens' | 'NFTs' | 'Commodities' | 'Currencies';
export type SortField = 'name' | 'kind' | 'chain';
export type SortDirection = 'asc' | 'desc';

export interface SparklinePoint {
  hour: string;
  price: number;
  volume: number;
}

export interface TweAssetRecord {
  id: string;
  symbol: string;
  name: string;
  kind: AssetKind;
  chain: string;
  chainId: number;
  standard: string;
  contractAddress: string;
  priceUsd: number;
  change24hPct: number;
  volume24hUsd: number;
  marketCapUsd: number;
  supplyFormatted: string;
  rsi14: number;
  sparkline24h: SparklinePoint[];
  status: 'Active' | 'Review' | 'Restricted' | 'Archived';
  sovereignVaultAllocationPct: number;
  watchlisted: boolean;
  updatedAt: string;
}

export interface AssetClassificationSummary {
  Tokens: number;
  NFTs: number;
  Commodities: number;
  Currencies: number;
  total: number;
}

export interface PaginatedAssetsResponse {
  items: TweAssetRecord[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  sort: {
    field: SortField;
    direction: SortDirection;
  };
  classificationSummary: AssetClassificationSummary;
}

export interface BatchJobStatus {
  jobId: string;
  operation: 'duplicate' | 'delete';
  total: number;
  processed: number;
  status: 'running' | 'completed' | 'failed';
  affectedIds: string[];
  message: string;
  startedAt: string;
  completedAt?: string;
}

export interface DomainTableSpec {
  id: string;
  tableName: string;
  systemId: 'ai-generation-batches' | 'auth-session-tokens' | 'digital-assets' | 'application-credits';
  systemLabel: string;
  rowCount: number;
  writeMode: 'Append-Only' | 'Mutable Indexed' | 'Immutable Snapshot';
  primaryKey: string;
  columns: string[];
  invariant: string;
  sampleRows: Record<string, string | number | boolean>[];
}

export interface SovereignVaultState {
  vaultUuid: string;
  title: string;
  custodian: string;
  maxUnitsDecimal: string;
  maxUnitsHex: string;
  maxUnitsFormula: string;
  allocatedUnitsDecimal: string;
  unallocatedReserveFormula: string;
  paperCashUsd: number;
  reservedUsd: number;
  totalPossessionValuationUsd: number;
  lastAuditBlock: number;
  tranches: {
    id: string;
    label: string;
    assetSymbol: string;
    allocationSharePct: number;
    unitsFormula: string;
    status: 'Locked' | 'Active Custody' | 'Settlement Ready';
  }[];
}

export interface TradeNotificationEvent {
  id: string;
  type:
    | 'trade_fill'
    | 'order_placed'
    | 'order_cancelled'
    | 'price_alert'
    | 'batch_job'
    | 'market_tick'
    | 'rebalance_drift'
    | 'sec_disclosure_alert'
    | 'token_burn';
  title: string;
  message: string;
  symbol?: string;
  side?: 'BUY' | 'SELL';
  quantity?: number;
  priceUsd?: number;
  notionalUsd?: number;
  severity: 'nominal' | 'gold' | 'warning' | 'alert';
  timestamp: string;
  read: boolean;
}

export type InstitutionalOrderType =
  | 'MARKET'
  | 'LIMIT'
  | 'PEGGED'
  | 'ICEBERG'
  | 'FOK'
  | 'IOC'
  | 'TWAP'
  | 'VWAP';

export interface MarketOrder {
  id: string;
  symbol: string;
  assetName: string;
  side: 'BUY' | 'SELL';
  orderType: InstitutionalOrderType;
  quantity: number;
  limitPriceUsd: number;
  executedPriceUsd: number;
  status: 'FILLED' | 'OPEN' | 'CANCELLED';
  complianceStatus?: 'RULE_144_CLEARED' | 'REG_D_506C_VERIFIED';
  createdAt: string;
}

export interface TradeExecution {
  id: string;
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  priceUsd: number;
  notionalUsd: number;
  venue: string;
  timestamp: string;
}

export interface PortfolioHolding {
  symbol: string;
  name: string;
  kind: AssetKind;
  chain: string;
  quantity: number;
  avgCostUsd: number;
  markPriceUsd: number;
  marketValueUsd: number;
  unrealizedPnlUsd: number;
  unrealizedPnlPct: number;
  rule144LockupDaysRemaining?: number;
}

export interface FoundryBatchConcept {
  id: string;
  seed: string;
  batchIndex: number;
  ticker: string;
  name: string;
  kind: AssetKind;
  chain: string;
  simulatedSupply: string;
  initialPriceUsd: number;
  createdAt: string;
}

export interface FoundryTokenArtifact {
  id: string;
  batchId: string;
  batchIndex: number;
  seed: string;
  ticker: string;
  name: string;
  kind: AssetKind;
  standard: 'ERC-3643' | 'ERC-20' | 'ERC-1400';
  chain: string;
  chainId: number;
  simulatedSupply: string;
  initialPriceUsd: number;
  contractAddress: string;
  deployTxHash: string;
  bytecodeHex: string;
  bytecodeSizeBytes: number;
  hsmKeyId: string;
  hsmKeyFingerprint: string;
  signerAddress: string;
  kmsEnvelopeHash: string;
  deployed: boolean;
  nftTokenId: string;
  nftCidV1: string;
  nftSha256: string;
  createdAt: string;
}

export interface FoundryTokenDetail extends FoundryTokenArtifact {
  soliditySource: string;
  abiJson: string;
  ephemeralPrivateKeyHex: string;
  nftSvgMarkup: string;
  nftMetadataJson: string;
}

export interface WorldCommodity {
  code: string;
  name: string;
  sector: 'Energy' | 'Precious Metals' | 'Industrial Metals' | 'Grains & Oilseeds' | 'Softs & Timber' | 'Livestock & Carbon';
  exchange: string;
  unit: string;
  priceUsd: number;
  change24hPct: number;
  originIso: number;
  originCountry: string;
  portCode: number;
  qualitySpec: string;
  apiOrPurityScaled: number;
  sulfurOrGradeScaled: number;
  uint256BitmaskHex: string;
  tokenized: boolean;
  tokenSymbol: string;
  contractAddress?: string;
}

export interface DoubleEntryJournalRow {
  seq: number;
  txRef: string;
  account: string;
  entryType: 'DEBIT' | 'CREDIT';
  amountUsd: number;
  assetSymbol: string;
  units: number;
  memo: string;
  timestamp: string;
}

export interface FixSessionConfig {
  id: string;
  version: 'FIX 4.2' | 'FIX 4.4' | 'FIX 5.0';
  senderCompId: string;
  targetCompId: string;
  ipWhitelist: string;
  throttleMsgPerSec: number;
  active: boolean;
  messagesToday: number;
  apiKeyPrefix: string;
}

export interface SurveillanceAlert {
  id: string;
  pattern: 'Wash Trading' | 'Spoofing' | 'Layering' | 'Quote Stuffing';
  symbol: string;
  severity: 'High' | 'Medium' | 'Elevated';
  confidenceScore: number;
  detail: string;
  status: 'Open' | 'Acknowledged';
  timestamp: string;
}

export interface CorporateEntity {
  id: string;
  legalName: string;
  jurisdiction: string;
  lei: string;
  role: 'ATS Operator' | 'Qualified Custodian' | 'Token Issuer' | 'Oracle Provider' | 'Liquidity Desk';
  tier: 'Tier-1' | 'Institutional' | 'Sandbox';
  assetsIssued: number;
  kybStatus: 'Verified' | 'Pending Review';
}

export interface ComplianceFiling {
  id: string;
  formType: 'Form D' | 'Reg S' | 'Form ATS-N' | 'MiCA Whitepaper' | 'SOC2 Type II';
  issuer: string;
  assetSymbol: string;
  accessionNumber: string;
  jurisdiction: string;
  status: 'Effective' | 'Under Review' | 'Restricted';
  filedDate: string;
}

export interface ChainConnection {
  id: string;
  name: string;
  chainId: number;
  eip155: string;
  rpcEndpoint: string;
  blockHeight: number;
  finalitySeconds: number;
  gasGwei: number;
  indexedAssets: number;
  status: 'Synced' | 'Degraded' | 'Standby';
}

export interface ReadinessGate {
  id: string;
  category: 'Cryptographic' | 'Compliance' | 'Liquidity' | 'Custody';
  gateName: string;
  owner: string;
  passed: boolean;
  evidenceRef: string;
}

export interface WorkspaceBootstrapPayload {
  vault: SovereignVaultState;
  tables: DomainTableSpec[];
  portfolio: {
    holdings: PortfolioHolding[];
    paperCashUsd: number;
    reservedUsd: number;
    totalNavUsd: number;
  };
  orders: MarketOrder[];
  recentTrades: TradeExecution[];
  notifications: TradeNotificationEvent[];
  foundryBatches: FoundryBatchConcept[];
  companies: CorporateEntity[];
  filings: ComplianceFiling[];
  chains: ChainConnection[];
  readinessGates: ReadinessGate[];
}

export interface AnalyticsEventRecord {
  id: string;
  name: string;
  url: string;
  domain: string;
  props?: Record<string, string>;
  scrollDepthPct?: number;
  engagementMs?: number;
  timestamp: string;
}

export interface AnalyticsSummary {
  totalEvents: number;
  pageviews: number;
  fileDownloads: number;
  outboundClicks: number;
  avgEngagementMs: number;
  avgScrollDepthPct: number;
  topHubs: Array<{ hub: string; views: number }>;
  recentEvents: AnalyticsEventRecord[];
}
