import { createHash, createHmac, randomUUID } from 'crypto';
import type { Response } from 'express';
import type {
  AssetClassificationSummary,
  AssetKind,
  BatchJobStatus,
  ChainConnection,
  ComplianceFiling,
  CorporateEntity,
  DomainTableSpec,
  DoubleEntryJournalRow,
  FixSessionConfig,
  FoundryBatchConcept,
  FoundryTokenArtifact,
  FoundryTokenDetail,
  InstitutionalOrderType,
  MarketOrder,
  PaginatedAssetsResponse,
  PortfolioHolding,
  ReadinessGate,
  SortDirection,
  SortField,
  SovereignVaultState,
  SparklinePoint,
  SurveillanceAlert,
  TradeExecution,
  TradeNotificationEvent,
  TweAssetRecord,
  WorldCommodity,
  WorkspaceBootstrapPayload,
} from '../src/types/twe.ts';
import {
  buildFoundryTokenDetail,
  createInitialWorldCommodities,
  generateEnterpriseFoundryBatch,
} from './foundryAndCommodities.ts';

function computeWildersRsi14(prices: number[]): number {
  if (prices.length < 15) return 50;
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= 14; i++) {
    const delta = prices[i] - prices[i - 1];
    if (delta >= 0) gainSum += delta;
    else lossSum += Math.abs(delta);
  }
  let avgGain = gainSum / 14;
  let avgLoss = lossSum / 14;

  for (let i = 15; i < prices.length; i++) {
    const delta = prices[i] - prices[i - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? Math.abs(delta) : 0;
    avgGain = (avgGain * 13 + gain) / 14;
    avgLoss = (avgLoss * 13 + loss) / 14;
  }

  if (avgLoss === 0) return avgGain === 0 ? 50 : 99.2;
  const rs = avgGain / avgLoss;
  return Number((100 - 100 / (1 + rs)).toFixed(2));
}

function deterministicSparkline(seedNum: number, basePrice: number, drift: number): SparklinePoint[] {
  const points: SparklinePoint[] = [];
  let price = basePrice * (1 - drift * 0.6);
  for (let h = 0; h < 24; h++) {
    const wave = Math.sin((seedNum * 1.7 + h * 0.65)) * 0.018 + Math.cos(seedNum * 0.9 + h * 0.32) * 0.011;
    const step = drift / 24 + wave;
    price = Math.max(0.0001, Number((price * (1 + step)).toFixed(basePrice < 10 ? 4 : 2)));
    const hourStr = `${String(h).padStart(2, '0')}:00`;
    points.push({
      hour: hourStr,
      price,
      volume: Math.round((40000 + ((seedNum * 931 + h * 417) % 180000)) * (1 + Math.abs(wave) * 10)),
    });
  }
  return points;
}

const SEED_SPEC: Array<{
  symbol: string;
  name: string;
  kind: AssetKind;
  chain: string;
  chainId: number;
  standard: string;
  priceUsd: number;
  drift: number;
  supplyFormatted: string;
  marketCapUsd: number;
  status: TweAssetRecord['status'];
  sovereignPct: number;
  watchlisted?: boolean;
}> = [
  { symbol: 'TWE-G', name: 'TWE Sovereign Governance', kind: 'Tokens', chain: 'Ethereum', chainId: 1, standard: 'ERC-20', priceUsd: 142.85, drift: 0.048, supplyFormatted: '1,000,000,000', marketCapUsd: 14285000000, status: 'Active', sovereignPct: 24.5, watchlisted: true },
  { symbol: 'CMDTX', name: 'Commodity Trust Index', kind: 'Commodities', chain: 'Base', chainId: 8453, standard: 'ERC-3643', priceUsd: 2418.4, drift: 0.022, supplyFormatted: '25,000,000', marketCapUsd: 6046000000, status: 'Active', sovereignPct: 18.2, watchlisted: true },
  { symbol: 'AURUM-X', name: 'Allocated Swiss Gold Bullion', kind: 'Commodities', chain: 'Ethereum', chainId: 1, standard: 'ERC-20', priceUsd: 2685.1, drift: 0.014, supplyFormatted: '4,500,000', marketCapUsd: 12082950000, status: 'Active', sovereignPct: 16.0, watchlisted: true },
  { symbol: 'PLAT-R', name: 'Zurich Platinum Reserve', kind: 'Commodities', chain: 'Arbitrum', chainId: 42161, standard: 'ERC-3643', priceUsd: 1018.6, drift: -0.012, supplyFormatted: '8,200,000', marketCapUsd: 8352520000, status: 'Active', sovereignPct: 9.4, watchlisted: true },
  { symbol: 'USD-TWE', name: 'TWE Institutional Treasury USD', kind: 'Currencies', chain: 'Base', chainId: 8453, standard: 'ERC-20', priceUsd: 1.0, drift: 0.001, supplyFormatted: '18,500,000,000', marketCapUsd: 18500000000, status: 'Active', sovereignPct: 12.1, watchlisted: true },
  { symbol: 'EUR-C', name: 'Euro Clearing Settlement Coin', kind: 'Currencies', chain: 'Polygon', chainId: 137, standard: 'ERC-20', priceUsd: 1.084, drift: 0.003, supplyFormatted: '9,400,000,000', marketCapUsd: 10189600000, status: 'Active', sovereignPct: 5.5 },
  { symbol: 'CHRONO-01', name: 'Genesis Vault Obelisk #001', kind: 'NFTs', chain: 'Ethereum', chainId: 1, standard: 'ERC-721', priceUsd: 48200, drift: 0.064, supplyFormatted: '100', marketCapUsd: 4820000, status: 'Active', sovereignPct: 3.1, watchlisted: true },
  { symbol: 'HASH-GEN', name: 'HashLips Sovereign Emblem', kind: 'NFTs', chain: 'Base', chainId: 8453, standard: 'ERC-1155', priceUsd: 3840, drift: 0.031, supplyFormatted: '2,500', marketCapUsd: 9600000, status: 'Active', sovereignPct: 2.2 },
  { symbol: 'CHF-T', name: 'Helvetia Digital Franc', kind: 'Currencies', chain: 'Arbitrum', chainId: 42161, standard: 'ERC-20', priceUsd: 1.132, drift: 0.004, supplyFormatted: '4,100,000,000', marketCapUsd: 4641200000, status: 'Active', sovereignPct: 4.0 },
  { symbol: 'SOL-R', name: 'Solana Liquidity Anchor', kind: 'Tokens', chain: 'Solana', chainId: 101, standard: 'SPL-2022', priceUsd: 198.42, drift: 0.055, supplyFormatted: '580,000,000', marketCapUsd: 115083600000, status: 'Active', sovereignPct: 1.8 },
  { symbol: 'BRENT-T', name: 'North Sea Crude Barrel Token', kind: 'Commodities', chain: 'Polygon', chainId: 137, standard: 'ERC-3643', priceUsd: 78.65, drift: -0.025, supplyFormatted: '120,000,000', marketCapUsd: 9438000000, status: 'Active', sovereignPct: 1.1 },
  { symbol: 'LITH-V', name: 'Atacama Lithium Carbonate', kind: 'Commodities', chain: 'Arbitrum', chainId: 42161, standard: 'ERC-3643', priceUsd: 14.92, drift: -0.018, supplyFormatted: '450,000,000', marketCapUsd: 6714000000, status: 'Active', sovereignPct: 0.9 },
  { symbol: 'GBP-X', name: 'Sterling Clearing Token', kind: 'Currencies', chain: 'Ethereum', chainId: 1, standard: 'ERC-20', priceUsd: 1.274, drift: 0.002, supplyFormatted: '3,200,000,000', marketCapUsd: 4076800000, status: 'Active', sovereignPct: 0.8 },
  { symbol: 'JPY-Q', name: 'Tokyo Interbank Yen Unit', kind: 'Currencies', chain: 'Base', chainId: 8453, standard: 'ERC-20', priceUsd: 0.0067, drift: -0.004, supplyFormatted: '620,000,000,000', marketCapUsd: 4154000000, status: 'Active', sovereignPct: 0.7 },
  { symbol: 'GRAPH-IX', name: 'Graphite Lattice Core Token', kind: 'Tokens', chain: 'Base', chainId: 8453, standard: 'ERC-20', priceUsd: 34.18, drift: 0.039, supplyFormatted: '750,000,000', marketCapUsd: 25635000000, status: 'Active', sovereignPct: 0.6 },
  { symbol: 'MERIDIAN', name: 'Meridian Treasury Bill Note', kind: 'Tokens', chain: 'Ethereum', chainId: 1, standard: 'ERC-4626', priceUsd: 104.22, drift: 0.007, supplyFormatted: '95,000,000', marketCapUsd: 9900900000, status: 'Active', sovereignPct: 1.4 },
  { symbol: 'OBSID-NFT', name: 'Obsidian Charter Deed #042', kind: 'NFTs', chain: 'Polygon', chainId: 137, standard: 'ERC-721', priceUsd: 12950, drift: 0.028, supplyFormatted: '500', marketCapUsd: 6475000, status: 'Active', sovereignPct: 0.4 },
  { symbol: 'SILV-AG', name: 'London Good Delivery Silver', kind: 'Commodities', chain: 'Ethereum', chainId: 1, standard: 'ERC-20', priceUsd: 31.45, drift: 0.019, supplyFormatted: '310,000,000', marketCapUsd: 9749500000, status: 'Active', sovereignPct: 0.5 },
  { symbol: 'COPR-CU', name: 'Cathode Copper Warehouse Receipt', kind: 'Commodities', chain: 'Base', chainId: 8453, standard: 'ERC-3643', priceUsd: 4.38, drift: -0.009, supplyFormatted: '880,000,000', marketCapUsd: 3854400000, status: 'Review', sovereignPct: 0.3 },
  { symbol: 'KINETIC', name: 'Kinetic Settlement Relay', kind: 'Tokens', chain: 'Arbitrum', chainId: 42161, standard: 'ERC-20', priceUsd: 8.74, drift: 0.061, supplyFormatted: '1,250,000,000', marketCapUsd: 10925000000, status: 'Active', sovereignPct: 0.4 },
  { symbol: 'APEX-DEED', name: 'Apex Institutional Vault Pass', kind: 'NFTs', chain: 'Ethereum', chainId: 1, standard: 'ERC-721', priceUsd: 26400, drift: 0.044, supplyFormatted: '250', marketCapUsd: 6600000, status: 'Active', sovereignPct: 0.5 },
  { symbol: 'SGD-M', name: 'Straits Monetary Dollar', kind: 'Currencies', chain: 'Solana', chainId: 101, standard: 'SPL-2022', priceUsd: 0.746, drift: 0.002, supplyFormatted: '2,900,000,000', marketCapUsd: 2163400000, status: 'Active', sovereignPct: 0.2 },
  { symbol: 'PALLAD-X', name: 'Palladium Industrial Reserve', kind: 'Commodities', chain: 'Ethereum', chainId: 1, standard: 'ERC-3643', priceUsd: 974.3, drift: -0.031, supplyFormatted: '1,900,000', marketCapUsd: 1851170000, status: 'Review', sovereignPct: 0.3 },
  { symbol: 'NEXUS-LP', name: 'Nexus Constant-Product Pool', kind: 'Tokens', chain: 'Polygon', chainId: 137, standard: 'ERC-20', priceUsd: 19.64, drift: 0.027, supplyFormatted: '420,000,000', marketCapUsd: 8248800000, status: 'Active', sovereignPct: 0.2 },
  { symbol: 'AETHER-G', name: 'Aether Sovereign Bond Unit', kind: 'Tokens', chain: 'Sepolia', chainId: 11155111, standard: 'ERC-4626', priceUsd: 99.85, drift: 0.005, supplyFormatted: '10,000,000', marketCapUsd: 998500000, status: 'Active', sovereignPct: 0.1 },
  { symbol: 'VALKYR-NFT', name: 'Valkyrie Audit Seal #118', kind: 'NFTs', chain: 'Arbitrum', chainId: 42161, standard: 'ERC-1155', priceUsd: 1620, drift: -0.015, supplyFormatted: '1,000', marketCapUsd: 1620000, status: 'Active', sovereignPct: 0.1 },
  { symbol: 'CAD-T', name: 'Northern Clearing CAD', kind: 'Currencies', chain: 'Base', chainId: 8453, standard: 'ERC-20', priceUsd: 0.728, drift: 0.001, supplyFormatted: '1,800,000,000', marketCapUsd: 1310400000, status: 'Active', sovereignPct: 0.1 },
  { symbol: 'CARBON-T', name: 'Verified Direct Air Carbon Ton', kind: 'Commodities', chain: 'Polygon', chainId: 137, standard: 'ERC-1155', priceUsd: 62.4, drift: 0.033, supplyFormatted: '65,000,000', marketCapUsd: 4056000000, status: 'Active', sovereignPct: 0.2 },
  { symbol: 'QUANT-8', name: 'Quant Signal Governance', kind: 'Tokens', chain: 'Solana', chainId: 101, standard: 'SPL-2022', priceUsd: 52.9, drift: 0.072, supplyFormatted: '210,000,000', marketCapUsd: 11109000000, status: 'Active', sovereignPct: 0.3 },
  { symbol: 'SOLAR-NFT', name: 'Helios Custody Charter', kind: 'NFTs', chain: 'Solana', chainId: 101, standard: 'Metaplex', priceUsd: 5410, drift: 0.016, supplyFormatted: '888', marketCapUsd: 4804080, status: 'Active', sovereignPct: 0.1 },
  { symbol: 'AUD-X', name: 'Pacific Settlement AUD', kind: 'Currencies', chain: 'Arbitrum', chainId: 42161, standard: 'ERC-20', priceUsd: 0.654, drift: -0.005, supplyFormatted: '2,100,000,000', marketCapUsd: 1373400000, status: 'Active', sovereignPct: 0.1 },
  { symbol: 'COBALT-M', name: 'Refined Cobalt Ingot Unit', kind: 'Commodities', chain: 'Base', chainId: 8453, standard: 'ERC-3643', priceUsd: 28.15, drift: -0.022, supplyFormatted: '95,000,000', marketCapUsd: 2674250000, status: 'Restricted', sovereignPct: 0.1 },
  { symbol: 'CHAMPA-T', name: 'Champagne Reserve Note', kind: 'Tokens', chain: 'Ethereum', chainId: 1, standard: 'ERC-20', priceUsd: 412.5, drift: 0.029, supplyFormatted: '30,000,000', marketCapUsd: 12375000000, status: 'Active', sovereignPct: 0.4 },
  { symbol: 'MONOLITH', name: 'Monolith Shard #009', kind: 'NFTs', chain: 'Sepolia', chainId: 11155111, standard: 'ERC-721', priceUsd: 890, drift: 0.011, supplyFormatted: '400', marketCapUsd: 356000, status: 'Active', sovereignPct: 0.05 },
  { symbol: 'WHEAT-C', name: 'Black Sea Grain Futures Unit', kind: 'Commodities', chain: 'Polygon', chainId: 137, standard: 'ERC-3643', priceUsd: 6.18, drift: 0.008, supplyFormatted: '520,000,000', marketCapUsd: 3213600000, status: 'Active', sovereignPct: 0.05 },
  { symbol: 'AED-S', name: 'Gulf Dirham Settlement Coin', kind: 'Currencies', chain: 'Ethereum', chainId: 1, standard: 'ERC-20', priceUsd: 0.2723, drift: 0.0005, supplyFormatted: '7,500,000,000', marketCapUsd: 2042250000, status: 'Active', sovereignPct: 0.2 },
];

function makeContractAddress(idx: number): string {
  const hex = (idx * 7919 + 0x4a2f1c).toString(16).padStart(8, '0');
  const tail = (idx * 104729 + 0x9b8e7d).toString(16).padStart(8, '0');
  return `0x${hex}${'a4c8e2f1903b'.slice(0, 12)}${tail}${'7d6e5f4a3b2c'.slice(0, 12)}`;
}

class TweWorkspaceStore {
  private assets: TweAssetRecord[] = [];
  private tables: DomainTableSpec[] = [];
  private vault: SovereignVaultState;
  private orders: MarketOrder[] = [];
  private trades: TradeExecution[] = [];
  private notifications: TradeNotificationEvent[] = [];
  private holdings: Map<string, { quantity: number; avgCostUsd: number }> = new Map();
  private paperCashUsd = 2_450_000;
  private reservedUsd = 84_500;
  private foundryBatches: FoundryBatchConcept[] = [];
  private foundryTokens: FoundryTokenArtifact[] = [];
  private worldCommodities: WorldCommodity[] = [];
  private journalEntries: DoubleEntryJournalRow[] = [];
  private journalSeq = 1000;
  private fixSessions: FixSessionConfig[] = [];
  private surveillanceAlerts: SurveillanceAlert[] = [];
  private companies: CorporateEntity[] = [];
  private filings: ComplianceFiling[] = [];
  private chains: ChainConnection[] = [];
  private readinessGates: ReadinessGate[] = [];
  private batchJobs: Map<string, BatchJobStatus> = new Map();
  private sseClients: Set<Response> = new Set();

  constructor() {
    this.assets = SEED_SPEC.map((spec, idx) => {
      const sparkline = deterministicSparkline(idx + 1, spec.priceUsd, spec.drift);
      const lastPrice = sparkline[sparkline.length - 1]?.price ?? spec.priceUsd;
      const firstPrice = sparkline[0]?.price ?? spec.priceUsd;
      const change24hPct = Number((((lastPrice - firstPrice) / firstPrice) * 100).toFixed(2));
      const rsi14 = computeWildersRsi14(sparkline.map((p) => p.price));
      return {
        id: `asset-${String(idx + 1).padStart(3, '0')}`,
        symbol: spec.symbol,
        name: spec.name,
        kind: spec.kind,
        chain: spec.chain,
        chainId: spec.chainId,
        standard: spec.standard,
        contractAddress: makeContractAddress(idx + 1),
        priceUsd: lastPrice,
        change24hPct,
        volume24hUsd: sparkline.reduce((acc, pt) => acc + pt.volume, 0),
        marketCapUsd: spec.marketCapUsd,
        supplyFormatted: spec.supplyFormatted,
        rsi14,
        sparkline24h: sparkline,
        status: spec.status,
        sovereignVaultAllocationPct: spec.sovereignPct,
        watchlisted: Boolean(spec.watchlisted),
        updatedAt: new Date().toISOString(),
      };
    });

    this.vault = {
      vaultUuid: 'af230af8-bf63-4308-968a-9962ed14e565',
      title: 'Sovereign Wealth & Asset Possession Vault',
      custodian: 'TWE Qualified Multi-Sig Custody Trust',
      maxUnitsDecimal: '115792089237316195423570985008687907853269984665640564039457584007913129639935',
      maxUnitsHex: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      maxUnitsFormula: '2^256 - 1',
      allocatedUnitsDecimal: '86844066927987146567678238756515930889952488499230423029593188005934847229951',
      unallocatedReserveFormula: '2^254 - 1 (25.00% Sovereign Buffer)',
      paperCashUsd: this.paperCashUsd,
      reservedUsd: this.reservedUsd,
      totalPossessionValuationUsd: 78_420_500_000,
      lastAuditBlock: 21_942_810,
      tranches: [
        { id: 'tr-1', label: 'Tranche Alpha — Sovereign Governance Reserve', assetSymbol: 'TWE-G', allocationSharePct: 24.5, unitsFormula: '28,369,061,863... × 10^66 units', status: 'Locked' },
        { id: 'tr-2', label: 'Tranche Beta — Commodity & Bullion Backing', assetSymbol: 'CMDTX', allocationSharePct: 18.2, unitsFormula: '21,074,160,241... × 10^66 units', status: 'Active Custody' },
        { id: 'tr-3', label: 'Tranche Gamma — Allocated Swiss Gold', assetSymbol: 'AURUM-X', allocationSharePct: 16.0, unitsFormula: '18,526,734,277... × 10^66 units', status: 'Active Custody' },
        { id: 'tr-4', label: 'Tranche Delta — Institutional USD Clearing', assetSymbol: 'USD-TWE', allocationSharePct: 12.1, unitsFormula: '14,010,842,797... × 10^66 units', status: 'Settlement Ready' },
        { id: 'tr-5', label: 'Tranche Epsilon — Zurich Platinum Reserve', assetSymbol: 'PLAT-R', allocationSharePct: 9.4, unitsFormula: '10,884,456,388... × 10^66 units', status: 'Active Custody' },
      ],
    };

    this.holdings.set('TWE-G', { quantity: 6200, avgCostUsd: 132.4 });
    this.holdings.set('CMDTX', { quantity: 310, avgCostUsd: 2345.0 });
    this.holdings.set('AURUM-X', { quantity: 185, avgCostUsd: 2610.5 });
    this.holdings.set('PLAT-R', { quantity: 420, avgCostUsd: 1034.2 });
    this.holdings.set('USD-TWE', { quantity: 450000, avgCostUsd: 1.0 });

    const now = Date.now();
    this.orders = [
      { id: 'ord-9041', symbol: 'TWE-G', assetName: 'TWE Sovereign Governance', side: 'BUY', orderType: 'LIMIT', quantity: 250, limitPriceUsd: 141.5, executedPriceUsd: 0, status: 'OPEN', createdAt: new Date(now - 900_000).toISOString() },
      { id: 'ord-9040', symbol: 'CMDTX', assetName: 'Commodity Trust Index', side: 'BUY', orderType: 'MARKET', quantity: 25, limitPriceUsd: 2418.4, executedPriceUsd: 2418.4, status: 'FILLED', createdAt: new Date(now - 2_400_000).toISOString() },
      { id: 'ord-9039', symbol: 'AURUM-X', assetName: 'Allocated Swiss Gold Bullion', side: 'SELL', orderType: 'LIMIT', quantity: 12, limitPriceUsd: 2685.1, executedPriceUsd: 2685.1, status: 'FILLED', createdAt: new Date(now - 4_800_000).toISOString() },
    ];

    this.trades = [
      { id: 'trd-8821', orderId: 'ord-9040', symbol: 'CMDTX', side: 'BUY', quantity: 25, priceUsd: 2418.4, notionalUsd: 60460, venue: 'TWE-ATS Dark Pool', timestamp: new Date(now - 2_400_000).toISOString() },
      { id: 'trd-8820', orderId: 'ord-9039', symbol: 'AURUM-X', side: 'SELL', quantity: 12, priceUsd: 2685.1, notionalUsd: 32221.2, venue: 'TWE-ATS Lit Book', timestamp: new Date(now - 4_800_000).toISOString() },
      { id: 'trd-8819', orderId: 'ord-9038', symbol: 'TWE-G', side: 'BUY', quantity: 400, priceUsd: 142.1, notionalUsd: 56840, venue: 'TWE-ATS Lit Book', timestamp: new Date(now - 7_200_000).toISOString() },
    ];

    this.notifications = [
      {
        id: 'notif-init-1',
        type: 'trade_fill',
        title: 'Fill Executed · CMDTX',
        message: 'Bought 25 CMDTX @ $2,418.40 on TWE-ATS Dark Pool ($60,460.00)',
        symbol: 'CMDTX',
        side: 'BUY',
        quantity: 25,
        priceUsd: 2418.4,
        notionalUsd: 60460,
        severity: 'nominal',
        timestamp: new Date(now - 2_400_000).toISOString(),
        read: false,
      },
      {
        id: 'notif-init-2',
        type: 'price_alert',
        title: 'RSI Momentum Trigger · TWE-G',
        message: '14-period Wilder RSI crossed above 62.40 threshold on Ethereum primary venue',
        symbol: 'TWE-G',
        priceUsd: 142.85,
        severity: 'gold',
        timestamp: new Date(now - 5_100_000).toISOString(),
        read: false,
      },
    ];

    this.tables = this.build22DomainTables();
    this.worldCommodities = createInitialWorldCommodities();
    this.foundryTokens = generateEnterpriseFoundryBatch({
      seed: 'TWE-GENESIS-2026',
      count: 1000,
      preset: 'custom',
      standard: 'ERC-3643',
      commodities: this.worldCommodities,
    });
    this.foundryBatches = this.foundryTokens.slice(0, 100).map((t) => ({
      id: t.id,
      seed: t.seed,
      batchIndex: t.batchIndex,
      ticker: t.ticker,
      name: t.name,
      kind: t.kind,
      chain: t.chain,
      simulatedSupply: t.simulatedSupply,
      initialPriceUsd: t.initialPriceUsd,
      createdAt: t.createdAt,
    }));

    this.fixSessions = [
      {
        id: 'fix-01',
        version: 'FIX 4.4',
        senderCompId: 'GOLDMAN_MM_01',
        targetCompId: 'TWE_ATS_MATCH',
        ipWhitelist: '198.51.100.14/32',
        throttleMsgPerSec: 2500,
        active: true,
        messagesToday: 418_920,
        apiKeyPrefix: 'twe_fix_88a4',
      },
      {
        id: 'fix-02',
        version: 'FIX 5.0',
        senderCompId: 'CITADEL_SEC_PRIME',
        targetCompId: 'TWE_ATS_MATCH',
        ipWhitelist: '203.0.113.40/28',
        throttleMsgPerSec: 5000,
        active: true,
        messagesToday: 1_194_310,
        apiKeyPrefix: 'twe_fix_19c2',
      },
      {
        id: 'fix-03',
        version: 'FIX 4.2',
        senderCompId: 'HELVETIA_CUSTODY',
        targetCompId: 'TWE_ATS_MATCH',
        ipWhitelist: '192.0.2.88/32',
        throttleMsgPerSec: 800,
        active: false,
        messagesToday: 12_400,
        apiKeyPrefix: 'twe_fix_41f0',
      },
    ];

    this.surveillanceAlerts = [
      {
        id: 'surv-901',
        pattern: 'Layering',
        symbol: 'CMDTX',
        severity: 'Elevated',
        confidenceScore: 84,
        detail: 'Rapid 4-level non-bona-fide bid stacking cancelled within 140ms on Dark Pool.',
        status: 'Open',
        timestamp: new Date(now - 420_000).toISOString(),
      },
      {
        id: 'surv-902',
        pattern: 'Wash Trading',
        symbol: 'TWE-G',
        severity: 'Medium',
        confidenceScore: 71,
        detail: 'Cross-account beneficial owner overlap flagged by ONCHAINID graph check.',
        status: 'Open',
        timestamp: new Date(now - 1_280_000).toISOString(),
      },
      {
        id: 'surv-903',
        pattern: 'Quote Stuffing',
        symbol: 'AURUM-X',
        severity: 'High',
        confidenceScore: 92,
        detail: '1,840 cancel-replace frames/sec exceeded FIX 4.4 throttle envelope; auto-throttled.',
        status: 'Acknowledged',
        timestamp: new Date(now - 3_600_000).toISOString(),
      },
    ];

    this.recordDoubleEntry('ord-9040', 'TOKEN_INVENTORY', 'CASH_CUSTODY_USD', 60460, 'CMDTX', 25, 'DvP Settlement Fill BUY CMDTX');
    this.recordDoubleEntry('ord-9039', 'CASH_CUSTODY_USD', 'TOKEN_INVENTORY', 32221.2, 'AURUM-X', 12, 'DvP Settlement Fill SELL AURUM-X');

    this.companies = [
      { id: 'comp-1', legalName: 'Token World Exchange ATS Holdings Ltd.', jurisdiction: 'Delaware, USA', lei: '549300TWE89ATS00192', role: 'ATS Operator', tier: 'Tier-1', assetsIssued: 14, kybStatus: 'Verified' },
      { id: 'comp-2', legalName: 'Helvetia Digital Bullion Custody AG', jurisdiction: 'Zug, Switzerland', lei: '529900HELVBULLION44', role: 'Qualified Custodian', tier: 'Tier-1', assetsIssued: 8, kybStatus: 'Verified' },
      { id: 'comp-3', legalName: 'Meridian Treasury Tokenization SPV', jurisdiction: 'Cayman Islands', lei: '213800MERIDIANSPV12', role: 'Token Issuer', tier: 'Institutional', assetsIssued: 6, kybStatus: 'Verified' },
      { id: 'comp-4', legalName: 'Chrono-Hash Cryptographic Oracle Corp.', jurisdiction: 'Singapore', lei: '254900CHRONOORACL71', role: 'Oracle Provider', tier: 'Institutional', assetsIssued: 3, kybStatus: 'Verified' },
      { id: 'comp-5', legalName: 'Platinum Liquidity Desk Europe GmbH', jurisdiction: 'Frankfurt, Germany', lei: '391200PLATDESKEUR98', role: 'Liquidity Desk', tier: 'Institutional', assetsIssued: 5, kybStatus: 'Pending Review' },
    ];
    this.filings = [
      { id: 'fil-1', formType: 'Form ATS-N', issuer: 'Token World Exchange ATS Holdings Ltd.', assetSymbol: 'TWE-G', accessionNumber: '0001984211-26-004120', jurisdiction: 'US-SEC', status: 'Effective', filedDate: '2026-09-14' },
      { id: 'fil-2', formType: 'Form D', issuer: 'Meridian Treasury Tokenization SPV', assetSymbol: 'MERIDIAN', accessionNumber: '0001829044-26-001892', jurisdiction: 'US-SEC', status: 'Effective', filedDate: '2026-10-02' },
      { id: 'fil-3', formType: 'MiCA Whitepaper', issuer: 'Helvetia Digital Bullion Custody AG', assetSymbol: 'AURUM-X', accessionNumber: 'ESMA-MICA-2026-88412', jurisdiction: 'EU-ESMA', status: 'Effective', filedDate: '2026-10-19' },
      { id: 'fil-4', formType: 'Reg S', issuer: 'Platinum Liquidity Desk Europe GmbH', assetSymbol: 'PLAT-R', accessionNumber: '0001744019-26-009211', jurisdiction: 'Non-US Offshore', status: 'Under Review', filedDate: '2026-11-04' },
      { id: 'fil-5', formType: 'SOC2 Type II', issuer: 'Chrono-Hash Cryptographic Oracle Corp.', assetSymbol: 'CMDTX', accessionNumber: 'AICPA-SOC2-2026-3109', jurisdiction: 'Global Audit', status: 'Effective', filedDate: '2026-11-08' },
    ];
    this.chains = [
      { id: 'ch-1', name: 'Ethereum', chainId: 1, eip155: 'eip155:1', rpcEndpoint: 'wss://eth-mainnet.twe-rpc.internal', blockHeight: 21_942_810, finalitySeconds: 12.8, gasGwei: 14.2, indexedAssets: 11, status: 'Synced' },
      { id: 'ch-2', name: 'Base', chainId: 8453, eip155: 'eip155:8453', rpcEndpoint: 'wss://base-mainnet.twe-rpc.internal', blockHeight: 26_118_440, finalitySeconds: 2.0, gasGwei: 0.04, indexedAssets: 9, status: 'Synced' },
      { id: 'ch-3', name: 'Arbitrum', chainId: 42161, eip155: 'eip155:42161', rpcEndpoint: 'wss://arb-one.twe-rpc.internal', blockHeight: 304_821_019, finalitySeconds: 0.25, gasGwei: 0.1, indexedAssets: 6, status: 'Synced' },
      { id: 'ch-4', name: 'Polygon', chainId: 137, eip155: 'eip155:137', rpcEndpoint: 'wss://polygon-pos.twe-rpc.internal', blockHeight: 68_412_902, finalitySeconds: 2.2, gasGwei: 32.5, indexedAssets: 5, status: 'Synced' },
      { id: 'ch-5', name: 'Solana', chainId: 101, eip155: 'solana:mainnet', rpcEndpoint: 'wss://sol-mainnet.twe-rpc.internal', blockHeight: 318_940_221, finalitySeconds: 0.4, gasGwei: 0.001, indexedAssets: 4, status: 'Synced' },
      { id: 'ch-6', name: 'Sepolia', chainId: 11155111, eip155: 'eip155:11155111', rpcEndpoint: 'wss://sepolia.twe-rpc.internal', blockHeight: 7_821_104, finalitySeconds: 12.0, gasGwei: 1.8, indexedAssets: 2, status: 'Standby' },
    ];
    this.readinessGates = [
      { id: 'gate-1', category: 'Cryptographic', gateName: 'Web Crypto SHA-256 & CIDv1 Pin Integrity', owner: 'CMDTX Codex', passed: true, evidenceRef: 'sha256:9f84b2c...71e0' },
      { id: 'gate-2', category: 'Custody', gateName: 'Sovereign Vault (2^256 - 1) BigInt Serialization Parity', owner: 'Vault Engineering', passed: true, evidenceRef: 'UUID af230af8-bf63-4308-968a-9962ed14e565' },
      { id: 'gate-3', category: 'Compliance', gateName: 'Form ATS-N & MiCA Jurisdiction Geo-Fence Active', owner: 'Legal & EDGAR', passed: true, evidenceRef: '0001984211-26-004120' },
      { id: 'gate-4', category: 'Liquidity', gateName: 'Constant-Product AMM Slippage Guardrail (<= 1.5%)', owner: 'Risk Desk', passed: true, evidenceRef: 'AMM x*y=k Invariant Check' },
      { id: 'gate-5', category: 'Cryptographic', gateName: 'ERC-20 0xa9059cbb Calldata Zero-Address Filter', owner: 'Security Audit', passed: true, evidenceRef: 'Calldata Audit v2.4' },
    ];
  }

  private build22DomainTables(): DomainTableSpec[] {
    return [
      // System 1: AI Generation Batches (5 tables)
      { id: 't-01', tableName: 'ai_generation_batches', systemId: 'ai-generation-batches', systemLabel: 'System I · AI Generation Batches', rowCount: 142, writeMode: 'Mutable Indexed', primaryKey: 'batch_id (UUID)', columns: ['batch_id', 'seed_hash', 'model_alias', 'concept_count', 'status', 'created_at'], invariant: 'Seed determinism guarantees reproducible concept generation up to 1,000 items/batch.', sampleRows: [{ batch_id: 'b-901a', seed_hash: '0x71e4...9a', model_alias: 'gemini-4-hydrogen', concept_count: 250, status: 'COMMITTED' }] },
      { id: 't-02', tableName: 'ai_concept_prompts', systemId: 'ai-generation-batches', systemLabel: 'System I · AI Generation Batches', rowCount: 1840, writeMode: 'Append-Only', primaryKey: 'prompt_id (UUID)', columns: ['prompt_id', 'batch_id', 'system_prompt', 'aspect_ratio', 'created_at'], invariant: 'Prompts are never mutated post-execution to preserve audit lineage.', sampleRows: [{ prompt_id: 'p-4410', batch_id: 'b-901a', system_prompt: 'Graphite bullion crest emblem', aspect_ratio: '1:1' }] },
      { id: 't-03', tableName: 'ai_rendered_outputs', systemId: 'ai-generation-batches', systemLabel: 'System I · AI Generation Batches', rowCount: 1836, writeMode: 'Immutable Snapshot', primaryKey: 'output_id (UUID)', columns: ['output_id', 'prompt_id', 'sha256_digest', 'ipfs_cidv1', 'mime_type'], invariant: 'Every rendered artifact carries a verified Web Crypto SHA-256 digest.', sampleRows: [{ output_id: 'out-882', prompt_id: 'p-4410', sha256_digest: 'e3b0c442...98fc', ipfs_cidv1: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi', mime_type: 'image/svg+xml' }] },
      { id: 't-04', tableName: 'ai_trait_matrices', systemId: 'ai-generation-batches', systemLabel: 'System I · AI Generation Batches', rowCount: 64, writeMode: 'Mutable Indexed', primaryKey: 'matrix_id (UUID)', columns: ['matrix_id', 'collection_slug', 'layer_name', 'rarity_weights_json'], invariant: 'Layer rarity weights normalize strictly to 100.00% per collection.', sampleRows: [{ matrix_id: 'mx-12', collection_slug: 'twe-sovereign-sigil', layer_name: 'Chassis Metal', rarity_weights_json: '{"Graphite":45,"Gold":20,"Platinum":35}' }] },
      { id: 't-05', tableName: 'ai_batch_audit_logs', systemId: 'ai-generation-batches', systemLabel: 'System I · AI Generation Batches', rowCount: 4920, writeMode: 'Append-Only', primaryKey: 'log_seq (BIGINT)', columns: ['log_seq', 'batch_id', 'actor_id', 'event_type', 'recorded_at'], invariant: 'Strict append-only sequence without UPDATE/DELETE privileges.', sampleRows: [{ log_seq: 4920, batch_id: 'b-901a', actor_id: 'sandbox-ops', event_type: 'PIN_CIDV1_COMPLETE' }] },

      // System 2: Auth & Session Tokens (5 tables)
      { id: 't-06', tableName: 'auth_session_tokens', systemId: 'auth-session-tokens', systemLabel: 'System II · Auth & Session Tokens', rowCount: 318, writeMode: 'Mutable Indexed', primaryKey: 'jti (UUID)', columns: ['jti', 'subject_id', 'scope', 'issued_at', 'expires_at'], invariant: 'Short-lived bearer sessions expire after 900s unless refreshed via family.', sampleRows: [{ jti: 'jti-7812c', subject_id: 'usr_inst_01', scope: 'twe:trade twe:vault:read', expires_at: '2026-11-16T21:30:00Z' }] },
      { id: 't-07', tableName: 'auth_refresh_families', systemId: 'auth-session-tokens', systemLabel: 'System II · Auth & Session Tokens', rowCount: 94, writeMode: 'Mutable Indexed', primaryKey: 'family_id (UUID)', columns: ['family_id', 'parent_jti', 'generation', 'compromised'], invariant: 'Refresh token reuse immediately invalidates the entire token family.', sampleRows: [{ family_id: 'fam-301', parent_jti: 'jti-7812c', generation: 4, compromised: false }] },
      { id: 't-08', tableName: 'auth_csrf_nonces', systemId: 'auth-session-tokens', systemLabel: 'System II · Auth & Session Tokens', rowCount: 1204, writeMode: 'Mutable Indexed', primaryKey: 'nonce (CHAR 32)', columns: ['nonce', 'session_jti', 'consumed', 'ttl_expires'], invariant: 'Single-use cryptographic nonces prevent state-changing replay attacks.', sampleRows: [{ nonce: '9f4a21b8c0e7...', session_jti: 'jti-7812c', consumed: true }] },
      { id: 't-09', tableName: 'auth_api_keys', systemId: 'auth-session-tokens', systemLabel: 'System II · Auth & Session Tokens', rowCount: 27, writeMode: 'Mutable Indexed', primaryKey: 'key_id (UUID)', columns: ['key_id', 'prefix', 'sha256_secret', 'rate_limit_rpm', 'active'], invariant: 'Raw secret never persisted; only salted SHA-256 digest stored.', sampleRows: [{ key_id: 'ak-09', prefix: 'twe_live_84b', sha256_secret: '9a8b7c6d...11e2', rate_limit_rpm: 1200, active: true }] },
      { id: 't-10', tableName: 'auth_revocation_lists', systemId: 'auth-session-tokens', systemLabel: 'System II · Auth & Session Tokens', rowCount: 18, writeMode: 'Append-Only', primaryKey: 'revocation_id (UUID)', columns: ['revocation_id', 'jti_or_key', 'reason_code', 'revoked_at'], invariant: 'Checked prior to all privileged Sovereign Vault or batch mutations.', sampleRows: [{ revocation_id: 'rev-18', jti_or_key: 'jti-1044a', reason_code: 'SESSION_ROTATED', revoked_at: '2026-11-16T18:10:00Z' }] },

      // System 3: Digital Assets (7 tables)
      { id: 't-11', tableName: 'digital_assets', systemId: 'digital-assets', systemLabel: 'System III · Digital Assets', rowCount: this.assets.length, writeMode: 'Mutable Indexed', primaryKey: 'asset_id (VARCHAR)', columns: ['asset_id', 'symbol', 'name', 'kind', 'chain', 'price_usd', 'rsi_14'], invariant: 'Canonical asset registry supporting server-side sorting & chunked pagination.', sampleRows: [{ asset_id: 'asset-001', symbol: 'TWE-G', name: 'TWE Sovereign Governance', kind: 'Tokens', chain: 'Ethereum', price_usd: 142.85, rsi_14: 62.4 }] },
      { id: 't-12', tableName: 'asset_chain_deployments', systemId: 'digital-assets', systemLabel: 'System III · Digital Assets', rowCount: 54, writeMode: 'Mutable Indexed', primaryKey: 'deployment_id (UUID)', columns: ['deployment_id', 'asset_id', 'eip155_chain', 'contract_address', 'standard'], invariant: 'Contract addresses validated against EIP-55 checksum rules.', sampleRows: [{ deployment_id: 'dep-01', asset_id: 'asset-001', eip155_chain: 'eip155:1', contract_address: '0x004a9b...7d6e', standard: 'ERC-20' }] },
      { id: 't-13', tableName: 'asset_orderbooks', systemId: 'digital-assets', systemLabel: 'System III · Digital Assets', rowCount: 288, writeMode: 'Mutable Indexed', primaryKey: 'level_id (UUID)', columns: ['level_id', 'symbol', 'side', 'price_usd', 'size'], invariant: 'Best bid remains strictly below best ask in rested orderbook snapshots.', sampleRows: [{ level_id: 'ob-1', symbol: 'TWE-G', side: 'BID', price_usd: 142.7, size: 1400 }] },
      { id: 't-14', tableName: 'asset_trade_executions', systemId: 'digital-assets', systemLabel: 'System III · Digital Assets', rowCount: 412, writeMode: 'Append-Only', primaryKey: 'trade_id (UUID)', columns: ['trade_id', 'order_id', 'symbol', 'side', 'qty', 'fill_price_usd', 'executed_at'], invariant: 'Every trade execution broadcasts an immutable SSE event to subscribers.', sampleRows: [{ trade_id: 'trd-8821', order_id: 'ord-9040', symbol: 'CMDTX', side: 'BUY', qty: 25, fill_price_usd: 2418.4 }] },
      { id: 't-15', tableName: 'asset_vault_custody', systemId: 'digital-assets', systemLabel: 'System III · Digital Assets', rowCount: 36, writeMode: 'Mutable Indexed', primaryKey: 'custody_id (UUID)', columns: ['custody_id', 'vault_uuid', 'asset_id', 'uint256_units', 'tranche_status'], invariant: 'Sum of allocated uint256 units never exceeds 2^256 - 1 ceiling.', sampleRows: [{ custody_id: 'cus-01', vault_uuid: 'af230af8-bf63-4308-968a-9962ed14e565', asset_id: 'asset-001', tranche_status: 'Locked' }] },
      { id: 't-16', tableName: 'asset_compliance_attestations', systemId: 'digital-assets', systemLabel: 'System III · Digital Assets', rowCount: 72, writeMode: 'Immutable Snapshot', primaryKey: 'attestation_id (UUID)', columns: ['attestation_id', 'asset_id', 'jurisdiction', 'kyc_tier', 'approved'], invariant: 'Restricted assets blocked from retail order matching unless attested.', sampleRows: [{ attestation_id: 'att-11', asset_id: 'asset-002', jurisdiction: 'US-SEC / EU-ESMA', kyc_tier: 'QIB', approved: true }] },
      { id: 't-17', tableName: 'asset_edgar_filings', systemId: 'digital-assets', systemLabel: 'System III · Digital Assets', rowCount: 19, writeMode: 'Immutable Snapshot', primaryKey: 'accession_no (VARCHAR)', columns: ['accession_no', 'form_type', 'asset_symbol', 'jurisdiction', 'status'], invariant: 'Accession numbers cross-linked to EDGAR & MiCA public registries.', sampleRows: [{ accession_no: '0001984211-26-004120', form_type: 'Form ATS-N', asset_symbol: 'TWE-G', status: 'Effective' }] },

      // System 4: Append-Only Application Credits (5 tables)
      { id: 't-18', tableName: 'credit_ledger_entries', systemId: 'application-credits', systemLabel: 'System IV · Append-Only Credits', rowCount: 9412, writeMode: 'Append-Only', primaryKey: 'entry_seq (BIGINT)', columns: ['entry_seq', 'account_id', 'delta_credits', 'balance_after', 'reason'], invariant: 'Double-entry append-only journal; corrections require offsetting entries.', sampleRows: [{ entry_seq: 9412, account_id: 'acct_twe_ops', delta_credits: 50000, balance_after: 1245000, reason: 'SETTLEMENT_TOPUP' }] },
      { id: 't-19', tableName: 'credit_mint_batches', systemId: 'application-credits', systemLabel: 'System IV · Append-Only Credits', rowCount: 41, writeMode: 'Append-Only', primaryKey: 'mint_id (UUID)', columns: ['mint_id', 'authorized_by', 'total_credits', 'merkle_root'], invariant: 'Requires dual-custody sign-off before emitting ledger entries.', sampleRows: [{ mint_id: 'mint-41', authorized_by: 'sovereign-council', total_credits: 1000000, merkle_root: '0x8831...bc19' }] },
      { id: 't-20', tableName: 'credit_consumption_events', systemId: 'application-credits', systemLabel: 'System IV · Append-Only Credits', rowCount: 6820, writeMode: 'Append-Only', primaryKey: 'event_id (UUID)', columns: ['event_id', 'feature', 'units_consumed', 'ledger_entry_seq'], invariant: 'Idempotency key prevents duplicate debiting on network retries.', sampleRows: [{ event_id: 'con-6820', feature: 'FOUNDRY_BATCH_1000', units_consumed: 250, ledger_entry_seq: 9411 }] },
      { id: 't-21', tableName: 'credit_settlement_checkpoints', systemId: 'application-credits', systemLabel: 'System IV · Append-Only Credits', rowCount: 128, writeMode: 'Immutable Snapshot', primaryKey: 'checkpoint_id (INT)', columns: ['checkpoint_id', 'up_to_seq', 'total_supply_credits', 'root_hash'], invariant: 'Cryptographic Merkle proof seals ledger state every 100 entries.', sampleRows: [{ checkpoint_id: 128, up_to_seq: 9400, total_supply_credits: 24500000, root_hash: '0x41cd...8a02' }] },
      { id: 't-22', tableName: 'credit_sovereign_allocations', systemId: 'application-credits', systemLabel: 'System IV · Append-Only Credits', rowCount: 12, writeMode: 'Append-Only', primaryKey: 'alloc_id (UUID)', columns: ['alloc_id', 'vault_uuid', 'tranche_label', 'uint256_bound'], invariant: 'Anchored directly to Sovereign Vault UUID af230af8-bf63-4308-968a-9962ed14e565.', sampleRows: [{ alloc_id: 'al-01', vault_uuid: 'af230af8-bf63-4308-968a-9962ed14e565', tranche_label: 'Tranche Alpha', uint256_bound: '2^256 - 1' }] },
    ];
  }

  public registerSseClient(res: Response): void {
    this.sseClients.add(res);
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', unreadCount: this.notifications.filter((n) => !n.read).length })}\n\n`);
  }

  public removeSseClient(res: Response): void {
    this.sseClients.delete(res);
  }

  private emitNotification(event: Omit<TradeNotificationEvent, 'id' | 'timestamp' | 'read'>): TradeNotificationEvent {
    const full: TradeNotificationEvent = {
      ...event,
      id: `notif-${randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    this.notifications.unshift(full);
    if (this.notifications.length > 60) {
      this.notifications = this.notifications.slice(0, 60);
    }

    const payload = `event: trade_notification\ndata: ${JSON.stringify(full)}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch {
        this.sseClients.delete(client);
      }
    }
    return full;
  }

  public getAssetsPaginated(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    kind?: string;
    chain?: string;
    sortField?: SortField;
    sortDir?: SortDirection;
  }): PaginatedAssetsResponse {
    const pageSizeRaw = Number(params.pageSize || 10);
    const pageSize = [5, 10, 20, 25, 50].includes(pageSizeRaw) ? pageSizeRaw : 10;
    const search = (params.search || '').trim().toLowerCase();
    const kind = params.kind && params.kind !== 'ALL' ? params.kind : undefined;
    const chain = params.chain && params.chain !== 'ALL' ? params.chain : undefined;
    const sortField: SortField =
      params.sortField === 'kind' || params.sortField === 'chain' ? params.sortField : 'name';
    const sortDir: SortDirection = params.sortDir === 'desc' ? 'desc' : 'asc';

    // Dynamic classification summary across search + chain filter (or full catalog)
    const searchAndChainFiltered = this.assets.filter((item) => {
      const matchesSearch =
        !search ||
        item.name.toLowerCase().includes(search) ||
        item.symbol.toLowerCase().includes(search) ||
        item.contractAddress.toLowerCase().includes(search);
      const matchesChain = !chain || item.chain === chain;
      return matchesSearch && matchesChain;
    });

    const classificationSummary: AssetClassificationSummary = {
      Tokens: 0,
      NFTs: 0,
      Commodities: 0,
      Currencies: 0,
      total: searchAndChainFiltered.length,
    };
    for (const item of searchAndChainFiltered) {
      classificationSummary[item.kind] += 1;
    }

    const fullyFiltered = kind
      ? searchAndChainFiltered.filter((item) => item.kind === kind)
      : searchAndChainFiltered;

    const sorted = [...fullyFiltered].sort((a, b) => {
      const valA = a[sortField].toLowerCase();
      const valB = b[sortField].toLowerCase();
      const cmp = valA.localeCompare(valB);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    const totalCount = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const page = Math.min(Math.max(1, Number(params.page || 1)), totalPages);
    const startIdx = (page - 1) * pageSize;
    const items = sorted.slice(startIdx, startIdx + pageSize);

    return {
      items,
      page,
      pageSize,
      totalCount,
      totalPages,
      sort: { field: sortField, direction: sortDir },
      classificationSummary,
    };
  }

  public promoteAtlasAsset(record: TweAssetRecord): { asset: TweAssetRecord; created: boolean } {
    const existing = this.assets.find(
      (a) => a.symbol === record.symbol || a.contractAddress === record.contractAddress
    );
    if (existing) {
      return { asset: existing, created: false };
    }
    const promoted: TweAssetRecord = {
      ...record,
      id: `asset-atl-${randomUUID().slice(0, 8)}`,
      updatedAt: new Date().toISOString(),
    };
    this.assets.unshift(promoted);
    this.publishSystemAlert({
      type: 'batch_job',
      title: `Atlas Instrument Promoted · ${promoted.symbol}`,
      message: `Promoted ${promoted.name} (${promoted.kind} on ${promoted.chain}) to live ATS trading book @ $${promoted.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`,
      symbol: promoted.symbol,
      severity: 'gold',
    });
    return { asset: promoted, created: true };
  }

  public startBatchDuplicate(ids: string[]): BatchJobStatus {
    const validIds = ids.filter((id) => this.assets.some((a) => a.id === id));
    const jobId = `job-dup-${randomUUID().slice(0, 8)}`;
    const job: BatchJobStatus = {
      jobId,
      operation: 'duplicate',
      total: validIds.length,
      processed: 0,
      status: validIds.length === 0 ? 'completed' : 'running',
      affectedIds: validIds,
      message: `Duplicating ${validIds.length} selected asset record(s)...`,
      startedAt: new Date().toISOString(),
    };
    this.batchJobs.set(jobId, job);

    if (validIds.length > 0) {
      void this.runBatchDuplicateWorker(jobId, validIds);
    }
    return job;
  }

  private async runBatchDuplicateWorker(jobId: string, ids: string[]): Promise<void> {
    const job = this.batchJobs.get(jobId);
    if (!job) return;

    for (const id of ids) {
      await new Promise((r) => setTimeout(r, 90));
      const original = this.assets.find((a) => a.id === id);
      if (original) {
        const cloneSuffix = Math.floor(100 + Math.random() * 899);
        const clone: TweAssetRecord = {
          ...original,
          id: `asset-${randomUUID().slice(0, 6)}`,
          symbol: `${original.symbol}-C${cloneSuffix}`,
          name: `${original.name} (Clone #${cloneSuffix})`,
          updatedAt: new Date().toISOString(),
        };
        this.assets.unshift(clone);
      }
      job.processed += 1;
    }

    job.status = 'completed';
    job.completedAt = new Date().toISOString();
    job.message = `Duplicated ${job.processed} asset record(s) into Digital Assets registry.`;
    this.syncAssetTableRowCount();

    this.emitNotification({
      type: 'batch_job',
      title: 'Batch Duplicate Completed',
      message: `${job.processed} asset records cloned inside Token Atlas.`,
      severity: 'gold',
    });
  }

  public startBatchDelete(ids: string[]): BatchJobStatus {
    const validIds = ids.filter((id) => this.assets.some((a) => a.id === id));
    const jobId = `job-del-${randomUUID().slice(0, 8)}`;
    const job: BatchJobStatus = {
      jobId,
      operation: 'delete',
      total: validIds.length,
      processed: 0,
      status: validIds.length === 0 ? 'completed' : 'running',
      affectedIds: validIds,
      message: `Deleting ${validIds.length} selected asset record(s)...`,
      startedAt: new Date().toISOString(),
    };
    this.batchJobs.set(jobId, job);

    if (validIds.length > 0) {
      void this.runBatchDeleteWorker(jobId, validIds);
    }
    return job;
  }

  private async runBatchDeleteWorker(jobId: string, ids: string[]): Promise<void> {
    const job = this.batchJobs.get(jobId);
    if (!job) return;

    for (const id of ids) {
      await new Promise((r) => setTimeout(r, 90));
      this.assets = this.assets.filter((a) => a.id !== id);
      job.processed += 1;
    }

    job.status = 'completed';
    job.completedAt = new Date().toISOString();
    job.message = `Removed ${job.processed} asset record(s) from Token Atlas.`;
    this.syncAssetTableRowCount();

    this.emitNotification({
      type: 'batch_job',
      title: 'Batch Deletion Completed',
      message: `${job.processed} asset records purged after inline confirmation.`,
      severity: 'warning',
    });
  }

  private syncAssetTableRowCount(): void {
    const digitalTable = this.tables.find((t) => t.tableName === 'digital_assets');
    if (digitalTable) digitalTable.rowCount = this.assets.length;
  }

  public getBatchJob(jobId: string): BatchJobStatus | undefined {
    return this.batchJobs.get(jobId);
  }

  private recordDoubleEntry(
    txRef: string,
    debitAccount: string,
    creditAccount: string,
    amountUsd: number,
    assetSymbol: string,
    units: number,
    memo: string
  ): void {
    const timestamp = new Date().toISOString();
    this.journalSeq += 1;
    this.journalEntries.unshift({
      seq: this.journalSeq,
      txRef,
      account: debitAccount,
      entryType: 'DEBIT',
      amountUsd: Number(amountUsd.toFixed(2)),
      assetSymbol,
      units,
      memo,
      timestamp,
    });
    this.journalSeq += 1;
    this.journalEntries.unshift({
      seq: this.journalSeq,
      txRef,
      account: creditAccount,
      entryType: 'CREDIT',
      amountUsd: Number(amountUsd.toFixed(2)),
      assetSymbol,
      units,
      memo,
      timestamp,
    });
    if (this.journalEntries.length > 200) {
      this.journalEntries = this.journalEntries.slice(0, 200);
    }
  }

  public placeOrder(input: {
    symbol: string;
    side: 'BUY' | 'SELL';
    orderType: InstitutionalOrderType;
    quantity: number;
    limitPriceUsd?: number;
  }): { order: MarketOrder; trade?: TradeExecution; notification: TradeNotificationEvent } {
    const asset = this.assets.find((a) => a.symbol === input.symbol) ?? this.assets[0];
    const qty = Math.max(0.01, Number(input.quantity || 1));
    const limitPrice = Number(input.limitPriceUsd || asset.priceUsd);
    const immediateTypes: InstitutionalOrderType[] = ['MARKET', 'IOC', 'FOK', 'TWAP', 'VWAP', 'PEGGED'];
    const shouldFillImmediately =
      immediateTypes.includes(input.orderType) ||
      (input.side === 'BUY' && limitPrice >= asset.priceUsd * 0.995) ||
      (input.side === 'SELL' && limitPrice <= asset.priceUsd * 1.005);

    const execPrice =
      input.orderType === 'LIMIT' || input.orderType === 'ICEBERG' ? limitPrice : asset.priceUsd;
    const notional = Number((qty * execPrice).toFixed(2));

    const order: MarketOrder = {
      id: `ord-${Math.floor(1000 + Math.random() * 9000)}`,
      symbol: asset.symbol,
      assetName: asset.name,
      side: input.side,
      orderType: input.orderType,
      quantity: qty,
      limitPriceUsd: limitPrice,
      executedPriceUsd: shouldFillImmediately ? execPrice : 0,
      status: shouldFillImmediately ? 'FILLED' : 'OPEN',
      complianceStatus: 'RULE_144_CLEARED',
      createdAt: new Date().toISOString(),
    };
    this.orders.unshift(order);

    let trade: TradeExecution | undefined;
    let notification: TradeNotificationEvent;

    if (shouldFillImmediately) {
      trade = {
        id: `trd-${Math.floor(1000 + Math.random() * 9000)}`,
        orderId: order.id,
        symbol: asset.symbol,
        side: input.side,
        quantity: qty,
        priceUsd: execPrice,
        notionalUsd: notional,
        venue: `TWE-ATS Deterministic (${input.orderType})`,
        timestamp: new Date().toISOString(),
      };
      this.trades.unshift(trade);

      const current = this.holdings.get(asset.symbol) ?? { quantity: 0, avgCostUsd: execPrice };
      if (input.side === 'BUY') {
        const newQty = current.quantity + qty;
        const newAvg = (current.quantity * current.avgCostUsd + notional) / newQty;
        this.holdings.set(asset.symbol, { quantity: Number(newQty.toFixed(4)), avgCostUsd: Number(newAvg.toFixed(4)) });
        this.paperCashUsd = Math.max(0, Number((this.paperCashUsd - notional).toFixed(2)));
        this.recordDoubleEntry(order.id, 'TOKEN_INVENTORY', 'CASH_CUSTODY_USD', notional, asset.symbol, qty, `DvP Fill ${input.orderType} BUY ${asset.symbol}`);
      } else {
        const newQty = Math.max(0, current.quantity - qty);
        this.holdings.set(asset.symbol, { quantity: Number(newQty.toFixed(4)), avgCostUsd: current.avgCostUsd });
        this.paperCashUsd = Number((this.paperCashUsd + notional).toFixed(2));
        this.recordDoubleEntry(order.id, 'CASH_CUSTODY_USD', 'TOKEN_INVENTORY', notional, asset.symbol, qty, `DvP Fill ${input.orderType} SELL ${asset.symbol}`);
      }

      const tradeTable = this.tables.find((t) => t.tableName === 'asset_trade_executions');
      if (tradeTable) tradeTable.rowCount += 1;

      notification = this.emitNotification({
        type: 'trade_fill',
        title: `Fill Executed (${input.orderType}) · ${asset.symbol}`,
        message: `${input.side === 'BUY' ? 'Bought' : 'Sold'} ${qty} ${asset.symbol} @ $${execPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ($${notional.toLocaleString('en-US', { minimumFractionDigits: 2 })})`,
        symbol: asset.symbol,
        side: input.side,
        quantity: qty,
        priceUsd: execPrice,
        notionalUsd: notional,
        severity: input.side === 'BUY' ? 'nominal' : 'gold',
      });
    } else {
      if (input.side === 'BUY') {
        this.reservedUsd = Number((this.reservedUsd + notional).toFixed(2));
        this.recordDoubleEntry(order.id, 'RESERVED_ESCROW_USD', 'CASH_CUSTODY_USD', notional, asset.symbol, qty, `Reserve Escrow ${input.orderType} BUY ${asset.symbol}`);
      }
      notification = this.emitNotification({
        type: 'order_placed',
        title: `${input.orderType} Order Rested · ${asset.symbol}`,
        message: `Resting ${input.side} ${qty} ${asset.symbol} limit @ $${limitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        symbol: asset.symbol,
        side: input.side,
        quantity: qty,
        priceUsd: limitPrice,
        notionalUsd: notional,
        severity: 'gold',
      });
    }

    this.vault.paperCashUsd = this.paperCashUsd;
    this.vault.reservedUsd = this.reservedUsd;

    return { order, trade, notification };
  }

  public cancelOrder(orderId: string): { order?: MarketOrder; notification?: TradeNotificationEvent } {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order || order.status !== 'OPEN') {
      return {};
    }
    order.status = 'CANCELLED';
    if (order.side === 'BUY') {
      this.reservedUsd = Math.max(0, Number((this.reservedUsd - order.quantity * order.limitPriceUsd).toFixed(2)));
      this.vault.reservedUsd = this.reservedUsd;
    }
    const notification = this.emitNotification({
      type: 'order_cancelled',
      title: `Order Cancelled · ${order.symbol}`,
      message: `Cancelled ${order.side} ${order.quantity} ${order.symbol} @ $${order.limitPriceUsd.toFixed(2)}`,
      symbol: order.symbol,
      side: order.side,
      severity: 'warning',
    });
    return { order, notification };
  }

  public advanceMarketTick(): { updatedAssets: TweAssetRecord[]; notification: TradeNotificationEvent } {
    const nowHour = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
    const movers: string[] = [];

    for (const asset of this.assets) {
      const shock = (Math.random() - 0.48) * 0.024;
      const decimals = asset.priceUsd < 10 ? 4 : 2;
      const nextPrice = Math.max(0.0001, Number((asset.priceUsd * (1 + shock)).toFixed(decimals)));
      asset.priceUsd = nextPrice;
      const nextSeries = [...asset.sparkline24h.slice(1), {
        hour: nowHour,
        price: nextPrice,
        volume: Math.round(asset.sparkline24h[asset.sparkline24h.length - 1].volume * (0.9 + Math.random() * 0.25)),
      }];
      asset.sparkline24h = nextSeries;
      const first = nextSeries[0].price;
      asset.change24hPct = Number((((nextPrice - first) / first) * 100).toFixed(2));
      asset.rsi14 = computeWildersRsi14(nextSeries.map((p) => p.price));
      asset.updatedAt = new Date().toISOString();

      if (Math.abs(shock) > 0.009) {
        movers.push(`${asset.symbol} (${shock >= 0 ? '+' : ''}${(shock * 100).toFixed(2)}%)`);
      }
    }

    // Check if any resting limit orders should match
    for (const order of this.orders) {
      if (order.status !== 'OPEN') continue;
      const asset = this.assets.find((a) => a.symbol === order.symbol);
      if (!asset) continue;
      const crossed =
        (order.side === 'BUY' && asset.priceUsd <= order.limitPriceUsd) ||
        (order.side === 'SELL' && asset.priceUsd >= order.limitPriceUsd);
      if (crossed) {
        order.status = 'FILLED';
        order.executedPriceUsd = asset.priceUsd;
        const notional = Number((order.quantity * asset.priceUsd).toFixed(2));
        this.trades.unshift({
          id: `trd-${Math.floor(1000 + Math.random() * 9000)}`,
          orderId: order.id,
          symbol: order.symbol,
          side: order.side,
          quantity: order.quantity,
          priceUsd: asset.priceUsd,
          notionalUsd: notional,
          venue: 'TWE-ATS Tick Matcher',
          timestamp: new Date().toISOString(),
        });
        this.emitNotification({
          type: 'trade_fill',
          title: `Limit Triggered · ${order.symbol}`,
          message: `Resting ${order.side} ${order.quantity} ${order.symbol} filled at $${asset.priceUsd.toFixed(2)}`,
          symbol: order.symbol,
          side: order.side,
          quantity: order.quantity,
          priceUsd: asset.priceUsd,
          notionalUsd: notional,
          severity: 'nominal',
        });
      }
    }

    this.vault.lastAuditBlock += 1;

    const topMover = movers.slice(0, 3).join(', ') || 'TWE-G, CMDTX, AURUM-X';
    const notification = this.emitNotification({
      type: 'market_tick',
      title: 'Market Sample Tick Advanced',
      message: `24h sparklines & 14-period Wilder RSI recalculated across ${this.assets.length} assets. Notable: ${topMover}`,
      severity: 'gold',
    });

    return { updatedAssets: this.assets.slice(0, 8), notification };
  }

  public generateFoundryConcepts(
    seedInput: string,
    countInput: number,
    preset: 'custom' | 'currencies' | 'commodities' = 'custom',
    standard: 'ERC-3643' | 'ERC-20' | 'ERC-1400' = 'ERC-3643'
  ): FoundryTokenArtifact[] {
    const tokens = generateEnterpriseFoundryBatch({
      seed: seedInput,
      count: countInput,
      preset,
      standard,
      commodities: this.worldCommodities,
    });
    this.foundryTokens = tokens;
    this.foundryBatches = tokens.slice(0, 100).map((t) => ({
      id: t.id,
      seed: t.seed,
      batchIndex: t.batchIndex,
      ticker: t.ticker,
      name: t.name,
      kind: t.kind,
      chain: t.chain,
      simulatedSupply: t.simulatedSupply,
      initialPriceUsd: t.initialPriceUsd,
      createdAt: t.createdAt,
    }));

    const batchTable = this.tables.find((t) => t.tableName === 'ai_generation_batches');
    if (batchTable) batchTable.rowCount += 1;
    return tokens;
  }

  public getFoundryTokensPaginated(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    kind?: string;
  }) {
    const pageSize = Math.min(100, Math.max(10, Number(params.pageSize || 25)));
    const search = (params.search || '').trim().toLowerCase();
    const kind = params.kind && params.kind !== 'ALL' ? params.kind : undefined;

    const filtered = this.foundryTokens.filter((t) => {
      const matchSearch =
        !search ||
        t.ticker.toLowerCase().includes(search) ||
        t.name.toLowerCase().includes(search) ||
        t.contractAddress.toLowerCase().includes(search);
      const matchKind = !kind || t.kind === kind;
      return matchSearch && matchKind;
    });

    const totalCount = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const page = Math.min(Math.max(1, Number(params.page || 1)), totalPages);
    const start = (page - 1) * pageSize;

    return {
      items: filtered.slice(start, start + pageSize),
      page,
      pageSize,
      totalCount,
      totalPages,
      deployedCount: this.foundryTokens.filter((t) => t.deployed).length,
    };
  }

  public getFoundryTokenDetail(id: string): FoundryTokenDetail | undefined {
    const token = this.foundryTokens.find((t) => t.id === id);
    return token ? buildFoundryTokenDetail(token) : undefined;
  }

  public deployFoundryTokens(params: { id?: string; deployLimit?: number }): {
    deployedCount: number;
    newlyAddedSymbols: string[];
  } {
    const targets = params.id
      ? this.foundryTokens.filter((t) => t.id === params.id)
      : this.foundryTokens.filter((t) => !t.deployed).slice(0, Math.min(500, Number(params.deployLimit || 50)));

    const newlyAddedSymbols: string[] = [];
    for (const tok of targets) {
      tok.deployed = true;
      if (!this.assets.some((a) => a.symbol === tok.ticker)) {
        const sparkline = deterministicSparkline(tok.batchIndex, tok.initialPriceUsd, 0.018);
        this.assets.unshift({
          id: `asset-fnd-${tok.batchIndex}-${tok.ticker.toLowerCase()}`,
          symbol: tok.ticker,
          name: tok.name,
          kind: tok.kind,
          chain: tok.chain,
          chainId: tok.chainId,
          standard: tok.standard,
          contractAddress: tok.contractAddress,
          priceUsd: tok.initialPriceUsd,
          change24hPct: 0.85,
          volume24hUsd: 240_000,
          marketCapUsd: Math.round(tok.initialPriceUsd * 1_000_000),
          supplyFormatted: tok.simulatedSupply,
          rsi14: computeWildersRsi14(sparkline.map((p) => p.price)),
          sparkline24h: sparkline,
          status: 'Active',
          sovereignVaultAllocationPct: 0.05,
          watchlisted: false,
          updatedAt: new Date().toISOString(),
        });
        newlyAddedSymbols.push(tok.ticker);
      }
    }

    this.syncAssetTableRowCount();
    if (targets.length > 0) {
      this.emitNotification({
        type: 'batch_job',
        title: `Smart Contracts Deployed (${targets.length})`,
        message: `Deployed ${targets.length} OpenZeppelin ${targets[0].standard} contract(s) with CloudHSM custody into Token Atlas.`,
        severity: 'nominal',
      });
    }
    return { deployedCount: targets.length, newlyAddedSymbols };
  }

  public getWorldCommodities(): WorldCommodity[] {
    return this.worldCommodities;
  }

  public tokenizeCommodities(params: { code?: string; all?: boolean }): {
    tokenizedCount: number;
    commodities: WorldCommodity[];
  } {
    const targets = params.all
      ? this.worldCommodities
      : this.worldCommodities.filter((c) => c.code === params.code);

    let count = 0;
    for (const com of targets) {
      if (!com.contractAddress) {
        com.contractAddress =
          '0x' + createHash('sha256').update(`commodity-${com.code}-${com.originIso}`).digest('hex').slice(0, 40);
      }
      if (!com.tokenized) {
        com.tokenized = true;
        count += 1;
      }
      if (!this.assets.some((a) => a.symbol === com.tokenSymbol)) {
        const sparkline = deterministicSparkline(com.portCode + com.originIso, com.priceUsd, com.change24hPct / 100);
        this.assets.unshift({
          id: `asset-com-${com.code.toLowerCase()}`,
          symbol: com.tokenSymbol,
          name: `${com.name} (${com.exchange})`,
          kind: 'Commodities',
          chain: 'Base',
          chainId: 8453,
          standard: 'ERC-3643',
          contractAddress: com.contractAddress,
          priceUsd: com.priceUsd,
          change24hPct: com.change24hPct,
          volume24hUsd: Math.round(com.priceUsd * 45_000),
          marketCapUsd: Math.round(com.priceUsd * 12_500_000),
          supplyFormatted: '12,500,000',
          rsi14: computeWildersRsi14(sparkline.map((p) => p.price)),
          sparkline24h: sparkline,
          status: 'Active',
          sovereignVaultAllocationPct: 0.15,
          watchlisted: false,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    this.syncAssetTableRowCount();
    this.emitNotification({
      type: 'batch_job',
      title: `World Commodities Tokenized (${targets.length})`,
      message: `Minted ERC-3643 tokens + uint256 bitmasks for ${targets.length} global commodities into Token Atlas & Market Exchange.`,
      severity: 'gold',
    });

    return { tokenizedCount: count || targets.length, commodities: this.worldCommodities };
  }

  public getDoubleEntryJournal(): DoubleEntryJournalRow[] {
    return this.journalEntries;
  }

  public getFixSessions(): FixSessionConfig[] {
    return this.fixSessions;
  }

  public createFixSession(input: {
    version: 'FIX 4.2' | 'FIX 4.4' | 'FIX 5.0';
    senderCompId: string;
    ipWhitelist: string;
    throttleMsgPerSec: number;
  }): FixSessionConfig {
    const session: FixSessionConfig = {
      id: `fix-${randomUUID().slice(0, 6)}`,
      version: input.version,
      senderCompId: input.senderCompId.toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 24) || 'INST_DESK',
      targetCompId: 'TWE_ATS_MATCH',
      ipWhitelist: input.ipWhitelist || '0.0.0.0/0',
      throttleMsgPerSec: Math.max(100, Math.min(20000, Number(input.throttleMsgPerSec || 1000))),
      active: true,
      messagesToday: 0,
      apiKeyPrefix: `twe_fix_${randomUUID().slice(0, 4)}`,
    };
    this.fixSessions.unshift(session);
    return session;
  }

  public toggleFixSession(id: string): FixSessionConfig | undefined {
    const s = this.fixSessions.find((item) => item.id === id);
    if (!s) return undefined;
    s.active = !s.active;
    return s;
  }

  public getSurveillanceAlerts(): SurveillanceAlert[] {
    return this.surveillanceAlerts;
  }

  public acknowledgeSurveillanceAlert(id: string): SurveillanceAlert | undefined {
    const a = this.surveillanceAlerts.find((item) => item.id === id);
    if (!a) return undefined;
    a.status = 'Acknowledged';
    return a;
  }

  public signWithCloudHsm(payloadText: string): {
    keyId: string;
    algorithm: string;
    digestSha256: string;
    signatureHex: string;
    signedAt: string;
  } {
    const digestSha256 = createHash('sha256').update(payloadText).digest('hex');
    const signatureHex = createHmac('sha256', 'TWE-AWS-CLOUDHSM-FIPS140-L3-KEY')
      .update(digestSha256)
      .digest('hex');
    return {
      keyId: 'arn:aws:cloudhsm:us-east-1:twe-ats:key/sovereign-master-l3',
      algorithm: 'ECDSA_SHA256 / FIPS 140-2 L3',
      digestSha256: `0x${digestSha256}`,
      signatureHex: `0x${signatureHex}`,
      signedAt: new Date().toISOString(),
    };
  }

  public generateRegulatoryReport(type: 'ats-n' | 'finra-cat' | 'rule-17a4') {
    return {
      reportType: type.toUpperCase(),
      generatedAt: new Date().toISOString(),
      atsOperator: 'Token World Exchange (TWE) ATS®',
      sovereignVaultUuid: this.vault.vaultUuid,
      activeAssets: this.assets.length,
      executedTrades: this.trades.length,
      openOrders: this.orders.filter((o) => o.status === 'OPEN').length,
      doubleEntryRows: this.journalEntries.length,
      filings: this.filings,
      recentTrades: this.trades.slice(0, 25),
      surveillanceSummary: this.surveillanceAlerts,
    };
  }

  public emitFoundryNotification(seed: string, count: number): void {
    this.emitNotification({
      type: 'batch_job',
      title: 'Token Foundry Batch Synthesized',
      message: `Generated ${count.toLocaleString('en-US')} fullstack smart-contract tokens under seed "${seed}" with HSM keys & NFT artifacts.`,
      severity: 'gold',
    });
  }

  public toggleWatchlist(assetId: string): TweAssetRecord | undefined {
    const item = this.assets.find((a) => a.id === assetId);
    if (!item) return undefined;
    item.watchlisted = !item.watchlisted;
    return item;
  }

  public markAllNotificationsRead(): void {
    for (const n of this.notifications) n.read = true;
  }

  public publishSystemAlert(input: {
    type?: TradeNotificationEvent['type'];
    title: string;
    message: string;
    symbol?: string;
    severity?: TradeNotificationEvent['severity'];
  }): TradeNotificationEvent {
    return this.emitNotification({
      type: input.type ?? 'rebalance_drift',
      title: input.title,
      message: input.message,
      symbol: input.symbol,
      severity: input.severity ?? 'warning',
    });
  }

  public getPortfolioSummary() {
    const holdings: PortfolioHolding[] = [];
    let totalHoldingsValue = 0;
    for (const [symbol, pos] of this.holdings.entries()) {
      if (pos.quantity <= 0) continue;
      const asset = this.assets.find((a) => a.symbol === symbol);
      const markPrice = asset?.priceUsd ?? pos.avgCostUsd;
      const mv = Number((pos.quantity * markPrice).toFixed(2));
      const costBasis = pos.quantity * pos.avgCostUsd;
      const pnl = Number((mv - costBasis).toFixed(2));
      const pnlPct = costBasis > 0 ? Number(((pnl / costBasis) * 100).toFixed(2)) : 0;
      totalHoldingsValue += mv;
      holdings.push({
        symbol,
        name: asset?.name ?? symbol,
        kind: asset?.kind ?? 'Tokens',
        chain: asset?.chain ?? 'Ethereum',
        quantity: pos.quantity,
        avgCostUsd: pos.avgCostUsd,
        markPriceUsd: markPrice,
        marketValueUsd: mv,
        unrealizedPnlUsd: pnl,
        unrealizedPnlPct: pnlPct,
        rule144LockupDaysRemaining:
          symbol === 'USD-TWE' ? 0 : symbol === 'CMDTX' ? 42 : symbol === 'TWE-G' ? 118 : 180,
      });
    }

    return {
      holdings,
      paperCashUsd: this.paperCashUsd,
      reservedUsd: this.reservedUsd,
      totalNavUsd: Number((totalHoldingsValue + this.paperCashUsd).toFixed(2)),
    };
  }

  public getBootstrapPayload(): WorkspaceBootstrapPayload {
    return {
      vault: this.vault,
      tables: this.tables,
      portfolio: this.getPortfolioSummary(),
      orders: this.orders,
      recentTrades: this.trades.slice(0, 25),
      notifications: this.notifications,
      foundryBatches: this.foundryBatches.slice(0, 100),
      companies: this.companies,
      filings: this.filings,
      chains: this.chains,
      readinessGates: this.readinessGates,
    };
  }

  public getAllAssetsSnapshot(): TweAssetRecord[] {
    return this.assets;
  }

  private analyticsEvents: Array<{
    id: string;
    name: string;
    url: string;
    domain: string;
    props?: Record<string, string>;
    scrollDepthPct?: number;
    engagementMs?: number;
    timestamp: string;
  }> = [];

  public recordAnalyticsEvent(raw: {
    n?: string;
    u?: string;
    d?: string;
    p?: Record<string, string>;
    sd?: number;
    e?: number;
  }) {
    const entry = {
      id: `evt-${randomUUID().slice(0, 8)}`,
      name: String(raw.n || 'pageview').slice(0, 80),
      url: String(raw.u || '/').slice(0, 240),
      domain: String(raw.d || 'twe-workspace').slice(0, 120),
      props: raw.p && typeof raw.p === 'object' ? raw.p : undefined,
      scrollDepthPct: typeof raw.sd === 'number' ? raw.sd : undefined,
      engagementMs: typeof raw.e === 'number' ? raw.e : undefined,
      timestamp: new Date().toISOString(),
    };
    this.analyticsEvents.unshift(entry);
    if (this.analyticsEvents.length > 250) {
      this.analyticsEvents = this.analyticsEvents.slice(0, 250);
    }
    return entry;
  }

  public getAnalyticsSummary() {
    const pageviews = this.analyticsEvents.filter((e) => e.name === 'pageview').length;
    const fileDownloads = this.analyticsEvents.filter((e) => e.name === 'File Download').length;
    const outboundClicks = this.analyticsEvents.filter((e) => e.name === 'Outbound Link: Click').length;
    const engagements = this.analyticsEvents.filter((e) => e.name === 'engagement');
    const avgEngagementMs =
      engagements.length > 0
        ? Math.round(engagements.reduce((acc, e) => acc + (e.engagementMs || 0), 0) / engagements.length)
        : 0;
    const avgScrollDepthPct =
      engagements.length > 0
        ? Math.round(engagements.reduce((acc, e) => acc + (e.scrollDepthPct || 0), 0) / engagements.length)
        : 0;

    const hubCounts = new Map<string, number>();
    for (const ev of this.analyticsEvents) {
      if (ev.name === 'pageview' && ev.props?.hub) {
        hubCounts.set(ev.props.hub, (hubCounts.get(ev.props.hub) || 0) + 1);
      }
    }
    const topHubs = Array.from(hubCounts.entries())
      .map(([hub, views]) => ({ hub, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 8);

    return {
      totalEvents: this.analyticsEvents.length,
      pageviews,
      fileDownloads,
      outboundClicks,
      avgEngagementMs,
      avgScrollDepthPct,
      topHubs,
      recentEvents: this.analyticsEvents.slice(0, 20),
    };
  }

  public clearAnalyticsEvents(): void {
    this.analyticsEvents = [];
  }
}

export const tweStore = new TweWorkspaceStore();
