import type { AssetKind, HubId } from '../types/twe';
import tokensIconSvg from '../assets/icons/tokens.svg';
import nftsIconSvg from '../assets/icons/nfts.svg';
import commoditiesIconSvg from '../assets/icons/commodities.svg';
import currenciesIconSvg from '../assets/icons/currencies.svg';
import tokensIconArt from '../assets/images/icon_tokens_1795571919894.jpg';
import nftsIconArt from '../assets/images/icon_nfts_1795571922891.jpg';
import commoditiesIconArt from '../assets/images/icon_commodities_1795571924499.jpg';
import currenciesIconArt from '../assets/images/icon_currencies_1795571925233.jpg';

export const GENERATED_SECTION_IMAGES = {
  planetaryHero: '/src/assets/images/twe_planetary_exchange_hero_1794867198110.jpg',
  sovereignVault: '/src/assets/images/twe_sovereign_vault_bullion_1794867197951.jpg',
  commoditiesNode: '/src/assets/images/twe_energy_commodities_node_1794867199783.jpg',
  foundryEmblem: '/src/assets/images/twe_foundry_token_emblem_1794867197493.jpg',
  complianceNexus: '/src/assets/images/twe_quantum_compliance_nexus_1794867198985.jpg',
} as const;

export const ASSET_CLASS_ICONS: Record<AssetKind, string> = {
  Tokens: tokensIconSvg,
  NFTs: nftsIconSvg,
  Commodities: commoditiesIconSvg,
  Currencies: currenciesIconSvg,
};

export const ASSET_CLASS_LOGOS: Record<AssetKind, string> = {
  Tokens: tokensIconArt,
  NFTs: nftsIconArt,
  Commodities: commoditiesIconArt,
  Currencies: currenciesIconArt,
};

export interface SectionVisualProfile {
  hubId: HubId;
  imageUrl: string;
  title: string;
  subtitle: string;
  accentHex: string;
  orbitAngleDeg: number;
  telemetryTag: string;
}

export const HUB_VISUAL_PROFILES: Record<HubId, SectionVisualProfile> = {
  overview: {
    hubId: 'overview',
    imageUrl: GENERATED_SECTION_IMAGES.planetaryHero,
    title: 'Executive Exchange Command',
    subtitle: 'Planetary liquidity telemetry & Sovereign Vault overview',
    accentHex: '#D4B475',
    orbitAngleDeg: 0,
    telemetryTag: 'CORE TELEMETRY',
  },
  'four-token-systems': {
    hubId: 'four-token-systems',
    imageUrl: GENERATED_SECTION_IMAGES.complianceNexus,
    title: '4-Token Systems Monolith',
    subtitle: '22 domain tables across AI Batches, Auth, Assets & Credits',
    accentHex: '#38BDF8',
    orbitAngleDeg: 20,
    telemetryTag: '22 DOMAIN TABLES',
  },
  'token-atlas': {
    hubId: 'token-atlas',
    imageUrl: GENERATED_SECTION_IMAGES.foundryEmblem,
    title: 'Global Token Atlas',
    subtitle: 'Server-sorted & chunk-paginated institutional asset index',
    accentHex: '#D4B475',
    orbitAngleDeg: 40,
    telemetryTag: 'ASSET REGISTRY',
  },
  'token-foundry': {
    hubId: 'token-foundry',
    imageUrl: GENERATED_SECTION_IMAGES.foundryEmblem,
    title: '10,000-Token Batch Foundry',
    subtitle: 'OpenZeppelin Solidity, EVM bytecode, CloudHSM & NFT certificates',
    accentHex: '#F59E0B',
    orbitAngleDeg: 60,
    telemetryTag: 'BATCH 10K ENGINE',
  },
  'asset-vault': {
    hubId: 'asset-vault',
    imageUrl: GENERATED_SECTION_IMAGES.sovereignVault,
    title: 'Sovereign Possession Vault',
    subtitle: '2^256 - 1 unit precision custody · UUID af230af8…e565',
    accentHex: '#D4B475',
    orbitAngleDeg: 80,
    telemetryTag: '2^256 CUSTODY',
  },
  'nft-studio': {
    hubId: 'nft-studio',
    imageUrl: GENERATED_SECTION_IMAGES.foundryEmblem,
    title: 'HashLips 2.0 NFT Studio',
    subtitle: 'Multi-layer rarity compositor & cryptographic PNG export',
    accentHex: '#A78BFA',
    orbitAngleDeg: 100,
    telemetryTag: 'LAYER COMPOSITOR',
  },
  'cmdtx-codex': {
    hubId: 'cmdtx-codex',
    imageUrl: GENERATED_SECTION_IMAGES.sovereignVault,
    title: 'CMDTX & OpenZeppelin Codex',
    subtitle: 'SHA-256 integrity hashing, CIDv1 pinning & EIP-681 QR specs',
    accentHex: '#D4B475',
    orbitAngleDeg: 120,
    telemetryTag: 'IPFS CIDv1 PIN',
  },
  'company-directory': {
    hubId: 'company-directory',
    imageUrl: GENERATED_SECTION_IMAGES.complianceNexus,
    title: 'LEI Institutional Directory',
    subtitle: 'Qualified custodians, issuers & ATS broker-dealer entities',
    accentHex: '#94A3B8',
    orbitAngleDeg: 140,
    telemetryTag: 'LEI VERIFIED',
  },
  'sources-studio': {
    hubId: 'sources-studio',
    imageUrl: GENERATED_SECTION_IMAGES.complianceNexus,
    title: 'Event-Driven ATS Architecture',
    subtitle: 'Matching Engine, Apache Kafka & CloudHSM ECDSA enclave',
    accentHex: '#10B981',
    orbitAngleDeg: 160,
    telemetryTag: 'CLOUDHSM FIPS',
  },
  'project-archive': {
    hubId: 'project-archive',
    imageUrl: GENERATED_SECTION_IMAGES.sovereignVault,
    title: 'Verifiable Workspace Archive',
    subtitle: 'Immutable manifest digests & exportable state snapshots',
    accentHex: '#CBD5E1',
    orbitAngleDeg: 180,
    telemetryTag: 'SNAPSHOT ARCHIVE',
  },
  'portfolio-watchlist': {
    hubId: 'portfolio-watchlist',
    imageUrl: GENERATED_SECTION_IMAGES.sovereignVault,
    title: 'Investor & QIB Portfolio',
    subtitle: 'Rule 506(c) custody rails, Rule 144 lockups & live NAV',
    accentHex: '#10B981',
    orbitAngleDeg: 200,
    telemetryTag: 'RULE 506(C) QIB',
  },
  'market-exchange': {
    hubId: 'market-exchange',
    imageUrl: GENERATED_SECTION_IMAGES.planetaryHero,
    title: 'Institutional Trading Desk',
    subtitle: 'L2/L3 Canvas order book, FIX 4.2/4.4/5.0 & Double-Entry Ledger',
    accentHex: '#06B6D4',
    orbitAngleDeg: 220,
    telemetryTag: 'FIX + L2/L3 BOOK',
  },
  'deploy-registry': {
    hubId: 'deploy-registry',
    imageUrl: GENERATED_SECTION_IMAGES.complianceNexus,
    title: 'Deployment & API Registry',
    subtitle: 'Pre-flight readiness gates & tweRouter contract endpoints',
    accentHex: '#38BDF8',
    orbitAngleDeg: 240,
    telemetryTag: 'READINESS GATES',
  },
  'risk-security': {
    hubId: 'risk-security',
    imageUrl: GENERATED_SECTION_IMAGES.complianceNexus,
    title: 'Security & AMM Risk Lab',
    subtitle: 'ERC-20 0xa9059cbb calldata auditor & constant-product AMM',
    accentHex: '#F43F5E',
    orbitAngleDeg: 260,
    telemetryTag: 'CALLDATA AUDIT',
  },
  'compliance-edgar': {
    hubId: 'compliance-edgar',
    imageUrl: GENERATED_SECTION_IMAGES.complianceNexus,
    title: 'EDGAR & Surveillance Engine',
    subtitle: 'SEC Form ATS-N, FINRA CAT, Rule 17a-4 & wash-trade detection',
    accentHex: '#D4B475',
    orbitAngleDeg: 280,
    telemetryTag: 'SEC ATS-N / CAT',
  },
  'sec-monitor': {
    hubId: 'sec-monitor',
    imageUrl: GENERATED_SECTION_IMAGES.complianceNexus,
    title: 'SEC Monitor & EDGAR Intelligence',
    subtitle: 'Live 10-K/10-Q/8-K watchlist, Risk Heatmap, XBRL trends & RSS alerts',
    accentHex: '#10B981',
    orbitAngleDeg: 290,
    telemetryTag: 'EDGARTOOLS LIVE',
  },
  'chain-connections': {
    hubId: 'chain-connections',
    imageUrl: GENERATED_SECTION_IMAGES.planetaryHero,
    title: 'Multi-Chain EIP-155 Mesh',
    subtitle: 'Ethereum, Base, Arbitrum, Polygon & Solana RPC telemetry',
    accentHex: '#06B6D4',
    orbitAngleDeg: 300,
    telemetryTag: 'MULTI-CHAIN RPC',
  },
  'ai-art-studio': {
    hubId: 'ai-art-studio',
    imageUrl: GENERATED_SECTION_IMAGES.foundryEmblem,
    title: 'AI Emblem & Multimodal Lab',
    subtitle: 'Gemini 4 Hydrogen artwork inspection & OpenZeppelin synthesis',
    accentHex: '#A78BFA',
    orbitAngleDeg: 320,
    telemetryTag: 'MULTIMODAL LAB',
  },
  'planetary-system': {
    hubId: 'planetary-system',
    imageUrl: GENERATED_SECTION_IMAGES.commoditiesNode,
    title: 'Planetary Containment & RWA Mesh',
    subtitle: '3D Earth globe, 46 World Commodities & qAMM v2 delta-hedger',
    accentHex: '#06B6D4',
    orbitAngleDeg: 340,
    telemetryTag: '3D RWA GLOBE',
  },
  'governance-portal': {
    hubId: 'governance-portal',
    imageUrl: GENERATED_SECTION_IMAGES.complianceNexus,
    title: 'TokenGovernanceDAO & Omega RBAC',
    subtitle: 'Weighted 100k-quorum voting, AccessControl roles & Bridge.xyz KYC',
    accentHex: '#D4B475',
    orbitAngleDeg: 348,
    telemetryTag: 'DAO GOVERNANCE',
  },
  'staking-pool': {
    hubId: 'staking-pool',
    imageUrl: GENERATED_SECTION_IMAGES.sovereignVault,
    title: 'TWATS Sovereign Staking Pool',
    subtitle: 'Multi-tier lockup yield & boosted vTWATS governance voting power',
    accentHex: '#10B981',
    orbitAngleDeg: 354,
    telemetryTag: 'STAKING YIELD',
  },
  'token-namer': {
    hubId: 'token-namer',
    imageUrl: GENERATED_SECTION_IMAGES.foundryEmblem,
    title: 'Infinite Horizon Cosmic Nexus',
    subtitle: '10,000 deduplicated branded token names & ERC-20 Solidity blueprints',
    accentHex: '#A78BFA',
    orbitAngleDeg: 358,
    telemetryTag: '10K TOKEN NAMER',
  },
  'cloud-database': {
    hubId: 'cloud-database',
    imageUrl: GENERATED_SECTION_IMAGES.complianceNexus,
    title: 'Persistent Cloud Ledger',
    subtitle: 'Owner-isolated Firestore records for assets, orders, vault & NFT rarity editions',
    accentHex: '#10B981',
    orbitAngleDeg: 10,
    telemetryTag: 'FIRESTORE LIVE',
  },
  'infinite-foundry': {
    hubId: 'infinite-foundry',
    imageUrl: GENERATED_SECTION_IMAGES.foundryEmblem,
    title: 'Infinite Token & NFT Webpage Foundry',
    subtitle: 'O(1) arbitrary-precision BigInt catalog with CREATE2 contract IDs, Solidity & live HTML5 pages',
    accentHex: '#D4B475',
    orbitAngleDeg: 68,
    telemetryTag: 'BIGINT FOUNDRY',
  },
};

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function selectBackdropForItem(params: {
  kind?: string;
  sector?: string;
  code?: string;
  symbol?: string;
}): string {
  const sector = (params.sector || '').toLowerCase();
  const kind = (params.kind || '').toLowerCase();
  const key = (params.code || params.symbol || '').toUpperCase();

  if (sector.includes('energy') || sector.includes('grains') || sector.includes('softs') || sector.includes('livestock')) {
    return GENERATED_SECTION_IMAGES.commoditiesNode;
  }
  if (sector.includes('precious') || kind === 'commodities' || key.includes('XAU') || key.includes('AUR')) {
    return GENERATED_SECTION_IMAGES.sovereignVault;
  }
  if (sector.includes('industrial') || kind === 'currencies') {
    return GENERATED_SECTION_IMAGES.planetaryHero;
  }
  if (kind === 'nfts') {
    return GENERATED_SECTION_IMAGES.foundryEmblem;
  }
  return GENERATED_SECTION_IMAGES.complianceNexus;
}

export function buildItemOrbitalSvgMarkup(params: {
  ticker: string;
  title: string;
  accentHex?: string;
  subtitle?: string;
}): string {
  const ticker = (params.ticker || 'TWE').slice(0, 10);
  const seed = hashString(`${ticker}:${params.title}`);
  const rot1 = seed % 360;
  const rot2 = (seed >>> 5) % 180;
  const accents = ['#D4B475', '#38BDF8', '#10B981', '#A78BFA', '#F59E0B'];
  const accent = params.accentHex || accents[seed % accents.length];
  const nodeAngle = ((seed % 12) * 30 * Math.PI) / 180;
  const nx = (128 + 84 * Math.cos(nodeAngle)).toFixed(1);
  const ny = (128 + 84 * Math.sin(nodeAngle)).toFixed(1);
  const safeTicker = ticker.replace(/[<>&"']/g, '');
  const safeSub = (params.subtitle || 'TWE PLANETARY NODE').slice(0, 22).replace(/[<>&"']/g, '');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <radialGradient id="orb-bg-${seed}" cx="50%" cy="42%" r="65%">
      <stop offset="0%" stop-color="#1A2130" stop-opacity="0.92"/>
      <stop offset="100%" stop-color="#070A0F" stop-opacity="0.96"/>
    </radialGradient>
    <linearGradient id="orb-gold-${seed}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F6E6C2"/>
      <stop offset="50%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="#8A692C"/>
    </linearGradient>
  </defs>
  <circle cx="128" cy="128" r="122" fill="url(#orb-bg-${seed})" stroke="url(#orb-gold-${seed})" stroke-width="2"/>
  <circle cx="128" cy="128" r="98" fill="none" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="4 6" opacity="0.45"/>
  <ellipse cx="128" cy="128" rx="92" ry="34" fill="none" stroke="url(#orb-gold-${seed})" stroke-width="1.5" opacity="0.7" transform="rotate(${rot1} 128 128)"/>
  <ellipse cx="128" cy="128" rx="84" ry="28" fill="none" stroke="#38BDF8" stroke-width="1.2" opacity="0.55" transform="rotate(${rot2 - 45} 128 128)"/>
  <polygon points="128,54 182,128 128,202 74,128" fill="none" stroke="url(#orb-gold-${seed})" stroke-width="1.5" opacity="0.65" transform="rotate(${rot1 % 45} 128 128)"/>
  <circle cx="${nx}" cy="${ny}" r="5.5" fill="${accent}"/>
  <text x="128" y="124" text-anchor="middle" fill="#F1F3F6" font-family="monospace" font-size="22" font-weight="700">${safeTicker}</text>
  <text x="128" y="146" text-anchor="middle" fill="${accent}" font-family="monospace" font-size="9.5" letter-spacing="1">${safeSub}</text>
</svg>`;
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
