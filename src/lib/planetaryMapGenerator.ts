import { WORKSPACE_HUBS } from '../data/hubs';
import type { HubId } from '../types/twe';

export type NanoBananaStyleId =
  | 'obsidian-gilded'
  | 'platinum-topo'
  | 'cyan-holo'
  | 'solar-foundry'
  | 'emerald-biosphere'
  | 'architectural-blueprint';

export interface NanoBananaStyleSpec {
  id: NanoBananaStyleId;
  label: string;
  shortLabel: string;
  description: string;
  oceanDeep: [number, number, number];
  oceanShallow: [number, number, number];
  landLow: [number, number, number];
  landHigh: [number, number, number];
  ridgeAccent: string;
  gridColor: string;
  beaconColor: string;
  arcColor: string;
  collarHex: number;
  swatchGradient: string;
}

export const NANO_BANANA_STYLES: Record<NanoBananaStyleId, NanoBananaStyleSpec> = {
  'obsidian-gilded': {
    id: 'obsidian-gilded',
    label: 'Nano Banana · Obsidian & 24k Gold',
    shortLabel: 'Obsidian & Gold',
    description: 'Deep volcanic basalt oceans, brushed champagne-gold tectonic plateaus, and gilded trade arcs.',
    oceanDeep: [7, 9, 13],
    oceanShallow: [18, 22, 31],
    landLow: [44, 38, 28],
    landHigh: [212, 180, 117],
    ridgeAccent: '#F6E6C2',
    gridColor: 'rgba(212, 180, 117, 0.22)',
    beaconColor: '#F6E6C2',
    arcColor: 'rgba(212, 180, 117, 0.85)',
    collarHex: 0xd4b475,
    swatchGradient: 'linear-gradient(135deg, #0B0D10 20%, #D4B475 85%)',
  },
  'platinum-topo': {
    id: 'platinum-topo',
    label: 'Nano Banana · Platinum Topographic',
    shortLabel: 'Platinum Topo',
    description: 'Cool slate seas with brushed platinum relief bands and silver institutional corridors.',
    oceanDeep: [13, 18, 27],
    oceanShallow: [27, 36, 52],
    landLow: [71, 85, 105],
    landHigh: [226, 232, 240],
    ridgeAccent: '#F8FAFC',
    gridColor: 'rgba(203, 213, 225, 0.22)',
    beaconColor: '#F1F5F9',
    arcColor: 'rgba(226, 232, 240, 0.8)',
    collarHex: 0xcbd5e1,
    swatchGradient: 'linear-gradient(135deg, #1E293B 20%, #E2E8F0 85%)',
  },
  'cyan-holo': {
    id: 'cyan-holo',
    label: 'Nano Banana · Holographic Containment',
    shortLabel: 'Holographic Cyan',
    description: 'Nocturnal abyssal oceans, luminous cyan continental edges, and orbital SGX relay arcs.',
    oceanDeep: [4, 10, 22],
    oceanShallow: [8, 34, 58],
    landLow: [12, 74, 110],
    landHigh: [56, 189, 248],
    ridgeAccent: '#A5F3FC',
    gridColor: 'rgba(56, 189, 248, 0.28)',
    beaconColor: '#67E8F9',
    arcColor: 'rgba(34, 211, 238, 0.9)',
    collarHex: 0x06b6d4,
    swatchGradient: 'linear-gradient(135deg, #061224 20%, #38BDF8 85%)',
  },
  'solar-foundry': {
    id: 'solar-foundry',
    label: 'Nano Banana · Solar Molten Foundry',
    shortLabel: 'Solar Foundry',
    description: 'Charred obsidian terrain laced with radiant amber-gold magmatic mineral veins.',
    oceanDeep: [12, 8, 8],
    oceanShallow: [36, 20, 12],
    landLow: [92, 45, 16],
    landHigh: [245, 158, 11],
    ridgeAccent: '#FDE68A',
    gridColor: 'rgba(245, 158, 11, 0.24)',
    beaconColor: '#FCD34D',
    arcColor: 'rgba(251, 191, 36, 0.88)',
    collarHex: 0xf59e0b,
    swatchGradient: 'linear-gradient(135deg, #1A0E0A 20%, #F59E0B 85%)',
  },
  'emerald-biosphere': {
    id: 'emerald-biosphere',
    label: 'Nano Banana · Sovereign Biosphere',
    shortLabel: 'Carbon Biosphere',
    description: 'Deep marine troughs paired with emerald kelp shelves and verified carbon biomes.',
    oceanDeep: [5, 15, 16],
    oceanShallow: [11, 41, 38],
    landLow: [16, 85, 62],
    landHigh: [52, 211, 153],
    ridgeAccent: '#A7F3D0',
    gridColor: 'rgba(16, 185, 129, 0.24)',
    beaconColor: '#6EE7B7',
    arcColor: 'rgba(52, 211, 153, 0.85)',
    collarHex: 0x10b981,
    swatchGradient: 'linear-gradient(135deg, #071915 20%, #10B981 85%)',
  },
  'architectural-blueprint': {
    id: 'architectural-blueprint',
    label: 'Nano Banana · Architectural Blueprint',
    shortLabel: 'Blueprint Matrix',
    description: 'Drafting graphite canvas with precision geodesic vector coastlines and gold nodes.',
    oceanDeep: [10, 13, 20],
    oceanShallow: [19, 25, 39],
    landLow: [38, 48, 70],
    landHigh: [148, 163, 184],
    ridgeAccent: '#D4B475',
    gridColor: 'rgba(148, 163, 184, 0.34)',
    beaconColor: '#D4B475',
    arcColor: 'rgba(212, 180, 117, 0.9)',
    collarHex: 0x94a3b8,
    swatchGradient: 'linear-gradient(135deg, #0F172A 20%, #94A3B8 85%)',
  },
};

export interface HubPlanetaryDefault {
  hubId: HubId;
  defaultStyle: NanoBananaStyleId;
  planetDesignation: string;
  continentScale: number;
  seaLevel: number;
  seedSalt: string;
  anchorCoords: Array<{ lat: number; lng: number; label: string }>;
}

const DEFAULT_STYLE_CYCLE: NanoBananaStyleId[] = [
  'obsidian-gilded',
  'cyan-holo',
  'platinum-topo',
  'solar-foundry',
  'obsidian-gilded',
  'architectural-blueprint',
  'emerald-biosphere',
  'platinum-topo',
  'cyan-holo',
  'architectural-blueprint',
  'emerald-biosphere',
  'obsidian-gilded',
  'architectural-blueprint',
  'solar-foundry',
  'platinum-topo',
  'cyan-holo',
  'solar-foundry',
  'emerald-biosphere',
];

const ANCHOR_SETS: Array<Array<{ lat: number; lng: number; label: string }>> = [
  [
    { lat: 40.7, lng: -74.0, label: 'NYC ATS' },
    { lat: 51.5, lng: -0.1, label: 'LDN Vault' },
    { lat: 1.35, lng: 103.8, label: 'SGP Node' },
    { lat: 25.2, lng: 55.27, label: 'DXB Bullion' },
  ],
  [
    { lat: 37.7, lng: -122.4, label: 'SFO Core' },
    { lat: 47.37, lng: 8.54, label: 'ZRH Registry' },
    { lat: 35.67, lng: 139.65, label: 'TYO Ledger' },
    { lat: -33.86, lng: 151.2, label: 'SYD Mesh' },
  ],
  [
    { lat: 29.76, lng: -95.36, label: 'HOU WTI' },
    { lat: 51.92, lng: 4.47, label: 'RTM Port' },
    { lat: 22.3, lng: 114.17, label: 'HKG Clearing' },
    { lat: -23.55, lng: -46.63, label: 'SAO Commodity' },
  ],
];

export const HUB_PLANETARY_DEFAULTS: Record<HubId, HubPlanetaryDefault> = WORKSPACE_HUBS.reduce(
  (acc, hub, idx) => {
    acc[hub.id] = {
      hubId: hub.id,
      defaultStyle: DEFAULT_STYLE_CYCLE[idx % DEFAULT_STYLE_CYCLE.length],
      planetDesignation: `TWE-${String(idx + 1).padStart(2, '0')} · ${hub.label}`,
      continentScale: 1.65 + (idx % 5) * 0.28,
      seaLevel: 0.44 + ((idx % 4) - 1.5) * 0.03,
      seedSalt: `${hub.id}-sphere-${idx + 17}`,
      anchorCoords: ANCHOR_SETS[idx % ANCHOR_SETS.length],
    };
    return acc;
  },
  {} as Record<HubId, HubPlanetaryDefault>
);

export interface PlanetaryMapOptions {
  hubId: HubId;
  styleId: NanoBananaStyleId;
  customPrompt?: string;
  continentScale?: number;
  seaLevel?: number;
  showGrid?: boolean;
  showArcs?: boolean;
  resolution?: 'standard' | 'hd';
}

export interface GeneratedPlanetaryMapAsset {
  hubId: HubId;
  hubLabel: string;
  styleId: NanoBananaStyleId;
  styleLabel: string;
  accentHex: number;
  promptUsed: string;
  albedoCanvas: HTMLCanvasElement;
  emissiveCanvas: HTMLCanvasElement;
  previewDataUrl: string;
  generatedAt: string;
}

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Fast 3D spatial hash for seamless unit-sphere projection
function hash3(ix: number, iy: number, iz: number, seed: number): number {
  let n = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(iz, 2147483647) + Math.imul(seed, 1274126177);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function valueNoise3D(x: number, y: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const fz = smooth(z - iz);

  const c000 = hash3(ix, iy, iz, seed);
  const c100 = hash3(ix + 1, iy, iz, seed);
  const c010 = hash3(ix, iy + 1, iz, seed);
  const c110 = hash3(ix + 1, iy + 1, iz, seed);
  const c001 = hash3(ix, iy, iz + 1, seed);
  const c101 = hash3(ix + 1, iy, iz + 1, seed);
  const c011 = hash3(ix, iy + 1, iz + 1, seed);
  const c111 = hash3(ix + 1, iy + 1, iz + 1, seed);

  const x00 = lerp(c000, c100, fx);
  const x10 = lerp(c010, c110, fx);
  const x01 = lerp(c001, c101, fx);
  const x11 = lerp(c011, c111, fx);

  return lerp(lerp(x00, x10, fy), lerp(x01, x11, fy), fz);
}

function fbm3D(x: number, y: number, z: number, seed: number, octaves = 4): number {
  let value = 0;
  let amp = 0.54;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    value += amp * valueNoise3D(x * freq, y * freq, z * freq, seed + o * 97);
    norm += amp;
    amp *= 0.5;
    freq *= 2.05;
  }
  return value / norm;
}

function latLngToUv(lat: number, lng: number, w: number, h: number): [number, number] {
  const u = ((lng + 180) / 360) * w;
  const v = ((90 - lat) / 180) * h;
  return [u, v];
}

export function generateHubPlanetaryMap(options: PlanetaryMapOptions): GeneratedPlanetaryMapAsset {
  const hub = WORKSPACE_HUBS.find((h) => h.id === options.hubId) ?? WORKSPACE_HUBS[0];
  const defaults = HUB_PLANETARY_DEFAULTS[hub.id];
  const style = NANO_BANANA_STYLES[options.styleId];

  const width = options.resolution === 'hd' ? 1024 : 512;
  const height = options.resolution === 'hd' ? 512 : 256;

  const promptSeed = (options.customPrompt || '').trim();
  const numericSeed = hashSeed(`${defaults.seedSalt}:${style.id}:${promptSeed}`);
  const scale = options.continentScale ?? defaults.continentScale;
  const seaLevel = options.seaLevel ?? defaults.seaLevel;

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = width;
  albedoCanvas.height = height;
  const ctx = albedoCanvas.getContext('2d')!;

  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = width;
  emissiveCanvas.height = height;
  const eCtx = emissiveCanvas.getContext('2d')!;

  const imgData = ctx.createImageData(width, height);
  const emData = eCtx.createImageData(width, height);
  const px = imgData.data;
  const ex = emData.data;

  // Seamless 3D spherical equirectangular noise surface
  for (let y = 0; y < height; y++) {
    const phi = (y / height) * Math.PI; // 0 (north pole) -> PI (south pole)
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    for (let x = 0; x < width; x++) {
      const theta = (x / width) * Math.PI * 2;
      const sx = sinPhi * Math.cos(theta) * scale;
      const sy = cosPhi * scale;
      const sz = sinPhi * Math.sin(theta) * scale;

      const n = fbm3D(sx + 4.1, sy - 2.3, sz + 1.7, numericSeed, 4);
      const ridge = 1 - Math.abs(fbm3D(sx * 2.1, sy * 2.1, sz * 2.1, numericSeed + 411, 2) * 2 - 1);
      const elevation = n * 0.84 + ridge * 0.16;

      const idx = (y * width + x) * 4;
      let r = 0;
      let g = 0;
      let b = 0;
      let er = 0;
      let eg = 0;
      let eb = 0;

      if (elevation < seaLevel) {
        const t = Math.max(0, Math.min(1, elevation / seaLevel));
        r = Math.round(lerp(style.oceanDeep[0], style.oceanShallow[0], t));
        g = Math.round(lerp(style.oceanDeep[1], style.oceanShallow[1], t));
        b = Math.round(lerp(style.oceanDeep[2], style.oceanShallow[2], t));

        // Coastal shelf glow
        if (seaLevel - elevation < 0.022) {
          er = Math.round(style.landHigh[0] * 0.25);
          eg = Math.round(style.landHigh[1] * 0.25);
          eb = Math.round(style.landHigh[2] * 0.25);
        }
      } else {
        const t = Math.max(0, Math.min(1, (elevation - seaLevel) / (1 - seaLevel)));
        // Topographic contour stepped highlight
        const contourBand = (elevation * 26) % 1 < 0.11 ? 0.18 : 0;
        const blend = Math.min(1, Math.pow(t, 0.82) + contourBand);
        r = Math.round(lerp(style.landLow[0], style.landHigh[0], blend));
        g = Math.round(lerp(style.landLow[1], style.landHigh[1], blend));
        b = Math.round(lerp(style.landLow[2], style.landHigh[2], blend));

        // Subtle urban / energy vein glow on ridges and coastlines
        if (elevation - seaLevel < 0.018 || contourBand > 0) {
          er = Math.round(style.landHigh[0] * 0.35);
          eg = Math.round(style.landHigh[1] * 0.35);
          eb = Math.round(style.landHigh[2] * 0.35);
        }
      }

      px[idx] = r;
      px[idx + 1] = g;
      px[idx + 2] = b;
      px[idx + 3] = 255;

      ex[idx] = er;
      ex[idx + 1] = eg;
      ex[idx + 2] = eb;
      ex[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  eCtx.putImageData(emData, 0, 0);

  // Layer 2: Graticule Meridians & Parallels
  if (options.showGrid !== false) {
    ctx.strokeStyle = style.gridColor;
    ctx.lineWidth = Math.max(1, width / 900);
    for (let i = 1; i < 12; i++) {
      const gx = (i / 12) * width;
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height);
      ctx.stroke();
    }
    for (let j = 1; j < 6; j++) {
      const gy = (j / 6) * height;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
    }

    // Equatorial calibration track
    eCtx.strokeStyle = style.gridColor;
    eCtx.lineWidth = Math.max(1, width / 750);
    eCtx.beginPath();
    eCtx.moveTo(0, height / 2);
    eCtx.lineTo(width, height / 2);
    eCtx.stroke();
  }

  // Layer 3: Great-Circle Hub Trade Arcs & Anchor Beacons
  if (options.showArcs !== false) {
    const anchors = defaults.anchorCoords;
    for (let i = 0; i < anchors.length; i++) {
      const a = anchors[i];
      const b = anchors[(i + 1) % anchors.length];
      const [ax, ay] = latLngToUv(a.lat, a.lng, width, height);
      const [bx, by] = latLngToUv(b.lat, b.lng, width, height);

      // Avoid drawing huge wrap lines across seam; pick shorter longitudinal arc
      if (Math.abs(ax - bx) < width * 0.55) {
        const cx = (ax + bx) / 2;
        const cy = Math.min(ay, by) - Math.max(18, height * 0.08);
        for (const targetCtx of [ctx, eCtx]) {
          targetCtx.strokeStyle = style.arcColor;
          targetCtx.lineWidth = Math.max(1.2, width / 512);
          targetCtx.beginPath();
          targetCtx.moveTo(ax, ay);
          targetCtx.quadraticCurveTo(cx, cy, bx, by);
          targetCtx.stroke();
        }
      }

      // Beacon rings + core light
      for (const targetCtx of [ctx, eCtx]) {
        targetCtx.fillStyle = style.beaconColor;
        targetCtx.beginPath();
        targetCtx.arc(ax, ay, Math.max(2.6, width / 260), 0, Math.PI * 2);
        targetCtx.fill();

        targetCtx.strokeStyle = style.ridgeAccent;
        targetCtx.lineWidth = Math.max(1, width / 650);
        targetCtx.beginPath();
        targetCtx.arc(ax, ay, Math.max(6, width / 110), 0, Math.PI * 2);
        targetCtx.stroke();
      }
    }
  }

  // Layer 4: Subtle Hub Calibration Watermark Band at Equator Edge (Cartographic stamp)
  ctx.fillStyle = style.ridgeAccent;
  ctx.font = `600 ${Math.max(10, Math.round(width / 72))}px monospace`;
  ctx.globalAlpha = 0.72;
  ctx.fillText(`TWE // ${hub.label.toUpperCase()} · ${style.shortLabel.toUpperCase()}`, 14, height - 12);
  ctx.globalAlpha = 1;

  return {
    hubId: hub.id,
    hubLabel: hub.label,
    styleId: style.id,
    styleLabel: style.shortLabel,
    accentHex: style.collarHex,
    promptUsed: promptSeed || `${hub.label} — ${style.description}`,
    albedoCanvas,
    emissiveCanvas,
    previewDataUrl: albedoCanvas.toDataURL('image/png'),
    generatedAt: new Date().toLocaleTimeString('en-US', { hour12: false }),
  };
}
