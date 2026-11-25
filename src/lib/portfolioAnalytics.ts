import type { PortfolioHolding, TweAssetRecord } from '../types/twe';

export type SigmaTier = 'low' | 'moderate' | 'high' | 'extreme';
export type RsiSignalZone = 'strong-buy' | 'buy' | 'neutral' | 'sell' | 'strong-sell';

export interface TokenTimePoint {
  index: number;
  dayOffset: number; // -30 to 0 for 31-day window
  label: string;
  shortLabel: string;
  isoDate: string;
  timestampMs: number;
  priceUsd: number;
  marketCapUsd: number;
  valuationUsd: number;
  costBasisUsd: number;
  pnlUsd: number;
  roiPct: number;
  dailyReturnPct: number;
  zScore: number;
  signedZScore: number;
  sigmaTier: SigmaTier;
  rsi14: number;
  rsiZone: RsiSignalZone;
  isPeak: boolean;
  isTrough: boolean;
}

export interface TokenVolatilityMetrics {
  meanReturnPct: number;
  stdDevPct: number;
  peakSigma: number;
  latestSigma: number;
  twoSigmaSpikeCount: number;
  highSigmaCount: number;
  hasTwoSigmaSpike: boolean;
  highestTier: SigmaTier;
  dailyZScores: number[];
  dailyTiers: SigmaTier[];
}

export interface RsiTrendLineAnalysis {
  peaks: Array<{ index: number; dayOffset: number; rsi: number; label: string }>;
  troughs: Array<{ index: number; dayOffset: number; rsi: number; label: string }>;
  resistanceLine: { startIdx: number; startRsi: number; endIdx: number; endRsi: number; slopePerDay: number } | null;
  supportLine: { startIdx: number; startRsi: number; endIdx: number; endRsi: number; slopePerDay: number } | null;
  projectedCeilingToday: number | null;
  projectedFloorToday: number | null;
  channelSpreadToday: number | null;
  patternName: string;
  patternBias: 'bullish' | 'bearish' | 'neutral';
}

export interface AssetAnalyticsBundle {
  holding: PortfolioHolding;
  asset?: TweAssetRecord;
  baselineMarketCapUsd: number;
  points31d: TokenTimePoint[];
  points7d: TokenTimePoint[];
  volatility7d: TokenVolatilityMetrics;
  volatility30d: TokenVolatilityMetrics;
  trendAnalysis: RsiTrendLineAnalysis;
  latestPoint: TokenTimePoint;
}

const KNOWN_MARKET_CAPS: Record<string, number> = {
  'MAO-MAO': 3_000_000_000_000,
  WBTC: 1_860_000_000_000,
  BTC: 1_860_000_000_000,
  ETH: 412_500_000_000,
  'TWE-G': 84_200_000_000,
  CMDTX: 19_600_000_000,
  'AURUM-X': 14_800_000_000,
  'PLAT-R': 6_450_000_000,
  'USD-TWE': 4_250_000_000,
  'WTI-TWE': 12_900_000_000,
  'SILV-X': 5_800_000_000,
  'LITH-X': 4_120_000_000,
};

export function hashSymbolSeed(symbol: string): number {
  let h = 2166136261;
  for (let i = 0; i < symbol.length; i += 1) {
    h ^= symbol.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createPrng(seedNum: number): () => number {
  let state = (seedNum || 123456789) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getMockBaselineMarketCap(
  holding: PortfolioHolding,
  asset?: TweAssetRecord
): number {
  const sym = holding.symbol.toUpperCase();
  if (KNOWN_MARKET_CAPS[sym]) return KNOWN_MARKET_CAPS[sym];
  if (asset && asset.marketCapUsd > 0) return asset.marketCapUsd;
  const seed = hashSymbolSeed(sym);
  const multiplier = 2_500_000 + (seed % 45_000_000);
  return Math.max(25_000_000, holding.markPriceUsd * multiplier);
}

export function formatCompactUsd(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

export function classifySigmaTier(absZ: number): SigmaTier {
  if (absZ >= 2.0) return 'extreme';
  if (absZ >= 1.5) return 'high';
  if (absZ >= 0.85) return 'moderate';
  return 'low';
}

export function classifyRsiZone(rsi: number): RsiSignalZone {
  if (rsi < 20) return 'strong-buy';
  if (rsi <= 30) return 'buy';
  if (rsi > 80) return 'strong-sell';
  if (rsi >= 70) return 'sell';
  return 'neutral';
}

export function computeWilderRsiSeries(closes: number[], period = 14): number[] {
  const n = closes.length;
  const rsis = new Array<number>(n).fill(50);
  if (n < 2) return rsis;

  let avgGain = 0;
  let avgLoss = 0;
  const initSpan = Math.min(period, n - 1);

  for (let i = 1; i <= initSpan; i += 1) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= initSpan;
  avgLoss /= initSpan;

  const toRsi = (g: number, l: number) => {
    if (l === 0 && g === 0) return 50;
    if (l === 0) return 96;
    const rs = g / l;
    return 100 - 100 / (1 + rs);
  };

  for (let i = 1; i <= initSpan; i += 1) {
    rsis[i] = Number(toRsi(avgGain, avgLoss).toFixed(2));
  }

  for (let i = initSpan + 1; i < n; i += 1) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rsis[i] = Number(toRsi(avgGain, avgLoss).toFixed(2));
  }

  return rsis;
}

export function computeTokenVolatilityMetrics(
  points: Array<{ dailyReturnPct?: number; pnlUsd?: number; priceUsd?: number }>
): TokenVolatilityMetrics {
  if (points.length === 0) {
    return {
      meanReturnPct: 0,
      stdDevPct: 0,
      peakSigma: 0,
      latestSigma: 0,
      twoSigmaSpikeCount: 0,
      highSigmaCount: 0,
      hasTwoSigmaSpike: false,
      highestTier: 'low',
      dailyZScores: [],
      dailyTiers: [],
    };
  }

  const returns: number[] = points.map((pt, idx) => {
    if (typeof pt.dailyReturnPct === 'number' && Number.isFinite(pt.dailyReturnPct)) {
      return pt.dailyReturnPct;
    }
    if (idx === 0) return 0;
    const prevPrice = points[idx - 1].priceUsd ?? 0;
    const curPrice = pt.priceUsd ?? 0;
    if (prevPrice > 0 && curPrice > 0) {
      return ((curPrice - prevPrice) / prevPrice) * 100;
    }
    const prevPnl = points[idx - 1].pnlUsd ?? 0;
    const curPnl = pt.pnlUsd ?? 0;
    return (curPnl - prevPnl) / Math.max(100, Math.abs(prevPnl) + 1000) * 100;
  });

  const n = returns.length;
  const mean = returns.reduce((acc, r) => acc + r, 0) / n;
  const variance = returns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / Math.max(1, n);
  const stdDev = Math.max(0.18, Math.sqrt(variance));

  const dailyZScores = returns.map((r) => Number((Math.abs(r - mean) / stdDev).toFixed(2)));
  const dailyTiers = dailyZScores.map((z) => classifySigmaTier(z));
  const peakSigma = Math.max(...dailyZScores);
  const latestSigma = dailyZScores[dailyZScores.length - 1] ?? 0;
  const twoSigmaSpikeCount = dailyZScores.filter((z) => z >= 2.0).length;
  const highSigmaCount = dailyZScores.filter((z) => z >= 1.5).length;

  return {
    meanReturnPct: Number(mean.toFixed(3)),
    stdDevPct: Number(stdDev.toFixed(3)),
    peakSigma: Number(peakSigma.toFixed(2)),
    latestSigma: Number(latestSigma.toFixed(2)),
    twoSigmaSpikeCount,
    highSigmaCount,
    hasTwoSigmaSpike: twoSigmaSpikeCount > 0,
    highestTier: classifySigmaTier(peakSigma),
    dailyZScores,
    dailyTiers,
  };
}

function fitLinearTrend(
  extrema: Array<{ index: number; rsi: number }>,
  totalLen: number
): {
  startIdx: number;
  startRsi: number;
  endIdx: number;
  endRsi: number;
  slopePerDay: number;
  projectedToday: number;
} | null {
  if (extrema.length < 2) return null;
  const n = extrema.length;
  const sumX = extrema.reduce((s, p) => s + p.index, 0);
  const sumY = extrema.reduce((s, p) => s + p.rsi, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0;
  let den = 0;
  for (const p of extrema) {
    num += (p.index - meanX) * (p.rsi - meanY);
    den += (p.index - meanX) ** 2;
  }

  const slope = den > 0 ? num / den : 0;
  const intercept = meanY - slope * meanX;
  const startIdx = extrema[0].index;
  const endIdx = totalLen - 1;
  const clampRsi = (v: number) => Number(Math.max(2, Math.min(98, v)).toFixed(2));

  return {
    startIdx,
    startRsi: clampRsi(slope * startIdx + intercept),
    endIdx,
    endRsi: clampRsi(slope * endIdx + intercept),
    slopePerDay: Number(slope.toFixed(3)),
    projectedToday: clampRsi(slope * endIdx + intercept),
  };
}

export function detectRsiExtremaAndTrends(points: TokenTimePoint[]): RsiTrendLineAnalysis {
  const n = points.length;
  const peaks: Array<{ index: number; dayOffset: number; rsi: number; label: string }> = [];
  const troughs: Array<{ index: number; dayOffset: number; rsi: number; label: string }> = [];

  for (let i = 1; i < n - 1; i += 1) {
    const prev = points[i - 1].rsi14;
    const cur = points[i].rsi14;
    const next = points[i + 1].rsi14;
    const prev2 = i >= 2 ? points[i - 2].rsi14 : prev;
    const next2 = i <= n - 3 ? points[i + 2].rsi14 : next;

    if (cur >= prev && cur >= next && cur >= prev2 - 0.5 && cur >= next2 - 0.5 && (cur > prev || cur > next)) {
      points[i].isPeak = true;
      peaks.push({ index: i, dayOffset: points[i].dayOffset, rsi: cur, label: points[i].shortLabel });
    } else if (cur <= prev && cur <= next && cur <= prev2 + 0.5 && cur <= next2 + 0.5 && (cur < prev || cur < next)) {
      points[i].isTrough = true;
      troughs.push({ index: i, dayOffset: points[i].dayOffset, rsi: cur, label: points[i].shortLabel });
    }
  }

  // Fallback anchors so resistance & support lines remain informative even in linear drifts
  if (peaks.length < 2 && n >= 10) {
    const firstHalf = points.slice(0, Math.floor(n / 2));
    const secondHalf = points.slice(Math.floor(n / 2));
    const p1 = firstHalf.reduce((best, p) => (p.rsi14 > best.rsi14 ? p : best), firstHalf[0]);
    const p2 = secondHalf.reduce((best, p) => (p.rsi14 > best.rsi14 ? p : best), secondHalf[0]);
    peaks.length = 0;
    [p1, p2].forEach((p, idx) => {
      const pointIdx = idx === 0 ? firstHalf.indexOf(p) : Math.floor(n / 2) + secondHalf.indexOf(p);
      points[pointIdx].isPeak = true;
      peaks.push({ index: pointIdx, dayOffset: p.dayOffset, rsi: p.rsi14, label: p.shortLabel });
    });
  }

  if (troughs.length < 2 && n >= 10) {
    const firstHalf = points.slice(0, Math.floor(n / 2));
    const secondHalf = points.slice(Math.floor(n / 2));
    const t1 = firstHalf.reduce((best, p) => (p.rsi14 < best.rsi14 ? p : best), firstHalf[0]);
    const t2 = secondHalf.reduce((best, p) => (p.rsi14 < best.rsi14 ? p : best), secondHalf[0]);
    troughs.length = 0;
    [t1, t2].forEach((p, idx) => {
      const pointIdx = idx === 0 ? firstHalf.indexOf(p) : Math.floor(n / 2) + secondHalf.indexOf(p);
      points[pointIdx].isTrough = true;
      troughs.push({ index: pointIdx, dayOffset: p.dayOffset, rsi: p.rsi14, label: p.shortLabel });
    });
  }

  const resFit = fitLinearTrend(peaks, n);
  const supFit = fitLinearTrend(troughs, n);

  const resSlope = resFit?.slopePerDay ?? 0;
  const supSlope = supFit?.slopePerDay ?? 0;

  let patternName = 'Horizontal Consolidation Range';
  let patternBias: 'bullish' | 'bearish' | 'neutral' = 'neutral';

  if (resSlope > 0.18 && supSlope > 0.18) {
    patternName = 'Ascending Bullish Channel';
    patternBias = 'bullish';
  } else if (resSlope < -0.18 && supSlope < -0.18) {
    patternName = 'Descending Bearish Channel';
    patternBias = 'bearish';
  } else if (resSlope < -0.12 && supSlope > 0.12) {
    patternName = 'Symmetrical Converging Wedge';
    patternBias = points[n - 1]?.rsi14 >= 50 ? 'bullish' : 'bearish';
  } else if (resSlope > 0.12 && supSlope < -0.12) {
    patternName = 'Broadening Volatility Wedge';
    patternBias = 'neutral';
  } else if (Math.abs(resSlope) <= 0.15 && supSlope > 0.16) {
    patternName = 'Ascending Triangle Breakout';
    patternBias = 'bullish';
  } else if (resSlope < -0.16 && Math.abs(supSlope) <= 0.15) {
    patternName = 'Descending Triangle Breakdown';
    patternBias = 'bearish';
  }

  const projectedCeilingToday = resFit?.projectedToday ?? null;
  const projectedFloorToday = supFit?.projectedToday ?? null;
  const channelSpreadToday =
    projectedCeilingToday !== null && projectedFloorToday !== null
      ? Number(Math.max(0, projectedCeilingToday - projectedFloorToday).toFixed(2))
      : null;

  return {
    peaks,
    troughs,
    resistanceLine: resFit
      ? {
          startIdx: resFit.startIdx,
          startRsi: resFit.startRsi,
          endIdx: resFit.endIdx,
          endRsi: resFit.endRsi,
          slopePerDay: resFit.slopePerDay,
        }
      : null,
    supportLine: supFit
      ? {
          startIdx: supFit.startIdx,
          startRsi: supFit.startRsi,
          endIdx: supFit.endIdx,
          endRsi: supFit.endRsi,
          slopePerDay: supFit.slopePerDay,
        }
      : null,
    projectedCeilingToday,
    projectedFloorToday,
    channelSpreadToday,
    patternName,
    patternBias,
  };
}

export function buildAsset46DayBundle(
  holding: PortfolioHolding,
  asset?: TweAssetRecord,
  livePriceOverride?: number
): AssetAnalyticsBundle {
  const seed = hashSymbolSeed(holding.symbol);
  const rand = createPrng(seed);

  const isStable =
    holding.symbol.toUpperCase().includes('USD') ||
    holding.kind === 'Currencies';
  const currentPrice = livePriceOverride ?? holding.markPriceUsd;
  const baselineMarketCapUsd = getMockBaselineMarketCap(holding, asset);
  const costBasisUsd = holding.quantity * holding.avgCostUsd;

  // 46-day lookback (-45 .. 0) so Day -30..0 (31 points) each have full 14-day Wilder RSI lookback
  const totalDays = 46;
  const startWindowIdx = 15; // index 15 = Day -30, index 45 = Day 0

  const volBase = isStable ? 0.0012 : holding.kind === 'Commodities' ? 0.017 : 0.026;
  const wavePhase = (seed % 360) * (Math.PI / 180);
  const waveFreq = 0.28 + (seed % 7) * 0.035;

  // Choose 1 or 2 realistic shock indices in the visible 31-day window for non-stable assets
  const shockDayA = startWindowIdx + 6 + (seed % 9);
  const shockDayB = startWindowIdx + 19 + (seed % 8);
  const shouldInjectTwoSigma = !isStable && seed % 5 !== 0; // ~80% of active risk assets get distinct regime dynamics

  const rawReturns: number[] = new Array(totalDays).fill(0);
  const symUpper = holding.symbol.toUpperCase();
  const isPreciousMetal =
    symUpper.includes('AURUM') ||
    symUpper.includes('PLAT') ||
    symUpper.includes('XAU') ||
    symUpper.includes('SILV');
  const isCommodityCluster = holding.kind === 'Commodities' || symUpper.includes('CMDTX');

  for (let i = 1; i < totalDays; i += 1) {
    // Shared macro regime drivers create realistic institutional co-movement & hedge clusters
    const globalRiskCycle = Math.sin(0.37 * i + 0.6) * 0.011 + Math.cos(0.19 * i) * 0.006;
    const metalsClusterCycle = Math.sin(0.41 * i + 1.2) * 0.013 + Math.cos(0.24 * i - 0.5) * 0.007;

    let macroComponent = 0;
    if (isStable) {
      macroComponent = -globalRiskCycle * 0.055; // Safe-haven mild inverse beta
    } else if (isPreciousMetal) {
      macroComponent = metalsClusterCycle * 0.92 + globalRiskCycle * 0.28;
    } else if (isCommodityCluster) {
      macroComponent = metalsClusterCycle * 0.58 + globalRiskCycle * 0.62;
    } else {
      macroComponent = globalRiskCycle * 0.85 + metalsClusterCycle * 0.25;
    }

    const cycle = Math.sin(wavePhase + i * waveFreq) * volBase * 0.45;
    const noise = (rand() - 0.49) * volBase * 0.95;
    let r = macroComponent + cycle + noise;

    if (shouldInjectTwoSigma && i === shockDayA) {
      r += (seed % 2 === 0 ? 1 : -1) * volBase * 3.8;
    }
    if (shouldInjectTwoSigma && i === shockDayB) {
      r += (seed % 3 === 0 ? -1 : 1) * volBase * 3.4;
    }

    // Clamp daily return to keep trajectories institutional & realistic
    rawReturns[i] = Math.max(-0.18, Math.min(0.22, r));
  }

  // Reconstruct price series backward/normalized so index 45 equals exact live currentPrice
  const unscaledPrices: number[] = new Array(totalDays).fill(1);
  for (let i = 1; i < totalDays; i += 1) {
    unscaledPrices[i] = unscaledPrices[i - 1] * (1 + rawReturns[i]);
  }
  const scaleFactor = currentPrice / Math.max(0.000001, unscaledPrices[totalDays - 1]);
  const prices = unscaledPrices.map((p) => Number((p * scaleFactor).toFixed(4)));
  prices[totalDays - 1] = currentPrice;

  const rsi46 = computeWilderRsiSeries(prices, 14);

  const now = Date.now();
  const oneDayMs = 86_400_000;

  // Extract 31-day window (Day -30 to Today)
  const slice31Prices = prices.slice(startWindowIdx);
  const slice31Returns = rawReturns.slice(startWindowIdx).map((r) => Number((r * 100).toFixed(3)));
  const slice31Rsi = rsi46.slice(startWindowIdx);

  // Compute Z-scores over the 31-day daily return series
  const mean31 = slice31Returns.reduce((a, b) => a + b, 0) / slice31Returns.length;
  const var31 =
    slice31Returns.reduce((a, r) => a + (r - mean31) ** 2, 0) / slice31Returns.length;
  const std31 = Math.max(0.18, Math.sqrt(var31));

  const points31d: TokenTimePoint[] = slice31Prices.map((price, idx) => {
    const dayOffset = idx - 30;
    const timestampMs = now + dayOffset * oneDayMs;
    const d = new Date(timestampMs);
    const isoDate = d.toISOString().slice(0, 10);
    const shortLabel =
      dayOffset === 0 ? 'Today' : `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}`;
    const label = dayOffset === 0 ? 'Today (Live)' : `Day ${dayOffset} (${shortLabel})`;

    const ratio = price / Math.max(0.000001, currentPrice);
    const marketCapUsd = Number((baselineMarketCapUsd * ratio).toFixed(0));
    const valuationUsd = Number((holding.quantity * price).toFixed(2));
    const pnlUsd = Number((valuationUsd - costBasisUsd).toFixed(2));
    const roiPct = costBasisUsd > 0 ? Number(((pnlUsd / costBasisUsd) * 100).toFixed(2)) : 0;
    const dailyReturnPct = idx === 0 ? 0 : slice31Returns[idx];
    const signedZ = Number(((dailyReturnPct - mean31) / std31).toFixed(2));
    const absZ = Math.abs(signedZ);
    const rsiVal = slice31Rsi[idx];

    return {
      index: idx,
      dayOffset,
      label,
      shortLabel,
      isoDate,
      timestampMs,
      priceUsd: price,
      marketCapUsd,
      valuationUsd,
      costBasisUsd,
      pnlUsd,
      roiPct,
      dailyReturnPct,
      zScore: absZ,
      signedZScore: signedZ,
      sigmaTier: classifySigmaTier(absZ),
      rsi14: rsiVal,
      rsiZone: classifyRsiZone(rsiVal),
      isPeak: false,
      isTrough: false,
    };
  });

  const trendAnalysis = detectRsiExtremaAndTrends(points31d);
  const points7d = points31d.slice(-8).map((pt, idx) => ({ ...pt, index: idx }));
  const volatility7d = computeTokenVolatilityMetrics(points7d);
  const volatility30d = computeTokenVolatilityMetrics(points31d);

  return {
    holding,
    asset,
    baselineMarketCapUsd,
    points31d,
    points7d,
    volatility7d,
    volatility30d,
    trendAnalysis,
    latestPoint: points31d[points31d.length - 1],
  };
}

export type CorrelationTier =
  | 'self'
  | 'high-positive'
  | 'moderate-positive'
  | 'uncorrelated'
  | 'moderate-inverse'
  | 'high-inverse';

export interface CorrelationClassification {
  tier: CorrelationTier;
  label: string;
  isHighCorrelation: boolean;
}

export function computePearsonCorrelation(seriesA: number[], seriesB: number[]): number {
  const n = Math.min(seriesA.length, seriesB.length);
  if (n < 3) return 0;

  let sumA = 0;
  let sumB = 0;
  for (let i = 0; i < n; i += 1) {
    sumA += seriesA[i];
    sumB += seriesB[i];
  }
  const meanA = sumA / n;
  const meanB = sumB / n;

  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < n; i += 1) {
    const da = seriesA[i] - meanA;
    const db = seriesB[i] - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }

  const denom = Math.sqrt(varA * varB);
  if (denom <= 1e-9) return 0;
  const r = cov / denom;
  return Number(Math.max(-1, Math.min(1, r)).toFixed(2));
}

export function classifyCorrelation(r: number, isSelf = false): CorrelationClassification {
  if (isSelf) {
    return { tier: 'self', label: 'Selected Anchor', isHighCorrelation: false };
  }
  if (r >= 0.6) {
    return { tier: 'high-positive', label: 'High Co-Movement', isHighCorrelation: true };
  }
  if (r >= 0.25) {
    return { tier: 'moderate-positive', label: 'Moderate Positive', isHighCorrelation: false };
  }
  if (r <= -0.55) {
    return { tier: 'high-inverse', label: 'Strong Inverse Hedge', isHighCorrelation: true };
  }
  if (r <= -0.22) {
    return { tier: 'moderate-inverse', label: 'Mild Inverse', isHighCorrelation: false };
  }
  return { tier: 'uncorrelated', label: 'Low Correlation', isHighCorrelation: false };
}

export type CorrelationBasisMode = 'mcap' | 'returns';

export interface PortfolioCorrelationMatrix {
  mode: CorrelationBasisMode;
  symbols: string[];
  matrix: Record<string, Record<string, number>>;
  rollingMatrix: Record<string, Record<string, number[]>>;
}

function computeRollingPearson(seriesA: number[], seriesB: number[], windowSize = 7): number[] {
  const n = Math.min(seriesA.length, seriesB.length);
  if (n < windowSize) return [computePearsonCorrelation(seriesA, seriesB)];
  const out: number[] = [];
  for (let end = windowSize; end <= n; end += 1) {
    out.push(
      computePearsonCorrelation(
        seriesA.slice(end - windowSize, end),
        seriesB.slice(end - windowSize, end)
      )
    );
  }
  return out;
}

export function computePortfolioCorrelationMatrix(
  bundles: AssetAnalyticsBundle[],
  mode: CorrelationBasisMode = 'mcap'
): PortfolioCorrelationMatrix {
  const symbols = bundles.map((b) => b.holding.symbol);
  const seriesBySymbol = new Map<string, number[]>();
  bundles.forEach((b) => {
    if (mode === 'mcap') {
      // Normalized 30D market cap trajectory (% change from Day -30 baseline)
      const baseMcap = b.points31d[0]?.marketCapUsd || 1;
      seriesBySymbol.set(
        b.holding.symbol,
        b.points31d.map((pt) => ((pt.marketCapUsd - baseMcap) / baseMcap) * 100)
      );
    } else {
      seriesBySymbol.set(
        b.holding.symbol,
        b.points31d.slice(1).map((pt) => pt.dailyReturnPct)
      );
    }
  });

  const matrix: Record<string, Record<string, number>> = {};
  const rollingMatrix: Record<string, Record<string, number[]>> = {};

  for (const symA of symbols) {
    matrix[symA] = {};
    rollingMatrix[symA] = {};
    const sA = seriesBySymbol.get(symA) ?? [];
    for (const symB of symbols) {
      if (symA === symB) {
        matrix[symA][symB] = 1.0;
        rollingMatrix[symA][symB] = new Array(Math.max(1, sA.length - 6)).fill(1.0);
      } else if (matrix[symB]?.[symA] !== undefined) {
        matrix[symA][symB] = matrix[symB][symA];
        rollingMatrix[symA][symB] = rollingMatrix[symB][symA];
      } else {
        const sB = seriesBySymbol.get(symB) ?? [];
        matrix[symA][symB] = computePearsonCorrelation(sA, sB);
        rollingMatrix[symA][symB] = computeRollingPearson(sA, sB, 7);
      }
    }
  }

  return { mode, symbols, matrix, rollingMatrix };
}

export function computeAssetSharpeRatio(points: TokenTimePoint[], riskFreeAnnualPct = 4.25): number {
  if (points.length < 3) return 0;
  const returns = points.slice(1).map((p) => p.dailyReturnPct);
  const meanDaily = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - meanDaily) ** 2, 0) / returns.length;
  const stdDaily = Math.sqrt(variance);
  if (stdDaily < 0.05) return 0.45;
  const annualizedReturn = meanDaily * 252;
  const annualizedVol = stdDaily * Math.sqrt(252);
  const sharpe = (annualizedReturn - riskFreeAnnualPct) / Math.max(1, annualizedVol);
  return Number(Math.max(-3.5, Math.min(4.5, sharpe)).toFixed(2));
}

export function computeMaxDrawdownPct(points: TokenTimePoint[]): number {
  if (points.length === 0) return 0;
  let peak = points[0].valuationUsd;
  let maxDd = 0;
  for (const pt of points) {
    if (pt.valuationUsd > peak) peak = pt.valuationUsd;
    if (peak > 0) {
      const dd = ((peak - pt.valuationUsd) / peak) * 100;
      if (dd > maxDd) maxDd = dd;
    }
  }
  return Number(maxDd.toFixed(2));
}

export type EcosystemCluster = 'EVM' | 'Solana' | 'Quantum';

export function inferEcosystemCluster(chain: string, symbol: string): EcosystemCluster {
  const c = chain.toLowerCase();
  const s = symbol.toUpperCase();
  if (c.includes('sol') || s.includes('SOL')) return 'Solana';
  if (c.includes('quant') || c.includes('pq') || s.includes('QNT') || s.includes('MAO') || s.includes('CMDTX')) {
    return 'Quantum';
  }
  return 'EVM';
}

export interface PortfolioAggregateSummary {
  totalValuationUsd: number;
  totalCostBasisUsd: number;
  totalPnl30dUsd: number;
  totalPnl30dPct: number;
  maxDrawdownPct: number;
  portfolioSharpe: number;
  aggregateRiskScore: number; // 0 (Ultra Safe) - 100 (Extreme Risk)
  ecosystemBreakdown: Array<{ cluster: EcosystemCluster; valueUsd: number; pct: number }>;
}

export function computePortfolioAggregateSummary(
  bundles: AssetAnalyticsBundle[]
): PortfolioAggregateSummary {
  if (bundles.length === 0) {
    return {
      totalValuationUsd: 0,
      totalCostBasisUsd: 0,
      totalPnl30dUsd: 0,
      totalPnl30dPct: 0,
      maxDrawdownPct: 0,
      portfolioSharpe: 0,
      aggregateRiskScore: 18,
      ecosystemBreakdown: [],
    };
  }

  let totalValuationUsd = 0;
  let totalCostBasisUsd = 0;
  let totalStartVal = 0;
  let weightedSharpe = 0;
  let weightedVol = 0;
  const clusterMap: Record<EcosystemCluster, number> = { EVM: 0, Solana: 0, Quantum: 0 };

  const days = bundles[0].points31d.length;
  const dailyPortfolioTotals = new Array<number>(days).fill(0);

  for (const b of bundles) {
    const val = b.latestPoint.valuationUsd;
    const startVal = b.points31d[0]?.valuationUsd ?? val;
    totalValuationUsd += val;
    totalCostBasisUsd += b.latestPoint.costBasisUsd;
    totalStartVal += startVal;

    const cluster = inferEcosystemCluster(b.holding.chain, b.holding.symbol);
    clusterMap[cluster] += val;

    b.points31d.forEach((pt, idx) => {
      if (idx < days) dailyPortfolioTotals[idx] += pt.valuationUsd;
    });
  }

  for (const b of bundles) {
    const weight = totalValuationUsd > 0 ? b.latestPoint.valuationUsd / totalValuationUsd : 1 / bundles.length;
    const sharpe = computeAssetSharpeRatio(b.points31d);
    weightedSharpe += weight * sharpe;
    weightedVol += weight * b.volatility30d.stdDevPct;
  }

  let peak = dailyPortfolioTotals[0] || 0;
  let maxDd = 0;
  for (const v of dailyPortfolioTotals) {
    if (v > peak) peak = v;
    if (peak > 0) {
      const dd = ((peak - v) / peak) * 100;
      if (dd > maxDd) maxDd = dd;
    }
  }

  const totalPnl30dUsd = totalValuationUsd - totalStartVal;
  const totalPnl30dPct = totalStartVal > 0 ? (totalPnl30dUsd / totalStartVal) * 100 : 0;

  // Risk Score 0-100: driven by weighted daily volatility and max drawdown, tempered by Sharpe
  const rawRisk = weightedVol * 16 + maxDd * 1.35 - Math.max(0, weightedSharpe) * 5.5 + 18;
  const aggregateRiskScore = Math.round(Math.max(8, Math.min(96, rawRisk)));

  const ecosystemBreakdown: Array<{ cluster: EcosystemCluster; valueUsd: number; pct: number }> = (
    ['EVM', 'Solana', 'Quantum'] as EcosystemCluster[]
  )
    .map((cluster) => ({
      cluster,
      valueUsd: Number(clusterMap[cluster].toFixed(2)),
      pct: totalValuationUsd > 0 ? Number(((clusterMap[cluster] / totalValuationUsd) * 100).toFixed(1)) : 0,
    }))
    .filter((e) => e.valueUsd > 0);

  return {
    totalValuationUsd: Number(totalValuationUsd.toFixed(2)),
    totalCostBasisUsd: Number(totalCostBasisUsd.toFixed(2)),
    totalPnl30dUsd: Number(totalPnl30dUsd.toFixed(2)),
    totalPnl30dPct: Number(totalPnl30dPct.toFixed(2)),
    maxDrawdownPct: Number(maxDd.toFixed(2)),
    portfolioSharpe: Number(weightedSharpe.toFixed(2)),
    aggregateRiskScore,
    ecosystemBreakdown,
  };
}

export interface OrderBookTier {
  price: number;
  bidSize: number;
  askSize: number;
  cumBid: number;
  cumAsk: number;
  totalVol: number;
  side: 'bid' | 'ask';
}

export function generateSimulatedOrderBook(
  midPrice: number,
  volatilitySigma: number,
  seedKey: string,
  tickOffset = 0
): OrderBookTier[] {
  const seed = hashSymbolSeed(seedKey) + tickOffset * 7919;
  const rand = createPrng(seed);
  const spreadScale = Math.max(0.0025, Math.min(0.014, 0.003 + volatilitySigma * 0.0022));
  const tiersPerSide = 12;

  const bids: OrderBookTier[] = [];
  const asks: OrderBookTier[] = [];

  for (let i = tiersPerSide; i >= 1; i -= 1) {
    const price = Number((midPrice * (1 - i * spreadScale)).toFixed(2));
    const liquidityWall = i === 3 || i === 7 ? 1.85 : 1;
    const size = Number(((120 + rand() * 540) * liquidityWall).toFixed(1));
    bids.push({ price, bidSize: size, askSize: 0, cumBid: 0, cumAsk: 0, totalVol: size, side: 'bid' });
  }
  let cBid = 0;
  for (let i = bids.length - 1; i >= 0; i -= 1) {
    cBid += bids[i].bidSize;
    bids[i].cumBid = Number(cBid.toFixed(1));
  }

  let cAsk = 0;
  for (let i = 1; i <= tiersPerSide; i += 1) {
    const price = Number((midPrice * (1 + i * spreadScale)).toFixed(2));
    const liquidityWall = i === 4 || i === 8 ? 1.9 : 1;
    const size = Number(((115 + rand() * 520) * liquidityWall).toFixed(1));
    cAsk += size;
    asks.push({
      price,
      bidSize: 0,
      askSize: size,
      cumBid: 0,
      cumAsk: Number(cAsk.toFixed(1)),
      totalVol: size,
      side: 'ask',
    });
  }

  return [...bids, ...asks];
}

export interface SocialSentimentPost {
  id: string;
  handle: string;
  source: 'X / Institutional' | 'Bloomberg Terminal' | 'On-Chain Alpha' | 'CoinDesk Wire';
  sentiment: 'bullish' | 'bearish';
  scoreDelta: number;
  headline: string;
  timestamp: string;
}

export function generateSocialSentimentForAsset(
  symbol: string,
  name: string,
  rsi: number,
  pulseTick = 0
): { score: number; posts: SocialSentimentPost[] } {
  const seed = hashSymbolSeed(symbol) + pulseTick * 101;
  const templates: Array<{
    sentiment: 'bullish' | 'bearish';
    source: SocialSentimentPost['source'];
    handle: string;
    headline: string;
    delta: number;
  }> = [
    {
      sentiment: 'bullish',
      source: 'Institutional' as never,
      handle: '@SovereignCustody',
      headline: `${symbol} (${name}) settlement throughput hits 30-day peak across qualified ERC-3643 pools.`,
      delta: 14,
    },
    {
      sentiment: 'bullish',
      source: 'On-Chain Alpha',
      handle: '@WhaleDeskQuant',
      headline: `Net exchange outflow of 420K ${symbol} into cold vault custody signaled institutional accumulation.`,
      delta: 18,
    },
    {
      sentiment: 'bearish',
      source: 'CoinDesk Wire',
      handle: '@MacroRatesDesk',
      headline: `Cross-venue basis compression pressures short-term leverage on ${symbol} perpetual pairs.`,
      delta: -12,
    },
    {
      sentiment: 'bullish',
      source: 'Bloomberg Terminal',
      handle: '@ATS_Compliance',
      headline: `SEC Reg D / Rule 144 clearing volume for ${symbol} rises +24.8% week-over-week.`,
      delta: 16,
    },
    {
      sentiment: 'bearish',
      source: 'On-Chain Alpha',
      handle: '@VolSurfaceBot',
      headline: `Elevated 2σ intraday realized volatility triggers tightened market-maker spread tiers on ${symbol}.`,
      delta: -15,
    },
    {
      sentiment: 'bullish',
      source: 'CoinDesk Wire',
      handle: '@RWA_Chronicle',
      headline: `Tokenized reserve audit confirms 100.4% collateralization backing ${symbol} treasury tranche.`,
      delta: 15,
    },
  ];

  const posts: SocialSentimentPost[] = templates.map((t, idx) => {
    const minsAgo = ((seed + idx * 17) % 54) + 2;
    return {
      id: `${symbol}-soc-${idx}-${pulseTick}`,
      handle: t.handle,
      source: idx === 0 ? 'X / Institutional' : t.source,
      sentiment: t.sentiment,
      scoreDelta: t.delta,
      headline: t.headline,
      timestamp: `${minsAgo}m ago`,
    };
  });

  const baseFromRsi = rsi < 45 ? 18 : rsi > 68 ? -8 : 12;
  const rawScore = 58 + baseFromRsi + ((seed % 21) - 10);
  const score = Math.max(8, Math.min(96, rawScore));
  return { score, posts };
}

export interface RsiBacktestResult {
  totalTrades: number;
  wins: number;
  winRatePct: number;
  finalEquityUsd: number;
  totalRoiPct: number;
  trades: Array<{
    date: string;
    side: 'BUY' | 'SELL';
    price: number;
    rsi: number;
    pnlPct: number;
  }>;
}

export function runRsiStrategyBacktest(
  points: TokenTimePoint[],
  buyThreshold: number,
  sellThreshold: number,
  initialCapitalUsd = 100_000
): RsiBacktestResult {
  let cash = initialCapitalUsd;
  let units = 0;
  let entryPrice = 0;
  let wins = 0;
  const trades: RsiBacktestResult['trades'] = [];

  for (const pt of points) {
    if (pt.rsi14 <= buyThreshold && cash > 0) {
      units = cash / Math.max(0.01, pt.priceUsd);
      entryPrice = pt.priceUsd;
      cash = 0;
      trades.push({
        date: pt.isoDate,
        side: 'BUY',
        price: pt.priceUsd,
        rsi: pt.rsi14,
        pnlPct: 0,
      });
    } else if (pt.rsi14 >= sellThreshold && units > 0) {
      cash = units * pt.priceUsd;
      const tradePnlPct = entryPrice > 0 ? ((pt.priceUsd - entryPrice) / entryPrice) * 100 : 0;
      if (tradePnlPct > 0) wins += 1;
      units = 0;
      trades.push({
        date: pt.isoDate,
        side: 'SELL',
        price: pt.priceUsd,
        rsi: pt.rsi14,
        pnlPct: Number(tradePnlPct.toFixed(2)),
      });
    }
  }

  const lastPrice = points[points.length - 1]?.priceUsd ?? 1;
  const finalEquityUsd = Number((cash + units * lastPrice).toFixed(2));
  const totalRoiPct = Number((((finalEquityUsd - initialCapitalUsd) / initialCapitalUsd) * 100).toFixed(2));
  const sellTrades = trades.filter((t) => t.side === 'SELL').length;
  const winRatePct = sellTrades > 0 ? Number(((wins / sellTrades) * 100).toFixed(1)) : totalRoiPct > 0 ? 100 : 0;

  return {
    totalTrades: trades.length,
    wins,
    winRatePct,
    finalEquityUsd,
    totalRoiPct,
    trades,
  };
}

/**
 * 5-point quadratic Savitzky-Golay smoothing filter [-3, 12, 17, 12, -3] / 35
 */
export function applySavitzkyGolay(values: number[]): number[] {
  if (values.length < 5) return [...values];
  const out = [...values];
  for (let i = 2; i < values.length - 2; i += 1) {
    out[i] = Number(
      (
        (-3 * values[i - 2] +
          12 * values[i - 1] +
          17 * values[i] +
          12 * values[i + 1] -
          3 * values[i + 2]) /
        35
      ).toFixed(4)
    );
  }
  return out;
}

