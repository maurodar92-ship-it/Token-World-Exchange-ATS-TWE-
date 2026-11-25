export interface RarityTraitAttribute {
  trait_type: string;
  value: string;
}

export interface RarityAssetInput {
  id: string | number;
  name: string;
  traits: RarityTraitAttribute[];
}

export interface TraitValueStat {
  traitType: string;
  value: string;
  count: number;
  percentage: number;
  probability: number;
  rarityScore: number;
  informationContentBits: number;
}

export interface TraitCategoryDistribution {
  traitType: string;
  totalOccurrences: number;
  uniqueValues: number;
  entropyBits: number;
  values: TraitValueStat[];
}

export type RarityTier =
  | 'Mythic'
  | 'Legendary'
  | 'Epic'
  | 'Rare'
  | 'Uncommon'
  | 'Common';

export interface ScoredAssetResult {
  id: string | number;
  name: string;
  traits: RarityTraitAttribute[];
  rarityScore: number;
  normalizedScore: number;
  rank: number;
  percentile: number;
  tier: RarityTier;
  traitBreakdown: TraitValueStat[];
}

export interface CollectionRarityReport {
  collectionSize: number;
  traitCategories: TraitCategoryDistribution[];
  flatTraitStats: TraitValueStat[];
  scoredAssets: ScoredAssetResult[];
  meanScore: number;
  maxScore: number;
  minScore: number;
  tierCounts: Record<RarityTier, number>;
}

export interface WeightedLayerDefinition {
  trait_type: string;
  options: Array<{ name: string; weight: number }>;
}

function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function classifyTier(percentile: number): RarityTier {
  if (percentile <= 1) return 'Mythic';
  if (percentile <= 5) return 'Legendary';
  if (percentile <= 15) return 'Epic';
  if (percentile <= 35) return 'Rare';
  if (percentile <= 65) return 'Uncommon';
  return 'Common';
}

/**
 * RarityService processes an NFT / digital asset collection to calculate
 * empirical trait distribution percentages, Shannon information entropy,
 * inverse-frequency rarity scores, rankings, and tier assignments.
 */
export class RarityService {
  private assets: RarityAssetInput[];
  private report: CollectionRarityReport;
  private statLookup: Map<string, TraitValueStat>;

  constructor(assets: RarityAssetInput[] = []) {
    this.assets = [...assets];
    this.statLookup = new Map();
    this.report = this.computeReport(this.assets);
  }

  /**
   * Deterministically synthesizes a weighted sample collection from HashLips-style
   * layer definitions so rarity analytics reflect realistic trait distributions.
   */
  public static generateWeightedCollection(
    layers: WeightedLayerDefinition[],
    size: number,
    seed = 20261124,
    namePrefix = 'TWE Sovereign Sigil'
  ): RarityAssetInput[] {
    const safeSize = Math.max(1, Math.min(5000, Math.floor(size)));
    const rand = createSeededRng(seed);
    const collection: RarityAssetInput[] = [];

    for (let i = 1; i <= safeSize; i += 1) {
      const traits: RarityTraitAttribute[] = layers.map((layer) => {
        const totalWeight = layer.options.reduce(
          (acc, opt) => acc + Math.max(0.01, opt.weight),
          0
        );
        let cursor = rand() * totalWeight;
        let chosen = layer.options[layer.options.length - 1];
        for (const opt of layer.options) {
          cursor -= Math.max(0.01, opt.weight);
          if (cursor <= 0) {
            chosen = opt;
            break;
          }
        }
        return {
          trait_type: layer.trait_type,
          value: chosen.name,
        };
      });

      collection.push({
        id: i,
        name: `${namePrefix} #${String(i).padStart(4, '0')}`,
        traits,
      });
    }

    return collection;
  }

  public setCollection(assets: RarityAssetInput[]): CollectionRarityReport {
    this.assets = [...assets];
    this.report = this.computeReport(this.assets);
    return this.report;
  }

  public analyzeCollection(assets?: RarityAssetInput[]): CollectionRarityReport {
    if (assets) {
      return this.setCollection(assets);
    }
    return this.report;
  }

  public getTraitDistribution(traitType?: string): TraitValueStat[] {
    if (!traitType) {
      return this.report.flatTraitStats;
    }
    return this.report.flatTraitStats.filter((stat) => stat.traitType === traitType);
  }

  public getTraitStat(traitType: string, value: string): TraitValueStat | undefined {
    return this.statLookup.get(`${traitType}::${value}`);
  }

  /**
   * Evaluates a live/candidate trait combination against the indexed collection
   * to compute its rarity score, projected rank, percentile, and tier.
   */
  public scoreTraits(
    traits: RarityTraitAttribute[],
    name = 'Live Composite'
  ): ScoredAssetResult {
    const n = Math.max(1, this.report.collectionSize);
    const traitBreakdown: TraitValueStat[] = traits.map((trait) => {
      const existing = this.statLookup.get(`${trait.trait_type}::${trait.value}`);
      if (existing) return existing;
      // Unseen trait value treated as 1-of-(N+1) ultra-rare occurrence
      const probability = 1 / (n + 1);
      return {
        traitType: trait.trait_type,
        value: trait.value,
        count: 0,
        percentage: Number((probability * 100).toFixed(2)),
        probability,
        rarityScore: Number((1 / probability).toFixed(2)),
        informationContentBits: Number((-Math.log2(probability)).toFixed(2)),
      };
    });

    const rarityScore = Number(
      traitBreakdown.reduce((sum, s) => sum + s.rarityScore, 0).toFixed(2)
    );

    const higherCount = this.report.scoredAssets.filter(
      (item) => item.rarityScore > rarityScore
    ).length;
    const rank = higherCount + 1;
    const percentile = Number(((rank / (n + 1)) * 100).toFixed(2));
    const span = Math.max(0.0001, this.report.maxScore - this.report.minScore);
    const normalizedScore =
      this.report.collectionSize <= 1
        ? 100
        : Number(
            Math.max(
              0,
              Math.min(100, ((rarityScore - this.report.minScore) / span) * 100)
            ).toFixed(1)
          );

    return {
      id: 'live-preview',
      name,
      traits,
      rarityScore,
      normalizedScore,
      rank,
      percentile,
      tier: classifyTier(percentile),
      traitBreakdown,
    };
  }

  private computeReport(assets: RarityAssetInput[]): CollectionRarityReport {
    const collectionSize = assets.length;
    this.statLookup.clear();

    const emptyTiers: Record<RarityTier, number> = {
      Mythic: 0,
      Legendary: 0,
      Epic: 0,
      Rare: 0,
      Uncommon: 0,
      Common: 0,
    };

    if (collectionSize === 0) {
      return {
        collectionSize: 0,
        traitCategories: [],
        flatTraitStats: [],
        scoredAssets: [],
        meanScore: 0,
        maxScore: 0,
        minScore: 0,
        tierCounts: emptyTiers,
      };
    }

    // Step 1: Tally occurrences per (trait_type, value)
    const categoryMap = new Map<string, Map<string, number>>();
    for (const asset of assets) {
      for (const attr of asset.traits) {
        if (!categoryMap.has(attr.trait_type)) {
          categoryMap.set(attr.trait_type, new Map());
        }
        const valueCounts = categoryMap.get(attr.trait_type)!;
        valueCounts.set(attr.value, (valueCounts.get(attr.value) ?? 0) + 1);
      }
    }

    // Step 2: Calculate empirical distribution %, inverse-frequency score & entropy
    const traitCategories: TraitCategoryDistribution[] = [];
    const flatTraitStats: TraitValueStat[] = [];

    for (const [traitType, valueCounts] of categoryMap.entries()) {
      const values: TraitValueStat[] = [];
      let totalOccurrences = 0;
      let entropyBits = 0;

      for (const [value, count] of valueCounts.entries()) {
        totalOccurrences += count;
        const probability = count / collectionSize;
        const percentage = Number((probability * 100).toFixed(2));
        const rarityScore = Number((1 / probability).toFixed(2));
        const informationContentBits = Number((-Math.log2(probability)).toFixed(2));
        entropyBits += -probability * Math.log2(probability);

        const stat: TraitValueStat = {
          traitType,
          value,
          count,
          percentage,
          probability,
          rarityScore,
          informationContentBits,
        };
        values.push(stat);
        flatTraitStats.push(stat);
        this.statLookup.set(`${traitType}::${value}`, stat);
      }

      values.sort((a, b) => b.rarityScore - a.rarityScore || a.value.localeCompare(b.value));
      traitCategories.push({
        traitType,
        totalOccurrences,
        uniqueValues: values.length,
        entropyBits: Number(entropyBits.toFixed(2)),
        values,
      });
    }

    flatTraitStats.sort(
      (a, b) =>
        b.rarityScore - a.rarityScore ||
        a.traitType.localeCompare(b.traitType) ||
        a.value.localeCompare(b.value)
    );

    // Step 3: Score every asset in the collection
    const preliminary = assets.map((asset) => {
      const traitBreakdown: TraitValueStat[] = asset.traits
        .map((t) => this.statLookup.get(`${t.trait_type}::${t.value}`))
        .filter((s): s is TraitValueStat => Boolean(s));
      const rarityScore = Number(
        traitBreakdown.reduce((sum, stat) => sum + stat.rarityScore, 0).toFixed(2)
      );
      return {
        asset,
        traitBreakdown,
        rarityScore,
      };
    });

    preliminary.sort(
      (a, b) => b.rarityScore - a.rarityScore || String(a.asset.id).localeCompare(String(b.asset.id))
    );

    const maxScore = preliminary[0].rarityScore;
    const minScore = preliminary[preliminary.length - 1].rarityScore;
    const scoreSpan = Math.max(0.0001, maxScore - minScore);
    const totalScoreSum = preliminary.reduce((acc, p) => acc + p.rarityScore, 0);
    const meanScore = Number((totalScoreSum / collectionSize).toFixed(2));

    const tierCounts: Record<RarityTier, number> = { ...emptyTiers };
    const scoredAssets: ScoredAssetResult[] = preliminary.map((entry, idx) => {
      const rank = idx + 1;
      const percentile = Number(((rank / collectionSize) * 100).toFixed(2));
      const tier = classifyTier(percentile);
      tierCounts[tier] += 1;
      const normalizedScore =
        collectionSize <= 1
          ? 100
          : Number((((entry.rarityScore - minScore) / scoreSpan) * 100).toFixed(1));

      return {
        id: entry.asset.id,
        name: entry.asset.name,
        traits: entry.asset.traits,
        rarityScore: entry.rarityScore,
        normalizedScore,
        rank,
        percentile,
        tier,
        traitBreakdown: entry.traitBreakdown,
      };
    });

    return {
      collectionSize,
      traitCategories,
      flatTraitStats,
      scoredAssets,
      meanScore,
      maxScore,
      minScore,
      tierCounts,
    };
  }
}
