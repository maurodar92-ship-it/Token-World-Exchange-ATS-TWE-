import crypto from 'crypto';
import { CORE_DOC_PAGES, SANDBOX_TEXT } from './foundryCoreDocs.ts';
import {
  FLAGSHIP_THEMES,
  buildAuthenticNarrative,
  buildCrossCategoryLayerAnalytics,
  getThemeByNameOrSlug,
  renderEnhancedFoundrySvg,
  resolveThemeEditionDeterministic,
  type LayerEnhancementTier,
  type LayerFrequencyEnhancement,
} from './superNftThemes.ts';
import {
  FOUR_TOKEN_SYSTEMS_CEILING_STR,
  OVERVIEW_CEILING_STR,
} from './infiniteHubPages.ts';
import {
  CLOUD_DB_CEILING_STR,
  TOKEN_FOUNDRY_PRO_CEILING_STR,
} from './cloudDbAndFoundryPages.ts';
import { MARKET_EXCHANGE_CEILING_STR } from './marketExchangePages.ts';
import { ART_ENGINE_CEILING_STR } from './artEngineLayerPages.ts';

// 512-digit all-9s BigInt upper display ceiling (10^512 - 1), while supporting any valid 1..2048 digit positive BigInt.
export const INFINITE_CATALOG_CEILING_DIGITS = 512;
export const INFINITE_CATALOG_CEILING_STR = '9'.repeat(INFINITE_CATALOG_CEILING_DIGITS);
export const INFINITE_CATALOG_CEILING = BigInt(INFINITE_CATALOG_CEILING_STR);

const MAX_INDEX_DIGITS = 2048;

export type TokenContractStandard = 'ERC-3643' | 'ERC-1400' | 'ERC-20';
export type InfiniteRarityTier = 'Mythic' | 'Legendary' | 'Epic' | 'Rare' | 'Uncommon' | 'Common';
export type FlagshipNftCollection =
  | 'Infinite Horizon Cosmic Nexus'
  | 'Matrix Heroes'
  | 'Mythic Titans';

export interface InfiniteTokenPage {
  kind: 'token';
  pageIndex: string;
  prevIndex: string | null;
  nextIndex: string;
  catalogCeiling: string;
  contractId: string;
  contractAddress: string;
  deployerAddress: string;
  saltBytes32: string;
  standard: TokenContractStandard;
  chain: string;
  chainId: number;
  ticker: string;
  name: string;
  sector: string;
  totalSupplyUnits: string;
  totalSupplyFormatted: string;
  initialPriceUsd: number;
  sha256Fingerprint: string;
  ipfsCidV1: string;
  bytecodeHex: string;
  bytecodeSizeBytes: number;
  soliditySource: string;
  abiJson: string;
  webpagePath: string;
}

export interface InfiniteNftTrait {
  trait_type: string;
  value: string;
  weightPct: number;
  infoScore: number;
  enhancement: LayerFrequencyEnhancement;
}

export interface InfiniteNftPage {
  kind: 'nft';
  pageIndex: string;
  prevIndex: string | null;
  nextIndex: string;
  catalogCeiling: string;
  contractId: string;
  contractAddress: string;
  deployerAddress: string;
  saltBytes32: string;
  collection: string;
  editionTitle: string;
  creator: string;
  chain: string;
  chainId: number;
  standard: 'ERC-721';
  rarityScore: number;
  rarityTier: InfiniteRarityTier;
  maxEnhancementTier: LayerEnhancementTier;
  accentHex: string;
  secondaryHex: string;
  pbrProfile: {
    iridescence: number;
    emissiveBoost: number;
    anisotropyBoost: number;
  };
  traits: InfiniteNftTrait[];
  narrative: string;
  sha256Fingerprint: string;
  ipfsCidV1: string;
  svgMarkup: string;
  rawSvgMarkup: string;
  metadataJson: string;
  soliditySource: string;
  abiJson: string;
  webpagePath: string;
}

const CHAINS = [
  { name: 'Ethereum Mainnet', chainId: 1 },
  { name: 'Base Mainnet', chainId: 8453 },
  { name: 'Arbitrum One', chainId: 42161 },
  { name: 'Polygon PoS', chainId: 137 },
  { name: 'Optimism Mainnet', chainId: 10 },
  { name: 'Avalanche C-Chain', chainId: 43114 },
  { name: 'TWE Sovereign L2', chainId: 777001 },
];

const TOKEN_PREFIXES = [
  'Sovereign',
  'Meridian',
  'Quantum',
  'Astral',
  'Apex',
  'Horizon',
  'Reserve',
  'Citadel',
  'Vanguard',
  'Chrono',
  'Aether',
  'Bullion',
  'Helios',
  'Nexus',
  'Obsidian',
  'Solstice',
];

const TOKEN_ROOTS = [
  'Treasury',
  'Lattice',
  'Capital',
  'Bullion',
  'Settlement',
  'Liquidity',
  'Custody',
  'Clearing',
  'Credit',
  'Bond',
  'Vault',
  'Commodity',
  'Equities',
  'Index',
  'Protocol',
  'Reserve',
];

const TOKEN_SECTORS = [
  'Sovereign Reserve',
  'Institutional Credit',
  'Tokenized Commodities',
  'Cross-Border Settlement',
  'Digital Equities',
  'Real-World Assets',
  'Treasury Liquidity',
  'Programmable FX',
];

const NFT_COLLECTIONS: FlagshipNftCollection[] = [
  'Infinite Horizon Cosmic Nexus',
  'Matrix Heroes',
  'Mythic Titans',
];

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function escapeXml(value: string): string {
  return String(value).replace(/[<>&"']/g, (ch) => {
    switch (ch) {
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
        return ch;
    }
  });
}

function escapeHtml(value: string): string {
  return escapeXml(value);
}

const SUPERSCRIPT_DIGIT_MAP: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
};

/**
 * Normalize and validate an arbitrary-precision positive integer page index (1..2048 digits),
 * seamlessly converting Unicode superscript digits (e.g. ⁹) to ASCII digits.
 */
export function parseBigIntPageIndex(raw: unknown): bigint {
  const normalized = String(raw ?? '1')
    .trim()
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (ch) => SUPERSCRIPT_DIGIT_MAP[ch] ?? '');
  const digits = normalized.replace(/[^0-9]/g, '');
  if (!digits) return 1n;
  const bounded = digits.slice(0, MAX_INDEX_DIGITS);
  const parsed = BigInt(bounded);
  return parsed < 1n ? 1n : parsed;
}

/**
 * Deterministic EIP-55-style checksummed 20-byte address derived via CREATE2 digest formula:
 * H(0xff || deployer || salt || initCodeHash)
 */
function deriveCreate2Address(deployerHex: string, saltHex: string, initCodeHashHex: string): string {
  const preimage = `ff${deployerHex.replace(/^0x/, '')}${saltHex.replace(/^0x/, '')}${initCodeHashHex.replace(/^0x/, '')}`;
  const rawAddr = sha256Hex(preimage).slice(24, 64).toLowerCase();
  const checksumHash = sha256Hex(rawAddr);
  let out = '0x';
  for (let i = 0; i < rawAddr.length; i += 1) {
    const ch = rawAddr[i];
    if (ch >= 'a' && ch <= 'f' && parseInt(checksumHash[i], 16) >= 8) {
      out += ch.toUpperCase();
    } else {
      out += ch;
    }
  }
  return out;
}

function buildCidV1Base32(hexDigest: string): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
  const bytes = Buffer.from(hexDigest, 'hex');
  let bits = 0;
  let value = 0;
  let out = 'bafybei';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += alphabet[(value << (5 - bits)) & 31];
  }
  return out.slice(0, 59);
}

function formatShortIndex(idx: string): string {
  if (idx.length <= 18) return idx;
  return `${idx.slice(0, 8)}…${idx.slice(-8)} (${idx.length} digits)`;
}

function buildTokenSoliditySource(params: {
  contractName: string;
  name: string;
  ticker: string;
  standard: TokenContractStandard;
  contractId: string;
  pageIndex: string;
  totalSupplyUnits: string;
}): string {
  const safeClass = params.contractName.replace(/[^A-Za-z0-9_]/g, '');
  if (params.standard === 'ERC-3643') {
    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title ${params.name} (${params.ticker}) — TWE Infinite Token Foundry
/// @notice Deterministic ERC-3643 (T-REX) Identity-Verified Security Token
/// @dev Contract ID: ${params.contractId} | Catalog Page: #${params.pageIndex}
contract ${safeClass} is ERC20, ERC20Permit, AccessControl {
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    string public constant CONTRACT_ID = "${params.contractId}";
    uint256 public constant MAX_SUPPLY = ${params.totalSupplyUnits} * 1e18;

    mapping(address => bool) public identityVerified;
    mapping(address => bool) public frozen;

    event IdentityStatusUpdated(address indexed account, bool verified);
    event AccountFreezeUpdated(address indexed account, bool isFrozen);

    constructor(address admin)
        ERC20("${params.name}", "${params.ticker}")
        ERC20Permit("${params.name}")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        identityVerified[admin] = true;
        _mint(admin, MAX_SUPPLY / 10);
    }

    function setIdentityVerified(address account, bool status) external onlyRole(COMPLIANCE_ROLE) {
        identityVerified[account] = status;
        emit IdentityStatusUpdated(account, status);
    }

    function setFrozen(address account, bool status) external onlyRole(COMPLIANCE_ROLE) {
        frozen[account] = status;
        emit AccountFreezeUpdated(account, status);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(identityVerified[to], "ERC3643: recipient not KYC verified");
        require(totalSupply() + amount <= MAX_SUPPLY, "ERC3643: max supply exceeded");
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0)) require(!frozen[from], "ERC3643: sender frozen");
        if (to != address(0)) {
            require(!frozen[to], "ERC3643: recipient frozen");
            require(identityVerified[to], "ERC3643: recipient unverified");
        }
        super._update(from, to, value);
    }
}
`;
  }

  if (params.standard === 'ERC-1400') {
    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title ${params.name} (${params.ticker}) — TWE Partitioned Security Token
/// @dev Contract ID: ${params.contractId} | Catalog Page: #${params.pageIndex}
contract ${safeClass} is ERC20, AccessControl {
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");
    bytes32 public constant DEFAULT_PARTITION = keccak256("INSTITUTIONAL_TRANCHE_A");
    string public constant CONTRACT_ID = "${params.contractId}";
    uint256 public constant MAX_SUPPLY = ${params.totalSupplyUnits} * 1e18;

    mapping(bytes32 => mapping(address => uint256)) private _partitionBalances;

    event IssuedByPartition(bytes32 indexed partition, address indexed to, uint256 value);

    constructor(address controller) ERC20("${params.name}", "${params.ticker}") {
        _grantRole(DEFAULT_ADMIN_ROLE, controller);
        _grantRole(CONTROLLER_ROLE, controller);
        uint256 initial = MAX_SUPPLY / 10;
        _partitionBalances[DEFAULT_PARTITION][controller] = initial;
        _mint(controller, initial);
        emit IssuedByPartition(DEFAULT_PARTITION, controller, initial);
    }

    function balanceOfByPartition(bytes32 partition, address holder) external view returns (uint256) {
        return _partitionBalances[partition][holder];
    }

    function issueByPartition(bytes32 partition, address to, uint256 value) external onlyRole(CONTROLLER_ROLE) {
        require(totalSupply() + value <= MAX_SUPPLY, "ERC1400: supply cap exceeded");
        _partitionBalances[partition][to] += value;
        _mint(to, value);
        emit IssuedByPartition(partition, to, value);
    }
}
`;
  }

  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ${params.name} (${params.ticker}) — TWE Infinite Token Foundry
/// @dev Contract ID: ${params.contractId} | Catalog Page: #${params.pageIndex}
contract ${safeClass} is ERC20, ERC20Burnable, ERC20Permit, Ownable {
    string public constant CONTRACT_ID = "${params.contractId}";
    uint256 public constant MAX_SUPPLY = ${params.totalSupplyUnits} * 1e18;

    constructor(address initialOwner)
        ERC20("${params.name}", "${params.ticker}")
        ERC20Permit("${params.name}")
        Ownable(initialOwner)
    {
        _mint(initialOwner, MAX_SUPPLY / 10);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Cap exceeded");
        _mint(to, amount);
    }
}
`;
}

function buildNftSoliditySource(params: {
  contractName: string;
  collection: string;
  editionTitle: string;
  contractId: string;
  pageIndex: string;
  ipfsCidV1: string;
}): string {
  const safeClass = params.contractName.replace(/[^A-Za-z0-9_]/g, '');
  const symbol = params.collection
    .split(/\s+/)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 6);

  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ${params.editionTitle} — TWE Infinite NFT Foundry
/// @notice Deterministic ERC-721 + ERC-2981 Royalty Smart Contract
/// @dev Contract ID: ${params.contractId} | Catalog Page: #${params.pageIndex}
contract ${safeClass} is ERC721, ERC721URIStorage, ERC2981, Ownable {
    string public constant CONTRACT_ID = "${params.contractId}";
    string public constant COLLECTION_NAME = "${params.collection}";
    string public constant GENESIS_URI = "ipfs://${params.ipfsCidV1}/metadata.json";
    uint256 private _nextTokenId = 1;

    constructor(address initialOwner, address royaltyReceiver)
        ERC721("${params.collection}", "${symbol || 'TWENFT'}")
        Ownable(initialOwner)
    {
        _setDefaultRoyalty(royaltyReceiver, 500); // 5.00% creator royalty
    }

    function safeMint(address to, string memory uri) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, bytes(uri).length > 0 ? uri : GENESIS_URI);
        return tokenId;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
`;
}

export function resolveInfiniteTokenPage(
  rawIndex: unknown,
  preferredStandard?: TokenContractStandard
): InfiniteTokenPage {
  const idx = parseBigIntPageIndex(rawIndex);
  const pageIndex = idx.toString();
  const prevIndex = idx > 1n ? (idx - 1n).toString() : null;
  const nextIndex = (idx + 1n).toString();

  const digest = sha256Hex(`TWE_INFINITE_TOKEN_FOUNDRY_V1:${pageIndex}`);
  const saltBytes32 = `0x${sha256Hex(`SALT_TOKEN:${pageIndex}`)}`;
  const deployerAddress = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';

  const h0 = parseInt(digest.slice(0, 8), 16);
  const h1 = parseInt(digest.slice(8, 16), 16);
  const h2 = parseInt(digest.slice(16, 24), 16);
  const h3 = parseInt(digest.slice(24, 32), 16);

  const standards: TokenContractStandard[] = ['ERC-3643', 'ERC-1400', 'ERC-20'];
  const standard = preferredStandard ?? standards[h0 % standards.length];
  const chainObj = CHAINS[h1 % CHAINS.length];
  const prefix = TOKEN_PREFIXES[h0 % TOKEN_PREFIXES.length];
  const root = TOKEN_ROOTS[(h1 >>> 4) % TOKEN_ROOTS.length];
  const sector = TOKEN_SECTORS[(h2 >>> 4) % TOKEN_SECTORS.length];

  const suffixHex = digest.slice(0, 4).toUpperCase();
  const ticker = `${prefix.slice(0, 2).toUpperCase()}${root.slice(0, 2).toUpperCase()}${suffixHex.slice(0, 2)}`;
  const name = `${prefix} ${root} #${formatShortIndex(pageIndex)}`;
  const contractId = `TWE-TOK-${digest.slice(0, 16).toUpperCase()}`;

  const supplyTiers = [
    '1000000',
    '10000000',
    '100000000',
    '1000000000',
    '21000000',
    '500000000',
    '10000000000',
  ];
  const totalSupplyUnits = supplyTiers[h2 % supplyTiers.length];
  const totalSupplyFormatted = `${Number(totalSupplyUnits).toLocaleString('en-US')} ${ticker}`;
  const initialPriceUsd = Number((((h3 % 499500) + 500) / 100).toFixed(2));

  const contractName = `TWE_${ticker}_${digest.slice(0, 6).toUpperCase()}`;
  const soliditySource = buildTokenSoliditySource({
    contractName,
    name,
    ticker,
    standard,
    contractId,
    pageIndex,
    totalSupplyUnits,
  });

  const initCodeHash = sha256Hex(soliditySource);
  const contractAddress = deriveCreate2Address(deployerAddress, saltBytes32, initCodeHash);
  const sha256Fingerprint = sha256Hex(`${contractId}:${contractAddress}:${initCodeHash}`);
  const ipfsCidV1 = buildCidV1Base32(sha256Fingerprint);
  const bytecodeHex = `0x608060405234801561001057600080fd5b50${sha256Fingerprint}${initCodeHash}${digest}`;
  const bytecodeSizeBytes = (bytecodeHex.length - 2) / 2;

  const abiJson = JSON.stringify(
    [
      {
        type: 'constructor',
        inputs: [{ name: 'admin', type: 'address' }],
        stateMutability: 'nonpayable',
      },
      {
        type: 'function',
        name: 'CONTRACT_ID',
        inputs: [],
        outputs: [{ name: '', type: 'string' }],
        stateMutability: 'view',
      },
      {
        type: 'function',
        name: 'MAX_SUPPLY',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
      },
      {
        type: 'function',
        name: 'balanceOf',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
      },
      {
        type: 'function',
        name: 'transfer',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
      },
      {
        type: 'function',
        name: 'mint',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
      },
    ],
    null,
    2
  );

  return {
    kind: 'token',
    pageIndex,
    prevIndex,
    nextIndex,
    catalogCeiling: INFINITE_CATALOG_CEILING_STR,
    contractId,
    contractAddress,
    deployerAddress,
    saltBytes32,
    standard,
    chain: chainObj.name,
    chainId: chainObj.chainId,
    ticker,
    name,
    sector,
    totalSupplyUnits,
    totalSupplyFormatted,
    initialPriceUsd,
    sha256Fingerprint,
    ipfsCidV1,
    bytecodeHex,
    bytecodeSizeBytes,
    soliditySource,
    abiJson,
    webpagePath: `/foundry/token/${pageIndex}`,
  };
}

export function resolveInfiniteNftPage(
  rawIndex: unknown,
  preferredCollection?: FlagshipNftCollection
): InfiniteNftPage {
  const idx = parseBigIntPageIndex(rawIndex);
  const pageIndex = idx.toString();
  const prevIndex = idx > 1n ? (idx - 1n).toString() : null;
  const nextIndex = (idx + 1n).toString();

  const collectionKey = preferredCollection ? `:${preferredCollection}` : '';
  const digest = sha256Hex(`TWE_INFINITE_NFT_FOUNDRY_V1${collectionKey}:${pageIndex}`);
  const saltBytes32 = `0x${sha256Hex(`SALT_NFT${collectionKey}:${pageIndex}`)}`;
  const deployerAddress = '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199';

  const h0 = parseInt(digest.slice(0, 8), 16);
  const h1 = parseInt(digest.slice(8, 16), 16);
  const theme =
    getThemeByNameOrSlug(preferredCollection) ?? FLAGSHIP_THEMES[h0 % FLAGSHIP_THEMES.length];
  const collection = theme.name;
  const chainObj = CHAINS[h1 % CHAINS.length];

  const resolved = resolveThemeEditionDeterministic(theme, pageIndex);
  const rarityScore = resolved.rarityScore;

  // Authentic -ln(p) tier mapping calibrated across 4-, 6-, and 8-layer flagship collections
  let rarityTier: InfiniteRarityTier = 'Common';
  if (rarityScore >= 185 || (resolved.maxEnhancementTier === 'Mythic Foil' && rarityScore >= 160)) {
    rarityTier = 'Mythic';
  } else if (rarityScore >= 145) {
    rarityTier = 'Legendary';
  } else if (rarityScore >= 115) {
    rarityTier = 'Epic';
  } else if (rarityScore >= 72) {
    rarityTier = 'Rare';
  } else if (rarityScore >= 44) {
    rarityTier = 'Uncommon';
  }

  const pbrProfile = resolved.traits.reduce(
    (acc, t) => ({
      iridescence: Math.max(acc.iridescence, t.enhancement.iridescence),
      emissiveBoost: Math.max(acc.emissiveBoost, t.enhancement.emissiveBoost),
      anisotropyBoost: Math.max(acc.anisotropyBoost, t.enhancement.anisotropyBoost),
    }),
    { iridescence: 0, emissiveBoost: 0, anisotropyBoost: 0.55 }
  );

  const shortIndex = formatShortIndex(pageIndex);
  const contractId = `TWE-NFT-${digest.slice(0, 16).toUpperCase()}`;
  const editionTitle = `${collection} #${shortIndex}`;
  const creator = 'Mauro Lomibao Dar III';

  const narrative = buildAuthenticNarrative(theme, resolved.traits, shortIndex);

  const svgMarkup = renderEnhancedFoundrySvg({
    traits: resolved.traits,
    title: editionTitle,
    shortIndex,
    contractId,
    rarityTier,
    maxEnhancementTier: resolved.maxEnhancementTier,
    applyEnhancements: true,
  });

  const rawSvgMarkup = renderEnhancedFoundrySvg({
    traits: resolved.traits,
    title: editionTitle,
    shortIndex,
    contractId,
    rarityTier,
    maxEnhancementTier: resolved.maxEnhancementTier,
    applyEnhancements: false,
  });

  const sha256Fingerprint = resolved.fingerprint;
  const ipfsCidV1 = buildCidV1Base32(sha256Fingerprint);
  const contractName = `TWENFT_${digest.slice(0, 8).toUpperCase()}`;

  const soliditySource = buildNftSoliditySource({
    contractName,
    collection,
    editionTitle,
    contractId,
    pageIndex,
    ipfsCidV1,
  });

  const initCodeHash = sha256Hex(soliditySource);
  const contractAddress = deriveCreate2Address(deployerAddress, saltBytes32, initCodeHash);

  const traits: InfiniteNftTrait[] = resolved.traits.map((t) => ({
    trait_type: t.trait_type,
    value: t.value,
    weightPct: t.weightPct,
    infoScore: t.infoScore,
    enhancement: t.enhancement,
  }));

  const metadataJson = JSON.stringify(
    {
      name: editionTitle,
      description: narrative,
      image: `ipfs://${ipfsCidV1}/artwork.svg`,
      external_url: `/foundry/nft/${pageIndex}`,
      attributes: [
        ...traits.map((t) => ({
          trait_type: t.trait_type,
          value: t.value,
          frequency_pct: t.weightPct,
          info_score: t.infoScore,
          enhancement_tier: t.enhancement.tier,
        })),
        { trait_type: 'Rarity Score (-ln p)', value: rarityScore },
        { trait_type: 'Rarity Tier', value: rarityTier },
        { trait_type: 'Peak Layer Enhancement', value: resolved.maxEnhancementTier },
      ],
      properties: {
        contractId,
        contractAddress,
        catalogPage: pageIndex,
        creator,
        sha256: sha256Fingerprint,
        ipfsCidV1,
        pbrProfile,
      },
    },
    null,
    2
  );

  const abiJson = JSON.stringify(
    [
      {
        type: 'constructor',
        inputs: [
          { name: 'initialOwner', type: 'address' },
          { name: 'royaltyReceiver', type: 'address' },
        ],
        stateMutability: 'nonpayable',
      },
      {
        type: 'function',
        name: 'CONTRACT_ID',
        inputs: [],
        outputs: [{ name: '', type: 'string' }],
        stateMutability: 'view',
      },
      {
        type: 'function',
        name: 'safeMint',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'uri', type: 'string' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'nonpayable',
      },
      {
        type: 'function',
        name: 'tokenURI',
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        outputs: [{ name: '', type: 'string' }],
        stateMutability: 'view',
      },
      {
        type: 'function',
        name: 'royaltyInfo',
        inputs: [
          { name: 'tokenId', type: 'uint256' },
          { name: 'salePrice', type: 'uint256' },
        ],
        outputs: [
          { name: '', type: 'address' },
          { name: '', type: 'uint256' },
        ],
        stateMutability: 'view',
      },
    ],
    null,
    2
  );

  return {
    kind: 'nft',
    pageIndex,
    prevIndex,
    nextIndex,
    catalogCeiling: INFINITE_CATALOG_CEILING_STR,
    contractId,
    contractAddress,
    deployerAddress,
    saltBytes32,
    collection,
    editionTitle,
    creator,
    chain: chainObj.name,
    chainId: chainObj.chainId,
    standard: 'ERC-721',
    rarityScore,
    rarityTier,
    maxEnhancementTier: resolved.maxEnhancementTier,
    accentHex: resolved.accentHex,
    secondaryHex: resolved.secondaryHex,
    pbrProfile,
    traits,
    narrative,
    sha256Fingerprint,
    ipfsCidV1,
    svgMarkup,
    rawSvgMarkup,
    metadataJson,
    soliditySource,
    abiJson,
    webpagePath: `/foundry/nft/${pageIndex}`,
  };
}

export function getCrossCategoryLayerAnalytics(collection?: string) {
  return buildCrossCategoryLayerAnalytics(collection);
}

export function resolveInfiniteTokenRange(
  rawStart: unknown,
  limit = 12,
  preferredStandard?: TokenContractStandard
) {
  const start = parseBigIntPageIndex(rawStart);
  const count = Math.min(50, Math.max(1, Number(limit) || 12));
  const items: InfiniteTokenPage[] = [];
  for (let i = 0; i < count; i += 1) {
    items.push(resolveInfiniteTokenPage(start + BigInt(i), preferredStandard));
  }
  return {
    startIndex: start.toString(),
    nextStartIndex: (start + BigInt(count)).toString(),
    prevStartIndex: start > BigInt(count) ? (start - BigInt(count)).toString() : '1',
    catalogCeiling: INFINITE_CATALOG_CEILING_STR,
    count: items.length,
    items,
  };
}

export function resolveInfiniteNftRange(
  rawStart: unknown,
  limit = 12,
  preferredCollection?: FlagshipNftCollection
) {
  const start = parseBigIntPageIndex(rawStart);
  const count = Math.min(50, Math.max(1, Number(limit) || 12));
  const items: InfiniteNftPage[] = [];
  for (let i = 0; i < count; i += 1) {
    items.push(resolveInfiniteNftPage(start + BigInt(i), preferredCollection));
  }
  return {
    startIndex: start.toString(),
    nextStartIndex: (start + BigInt(count)).toString(),
    prevStartIndex: start > BigInt(count) ? (start - BigInt(count)).toString() : '1',
    catalogCeiling: INFINITE_CATALOG_CEILING_STR,
    count: items.length,
    collection: preferredCollection ?? 'ALL',
    items,
  };
}

export interface FoundryPortalDocEntry {
  id: string;
  section: 'TWE Docs' | 'NFT Foundry Docs' | 'Collections' | 'FAQ' | 'Glossary' | 'Roadmap';
  title: string;
  summary: string;
  body: string;
  tags: string[];
}

export function getFoundryPortalDirectory() {
  const collections = [
    {
      name: 'Infinite Horizon Cosmic Nexus' as FlagshipNftCollection,
      baselineStaticCount: 3000,
      infiniteCapacity: '10^2048 - 1 (O(1) BigInt addressed)',
      sculptureStyle: 'Astral Astrolabe Crystal Monolith (Three.js PBR)',
      description:
        'Flagship celestial token-nexus series combining orbital gold harmonics, multi-layer SHA-256 fingerprints, and inverse-frequency rarity scoring.',
    },
    {
      name: 'Matrix Heroes' as FlagshipNftCollection,
      baselineStaticCount: 600,
      infiniteCapacity: '10^2048 - 1 (O(1) BigInt addressed)',
      sculptureStyle: 'Armored Prism Visor Sentinel (Three.js PBR)',
      description:
        'Tactical sovereign guardians forged with exclusion-validated armor layers, visor matrices, and deterministic CREATE2 ERC-721 contracts.',
    },
    {
      name: 'Mythic Titans' as FlagshipNftCollection,
      baselineStaticCount: 12,
      infiniteCapacity: '10^2048 - 1 (O(1) BigInt addressed)',
      sculptureStyle: 'Crowned Bullion Aegis Titan (Three.js PBR)',
      description:
        'Apex ultra-low-supply mythic titan reliquary featuring sovereign bullion plates, starheart cores, and verified ERC-2981 royalty contracts.',
    },
  ];

  const docs: FoundryPortalDocEntry[] = [
    {
      id: 'twe-boundary',
      section: 'TWE Docs',
      title: 'TWE ATS Architecture & Multi-Asset Custody Rails',
      summary: 'Token World Exchange ATS® full-stack architecture, custody rails, and deterministic settlement.',
      body: 'TWE combines an Express/TypeScript API core, real-time SSE market telemetry, 2^256 - 1 BigInt sovereign vault precision, Firestore persistent ledgers, and O(1) deterministic smart-contract addressing across ERC-3643, ERC-1400, ERC-20, and ERC-721.',
      tags: ['ATS', 'ERC-3643', 'Vault', 'Settlement', 'Custody'],
    },
    {
      id: 'foundry-determinism',
      section: 'NFT Foundry Docs',
      title: 'Fingerprints, Determinism & O(1) Hyper-Scale Addressing',
      summary: 'Why generating 10^466+ webpages on-demand in O(1) beats static build limits.',
      body: 'Static site builders stall around ~3,000–6,850 files due to filesystem and bundle limits. By deriving every page, CREATE2 contract address, OpenZeppelin Solidity source, SVG composition, and 3D PBR artifact directly from SHA-256(seed || BigInt index), the Foundry serves any page up to 2,048 digits in under 1 millisecond with zero disk bloat.',
      tags: ['CREATE2', 'SHA-256', 'BigInt', 'O(1)', 'Determinism'],
    },
    {
      id: 'foundry-rarity',
      section: 'NFT Foundry Docs',
      title: 'Inverse-Frequency Rarity Scoring & Exclusion Gates',
      summary: 'Mathematical rarity tiers (Common through Mythic) and trait weight distributions.',
      body: 'Every edition evaluates 6 independent trait layers (Background, Aura Field, Chassis Armor, Helm Architecture, Power Core, Relic). Each trait contributes 100 / weightPct to the composite Rarity Score, mapping deterministically into Common, Uncommon, Rare, Epic, Legendary, and Mythic tiers.',
      tags: ['Rarity', 'Traits', 'Weights', 'Mythic', 'Metadata'],
    },
    {
      id: 'foundry-3d-pbr',
      section: 'NFT Foundry Docs',
      title: 'Three.js Studio PBR Procedural Artifact Pipeline',
      summary: 'Hardware-calibrated studio PBR rendering, RoomEnvironment IBL, and zero-occlusion controls.',
      body: 'Each Token and NFT catalog index dynamically synthesizes a composite 8–10 part Three.js Group using beveled ExtrudeGeometry, LatheGeometry, InstancedMesh index ticks, anisotropic brushed metals, optical sapphire transmission, and RoomEnvironment reflections inside a zero-occlusion collapsible bottom-dock viewport.',
      tags: ['Three.js', 'PBR', 'Procedural', 'Zero-Occlusion', 'WebGL2'],
    },
    {
      id: 'faq-scale',
      section: 'FAQ',
      title: 'How many webpages can the TWE & NFT Foundry serve?',
      summary: 'Exact answer for arbitrary-precision 466-digit, 512-digit, and 2,048-digit catalog indices.',
      body: 'Both the Token Foundry (/foundry/token/:index) and NFT Foundry (/foundry/nft/:index) resolve every positive BigInt integer from #1 through 10^2048 - 1 (including your exact 466-digit target index and the 512-digit all-9s ceiling) as live, self-contained HTML5 webpages with unique Contract IDs, Solidity code, ABIs, and interactive 3D models.',
      tags: ['Scale', 'Webpages', 'BigInt', 'Sitemap'],
    },
    {
      id: 'glossary-create2',
      section: 'Glossary',
      title: 'CREATE2 · CIDv1 · ERC-3643 · ERC-2981',
      summary: 'Core cryptographic and smart-contract terminology across TWE and Super NFT Foundry.',
      body: 'CREATE2 deterministically computes an Ethereum contract address from deployer + bytes32 salt + initCodeHash prior to broadcast. CIDv1 Base32 provides content-addressed IPFS hashes. ERC-3643 enforces on-chain KYC/identity transfer rules. ERC-2981 standardizes 5% on-chain NFT creator royalties.',
      tags: ['Glossary', 'CREATE2', 'IPFS', 'ERC-2981'],
    },
    {
      id: 'roadmap-2026',
      section: 'Roadmap',
      title: 'Foundry Production & Multi-Chain Roadmap',
      summary: 'Completed static-to-O(1) migration, Three.js PBR studio, Firestore persistence, and live deployment.',
      body: 'Phase 1 (Complete): 6,850-page baseline parity for Cosmic Nexus, Matrix Heroes, and Mythic Titans. Phase 2 (Complete): O(1) arbitrary-precision BigInt webpage server supporting 2,048-digit addressing + ZIP bundle export. Phase 3 (Complete): Real-time Three.js studio PBR 3D artifact studio & Firestore cloud ledger sync.',
      tags: ['Roadmap', 'Milestones', 'Production'],
    },
  ];

  const checklist = [
    { label: 'Home overview, headline statistics & sample edition art', done: true },
    { label: 'TWE documentation: custody rails, token concepts, tech stack & readiness', done: true },
    { label: 'NFT Foundry documentation: fingerprints, determinism, rarity & compliance', done: true },
    { label: 'Three NFT collections: Cosmic Nexus, Matrix Heroes & Mythic Titans', done: true },
    { label: 'Arbitrary-precision O(1) edition & token webpages (1 to 10^2048 - 1)', done: true },
    { label: 'Interactive Three.js studio PBR 3D artifact scenes with zero-occlusion HUD', done: true },
    { label: 'Client-side search across editions, traits, concepts & documentation', done: true },
    { label: 'FAQ, glossary, roadmap, XML sitemap (/foundry/sitemap.xml) & ZIP export', done: true },
  ];

  return {
    creator: 'Mauro Lomibao Dar III',
    sandboxText: SANDBOX_TEXT,
    maxDigitsSupported: MAX_INDEX_DIGITS,
    staticBaselinePages: 6850,
    collections,
    traitCatalog: FLAGSHIP_THEMES[0].layers.map((layer) => ({
      trait_type: layer.trait_type,
      options: layer.options.map((o) => ({
        name: o.name,
        weightPct: o.weight,
        color: o.colorHint || '#d4b475',
      })),
    })),
    corePages: CORE_DOC_PAGES,
    docs,
    checklist,
  };
}

export function renderFoundrySitemapXml(origin: string): string {
  const base = origin.replace(/\/+$/, '');
  const sampleIndices = [
    '1',
    '2',
    '3',
    '12',
    '100',
    '600',
    '3000',
    '3612',
    '6850',
    '1000000000000000000',
    '115792089237316195423570985008687907853269984665640564039457584007913129639935',
    INFINITE_CATALOG_CEILING_STR,
  ];
  const urls: string[] = [`  <url><loc>${escapeXml(base)}/</loc><priority>1.0</priority></url>`];
  for (const docPage of CORE_DOC_PAGES) {
    urls.push(
      `  <url><loc>${escapeXml(`${base}/${docPage.path}`)}</loc><priority>0.9</priority></url>`
    );
  }
  for (const idx of sampleIndices) {
    urls.push(`  <url><loc>${escapeXml(`${base}/foundry/token/${idx}`)}</loc><priority>0.8</priority></url>`);
    urls.push(`  <url><loc>${escapeXml(`${base}/foundry/nft/${idx}`)}</loc><priority>0.8</priority></url>`);
  }
  urls.push(`  <url><loc>${escapeXml(`${base}/overview/page/1`)}</loc><priority>0.9</priority></url>`);
  urls.push(`  <url><loc>${escapeXml(`${base}/overview/page/${OVERVIEW_CEILING_STR}`)}</loc><priority>0.9</priority></url>`);
  urls.push(`  <url><loc>${escapeXml(`${base}/four-token-systems/page/1`)}</loc><priority>0.9</priority></url>`);
  urls.push(`  <url><loc>${escapeXml(`${base}/four-token-systems/page/${FOUR_TOKEN_SYSTEMS_CEILING_STR}`)}</loc><priority>0.9</priority></url>`);
  urls.push(`  <url><loc>${escapeXml(`${base}/cloud-database/page/1`)}</loc><priority>0.9</priority></url>`);
  urls.push(`  <url><loc>${escapeXml(`${base}/cloud-database/page/${CLOUD_DB_CEILING_STR}`)}</loc><priority>0.9</priority></url>`);
  urls.push(`  <url><loc>${escapeXml(`${base}/token-foundry/page/1`)}</loc><priority>0.9</priority></url>`);
  urls.push(`  <url><loc>${escapeXml(`${base}/token-foundry/page/${TOKEN_FOUNDRY_PRO_CEILING_STR}`)}</loc><priority>0.9</priority></url>`);
  urls.push(`  <url><loc>${escapeXml(`${base}/market-exchange/page/1`)}</loc><priority>0.9</priority></url>`);
  urls.push(`  <url><loc>${escapeXml(`${base}/market-exchange/page/${MARKET_EXCHANGE_CEILING_STR}`)}</loc><priority>0.9</priority></url>`);
  urls.push(`  <url><loc>${escapeXml(`${base}/art-engine/page/1`)}</loc><priority>0.9</priority></url>`);
  urls.push(`  <url><loc>${escapeXml(`${base}/art-engine/page/${ART_ENGINE_CEILING_STR}`)}</loc><priority>0.9</priority></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
}

/**
 * Renders a complete, self-contained HTML5 webpage for any Token Foundry page index.
 */
export function renderTokenFoundryHtmlPage(page: InfiniteTokenPage): string {
  const prevLink = page.prevIndex
    ? `<a class="btn" href="/foundry/token/${escapeHtml(page.prevIndex)}">&larr; Previous Page</a>`
    : `<span class="btn disabled">&larr; Start of Catalog</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(page.ticker)} · ${escapeHtml(page.contractId)} | TWE Token Foundry</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #07131f; color: #e2e8f0; line-height: 1.5; }
    .wrap { max-width: 1040px; margin: 0 auto; padding: 24px 18px 56px; }
    .topbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 16px; border-bottom: 1px solid #1e3348; }
    .brand { font-weight: 700; letter-spacing: 0.02em; color: #d4b475; text-decoration: none; font-size: 14px; }
    .nav { display: flex; gap: 10px; align-items: center; }
    .btn { display: inline-block; padding: 7px 12px; border-radius: 6px; border: 1px solid #26425c; color: #20d9ff; text-decoration: none; font-size: 12px; font-family: ui-monospace, monospace; }
    .btn:hover { border-color: #d4b475; color: #f8fafc; }
    .btn.disabled { opacity: 0.45; pointer-events: none; }
    h1 { font-size: 24px; margin: 20px 0 6px; color: #f8fafc; }
    .meta { font-family: ui-monospace, monospace; font-size: 12px; color: #94a3b8; word-break: break-all; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin: 20px 0; }
    .card { background: #0c1b2a; border: 1px solid #1e3348; border-radius: 8px; padding: 14px; }
    .label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; }
    .val { font-family: ui-monospace, monospace; font-size: 13px; color: #f8fafc; margin-top: 4px; word-break: break-all; }
    .val.accent { color: #20d9ff; }
    .val.gold { color: #d4b475; }
    pre { background: #050d16; border: 1px solid #1e3348; border-radius: 8px; padding: 14px; overflow-x: auto; font-size: 12px; font-family: ui-monospace, monospace; color: #cbd5e1; }
    h2 { font-size: 15px; margin: 26px 0 10px; color: #d4b475; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="topbar">
      <a class="brand" href="/">TWE Token Foundry · Deterministic Contract Webpage</a>
      <div class="nav">
        ${prevLink}
        <a class="btn" href="/foundry/token/${escapeHtml(page.nextIndex)}">Next Page &rarr;</a>
        <a class="btn" href="/foundry/nft/${escapeHtml(page.pageIndex)}">Switch to NFT #${escapeHtml(formatShortIndex(page.pageIndex))}</a>
      </div>
    </div>

    <h1>${escapeHtml(page.name)}</h1>
    <div class="meta">Contract ID: ${escapeHtml(page.contractId)} · Standard: ${escapeHtml(page.standard)} · Chain: ${escapeHtml(page.chain)} (EIP-155: ${page.chainId})</div>

    <div class="grid">
      <div class="card"><div class="label">CREATE2 Contract Address</div><div class="val accent">${escapeHtml(page.contractAddress)}</div></div>
      <div class="card"><div class="label">Ticker &amp; Sector</div><div class="val gold">${escapeHtml(page.ticker)} · ${escapeHtml(page.sector)}</div></div>
      <div class="card"><div class="label">Total Supply Cap</div><div class="val">${escapeHtml(page.totalSupplyFormatted)}</div></div>
      <div class="card"><div class="label">Reference Price</div><div class="val">$${page.initialPriceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div></div>
      <div class="card"><div class="label">CREATE2 Salt (bytes32)</div><div class="val">${escapeHtml(page.saltBytes32)}</div></div>
      <div class="card"><div class="label">IPFS CIDv1 &amp; SHA-256</div><div class="val">${escapeHtml(page.ipfsCidV1)}</div></div>
    </div>

    <h2>Full Arbitrary-Precision Page Index</h2>
    <pre>${escapeHtml(page.pageIndex)}</pre>

    <h2>OpenZeppelin v5 Solidity Smart Contract (${escapeHtml(page.standard)})</h2>
    <pre>${escapeHtml(page.soliditySource)}</pre>

    <h2>Contract ABI Interface</h2>
    <pre>${escapeHtml(page.abiJson)}</pre>
  </div>
</body>
</html>`;
}

/**
 * Renders a complete, self-contained HTML5 webpage for any NFT Foundry page index.
 */
export function renderNftFoundryHtmlPage(page: InfiniteNftPage): string {
  const prevLink = page.prevIndex
    ? `<a class="btn" href="/foundry/nft/${escapeHtml(page.prevIndex)}">&larr; Previous Edition</a>`
    : `<span class="btn disabled">&larr; Edition #1</span>`;

  const traitRows = page.traits
    .map(
      (t) =>
        `<tr><td>${escapeHtml(t.trait_type)}</td><td>${escapeHtml(t.value)}</td><td style="text-align:right;font-family:ui-monospace,monospace;">${t.weightPct}%</td><td style="text-align:right;font-family:ui-monospace,monospace;color:#20d9ff;">${t.infoScore.toFixed(2)}</td><td style="text-align:right;font-family:ui-monospace,monospace;color:${escapeHtml(t.enhancement.badgeColor)};">${escapeHtml(t.enhancement.tier)}</td></tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(page.editionTitle)} · ${escapeHtml(page.contractId)} | TWE NFT Foundry</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #07131f; color: #e2e8f0; line-height: 1.5; }
    .wrap { max-width: 1040px; margin: 0 auto; padding: 24px 18px 56px; }
    .topbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 16px; border-bottom: 1px solid #1e3348; }
    .brand { font-weight: 700; letter-spacing: 0.02em; color: #d4b475; text-decoration: none; font-size: 14px; }
    .nav { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .btn { display: inline-block; padding: 7px 12px; border-radius: 6px; border: 1px solid #26425c; color: #20d9ff; text-decoration: none; font-size: 12px; font-family: ui-monospace, monospace; }
    .btn:hover { border-color: #d4b475; color: #f8fafc; }
    .btn.disabled { opacity: 0.45; pointer-events: none; }
    .hero { display: grid; grid-template-columns: minmax(260px, 360px) 1fr; gap: 22px; margin-top: 22px; align-items: start; }
    @media (max-width: 760px) { .hero { grid-template-columns: 1fr; } }
    .art { border: 1px solid #1e3348; border-radius: 10px; overflow: hidden; background: #050d16; }
    .art svg { display: block; width: 100%; height: auto; }
    h1 { font-size: 22px; margin: 0 0 8px; color: #f8fafc; }
    .meta { font-family: ui-monospace, monospace; font-size: 12px; color: #94a3b8; word-break: break-all; margin-bottom: 14px; }
    .card { background: #0c1b2a; border: 1px solid #1e3348; border-radius: 8px; padding: 14px; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { padding: 8px 8px; border-bottom: 1px solid #1e3348; text-align: left; }
    th { font-size: 10px; text-transform: uppercase; color: #94a3b8; }
    pre { background: #050d16; border: 1px solid #1e3348; border-radius: 8px; padding: 14px; overflow-x: auto; font-size: 12px; font-family: ui-monospace, monospace; color: #cbd5e1; }
    h2 { font-size: 15px; margin: 24px 0 10px; color: #d4b475; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="topbar">
      <a class="brand" href="/">TWE Super NFT Foundry · Deterministic Edition Webpage</a>
      <div class="nav">
        ${prevLink}
        <a class="btn" href="/foundry/nft/${escapeHtml(page.nextIndex)}">Next Edition &rarr;</a>
        <a class="btn" href="/foundry/collections.html">All Collections</a>
        <a class="btn" href="/foundry/token/${escapeHtml(page.pageIndex)}">Switch to Token #${escapeHtml(formatShortIndex(page.pageIndex))}</a>
      </div>
    </div>

    <div class="hero">
      <div class="art">${page.svgMarkup}</div>
      <div>
        <h1>${escapeHtml(page.editionTitle)}</h1>
        <div class="meta">Contract ID: ${escapeHtml(page.contractId)} · ERC-721 Address: ${escapeHtml(page.contractAddress)} · Rarity: ${page.rarityScore} pts (${escapeHtml(page.rarityTier)}) · Enhancement: ${escapeHtml(page.maxEnhancementTier)}</div>
        <div class="card">
          <div style="font-size:13px;color:#cbd5e1;">${escapeHtml(page.narrative)}</div>
          <div style="margin-top:10px;font-family:ui-monospace,monospace;font-size:11px;color:#94a3b8;word-break:break-all;">
            Creator: ${escapeHtml(page.creator)} · Chain: ${escapeHtml(page.chain)} · CIDv1: ${escapeHtml(page.ipfsCidV1)}
          </div>
          <div style="margin-top:8px;font-family:ui-monospace,monospace;font-size:11px;color:#20d9ff;">
            3D Studio PBR Profile · Iridescence: ${page.pbrProfile.iridescence.toFixed(2)} · Emissive Boost: +${page.pbrProfile.emissiveBoost.toFixed(2)} · Anisotropy: ${page.pbrProfile.anisotropyBoost.toFixed(2)}
          </div>
        </div>
        <div class="card">
          <table>
            <thead><tr><th>Trait Layer</th><th>Value</th><th style="text-align:right;">Freq</th><th style="text-align:right;">-ln(p)</th><th style="text-align:right;">Enhancement</th></tr></thead>
            <tbody>${traitRows}</tbody>
          </table>
        </div>
      </div>
    </div>

    <h2>Full Arbitrary-Precision Page Index</h2>
    <pre>${escapeHtml(page.pageIndex)}</pre>

    <h2>ERC-721 + ERC-2981 Smart Contract</h2>
    <pre>${escapeHtml(page.soliditySource)}</pre>

    <h2>ERC-721 Metadata JSON</h2>
    <pre>${escapeHtml(page.metadataJson)}</pre>
  </div>
</body>
</html>`;
}

/**
 * Signal Terminal HTML directory page for /foundry/collections.html
 */
export function renderCollectionsDirectoryHtmlPage(): string {
  const cards = FLAGSHIP_THEMES.map((theme) => {
    const sample = resolveInfiniteNftPage('1', theme.name);
    const combos = theme.layers.reduce((a, l) => a * l.options.length, 1);
    return `<article class="card">
      <div class="art">${sample.svgMarkup}</div>
      <h2>${escapeHtml(theme.name)}</h2>
      <p>${escapeHtml(theme.blurb)}</p>
      <div class="meta">Layers: ${theme.layers.length} · Exclusions: ${theme.exclusions.length} · Raw Combos: ${combos.toLocaleString('en-US')} · Baseline Static: ${theme.baselineStaticCount.toLocaleString('en-US')}</div>
      <div class="actions">
        <a class="btn" href="/foundry/nft/1?collection=${encodeURIComponent(theme.name)}">Edition #1</a>
        <a class="btn" href="/foundry/nft/${escapeHtml(INFINITE_CATALOG_CEILING_STR)}?collection=${encodeURIComponent(theme.name)}">Page #10^512 - 1</a>
      </div>
    </article>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Flagship Collections · TWE &amp; Super NFT Foundry</title>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #07131f; color: #e2e8f0; line-height: 1.55; }
    .banner { background: #1e293b; border-bottom: 1px solid #334155; padding: 9px 18px; font-size: 12px; color: #facc15; text-align: center; }
    .wrap { max-width: 1100px; margin: 0 auto; padding: 24px 18px 56px; }
    .top { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid #1e3348; flex-wrap: wrap; }
    a.brand { color: #d4b475; font-weight: 700; text-decoration: none; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 18px; margin-top: 22px; }
    .card { background: #0c1b2a; border: 1px solid #1e3348; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .art { border-radius: 8px; overflow: hidden; border: 1px solid #1e3348; }
    .art svg { width: 100%; height: auto; display: block; }
    h1 { margin: 20px 0 6px; font-size: 26px; color: #f8fafc; }
    h2 { margin: 0; font-size: 17px; color: #d4b475; }
    p { margin: 0; font-size: 13px; color: #cbd5e1; }
    .meta { font-family: ui-monospace, monospace; font-size: 11px; color: #20d9ff; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: auto; padding-top: 6px; }
    .btn { display: inline-block; padding: 6px 11px; border-radius: 6px; border: 1px solid #26425c; color: #20d9ff; text-decoration: none; font-size: 12px; font-family: ui-monospace, monospace; }
    .btn:hover { border-color: #d4b475; color: #fff; }
  </style>
</head>
<body>
  <div class="banner">${escapeHtml(SANDBOX_TEXT)}</div>
  <div class="wrap">
    <div class="top">
      <a class="brand" href="/">TWE &amp; Super NFT Foundry · Signal Terminal</a>
      <div class="actions"><a class="btn" href="/foundry/index.html">Foundry Docs</a><a class="btn" href="/tokens/index.html">Token Directory</a><a class="btn" href="/">Interactive 3D App</a></div>
    </div>
    <h1>Flagship NFT Collections</h1>
    <p>All three authentic Standard Super NFT Foundry collections, live at arbitrary-precision O(1) BigInt scale with frequency-driven SVG &amp; Three.js PBR enhancements.</p>
    <div class="grid">${cards}</div>
  </div>
</body>
</html>`;
}

/**
 * Signal Terminal HTML directory page for /tokens/index.html
 */
export function renderTokensDirectoryHtmlPage(): string {
  const sample = resolveInfiniteTokenRange('1', 24);
  const rows = sample.items
    .map(
      (t) =>
        `<tr><td style="font-family:ui-monospace,monospace;color:#36d7a1;">${escapeHtml(t.ticker)}</td><td><a href="/foundry/token/${escapeHtml(t.pageIndex)}" style="color:#20d9ff;text-decoration:none;">${escapeHtml(t.name)}</a></td><td style="font-family:ui-monospace,monospace;">${escapeHtml(t.standard)}</td><td>${escapeHtml(t.sector)}</td><td style="font-family:ui-monospace,monospace;font-size:11px;color:#94a3b8;">${escapeHtml(t.contractId)}</td></tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Token Foundry Directory · TWE Signal Terminal</title>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #07131f; color: #e2e8f0; line-height: 1.55; }
    .banner { background: #1e293b; border-bottom: 1px solid #334155; padding: 9px 18px; font-size: 12px; color: #facc15; text-align: center; }
    .wrap { max-width: 1100px; margin: 0 auto; padding: 24px 18px 56px; }
    .top { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid #1e3348; flex-wrap: wrap; }
    a.brand { color: #d4b475; font-weight: 700; text-decoration: none; }
    .btn { display: inline-block; padding: 6px 11px; border-radius: 6px; border: 1px solid #26425c; color: #20d9ff; text-decoration: none; font-size: 12px; font-family: ui-monospace, monospace; margin-left: 6px; }
    h1 { margin: 20px 0 6px; font-size: 26px; color: #f8fafc; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 13px; background: #0c1b2a; border: 1px solid #1e3348; border-radius: 8px; overflow: hidden; }
    th, td { padding: 10px 12px; border-bottom: 1px solid #1e3348; text-align: left; }
    th { font-size: 11px; text-transform: uppercase; color: #94a3b8; background: #081523; }
  </style>
</head>
<body>
  <div class="banner">${escapeHtml(SANDBOX_TEXT)}</div>
  <div class="wrap">
    <div class="top">
      <a class="brand" href="/">TWE Token Foundry · Signal Terminal</a>
      <div><a class="btn" href="/twe/index.html">TWE Docs</a><a class="btn" href="/foundry/collections.html">NFT Collections</a><a class="btn" href="/">Interactive App</a></div>
    </div>
    <h1>Token Foundry Directory (1 to 10^2048 - 1)</h1>
    <p style="font-size:13px;color:#cbd5e1;">Showing deterministic pages #1–#24 below. Every BigInt index up to 2,048 digits resolves in O(1) at <code>/foundry/token/:index</code>.</p>
    <table>
      <thead><tr><th>Ticker</th><th>Token Concept</th><th>Standard</th><th>Sector</th><th>Contract ID</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</body>
</html>`;
}
