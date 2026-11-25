import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Coins,
  Compass,
  Globe,
  Layers,
  Pause,
  Play,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import { WORKSPACE_HUBS } from '../data/hubs';
import type { HubId, TweAssetRecord, WorldCommodity } from '../types/twe';
import { RWA_HUB_NODES } from './PlanetaryGlobeCanvas';
import {
  buildItemOrbitalSvgMarkup,
  GENERATED_SECTION_IMAGES,
  HUB_VISUAL_PROFILES,
  selectBackdropForItem,
  svgToDataUrl,
} from '../lib/visualRegistry';

export type OrbitalDeckCategory = 'sections' | 'commodities' | 'nodes' | 'assets';

export interface OrbitalVisualCard {
  id: string;
  category: OrbitalDeckCategory;
  code: string;
  title: string;
  subtitle: string;
  metaLine: string;
  imageUrl: string;
  accentHex: string;
  hubId?: HubId;
  nodeId?: string;
  commodityCode?: string;
}

interface OrbitalVisualShowcaseProps {
  commodities: WorldCommodity[];
  assets?: TweAssetRecord[];
  selectedNodeId?: string;
  onSelectNode?: (nodeId: string) => void;
  onNavigateHub?: (hubId: HubId) => void;
  onMintCommodity?: (code: string) => void;
}

export const OrbitalVisualShowcase: React.FC<OrbitalVisualShowcaseProps> = ({
  commodities,
  assets = [],
  selectedNodeId,
  onSelectNode,
  onNavigateHub,
  onMintCommodity,
}) => {
  const [category, setCategory] = useState<OrbitalDeckCategory>('sections');
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return false;
    }
    return true;
  });
  const [orbitDeg, setOrbitDeg] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2>(1);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [customSvgs, setCustomSvgs] = useState<Record<string, string>>({});
  const [synthBusyId, setSynthBusyId] = useState<string | null>(null);
  const [synthError, setSynthError] = useState<string | null>(null);
  const dragStartXRef = useRef<number | null>(null);

  const deckItems: OrbitalVisualCard[] = useMemo(() => {
    if (category === 'sections') {
      return WORKSPACE_HUBS.map((hub) => {
        const profile = HUB_VISUAL_PROFILES[hub.id];
        return {
          id: `hub-${hub.id}`,
          category: 'sections',
          code: hub.label.toUpperCase().slice(0, 10),
          title: hub.label,
          subtitle: profile.title,
          metaLine: `${hub.group} · ${profile.telemetryTag}`,
          imageUrl: profile.imageUrl,
          accentHex: profile.accentHex,
          hubId: hub.id,
        };
      });
    }

    if (category === 'nodes') {
      return RWA_HUB_NODES.map((node) => ({
        id: `node-${node.id}`,
        category: 'nodes',
        code: node.id.toUpperCase(),
        title: node.name,
        subtitle: node.commodity,
        metaLine: `Lat ${node.lat.toFixed(2)}° · Lng ${node.lng.toFixed(2)}° · ${node.telemetry}`,
        imageUrl:
          node.id === 'dubai'
            ? GENERATED_SECTION_IMAGES.sovereignVault
            : node.id === 'rotterdam'
              ? GENERATED_SECTION_IMAGES.complianceNexus
              : GENERATED_SECTION_IMAGES.commoditiesNode,
        accentHex: `#${node.colorHex.toString(16).padStart(6, '0')}`,
        nodeId: node.id,
      }));
    }

    if (category === 'assets' && assets.length > 0) {
      return assets.slice(0, 18).map((asset) => ({
        id: `asset-${asset.id}`,
        category: 'assets',
        code: asset.symbol,
        title: asset.name,
        subtitle: `${asset.kind} · ${asset.standard} on ${asset.chain}`,
        metaLine: `$${asset.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · RSI ${asset.rsi14.toFixed(1)} · ${asset.contractAddress.slice(0, 10)}…`,
        imageUrl: selectBackdropForItem({ kind: asset.kind, symbol: asset.symbol }),
        accentHex: asset.change24hPct >= 0 ? '#10B981' : '#D4B475',
      }));
    }

    return commodities.slice(0, 24).map((c) => ({
      id: `comm-${c.code}`,
      category: 'commodities',
      code: c.code,
      title: c.name,
      subtitle: `${c.sector} · ${c.exchange}`,
      metaLine: `$${c.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/${c.unit} · ${c.originCountry} (ISO ${c.originIso})`,
      imageUrl: selectBackdropForItem({ sector: c.sector, code: c.code }),
      accentHex: c.sector === 'Precious Metals' ? '#D4B475' : c.sector === 'Energy' ? '#06B6D4' : '#10B981',
      commodityCode: c.code,
    }));
  }, [category, commodities, assets]);

  // Clamp active index on category switch
  useEffect(() => {
    setActiveIndex(0);
    setOrbitDeg(0);
  }, [category]);

  // Synchronize node focus when user clicks a 3D Earth hub node
  useEffect(() => {
    if (category === 'nodes' && selectedNodeId) {
      const idx = deckItems.findIndex((d) => d.nodeId === selectedNodeId);
      if (idx >= 0) {
        setActiveIndex(idx);
      }
    }
  }, [category, selectedNodeId, deckItems]);

  // Continuous orbital rotation timer
  useEffect(() => {
    if (!autoRotate || deckItems.length <= 1) return;
    const stepMs = speedMultiplier === 2 ? 2200 : 3800;
    const id = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % deckItems.length);
      setOrbitDeg((prev) => prev - 360 / Math.min(10, deckItems.length));
    }, stepMs);
    return () => window.clearInterval(id);
  }, [autoRotate, speedMultiplier, deckItems.length]);

  const currentItem = deckItems[activeIndex] ?? deckItems[0];

  // Visible 7-card orbital arc centered on activeIndex
  const visibleArc = useMemo(() => {
    const total = deckItems.length;
    if (total === 0) return [];
    const span = Math.min(total, 7);
    const half = Math.floor(span / 2);
    const list: Array<{ item: OrbitalVisualCard; index: number; offset: number }> = [];
    for (let offset = -half; offset <= half; offset++) {
      if (list.length >= span) break;
      const idx = (activeIndex + offset + total) % total;
      list.push({ item: deckItems[idx], index: idx, offset });
    }
    return list;
  }, [deckItems, activeIndex]);

  const stepBy = (delta: number) => {
    if (deckItems.length === 0) return;
    setAutoRotate(false);
    setActiveIndex((prev) => (prev + delta + deckItems.length) % deckItems.length);
    setOrbitDeg((prev) => prev - delta * 36);
  };

  const handleSynthesizeDynamicEmblem = async (card: OrbitalVisualCard) => {
    setSynthBusyId(card.id);
    setSynthError(null);
    try {
      const res = await fetch('/api/ai/generate-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Planetary Exchange Emblem for ${card.title} (${card.code}): ${card.subtitle}. Dark obsidian, champagne gold orbital rings, geometric precision.`,
          standard: 'ERC-721',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Synthesis failed');
      if (json.concept?.svgMarkup) {
        setCustomSvgs((prev) => ({ ...prev, [card.id]: json.concept.svgMarkup }));
      }
    } catch (err: unknown) {
      setSynthError(err instanceof Error ? err.message : 'Could not synthesize vector emblem.');
    } finally {
      setSynthBusyId(null);
    }
  };

  if (!currentItem) return null;

  const activeSvgMarkup =
    customSvgs[currentItem.id] ||
    buildItemOrbitalSvgMarkup({
      ticker: currentItem.code,
      title: currentItem.title,
      accentHex: currentItem.accentHex,
      subtitle: currentItem.subtitle,
    });

  return (
    <section
      aria-label="Interactive Planetary Orbital Visual Gallery"
      className="rounded-xl border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] overflow-hidden"
    >
      {/* Header & Deck Controls */}
      <div className="p-4 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-display font-semibold text-[var(--twe-text-primary)] flex items-center gap-2">
            <RotateCw className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
            <span>Planetary Orbital Visual Gallery &amp; Dynamic Item Showcase</span>
          </h2>
          <p className="text-[11px] font-mono text-[var(--twe-text-muted)] mt-0.5">
            Drag, click, or auto-orbit across all 18 sections, 46 commodities, RWA globe nodes &amp; exchange instruments
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Segmented Filter */}
          <div className="inline-flex rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] p-0.5 text-[11px]">
            {(
              [
                { id: 'sections', label: '18 Sections', icon: Layers },
                { id: 'commodities', label: 'Commodities', icon: Coins },
                { id: 'nodes', label: 'Globe Nodes', icon: Globe },
                ...(assets.length > 0 ? [{ id: 'assets', label: 'Assets', icon: Compass }] : []),
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = category === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategory(tab.id as OrbitalDeckCategory)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    active
                      ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10]'
                      : 'text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)]'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Orbit Playback Controls */}
          <button
            type="button"
            onClick={() => setAutoRotate((v) => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-xs font-medium text-[var(--twe-text-primary)] hover:border-[#D4B475] cursor-pointer"
          >
            {autoRotate ? <Pause className="w-3.5 h-3.5 text-[#D4B475]" /> : <Play className="w-3.5 h-3.5 text-emerald-500" />}
            <span>{autoRotate ? 'Pause Orbit' : 'Auto-Orbit'}</span>
          </button>

          <button
            type="button"
            onClick={() => setSpeedMultiplier((s) => (s === 1 ? 2 : 1))}
            className="px-2.5 py-1.5 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] font-mono text-[11px] text-[var(--twe-text-secondary)] hover:border-[#D4B475] cursor-pointer tabular-nums"
          >
            {speedMultiplier}x Orbit
          </button>
        </div>
      </div>

      {/* 3D Orbital Ring Viewport + Active Focus Stage */}
      <div className="grid grid-cols-1 xl:grid-cols-12">
        {/* Left 7 Cols: Interactive 3D Rotating Planetary Card Ring */}
        <div
          className="xl:col-span-7 relative min-h-[380px] p-5 bg-[#080A0E] overflow-hidden flex flex-col justify-between select-none"
          onPointerDown={(e) => {
            dragStartXRef.current = e.clientX;
          }}
          onPointerUp={(e) => {
            if (dragStartXRef.current !== null) {
              const dx = e.clientX - dragStartXRef.current;
              if (Math.abs(dx) > 36) {
                stepBy(dx < 0 ? 1 : -1);
              }
              dragStartXRef.current = null;
            }
          }}
        >
          {/* Subtle Orbital Meridian SVG Backdrop (Pure Vector Geometry) */}
          <svg
            aria-hidden="true"
            viewBox="0 0 800 420"
            className="pointer-events-none absolute inset-0 w-full h-full opacity-30"
          >
            <ellipse
              cx="400"
              cy="225"
              rx="340"
              ry="96"
              fill="none"
              stroke="#D4B475"
              strokeWidth="1"
              strokeDasharray="6 6"
            />
            <ellipse
              cx="400"
              cy="225"
              rx="250"
              ry="68"
              fill="none"
              stroke="#38BDF8"
              strokeWidth="0.9"
              opacity="0.65"
            />
          </svg>

          <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-[#94A3B8]">
            <span>
              ORBITAL SLOT {activeIndex + 1} / {deckItems.length} · MERIDIAN{' '}
              {Math.abs(Math.round(orbitDeg)) % 360}°
            </span>
            <span>Drag horizontally or click any orbiting card</span>
          </div>

          {/* 3D Perspective Carousel Arc */}
          <div
            className="relative z-10 h-[250px] w-full flex items-center justify-center my-2"
            style={{ perspective: '1200px' }}
          >
            {visibleArc.map(({ item, index, offset }) => {
              const abs = Math.abs(offset);
              const isCenter = offset === 0;
              const translateX = offset * 138;
              const translateZ = -abs * 95;
              const rotateY = -offset * 22;
              const scale = isCenter ? 1.06 : Math.max(0.68, 1 - abs * 0.14);
              const opacity = isCenter ? 1 : Math.max(0.32, 1 - abs * 0.24);
              const imgFailed = failedImages[item.id];
              const badgeUrl = svgToDataUrl(
                customSvgs[item.id] ||
                  buildItemOrbitalSvgMarkup({
                    ticker: item.code,
                    title: item.title,
                    accentHex: item.accentHex,
                  })
              );

              return (
                <button
                  key={`${item.id}-${offset}`}
                  type="button"
                  onClick={() => {
                    setAutoRotate(false);
                    setActiveIndex(index);
                    if (item.nodeId && onSelectNode) onSelectNode(item.nodeId);
                  }}
                  style={{
                    transform: `translate3d(${translateX}px, 0px, ${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                    opacity,
                    zIndex: 30 - abs * 5,
                    transition: 'transform 520ms cubic-bezier(0.16, 1, 0.3, 1), opacity 420ms ease',
                  }}
                  className={`absolute w-48 h-56 rounded-xl overflow-hidden text-left border cursor-pointer ${
                    isCenter
                      ? 'border-[#D4B475] shadow-[0_18px_42px_rgba(0,0,0,0.75)]'
                      : 'border-white/15 hover:border-[#D4B475]/60'
                  } bg-[#11151C]`}
                >
                  {!imgFailed ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      onError={() => setFailedImages((prev) => ({ ...prev, [item.id]: true }))}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#171C26] via-[#0B0D10] to-[#1D1810]" />
                  )}

                  {/* Measured Contrast Scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/25" />

                  {/* Rotating Planetary Emblem Overlay */}
                  <div className="absolute top-3 right-3 w-12 h-12 rounded-full overflow-hidden border border-[#D4B475]/50 bg-[#080A0E]/85">
                    <img
                      src={badgeUrl}
                      alt={`${item.code} orbital seal`}
                      referrerPolicy="no-referrer"
                      className={`w-full h-full object-contain ${isCenter ? 'twe-spin-slow' : ''}`}
                    />
                  </div>

                  {/* Card Footer Copy */}
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <div className="font-mono text-[10px] tracking-wider" style={{ color: item.accentHex }}>
                      {item.code}
                    </div>
                    <div className="font-display font-semibold text-xs text-white truncate mt-0.5">
                      {item.title}
                    </div>
                    <div className="text-[10px] text-slate-300 truncate mt-0.5">{item.subtitle}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Carousel Stepping Controls */}
          <div className="relative z-10 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => stepBy(-1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-white/15 bg-[#12161E] text-xs text-slate-200 hover:border-[#D4B475] cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-1 overflow-x-auto max-w-[320px] py-1">
              {deckItems.slice(0, 12).map((d, idx) => (
                <button
                  key={d.id}
                  type="button"
                  aria-label={`Select ${d.title}`}
                  onClick={() => {
                    setAutoRotate(false);
                    setActiveIndex(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === activeIndex ? 'w-6 bg-[#D4B475]' : 'w-2 bg-white/25 hover:bg-white/45'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => stepBy(1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-white/15 bg-[#12161E] text-xs text-slate-200 hover:border-[#D4B475] cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right 5 Cols: Focused Rotating Emblem Inspector & Actions */}
        <div className="xl:col-span-5 p-5 border-t xl:border-t-0 xl:border-l border-[var(--twe-border)] bg-[var(--twe-bg-surface)] flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono text-[#A8843E] dark:text-[#D4B475]">
                  {currentItem.code} · {currentItem.category.toUpperCase()}
                </div>
                <h3 className="text-base font-display font-semibold text-[var(--twe-text-primary)] mt-0.5">
                  {currentItem.title}
                </h3>
                <p className="text-xs text-[var(--twe-text-secondary)] mt-0.5">{currentItem.subtitle}</p>
              </div>
            </div>

            {/* Interactive Split Visual Plate: Photographic Backdrop + Live Rotating Vector Seal */}
            <div className="relative h-48 rounded-lg overflow-hidden border border-[var(--twe-border)] bg-[#0B0D10]">
              {!failedImages[currentItem.id] ? (
                <img
                  src={currentItem.imageUrl}
                  alt={currentItem.title}
                  referrerPolicy="no-referrer"
                  onError={() => setFailedImages((prev) => ({ ...prev, [currentItem.id]: true }))}
                  className="w-full h-full object-cover opacity-75"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#171C26] to-[#0B0D10]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/75" />

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-36 h-36 flex items-center justify-center">
                  {/* Counter-rotating orbital ring */}
                  <div className="absolute inset-0 rounded-full border border-dashed border-[#D4B475]/55 twe-spin-reverse" />
                  {/* Rotating core emblem */}
                  <div
                    className="w-28 h-28 rounded-full overflow-hidden border border-[#D4B475]/75 bg-[#080A0E]/85 twe-spin-slow"
                    dangerouslySetInnerHTML={{ __html: activeSvgMarkup }}
                  />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] font-mono text-[11px] text-[var(--twe-text-secondary)]">
              {currentItem.metaLine}
            </div>

            {synthError && (
              <div className="p-2.5 rounded border border-rose-500/40 bg-rose-500/10 text-xs text-rose-600 dark:text-rose-400">
                {synthError}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--twe-border)]">
            <button
              type="button"
              disabled={synthBusyId === currentItem.id}
              onClick={() => handleSynthesizeDynamicEmblem(currentItem)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] text-xs font-medium text-[var(--twe-text-primary)] hover:border-[#D4B475] disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
              <span>
                {synthBusyId === currentItem.id
                  ? 'Synthesizing Vector Emblem...'
                  : 'Synthesize Custom Emblem'}
              </span>
            </button>

            {currentItem.hubId && onNavigateHub && (
              <button
                type="button"
                onClick={() => onNavigateHub(currentItem.hubId!)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold hover:opacity-90 cursor-pointer ml-auto"
              >
                <span>Open Section</span>
              </button>
            )}

            {currentItem.nodeId && onSelectNode && (
              <button
                type="button"
                onClick={() => onSelectNode(currentItem.nodeId!)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold hover:opacity-90 cursor-pointer ml-auto"
              >
                <span>Focus 3D Globe Node</span>
              </button>
            )}

            {currentItem.commodityCode && onMintCommodity && (
              <button
                type="button"
                onClick={() => onMintCommodity(currentItem.commodityCode!)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold hover:opacity-90 cursor-pointer ml-auto"
              >
                <span>Mint Commodity Token</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
