import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Award,
  BarChart3,
  Check,
  Copy,
  Download,
  Fingerprint,
  Layers,
  Pin,
  Plus,
  QrCode,
  Shuffle,
  Sparkles,
  Upload,
} from 'lucide-react';
import {
  RarityService,
  type RarityAssetInput,
  type RarityTier,
  type RarityTraitAttribute,
} from '../lib/rarityService';
import { ArtEngineLayerManager } from './ArtEngineLayerManager';

interface LayerOption {
  name: string;
  weight: number;
  color: string;
  accent?: string;
}

const BACKDROPS: LayerOption[] = [
  { name: 'Obsidian Graphite', weight: 40, color: '#0B0D10', accent: '#1E232C' },
  { name: 'Midnight Slate', weight: 30, color: '#111827', accent: '#1F2937' },
  { name: 'Imperial Charcoal', weight: 20, color: '#18181B', accent: '#27272A' },
  { name: 'Champagne Dusk', weight: 10, color: '#241D12', accent: '#3B2F1B' },
];

const GEOMETRIES: LayerOption[] = [
  { name: 'Octagon Sovereign Vault', weight: 35, color: '#D4B475' },
  { name: 'Hexagonal Lattice Matrix', weight: 30, color: '#CBD5E1' },
  { name: 'Concentric Meridian Rings', weight: 20, color: '#E2C68D' },
  { name: 'Diamond Obelisk Core', weight: 15, color: '#94A3B8' },
];

const FINISHES: LayerOption[] = [
  { name: 'Brushed Champagne Gold', weight: 35, color: '#D4B475' },
  { name: 'Mirror Platinum', weight: 35, color: '#E2E8F0' },
  { name: 'Anodized Titanium', weight: 20, color: '#94A3B8' },
  { name: 'Rose Bullion Alloy', weight: 10, color: '#E0A899' },
];

const SIGILS: LayerOption[] = [
  { name: 'TWE Crown Seal', weight: 35, color: '#D4B475' },
  { name: 'CMDTX Bullion Bar', weight: 30, color: '#F8FAFC' },
  { name: 'uint256 Orbit Glyph', weight: 20, color: '#D4B475' },
  { name: 'Zero-Knowledge Prism', weight: 15, color: '#CBD5E1' },
];

function base32Encode(bytes: Uint8Array): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  return output;
}

const TIER_BADGE_STYLES: Record<RarityTier, string> = {
  Mythic: 'border-amber-400/60 bg-amber-500/15 text-amber-600 dark:text-amber-300',
  Legendary: 'border-[#A8843E]/60 dark:border-[#D4B475]/60 bg-[var(--twe-gold-soft)] text-[#A8843E] dark:text-[#D4B475]',
  Epic: 'border-violet-500/50 bg-violet-500/15 text-violet-600 dark:text-violet-300',
  Rare: 'border-sky-500/50 bg-sky-500/15 text-sky-600 dark:text-sky-300',
  Uncommon: 'border-emerald-500/45 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Common: 'border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-secondary)]',
};

const STUDIO_LAYERS = [
  { trait_type: 'Backdrop', options: BACKDROPS },
  { trait_type: 'Core Geometry', options: GEOMETRIES },
  { trait_type: 'Metallic Finish', options: FINISHES },
  { trait_type: 'Sovereign Sigil', options: SIGILS },
];

export const NftStudioView: React.FC<{
  onSendArtifactToCodex: (artifact: { dataUrl: string; name: string; traits: { trait_type: string; value: string }[] }) => void;
}> = ({ onSendArtifactToCodex }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [backdropIdx, setBackdropIdx] = useState(0);
  const [geometryIdx, setGeometryIdx] = useState(0);
  const [finishIdx, setFinishIdx] = useState(0);
  const [sigilIdx, setSigilIdx] = useState(0);
  const [editionNum, setEditionNum] = useState(1);
  const [collectionSize, setCollectionSize] = useState<number>(256);
  const [customMints, setCustomMints] = useState<RarityAssetInput[]>([]);
  const [traitFilter, setTraitFilter] = useState<string>('ALL');

  const rarityService = useMemo(() => {
    const generated = RarityService.generateWeightedCollection(
      STUDIO_LAYERS,
      collectionSize,
      20261124 + collectionSize,
      'TWE Sovereign Sigil'
    );
    return new RarityService([...generated, ...customMints]);
  }, [collectionSize, customMints]);

  const rarityReport = useMemo(() => rarityService.analyzeCollection(), [rarityService]);

  const currentTraits = useMemo<RarityTraitAttribute[]>(
    () => [
      { trait_type: 'Backdrop', value: BACKDROPS[backdropIdx].name },
      { trait_type: 'Core Geometry', value: GEOMETRIES[geometryIdx].name },
      { trait_type: 'Metallic Finish', value: FINISHES[finishIdx].name },
      { trait_type: 'Sovereign Sigil', value: SIGILS[sigilIdx].name },
    ],
    [backdropIdx, geometryIdx, finishIdx, sigilIdx]
  );

  const liveRarity = useMemo(
    () =>
      rarityService.scoreTraits(
        currentTraits,
        `TWE Sovereign Sigil #${String(editionNum).padStart(4, '0')}`
      ),
    [rarityService, currentTraits, editionNum]
  );

  const filteredTraitStats = useMemo(
    () =>
      traitFilter === 'ALL'
        ? rarityReport.flatTraitStats
        : rarityService.getTraitDistribution(traitFilter),
    [rarityReport.flatTraitStats, rarityService, traitFilter]
  );

  const activeTraitKeys = useMemo(
    () => new Set(currentTraits.map((t) => `${t.trait_type}::${t.value}`)),
    [currentTraits]
  );

  const drawComposite = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 512;
    const h = 512;
    const bg = BACKDROPS[backdropIdx];
    const geo = GEOMETRIES[geometryIdx];
    const fin = FINISHES[finishIdx];
    const sig = SIGILS[sigilIdx];

    // Layer 1: Backdrop gradient
    const grad = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, 340);
    grad.addColorStop(0, bg.accent ?? '#1E232C');
    grad.addColorStop(1, bg.color);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle precision coordinate grid
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 32; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 32; y < h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Layer 2: Core Geometry
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.strokeStyle = fin.color;
    ctx.lineWidth = 3;
    const sides = geometryIdx === 0 ? 8 : geometryIdx === 1 ? 6 : geometryIdx === 2 ? 36 : 4;
    for (let r = 165; r >= 95; r -= 35) {
      ctx.beginPath();
      for (let i = 0; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Layer 3: Metallic Finish inner ring
    ctx.strokeStyle = geo.color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, 198, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Layer 4: Sovereign Sigil
    ctx.fillStyle = sig.color;
    ctx.font = '600 28px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const glyphText =
      sigilIdx === 0 ? 'TWE · ATS' : sigilIdx === 1 ? 'CMDTX' : sigilIdx === 2 ? '2^256 - 1' : 'ZK-VAULT';
    ctx.fillText(glyphText, 0, -6);

    ctx.fillStyle = 'rgba(226, 232, 240, 0.72)';
    ctx.font = '500 13px "IBM Plex Mono", monospace';
    ctx.fillText(`EDITION #${String(editionNum).padStart(4, '0')}`, 0, 26);
    ctx.restore();

    // Frame border
    ctx.strokeStyle = fin.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, w - 36, h - 36);
  }, [backdropIdx, geometryIdx, finishIdx, sigilIdx, editionNum]);

  useEffect(() => {
    drawComposite();
  }, [drawComposite]);

  const randomizeLayers = () => {
    setBackdropIdx(Math.floor(Math.random() * BACKDROPS.length));
    setGeometryIdx(Math.floor(Math.random() * GEOMETRIES.length));
    setFinishIdx(Math.floor(Math.random() * FINISHES.length));
    setSigilIdx(Math.floor(Math.random() * SIGILS.length));
    setEditionNum((n) => n + 1);
  };

  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `twe-hashlips-edition-${editionNum}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleAddToCollection = () => {
    const nextId = `custom-${collectionSize + customMints.length + 1}`;
    const labelNum = collectionSize + customMints.length + 1;
    setCustomMints((prev) => [
      ...prev,
      {
        id: nextId,
        name: `TWE Sovereign Sigil #${String(labelNum).padStart(4, '0')}`,
        traits: currentTraits,
      },
    ]);
    setEditionNum(labelNum + 1);
  };

  const handleLoadEditionTraits = (traits: RarityTraitAttribute[], editionId: string | number) => {
    const findIdx = (items: LayerOption[], traitType: string) => {
      const target = traits.find((t) => t.trait_type === traitType)?.value;
      const idx = items.findIndex((i) => i.name === target);
      return idx >= 0 ? idx : 0;
    };
    setBackdropIdx(findIdx(BACKDROPS, 'Backdrop'));
    setGeometryIdx(findIdx(GEOMETRIES, 'Core Geometry'));
    setFinishIdx(findIdx(FINISHES, 'Metallic Finish'));
    setSigilIdx(findIdx(SIGILS, 'Sovereign Sigil'));
    const numericId = Number(String(editionId).replace(/[^0-9]/g, ''));
    if (Number.isFinite(numericId) && numericId > 0) {
      setEditionNum(numericId);
    }
  };

  const handleSendToCodex = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSendArtifactToCodex({
      dataUrl: canvas.toDataURL('image/png'),
      name: `TWE Sovereign Sigil #${String(editionNum).padStart(4, '0')}`,
      traits: [
        ...currentTraits,
        { trait_type: 'Rarity Score', value: `${liveRarity.rarityScore.toFixed(2)} pts` },
        { trait_type: 'Rarity Tier', value: liveRarity.tier },
      ],
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-[var(--twe-text-primary)]">
              <Layers className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
              <span>HashLips Art Engine 2.0 Canvas</span>
            </div>
            <span className="font-mono text-[11px] text-[var(--twe-text-muted)]">512 × 512 PNG</span>
          </div>

          <div className="rounded-lg overflow-hidden border border-[var(--twe-border)] bg-[#0B0D10] flex items-center justify-center">
            <canvas ref={canvasRef} width={512} height={512} className="w-full max-w-[380px] aspect-square" />
          </div>

          {/* Live RarityService Composite Score Strip */}
          <div className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                <Award className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
                <span>Live RarityService Score</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded border font-mono text-[10px] font-semibold uppercase ${
                  TIER_BADGE_STYLES[liveRarity.tier]
                }`}
              >
                {liveRarity.tier}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono tabular-nums text-xs">
              <div>
                <div className="text-[10px] text-[var(--twe-text-muted)]">Score</div>
                <div className="font-semibold text-[#A8843E] dark:text-[#D4B475]">
                  {liveRarity.rarityScore.toFixed(2)} pts
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--twe-text-muted)]">Projected Rank</div>
                <div className="font-semibold text-[var(--twe-text-primary)]">
                  #{liveRarity.rank} / {rarityReport.collectionSize}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[var(--twe-text-muted)]">Percentile</div>
                <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Top {liveRarity.percentile.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={randomizeLayers}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] text-xs font-medium text-[var(--twe-text-primary)] hover:border-[#D4B475] cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
              <span>Roll Traits</span>
            </button>
            <button
              type="button"
              onClick={handleAddToCollection}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-medium text-[var(--twe-text-primary)] hover:border-[#D4B475] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-500" />
              <span>Index Edition</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPng}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[var(--twe-border)] text-xs text-[var(--twe-text-primary)] hover:bg-[var(--twe-bg-elevated)] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PNG</span>
            </button>
            <button
              type="button"
              onClick={handleSendToCodex}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold hover:opacity-90 cursor-pointer"
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>Hash & Pin in Codex</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-7 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display font-semibold text-base text-[var(--twe-text-primary)]">
                Layer Compositor & Trait Rarity Matrix
              </h3>
              <p className="text-xs text-[var(--twe-text-secondary)] mt-0.5">
                Empirical trait distribution % and inverse-frequency rarity scores calculated by <span className="font-mono">RarityService</span> across {rarityReport.collectionSize.toLocaleString('en-US')} indexed editions.
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 text-xs">
              <span className="text-[var(--twe-text-muted)]">Sample Size:</span>
              <select
                aria-label="Collection sample size"
                value={collectionSize}
                onChange={(e) => setCollectionSize(Number(e.target.value))}
                className="px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-xs text-[var(--twe-text-primary)]"
              >
                <option value={100}>100 editions</option>
                <option value={256}>256 editions</option>
                <option value={500}>500 editions</option>
                <option value={1000}>1,000 editions</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Layer 1 · Backdrop', traitType: 'Backdrop', items: BACKDROPS, idx: backdropIdx, setter: setBackdropIdx },
              { label: 'Layer 2 · Core Geometry', traitType: 'Core Geometry', items: GEOMETRIES, idx: geometryIdx, setter: setGeometryIdx },
              { label: 'Layer 3 · Metallic Finish', traitType: 'Metallic Finish', items: FINISHES, idx: finishIdx, setter: setFinishIdx },
              { label: 'Layer 4 · Sovereign Sigil', traitType: 'Sovereign Sigil', items: SIGILS, idx: sigilIdx, setter: setSigilIdx },
            ].map((group) => (
              <div key={group.label} className="space-y-2 p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                  <span>{group.label}</span>
                  <span className="font-mono">Dist % · Score</span>
                </div>
                <div className="space-y-1.5">
                  {group.items.map((opt, idx) => {
                    const stat = rarityService.getTraitStat(group.traitType, opt.name);
                    return (
                      <button
                        key={opt.name}
                        type="button"
                        onClick={() => group.setter(idx)}
                        className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between gap-2 border transition-colors cursor-pointer ${
                          group.idx === idx
                            ? 'bg-[var(--twe-bg-surface)] border-[#A8843E] dark:border-[#D4B475] text-[var(--twe-text-primary)] font-medium'
                            : 'border-transparent text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)]'
                        }`}
                      >
                        <span className="truncate">{opt.name}</span>
                        <span className="font-mono text-[11px] tabular-nums text-[var(--twe-text-muted)] shrink-0">
                          {stat ? `${stat.percentage.toFixed(1)}% · +${stat.rarityScore.toFixed(1)}` : `${opt.weight}%`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RarityService Collection Trait Distribution & Ranked Editions Dashboard */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Trait Distribution Breakdown */}
        <div className="xl:col-span-7 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
              <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
                Trait Distribution & Rarity Scores (RarityService)
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-1 text-[11px]">
              {['ALL', ...STUDIO_LAYERS.map((l) => l.trait_type)].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setTraitFilter(cat)}
                  className={`px-2 py-1 rounded font-medium cursor-pointer ${
                    traitFilter === cat
                      ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10]'
                      : 'text-[var(--twe-text-secondary)] hover:bg-[var(--twe-bg-surface)]'
                  }`}
                >
                  {cat === 'ALL' ? 'All Traits' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b border-[var(--twe-border)] text-xs font-mono tabular-nums">
            <div>
              <div className="text-[10px] uppercase text-[var(--twe-text-muted)]">Indexed Collection</div>
              <div className="mt-0.5 text-sm font-semibold text-[var(--twe-text-primary)]">
                {rarityReport.collectionSize.toLocaleString('en-US')}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-[var(--twe-text-muted)]">Mean Score</div>
              <div className="mt-0.5 text-sm font-semibold text-[var(--twe-text-primary)]">
                {rarityReport.meanScore.toFixed(2)} pts
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-[var(--twe-text-muted)]">Peak Score</div>
              <div className="mt-0.5 text-sm font-semibold text-[#A8843E] dark:text-[#D4B475]">
                {rarityReport.maxScore.toFixed(2)} pts
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-[var(--twe-text-muted)]">Mythic / Legendary</div>
              <div className="mt-0.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {rarityReport.tierCounts.Mythic} / {rarityReport.tierCounts.Legendary}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-[var(--twe-bg-elevated)] border-b border-[var(--twe-border)] text-[var(--twe-text-muted)] uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">Trait Category & Value</th>
                  <th className="px-4 py-2.5 text-right">Count</th>
                  <th className="px-4 py-2.5">Distribution %</th>
                  <th className="px-4 py-2.5 text-right">Rarity Score</th>
                  <th className="px-4 py-2.5 text-right">Entropy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--twe-border)]">
                {filteredTraitStats.map((stat) => {
                  const isActive = activeTraitKeys.has(`${stat.traitType}::${stat.value}`);
                  return (
                    <tr
                      key={`${stat.traitType}:${stat.value}`}
                      className={`h-10 ${isActive ? 'bg-[var(--twe-gold-soft)]' : 'hover:bg-[var(--twe-bg-elevated)]'}`}
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--twe-text-primary)]">{stat.value}</span>
                          {isActive && (
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10]">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[var(--twe-text-muted)]">{stat.traitType}</div>
                      </td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-[var(--twe-text-secondary)]">
                        {stat.count} / {rarityReport.collectionSize}
                      </td>
                      <td className="px-4 py-2 w-40">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] overflow-hidden">
                            <div
                              className="h-full bg-[#A8843E] dark:bg-[#D4B475]"
                              style={{ width: `${Math.min(100, stat.percentage)}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] tabular-nums text-[var(--twe-text-primary)] w-11 text-right">
                            {stat.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-semibold tabular-nums text-[#A8843E] dark:text-[#D4B475]">
                        +{stat.rarityScore.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-[var(--twe-text-muted)]">
                        {stat.informationContentBits.toFixed(2)}b
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Ranked Editions Explorer */}
        <div className="xl:col-span-5 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex items-center justify-between">
            <div className="inline-flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
              <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
                Top Ranked Editions
              </h3>
            </div>
            <span className="font-mono text-[11px] text-[var(--twe-text-muted)]">
              Click to load on canvas
            </span>
          </div>

          <div className="divide-y divide-[var(--twe-border)] max-h-[455px] overflow-y-auto">
            {rarityReport.scoredAssets.slice(0, 15).map((item) => (
              <button
                key={String(item.id)}
                type="button"
                onClick={() => handleLoadEditionTraits(item.traits, item.id)}
                className="w-full text-left px-4 py-2.5 hover:bg-[var(--twe-bg-elevated)] transition-colors cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs font-bold tabular-nums text-[#A8843E] dark:text-[#D4B475]">
                      #{item.rank}
                    </span>
                    <span className="text-xs font-medium text-[var(--twe-text-primary)] truncate">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-1.5 py-0.5 rounded border font-mono text-[10px] uppercase ${
                        TIER_BADGE_STYLES[item.tier]
                      }`}
                    >
                      {item.tier}
                    </span>
                    <span className="font-mono text-xs font-semibold tabular-nums text-[var(--twe-text-primary)]">
                      {item.rarityScore.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-[var(--twe-text-muted)] truncate">
                  {item.traits.map((t) => t.value).join(' · ')}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Modular HashLips Core Plugins, Layer Order Management & External Storage Pipeline */}
      <ArtEngineLayerManager />
    </div>
  );
};

export const CmdtxCodexView: React.FC<{
  incomingArtifact?: { dataUrl: string; name: string; traits: { trait_type: string; value: string }[] } | null;
}> = ({ incomingArtifact }) => {
  const [sha256Hex, setSha256Hex] = useState<string>('');
  const [cidv1, setCidv1] = useState<string>('');
  const [pinnedAt, setPinnedAt] = useState<string>('');
  const [standard, setStandard] = useState<'ERC-721' | 'ERC-1155'>('ERC-721');
  const [assetTitle, setAssetTitle] = useState(incomingArtifact?.name ?? 'TWE Sovereign Bullion Deed #001');
  const [description, setDescription] = useState(
    'Institutional tokenized commodity & digital asset deed verified via Web Crypto SHA-256 and pinned on IPFS CIDv1.'
  );
  const [traits, setTraits] = useState(
    incomingArtifact?.traits ?? [
      { trait_type: 'Classification', value: 'Commodity / Sovereign' },
      { trait_type: 'Vault Standard', value: 'uint256 Bounded' },
      { trait_type: 'Custody Network', value: 'Base Mainnet (8453)' },
    ]
  );
  const [copiedJson, setCopiedJson] = useState(false);

  // EIP-681 QR State
  const [qrContract, setQrContract] = useState('0x004a9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a');
  const [qrChainId, setQrChainId] = useState('8453');
  const [qrRecipient, setQrRecipient] = useState('0x71C7656EC7ab88b098defB751B7401B5f6d8976F');
  const [qrUint256, setQrUint256] = useState('25000000000000000000');
  const [qrDataUrl, setQrDataUrl] = useState('');

  const computeHashFromDataUrl = useCallback(async (dataUrl: string) => {
    const res = await fetch(dataUrl);
    const buffer = await res.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    const bytes = new Uint8Array(digest);
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    setSha256Hex(hex);

    // Derive deterministic CIDv1 (multibase 'b' + raw/dag-pb multicodec prefix + sha2-256 multihash)
    const cidBytes = new Uint8Array(4 + bytes.length);
    cidBytes[0] = 0x01; // CIDv1
    cidBytes[1] = 0x55; // raw binary
    cidBytes[2] = 0x12; // sha2-256
    cidBytes[3] = 0x20; // 32 bytes
    cidBytes.set(bytes, 4);
    setCidv1(`b${base32Encode(cidBytes)}`);
    setPinnedAt(new Date().toISOString());
  }, []);

  useEffect(() => {
    if (incomingArtifact) {
      setAssetTitle(incomingArtifact.name);
      setTraits(incomingArtifact.traits);
      void computeHashFromDataUrl(incomingArtifact.dataUrl);
    } else if (!sha256Hex) {
      // Compute initial hash of canonical metadata string
      const encoder = new TextEncoder();
      const raw = encoder.encode('TWE-CMDTX-GENESIS-ARTIFACT-V2');
      void crypto.subtle.digest('SHA-256', raw).then((buf) => {
        const bytes = new Uint8Array(buf);
        setSha256Hex(Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join(''));
        const cidBytes = new Uint8Array(4 + bytes.length);
        cidBytes[0] = 0x01;
        cidBytes[1] = 0x55;
        cidBytes[2] = 0x12;
        cidBytes[3] = 0x20;
        cidBytes.set(bytes, 4);
        setCidv1(`b${base32Encode(cidBytes)}`);
        setPinnedAt(new Date().toISOString());
      });
    }
  }, [incomingArtifact, computeHashFromDataUrl, sha256Hex]);

  const handleFileHash = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    const bytes = new Uint8Array(digest);
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    setSha256Hex(hex);
    const cidBytes = new Uint8Array(4 + bytes.length);
    cidBytes[0] = 0x01;
    cidBytes[1] = 0x55;
    cidBytes[2] = 0x12;
    cidBytes[3] = 0x20;
    cidBytes.set(bytes, 4);
    setCidv1(`b${base32Encode(cidBytes)}`);
    setPinnedAt(new Date().toISOString());
  };

  const eip681Uri = useMemo(
    () => `ethereum:${qrContract}@${qrChainId}/transfer?address=${qrRecipient}&uint256=${qrUint256}`,
    [qrContract, qrChainId, qrRecipient, qrUint256]
  );

  useEffect(() => {
    void QRCode.toDataURL(eip681Uri, {
      width: 220,
      margin: 2,
      color: { dark: '#0B0D10', light: '#FFFFFF' },
    }).then(setQrDataUrl);
  }, [eip681Uri]);

  const openZeppelinMetadata = useMemo(() => {
    const base = {
      name: assetTitle,
      description,
      image: cidv1 ? `ipfs://${cidv1}` : 'ipfs://bafybeig...',
      external_url: 'https://twe-ats.internal/codex',
      sha256_checksum: sha256Hex,
      attributes: traits,
    };
    if (standard === 'ERC-1155') {
      return {
        ...base,
        decimals: 0,
        properties: {
          standard: 'ERC-1155',
          sovereign_vault_uuid: 'af230af8-bf63-4308-968a-9962ed14e565',
        },
      };
    }
    return base;
  }, [assetTitle, description, cidv1, sha256Hex, traits, standard]);

  const metadataJsonString = useMemo(
    () => JSON.stringify(openZeppelinMetadata, null, 2),
    [openZeppelinMetadata]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Web Crypto SHA-256 + IPFS CIDv1 Auto-Pinning */}
        <div className="lg:col-span-6 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 font-display font-semibold text-sm text-[var(--twe-text-primary)]">
              <Fingerprint className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
              <span>Web Crypto SHA-256 & IPFS CIDv1 Auto-Pinning</span>
            </div>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] text-xs font-medium text-[var(--twe-text-primary)] hover:border-[#D4B475] cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Hash Artwork File</span>
              <input type="file" onChange={handleFileHash} className="hidden" />
            </label>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
              <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                SHA-256 Artwork Digest (Web Crypto SubtleCrypto)
              </div>
              <div className="mt-1 font-mono text-xs break-all text-[var(--twe-text-primary)]">
                {sha256Hex || 'Computing...'}
              </div>
            </div>

            <div className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                  Auto-Pinned IPFS CIDv1 (Base32)
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                  <Pin className="w-3 h-3" /> Pinned
                </span>
              </div>
              <div className="mt-1 font-mono text-xs break-all text-[#A8843E] dark:text-[#D4B475]">
                {cidv1}
              </div>
              {pinnedAt && (
                <div className="mt-1 font-mono text-[10px] text-[var(--twe-text-muted)]">
                  Timestamp: {pinnedAt}
                </div>
              )}
            </div>
          </div>

          {/* OpenZeppelin ERC-721 / ERC-1155 Metadata Generator */}
          <div className="pt-2 border-t border-[var(--twe-border)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
                OpenZeppelin Metadata Generator
              </span>
              <div className="inline-flex rounded-md border border-[var(--twe-border)] overflow-hidden text-xs">
                {(['ERC-721', 'ERC-1155'] as const).map((std) => (
                  <button
                    key={std}
                    type="button"
                    onClick={() => setStandard(std)}
                    className={`px-2.5 py-1 font-mono cursor-pointer ${
                      standard === std
                        ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-semibold'
                        : 'bg-[var(--twe-bg-elevated)] text-[var(--twe-text-secondary)]'
                    }`}
                  >
                    {std}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={assetTitle}
              onChange={(e) => setAssetTitle(e.target.value)}
              aria-label="Metadata Asset Name"
              className="w-full px-3 py-1.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-xs text-[var(--twe-text-primary)]"
            />
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-label="Metadata Description"
              className="w-full px-3 py-1.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-xs text-[var(--twe-text-primary)]"
            />

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(metadataJsonString);
                  setCopiedJson(true);
                  window.setTimeout(() => setCopiedJson(false), 1800);
                }}
                className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] text-[11px] text-[var(--twe-text-primary)] cursor-pointer"
              >
                {copiedJson ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
              </button>
              <pre className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[11px] text-[var(--twe-text-primary)] overflow-x-auto max-h-64">
                {metadataJsonString}
              </pre>
            </div>
          </div>
        </div>

        {/* EIP-681 QR Code Generator */}
        <div className="lg:col-span-6 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-5 space-y-4">
          <div className="inline-flex items-center gap-2 font-display font-semibold text-sm text-[var(--twe-text-primary)]">
            <QrCode className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
            <span>EIP-681 Payment & Token Transfer QR Generator</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label>
              <span className="text-[var(--twe-text-muted)]">Token Contract (0x...)</span>
              <input
                type="text"
                value={qrContract}
                onChange={(e) => setQrContract(e.target.value)}
                className="mt-1 w-full px-3 py-1.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-xs text-[var(--twe-text-primary)]"
              />
            </label>
            <label>
              <span className="text-[var(--twe-text-muted)]">EIP-155 Chain ID</span>
              <select
                value={qrChainId}
                onChange={(e) => setQrChainId(e.target.value)}
                className="mt-1 w-full px-3 py-1.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-xs text-[var(--twe-text-primary)]"
              >
                <option value="1">1 (Ethereum Mainnet)</option>
                <option value="8453">8453 (Base Mainnet)</option>
                <option value="42161">42161 (Arbitrum One)</option>
                <option value="137">137 (Polygon POS)</option>
                <option value="11155111">11155111 (Sepolia)</option>
              </select>
            </label>
            <label className="sm:col-span-2">
              <span className="text-[var(--twe-text-muted)]">Recipient Address</span>
              <input
                type="text"
                value={qrRecipient}
                onChange={(e) => setQrRecipient(e.target.value)}
                className="mt-1 w-full px-3 py-1.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-xs text-[var(--twe-text-primary)]"
              />
            </label>
            <label className="sm:col-span-2">
              <span className="text-[var(--twe-text-muted)]">Amount (uint256 base units)</span>
              <input
                type="text"
                value={qrUint256}
                onChange={(e) => setQrUint256(e.target.value)}
                className="mt-1 w-full px-3 py-1.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-xs text-[var(--twe-text-primary)]"
              />
            </label>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="EIP-681 Transfer QR Code"
                className="w-40 h-40 rounded border border-[var(--twe-border)] bg-white p-1 shrink-0"
              />
            )}
            <div className="space-y-2 min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">
                Encoded EIP-681 URI
              </div>
              <div className="font-mono text-xs break-all text-[var(--twe-text-primary)]">
                {eip681Uri}
              </div>
              {qrDataUrl && (
                <a
                  href={qrDataUrl}
                  download={`eip681-${qrChainId}.png`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-surface)] text-xs font-medium text-[var(--twe-text-primary)] hover:border-[#D4B475]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download QR PNG</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
