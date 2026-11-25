import React, { useState } from 'react';
import { Globe, RotateCw } from 'lucide-react';
import type { HubId } from '../types/twe';
import {
  buildItemOrbitalSvgMarkup,
  HUB_VISUAL_PROFILES,
  svgToDataUrl,
} from '../lib/visualRegistry';
import { ItemVisualModal, type ItemVisualTarget } from './ItemVisualModal';

interface SectionVisualBannerProps {
  activeHub: HubId;
  onOpenPlanetarySystem: () => void;
}

export const SectionVisualBanner: React.FC<SectionVisualBannerProps> = ({
  activeHub,
  onOpenPlanetarySystem,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [modalTarget, setModalTarget] = useState<ItemVisualTarget | null>(null);

  if (activeHub === 'planetary-system') {
    return null;
  }

  const profile = HUB_VISUAL_PROFILES[activeHub];
  const emblemUrl = svgToDataUrl(
    buildItemOrbitalSvgMarkup({
      ticker: profile.hubId.replace(/-/g, '').toUpperCase().slice(0, 8),
      title: profile.title,
      accentHex: profile.accentHex,
      subtitle: profile.telemetryTag,
    })
  );

  return (
    <>
      <div
        className="relative rounded-xl overflow-hidden border border-[var(--twe-border)] bg-[#0A0C10] h-28 sm:h-32 flex items-center justify-between px-4 sm:px-6 gap-4"
        style={{ perspective: '1000px' }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const nx = (e.clientX - rect.left) / rect.width - 0.5;
          const ny = (e.clientY - rect.top) / rect.height - 0.5;
          setTilt({ rx: -ny * 6, ry: nx * 8 });
        }}
        onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
      >
        {!imgFailed ? (
          <img
            src={profile.imageUrl}
            alt={profile.title}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover opacity-55"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-[#141820] via-[#0B0D10] to-[#1A1610]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/80" />

        {/* Left: Rotating Planetary Medallion + Section Plate Copy */}
        <div className="relative z-10 flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={() =>
              setModalTarget({
                code: profile.telemetryTag,
                name: profile.title,
                subtitle: profile.subtitle,
                metaLine: `Workspace Hub: ${profile.hubId} · Orbit Meridian ${profile.orbitAngleDeg}°`,
              })
            }
            style={{
              transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
              transition: 'transform 160ms ease-out',
            }}
            title="Click to inspect rotating section artwork"
            className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full shrink-0 cursor-pointer group"
          >
            <div className="absolute inset-0 rounded-full border border-dashed border-[#D4B475]/55 twe-spin-reverse" />
            <div className="w-full h-full rounded-full overflow-hidden border border-[#D4B475]/80 bg-[#080A0E]/90 p-0.5">
              <img
                src={emblemUrl}
                alt={`${profile.title} orbital seal`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain twe-spin-slow group-hover:scale-105 transition-transform"
              />
            </div>
          </button>

          <div className="min-w-0">
            <div className="font-mono text-[10px] tracking-wider uppercase" style={{ color: profile.accentHex }}>
              {profile.telemetryTag} · MERIDIAN {profile.orbitAngleDeg}°
            </div>
            <div className="font-display font-semibold text-sm sm:text-base text-white truncate">
              {profile.title}
            </div>
            <div className="text-xs text-slate-300 truncate">{profile.subtitle}</div>
          </div>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="relative z-10 hidden sm:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              setModalTarget({
                code: profile.telemetryTag,
                name: profile.title,
                subtitle: profile.subtitle,
                metaLine: `Workspace Hub: ${profile.hubId} · Orbit Meridian ${profile.orbitAngleDeg}°`,
              })
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/20 bg-black/50 text-xs font-medium text-slate-100 hover:border-[#D4B475] cursor-pointer whitespace-nowrap"
          >
            <RotateCw className="w-3.5 h-3.5 text-[#D4B475]" />
            <span>Inspect 3D Seal</span>
          </button>

          <button
            type="button"
            onClick={onOpenPlanetarySystem}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#D4B475] text-[#0B0D10] text-xs font-semibold hover:opacity-90 cursor-pointer whitespace-nowrap"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Planetary Orbit</span>
          </button>
        </div>
      </div>

      <ItemVisualModal item={modalTarget} onClose={() => setModalTarget(null)} />
    </>
  );
};
