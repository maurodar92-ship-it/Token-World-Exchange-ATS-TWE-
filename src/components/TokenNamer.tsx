import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckSquare,
  Code2,
  Copy,
  Download,
  Filter,
  Layers,
  Search,
  Sparkles,
  Square,
} from 'lucide-react';

export type StrategicPillar =
  | 'Cosmic Nexus'
  | 'Quantum Continuum'
  | 'Stellar ATS'
  | 'Infinite Horizon';

export type PrefixFamily =
  | 'Aether'
  | 'Astro'
  | 'Celesti'
  | 'Chrono'
  | 'Cosmo'
  | 'Cyber'
  | 'Eon'
  | 'Ether';

export interface GeneratedBrandedToken {
  index: number;
  contractId: string;
  name: string;
  ticker: string;
  family: PrefixFamily;
  pillar: StrategicPillar;
  platformTag: 'TWE-ATS';
  contractAddress: string;
  category: string;
  launchStage: string;
}

const PREFIX_FAMILIES: PrefixFamily[] = [
  'Aether',
  'Astro',
  'Celesti',
  'Chrono',
  'Cosmo',
  'Cyber',
  'Eon',
  'Ether',
];

const STRATEGIC_PILLARS: StrategicPillar[] = [
  'Cosmic Nexus',
  'Quantum Continuum',
  'Stellar ATS',
  'Infinite Horizon',
];

const PILLAR_CORES: Record<StrategicPillar, string[]> = {
  'Cosmic Nexus': [
    'Nexus',
    'Portal',
    'Grid',
    'Link',
    'Bridge',
    'Arc',
    'Beacon',
    'Orbit',
    'Relay',
    'Gate',
    'Node',
    'Mesh',
    'Conduit',
    'Channel',
    'Vector',
    'Hub',
    'Spire',
    'Axis',
    'Transit',
    'Corridor',
  ],
  'Quantum Continuum': [
    'Quantum',
    'Matrix',
    'Continuum',
    'Prism',
    'Lattice',
    'Pulse',
    'Tensor',
    'Cipher',
    'Flux',
    'Quanta',
    'Helix',
    'Synapse',
    'Logic',
    'Photon',
    'Wave',
    'Field',
    'Phase',
    'Spectrum',
    'Core',
    'Kernel',
  ],
  'Stellar ATS': [
    'ATS',
    'Dex',
    'Exchange',
    'Swap',
    'Protocol',
    'Clearing',
    'Book',
    'Ledger',
    'Venue',
    'Desk',
    'Match',
    'Settle',
    'Route',
    'Rail',
    'Engine',
    'Market',
    'Pool',
    'Trade',
    'Index',
    'Direct',
  ],
  'Infinite Horizon': [
    'Vault',
    'Mint',
    'Horizon',
    'Peak',
    'Flow',
    'Reserve',
    'Treasury',
    'Yield',
    'Apex',
    'Crown',
    'Crest',
    'Zenith',
    'Ascent',
    'Summit',
    'Capital',
    'Trust',
    'Anchor',
    'Sphere',
    'Atlas',
    'Scale',
  ],
};

const MODIFIER_TIERS = [
  '',
  'Prime',
  'Nova',
  'Alpha',
  'Omega',
  'Vanguard',
  'Sovereign',
  'Stellar',
  'Radiant',
  'Meridian',
  'Solstice',
  'Equinox',
  'Polaris',
  'Vortex',
  'Stratos',
  'Helios',
  'Orion',
  'Titan',
  'Hyperion',
  'Andromeda',
  'Nebula',
  'Pulsar',
  'Eclipse',
  'Monarch',
  'Dynasty',
  'Empire',
  'Genesis',
  'Eternal',
  'Infinite',
  'Celestial',
  'Obsidian',
  'Platinum',
  'Aurelia',
  'Emerald',
  'Sapphire',
  'Diamond',
  'Cobalt',
  'Titanium',
  'Kinetic',
  'Harmonic',
  'Cryo',
  'Aero',
  'Terra',
  'Solar',
  'Lunar',
  'Orbital',
  'Galactic',
  'Universal',
  'Omni',
  'Ultra',
  'Apex',
  'Vertex',
  'Citadel',
  'Bastion',
  'Sanctum',
  'Dominion',
  'Aegis',
  'Trident',
  'Pinnacle',
  'Catalyst',
  'Ascension',
  'Sentinel',
  'Frontier',
  'Odyssey',
];

const FLAGSHIP_TIER_1: Array<{
  name: string;
  ticker: string;
  family: PrefixFamily;
  pillar: StrategicPillar;
}> = [
  { name: 'Cosmic Nexus', ticker: 'CNX', family: 'Cosmo', pillar: 'Cosmic Nexus' },
  { name: 'Quantum Continuum', ticker: 'QCN', family: 'Aether', pillar: 'Quantum Continuum' },
  { name: 'Infinite Horizon', ticker: 'IHO', family: 'Eon', pillar: 'Infinite Horizon' },
  { name: 'Stellar ATS', ticker: 'SATS', family: 'Astro', pillar: 'Stellar ATS' },
  { name: 'AetherNexus', ticker: 'ANXS', family: 'Aether', pillar: 'Cosmic Nexus' },
  { name: 'ChronoNexus', ticker: 'CHNX', family: 'Chrono', pillar: 'Cosmic Nexus' },
  { name: 'CosmoVault', ticker: 'CSVT', family: 'Cosmo', pillar: 'Infinite Horizon' },
  { name: 'CyberMatrix', ticker: 'CYMX', family: 'Cyber', pillar: 'Quantum Continuum' },
  { name: 'EonHorizon', ticker: 'EOHZ', family: 'Eon', pillar: 'Infinite Horizon' },
  { name: 'EtherAtlas', ticker: 'ETAT', family: 'Ether', pillar: 'Infinite Horizon' },
];

const BITCOIN_THEMED_PREFIXES = [
  'Aero', 'Aqua', 'Arctic', 'Atlas', 'AuroraPrime', 'Blaze', 'Borealis', 'Canyon', 'Cascade', 'Cipher',
  'Cloud', 'Comet', 'Coral', 'Crimson', 'CrownPrime', 'Dawn', 'Delta', 'Drift', 'Eclipse', 'Echo',
  'Electric', 'Ember', 'EmeraldPrime', 'Equinox', 'Falcon', 'Flame', 'Frost', 'Glacier', 'Halo', 'Harbor',
  'Horizon', 'Ice', 'Indigo', 'Iron', 'Jade', 'Jet', 'Keystone', 'Knight', 'Lagoon', 'Liberty',
  'LightningPrime', 'Maple', 'Meridian', 'Midnight', 'Mirage', 'Monarch', 'Moonlight', 'Mystic', 'NorthStar', 'Obsidian',
  'Olympus', 'Onyx', 'Opal', 'Orbit', 'Pacific', 'Peak', 'Pearl', 'Pegasus', 'Pioneer', 'Polar',
  'Prism', 'Pulse', 'Quartz', 'Quest', 'Radiant', 'Ranger', 'Raven', 'Redwood', 'Ridge', 'Rising',
  'SapphirePrime', 'Sentinel', 'Shadow', 'Skyline', 'Snow', 'Solstice', 'Spark', 'Spirit', 'Spring', 'SummitPrime',
  'Sunstone', 'Sunrise', 'Sunset', 'Tempest', 'TerraPrime', 'ThunderPrime', 'Topaz', 'Torch', 'Trail', 'Triumph',
  'Tropical', 'Twilight', 'Unity', 'Valley', 'Vanguard', 'Velocity', 'Venture', 'Victory', 'Viking', 'Voyager',
  'OmegaGenesis', 'OmegaPrimeX', 'OmegaTitan', 'OmegaQuantum', 'OmegaNexus', 'OmegaGalaxy', 'OmegaInfinityX', 'OmegaTreasury', 'OmegaLegacy', 'OmegaRelic',
  'OmegaAscension', 'OmegaCrown', 'OmegaReserve', 'OmegaVault', 'OmegaUniverse', 'OmegaSupreme', 'OmegaVictory', 'OmegaPinnacle', 'OmegaDiamond', 'OmegaEternal',
];

const REAL_MARKET_TOP_50: Array<[string, string, string, string]> = [
  ['Bitcoin', 'BTC', 'Bitcoin', 'Layer-1'],
  ['Ethereum', 'ETH', 'Ethereum', 'Layer-1'],
  ['Tether', 'USDT', 'Multi-chain', 'Stablecoin'],
  ['BNB', 'BNB', 'BNB Smart Chain', 'Layer-1'],
  ['USDC', 'USDC', 'Multi-chain', 'Stablecoin'],
  ['XRP', 'XRP', 'XRP Ledger', 'Layer-1'],
  ['Solana', 'SOL', 'Solana', 'Layer-1'],
  ['TRON', 'TRX', 'TRON', 'Layer-1'],
  ['Hyperliquid', 'HYPE', 'Hyperliquid', 'DeFi'],
  ['Zcash', 'ZEC', 'Zcash', 'Privacy'],
  ['Monero', 'XMR', 'Monero', 'Privacy'],
  ['Dogecoin', 'DOGE', 'Dogecoin', 'Meme'],
  ['UNUS SED LEO', 'LEO', 'Ethereum', 'Exchange'],
  ['Chainlink', 'LINK', 'Ethereum', 'Oracle'],
  ['Cardano', 'ADA', 'Cardano', 'Layer-1'],
  ['Ethena USDe', 'USDe', 'Ethereum', 'Stablecoin'],
  ['Stellar', 'XLM', 'Stellar', 'Layer-1'],
  ['Bitcoin Cash', 'BCH', 'Bitcoin Cash', 'Layer-1'],
  ['Avalanche', 'AVAX', 'Avalanche', 'Layer-1'],
  ['Sui', 'SUI', 'Sui', 'Layer-1'],
  ['Toncoin', 'TON', 'TON', 'Layer-1'],
  ['Shiba Inu', 'SHIB', 'Ethereum', 'Meme'],
  ['Hedera', 'HBAR', 'Hedera', 'Layer-1'],
  ['Litecoin', 'LTC', 'Litecoin', 'Layer-1'],
  ['Polkadot', 'DOT', 'Polkadot', 'Layer-0'],
  ['Dai', 'DAI', 'Ethereum', 'Stablecoin'],
  ['Bitget Token', 'BGB', 'Ethereum', 'Exchange'],
  ['Uniswap', 'UNI', 'Ethereum', 'DeFi'],
  ['Pepe', 'PEPE', 'Ethereum', 'Meme'],
  ['Aave', 'AAVE', 'Ethereum', 'DeFi'],
  ['NEAR Protocol', 'NEAR', 'NEAR', 'Layer-1'],
  ['Aptos', 'APT', 'Aptos', 'Layer-1'],
  ['Internet Computer', 'ICP', 'Internet Computer', 'Layer-1'],
  ['Ondo', 'ONDO', 'Ethereum', 'RWA'],
  ['Ethereum Classic', 'ETC', 'Ethereum Classic', 'Layer-1'],
  ['Kaspa', 'KAS', 'Kaspa', 'Layer-1'],
  ['Arbitrum', 'ARB', 'Arbitrum', 'Layer-2'],
  ['Optimism', 'OP', 'Optimism', 'Layer-2'],
  ['Polygon', 'POL', 'Polygon', 'Layer-2'],
  ['Render', 'RENDER', 'Solana', 'AI / DePIN'],
  ['Bittensor', 'TAO', 'Bittensor', 'AI / DePIN'],
  ['Fetch.ai ASI', 'FET', 'Ethereum', 'AI / DePIN'],
  ['Maker', 'MKR', 'Ethereum', 'DeFi'],
  ['Lido DAO', 'LDO', 'Ethereum', 'Liquid Staking'],
  ['Injective', 'INJ', 'Injective', 'DeFi'],
  ['Celestia', 'TIA', 'Celestia', 'Modular'],
  ['Stacks', 'STX', 'Bitcoin L2', 'Layer-2'],
  ['Immutable', 'IMX', 'Ethereum', 'Gaming'],
  ['VeChain', 'VET', 'VeChain', 'Enterprise'],
  ['Algorand', 'ALGO', 'Algorand', 'Layer-1'],
];

/**
 * Splits a camelCase or space-delimited token name into normalized word stems
 * and guarantees zero duplicate/repeated words (e.g. prevents "CosmoVaultVault"
 * or "AetherCoreCore" or "EtherLinkLink").
 */
export function hasDuplicateWordConstruction(candidate: string): boolean {
  const tokens = candidate
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[\s\-_]+/)
    .filter(Boolean);

  const seen = new Set<string>();
  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i];
    // Reject exact duplicates or stem repeats (e.g., cosmo/cosmic, celesti/celestial, stellar/astro repeats)
    if (seen.has(word)) return true;
    for (const prev of seen) {
      if (word.length >= 4 && prev.length >= 4 && (word.startsWith(prev) || prev.startsWith(word))) {
        return true;
      }
    }
    seen.add(word);
  }
  return false;
}

function deterministicAddress(seed: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 16777619) >>> 0;
    h2 ^= (c + i * 31) & 0xff;
    h2 = Math.imul(h2, 2246822519) >>> 0;
  }
  const hex =
    h1.toString(16).padStart(8, '0') +
    h2.toString(16).padStart(8, '0') +
    ((h1 ^ (h2 >>> 3)) >>> 0).toString(16).padStart(8, '0') +
    ((Math.imul(h1, 2654435761) ^ h2) >>> 0).toString(16).padStart(8, '0') +
    ((h2 ^ 0xa5a55a5a) >>> 0).toString(16).padStart(8, '0');
  return `0x${hex.slice(0, 40)}`;
}

function deriveTicker(name: string, index: number, usedTickers: Set<string>): string {
  const words = name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  let base =
    words.length >= 3
      ? (words[0].slice(0, 2) + words[1].slice(0, 1) + words[2].slice(0, 2)).toUpperCase()
      : words.length === 2
      ? (words[0].slice(0, 2) + words[1].slice(0, 2)).toUpperCase()
      : words[0].slice(0, 4).toUpperCase();

  base = base.slice(0, 5);
  if (!usedTickers.has(base)) {
    usedTickers.add(base);
    return base;
  }
  const suffix = String((index % 900) + 100);
  const alt = `${base.slice(0, 3)}${suffix}`;
  usedTickers.add(alt);
  return alt;
}

/**
 * Programmatically generates 10,000 unique, deduplicated branded token names
 * following the "Infinite Horizon Cosmic Nexus" naming architecture.
 */
export function generateInfiniteHorizonTokens(totalCount = 10000): GeneratedBrandedToken[] {
  const results: GeneratedBrandedToken[] = [];
  const usedNames = new Set<string>();
  const usedTickers = new Set<string>();

  // Seed Tier-1 Flagship Tokens first
  for (const flag of FLAGSHIP_TIER_1) {
    if (results.length >= totalCount) break;
    if (usedNames.has(flag.name.toLowerCase()) || hasDuplicateWordConstruction(flag.name)) {
      continue;
    }
    const idx = results.length + 1;
    usedNames.add(flag.name.toLowerCase());
    usedTickers.add(flag.ticker);
    const contractId = `UCID-TWE-${String(idx).padStart(6, '0')}`;
    results.push({
      index: idx,
      contractId,
      name: flag.name,
      ticker: flag.ticker,
      family: flag.family,
      pillar: flag.pillar,
      platformTag: 'TWE-ATS',
      contractAddress: deterministicAddress(`${contractId}:${flag.name}`),
      category: 'Tier-1 Flagship',
      launchStage: 'Active ATS Registry',
    });
  }

  // Deterministic rotation across all 4 pillars, 8 prefix families, 20 pillar cores, and 64 modifiers
  // 4 * 8 * 20 * 64 = 40,960 combinations -> plenty of clean non-duplicate candidates for 10,000 unique names
  let modIdx = 0;
  let coreIdx = 0;
  let famIdx = 0;
  let pillarIdx = 0;
  let guard = 0;

  while (results.length < totalCount && guard < totalCount * 6) {
    guard++;
    const pillar = STRATEGIC_PILLARS[pillarIdx % STRATEGIC_PILLARS.length];
    const family = PREFIX_FAMILIES[famIdx % PREFIX_FAMILIES.length];
    const cores = PILLAR_CORES[pillar];
    const core = cores[coreIdx % cores.length];
    const modifier = MODIFIER_TIERS[modIdx % MODIFIER_TIERS.length];

    const candidate = modifier ? `${family}${core} ${modifier}` : `${family}${core}`;
    const normKey = candidate.toLowerCase();

    if (!usedNames.has(normKey) && !hasDuplicateWordConstruction(candidate)) {
      const idx = results.length + 1;
      usedNames.add(normKey);
      const contractId = `UCID-TWE-${String(idx).padStart(6, '0')}`;
      const ticker = deriveTicker(candidate, idx, usedTickers);
      results.push({
        index: idx,
        contractId,
        name: candidate,
        ticker,
        family,
        pillar,
        platformTag: 'TWE-ATS',
        contractAddress: deterministicAddress(`${contractId}:${candidate}`),
        category: modifier ? `${family} Ecosystem` : 'Core Family',
        launchStage: idx <= 1000 ? 'Mainnet Ready' : idx <= 5000 ? 'Smart Contract Verified' : 'Registry Reserved',
      });
    }

    pillarIdx++;
    if (pillarIdx % STRATEGIC_PILLARS.length === 0) {
      famIdx++;
      if (famIdx % PREFIX_FAMILIES.length === 0) {
        coreIdx++;
        if (coreIdx % 20 === 0) {
          modIdx++;
        }
      }
    }
  }

  return results;
}

function generateBitcoinSeries(): GeneratedBrandedToken[] {
  const used = new Set<string>();
  const rows: GeneratedBrandedToken[] = [];
  const tiers = ['', 'Reserve', 'Vault', 'Protocol', 'Network'];

  for (let t = 0; t < tiers.length && rows.length < 600; t++) {
    for (let i = 0; i < BITCOIN_THEMED_PREFIXES.length && rows.length < 600; i++) {
      const base = BITCOIN_THEMED_PREFIXES[i];
      const suffix = tiers[t];
      const candidate = suffix ? `${base} ${suffix} Bitcoin` : `${base}Bitcoin`;
      if (used.has(candidate.toLowerCase()) || hasDuplicateWordConstruction(candidate)) continue;
      used.add(candidate.toLowerCase());
      const idx = rows.length + 1;
      const contractId = `UCID-BTC-${String(idx).padStart(6, '0')}`;
      rows.push({
        index: idx,
        contractId,
        name: candidate,
        ticker: `${base.slice(0, 3).toUpperCase()}B${t > 0 ? t : ''}`,
        family: PREFIX_FAMILIES[idx % PREFIX_FAMILIES.length],
        pillar: STRATEGIC_PILLARS[idx % STRATEGIC_PILLARS.length],
        platformTag: 'TWE-ATS',
        contractAddress: deterministicAddress(`${contractId}:${candidate}`),
        category: idx > 450 ? 'Omega Series' : idx > 300 ? 'Sovereign Series' : 'Bitcoin Inspired',
        launchStage: 'Registry Reserved',
      });
    }
  }
  return rows;
}

function buildSmartContractSnippet(token: GeneratedBrandedToken): string {
  const cleanClass = token.name.replace(/[^A-Za-z0-9]/g, '');
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ${token.name} (${token.ticker})
 * @notice Enterprise Contract ID: ${token.contractId}
 * @dev Theme: Infinite Horizon Cosmic Nexus | Pillar: ${token.pillar} | Family: ${token.family}
 */
contract ${cleanClass}Token is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    string public constant CONTRACT_ID = "${token.contractId}";
    string public constant STRATEGIC_PILLAR = "${token.pillar}";

    constructor(address treasuryAdmin) ERC20("${token.name}", "${token.ticker}") {
        _grantRole(DEFAULT_ADMIN_ROLE, treasuryAdmin);
        _grantRole(MINTER_ROLE, treasuryAdmin);
        _mint(treasuryAdmin, 100_000_000 * 10 ** decimals());
    }
}`;
}

export const TokenNamer: React.FC = () => {
  const [registryMode, setRegistryMode] = useState<'cosmic10k' | 'btc600' | 'market330k'>('cosmic10k');
  const [search, setSearch] = useState('');
  const [selectedPillar, setSelectedPillar] = useState<string>('ALL');
  const [selectedFamily, setSelectedFamily] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copiedBanner, setCopiedBanner] = useState<string | null>(null);
  const [inspectedToken, setInspectedToken] = useState<GeneratedBrandedToken | null>(null);

  const cosmicTokens = useMemo(() => generateInfiniteHorizonTokens(10000), []);
  const btcTokens = useMemo(() => generateBitcoinSeries(), []);

  const marketTopRecords = useMemo<GeneratedBrandedToken[]>(() => {
    return REAL_MARKET_TOP_50.map(([name, ticker, network, category], idx) => {
      const id = `MKT-${String(idx + 1).padStart(6, '0')}`;
      return {
        index: idx + 1,
        contractId: id,
        name,
        ticker,
        family: PREFIX_FAMILIES[idx % PREFIX_FAMILIES.length],
        pillar: STRATEGIC_PILLARS[idx % STRATEGIC_PILLARS.length],
        platformTag: 'TWE-ATS',
        contractAddress: deterministicAddress(`${id}:${name}:${network}`),
        category: `${category} · ${network}`,
        launchStage: 'In-Market (Live)',
      };
    });
  }, []);

  const activeDataset = useMemo(() => {
    if (registryMode === 'btc600') return btcTokens;
    if (registryMode === 'market330k') return marketTopRecords;
    return cosmicTokens;
  }, [registryMode, cosmicTokens, btcTokens, marketTopRecords]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeDataset.filter((item) => {
      if (selectedPillar !== 'ALL' && item.pillar !== selectedPillar) return false;
      if (selectedFamily !== 'ALL' && item.family !== selectedFamily) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.ticker.toLowerCase().includes(q) ||
        item.contractId.toLowerCase().includes(q) ||
        item.contractAddress.toLowerCase().includes(q) ||
        item.pillar.toLowerCase().includes(q)
      );
    });
  }, [activeDataset, search, selectedPillar, selectedFamily]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleSlice = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );

  const allVisibleSelected =
    visibleSlice.length > 0 && visibleSlice.every((item) => selectedIds.has(item.contractId));

  const showCopied = (msg: string) => {
    setCopiedBanner(msg);
    window.setTimeout(() => setCopiedBanner(null), 2400);
  };

  const toggleRow = (contractId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(contractId)) next.delete(contractId);
      else next.add(contractId);
      return next;
    });
  };

  const handleSelectAllPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleSlice.forEach((item) => next.delete(item.contractId));
      } else {
        visibleSlice.forEach((item) => next.add(item.contractId));
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((f) => f.contractId)));
    }
  };

  const handleCopySelected = async (mode: 'full' | 'ids') => {
    const targets =
      selectedIds.size > 0
        ? filtered.filter((f) => selectedIds.has(f.contractId))
        : visibleSlice;
    const text =
      mode === 'ids'
        ? targets.map((t) => `${t.contractId} | ${t.contractAddress}`).join('\n')
        : targets
            .map((t) => `${t.contractId},${t.name},${t.ticker},${t.pillar},${t.contractAddress}`)
            .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      showCopied(
        `Copied ${targets.length.toLocaleString('en-US')} ${
          mode === 'ids' ? 'Enterprise Contract IDs' : 'Token Records'
        } to clipboard.`
      );
    } catch {
      showCopied('Clipboard permission blocked in iframe.');
    }
  };

  const handleCopySingle = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showCopied(`Copied ${label}: ${value}`);
    } catch {
      showCopied('Clipboard unavailable.');
    }
  };

  const handleExportCsv = () => {
    const targets =
      selectedIds.size > 0
        ? filtered.filter((f) => selectedIds.has(f.contractId))
        : filtered;
    const header = 'contract_id,name,ticker,family,pillar,platform_tag,contract_address,category,launch_stage';
    const lines = targets.map(
      (t) =>
        `"${t.contractId}","${t.name}","${t.ticker}","${t.family}","${t.pillar}","${t.platformTag}","${t.contractAddress}","${t.category}","${t.launchStage}"`
    );
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TWE_Infinite_Horizon_${registryMode}_${targets.length}_Tokens.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeInspection = inspectedToken ?? visibleSlice[0] ?? null;

  return (
    <div className="space-y-4">
      {/* Theme Banner & Registry Mode Switcher */}
      <div className="rounded-xl border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-[#A8843E] dark:text-[#D4B475]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Infinite Horizon · Cosmic Nexus Branded Registry</span>
            </div>
            <h2 className="mt-1 font-display text-lg font-semibold text-[var(--twe-text-primary)]">
              Enterprise Token Namer &amp; Smart Contract ID Generator
            </h2>
            <p className="text-xs text-[var(--twe-text-secondary)] mt-0.5">
              Zero duplicate word constructions enforced (prevents e.g. CosmoVaultVault, AetherCoreCore) · Deterministic ERC-20 + AccessControl contract blueprints.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {(
              [
                { id: 'cosmic10k', label: 'Cosmic Nexus (10,000)' },
                { id: 'btc600', label: 'Bitcoin Series (600)' },
                { id: 'market330k', label: 'Top 50 Market / 330k Schema' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setRegistryMode(tab.id);
                  setPage(1);
                  setSelectedIds(new Set());
                }}
                className={`px-3 py-1.5 rounded-md border font-medium transition-colors cursor-pointer ${
                  registryMode === tab.id
                    ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] border-transparent'
                    : 'bg-[var(--twe-bg-elevated)] border-[var(--twe-border)] text-[var(--twe-text-secondary)] hover:border-[#D4B475]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Strategic Pillars Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {STRATEGIC_PILLARS.map((pillar) => {
            const count = activeDataset.filter((d) => d.pillar === pillar).length;
            const active = selectedPillar === pillar;
            return (
              <button
                key={pillar}
                type="button"
                onClick={() => {
                  setSelectedPillar(active ? 'ALL' : pillar);
                  setPage(1);
                }}
                className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                  active
                    ? 'border-[#A8843E] dark:border-[#D4B475] bg-[var(--twe-gold-soft)]'
                    : 'border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] hover:border-[#D4B475]/60'
                }`}
              >
                <div className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">
                  Strategic Pillar
                </div>
                <div className="text-xs font-display font-semibold text-[var(--twe-text-primary)] mt-0.5">
                  {pillar}
                </div>
                <div className="font-mono text-[11px] tabular-nums text-[#A8843E] dark:text-[#D4B475] mt-1">
                  {count.toLocaleString('en-US')} unique tokens
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls Bar: Search, Filters, Select All, Copy, Export */}
      <div className="rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-[var(--twe-text-muted)] absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search token name, ticker, UCID contract ID, or 0x address..."
              className="w-full pl-8 pr-3 py-1.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-xs text-[var(--twe-text-primary)]"
            />
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-[var(--twe-text-muted)]" />
            <select
              value={selectedFamily}
              onChange={(e) => {
                setSelectedFamily(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-xs text-[var(--twe-text-primary)]"
            >
              <option value="ALL">All 8 Prefix Families</option>
              {PREFIX_FAMILIES.map((f) => (
                <option key={f} value={f}>
                  {f} Family
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleSelectAllFiltered}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-primary)] hover:border-[#D4B475] cursor-pointer"
          >
            {selectedIds.size === filtered.length && filtered.length > 0 ? (
              <CheckSquare className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
            ) : (
              <Square className="w-3.5 h-3.5 text-[var(--twe-text-muted)]" />
            )}
            <span>
              {selectedIds.size === filtered.length && filtered.length > 0
                ? 'Clear Selection'
                : `Select All (${filtered.length.toLocaleString('en-US')})`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleCopySelected('ids')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-primary)] hover:border-[#D4B475] cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
            <span>Copy Contract IDs ({selectedIds.size || visibleSlice.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopySelected('full')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-semibold hover:opacity-90 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Selected</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-primary)] hover:border-[#D4B475] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {copiedBanner && (
        <div className="px-4 py-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-xs font-mono text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <Check className="w-3.5 h-3.5" />
          <span>{copiedBanner}</span>
        </div>
      )}

      {/* Main Split: List View + Enterprise Smart Contract Blueprint Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div className="xl:col-span-8 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">
                <tr>
                  <th className="px-3 py-2.5 w-10">
                    <button
                      type="button"
                      onClick={handleSelectAllPage}
                      aria-label="Select all tokens on current page"
                      className="cursor-pointer"
                    >
                      {allVisibleSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-2.5">Enterprise Contract ID</th>
                  <th className="px-3 py-2.5">Token Name</th>
                  <th className="px-3 py-2.5">Ticker</th>
                  <th className="px-3 py-2.5">Pillar / Category</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--twe-border)]">
                {visibleSlice.map((item) => {
                  const checked = selectedIds.has(item.contractId);
                  const isInspected = activeInspection?.contractId === item.contractId;
                  return (
                    <tr
                      key={item.contractId}
                      onClick={() => setInspectedToken(item)}
                      className={`h-10 cursor-pointer transition-colors ${
                        isInspected
                          ? 'bg-[var(--twe-gold-soft)]'
                          : 'hover:bg-[var(--twe-bg-elevated)]'
                      }`}
                    >
                      <td
                        className="px-3 py-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRow(item.contractId);
                        }}
                      >
                        {checked ? (
                          <CheckSquare className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
                        ) : (
                          <Square className="w-4 h-4 text-[var(--twe-text-muted)]" />
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-[#A8843E] dark:text-[#D4B475]">
                        {item.contractId}
                      </td>
                      <td className="px-3 py-2 font-medium text-[var(--twe-text-primary)]">
                        {item.name}
                      </td>
                      <td className="px-3 py-2 font-mono font-semibold text-[var(--twe-text-primary)]">
                        {item.ticker}
                      </td>
                      <td className="px-3 py-2 text-[var(--twe-text-secondary)]">
                        <div>{item.pillar}</div>
                        <div className="text-[10px] font-mono text-[var(--twe-text-muted)]">
                          {item.category}
                        </div>
                      </td>
                      <td
                        className="px-3 py-2 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            handleCopySingle(`${item.contractId} (${item.name} · ${item.contractAddress})`, item.ticker)
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] font-mono text-[10px] text-[var(--twe-text-secondary)] hover:border-[#D4B475] hover:text-[var(--twe-text-primary)] cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-2.5 border-t border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="font-mono text-[var(--twe-text-muted)] tabular-nums">
              Showing {filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–
              {Math.min(filtered.length, safePage * pageSize)} of{' '}
              {filtered.length.toLocaleString('en-US')} unique tokens
            </div>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] font-mono text-[11px]"
              >
                {[10, 25, 50, 100].map((sz) => (
                  <option key={sz} value={sz}>
                    {sz} / page
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-[var(--twe-border)] disabled:opacity-40 cursor-pointer"
              >
                Prev
              </button>
              <span className="font-mono tabular-nums">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-[var(--twe-border)] disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Contract ID & Solidity Smart Contract Inspector */}
        <div className="xl:col-span-4 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] p-4 space-y-3.5">
          {activeInspection ? (
            <>
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-[var(--twe-border)]">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase text-[#A8843E] dark:text-[#D4B475]">
                    <Code2 className="w-3.5 h-3.5" />
                    <span>{activeInspection.contractId}</span>
                  </div>
                  <h3 className="mt-0.5 font-display font-semibold text-base text-[var(--twe-text-primary)]">
                    {activeInspection.name}{' '}
                    <span className="font-mono text-xs text-[var(--twe-text-muted)]">
                      ({activeInspection.ticker})
                    </span>
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/40 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                  0 Duplicates
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="p-2.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
                  <div className="text-[10px] text-[var(--twe-text-muted)] uppercase">
                    Deterministic Contract Address
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--twe-text-primary)] break-all">
                    {activeInspection.contractAddress}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
                    <div className="text-[10px] text-[var(--twe-text-muted)]">Family</div>
                    <div className="text-[var(--twe-text-primary)] font-semibold">
                      {activeInspection.family}
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
                    <div className="text-[10px] text-[var(--twe-text-muted)]">Stage</div>
                    <div className="text-[var(--twe-text-primary)] font-semibold truncate">
                      {activeInspection.launchStage}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[var(--twe-text-muted)] inline-flex items-center gap-1">
                    <Layers className="w-3 h-3" /> ERC-20 + AccessControl Source
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopySingle(buildSmartContractSnippet(activeInspection), `${activeInspection.ticker}.sol`)
                    }
                    className="text-[#A8843E] dark:text-[#D4B475] hover:underline cursor-pointer"
                  >
                    Copy Solidity
                  </button>
                </div>
                <pre className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[10px] text-[var(--twe-text-primary)] overflow-x-auto max-h-72 leading-relaxed">
                  {buildSmartContractSnippet(activeInspection)}
                </pre>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
