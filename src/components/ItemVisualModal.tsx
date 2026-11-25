import React, { useState } from 'react';
import { Download, Pause, Play, Sparkles, X } from 'lucide-react';
import { buildItemOrbitalSvgMarkup, selectBackdropForItem } from '../lib/visualRegistry';

export interface ItemVisualTarget {
  code: string;
  name: string;
  subtitle: string;
  kind?: string;
  sector?: string;
  metaLine: string;
}

interface ItemVisualModalProps {
  item: ItemVisualTarget | null;
  onClose: () => void;
}

export const ItemVisualModal: React.FC<ItemVisualModalProps> = ({ item, onClose }) => {
  const [spinning, setSpinning] = useState(true);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [customSvg, setCustomSvg] = useState<string | null>(null);
  const [synthBusy, setSynthBusy] = useState(false);
  const [synthError, setSynthError] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  if (!item) return null;

  const backdropUrl = selectBackdropForItem({
    kind: item.kind,
    sector: item.sector,
    code: item.code,
  });

  const activeSvg =
    customSvg ||
    buildItemOrbitalSvgMarkup({
      ticker: item.code,
      title: item.name,
      subtitle: item.subtitle,
    });

  const handleSynthesize = async () => {
    setSynthBusy(true);
    setSynthError(null);
    try {
      const res = await fetch('/api/ai/generate-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Planetary Exchange Orbital Seal for ${item.name} (${item.code}) · ${item.subtitle}. Obsidian & Champagne Gold geometric precision.`,
          standard: 'ERC-721',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Synthesis failed');
      if (json.concept?.svgMarkup) setCustomSvg(json.concept.svgMarkup);
    } catch (err: unknown) {
      setSynthError(err instanceof Error ? err.message : 'Unable to generate custom SVG');
    } finally {
      setSynthBusy(false);
    }
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([activeSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.code.toLowerCase()}-planetary-emblem.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-xl border border-[#D4B475]/45 bg-[var(--twe-bg-surface)] overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] text-[#A8843E] dark:text-[#D4B475]">
              {item.code} · INTERACTIVE PLANETARY EMBLEM
            </div>
            <h3 className="font-display font-semibold text-base text-[var(--twe-text-primary)]">
              {item.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close item visual inspector"
            className="p-1.5 rounded-md border border-[var(--twe-border)] text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive 3D Pointer-Tilt & Spinning Visual Viewport */}
        <div
          className="relative h-72 bg-[#080A0E] overflow-hidden flex items-center justify-center"
          style={{ perspective: '900px' }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const nx = (e.clientX - rect.left) / rect.width - 0.5;
            const ny = (e.clientY - rect.top) / rect.height - 0.5;
            setTilt({ rx: -ny * 24, ry: nx * 24 });
          }}
          onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
        >
          {!imgFailed ? (
            <img
              src={backdropUrl}
              alt={item.name}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="absolute inset-0 w-full h-full object-cover opacity-65"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#181C23] to-[#080A0E]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/60" />

          <div
            style={{
              transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
              transition: 'transform 160ms ease-out',
            }}
            className="relative z-10 w-44 h-44 flex items-center justify-center"
          >
            <div
              className={`absolute inset-0 rounded-full border border-dashed border-[#D4B475]/60 ${
                spinning ? 'twe-spin-reverse' : ''
              }`}
            />
            <div
              className={`w-36 h-36 rounded-full overflow-hidden border border-[#D4B475]/80 bg-[#080A0E]/85 ${
                spinning ? 'twe-spin-slow' : ''
              }`}
              dangerouslySetInnerHTML={{ __html: activeSvg }}
            />
          </div>

          <div className="absolute bottom-3 left-4 right-4 z-10 flex items-center justify-between text-[11px] font-mono text-slate-300">
            <span>{item.subtitle}</span>
            <span>Move pointer to tilt 3D axis</span>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="p-2.5 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] font-mono text-[11px] text-[var(--twe-text-secondary)]">
            {item.metaLine}
          </div>

          {synthError && (
            <div className="p-2.5 rounded border border-rose-500/40 bg-rose-500/10 text-xs text-rose-600 dark:text-rose-400">
              {synthError}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSpinning((s) => !s)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--twe-border)] text-xs font-medium text-[var(--twe-text-primary)] hover:border-[#D4B475] cursor-pointer"
              >
                {spinning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{spinning ? 'Pause Rotation' : 'Rotate Seal'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSvg}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--twe-border)] text-xs font-medium text-[var(--twe-text-primary)] hover:border-[#D4B475] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export SVG</span>
              </button>
            </div>

            <button
              type="button"
              disabled={synthBusy}
              onClick={handleSynthesize}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{synthBusy ? 'Synthesizing...' : 'Generate AI Emblem'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
