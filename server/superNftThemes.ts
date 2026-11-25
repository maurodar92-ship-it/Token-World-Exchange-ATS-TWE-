import crypto from 'crypto';

export type FlagshipCollectionSlug = 'cosmic-nexus' | 'matrix-heroes' | 'mythic-titans';
export type FlagshipCollectionName =
  | 'Infinite Horizon Cosmic Nexus'
  | 'Matrix Heroes'
  | 'Mythic Titans';

export type LayerEnhancementTier = 'Mythic Foil' | 'Chromatic Rim' | 'Satin Etch' | 'Architectural Base';

export interface LayerOptionDef {
  name: string;
  weight: number;
  svg: string;
  colorHint?: string;
}

export interface LayerDef {
  trait_type: string;
  required?: boolean;
  options: LayerOptionDef[];
}

export interface ThemeDef {
  slug: FlagshipCollectionSlug;
  name: FlagshipCollectionName;
  description: string;
  blurb: string;
  baselineStaticCount: number;
  exclusions: string[][];
  layers: LayerDef[];
}

export interface LayerFrequencyEnhancement {
  tier: LayerEnhancementTier;
  frequencyPct: number;
  infoScore: number; // -ln(p)
  badgeColor: string;
  svgEnhancement: string;
  pbrEnhancement: string;
  iridescence: number;
  emissiveBoost: number;
  anisotropyBoost: number;
}

export interface ResolvedLayerTrait {
  trait_type: string;
  value: string;
  weight: number;
  layerTotalWeight: number;
  weightPct: number;
  infoScore: number;
  svg: string;
  enhancement: LayerFrequencyEnhancement;
}

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function mulberry32(seed: number): () => number {
  let n = seed >>> 0;
  return () => {
    n += 0x6d2b79f5;
    let t = n;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function escapeXml(s: string): string {
  return String(s).replace(/[<>&"']/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '"':
        return '&quot;';
      case "'":
        return '&apos;';
      default:
        return c;
    }
  });
}

function generateStarsSvg(index: number, count = 26): string {
  const r = mulberry32(1000 + index);
  let s = '';
  for (let k = 0; k < count; k += 1) {
    s += `<circle cx='${Math.floor(r() * 600)}' cy='${Math.floor(r() * 560)}' r='${(r() * 1.6 + 0.4).toFixed(1)}' fill='#fff' opacity='${(r() * 0.6 + 0.2).toFixed(2)}'/>`;
  }
  return s;
}

const COSMIC_WEIGHTS = [30, 25, 18, 12, 8, 4, 2, 1];

const COSMIC_BG: Array<[string, string, string]> = [
  ['Event Horizon', '#05060f', '#1b1040'],
  ['Aurora Veil', '#04201f', '#15506a'],
  ['Quasar Dusk', '#1a0b2e', '#6b2d5c'],
  ['Nebula Bloom', '#2b0f3a', '#0b2e5c'],
  ['Void Silk', '#020208', '#0d0d1f'],
  ['Solar Tide', '#3a1204', '#c0562a'],
  ['Starfall Teal', '#021b24', '#0a6b6b'],
  ['Crimson Drift', '#220510', '#7a1230'],
];

const COSMIC_HORIZON: Array<[string, string]> = [
  ['Gold Line', '#e8c26a'],
  ['Cyan Rim', '#20d9ff'],
  ['Emerald Arc', '#36d7a1'],
  ['Violet Edge', '#b58cff'],
  ['Rose Curve', '#ff7be5'],
  ['Ember Line', '#ff8a3d'],
  ['Ice Span', '#bfe9ff'],
  ['White Dwarf', '#ffffff'],
];

const COSMIC_CORE: Array<[string, string, string]> = [
  ['Amber Seed', '#ffd27a', '#b8651b'],
  ['Cyan Spark', '#9ff3ff', '#0a7f9e'],
  ['Jade Pulse', '#9fffd9', '#0e8a63'],
  ['Violet Ember', '#e3c9ff', '#6b2fb5'],
  ['Rose Quartz', '#ffc9ee', '#b03a8f'],
  ['Solar Flare', '#fff1a8', '#e8552b'],
  ['Silver Star', '#ffffff', '#7a8aa0'],
  ['Void Pearl', '#2a2a4a', '#000000'],
];

const COSMIC_RING: Array<[string, string, number]> = [
  ['Fine Dash', '2 8', 2],
  ['Long Dash', '24 12', 3],
  ['Dotted', '1 9', 5],
  ['Solid Thin', '0', 1.5],
  ['Solid Bold', '0', 6],
  ['Broken', '90 40', 4],
  ['Double', '0', 2],
  ['Pulse', '4 4 20 4', 3],
];

const COSMIC_CREST: Array<[string, string]> = [
  ['Omega Seal', 'Ω'],
  ['Xi Seal', 'Ξ'],
  ['Sigma Seal', 'Σ'],
  ['Phi Seal', 'Φ'],
  ['Psi Seal', 'Ψ'],
  ['Delta Seal', 'Δ'],
  ['Pi Seal', 'Π'],
  ['Theta Seal', 'Θ'],
];

const COSMIC_HALO: Array<[string, string | null]> = [
  ['No Halo', null],
  ['Thin Halo', 'a'],
  ['Gold Halo', 'b'],
  ['Twin Halo', 'c'],
  ['Dashed Halo', 'd'],
  ['Wide Halo', 'e'],
];

const COSMIC_SPARKS: Array<[string, number]> = [
  ['No Sparks', 0],
  ['Faint Sparks', 8],
  ['Sparks', 16],
  ['Bright Sparks', 28],
  ['Storm', 48],
  ['Supernova', 80],
];

const COSMIC_ORBITS: Array<[string, number]> = [
  ['No Orbits', 0],
  ['Single Orbit', 1],
  ['Twin Orbits', 2],
  ['Triple Orbits', 3],
  ['Cross Orbits', 4],
  ['Gyroscope', 5],
];

const HALO_SVG_MAP: Record<string, string> = {
  a: "<ellipse cx='300' cy='96' rx='90' ry='22' fill='none' stroke='#fff' stroke-width='3' opacity='.8'/>",
  b: "<ellipse cx='300' cy='96' rx='96' ry='24' fill='none' stroke='#e8c26a' stroke-width='7'/>",
  c: "<ellipse cx='300' cy='96' rx='90' ry='22' fill='none' stroke='#e8c26a' stroke-width='4'/><ellipse cx='300' cy='84' rx='70' ry='16' fill='none' stroke='#e8c26a' stroke-width='3'/>",
  d: "<ellipse cx='300' cy='96' rx='100' ry='26' fill='none' stroke='#20d9ff' stroke-width='4' stroke-dasharray='10 8'/>",
  e: "<ellipse cx='300' cy='90' rx='150' ry='34' fill='none' stroke='#ff7be5' stroke-width='3' opacity='.85'/>",
};

export const COSMIC_NEXUS_THEME: ThemeDef = {
  slug: 'cosmic-nexus',
  name: 'Infinite Horizon Cosmic Nexus',
  description: 'a boundless horizon where liquidity, light and connection never end.',
  blurb: 'An 8-layer generative collection with 5.89 million raw combinations and frequency-driven PBR/SVG enhancements.',
  baselineStaticCount: 3000,
  exclusions: [
    ['Background:Event Horizon', 'Power Core:Void Pearl'],
    ['Background:Void Silk', 'Power Core:Void Pearl'],
    ['Horizon:Ember Line', 'Background:Crimson Drift'],
  ],
  layers: [
    {
      trait_type: 'Background',
      required: true,
      options: COSMIC_BG.map(([name, a, b], i) => ({
        name,
        weight: COSMIC_WEIGHTS[i],
        colorHint: b,
        svg: `<defs><linearGradient id='bg-c${i}' x1='0' y1='0' x2='.6' y2='1'><stop stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><rect width='600' height='600' fill='url(#bg-c${i})'/>${generateStarsSvg(i)}`,
      })),
    },
    {
      trait_type: 'Horizon',
      required: true,
      options: COSMIC_HORIZON.map(([name, c], i) => ({
        name,
        weight: COSMIC_WEIGHTS[i],
        colorHint: c,
        svg: `<path d='M0 400 Q300 ${320 + i * 7} 600 400 V600 H0Z' fill='${c}' opacity='.14'/><path d='M0 400 Q300 ${320 + i * 7} 600 400' stroke='${c}' stroke-width='${2 + (i % 3)}' fill='none'/><path d='M0 420 Q300 ${350 + i * 7} 600 420' stroke='${c}' stroke-width='1' fill='none' opacity='.5'/>`,
      })),
    },
    {
      trait_type: 'Orbits',
      required: false,
      options: COSMIC_ORBITS.map(([name, k], i) => ({
        name,
        weight: [30, 25, 18, 14, 8, 5][i],
        colorHint: '#cbd5e1',
        svg: Array.from(
          { length: k },
          (_, j) =>
            `<ellipse cx='300' cy='290' rx='${230 - j * 18}' ry='${70 + j * 14}' transform='rotate(${j * (180 / Math.max(k, 1)) + 15} 300 290)' fill='none' stroke='#fff' stroke-opacity='.28' stroke-width='1.5'/>`
        ).join(''),
      })),
    },
    {
      trait_type: 'Glyph Ring',
      required: true,
      options: COSMIC_RING.map(([name, d, w], i) => ({
        name,
        weight: COSMIC_WEIGHTS[i],
        colorHint: '#e2e8f0',
        svg: `<circle cx='300' cy='290' r='150' fill='none' stroke='#fff' stroke-opacity='.55' stroke-width='${w}' stroke-dasharray='${d}'/>${
          name === 'Double'
            ? "<circle cx='300' cy='290' r='164' fill='none' stroke='#fff' stroke-opacity='.4' stroke-width='1.5'/>"
            : ''
        }`,
      })),
    },
    {
      trait_type: 'Power Core',
      required: true,
      options: COSMIC_CORE.map(([name, a, b], i) => ({
        name,
        weight: COSMIC_WEIGHTS[i],
        colorHint: a,
        svg: `<defs><radialGradient id='core-c${i}'><stop stop-color='${a}'/><stop offset='1' stop-color='${b}'/></radialGradient></defs><circle cx='300' cy='290' r='${74 - (i % 3) * 4}' fill='url(#core-c${i})'/><circle cx='300' cy='290' r='${100 - (i % 3) * 4}' fill='none' stroke='${a}' stroke-opacity='.35' stroke-width='3'/>`,
      })),
    },
    {
      trait_type: 'Crest',
      required: true,
      options: COSMIC_CREST.map(([name, g], i) => ({
        name,
        weight: COSMIC_WEIGHTS[i],
        colorHint: '#e8c26a',
        svg: `<text x='300' y='480' text-anchor='middle' font-family='Georgia,serif' font-size='${56 + (i % 3) * 4}' fill='#e8c26a' stroke='#3a2a05' stroke-width='1'>${g}</text>`,
      })),
    },
    {
      trait_type: 'Halo',
      required: false,
      options: COSMIC_HALO.map(([name, key], i) => ({
        name,
        weight: [30, 25, 20, 12, 8, 5][i],
        colorHint: key === 'd' ? '#20d9ff' : key === 'e' ? '#ff7be5' : '#e8c26a',
        svg: key ? HALO_SVG_MAP[key] ?? '' : '',
      })),
    },
    {
      trait_type: 'Sparks',
      required: false,
      options: COSMIC_SPARKS.map(([name, k], i) => {
        const r = mulberry32(77 + i);
        let s = '';
        for (let j = 0; j < k; j += 1) {
          s += `<circle cx='${Math.floor(r() * 600)}' cy='${Math.floor(r() * 520)}' r='${(r() * 2.4 + 0.8).toFixed(1)}' fill='#ffd27a' opacity='${(r() * 0.6 + 0.3).toFixed(2)}'/>`;
        }
        return {
          name,
          weight: [30, 25, 20, 14, 8, 3][i],
          colorHint: '#ffd27a',
          svg: s,
        };
      }),
    },
  ],
};

export const MATRIX_HEROES_THEME: ThemeDef = {
  slug: 'matrix-heroes',
  name: 'Matrix Heroes',
  description: 'Digital guardians born from the code stream.',
  blurb: 'Digital guardians born from the code stream with authentic pre-render trait exclusion rules.',
  baselineStaticCount: 600,
  exclusions: [
    ['Helmet:Crowned', 'Armor:Obsidian Exo-Suit'],
    ['Power Core:Void Engine', 'Aura:Green Code'],
  ],
  layers: [
    {
      trait_type: 'Background',
      required: true,
      options: [
        {
          name: 'Emerald Grid',
          weight: 45,
          colorHint: '#0b735b',
          svg: "<rect width='600' height='600' fill='#061b18'/><path d='M0 30H600M0 90H600M0 150H600M0 210H600M0 270H600M0 330H600M0 390H600M0 450H600M0 510H600M0 570H600M30 0V600M90 0V600M150 0V600M210 0V600M270 0V600M330 0V600M390 0V600M450 0V600M510 0V600M570 0V600' stroke='#0b735b' opacity='.28'/>",
        },
        {
          name: 'Nebula',
          weight: 30,
          colorHint: '#572b83',
          svg: "<defs><radialGradient id='bg-mh-neb'><stop stop-color='#572b83'/><stop offset='1' stop-color='#090d25'/></radialGradient></defs><rect width='600' height='600' fill='url(#bg-mh-neb)'/>",
        },
        {
          name: 'Solar Flare',
          weight: 25,
          colorHint: '#ffb347',
          svg: "<defs><linearGradient id='bg-mh-sol' x2='1' y2='1'><stop stop-color='#ffb347'/><stop offset='1' stop-color='#8d2146'/></linearGradient></defs><rect width='600' height='600' fill='url(#bg-mh-sol)'/>",
        },
      ],
    },
    {
      trait_type: 'Aura',
      required: false,
      options: [
        {
          name: 'Green Code',
          weight: 40,
          colorHint: '#39ff9c',
          svg: "<ellipse cx='300' cy='310' rx='190' ry='230' fill='none' stroke='#39ff9c' stroke-width='12' opacity='.35'/><ellipse cx='300' cy='310' rx='215' ry='255' fill='none' stroke='#39ff9c' stroke-width='3' opacity='.45'/>",
        },
        {
          name: 'Violet Pulse',
          weight: 30,
          colorHint: '#c77dff',
          svg: "<ellipse cx='300' cy='310' rx='195' ry='235' fill='none' stroke='#c77dff' stroke-width='14' opacity='.4'/>",
        },
        {
          name: 'No Aura',
          weight: 30,
          colorHint: '#64748b',
          svg: '',
        },
      ],
    },
    {
      trait_type: 'Armor',
      required: true,
      options: [
        {
          name: 'Quantum Sentinel',
          weight: 40,
          colorHint: '#59d9ff',
          svg: "<path d='M205 350L160 510Q300 580 440 510L395 350L350 310H250Z' fill='#526b78' stroke='#b5eaff' stroke-width='8'/><path d='M250 370H350L330 490H270Z' fill='#102a3a' stroke='#59d9ff' stroke-width='6'/>",
        },
        {
          name: 'Solar Paladin',
          weight: 35,
          colorHint: '#ffdb77',
          svg: "<path d='M205 350L160 510Q300 580 440 510L395 350L350 310H250Z' fill='#c58b35' stroke='#ffe4a3' stroke-width='8'/><path d='M250 370H350L330 490H270Z' fill='#672e25' stroke='#ffdb77' stroke-width='6'/>",
        },
        {
          name: 'Obsidian Exo-Suit',
          weight: 25,
          colorHint: '#8c9baa',
          svg: "<path d='M205 350L160 510Q300 580 440 510L395 350L350 310H250Z' fill='#171b27' stroke='#8c9baa' stroke-width='8'/><path d='M250 370H350L330 490H270Z' fill='#283c50' stroke='#b5d8ff' stroke-width='6'/>",
        },
      ],
    },
    {
      trait_type: 'Helmet',
      required: true,
      options: [
        {
          name: 'Visor',
          weight: 45,
          colorHint: '#3dffd1',
          svg: "<path d='M205 190Q300 90 395 190L380 315Q300 380 220 315Z' fill='#263d4b' stroke='#bdeaff' stroke-width='9'/><path d='M225 235Q300 195 375 235L365 275Q300 310 235 275Z' fill='#3dffd1' stroke='#c8fff4' stroke-width='5'/>",
        },
        {
          name: 'Crowned',
          weight: 25,
          colorHint: '#e7bd58',
          svg: "<path d='M205 190Q300 90 395 190L380 315Q300 380 220 315Z' fill='#b27b2f' stroke='#ffe6a6' stroke-width='9'/><path d='M210 195L190 115L260 160L300 85L340 160L410 115L390 195Z' fill='#e7bd58' stroke='#fff0b7' stroke-width='7'/>",
        },
        {
          name: 'Hooded',
          weight: 30,
          colorHint: '#a78bfa',
          svg: "<path d='M175 220Q190 80 300 90Q410 80 425 220L390 370Q300 420 210 370Z' fill='#202337' stroke='#9b8ecb' stroke-width='9'/><path d='M225 240Q300 205 375 240L360 280Q300 310 240 280Z' fill='#a78bfa'/>",
        },
      ],
    },
    {
      trait_type: 'Power Core',
      required: true,
      options: [
        {
          name: 'Emerald Reactor',
          weight: 40,
          colorHint: '#00ff99',
          svg: "<circle cx='300' cy='410' r='34' fill='#00ff99' stroke='#d1ffe9' stroke-width='8'/><circle cx='300' cy='410' r='14' fill='#fff'/>",
        },
        {
          name: 'Starheart',
          weight: 35,
          colorHint: '#ffdb6e',
          svg: "<path d='M300 375L312 400L340 404L320 424L325 452L300 438L275 452L280 424L260 404L288 400Z' fill='#ffdb6e' stroke='#fff2b8' stroke-width='6'/>",
        },
        {
          name: 'Void Engine',
          weight: 25,
          colorHint: '#bd65ff',
          svg: "<circle cx='300' cy='410' r='34' fill='#180b35' stroke='#c7a4ff' stroke-width='8'/><circle cx='300' cy='410' r='13' fill='#bd65ff'/>",
        },
      ],
    },
    {
      trait_type: 'Relic',
      required: false,
      options: [
        {
          name: 'Chrono Blade',
          weight: 25,
          colorHint: '#c6f4ff',
          svg: "<path d='M430 365L475 130L495 115L490 390L455 430Z' fill='#c6f4ff' stroke='#fff' stroke-width='5'/><path d='M440 420L490 405L500 430L450 445Z' fill='#d8a84e'/>",
        },
        {
          name: 'Aegis Shield',
          weight: 25,
          colorHint: '#2c8c83',
          svg: "<path d='M120 340Q175 310 220 340L210 445Q170 500 130 445Z' fill='#2c8c83' stroke='#b5fff3' stroke-width='8'/>",
        },
        {
          name: 'Nova Staff',
          weight: 20,
          colorHint: '#c27aff',
          svg: "<path d='M470 160L485 500' stroke='#e4c7ff' stroke-width='13'/><circle cx='470' cy='145' r='35' fill='#c27aff' stroke='#f1d7ff' stroke-width='8'/>",
        },
        {
          name: 'None',
          weight: 30,
          colorHint: '#64748b',
          svg: '',
        },
      ],
    },
  ],
};

export const MYTHIC_TITANS_THEME: ThemeDef = {
  slug: 'mythic-titans',
  name: 'Mythic Titans',
  description: 'Ancient champions forged from elemental myth.',
  blurb: 'Fire and ice elemental champions with 16 canonical base combinations enhanced across BigInt indices.',
  baselineStaticCount: 12,
  exclusions: [],
  layers: [
    {
      trait_type: 'Background',
      required: true,
      options: [
        {
          name: 'Temple Dawn',
          weight: 50,
          colorHint: '#ffd88a',
          svg: "<rect width='600' height='600' fill='#b85f37'/><circle cx='300' cy='190' r='110' fill='#ffd88a' opacity='.8'/>",
        },
        {
          name: 'Frozen Citadel',
          weight: 50,
          colorHint: '#78b8ce',
          svg: "<rect width='600' height='600' fill='#183a57'/><path d='M0 450L150 220L280 450L420 190L600 460V600H0Z' fill='#78b8ce'/>",
        },
      ],
    },
    {
      trait_type: 'Armor',
      required: true,
      options: [
        {
          name: 'Dragonforged',
          weight: 50,
          colorHint: '#ffd18a',
          svg: "<path d='M205 350L160 510Q300 580 440 510L395 350L350 310H250Z' fill='#9d3d2d' stroke='#ffd18a' stroke-width='10'/>",
        },
        {
          name: 'Frost Titan',
          weight: 50,
          colorHint: '#8ac9df',
          svg: "<path d='M205 350L160 510Q300 580 440 510L395 350L350 310H250Z' fill='#8ac9df' stroke='#e4fbff' stroke-width='10'/>",
        },
      ],
    },
    {
      trait_type: 'Crest',
      required: true,
      options: [
        {
          name: 'Phoenix Crown',
          weight: 50,
          colorHint: '#ffb52e',
          svg: "<path d='M205 210L170 110L260 165L300 70L340 165L430 110L395 210Z' fill='#ffb52e' stroke='#fff0b7' stroke-width='9'/>",
        },
        {
          name: 'Glacier Helm',
          weight: 50,
          colorHint: '#b8efff',
          svg: "<path d='M205 190Q300 90 395 190L380 315Q300 380 220 315Z' fill='#b8efff' stroke='#fff' stroke-width='9'/>",
        },
      ],
    },
    {
      trait_type: 'Element',
      required: true,
      options: [
        {
          name: 'Fire',
          weight: 50,
          colorHint: '#ff6b32',
          svg: "<path d='M300 370C220 300 320 270 300 200C420 290 400 370 300 455Z' fill='#ff6b32' stroke='#ffe08c' stroke-width='8'/>",
        },
        {
          name: 'Ice',
          weight: 50,
          colorHint: '#a7f0ff',
          svg: "<path d='M300 370L260 300L300 210L340 300Z' fill='#a7f0ff' stroke='#fff' stroke-width='8'/>",
        },
      ],
    },
  ],
};

export const FLAGSHIP_THEMES: ThemeDef[] = [
  COSMIC_NEXUS_THEME,
  MATRIX_HEROES_THEME,
  MYTHIC_TITANS_THEME,
];

export function getThemeByNameOrSlug(nameOrSlug?: string): ThemeDef | undefined {
  if (!nameOrSlug) return undefined;
  const q = nameOrSlug.trim().toLowerCase();
  return FLAGSHIP_THEMES.find(
    (t) => t.name.toLowerCase() === q || t.slug.toLowerCase() === q
  );
}

/**
 * Computes frequency-driven visual & 3D PBR enhancements for a specific image layer option
 * based on its exact weight frequency across the category.
 */
export function computeLayerEnhancement(
  weight: number,
  layerTotalWeight: number
): LayerFrequencyEnhancement {
  const prob = Math.max(0.001, weight / Math.max(1, layerTotalWeight));
  const frequencyPct = Number((prob * 100).toFixed(2));
  const infoScore = Number((-Math.log(prob)).toFixed(3));

  if (frequencyPct <= 5) {
    return {
      tier: 'Mythic Foil',
      frequencyPct,
      infoScore,
      badgeColor: '#ff7be5',
      svgEnhancement: '24K Foil Specular Border + Luminous Bloom Filter + Celestial Reticle',
      pbrEnhancement: 'Iridescent Clearcoat (IOR 1.45) + High-Resonance Emissive Core',
      iridescence: 0.9,
      emissiveBoost: 0.45,
      anisotropyBoost: 0.95,
    };
  }
  if (frequencyPct <= 14) {
    return {
      tier: 'Chromatic Rim',
      frequencyPct,
      infoScore,
      badgeColor: '#e8c26a',
      svgEnhancement: 'Champagne-Gold Bevel Accent + Outer Specular Rim Glow',
      pbrEnhancement: 'Anisotropic Brushed Specular Sheen + Secondary Rim Accent',
      iridescence: 0.45,
      emissiveBoost: 0.22,
      anisotropyBoost: 0.85,
    };
  }
  if (frequencyPct <= 26) {
    return {
      tier: 'Satin Etch',
      frequencyPct,
      infoScore,
      badgeColor: '#20d9ff',
      svgEnhancement: 'Precision Micro-Etch Telemetry Frame + Crisp Vector Contrast',
      pbrEnhancement: 'Brushed Satin Alloy Contrast + Fine Calibration Engraving',
      iridescence: 0.15,
      emissiveBoost: 0.1,
      anisotropyBoost: 0.72,
    };
  }
  return {
    tier: 'Architectural Base',
    frequencyPct,
    infoScore,
    badgeColor: '#8fa9bc',
    svgEnhancement: 'Clean Canonical Vector Layer (Baseline Frequency)',
    pbrEnhancement: 'Matte Architectural Obsidian / Standard Metallic Contrast',
    iridescence: 0,
    emissiveBoost: 0,
    anisotropyBoost: 0.55,
  };
}

function pickWeightedOption(options: LayerOptionDef[], random: () => number): LayerOptionDef {
  const total = options.reduce((s, x) => s + Number(x.weight || 1), 0);
  let cursor = random() * total;
  for (const item of options) {
    cursor -= Number(item.weight || 1);
    if (cursor <= 0) return item;
  }
  return options[options.length - 1];
}

/**
 * Deterministic O(1) edition resolver using the exact Standard Super NFT Foundry algorithm
 * (SHA-256 seed -> Mulberry32 -> weighted layer selection -> pre-render exclusion validation).
 */
export function resolveThemeEditionDeterministic(
  theme: ThemeDef,
  pageIndexStr: string
): {
  traits: ResolvedLayerTrait[];
  fingerprint: string;
  rarityScore: number;
  maxEnhancementTier: LayerEnhancementTier;
  accentHex: string;
  secondaryHex: string;
} {
  for (let attempt = 0; attempt < 2000; attempt += 1) {
    const seed = Number.parseInt(
      sha256Hex(`${theme.name}:${pageIndexStr}:${attempt}`).slice(0, 8),
      16
    );
    const random = mulberry32(seed);
    const picked = theme.layers
      .map((layer) => {
        const layerTotalWeight = layer.options.reduce((s, o) => s + Number(o.weight || 1), 0);
        const option = pickWeightedOption(layer.options, random);
        return { layer, layerTotalWeight, option };
      })
      .filter((x) => x.option && x.option.name !== 'None');

    const keys = new Set(picked.map((x) => `${x.layer.trait_type}:${x.option.name}`));
    const blocked = (theme.exclusions || []).some((rule) => rule.every((key) => keys.has(key)));
    if (blocked) continue;

    const traits: ResolvedLayerTrait[] = picked.map(({ layer, layerTotalWeight, option }) => {
      const enhancement = computeLayerEnhancement(option.weight, layerTotalWeight);
      return {
        trait_type: layer.trait_type,
        value: option.name,
        weight: option.weight,
        layerTotalWeight,
        weightPct: enhancement.frequencyPct,
        infoScore: enhancement.infoScore,
        svg: option.svg || '',
        enhancement,
      };
    });

    const fingerprint = sha256Hex(
      traits
        .map((x) => `${x.trait_type}:${x.value}`)
        .sort()
        .join('|')
    );

    // Authentic -ln(p) information-theoretic rarity score scaled to readable points
    const rawInfoSum = traits.reduce((sum, t) => sum + t.infoScore, 0);
    const rarityScore = Number((rawInfoSum * 10).toFixed(2));

    const tierRank: Record<LayerEnhancementTier, number> = {
      'Architectural Base': 0,
      'Satin Etch': 1,
      'Chromatic Rim': 2,
      'Mythic Foil': 3,
    };
    let maxEnhancementTier: LayerEnhancementTier = 'Architectural Base';
    for (const t of traits) {
      if (tierRank[t.enhancement.tier] > tierRank[maxEnhancementTier]) {
        maxEnhancementTier = t.enhancement.tier;
      }
    }

    const coreTrait =
      picked.find((p) => p.layer.trait_type === 'Power Core' || p.layer.trait_type === 'Element') ??
      picked[picked.length - 1];
    const horizonTrait =
      picked.find((p) => p.layer.trait_type === 'Horizon' || p.layer.trait_type === 'Aura' || p.layer.trait_type === 'Crest') ??
      picked[0];

    return {
      traits,
      fingerprint,
      rarityScore,
      maxEnhancementTier,
      accentHex: coreTrait?.option.colorHint || '#d4b475',
      secondaryHex: horizonTrait?.option.colorHint || '#20d9ff',
    };
  }

  throw new Error(`Unable to resolve valid trait combination for ${theme.name} #${pageIndexStr}`);
}

/**
 * Renders the authentic 600x600 layered SVG with frequency-driven SVG enhancements
 * (Mythic Foil border/reticle, Chromatic Rim specular frame, or Satin Etch corner ticks).
 */
export function renderEnhancedFoundrySvg(params: {
  traits: ResolvedLayerTrait[];
  title: string;
  shortIndex: string;
  contractId: string;
  rarityTier: string;
  maxEnhancementTier: LayerEnhancementTier;
  applyEnhancements?: boolean;
}): string {
  const art = params.traits.map((t) => t.svg).filter(Boolean).join('\n');
  let overlay = '';

  if (params.applyEnhancements !== false) {
    if (params.maxEnhancementTier === 'Mythic Foil') {
      overlay = `
  <defs>
    <linearGradient id="mythicFoil" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ff7be5"/>
      <stop offset="50%" stop-color="#e8c26a"/>
      <stop offset="100%" stop-color="#20d9ff"/>
    </linearGradient>
  </defs>
  <rect x="12" y="12" width="576" height="576" rx="18" fill="none" stroke="url(#mythicFoil)" stroke-width="5" opacity="0.92"/>
  <circle cx="300" cy="290" r="264" fill="none" stroke="url(#mythicFoil)" stroke-width="1.5" stroke-dasharray="6 10" opacity="0.65"/>`;
    } else if (params.maxEnhancementTier === 'Chromatic Rim') {
      overlay = `
  <rect x="14" y="14" width="572" height="572" rx="16" fill="none" stroke="#e8c26a" stroke-width="3.5" opacity="0.78"/>
  <path d="M26 58 V26 H58 M542 26 H574 V58 M26 542 V574 H58 M542 574 H574 V542" fill="none" stroke="#20d9ff" stroke-width="3" opacity="0.85"/>`;
    } else if (params.maxEnhancementTier === 'Satin Etch') {
      overlay = `
  <rect x="16" y="16" width="568" height="568" rx="14" fill="none" stroke="#20d9ff" stroke-width="1.5" opacity="0.45"/>
  <path d="M28 52 V28 H52 M548 28 H572 V52 M28 548 V572 H52 M548 572 H572 V548" fill="none" stroke="#e8c26a" stroke-width="2" opacity="0.65"/>`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <title>${escapeXml(params.title)}</title>
  ${art}
  ${overlay}
  <text x="300" y="556" text-anchor="middle" fill="#ffffff" opacity="0.88" font-family="ui-monospace, monospace" font-size="14" font-weight="700">${escapeXml(params.contractId)} · ${escapeXml(params.rarityTier.toUpperCase())}</text>
  <text x="300" y="578" text-anchor="middle" fill="#cbd5e1" opacity="0.78" font-family="ui-monospace, monospace" font-size="12">EDITION ${escapeXml(params.shortIndex)} · ${escapeXml(params.maxEnhancementTier.toUpperCase())}</text>
</svg>`;
}

/**
 * Generates authentic Foundry edition narrative using the exact template from foundry.js.
 */
export function buildAuthenticNarrative(
  theme: ThemeDef,
  traits: ResolvedLayerTrait[],
  shortIndex: string
): string {
  const values = Object.fromEntries(traits.map((t) => [t.trait_type, t.value]));
  const hero = values.Helmet || values.Crest || 'The Unknown';
  const armor = values.Armor || 'relic armor';
  const power = values['Power Core'] || values.Element || 'an ancient force';
  const relic = values.Relic && values.Relic !== 'None' ? ` Carrying ${values.Relic},` : '';
  return `${hero}, edition ${shortIndex}, emerged from ${theme.description.toLowerCase()} Clad in ${armor.toLowerCase()} and channeling ${power.toLowerCase()},${relic} this champion protects the boundary between imagination and reality.`;
}

/**
 * Builds the complete Cross-Category Image Layer Asset Frequency & Enhancement Matrix
 * across all 3 flagship collections with isolated live SVG previews per layer option.
 */
export function buildCrossCategoryLayerAnalytics(filterCollection?: string) {
  const targetThemes = filterCollection
    ? FLAGSHIP_THEMES.filter(
        (t) =>
          t.name.toLowerCase() === filterCollection.toLowerCase() ||
          t.slug.toLowerCase() === filterCollection.toLowerCase()
      )
    : FLAGSHIP_THEMES;

  const themesToReport = targetThemes.length > 0 ? targetThemes : FLAGSHIP_THEMES;

  return {
    totalCollections: FLAGSHIP_THEMES.length,
    totalLayerAssets: themesToReport.reduce(
      (sum, t) => sum + t.layers.reduce((ls, l) => ls + l.options.length, 0),
      0
    ),
    enhancementLegend: [
      {
        tier: 'Mythic Foil',
        threshold: '<= 5% frequency',
        color: '#ff7be5',
        summary: '24K Foil SVG border + iridescent clearcoat PBR (IOR 1.45) + high emissive resonance',
      },
      {
        tier: 'Chromatic Rim',
        threshold: '5.01% – 14% frequency',
        color: '#e8c26a',
        summary: 'Champagne-gold specular frame + anisotropic brushed sheen + secondary rim glow',
      },
      {
        tier: 'Satin Etch',
        threshold: '14.01% – 26% frequency',
        color: '#20d9ff',
        summary: 'Micro-etch telemetry corner ticks + satin metallic contrast in 3D Studio',
      },
      {
        tier: 'Architectural Base',
        threshold: '> 26% frequency',
        color: '#8fa9bc',
        summary: 'Canonical clean vector layer + matte obsidian architectural finish',
      },
    ],
    collections: themesToReport.map((theme) => {
      const rawCombinations = theme.layers.reduce((acc, l) => acc * l.options.length, 1);
      return {
        slug: theme.slug,
        name: theme.name,
        description: theme.description,
        baselineStaticCount: theme.baselineStaticCount,
        rawCombinations,
        exclusions: theme.exclusions,
        layers: theme.layers.map((layer) => {
          const totalWeight = layer.options.reduce((s, o) => s + Number(o.weight || 1), 0);
          return {
            trait_type: layer.trait_type,
            required: layer.required !== false,
            totalWeight,
            options: layer.options.map((opt) => {
              const enhancement = computeLayerEnhancement(opt.weight, totalWeight);
              const previewSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 600 600"><rect width="600" height="600" fill="#07131f"/>${opt.svg || "<text x='300' y='310' text-anchor='middle' fill='#64748b' font-family='monospace' font-size='28'>NONE</text>"}</svg>`;
              return {
                name: opt.name,
                weight: opt.weight,
                colorHint: opt.colorHint || '#d4b475',
                enhancement,
                previewSvg,
              };
            }),
          };
        }),
      };
    }),
  };
}
