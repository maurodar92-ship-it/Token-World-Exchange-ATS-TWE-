import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Check,
  CheckCircle2,
  Code2,
  Coins,
  Copy,
  Cpu,
  Droplets,
  Globe,
  Heart,
  Layers,
  Lock,
  Search,
  Server,
  ShieldCheck,
  Volume2,
  VolumeX,
  Wand2,
  Wind,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  PlanetaryGlobeCanvas,
  RWA_HUB_NODES,
  type GlobeMode,
} from './PlanetaryGlobeCanvas';
import { PlanetaryMapStudioPanel } from './PlanetaryMapStudioPanel';
import { OrbitalVisualShowcase } from './OrbitalVisualShowcase';
import { ItemVisualModal, type ItemVisualTarget } from './ItemVisualModal';
import { buildItemOrbitalSvgMarkup, svgToDataUrl } from '../lib/visualRegistry';
import {
  generateHubPlanetaryMap,
  HUB_PLANETARY_DEFAULTS,
  type GeneratedPlanetaryMapAsset,
  type NanoBananaStyleId,
} from '../lib/planetaryMapGenerator';
import { WORKSPACE_HUBS } from '../data/hubs';
import { trackWorkspaceEvent } from '../lib/analytics';
import { isAiEnabled } from '../lib/aiMode';
import type { HubId, TweAssetRecord, WorldCommodity } from '../types/twe';

type PlanetaryTab = 'cartography' | 'planetary' | 'bitmask' | 'qamm' | 'compliance';

export const PlanetarySystemView: React.FC<{
  onCommoditiesTokenized?: () => void;
  assets?: TweAssetRecord[];
  onNavigateHub?: (hubId: HubId) => void;
}> = ({ onCommoditiesTokenized, assets = [], onNavigateHub }) => {
  const [activeTab, setActiveTab] = useState<PlanetaryTab>('cartography');
  const [globeMode, setGlobeMode] = useState<GlobeMode>('rwahubs');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('houston');
  const [narrativeOpen, setNarrativeOpen] = useState(false);
  const [visualTarget, setVisualTarget] = useState<ItemVisualTarget | null>(null);

  // Nano Banana 3D Planetary Map Generator state across all 17+ hubs
  const [selectedMapHub, setSelectedMapHub] = useState<HubId>('planetary-system');
  const [selectedStyle, setSelectedStyle] = useState<NanoBananaStyleId>('obsidian-gilded');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [continentScale, setContinentScale] = useState<number>(1.95);
  const [seaLevel, setSeaLevel] = useState<number>(0.45);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showArcs, setShowArcs] = useState<boolean>(true);
  const [generatedMapBank, setGeneratedMapBank] = useState<
    Partial<Record<HubId, GeneratedPlanetaryMapAsset>>
  >({});
  const [activeMap, setActiveMap] = useState<GeneratedPlanetaryMapAsset | null>(null);
  const [aiLoreSummary, setAiLoreSummary] = useState<string | null>(null);
  const [aiLoreBusy, setAiLoreBusy] = useState(false);
  const capture3dFnRef = useRef<(() => void) | null>(null);

  // Synthesized Web Audio feedback (user-controlled)
  const [audioEnabled, setAudioEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playTone = useCallback(
    (freq = 480, type: OscillatorType = 'sine', duration = 0.14) => {
      if (!audioEnabled) return;
      try {
        if (!audioCtxRef.current) {
          const Ctx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          audioCtxRef.current = new Ctx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          void ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch {
        // Ignore audio errors when autoplay/context blocked
      }
    },
    [audioEnabled]
  );

  const handleToggleAudio = useCallback(() => {
    setAudioEnabled((prev) => {
      const next = !prev;
      if (next) {
        try {
          if (!audioCtxRef.current) {
            const Ctx =
              window.AudioContext ||
              (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            audioCtxRef.current = new Ctx();
          }
          if (audioCtxRef.current.state === 'suspended') {
            void audioCtxRef.current.resume();
          }
          const ctx = audioCtxRef.current;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, ctx.currentTime);
          gain.gain.setValueAtTime(0.04, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.18);
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, []);

  // Tab 1: Fractional RWA Token Yield Simulator state
  const [principalUsd, setPrincipalUsd] = useState<number>(100000);
  const monthlyDividendUsd = Math.round((principalUsd * 0.094) / 12);
  const co2OffsetTons = (principalUsd * 0.000425).toFixed(1);

  // Tab 2: uint256 Bitmask Encoder state (TWECommodityEncoder.sol)
  const [bmCountry, setBmCountry] = useState<string>('840');
  const [bmType, setBmType] = useState<string>('1');
  const [bmApi, setBmApi] = useState<string>('3960');
  const [bmSulfur, setBmSulfur] = useState<string>('240');
  const [bmPort, setBmPort] = useState<string>('713');
  const [bmCert, setBmCert] = useState<string>('987654321098');
  const [bmTimestamp, setBmTimestamp] = useState<number>(() => Math.floor(Date.now() / 1000));
  const [copiedBitmask, setCopiedBitmask] = useState(false);

  const bitmaskResult = useMemo(() => {
    const parseSafe = (val: string, fallback: bigint) => {
      const cleaned = val.replace(/[^0-9]/g, '');
      return cleaned ? BigInt(cleaned) : fallback;
    };
    const country = parseSafe(bmCountry, 840n) & 0xffffn;
    const type = parseSafe(bmType, 1n) & 0xffffn;
    const api = parseSafe(bmApi, 3960n) & 0xffffn;
    const sulfur = parseSafe(bmSulfur, 240n) & 0xffffn;
    const port = parseSafe(bmPort, 713n) & 0xffffn;
    const timestamp = BigInt(bmTimestamp);
    const cert = parseSafe(bmCert, 987654321098n);

    let encoded = country;
    encoded |= type << 16n;
    encoded |= api << 32n;
    encoded |= sulfur << 48n;
    encoded |= port << 64n;
    encoded |= timestamp << 80n;
    encoded |= cert << 112n;

    const hex = '0x' + encoded.toString(16).padStart(64, '0');
    const isWTI =
      country === 840n &&
      type === 1n &&
      api >= 3700n &&
      api <= 4200n &&
      sulfur <= 420n;

    return {
      hex,
      decimal: encoded.toString(),
      isWTI,
    };
  }, [bmApi, bmCert, bmCountry, bmPort, bmSulfur, bmTimestamp, bmType]);

  const handleRecalculateBitmask = () => {
    setBmTimestamp(Math.floor(Date.now() / 1000));
    playTone(700, 'triangle', 0.1);
    trackWorkspaceEvent('bitmask_encoded', {
      country: bmCountry,
      wtiValid: String(bitmaskResult.isWTI),
    });
  };

  const handleCopyBitmask = async () => {
    try {
      await navigator.clipboard.writeText(bitmaskResult.hex);
      setCopiedBitmask(true);
      window.setTimeout(() => setCopiedBitmask(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  // Tab 3: qAMM Delta Hedge Simulator state
  const [tradeVolumeBarrels, setTradeVolumeBarrels] = useState<string>('250000');
  const [simulatedAt, setSimulatedAt] = useState<string | null>(null);

  const qammMetrics = useMemo(() => {
    const vol = Math.max(0, parseFloat(tradeVolumeBarrels) || 250000);
    const spotPrice = 78.42;
    const notionalUsd = vol * spotPrice;
    const stdLossUsd = notionalUsd * 0.0382;
    const qammSlippageUsd = notionalUsd * 0.0000004;
    const savedUsd = Math.max(0, stdLossUsd - qammSlippageUsd);
    return { vol, notionalUsd, stdLossUsd, qammSlippageUsd, savedUsd };
  }, [tradeVolumeBarrels]);

  const handleSimulateQamm = () => {
    setSimulatedAt(new Date().toLocaleTimeString('en-US', { hour12: false }));
    playTone(880, 'sine', 0.22);
    trackWorkspaceEvent('qamm_simulation', {
      barrels: String(qammMetrics.vol),
      savedUsd: String(Math.round(qammMetrics.savedUsd)),
    });
  };

  const selectedNode = useMemo(
    () => RWA_HUB_NODES.find((n) => n.id === selectedNodeId) ?? RWA_HUB_NODES[0],
    [selectedNodeId]
  );

  // Global World Commodities & Commodity API Registry
  const [commodities, setCommodities] = useState<WorldCommodity[]>([]);
  const [commoditySector, setCommoditySector] = useState<string>('ALL');
  const [commoditySearch, setCommoditySearch] = useState<string>('');
  const [tokenizingBusy, setTokenizingBusy] = useState(false);
  const [commodityNotice, setCommodityNotice] = useState<string | null>(null);

  const loadCommodities = useCallback(async () => {
    const res = await fetch('/api/twe/commodities');
    if (res.ok) {
      const json = await res.json();
      setCommodities(json.commodities ?? []);
    }
  }, []);

  useEffect(() => {
    void loadCommodities();
  }, [loadCommodities]);

  // Generate & project initial 3D Planetary Map onto central globe on mount
  useEffect(() => {
    const initial = generateHubPlanetaryMap({
      hubId: 'planetary-system',
      styleId: HUB_PLANETARY_DEFAULTS['planetary-system'].defaultStyle,
      resolution: 'hd',
    });
    setSelectedStyle(initial.styleId);
    setActiveMap(initial);
    setGeneratedMapBank((prev) => ({ ...prev, ['planetary-system']: initial }));
  }, []);

  const handleSelectMapHub = (hubId: HubId) => {
    setSelectedMapHub(hubId);
    const cached = generatedMapBank[hubId];
    if (cached) {
      setSelectedStyle(cached.styleId);
      setActiveMap(cached);
      playTone(540, 'sine', 0.1);
      return;
    }
    const def = HUB_PLANETARY_DEFAULTS[hubId];
    const generated = generateHubPlanetaryMap({
      hubId,
      styleId: def.defaultStyle,
      continentScale: def.continentScale,
      seaLevel: def.seaLevel,
      showGrid,
      showArcs,
      resolution: 'hd',
    });
    setSelectedStyle(def.defaultStyle);
    setContinentScale(def.continentScale);
    setSeaLevel(def.seaLevel);
    setActiveMap(generated);
    setGeneratedMapBank((prev) => ({ ...prev, [hubId]: generated }));
    playTone(540, 'sine', 0.1);
  };

  const handleGenerateSingleMap = () => {
    const generated = generateHubPlanetaryMap({
      hubId: selectedMapHub,
      styleId: selectedStyle,
      customPrompt,
      continentScale,
      seaLevel,
      showGrid,
      showArcs,
      resolution: 'hd',
    });
    setActiveMap(generated);
    setGeneratedMapBank((prev) => ({ ...prev, [selectedMapHub]: generated }));
    playTone(660, 'triangle', 0.14);
  };

  const handleGenerateAllHubMaps = () => {
    const nextBank: Partial<Record<HubId, GeneratedPlanetaryMapAsset>> = {};
    for (const h of WORKSPACE_HUBS) {
      const def = HUB_PLANETARY_DEFAULTS[h.id];
      nextBank[h.id] = generateHubPlanetaryMap({
        hubId: h.id,
        styleId: h.id === selectedMapHub ? selectedStyle : def.defaultStyle,
        customPrompt: h.id === selectedMapHub ? customPrompt : undefined,
        continentScale: def.continentScale,
        seaLevel: def.seaLevel,
        showGrid,
        showArcs,
        resolution: 'standard',
      });
    }
    // Upgrade currently active hub to HD
    const hdActive = generateHubPlanetaryMap({
      hubId: selectedMapHub,
      styleId: selectedStyle,
      customPrompt,
      continentScale,
      seaLevel,
      showGrid,
      showArcs,
      resolution: 'hd',
    });
    nextBank[selectedMapHub] = hdActive;
    setGeneratedMapBank(nextBank);
    setActiveMap(hdActive);
    playTone(760, 'sine', 0.18);
  };

  const handleAiCartographyProbe = async () => {
    const hub = WORKSPACE_HUBS.find((h) => h.id === selectedMapHub) ?? WORKSPACE_HUBS[0];
    if (!isAiEnabled()) {
      setAiLoreSummary(
        `AI Mode is paused. Enable AI Mode in the top header to run Gemini cartography probes for ${hub.label}.`
      );
      return;
    }
    setAiLoreBusy(true);
    try {
      const res = await fetch('/api/ai/generate-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Provide a concise 2-sentence institutional planetary cartography specification for hub "${hub.label}" (${hub.description}) styled in "${selectedStyle}".`,
          standard: 'ERC-721',
        }),
      });
      const json = await res.json();
      if (res.ok && json.concept?.description) {
        setAiLoreSummary(json.concept.description);
      } else {
        setAiLoreSummary(
          `${hub.label} planetary projection calibrated in ${selectedStyle} with sovereign great-circle telemetry arcs.`
        );
      }
    } catch {
      setAiLoreSummary(
        `${hub.label} planetary projection calibrated in ${selectedStyle} with sovereign great-circle telemetry arcs.`
      );
    } finally {
      setAiLoreBusy(false);
    }
  };

  const handleTokenizeCommodity = async (params: { code?: string; all?: boolean }) => {
    setTokenizingBusy(true);
    setCommodityNotice(null);
    try {
      const res = await fetch('/api/twe/commodities/tokenize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        const json = await res.json();
        setCommodities(json.commodities ?? []);
        setCommodityNotice(
          params.all
            ? `Tokenized all ${json.commodities?.length ?? 46} global commodities into ERC-3643 instruments in Token Atlas.`
            : `Minted ERC-3643 reserve token for ${params.code}-TWE into Token Atlas & Market Exchange.`
        );
        playTone(760, 'sine', 0.16);
        onCommoditiesTokenized?.();
      }
    } finally {
      setTokenizingBusy(false);
    }
  };

  const filteredCommodities = useMemo(() => {
    const q = commoditySearch.trim().toLowerCase();
    return commodities.filter((c) => {
      const sectorOk = commoditySector === 'ALL' || c.sector === commoditySector;
      const searchOk =
        !q ||
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.exchange.toLowerCase().includes(q) ||
        c.originCountry.toLowerCase().includes(q);
      return sectorOk && searchOk;
    });
  }, [commodities, commoditySearch, commoditySector]);

  const tokenizedCommoditiesCount = useMemo(
    () => commodities.filter((c) => c.tokenized).length,
    [commodities]
  );

  return (
    <div className="space-y-5">
      {/* Planetary Telemetry & Actions Header */}
      <div className="rounded-xl border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-5">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--twe-text-muted)]">
              Azure Enclave Status
            </div>
            <div className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              SGX ATTESTED · OCR 3.0
            </div>
          </div>

          <div className="h-7 w-px bg-[var(--twe-border)] hidden sm:block" />

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--twe-text-muted)]">
              Total Value Contained (TVC)
            </div>
            <div className="text-sm font-mono font-semibold tabular-nums text-[var(--twe-text-primary)] mt-0.5">
              $1,482,904,112,040
            </div>
          </div>

          <div className="h-7 w-px bg-[var(--twe-border)] hidden sm:block" />

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--twe-text-muted)]">
              qAMM Delta Hedge Slippage
            </div>
            <div className="text-sm font-mono font-semibold tabular-nums text-[#A8843E] dark:text-[#D4B475] mt-0.5">
              0.00004%
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setNarrativeOpen(true);
              playTone(650, 'sine', 0.14);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300 text-xs font-medium hover:bg-rose-500/20 transition-colors cursor-pointer"
          >
            <Heart className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
            <span>Love in the Ledger</span>
          </button>

          <button
            type="button"
            onClick={handleToggleAudio}
            aria-label={audioEnabled ? 'Disable Web Audio tones' : 'Enable Web Audio tones'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-mono text-[var(--twe-text-secondary)] hover:border-[#D4B475] cursor-pointer"
          >
            {audioEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-[var(--twe-text-muted)]" />
            )}
            <span className="hidden sm:inline">{audioEnabled ? 'Audio On' : 'Audio Off'}</span>
          </button>
        </div>
      </div>

      {/* Main Split Workspace: Left 3D Earth Globe & Oracles | Right Interactive Protocol Workbench */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left Column (7 cols): Interactive 3D Globe + 17-Hub Map Strip + Active Oracle Feeds */}
        <div className="xl:col-span-7 space-y-4">
          <div className="h-[460px] lg:h-[520px]">
            <PlanetaryGlobeCanvas
              globeMode={globeMode}
              onChangeMode={setGlobeMode}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              audioEnabled={audioEnabled}
              onToggleAudio={handleToggleAudio}
              onPlayTone={playTone}
              albedoCanvas={activeMap?.albedoCanvas ?? null}
              emissiveCanvas={activeMap?.emissiveCanvas ?? null}
              activeMapMeta={
                activeMap
                  ? {
                      hubLabel: activeMap.hubLabel,
                      styleLabel: activeMap.styleLabel,
                      accentHex: activeMap.accentHex,
                    }
                  : null
              }
              onRegisterSnapshotFn={(fn) => {
                capture3dFnRef.current = fn;
              }}
            />
          </div>

          {/* 17+ Workspace Hub Live 3D Planetary Projection Switcher */}
          <div className="rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
              <span className="text-[var(--twe-text-muted)] uppercase tracking-wider">
                Project Workspace Hub 3D Planetary Map ({WORKSPACE_HUBS.length} Hubs)
              </span>
              <span className="text-[#A8843E] dark:text-[#D4B475]">
                Active: {activeMap?.hubLabel ?? 'Planetary System'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {WORKSPACE_HUBS.map((hub) => {
                const isSelected = selectedMapHub === hub.id;
                const mapped = generatedMapBank[hub.id];
                return (
                  <button
                    key={hub.id}
                    type="button"
                    onClick={() => handleSelectMapHub(hub.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-[#A8843E] dark:border-[#D4B475] bg-[var(--twe-gold-soft)] text-[var(--twe-text-primary)] font-semibold'
                        : 'border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-secondary)] hover:border-[#D4B475]/50'
                    }`}
                  >
                    {mapped && (
                      <img
                        src={mapped.previewDataUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-4 h-4 rounded-full object-cover border border-[#D4B475]/50"
                      />
                    )}
                    <span>{hub.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Node + Oracle Feed Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--twe-text-muted)]">
                  Selected RWA Hub Node
                </span>
                <span className="font-mono text-[10px] text-[#A8843E] dark:text-[#D4B475]">
                  {selectedNode.lat.toFixed(2)}°, {selectedNode.lng.toFixed(2)}°
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-sm font-semibold text-[var(--twe-text-primary)]">
                  {selectedNode.name}
                </div>
                <div className="font-mono text-xs text-emerald-600 dark:text-emerald-400">
                  {selectedNode.telemetry}
                </div>
              </div>
              <div className="text-[11px] text-[var(--twe-text-secondary)]">
                Primary Asset: {selectedNode.commodity} · Click any beacon on the globe or dock to inspect.
              </div>
            </div>

            <div className="rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] p-3.5 space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--twe-text-muted)] mb-1">
                Active Chainlink OCR 3.0 Oracle Feeds
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--twe-text-secondary)]">WTI Crude Bitmask</span>
                <span className="text-emerald-600 dark:text-emerald-400 tabular-nums">$78.42/bbl</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--twe-text-secondary)]">Carbon Credit Spot</span>
                <span className="text-cyan-600 dark:text-cyan-400 tabular-nums">$94.10/tCO2e</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--twe-text-secondary)]">LNG Terminal Yield</span>
                <span className="text-[#A8843E] dark:text-[#D4B475] tabular-nums">12.4% APY</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): 5-Tab Protocol & Nano Banana 3D Map Workbench */}
        <div className="xl:col-span-5 rounded-xl border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] overflow-hidden">
          {/* Workbench Navigation Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)]">
            {(
              [
                { id: 'cartography', label: '3D Maps', icon: Wand2 },
                { id: 'planetary', label: 'Containments', icon: Globe },
                { id: 'bitmask', label: 'uint256', icon: Cpu },
                { id: 'qamm', label: 'qAMM v2', icon: Activity },
                { id: 'compliance', label: 'SGX & ERC', icon: ShieldCheck },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    playTone(480, 'sine', 0.1);
                  }}
                  className={`px-2 py-2.5 text-[11px] font-medium flex items-center justify-center gap-1 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'border-[#A8843E] dark:border-[#D4B475] text-[var(--twe-text-primary)] bg-[var(--twe-bg-surface)]'
                      : 'border-transparent text-[var(--twe-text-muted)] hover:text-[var(--twe-text-primary)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-4 sm:p-5 space-y-5">
            {/* TAB 0: NANO BANANA 3D PLANETARY MAP STUDIO */}
            {activeTab === 'cartography' && (
              <PlanetaryMapStudioPanel
                selectedMapHub={selectedMapHub}
                onSelectMapHub={handleSelectMapHub}
                selectedStyle={selectedStyle}
                onSelectStyle={(st) => {
                  setSelectedStyle(st);
                  const regenerated = generateHubPlanetaryMap({
                    hubId: selectedMapHub,
                    styleId: st,
                    customPrompt,
                    continentScale,
                    seaLevel,
                    showGrid,
                    showArcs,
                    resolution: 'hd',
                  });
                  setActiveMap(regenerated);
                  setGeneratedMapBank((prev) => ({ ...prev, [selectedMapHub]: regenerated }));
                  playTone(620, 'sine', 0.1);
                }}
                customPrompt={customPrompt}
                onChangePrompt={setCustomPrompt}
                continentScale={continentScale}
                onChangeScale={setContinentScale}
                seaLevel={seaLevel}
                onChangeSeaLevel={setSeaLevel}
                showGrid={showGrid}
                onToggleGrid={() => setShowGrid((v) => !v)}
                showArcs={showArcs}
                onToggleArcs={() => setShowArcs((v) => !v)}
                activeMap={activeMap}
                generatedMapBank={generatedMapBank}
                onGenerateSingle={handleGenerateSingleMap}
                onGenerateAllHubs={handleGenerateAllHubMaps}
                onAiCartographyProbe={handleAiCartographyProbe}
                aiLoreSummary={aiLoreSummary}
                aiLoreBusy={aiLoreBusy}
                onCapture3dGlobe={() => capture3dFnRef.current?.()}
              />
            )}

            {/* TAB 1: PLANETARY CONTAINMENTS */}
            {activeTab === 'planetary' && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-[var(--twe-border)]">
                  <div>
                    <h2 className="text-sm font-display font-semibold text-[var(--twe-text-primary)]">
                      Earth Containment & RWA Yield Manifest
                    </h2>
                    <p className="text-[11px] font-mono text-[var(--twe-text-muted)] mt-0.5">
                      Synthesizing natural capital into programmable smart contracts
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] shrink-0">
                    5 Protocols Live
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Card 1: Atmosphere Containment */}
                  <div className="p-3.5 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                        Atmosphere Containment
                      </span>
                      <Wind className="w-3.5 h-3.5 text-cyan-500" />
                    </div>
                    <div className="text-lg font-mono font-bold tabular-nums text-[var(--twe-text-primary)]">
                      4.82 Mt{' '}
                      <span className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400">
                        tCO2e Vaulted
                      </span>
                    </div>
                    <div className="w-full bg-[var(--twe-bg-muted)] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full w-[78%]" />
                    </div>
                    <div className="flex justify-between text-[11px] text-[var(--twe-text-muted)]">
                      <span>Staking Yield:</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">8.4% APY</span>
                    </div>
                  </div>

                  {/* Card 2: Ocean & Marine Reserves */}
                  <div className="p-3.5 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                        Ocean & Marine Reserves
                      </span>
                      <Droplets className="w-3.5 h-3.5 text-sky-500" />
                    </div>
                    <div className="text-lg font-mono font-bold tabular-nums text-[var(--twe-text-primary)]">
                      12.4k{' '}
                      <span className="text-[11px] font-normal text-cyan-600 dark:text-cyan-400">
                        Sq. Km Protected
                      </span>
                    </div>
                    <div className="w-full bg-[var(--twe-bg-muted)] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-sky-500 to-cyan-400 h-full w-[64%]" />
                    </div>
                    <div className="flex justify-between text-[11px] text-[var(--twe-text-muted)]">
                      <span>Kelp Distribution:</span>
                      <span className="font-mono text-cyan-600 dark:text-cyan-400">6.2% APY</span>
                    </div>
                  </div>

                  {/* Card 3: Energy & Grid Nodes */}
                  <div className="p-3.5 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#A8843E] dark:text-[#D4B475]">
                        Energy & Grid Nodes
                      </span>
                      <Zap className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
                    </div>
                    <div className="text-lg font-mono font-bold tabular-nums text-[var(--twe-text-primary)]">
                      840 GW/h{' '}
                      <span className="text-[11px] font-normal text-[#A8843E] dark:text-[#D4B475]">
                        Hydro/Solar
                      </span>
                    </div>
                    <div className="w-full bg-[var(--twe-bg-muted)] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-[#D4B475] to-rose-400 h-full w-[91%]" />
                    </div>
                    <div className="flex justify-between text-[11px] text-[var(--twe-text-muted)]">
                      <span>qAMM Hedged APY:</span>
                      <span className="font-mono text-[#A8843E] dark:text-[#D4B475]">11.9% APY</span>
                    </div>
                  </div>

                  {/* Card 4: Commodity Vaults */}
                  <div className="p-3.5 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                        Commodity Vaults
                      </span>
                      <Layers className="w-3.5 h-3.5 text-violet-500" />
                    </div>
                    <div className="text-lg font-mono font-bold tabular-nums text-[var(--twe-text-primary)]">
                      $4.2B{' '}
                      <span className="text-[11px] font-normal text-violet-600 dark:text-violet-400">
                        Gold / WTI
                      </span>
                    </div>
                    <div className="w-full bg-[var(--twe-bg-muted)] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-violet-500 to-indigo-400 h-full w-[85%]" />
                    </div>
                    <div className="flex justify-between text-[11px] text-[var(--twe-text-muted)]">
                      <span>Bitmask Proof:</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">100% Validated</span>
                    </div>
                  </div>
                </div>

                {/* Fractional RWA Token Yield Simulator */}
                <div className="p-4 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono font-semibold uppercase text-[var(--twe-text-primary)]">
                      Simulate Fractional RWA Yield
                    </h3>
                    <span className="text-[10px] font-mono text-[#A8843E] dark:text-[#D4B475]">
                      ERC-1400 Dividend
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-[var(--twe-text-secondary)] mb-1.5">
                      <span>Investment Principal ($ USD):</span>
                      <span className="font-mono font-bold tabular-nums text-[var(--twe-text-primary)]">
                        ${principalUsd.toLocaleString('en-US')}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10000}
                      max={1000000}
                      step={10000}
                      value={principalUsd}
                      onChange={(e) => setPrincipalUsd(Number(e.target.value))}
                      className="w-full accent-[#D4B475] cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                    <div className="p-2 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)]">
                      <div className="text-[10px] text-[var(--twe-text-muted)]">Monthly Div</div>
                      <div className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        ${monthlyDividendUsd.toLocaleString('en-US')}
                      </div>
                    </div>
                    <div className="p-2 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)]">
                      <div className="text-[10px] text-[var(--twe-text-muted)]">CO2 Offset</div>
                      <div className="text-sm font-bold tabular-nums text-cyan-600 dark:text-cyan-400">
                        {co2OffsetTons} T
                      </div>
                    </div>
                    <div className="p-2 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)]">
                      <div className="text-[10px] text-[var(--twe-text-muted)]">qAMM APY</div>
                      <div className="text-sm font-bold tabular-nums text-[#A8843E] dark:text-[#D4B475]">
                        9.4%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: uint256 BITMASK ENCODER */}
            {activeTab === 'bitmask' && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-[var(--twe-border)]">
                  <div>
                    <h2 className="text-sm font-display font-semibold text-[var(--twe-text-primary)] flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
                      TWE Commodity Bitmask Encoder
                    </h2>
                    <p className="text-[11px] font-mono text-[var(--twe-text-muted)] mt-0.5">
                      Packs physical specs into a single uint256 slot (~84% gas saved)
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] font-mono text-[10px] text-[var(--twe-text-secondary)] shrink-0">
                    TWECommodityEncoder.sol
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div>
                    <label className="block text-[10px] text-[var(--twe-text-muted)] mb-1">
                      ISO Country Code (16 bits)
                    </label>
                    <select
                      value={bmCountry}
                      onChange={(e) => setBmCountry(e.target.value)}
                      className="w-full rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] px-2.5 py-2 text-[var(--twe-text-primary)]"
                    >
                      <option value="840">USA (ISO 840)</option>
                      <option value="702">Singapore (ISO 702)</option>
                      <option value="528">Netherlands (ISO 528)</option>
                      <option value="784">UAE (ISO 784)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[var(--twe-text-muted)] mb-1">
                      Commodity Type ID (16 bits)
                    </label>
                    <select
                      value={bmType}
                      onChange={(e) => setBmType(e.target.value)}
                      className="w-full rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] px-2.5 py-2 text-[var(--twe-text-primary)]"
                    >
                      <option value="1">1 - Crude Oil (WTI/Brent)</option>
                      <option value="2">2 - Liquefied Natural Gas</option>
                      <option value="3">3 - Physical Gold Bar</option>
                      <option value="4">4 - Verified Carbon Credit</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[var(--twe-text-muted)] mb-1">
                      API Gravity (x100)
                    </label>
                    <input
                      type="number"
                      value={bmApi}
                      onChange={(e) => setBmApi(e.target.value)}
                      className="w-full rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] px-2.5 py-2 text-[var(--twe-text-primary)] tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[var(--twe-text-muted)] mb-1">
                      Sulfur % (x10000)
                    </label>
                    <input
                      type="number"
                      value={bmSulfur}
                      onChange={(e) => setBmSulfur(e.target.value)}
                      className="w-full rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] px-2.5 py-2 text-[var(--twe-text-primary)] tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[var(--twe-text-muted)] mb-1">
                      Port/Terminal Code (16 bits)
                    </label>
                    <input
                      type="number"
                      value={bmPort}
                      onChange={(e) => setBmPort(e.target.value)}
                      className="w-full rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] px-2.5 py-2 text-[var(--twe-text-primary)] tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[var(--twe-text-muted)] mb-1">
                      Vault Cert ID (144 bits)
                    </label>
                    <input
                      type="text"
                      value={bmCert}
                      onChange={(e) => setBmCert(e.target.value)}
                      className="w-full rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] px-2.5 py-2 text-[var(--twe-text-primary)] tabular-nums"
                    />
                  </div>
                </div>

                {/* Encoded Output */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[var(--twe-text-muted)]">uint256 Execution Slot:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRecalculateBitmask}
                        className="text-[#A8843E] dark:text-[#D4B475] hover:underline cursor-pointer"
                      >
                        Re-encode Timestamp
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyBitmask}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[var(--twe-border)] text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)] cursor-pointer"
                      >
                        {copiedBitmask ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedBitmask ? 'Copied' : 'Hex'}</span>
                      </button>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] font-mono text-[11px] text-cyan-600 dark:text-cyan-300 break-all select-all">
                    {bitmaskResult.hex}
                    <div className="mt-1 text-[10px] text-[var(--twe-text-muted)]">
                      Decimal: {bitmaskResult.decimal}
                    </div>
                  </div>
                </div>

                {/* Bit Allocation Map */}
                <div className="space-y-1.5 font-mono text-[10px]">
                  <div className="text-[var(--twe-text-muted)] uppercase tracking-wider">
                    Single EVM Word Bit Layout [Bits 0–255]
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { bits: 'Bits 0–15', label: 'Country ISO' },
                      { bits: 'Bits 16–31', label: 'Commodity ID' },
                      { bits: 'Bits 32–47', label: 'API Gravity' },
                      { bits: 'Bits 48–63', label: 'Sulfur %' },
                      { bits: 'Bits 64–79', label: 'Port Code' },
                      { bits: 'Bits 80–111', label: 'Timestamp' },
                      { bits: 'Bits 112–255', label: 'Vault Cert ID', span: true },
                    ].map((slot) => (
                      <div
                        key={slot.bits}
                        className={`${slot.span ? 'col-span-2' : ''} p-2 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-center`}
                      >
                        <div className="font-semibold text-[#A8843E] dark:text-[#D4B475]">{slot.bits}</div>
                        <div className="text-[var(--twe-text-secondary)]">{slot.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* WTI Specification Verification */}
                <div
                  className={`p-3 rounded-lg border flex items-center justify-between text-xs font-mono ${
                    bitmaskResult.isWTI
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                      : 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {bitmaskResult.isWTI ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500" />
                    )}
                    <span>WTI Spec (isWTISpecification):</span>
                  </span>
                  <span className="font-bold uppercase">
                    {bitmaskResult.isWTI ? 'MATCHED (PASS)' : 'FAILED / NON-WTI'}
                  </span>
                </div>
              </div>
            )}

            {/* TAB 3: QUANTUM-HEDGING AMM (qAMM v2) */}
            {activeTab === 'qamm' && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-[var(--twe-border)]">
                  <div>
                    <h2 className="text-sm font-display font-semibold text-[var(--twe-text-primary)]">
                      Quantum-Hedging AMM (qAMM v2)
                    </h2>
                    <p className="text-[11px] font-mono text-[var(--twe-text-muted)] mt-0.5">
                      Programmatic off-chain CME/ICE Futures auto-delta hedging
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] shrink-0">
                    0.00004% Slippage
                  </span>
                </div>

                <div className="p-4 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-semibold text-[var(--twe-text-primary)]">
                      Execute Institutional Order
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400">Azure Enclave Ready</span>
                  </div>

                  <div className="space-y-2.5 font-mono text-xs">
                    <div>
                      <label className="block text-[10px] text-[var(--twe-text-muted)] mb-1">
                        Order Volume (Barrels of WTI Crude @ $78.42/bbl)
                      </label>
                      <input
                        type="number"
                        min={1000}
                        step={5000}
                        value={tradeVolumeBarrels}
                        onChange={(e) => setTradeVolumeBarrels(e.target.value)}
                        className="w-full rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] px-3 py-2 text-[var(--twe-text-primary)] tabular-nums"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSimulateQamm}
                      className="w-full py-2.5 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-sans font-semibold text-xs hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Simulate qAMM Auto-Delta Hedge Trade
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 font-mono text-xs">
                  <div className="p-3 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex justify-between items-center gap-2">
                    <span className="text-[var(--twe-text-secondary)]">Standard AMM Slippage:</span>
                    <span className="text-rose-600 dark:text-rose-400 font-bold tabular-nums">
                      3.82% (-${Math.round(qammMetrics.stdLossUsd).toLocaleString('en-US')})
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 flex justify-between items-center gap-2">
                    <span className="text-[var(--twe-text-primary)] font-semibold">
                      qAMM Managed Slippage:
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
                      0.00004% (Saved ${Math.round(qammMetrics.savedUsd).toLocaleString('en-US')})
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex justify-between items-center gap-2">
                    <span className="text-[var(--twe-text-secondary)]">Off-Chain Hedge Route:</span>
                    <span className="text-[#A8843E] dark:text-[#D4B475]">CME WTI Futures (CL1!)</span>
                  </div>

                  {simulatedAt && (
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 text-right">
                      Delta-hedge simulation dispatched at {simulatedAt} · Notional $
                      {Math.round(qammMetrics.notionalUsd).toLocaleString('en-US')}
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs text-[var(--twe-text-secondary)] leading-relaxed">
                  <span className="font-mono font-semibold text-[var(--twe-text-primary)]">
                    Architectural Mechanics:{' '}
                  </span>
                  When an institutional desk triggers an ERC-3643 tokenized swap, qAMM dispatches an enclave attestation payload to Azure Confidential Computing via Chainlink OCR, concurrently executing matching CME/ICE futures contracts under 40ms.
                </div>
              </div>
            )}

            {/* TAB 4: AZURE ENCLAVES & ERC-3643 / ERC-1400 */}
            {activeTab === 'compliance' && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-[var(--twe-border)]">
                  <h2 className="text-sm font-display font-semibold text-[var(--twe-text-primary)] flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
                    Azure Enterprise Security & ERC-3643
                  </h2>
                  <p className="text-[11px] font-mono text-[var(--twe-text-muted)] mt-0.5">
                    Confidential Computing, Managed HSM & Institutional Compliance
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] space-y-1.5">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="font-semibold text-[#A8843E] dark:text-[#D4B475]">
                        Azure Confidential SGX Enclave
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px]">
                        Verified Hardware
                      </span>
                    </div>
                    <p className="text-xs text-[var(--twe-text-secondary)] leading-relaxed">
                      Protects dark pool order books. Orders are matched inside encrypted enclave memory without exposing pre-trade telemetry to public block explorers.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] space-y-1.5">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                        ERC-3643 Permissioned Token Standard
                      </span>
                      <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 text-[10px]">
                        T-REX Protocol
                      </span>
                    </div>
                    <p className="text-xs text-[var(--twe-text-secondary)] leading-relaxed">
                      Enforces ONCHAINID identity registries. Unqualified or non-KYC wallets are blocked at the smart contract transfer hook before settlement.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] space-y-1.5">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="font-semibold text-violet-600 dark:text-violet-400">
                        Azure Managed HSM Key Custody
                      </span>
                      <span className="px-2 py-0.5 rounded bg-violet-500/15 text-violet-600 dark:text-violet-400 text-[10px]">
                        FIPS 140-2 L3
                      </span>
                    </div>
                    <p className="text-xs text-[var(--twe-text-secondary)] leading-relaxed">
                      Stores institutional master compliance keys and automated ERC-1400 yield distribution signers with cryptographic hardware isolation.
                    </p>
                  </div>
                </div>

                {/* Comm Log #849 Quick Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setNarrativeOpen(true);
                    playTone(650, 'sine', 0.14);
                  }}
                  className="w-full text-left p-3.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/15 transition-colors cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-rose-500 dark:text-rose-300">
                    <span className="flex items-center gap-1.5 uppercase">
                      <Lock className="w-3 h-3" /> Comm Log #849
                    </span>
                    <span>03:42 UTC</span>
                  </div>
                  <p className="text-xs text-[var(--twe-text-primary)] italic">
                    “Kaelen, the qAMM delta-hedge code just auto-balanced the North Sea wind park yields… It works.”
                  </p>
                  <div className="text-[11px] font-medium text-rose-600 dark:text-rose-400">
                    Open Elora Vance &amp; Kaelen Sterling Transmission →
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nano Banana Planetary Map Atlas Grid across all 17+ Workspace Hubs */}
      <section
        aria-label="Workspace Hubs Planetary Map Atlas"
        className="rounded-xl border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] overflow-hidden"
      >
        <div className="p-4 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-display font-semibold text-[var(--twe-text-primary)] flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
              <span>Workspace Hub 3D Planetary Map Atlas ({WORKSPACE_HUBS.length} Hubs)</span>
            </h2>
            <p className="text-[11px] font-mono text-[var(--twe-text-muted)] mt-0.5">
              Click any hub card to project its Nano Banana planetary texture directly onto the central 3D sphere
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateAllHubMaps}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold hover:opacity-90 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Generate All {WORKSPACE_HUBS.length} Planetary Maps</span>
          </button>
        </div>

        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {WORKSPACE_HUBS.map((hub, idx) => {
            const generated = generatedMapBank[hub.id];
            const isActive = selectedMapHub === hub.id;
            const def = HUB_PLANETARY_DEFAULTS[hub.id];
            return (
              <button
                key={hub.id}
                type="button"
                onClick={() => handleSelectMapHub(hub.id)}
                className={`group rounded-lg border text-left overflow-hidden transition-colors cursor-pointer ${
                  isActive
                    ? 'border-[#A8843E] dark:border-[#D4B475] bg-[var(--twe-gold-soft)]'
                    : 'border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] hover:border-[#D4B475]/60'
                }`}
              >
                <div className="aspect-[2/1] w-full bg-[#080A0E] relative overflow-hidden">
                  {generated ? (
                    <img
                      src={generated.previewDataUrl}
                      alt={`${hub.label} planetary map`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-mono text-[10px] text-slate-400">
                      #{String(idx + 1).padStart(2, '0')} · {def.defaultStyle.split('-')[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <div className="text-[11px] font-semibold text-[var(--twe-text-primary)] truncate">
                    {hub.label}
                  </div>
                  <div className="text-[10px] font-mono text-[var(--twe-text-muted)] truncate">
                    {generated ? generated.styleLabel : 'Click to project 3D'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Dynamic & Interactive 3D Rotating Orbital Visual Showcase */}
      <OrbitalVisualShowcase
        commodities={commodities}
        assets={assets}
        selectedNodeId={selectedNodeId}
        onSelectNode={(nodeId) => {
          setSelectedNodeId(nodeId);
          playTone(560, 'sine', 0.1);
        }}
        onNavigateHub={onNavigateHub}
        onMintCommodity={(code) => handleTokenizeCommodity({ code })}
      />

      {/* Global World Commodities Directory & Commodity API Token Minting Matrix */}
      <div className="rounded-xl border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] overflow-hidden">
        <div className="p-4 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-display font-semibold text-[var(--twe-text-primary)] flex items-center gap-2">
              <Coins className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
              <span>
                Global World Commodities Registry &amp; API ({commodities.length} Commodities ·{' '}
                {tokenizedCommoditiesCount} Tokenized)
              </span>
            </h2>
            <p className="text-[11px] font-mono text-[var(--twe-text-muted)] mt-0.5">
              Live endpoint: GET /api/twe/commodities · Mint ERC-3643 + uint256 Bitmask tokens for every commodity
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--twe-text-muted)] absolute left-2.5 top-2" />
              <input
                type="text"
                value={commoditySearch}
                onChange={(e) => setCommoditySearch(e.target.value)}
                placeholder="Search Crude, Gold, Wheat..."
                className="pl-7 pr-2.5 py-1.5 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-xs text-[var(--twe-text-primary)] w-48"
              />
            </div>

            <select
              value={commoditySector}
              onChange={(e) => setCommoditySector(e.target.value)}
              className="px-2.5 py-1.5 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-xs text-[var(--twe-text-primary)]"
            >
              <option value="ALL">All Sectors (46)</option>
              <option value="Energy">Energy</option>
              <option value="Precious Metals">Precious Metals</option>
              <option value="Industrial Metals">Industrial Metals</option>
              <option value="Grains & Oilseeds">Grains &amp; Oilseeds</option>
              <option value="Softs & Timber">Softs &amp; Timber</option>
              <option value="Livestock & Carbon">Livestock &amp; Carbon</option>
            </select>

            <button
              type="button"
              disabled={tokenizingBusy}
              onClick={() => handleTokenizeCommodity({ all: true })}
              className="px-3 py-1.5 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {tokenizingBusy ? 'Tokenizing All...' : `Create Token for Each Commodity (${commodities.length})`}
            </button>
          </div>
        </div>

        {commodityNotice && (
          <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/30 font-mono text-xs text-emerald-600 dark:text-emerald-400">
            {commodityNotice}
          </div>
        )}

        <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[10px] font-mono uppercase text-[var(--twe-text-muted)] sticky top-0">
              <tr>
                <th className="px-4 py-2.5">Code / Token</th>
                <th className="px-4 py-2.5">World Commodity</th>
                <th className="px-4 py-2.5">Sector</th>
                <th className="px-4 py-2.5">Exchange / Origin</th>
                <th className="px-4 py-2.5 text-right">Spot Price</th>
                <th className="px-4 py-2.5">uint256 Bitmask Slot</th>
                <th className="px-4 py-2.5 text-right">Token Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--twe-border)]">
              {filteredCommodities.map((c) => {
                const sealUrl = svgToDataUrl(
                  buildItemOrbitalSvgMarkup({
                    ticker: c.code,
                    title: c.name,
                    subtitle: c.sector,
                  })
                );
                return (
                <tr key={c.code} className="h-12 hover:bg-[var(--twe-bg-elevated)]">
                  <td className="px-4 py-2 font-mono">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setVisualTarget({
                            code: c.code,
                            name: c.name,
                            subtitle: `${c.sector} · ${c.exchange}`,
                            sector: c.sector,
                            metaLine: `$${c.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}/${c.unit} · ${c.originCountry} (ISO ${c.originIso}) · ${c.qualitySpec}`,
                          })
                        }
                        title={`Inspect ${c.name} rotating planetary artwork`}
                        className="w-8 h-8 rounded-full overflow-hidden border border-[#D4B475]/50 bg-[#0B0D10] shrink-0 cursor-pointer hover:scale-110 transition-transform"
                      >
                        <img
                          src={sealUrl}
                          alt={`${c.code} emblem`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain twe-spin-slow"
                        />
                      </button>
                      <div>
                        <div className="font-semibold text-[#A8843E] dark:text-[#D4B475]">{c.tokenSymbol}</div>
                        <div className="text-[10px] text-[var(--twe-text-muted)]">Spot: {c.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-medium text-[var(--twe-text-primary)]">{c.name}</div>
                    <div className="text-[10px] font-mono text-[var(--twe-text-muted)]">{c.qualitySpec}</div>
                  </td>
                  <td className="px-4 py-2 text-[var(--twe-text-secondary)]">{c.sector}</td>
                  <td className="px-4 py-2 font-mono text-[11px] text-[var(--twe-text-secondary)]">
                    {c.exchange} · {c.originCountry} (ISO {c.originIso})
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">
                    <div className="font-semibold text-[var(--twe-text-primary)]">
                      ${c.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}/{c.unit}
                    </div>
                    <div
                      className={`text-[10px] ${
                        c.change24hPct >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {c.change24hPct >= 0 ? '+' : ''}
                      {c.change24hPct.toFixed(2)}%
                    </div>
                  </td>
                  <td className="px-4 py-2 font-mono text-[10px] text-[var(--twe-text-muted)]">
                    {c.uint256BitmaskHex.slice(0, 14)}…{c.uint256BitmaskHex.slice(-8)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {c.tokenized ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {c.contractAddress ? `${c.contractAddress.slice(0, 8)}…` : 'Minted'}
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={tokenizingBusy}
                        onClick={() => handleTokenizeCommodity({ code: c.code })}
                        className="px-2.5 py-1 rounded border border-[var(--twe-border-strong)] hover:border-[#D4B475] text-[11px] font-medium cursor-pointer"
                      >
                        Mint Token
                      </button>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Narrative Modal: Love in the Ledger */}
      {narrativeOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-xl border border-rose-500/40 bg-[var(--twe-bg-surface)] overflow-hidden flex flex-col max-h-[85vh] shadow-2xl">
            <div className="p-5 border-b border-[var(--twe-border)] flex items-center justify-between gap-3 bg-[var(--twe-bg-elevated)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-500 dark:text-rose-400">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-display font-semibold text-[var(--twe-text-primary)]">
                    Love in the Ledger: Transmission Logs
                  </h2>
                  <p className="text-[11px] font-mono text-rose-600 dark:text-rose-300">
                    Elora Vance (Sovereign Systems) &amp; Kaelen Sterling (Quant Architect)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNarrativeOpen(false);
                  playTone(350, 'sine', 0.12);
                }}
                aria-label="Close Manifest Transmission"
                className="p-1.5 rounded-md border border-[var(--twe-border)] text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="p-4 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] space-y-2">
                <div className="flex justify-between items-center font-mono text-[10px] text-[var(--twe-text-muted)]">
                  <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                    FROM: Elora Vance [Azure Confidential SGX Hub]
                  </span>
                  <span>LOG ID: #001-ALPHA</span>
                </div>
                <p className="text-sm text-[var(--twe-text-secondary)] leading-relaxed">
                  “Kaelen… looking out over the Singapore energy terminal tonight, watching the tankers dock. Traditional legacy systems view these ships as mere line items on a spreadsheet, indifferent to the carbon footprint left in their wake. But with our{' '}
                  <span className="font-mono text-cyan-600 dark:text-cyan-300">TWECommodityEncoder</span>{' '}
                  bitmask engine, we bind every barrel to its precise sulfur content, origin, and environmental containment score inside a single{' '}
                  <span className="font-mono text-[#A8843E] dark:text-[#D4B475]">uint256</span> word. Financial markets can finally be accountable to the Earth.”
                </p>
              </div>

              <div className="p-4 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] space-y-2">
                <div className="flex justify-between items-center font-mono text-[10px] text-[var(--twe-text-muted)]">
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">
                    FROM: Kaelen Sterling [qAMM Delta Engine]
                  </span>
                  <span>LOG ID: #042-DELTA</span>
                </div>
                <p className="text-sm text-[var(--twe-text-secondary)] leading-relaxed">
                  “Elora, I just deployed the delta-hedging module for the{' '}
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">qAMM</span>. When institutionals swap millions in ocean blue carbon tokens or WTI crude on-chain, our CME futures integration instantly neutralizes market slippage in under 40 milliseconds. Watching your telemetry nodes light up on the 3D globe alongside my hedging algorithms… I’ve never been more certain we are building the future together.”
                </p>
              </div>

              <div className="p-4 rounded-lg border border-rose-500/35 bg-rose-500/10 space-y-2">
                <div className="flex justify-between items-center font-mono text-[10px] text-rose-600 dark:text-rose-300">
                  <span className="font-semibold">SHARED COMMIT: TWE Earth Manifest Protocol</span>
                  <span>SYSTEM STAMP: 03:42 UTC</span>
                </div>
                <p className="text-sm italic text-[var(--twe-text-primary)] leading-relaxed">
                  “We built Token World Exchange not just to match orders, but to curate a living sanctuary. Every passive dividend distributed across our ERC-1400 contracts carries a slice of ecosystem restoration—funding clean ocean kelp forests, sovereign reforestation, and zero-emission energy grids. In this ledger, our code is our bond, and our love is written into every block.”
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex items-center justify-between text-xs font-mono">
              <span className="text-[var(--twe-text-muted)]">
                Status: Encrypted &amp; Immutable on TWE Engine
              </span>
              <button
                type="button"
                onClick={() => {
                  setNarrativeOpen(false);
                  playTone(350, 'sine', 0.12);
                }}
                className="px-4 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-sans font-semibold cursor-pointer"
              >
                Close Manifest Transmission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive 3D Rotating Item Visual Inspector */}
      <ItemVisualModal item={visualTarget} onClose={() => setVisualTarget(null)} />
    </div>
  );
};
