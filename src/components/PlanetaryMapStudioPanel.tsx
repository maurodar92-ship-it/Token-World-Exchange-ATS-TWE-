import React from 'react';
import { Camera, Download, Layers, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { WORKSPACE_HUBS } from '../data/hubs';
import type { HubId } from '../types/twe';
import {
  type GeneratedPlanetaryMapAsset,
  NANO_BANANA_STYLES,
  type NanoBananaStyleId,
} from '../lib/planetaryMapGenerator';

interface PlanetaryMapStudioPanelProps {
  selectedMapHub: HubId;
  onSelectMapHub: (hubId: HubId) => void;
  selectedStyle: NanoBananaStyleId;
  onSelectStyle: (style: NanoBananaStyleId) => void;
  customPrompt: string;
  onChangePrompt: (val: string) => void;
  continentScale: number;
  onChangeScale: (val: number) => void;
  seaLevel: number;
  onChangeSeaLevel: (val: number) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showArcs: boolean;
  onToggleArcs: () => void;
  activeMap: GeneratedPlanetaryMapAsset | null;
  generatedMapBank: Partial<Record<HubId, GeneratedPlanetaryMapAsset>>;
  onGenerateSingle: () => void;
  onGenerateAllHubs: () => void;
  onAiCartographyProbe: () => void;
  aiLoreSummary: string | null;
  aiLoreBusy: boolean;
  onCapture3dGlobe?: () => void;
}

export const PlanetaryMapStudioPanel: React.FC<PlanetaryMapStudioPanelProps> = ({
  selectedMapHub,
  onSelectMapHub,
  selectedStyle,
  onSelectStyle,
  customPrompt,
  onChangePrompt,
  continentScale,
  onChangeScale,
  seaLevel,
  onChangeSeaLevel,
  showGrid,
  onToggleGrid,
  showArcs,
  onToggleArcs,
  activeMap,
  generatedMapBank,
  onGenerateSingle,
  onGenerateAllHubs,
  onAiCartographyProbe,
  aiLoreSummary,
  aiLoreBusy,
  onCapture3dGlobe,
}) => {
  const generatedCount = Object.keys(generatedMapBank).length;

  const handleDownload2dMap = () => {
    if (!activeMap) return;
    const a = document.createElement('a');
    a.href = activeMap.previewDataUrl;
    a.download = `twe-planetary-map-${activeMap.hubId}-${activeMap.styleId}.png`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="pb-2.5 border-b border-[var(--twe-border)] flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-display font-semibold text-[var(--twe-text-primary)] flex items-center gap-1.5">
            <Wand2 className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
            <span>Nano Banana 3D Planetary Map Generator</span>
          </h2>
          <p className="text-[11px] font-mono text-[var(--twe-text-muted)] mt-0.5">
            Renders dynamic equirectangular UV maps directly on the 3D globe canvas
          </p>
        </div>
        <span className="font-mono text-[10px] text-[#A8843E] dark:text-[#D4B475] tabular-nums">
          {generatedCount}/{WORKSPACE_HUBS.length} Mapped
        </span>
      </div>

      {/* Target Hub Selector + Style Swatches */}
      <div className="space-y-3">
        <label className="block text-xs">
          <span className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">
            Workspace Hub Target (17+ Hubs)
          </span>
          <select
            value={selectedMapHub}
            onChange={(e) => onSelectMapHub(e.target.value as HubId)}
            className="mt-1 w-full rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] px-2.5 py-1.5 text-xs text-[var(--twe-text-primary)] cursor-pointer"
          >
            {WORKSPACE_HUBS.map((h, i) => (
              <option key={h.id} value={h.id}>
                {String(i + 1).padStart(2, '0')}. {h.label} ({h.group})
              </option>
            ))}
          </select>
        </label>

        <div>
          <div className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)] mb-1.5">
            Nano Banana Aesthetic Style
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {(Object.values(NANO_BANANA_STYLES) as Array<(typeof NANO_BANANA_STYLES)[NanoBananaStyleId]>).map(
              (st) => {
                const active = selectedStyle === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => onSelectStyle(st.id)}
                    className={`p-2 rounded-md border text-left transition-colors cursor-pointer ${
                      active
                        ? 'border-[#A8843E] dark:border-[#D4B475] bg-[var(--twe-gold-soft)]'
                        : 'border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] hover:border-[var(--twe-border-strong)]'
                    }`}
                  >
                    <div
                      className="h-2.5 w-full rounded-sm mb-1.5 border border-white/10"
                      style={{ background: st.swatchGradient }}
                    />
                    <div className="text-[11px] font-medium text-[var(--twe-text-primary)] truncate">
                      {st.shortLabel}
                    </div>
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Custom Style Prompt / Seed */}
        <label className="block text-xs">
          <span className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">
            Cartography Seed / Biome Prompt
          </span>
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => onChangePrompt(e.target.value)}
            placeholder="e.g., Sovereign gold archipelagos with trans-oceanic liquidity arcs"
            className="mt-1 w-full rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] px-2.5 py-1.5 text-xs text-[var(--twe-text-primary)]"
          />
        </label>

        {/* Tectonic & Overlay Sliders */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <label className="block">
            <div className="flex justify-between text-[10px] font-mono text-[var(--twe-text-muted)] mb-1">
              <span>Continent Scale</span>
              <span className="tabular-nums">{continentScale.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min={1.0}
              max={3.5}
              step={0.05}
              value={continentScale}
              onChange={(e) => onChangeScale(Number(e.target.value))}
              className="w-full accent-[#D4B475] cursor-pointer"
            />
          </label>

          <label className="block">
            <div className="flex justify-between text-[10px] font-mono text-[var(--twe-text-muted)] mb-1">
              <span>Ocean Sea Level</span>
              <span className="tabular-nums">{Math.round(seaLevel * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.28}
              max={0.62}
              step={0.01}
              value={seaLevel}
              onChange={(e) => onChangeSeaLevel(Number(e.target.value))}
              className="w-full accent-[#D4B475] cursor-pointer"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="inline-flex items-center gap-1.5 cursor-pointer text-[var(--twe-text-secondary)]">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={onToggleGrid}
              className="accent-[#D4B475]"
            />
            <span>Meridian Grid</span>
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer text-[var(--twe-text-secondary)]">
            <input
              type="checkbox"
              checked={showArcs}
              onChange={onToggleArcs}
              className="accent-[#D4B475]"
            />
            <span>Liquidity Arcs &amp; Beacons</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onGenerateSingle}
            className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold hover:opacity-90 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Render 3D Hub Map</span>
          </button>

          <button
            type="button"
            onClick={onGenerateAllHubs}
            className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] text-xs font-semibold text-[var(--twe-text-primary)] hover:border-[#D4B475] cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
            <span>Generate All {WORKSPACE_HUBS.length} Maps</span>
          </button>
        </div>
      </div>

      {/* 2D Equirectangular UV Map Preview */}
      {activeMap && (
        <div className="rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] overflow-hidden">
          <div className="px-3 py-2 border-b border-[var(--twe-border)] flex items-center justify-between gap-2 text-[11px] font-mono">
            <span className="text-[var(--twe-text-primary)] truncate">
              UV Texture: {activeMap.hubLabel} ({activeMap.styleLabel})
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleDownload2dMap}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[10px] hover:border-[#D4B475] cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>2D Map</span>
              </button>
              {onCapture3dGlobe && (
                <button
                  type="button"
                  onClick={onCapture3dGlobe}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[10px] hover:border-[#D4B475] cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                  <span>3D Snap</span>
                </button>
              )}
            </div>
          </div>
          <div className="aspect-[2/1] w-full bg-[#080A0E]">
            <img
              src={activeMap.previewDataUrl}
              alt={`${activeMap.hubLabel} equirectangular planetary map`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Optional Gemini 4 Hydrogen Cartographic Telemetry */}
      <div className="space-y-2">
        <button
          type="button"
          disabled={aiLoreBusy}
          onClick={onAiCartographyProbe}
          className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-medium text-[var(--twe-text-secondary)] hover:border-[#D4B475] hover:text-[var(--twe-text-primary)] disabled:opacity-50 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
          <span>{aiLoreBusy ? 'Analyzing Hub Cartography...' : 'Synthesize Hub Map Brief (Gemini 4 Hydrogen)'}</span>
        </button>

        {aiLoreSummary && (
          <div className="p-2.5 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs text-[var(--twe-text-secondary)] leading-relaxed">
            {aiLoreSummary}
          </div>
        )}
      </div>
    </div>
  );
};
