import crypto from 'crypto';
import type { AssetKind, SparklinePoint, TweAssetRecord } from '../src/types/twe.ts';

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

const MAX_ATLAS_DIGITS = 2048;

// Exact user-requested arbitrary-precision Token Atlas ceiling (Unicode superscripts normalized to ASCII digits)
const RAW_USER_ATLAS_CEILING =
  '999999999999999999999999999999999999999999999999999999999999999999999999999⁹99999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999⁹99⁹999999999999⁹9999999999999999999999999999999999999999999⁹99999999999999999999999999999999999999999999999999999999999999999999999999⁹999999999999999999999999999999999999⁹99999⁹99999999999999999999999999999999999999999⁹99999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999⁹999999999999999999999999999999999999999⁹999999999909999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999';

export function normalizeAtlasBigIntDigits(raw: unknown): string {
  const ascii = String(raw ?? '')
    .trim()
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (ch) => SUPERSCRIPT_DIGIT_MAP[ch] ?? '');
  return ascii.replace(/[^0-9]/g, '').slice(0, MAX_ATLAS_DIGITS);
}

export const TOKEN_ATLAS_CEILING_STR = normalizeAtlasBigIntDigits(RAW_USER_ATLAS_CEILING);
export const TOKEN_ATLAS_CEILING = BigInt(TOKEN_ATLAS_CEILING_STR);
export const TOKEN_ATLAS_CEILING_DIGITS = TOKEN_ATLAS_CEILING_STR.length;

export function parseAtlasBigIntIndex(raw: unknown, fallback = 1n): bigint {
  const digits = normalizeAtlasBigIntDigits(raw);
  if (!digits) return fallback;
  const parsed = BigInt(digits);
  if (parsed < 1n) return 1n;
  return parsed;
}

export interface InfiniteAtlasAssetRecord extends TweAssetRecord {
  atlasIndex: string;
  contractId: string;
  sha256Fingerprint: string;
  sector: string;
  isHyperScale: true;
}

export interface InfiniteAtlasSummary {
  total: string;
  digits: number;
  scientific: string;
  Tokens: string;
  NFTs: string;
  Commodities: string;
  Currencies: string;
}

export interface InfiniteAtlasSliceResponse {
  cursorIndex: string;
  pageSize: number;
  nextCursorIndex: string;
  prevCursorIndex: string;
  ceilingIndex: string;
  ceilingDigits: number;
  maxSupportedDigits: number;
  activeKind: string;
  activeChain: string;
  classificationSummary: InfiniteAtlasSummary;
  items: InfiniteAtlasAssetRecord[];
}

const ATLAS_CHAINS: Array<{ name: string; chainId: number; defaultStd: string }> = [
  { name: 'Ethereum', chainId: 1, defaultStd: 'ERC-3643' },
  { name: 'Base', chainId: 8453, defaultStd: 'ERC-20' },
  { name: 'Arbitrum', chainId: 42161, defaultStd: 'ERC-3643' },
  { name: 'Polygon', chainId: 137, defaultStd: 'ERC-20' },
  { name: 'Solana', chainId: 101, defaultStd: 'SPL-2022' },
  { name: 'Sepolia', chainId: 11155111, defaultStd: 'ERC-4626' },
];

const ASSET_KINDS: AssetKind[] = ['Tokens', 'NFTs', 'Commodities', 'Currencies'];

const CLASS_CATALOG: Record<
  AssetKind,
  {
    prefixes: string[];
    roots: string[];
    standards: string[];
    sectors: string[];
    minPrice: number;
    maxPrice: number;
  }
> = {
  Tokens: {
    prefixes: [
      'Sovereign',
      'Meridian',
      'Quantum',
      'Astral',
      'Apex',
      'Horizon',
      'Citadel',
      'Vanguard',
      'Chrono',
      'Aether',
      'Obsidian',
      'Kinetic',
    ],
    roots: [
      'Governance',
      'Treasury Note',
      'Lattice Core',
      'Settlement Relay',
      'Liquidity Pool',
      'Equities Index',
      'Credit Tranche',
      'Bond Unit',
    ],
    standards: ['ERC-3643', 'ERC-20', 'ERC-4626', 'ERC-1400', 'SPL-2022'],
    sectors: ['Sovereign Reserve', 'Institutional Credit', 'Digital Equities', 'DeFi Clearing'],
    minPrice: 4.5,
    maxPrice: 680,
  },
  NFTs: {
    prefixes: [
      'Cosmic Nexus',
      'Matrix Hero',
      'Mythic Titan',
      'Genesis Vault',
      'Obsidian Charter',
      'Valkyrie Seal',
      'Helios Relic',
      'Starforged Crown',
    ],
    roots: [
      'Edition',
      'Deed',
      'Obelisk',
      'Emblem',
      'Aegis',
      'Monolith',
      'Artifact',
      'Reliquary',
    ],
    standards: ['ERC-721', 'ERC-1155', 'Metaplex'],
    sectors: ['Flagship Generative NFT', 'Custody Charter Deed', 'Verified Royalty Relic'],
    minPrice: 420,
    maxPrice: 54000,
  },
  Commodities: {
    prefixes: [
      'Swiss Gold',
      'Zurich Platinum',
      'London Silver',
      'North Sea Crude',
      'Atacama Lithium',
      'Cathode Copper',
      'Palladium Reserve',
      'Refined Cobalt',
      'Direct Air Carbon',
      'Black Sea Grain',
    ],
    roots: [
      'Bullion Unit',
      'Warehouse Receipt',
      'Vault Bar',
      'Futures Token',
      'Allocated Ton',
      'Spot Contract',
    ],
    standards: ['ERC-3643', 'ERC-20', 'ERC-1155'],
    sectors: ['Precious Metals', 'Energy & Industrial', 'Battery Minerals', 'Carbon & Agri'],
    minPrice: 4.2,
    maxPrice: 2950,
  },
  Currencies: {
    prefixes: [
      'Institutional USD',
      'Euro Clearing',
      'Helvetia Franc',
      'Sterling Clearing',
      'Tokyo Yen',
      'Straits Dollar',
      'Northern CAD',
      'Pacific AUD',
      'Gulf Dirham',
      'Sovereign SDR',
    ],
    roots: ['Settlement Coin', 'Treasury Unit', 'Clearing Note', 'FX Rail', 'Liquidity Coin'],
    standards: ['ERC-20', 'ERC-3643', 'SPL-2022'],
    sectors: ['Programmable FX', 'Sovereign Clearing', 'Interbank Treasury'],
    minPrice: 0.0065,
    maxPrice: 1.48,
  },
};

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function deriveEip55Address(hex40: string): string {
  const lower = hex40.toLowerCase().slice(0, 40);
  const hash = sha256Hex(lower);
  let out = '0x';
  for (let i = 0; i < 40; i += 1) {
    const ch = lower[i];
    if (ch >= 'a' && ch <= 'f' && parseInt(hash[i], 16) >= 8) {
      out += ch.toUpperCase();
    } else {
      out += ch;
    }
  }
  return out;
}

function computeWildersRsi14(prices: number[]): number {
  if (prices.length < 15) return 50;
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= 14; i += 1) {
    const delta = prices[i] - prices[i - 1];
    if (delta >= 0) gainSum += delta;
    else lossSum += Math.abs(delta);
  }
  let avgGain = gainSum / 14;
  let avgLoss = lossSum / 14;
  for (let i = 15; i < prices.length; i += 1) {
    const delta = prices[i] - prices[i - 1];
    avgGain = (avgGain * 13 + (delta > 0 ? delta : 0)) / 14;
    avgLoss = (avgLoss * 13 + (delta < 0 ? Math.abs(delta) : 0)) / 14;
  }
  if (avgLoss === 0) return avgGain === 0 ? 50 : 96.4;
  const rs = avgGain / avgLoss;
  return Number((100 - 100 / (1 + rs)).toFixed(2));
}

function buildDeterministicSparkline(
  seedInt: number,
  basePrice: number,
  drift: number
): SparklinePoint[] {
  const points: SparklinePoint[] = [];
  let price = basePrice * (1 - drift * 0.55);
  const precision = basePrice < 2 ? 4 : 2;
  for (let h = 0; h < 24; h += 1) {
    const wave =
      Math.sin(seedInt * 0.0017 + h * 0.63) * 0.017 +
      Math.cos(seedInt * 0.0009 + h * 0.31) * 0.01;
    const step = drift / 24 + wave;
    price = Math.max(0.0001, Number((price * (1 + step)).toFixed(precision)));
    points.push({
      hour: `${String(h).padStart(2, '0')}:00`,
      price,
      volume: Math.round(
        (38_000 + ((seedInt + h * 4177) % 240_000)) * (1 + Math.abs(wave) * 9)
      ),
    });
  }
  return points;
}

function formatCompactAtlasIndex(idx: string): string {
  if (idx.length <= 12) return idx;
  return `${idx.slice(0, 5)}…${idx.slice(-5)}`;
}

export function getAtlasClassificationSummary(): InfiniteAtlasSummary {
  const total = TOKEN_ATLAS_CEILING;
  const quarter = total / 4n;
  const remainder = total - quarter * 4n;
  const tokensCount = quarter + remainder;

  const digits = TOKEN_ATLAS_CEILING_STR.length;
  const lead = TOKEN_ATLAS_CEILING_STR.slice(0, 1);
  const frac = TOKEN_ATLAS_CEILING_STR.slice(1, 3);
  const scientific = `${lead}.${frac} × 10^${digits - 1}`;

  return {
    total: total.toString(),
    digits,
    scientific,
    Tokens: tokensCount.toString(),
    NFTs: quarter.toString(),
    Commodities: quarter.toString(),
    Currencies: quarter.toString(),
  };
}

export function resolveInfiniteAtlasAsset(
  rawIndex: unknown,
  opts?: { kind?: string; chain?: string }
): InfiniteAtlasAssetRecord {
  const idx = parseAtlasBigIntIndex(rawIndex, 1n);
  const idxStr = idx.toString();

  const fixedKind =
    opts?.kind && ASSET_KINDS.includes(opts.kind as AssetKind)
      ? (opts.kind as AssetKind)
      : undefined;
  const fixedChainObj =
    opts?.chain && opts.chain !== 'ALL'
      ? ATLAS_CHAINS.find((c) => c.name === opts.chain)
      : undefined;

  const digest = sha256Hex(
    `TWE_TOKEN_ATLAS_HYPER_V1:${idxStr}:${fixedKind ?? 'ANY'}:${fixedChainObj?.name ?? 'ANY'}`
  );

  const h0 = parseInt(digest.slice(0, 8), 16);
  const h1 = parseInt(digest.slice(8, 16), 16);
  const h2 = parseInt(digest.slice(16, 24), 16);
  const h3 = parseInt(digest.slice(24, 32), 16);
  const h4 = parseInt(digest.slice(32, 40), 16);

  const kind: AssetKind = fixedKind ?? ASSET_KINDS[Number(idx % 4n)];
  const chainObj = fixedChainObj ?? ATLAS_CHAINS[h1 % ATLAS_CHAINS.length];
  const spec = CLASS_CATALOG[kind];

  const prefix = spec.prefixes[h0 % spec.prefixes.length];
  const root = spec.roots[(h1 >>> 3) % spec.roots.length];
  const sector = spec.sectors[(h2 >>> 4) % spec.sectors.length];
  const standard =
    chainObj.name === 'Solana'
      ? kind === 'NFTs'
        ? 'Metaplex'
        : 'SPL-2022'
      : spec.standards[(h2 >>> 8) % spec.standards.length];

  const codePrefix = prefix
    .replace(/[^A-Za-z]/g, '')
    .slice(0, 3)
    .toUpperCase();
  const codeSuffix = digest.slice(0, 4).toUpperCase();
  const symbol = `${codePrefix}-${codeSuffix}`;
  const name = `${prefix} ${root} #${formatCompactAtlasIndex(idxStr)}`;
  const contractId = `TWE-ATL-${digest.slice(0, 14).toUpperCase()}`;
  const contractAddress = deriveEip55Address(digest.slice(16, 56));

  const priceRatio = (h3 % 10000) / 10000;
  const rawPrice = spec.minPrice + (spec.maxPrice - spec.minPrice) * Math.pow(priceRatio, 1.8);
  const basePrice = Number(rawPrice.toFixed(rawPrice < 2 ? 4 : 2));
  const drift = (((h4 % 1400) - 650) / 10000); // -6.5% to +7.5%

  const sparkline24h = buildDeterministicSparkline(h0 ^ h2, basePrice, drift);
  const lastPrice = sparkline24h[sparkline24h.length - 1]?.price ?? basePrice;
  const firstPrice = sparkline24h[0]?.price ?? basePrice;
  const change24hPct = Number((((lastPrice - firstPrice) / Math.max(0.0001, firstPrice)) * 100).toFixed(2));
  const rsi14 = computeWildersRsi14(sparkline24h.map((p) => p.price));
  const volume24hUsd = sparkline24h.reduce((sum, pt) => sum + pt.volume, 0);

  const supplyChoices =
    kind === 'NFTs'
      ? [100, 250, 500, 1000, 2500, 10000]
      : [1_000_000, 10_000_000, 50_000_000, 250_000_000, 1_000_000_000, 10_000_000_000];
  const supplyUnits = supplyChoices[h4 % supplyChoices.length];
  const supplyFormatted = supplyUnits.toLocaleString('en-US');
  const marketCapUsd = Math.round(supplyUnits * lastPrice);

  const statuses: TweAssetRecord['status'][] = ['Active', 'Active', 'Active', 'Active', 'Review'];
  const status = statuses[h1 % statuses.length];

  return {
    id: `atlas-${idxStr.length > 24 ? digest.slice(0, 20) : idxStr}`,
    atlasIndex: idxStr,
    contractId,
    sha256Fingerprint: digest,
    sector,
    isHyperScale: true,
    symbol,
    name,
    kind,
    chain: chainObj.name,
    chainId: chainObj.chainId,
    standard,
    contractAddress,
    priceUsd: lastPrice,
    change24hPct,
    volume24hUsd,
    marketCapUsd,
    supplyFormatted,
    rsi14,
    sparkline24h,
    status,
    sovereignVaultAllocationPct: Number(((h3 % 45) / 100).toFixed(2)),
    watchlisted: false,
    updatedAt: new Date().toISOString(),
  };
}

export function resolveInfiniteAtlasSlice(params: {
  cursor?: unknown;
  pageSize?: number;
  kind?: string;
  chain?: string;
  search?: string;
}): InfiniteAtlasSliceResponse {
  const sizeRaw = Number(params.pageSize || 10);
  const pageSize = [5, 10, 20, 25, 50].includes(sizeRaw) ? sizeRaw : 10;
  const kind = params.kind && params.kind !== 'ALL' ? params.kind : 'ALL';
  const chain = params.chain && params.chain !== 'ALL' ? params.chain : 'ALL';

  // If the user pastes an arbitrary-precision number (including superscripts ⁹) into search, jump directly to it
  const searchDigits = normalizeAtlasBigIntDigits(params.search ?? '');
  const baseCursor =
    searchDigits.length > 0
      ? parseAtlasBigIntIndex(searchDigits, 1n)
      : parseAtlasBigIntIndex(params.cursor, 1n);

  const items: InfiniteAtlasAssetRecord[] = [];
  for (let i = 0; i < pageSize; i += 1) {
    items.push(
      resolveInfiniteAtlasAsset(baseCursor + BigInt(i), {
        kind: kind !== 'ALL' ? kind : undefined,
        chain: chain !== 'ALL' ? chain : undefined,
      })
    );
  }

  const prevCursor =
    baseCursor > BigInt(pageSize) ? (baseCursor - BigInt(pageSize)).toString() : '1';
  const nextCursor = (baseCursor + BigInt(pageSize)).toString();

  return {
    cursorIndex: baseCursor.toString(),
    pageSize,
    nextCursorIndex: nextCursor,
    prevCursorIndex: prevCursor,
    ceilingIndex: TOKEN_ATLAS_CEILING_STR,
    ceilingDigits: TOKEN_ATLAS_CEILING_DIGITS,
    maxSupportedDigits: MAX_ATLAS_DIGITS,
    activeKind: kind,
    activeChain: chain,
    classificationSummary: getAtlasClassificationSummary(),
    items,
  };
}
