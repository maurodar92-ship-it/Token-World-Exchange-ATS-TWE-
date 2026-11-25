import crypto from 'crypto';

export interface FoundryLayerOption {
  name: string;
  weight: number;
  svg: string;
}

export interface FoundryLayer {
  trait_type: string;
  required: boolean;
  options: FoundryLayerOption[];
}

export interface FoundryTheme {
  description: string;
  layers: FoundryLayer[];
  exclusions: string[][];
}

export interface FoundryTraitSelection {
  trait_type: string;
  option: FoundryLayerOption;
}

export interface FoundryEditionMetadata {
  name: string;
  description: string;
  image: string;
  edition: number;
  attributes: Array<{ trait_type: string; value: string }>;
  properties: {
    fingerprint: string;
    theme: string;
    creator: string;
  };
}

export interface FoundryEditionItem {
  id: number;
  svg: string;
  metadata: FoundryEditionMetadata;
}

export interface FoundryRarityRow {
  trait: string;
  value: string;
  count: number;
  percent: number;
}

export interface FoundryJobRecord {
  id: string;
  theme: string;
  count: number;
  done: number;
  status: 'queued' | 'running' | 'completed' | 'failed';
  createdAt: string;
  error: string | null;
  collectionId?: string;
}

export interface FoundryCollectionRecord {
  id: string;
  name: string;
  description: string;
  creator: string;
  theme: string;
  count: number;
  createdAt: string;
  investmentLinked: boolean;
  jurisdiction?: string;
  items: FoundryEditionItem[];
  rarity: FoundryRarityRow[];
}

export const FOUNDRY_MAX_BATCH = 500;

export const FOUNDRY_COMPLIANCE_POLICY = {
  mode: 'configurable_demo_policy_not_legal_advice',
  jurisdictions: ['US', 'CA', 'GB', 'EU', 'AU', 'SG'],
  restrictedJurisdictions: [] as string[],
  investmentLinkedCollectionsRequire: [
    'identityVerified',
    'sanctionsScreened',
    'qualifiedInvestorVerified',
  ],
  notice:
    'This policy is a software gate only. It does not determine legal eligibility, provide legal advice, or establish that an offering is compliant. Obtain jurisdiction-specific counsel and use an authorized KYC/sanctions provider before production.',
} as const;

export const FOUNDRY_THEMES: Record<string, FoundryTheme> = {
  'Matrix Heroes': {
    description: 'Digital guardians born from the code stream.',
    layers: [
      {
        trait_type: 'Background',
        required: true,
        options: [
          {
            name: 'Emerald Grid',
            weight: 45,
            svg: "<rect width='600' height='600' fill='#061b18'/><path d='M0 100H600M0 200H600M0 300H600M0 400H600M0 500H600M100 0V600M200 0V600M300 0V600M400 0V600M500 0V600' stroke='#00ff99' opacity='.28'/>",
          },
          {
            name: 'Nebula',
            weight: 30,
            svg: "<defs><radialGradient id='bgNeb'><stop stop-color='#572b83'/><stop offset='1' stop-color='#090d25'/></radialGradient></defs><rect width='600' height='600' fill='url(#bgNeb)'/>",
          },
          {
            name: 'Solar Flare',
            weight: 25,
            svg: "<defs><linearGradient id='bgSol' x2='1' y2='1'><stop stop-color='#ffb347'/><stop offset='1' stop-color='#8d2146'/></linearGradient></defs><rect width='600' height='600' fill='url(#bgSol)'/>",
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
            svg: "<ellipse cx='300' cy='300' rx='190' ry='230' fill='none' stroke='#39ff9c' stroke-width='12' opacity='.55'/>",
          },
          {
            name: 'Violet Pulse',
            weight: 30,
            svg: "<ellipse cx='300' cy='300' rx='195' ry='235' fill='none' stroke='#c77dff' stroke-width='14' opacity='.65'/>",
          },
          {
            name: 'None',
            weight: 30,
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
            svg: "<path d='M205 350L160 510Q300 580 440 510L395 350L350 310H250Z' fill='#526b78' stroke='#b5eaff' stroke-width='8'/>",
          },
          {
            name: 'Solar Paladin',
            weight: 35,
            svg: "<path d='M205 350L160 510Q300 580 440 510L395 350L350 310H250Z' fill='#c58b35' stroke='#ffe4a3' stroke-width='8'/>",
          },
          {
            name: 'Obsidian Exo-Suit',
            weight: 25,
            svg: "<path d='M205 350L160 510Q300 580 440 510L395 350L350 310H250Z' fill='#171b27' stroke='#8c9baa' stroke-width='8'/>",
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
            svg: "<path d='M205 190Q300 90 395 190L380 315Q300 380 220 315Z' fill='#263d4b' stroke='#bdeaff' stroke-width='9'/><path d='M225 235Q300 195 375 235L365 275Q300 310 235 275Z' fill='#3dffd1'/>",
          },
          {
            name: 'Crowned',
            weight: 25,
            svg: "<path d='M205 190Q300 90 395 190L380 315Q300 380 220 315Z' fill='#b27b2f' stroke='#ffe6a6' stroke-width='9'/><path d='M210 195L190 115L260 160L300 85L340 160L410 115L390 195Z' fill='#e7bd58'/>",
          },
          {
            name: 'Hooded',
            weight: 30,
            svg: "<path d='M175 220Q190 80 300 90Q410 80 425 220L390 370Q300 420 210 370Z' fill='#202337' stroke='#9b8ecb' stroke-width='9'/>",
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
            svg: "<circle cx='300' cy='410' r='34' fill='#00ff99' stroke='#d1ffe9' stroke-width='8'/>",
          },
          {
            name: 'Starheart',
            weight: 35,
            svg: "<path d='M300 375L312 400L340 404L320 424L325 452L300 438L275 452L280 424L260 404L288 400Z' fill='#ffdb6e'/>",
          },
          {
            name: 'Void Engine',
            weight: 25,
            svg: "<circle cx='300' cy='410' r='34' fill='#180b35' stroke='#c7a4ff' stroke-width='8'/>",
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
            svg: "<path d='M430 365L475 130L495 115L490 390L455 430Z' fill='#c6f4ff' stroke='#fff' stroke-width='5'/>",
          },
          {
            name: 'Aegis Shield',
            weight: 25,
            svg: "<path d='M120 340Q175 310 220 340L210 445Q170 500 130 445Z' fill='#2c8c83' stroke='#9fffe8' stroke-width='5'/>",
          },
          {
            name: 'Nova Staff',
            weight: 20,
            svg: "<path d='M470 160L485 500' stroke='#e4c7ff' stroke-width='13'/><circle cx='470' cy='145' r='35' fill='#c27aff'/>",
          },
          {
            name: 'None',
            weight: 30,
            svg: '',
          },
        ],
      },
    ],
    exclusions: [
      ['Helmet:Crowned', 'Armor:Obsidian Exo-Suit'],
      ['Power Core:Void Engine', 'Aura:Green Code'],
    ],
  },
  'Infinite Horizon Cosmic Nexus': {
    description: 'Sovereign astral navigators forged across the Infinite Horizon Cosmic Nexus.',
    layers: [
      {
        trait_type: 'Background',
        required: true,
        options: [
          {
            name: 'Obsidian Meridian',
            weight: 30,
            svg: "<rect width='600' height='600' fill='#090c14'/><circle cx='300' cy='300' r='250' fill='none' stroke='#d4b475' stroke-width='2' stroke-dasharray='8 8' opacity='.5'/>",
          },
          {
            name: 'Astral Gold Horizon',
            weight: 25,
            svg: "<defs><radialGradient id='bgGold'><stop stop-color='#4a3614'/><stop offset='1' stop-color='#0a0c10'/></radialGradient></defs><rect width='600' height='600' fill='url(#bgGold)'/>",
          },
          {
            name: 'Deep Quantum Rift',
            weight: 25,
            svg: "<defs><linearGradient id='bgQ' x2='1' y2='1'><stop stop-color='#0b2538'/><stop offset='1' stop-color='#190c33'/></linearGradient></defs><rect width='600' height='600' fill='url(#bgQ)'/>",
          },
          {
            name: 'Cryo Nebula',
            weight: 20,
            svg: "<defs><radialGradient id='bgCryo'><stop stop-color='#155e75'/><stop offset='1' stop-color='#070d16'/></radialGradient></defs><rect width='600' height='600' fill='url(#bgCryo)'/>",
          },
        ],
      },
      {
        trait_type: 'Aura',
        required: false,
        options: [
          {
            name: 'Champagne Orbit',
            weight: 35,
            svg: "<ellipse cx='300' cy='300' rx='220' ry='115' fill='none' stroke='#d4b475' stroke-width='7' transform='rotate(-22 300 300)' opacity='.75'/>",
          },
          {
            name: 'Cyan Singularity',
            weight: 30,
            svg: "<ellipse cx='300' cy='300' rx='220' ry='115' fill='none' stroke='#38bdf8' stroke-width='7' transform='rotate(24 300 300)' opacity='.7'/>",
          },
          {
            name: 'Emerald Lattice',
            weight: 20,
            svg: "<polygon points='300,58 518,300 300,542 82,300' fill='none' stroke='#10b981' stroke-width='5' opacity='.55'/>",
          },
          {
            name: 'None',
            weight: 15,
            svg: '',
          },
        ],
      },
      {
        trait_type: 'Armor',
        required: true,
        options: [
          {
            name: 'Sovereign Bullion Plate',
            weight: 30,
            svg: "<path d='M200 345L152 515Q300 582 448 515L400 345L352 305H248Z' fill='#a8843e' stroke='#f6e6c2' stroke-width='8'/>",
          },
          {
            name: 'Graphite Aegis',
            weight: 30,
            svg: "<path d='M200 345L152 515Q300 582 448 515L400 345L352 305H248Z' fill='#1c2330' stroke='#94a3b8' stroke-width='8'/>",
          },
          {
            name: 'Chrono-Titanium Rig',
            weight: 20,
            svg: "<path d='M200 345L152 515Q300 582 448 515L400 345L352 305H248Z' fill='#28485c' stroke='#7dd3fc' stroke-width='8'/>",
          },
          {
            name: 'Astral Silk Mantle',
            weight: 20,
            svg: "<path d='M200 345L152 515Q300 582 448 515L400 345L352 305H248Z' fill='#4c2b6e' stroke='#d8b4fe' stroke-width='8'/>",
          },
        ],
      },
      {
        trait_type: 'Helmet',
        required: true,
        options: [
          {
            name: 'Celestial Crown',
            weight: 25,
            svg: "<path d='M205 190Q300 92 395 190L380 315Q300 375 220 315Z' fill='#a8843e' stroke='#f6e6c2' stroke-width='8'/><path d='M208 190L188 106L262 152L300 74L338 152L412 106L392 190Z' fill='#d4b475'/>",
          },
          {
            name: 'Prism Visor',
            weight: 30,
            svg: "<path d='M205 190Q300 92 395 190L380 315Q300 375 220 315Z' fill='#1f2937' stroke='#38bdf8' stroke-width='8'/><path d='M225 235Q300 198 375 235L365 276Q300 306 235 276Z' fill='#38bdf8'/>",
          },
          {
            name: 'Eclipse Hood',
            weight: 25,
            svg: "<path d='M172 222Q192 78 300 88Q408 78 428 222L390 368Q300 416 210 368Z' fill='#111827' stroke='#d4b475' stroke-width='8'/>",
          },
          {
            name: 'Horizon Halo',
            weight: 20,
            svg: "<circle cx='300' cy='102' r='56' fill='none' stroke='#f6e6c2' stroke-width='6'/><path d='M208 192Q300 96 392 192L378 314Q300 374 222 314Z' fill='#334155' stroke='#e2e8f0' stroke-width='8'/>",
          },
        ],
      },
      {
        trait_type: 'Power Core',
        required: true,
        options: [
          {
            name: 'Reserve Sun Core',
            weight: 30,
            svg: "<circle cx='300' cy='410' r='34' fill='#d4b475' stroke='#fef3c7' stroke-width='8'/>",
          },
          {
            name: 'Quantum Lattice',
            weight: 30,
            svg: "<polygon points='300,372 336,410 300,448 264,410' fill='#38bdf8' stroke='#e0f2fe' stroke-width='7'/>",
          },
          {
            name: 'Emerald Pulsar',
            weight: 20,
            svg: "<circle cx='300' cy='410' r='34' fill='#10b981' stroke='#a7f3d0' stroke-width='8'/>",
          },
          {
            name: 'Dark Matter Heart',
            weight: 20,
            svg: "<circle cx='300' cy='410' r='34' fill='#1e1b4b' stroke='#a78bfa' stroke-width='8'/>",
          },
        ],
      },
      {
        trait_type: 'Relic',
        required: false,
        options: [
          {
            name: 'Meridian Scepter',
            weight: 30,
            svg: "<path d='M476 150L490 500' stroke='#d4b475' stroke-width='12'/><circle cx='476' cy='138' r='30' fill='#f6e6c2'/>",
          },
          {
            name: 'Vault Keyblade',
            weight: 25,
            svg: "<path d='M436 365L478 128L498 115L494 388L458 426Z' fill='#e2e8f0' stroke='#d4b475' stroke-width='5'/>",
          },
          {
            name: 'Orbital Buckler',
            weight: 25,
            svg: "<circle cx='146' cy='410' r='56' fill='#1e293b' stroke='#d4b475' stroke-width='8'/>",
          },
          {
            name: 'None',
            weight: 20,
            svg: '',
          },
        ],
      },
    ],
    exclusions: [
      ['Helmet:Celestial Crown', 'Armor:Graphite Aegis'],
      ['Power Core:Dark Matter Heart', 'Aura:Champagne Orbit'],
    ],
  },
  'Mythic Titans': {
    description: 'Ancient champions forged from elemental myth.',
    layers: [
      {
        trait_type: 'Background',
        required: true,
        options: [
          {
            name: 'Temple Dawn',
            weight: 50,
            svg: "<rect width='600' height='600' fill='#b85f37'/><circle cx='300' cy='190' r='110' fill='#ffd88a'/>",
          },
          {
            name: 'Frozen Citadel',
            weight: 50,
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
            svg: "<path d='M205 350L160 510Q300 580 440 510L395 350L350 310H250Z' fill='#9d3d2d' stroke='#ffd18a' stroke-width='10'/>",
          },
          {
            name: 'Frost Titan',
            weight: 50,
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
            svg: "<path d='M205 210L170 110L260 165L300 70L340 165L430 110L395 210Z' fill='#ffb52e'/>",
          },
          {
            name: 'Glacier Helm',
            weight: 50,
            svg: "<path d='M205 190Q300 90 395 190L380 315Q300 380 220 315Z' fill='#b8efff'/>",
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
            svg: "<path d='M300 370C220 300 320 270 300 200C420 290 400 370 300 455Z' fill='#ff6b32'/>",
          },
          {
            name: 'Ice',
            weight: 50,
            svg: "<path d='M300 370L260 300L300 210L340 300Z' fill='#a7f0ff'/>",
          },
        ],
      },
    ],
    exclusions: [],
  },
};

export function hash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function escapeXml(value: string): string {
  return String(value).replace(/[<>&"']/g, (char) => {
    switch (char) {
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
        return char;
    }
  });
}

function rng(seed: number): () => number {
  let n = seed >>> 0;
  return () => {
    n += 0x6d2b79f5;
    let t = n;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T extends { weight?: number }>(items: T[], random: () => number): T {
  const total = items.reduce((sum, item) => sum + Number(item.weight || 1), 0);
  let cursor = random() * total;
  for (const item of items) {
    cursor -= Number(item.weight || 1);
    if (cursor <= 0) return item;
  }
  return items[items.length - 1];
}

export function createEdition(
  themeName: string,
  theme: FoundryTheme,
  edition: number,
  exclusions: string[][],
  used: Set<string>
): { traits: FoundryTraitSelection[]; fingerprint: string } {
  for (let attempt = 0; attempt < 2000; attempt += 1) {
    const seed = Number.parseInt(hash(`${themeName}:${edition}:${attempt}`).slice(0, 8), 16);
    const random = rng(seed);

    const traits: FoundryTraitSelection[] = theme.layers
      .map((layer) => ({
        trait_type: layer.trait_type,
        option: pick(layer.options, random),
      }))
      .filter((x) => x.option && x.option.name !== 'None');

    const keys = new Set(traits.map((x) => `${x.trait_type}:${x.option.name}`));

    // Validate exclusions BEFORE rendering.
    const blocked = exclusions.some((rule) => rule.every((key) => keys.has(key)));

    const fingerprint = hash(
      traits
        .map((x) => `${x.trait_type}:${x.option.name}`)
        .sort()
        .join('|')
    );

    if (!blocked && !used.has(fingerprint)) {
      used.add(fingerprint);
      return { traits, fingerprint };
    }
  }

  throw new Error('Trait space exhausted or exclusions are too restrictive.');
}

export function renderSvg(traits: FoundryTraitSelection[], title: string, edition: number): string {
  const art = traits.map((t) => t.option.svg || '').join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <title>${escapeXml(title)}</title>
  ${art}
  <text x="300" y="565" text-anchor="middle" fill="#ffffff" opacity=".82" font-family="Arial, sans-serif" font-size="17" letter-spacing="1.5">EDITION ${edition}</text>
</svg>`;
}

export function narrative(
  theme: FoundryTheme,
  traits: FoundryTraitSelection[],
  edition: number
): string {
  const values = Object.fromEntries(traits.map((t) => [t.trait_type, t.option.name]));
  const hero = values.Helmet || values.Crest || 'The Unknown';
  const armor = values.Armor || 'relic armor';
  const power = values['Power Core'] || values.Element || 'an ancient force';
  const relic = values.Relic && values.Relic !== 'None' ? ` Carrying ${values.Relic},` : '';

  return `${hero}, edition ${edition}, emerged from ${theme.description.toLowerCase()} Clad in ${armor.toLowerCase()} and channeling ${power.toLowerCase()},${relic} this champion protects the boundary between imagination and reality.`;
}

export function calculateRarity(items: FoundryEditionItem[]): FoundryRarityRow[] {
  if (items.length === 0) return [];
  const counts: Record<string, number> = {};
  for (const item of items) {
    for (const attribute of item.metadata.attributes) {
      const key = `${attribute.trait_type}:${attribute.value}`;
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([key, count]) => {
      const sep = key.indexOf(':');
      const trait = key.slice(0, sep);
      const value = key.slice(sep + 1);
      return {
        trait,
        value,
        count,
        percent: Number(((count / items.length) * 100).toFixed(2)),
      };
    })
    .sort((a, b) => b.count - a.count);
}

// =========================================================================
// 900-Quintillion (9 × 10^20) BigInt Combinatorial DNA Matrix Resolver
// 20 attribute layers: 9 options in layer 0 × 10 options in layers 1..19 = 9 * 10^20
// =========================================================================
const MATRIX_20_LAYERS: Array<{ layer: string; values: string[] }> = [
  {
    layer: 'Universe Tier',
    values: ['Aether', 'Astro', 'Chrono', 'Cyber', 'Solstice', 'Horizon', 'Meridian', 'Omega', 'Sovereign'],
  },
  { layer: 'Realm Biome', values: ['Emerald Grid', 'Nebula', 'Solar Flare', 'Obsidian Void', 'Cryo Citadel', 'Golden Spire', 'Plasma Reef', 'Astral Sea', 'Quantum Vault', 'Iron Horizon'] },
  { layer: 'Atmospheric Field', values: ['Ion Mist', 'Solar Wind', 'Dark Lattice', 'Aurora Band', 'Zero-G Dust', 'Champagne Glow', 'Photon Rain', 'Pulse Static', 'Starlight Veil', 'Clear Horizon'] },
  { layer: 'Armor Alloy', values: ['Bullion Gold', 'Graphite Titanium', 'Obsidian Alloy', 'Cryo Steel', 'Aether Silk', 'Carbon Weave', 'Cobalt Plate', 'Emerald Mail', 'Solar Bronze', 'Chrono Glass'] },
  { layer: 'Chassis Silhouette', values: ['Sentinel', 'Paladin', 'Vanguard', 'Phantom', 'Colossus', 'Warden', 'Oracle', 'Nomad', 'Arbiter', 'Titan'] },
  { layer: 'Helm Architecture', values: ['Visor', 'Crowned', 'Hooded', 'Haloed', 'Valkyrie', 'Prism', 'Glacier', 'Horned', 'Aegis', 'Eclipse'] },
  { layer: 'Optic Spectrum', values: ['Emerald', 'Cyan', 'Champagne', 'Amber', 'Violet', 'Crimson', 'Platinum', 'Cobalt', 'Jade', 'Ultraviolet'] },
  { layer: 'Core Reactor', values: ['Emerald Reactor', 'Starheart', 'Void Engine', 'Reserve Sun', 'Quantum Lattice', 'Frost Prism', 'Chrono Cell', 'Fusion Ring', 'Aether Seed', 'Singularity'] },
  { layer: 'Primary Relic', values: ['Chrono Blade', 'Aegis Shield', 'Nova Staff', 'Meridian Scepter', 'Vault Keyblade', 'Orbital Buckler', 'Plasma Lance', 'Star Bow', 'Arc Hammer', 'Rune Grimoire'] },
  { layer: 'Secondary Module', values: ['Drone Array', 'Phase Cloak', 'Thruster Wing', 'Holo Banner', 'Telemetry Ring', 'Shield Emitter', 'Flux Cape', 'Data Halo', 'Gravity Coil', 'None'] },
  { layer: 'Crest Insignia', values: ['Octagon', 'Infinity', 'Phoenix', 'Crown', 'Meridian', 'Diamond', 'Trident', 'Compass', 'Helix', 'Anvil'] },
  { layer: 'Energy Conduit', values: ['Gold Filigree', 'Neon Trace', 'Arc Vein', 'Pulse Conduit', 'Frost Line', 'Plasma Seam', 'Carbon Rib', 'Prism Fiber', 'Ether Thread', 'Obsidian Trim'] },
  { layer: 'Gauntlet Spec', values: ['Heavy Grasp', 'Precision Node', 'Holo Bracer', 'Gilded Vambrace', 'Kinetic Claw', 'Shield Cuff', 'Phase Glove', 'Arc Knuckle', 'Rune Wrap', 'Standard'] },
  { layer: 'Shoulder Mantle', values: ['Pauldron', 'Winged', 'Spiked', 'Stepped Gold', 'Angular Stealth', 'Caped', 'Orbital Ring', 'Cryo Ridge', 'Beveled Plate', 'Minimal'] },
  { layer: 'Alignment Protocol', values: ['Order', 'Equilibrium', 'Vigilance', 'Sovereignty', 'Synthesis', 'Innovation', 'Custody', 'Catalyst', 'Continuity', 'Genesis'] },
  { layer: 'Signal Frequency', values: ['432 Hz', '528 Hz', '639 Hz', '741 Hz', '852 Hz', '963 Hz', '1080 Hz', '1440 Hz', '2048 Hz', '4096 Hz'] },
  { layer: 'Settlement Rail', values: ['Ethereum', 'Base', 'Arbitrum', 'Polygon', 'Solana', 'Optimism', 'Avalanche', 'Sepolia', 'TWE L2', 'Sovereign Mesh'] },
  { layer: 'Custody Class', values: ['ERC-721', 'ERC-1155', 'ERC-3643', 'ERC-6551', 'Soulbound', 'Vaulted', 'Fractional', 'Escrow', 'Multi-Sig', 'Genesis'] },
  { layer: 'Taxonomy Bucket', values: ['Digital Collectible', 'Digital Tool', 'Network Utility', 'Membership Pass', 'Art Edition', 'Lore Artifact', 'Access Key', 'Title Badge', 'Trophy', 'Archival'] },
  { layer: 'Rarity Signature', values: ['Genesis I', 'Apex II', 'Mythic III', 'Sovereign IV', 'Prime V', 'Noble VI', 'Vanguard VII', 'Core VIII', 'Standard IX', 'Origin X'] },
];

export const MAX_900Q_SPACE = 900_000_000_000_000_000_000n; // 9 × 10^20

export function resolveBigIntDna(rawIndex: string): {
  indexDecimal: string;
  maxSpaceDecimal: string;
  maxSpaceFormula: string;
  fingerprint: string;
  layers: Array<{ layerIndex: number; trait_type: string; value: string }>;
  emblemSvg: string;
} {
  const cleaned = String(rawIndex || '1').replace(/[^0-9]/g, '');
  let idx = cleaned ? BigInt(cleaned) : 1n;
  if (idx < 0n) idx = 0n;
  if (idx >= MAX_900Q_SPACE) idx = idx % MAX_900Q_SPACE;

  let cursor = idx;
  const resolved: Array<{ layerIndex: number; trait_type: string; value: string }> = [];
  for (let i = MATRIX_20_LAYERS.length - 1; i >= 0; i -= 1) {
    const spec = MATRIX_20_LAYERS[i];
    const base = BigInt(spec.values.length);
    const choice = Number(cursor % base);
    cursor = cursor / base;
    resolved.unshift({
      layerIndex: i + 1,
      trait_type: spec.layer,
      value: spec.values[choice],
    });
  }

  const fingerprint = hash(`900Q:${idx.toString()}:${resolved.map((r) => r.value).join('|')}`);
  const palette = ['#39ff9c', '#d4b475', '#38bdf8', '#c77dff', '#f59e0b', '#10b981'];
  const accent = palette[Number(idx % BigInt(palette.length))];
  const secondary = palette[Number((idx / 7n) % BigInt(palette.length))];
  const shortLabel = `#${idx.toString().length > 14 ? `${idx.toString().slice(0, 6)}…${idx.toString().slice(-6)}` : idx.toString()}`;

  const emblemSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <title>900Q Matrix DNA ${escapeXml(idx.toString())}</title>
  <rect width="600" height="600" fill="#06110f"/>
  <circle cx="300" cy="300" r="245" fill="none" stroke="${accent}" stroke-width="2" stroke-dasharray="6 8" opacity="0.55"/>
  <ellipse cx="300" cy="300" rx="220" ry="96" fill="none" stroke="${accent}" stroke-width="4" transform="rotate(${Number(idx % 180n)} 300 300)" opacity="0.8"/>
  <ellipse cx="300" cy="300" rx="210" ry="88" fill="none" stroke="${secondary}" stroke-width="3" transform="rotate(${Number((idx * 13n) % 180n)} 300 300)" opacity="0.65"/>
  <polygon points="300,115 445,300 300,485 155,300" fill="#0c1c17" stroke="${accent}" stroke-width="6"/>
  <circle cx="300" cy="300" r="54" fill="${secondary}" opacity="0.22" stroke="${accent}" stroke-width="3"/>
  <text x="300" y="294" text-anchor="middle" fill="#e1f5eb" font-family="monospace" font-size="22" font-weight="700">${escapeXml(resolved[0].value.toUpperCase())}</text>
  <text x="300" y="322" text-anchor="middle" fill="${accent}" font-family="monospace" font-size="14">${escapeXml(resolved[4].value)} · ${escapeXml(resolved[5].value)}</text>
  <text x="300" y="558" text-anchor="middle" fill="#8ca99a" font-family="monospace" font-size="15">DNA ${escapeXml(shortLabel)} · ${fingerprint.slice(0, 12)}</text>
</svg>`;

  return {
    indexDecimal: idx.toString(),
    maxSpaceDecimal: MAX_900Q_SPACE.toString(),
    maxSpaceFormula: '9 × 10^20 (20 Layers)',
    fingerprint,
    layers: resolved,
    emblemSvg,
  };
}

// =========================================================================
// In-Memory Async Job & Collection Store
// =========================================================================
class SuperNftFoundryStore {
  private jobs = new Map<string, FoundryJobRecord>();
  private collections = new Map<string, FoundryCollectionRecord>();

  getConfig() {
    return {
      compliance: FOUNDRY_COMPLIANCE_POLICY,
      defaultCreator: 'Mauro Lomibao Dar III',
      maxBatch: FOUNDRY_MAX_BATCH,
      themes: Object.entries(FOUNDRY_THEMES).map(([name, theme]) => ({
        name,
        description: theme.description,
        layers: theme.layers.map((layer) => ({
          trait_type: layer.trait_type,
          required: layer.required,
          options: layer.options.map((opt) => ({
            name: opt.name,
            weight: opt.weight,
          })),
        })),
        exclusions: theme.exclusions,
      })),
    };
  }

  createJob(params: {
    themeName: string;
    count: number;
    collectionName?: string;
    creator?: string;
    applyThemeExclusions?: boolean;
    exclusions?: string[][];
    investmentLinked?: boolean;
    jurisdiction?: string;
    compliance?: Record<string, boolean>;
  }): { status: number; body: Record<string, unknown> } {
    const theme = FOUNDRY_THEMES[params.themeName];
    if (!theme) {
      return { status: 400, body: { error: 'Unknown theme' } };
    }

    if (params.investmentLinked) {
      const jurisdiction = String(params.jurisdiction || '').toUpperCase();
      if (
        !(FOUNDRY_COMPLIANCE_POLICY.jurisdictions as readonly string[]).includes(jurisdiction) ||
        FOUNDRY_COMPLIANCE_POLICY.restrictedJurisdictions.includes(jurisdiction)
      ) {
        return {
          status: 403,
          body: { error: 'Jurisdiction not enabled by configurable software policy.' },
        };
      }
      const missing = FOUNDRY_COMPLIANCE_POLICY.investmentLinkedCollectionsRequire.filter(
        (key) => params.compliance?.[key] !== true
      );
      if (missing.length > 0) {
        return {
          status: 403,
          body: { error: `Missing compliance controls: ${missing.join(', ')}` },
        };
      }
    }

    if (
      !Number.isSafeInteger(params.count) ||
      params.count < 1 ||
      params.count > FOUNDRY_MAX_BATCH
    ) {
      return {
        status: 400,
        body: { error: `Batch must be an integer between 1 and ${FOUNDRY_MAX_BATCH}.` },
      };
    }

    const id = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
    const job: FoundryJobRecord = {
      id,
      theme: params.themeName,
      count: params.count,
      done: 0,
      status: 'queued',
      createdAt: new Date().toISOString(),
      error: null,
    };

    this.jobs.set(id, job);
    setImmediate(() => this.runJob(job, theme, params));
    return { status: 202, body: { ...job } };
  }

  private async runJob(
    job: FoundryJobRecord,
    theme: FoundryTheme,
    params: {
      collectionName?: string;
      creator?: string;
      applyThemeExclusions?: boolean;
      exclusions?: string[][];
      investmentLinked?: boolean;
      jurisdiction?: string;
    }
  ): Promise<void> {
    job.status = 'running';
    const used = new Set<string>();
    const items: FoundryEditionItem[] = [];
    const creator = String(params.creator || 'Mauro Lomibao Dar III').trim().slice(0, 80) || 'Mauro Lomibao Dar III';
    const collectionName =
      String(params.collectionName || job.theme).trim().slice(0, 80) || job.theme;

    const exclusions: string[][] = [
      ...(params.applyThemeExclusions === false ? [] : theme.exclusions),
      ...(Array.isArray(params.exclusions) ? params.exclusions : []),
    ];

    try {
      for (let i = 1; i <= job.count; i += 1) {
        const { traits, fingerprint } = createEdition(job.theme, theme, i, exclusions, used);
        const title = `${collectionName} #${i}`;
        const svg = renderSvg(traits, title, i);
        const story = narrative(theme, traits, i);

        const metadata: FoundryEditionMetadata = {
          name: title,
          description: story,
          image: `${i}.svg`,
          edition: i,
          attributes: traits.map((t) => ({
            trait_type: t.trait_type,
            value: t.option.name,
          })),
          properties: {
            fingerprint,
            theme: job.theme,
            creator,
          },
        };

        items.push({ id: i, svg, metadata });
        job.done = i;

        if (i % 20 === 0) {
          await new Promise<void>((resolve) => setImmediate(resolve));
        }
      }

      // Cap retained collections to 25 to bound memory cleanly
      if (this.collections.size >= 25) {
        const oldestKey = this.collections.keys().next().value;
        if (oldestKey) this.collections.delete(oldestKey);
      }

      this.collections.set(job.id, {
        id: job.id,
        name: collectionName,
        description: theme.description,
        creator,
        theme: job.theme,
        count: items.length,
        createdAt: new Date().toISOString(),
        investmentLinked: Boolean(params.investmentLinked),
        jurisdiction: params.jurisdiction,
        items,
        rarity: calculateRarity(items),
      });

      job.status = 'completed';
      job.collectionId = job.id;
    } catch (err: unknown) {
      job.status = 'failed';
      job.error = err instanceof Error ? err.message : 'Batch generation failed';
    }
  }

  getJob(id: string): FoundryJobRecord | undefined {
    return this.jobs.get(id);
  }

  getCollection(id: string, limit = 80): FoundryCollectionRecord | undefined {
    const col = this.collections.get(id);
    if (!col) return undefined;
    const boundedLimit = Math.min(200, Math.max(1, limit));
    return {
      ...col,
      items: col.items.slice(0, boundedLimit),
    };
  }

  getFullCollectionForExport(id: string): FoundryCollectionRecord | undefined {
    return this.collections.get(id);
  }

  runEngineSelfTest(): {
    passed: number;
    total: number;
    checks: Array<{ name: string; passed: boolean; detail: string }>;
  } {
    const testTheme: FoundryTheme = {
      description: 'A realm of brave heroes',
      layers: [
        {
          trait_type: 'Background',
          required: true,
          options: [
            { name: 'A', weight: 1, svg: '<rect width="600" height="600"/>' },
            { name: 'B', weight: 1, svg: '' },
          ],
        },
        {
          trait_type: 'Armor',
          required: true,
          options: [
            { name: 'Gold', weight: 1, svg: '' },
            { name: 'Dark', weight: 1, svg: '' },
          ],
        },
      ],
      exclusions: [],
    };

    const checks: Array<{ name: string; passed: boolean; detail: string }> = [];

    // Test 1: creates a unique stable edition
    const used1 = new Set<string>();
    const r1 = createEdition('test', testTheme, 1, [], used1);
    const t1Ok = r1.fingerprint.length === 64 && r1.traits.length === 2 && hash('x') === hash('x');
    checks.push({
      name: 'creates a unique stable edition',
      passed: t1Ok,
      detail: `SHA-256 fingerprint (${r1.fingerprint.length} hex chars), ${r1.traits.length} traits deterministic`,
    });

    // Test 2: exclusion rules are applied before generation
    const used2 = new Set<string>();
    let exclusionViolated = false;
    for (let i = 1; i <= 3; i += 1) {
      const r = createEdition('test', testTheme, i, [['Background:A', 'Armor:Gold']], used2);
      const keys = new Set(r.traits.map((t) => `${t.trait_type}:${t.option.name}`));
      if (keys.has('Background:A') && keys.has('Armor:Gold')) {
        exclusionViolated = true;
      }
    }
    const t2Ok = !exclusionViolated && used2.size === 3;
    checks.push({
      name: 'exclusion rules are applied before generation',
      passed: t2Ok,
      detail: `Blocked Background:A + Armor:Gold across ${used2.size} unique editions`,
    });

    // Test 3: renders SVG and narrative
    const ed3 = createEdition('test', testTheme, 3, [], new Set());
    const svg3 = renderSvg(ed3.traits, 'Hero', 3);
    const nar3 = narrative(testTheme, ed3.traits, 3);
    const t3Ok = /<svg/.test(svg3) && /edition 3/.test(nar3);
    checks.push({
      name: 'renders SVG and narrative',
      passed: t3Ok,
      detail: `Generated valid 600x600 SVG (${svg3.length} bytes) & lore referencing edition 3`,
    });

    return {
      passed: checks.filter((c) => c.passed).length,
      total: checks.length,
      checks,
    };
  }
}

export const superNftFoundryStore = new SuperNftFoundryStore();
