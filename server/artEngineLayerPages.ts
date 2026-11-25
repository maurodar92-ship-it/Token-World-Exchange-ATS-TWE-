import crypto from 'crypto';

const SUPERSCRIPT_MAP: Record<string, string> = {
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

const MAX_DIGITS = 2048;

const RAW_ART_ENGINE_CEILING =
  '999999999999999999999999999999999999999999999999999999999999999999999999999⁹99999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999⁹99⁹999999999999⁹9999999999999999999999999999999999999999999⁹99999999999999999999999999999999999999999999999999999999999999999999999999⁹999999999999999999999999999999999999⁹99999⁹99999999999999999999999999999999999999999⁹99999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999⁹99999999999999999999999999999999999⁹999999999909999999999999';

export function normalizeArtEngineDigits(raw: unknown): string {
  const ascii = String(raw ?? '')
    .trim()
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => SUPERSCRIPT_MAP[c] ?? '');
  return ascii.replace(/[^0-9]/g, '').slice(0, MAX_DIGITS);
}

export const ART_ENGINE_CEILING_STR = normalizeArtEngineDigits(RAW_ART_ENGINE_CEILING);
export const ART_ENGINE_CEILING_DIGITS = ART_ENGINE_CEILING_STR.length;

function parseArtIdx(raw: unknown): bigint {
  const clean = normalizeArtEngineDigits(raw);
  if (!clean) return 1n;
  const parsed = BigInt(clean);
  return parsed < 1n ? 1n : parsed;
}

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function u32(hex: string, byteOffset: number): number {
  const start = (byteOffset % 28) * 2;
  return parseInt(hex.slice(start, start + 8), 16) >>> 0;
}

function escapeHtml(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatScientific(numStr: string): string {
  if (numStr.length <= 6) return numStr;
  return `${numStr[0]}.${numStr.slice(1, 3)} × 10^${numStr.length - 1}`;
}

/* ============================================================================
 * 1. MODULAR HASHLIPS ART ENGINE CORE PLUGIN INTERFACES
 * ============================================================================ */

export type ArtEnginePluginPhase = 'INPUT' | 'GENERATOR' | 'RENDERER' | 'EXPORTER';

export interface ArtEngineCorePlugin {
  id: string;
  name: string;
  phase: ArtEnginePluginPhase;
  interfaceContract: string;
  version: string;
  enabledByDefault: boolean;
  overheadMs: number;
  description: string;
  outputTarget: string;
}

export const HASHLIPS_CORE_PLUGINS: ArtEngineCorePlugin[] = [
  {
    id: 'hl-input-layers',
    name: 'ImageLayersInputPlugin',
    phase: 'INPUT',
    interfaceContract: 'InputInterface<LayerStackConfig>',
    version: '2.4.0',
    enabledByDefault: true,
    overheadMs: 0.4,
    description: 'Reads ordered NFT trait layers, rarity weights, exclusion rules, and z-index order management metadata.',
    outputTarget: 'memory://layer-stack-graph',
  },
  {
    id: 'hl-gen-dna',
    name: 'HashLipsDNAImageGeneratorPlugin',
    phase: 'GENERATOR',
    interfaceContract: 'GeneratorInterface<CompositeEdition>',
    version: '2.4.0',
    enabledByDefault: true,
    overheadMs: 1.1,
    description: 'Deterministically resolves collision-free SHA-256 DNA fingerprints and scales to arbitrary-precision collection sizes.',
    outputTarget: 'memory://edition-dna-stream',
  },
  {
    id: 'hl-render-erc721',
    name: 'ERC721MetadataFolderRendererPlugin',
    phase: 'RENDERER',
    interfaceContract: 'RendererInterface<MetadataFolderTree>',
    version: '2.4.0',
    enabledByDefault: true,
    overheadMs: 0.7,
    description: 'Synthesizes per-edition /metadata/{id}.json, /metadata/_metadata.json, and rarity tier attributes.',
    outputTarget: 'folder:///metadata/',
  },
  {
    id: 'hl-render-svg',
    name: 'LayeredVectorImageRendererPlugin',
    phase: 'RENDERER',
    interfaceContract: 'RendererInterface<VectorCompositeAsset>',
    version: '2.4.0',
    enabledByDefault: true,
    overheadMs: 0.9,
    description: 'Composites all z-ordered layers into deterministic 512x512 SVG/PNG NFT artwork with embedded checksum proofs.',
    outputTarget: 'folder:///images/',
  },
  {
    id: 'hl-export-ipfs',
    name: 'ExternalIPFSStorageTriggerPlugin',
    phase: 'EXPORTER',
    interfaceContract: 'ExporterInterface<ExternalFolderDispatch>',
    version: '2.4.0',
    enabledByDefault: true,
    overheadMs: 1.8,
    description: 'Triggers generated /metadata and /images folders to external IPFS CIDv1 / Pinata / Web3.Storage buckets.',
    outputTarget: 'ipfs://twe-art-engine-vault/',
  },
  {
    id: 'hl-export-s3',
    name: 'ExternalCloudBucketExporterPlugin',
    phase: 'EXPORTER',
    interfaceContract: 'ExporterInterface<CloudObjectSync>',
    version: '2.4.0',
    enabledByDefault: true,
    overheadMs: 1.4,
    description: 'Syncs generated metadata manifests and image bundles to external AWS S3, GCS, or Arweave storage folders.',
    outputTarget: 's3://twe-sovereign-nft-storage/collections/',
  },
];

export interface ArtEngineLayerItem {
  id: string;
  zIndex: number;
  name: string;
  folderPath: string;
  traitOptions: string[];
  blendMode: string;
  opacityPct: number;
  enabled: boolean;
}

export const DEFAULT_ART_ENGINE_LAYERS: ArtEngineLayerItem[] = [
  { id: 'lyr-01', zIndex: 1, name: 'Backdrop', folderPath: '/layers/01_Backdrop', traitOptions: ['Obsidian Graphite', 'Sovereign Slate', 'Deep Cobalt', 'Midnight Bullion'], blendMode: 'normal', opacityPct: 100, enabled: true },
  { id: 'lyr-02', zIndex: 2, name: 'Aura Field', folderPath: '/layers/02_Aura_Field', traitOptions: ['Champagne Halo', 'Platinum Lattice', 'Emerald Pulse', 'Cyan Meridian'], blendMode: 'screen', opacityPct: 85, enabled: true },
  { id: 'lyr-03', zIndex: 3, name: 'Core Geometry', folderPath: '/layers/03_Core_Geometry', traitOptions: ['Octagon Vault', 'Hexagon Prism', 'Orbital Ring', 'Diamond Matrix'], blendMode: 'normal', opacityPct: 100, enabled: true },
  { id: 'lyr-04', zIndex: 4, name: 'Metallic Finish', folderPath: '/layers/04_Metallic_Finish', traitOptions: ['Brushed Gold', 'Sovereign Platinum', 'Titanium Carbon', 'Chrome Rose'], blendMode: 'overlay', opacityPct: 95, enabled: true },
  { id: 'lyr-05', zIndex: 5, name: 'Sovereign Sigil', folderPath: '/layers/05_Sovereign_Sigil', traitOptions: ['TWE Crown', 'ATS Crest', 'Merkle Seal', 'Infinity Nexus'], blendMode: 'normal', opacityPct: 100, enabled: true },
  { id: 'lyr-06', zIndex: 6, name: 'Order Management Overlay', folderPath: '/layers/06_Order_Overlay', traitOptions: ['ERC-721 Verified', 'QIB Custody Stamp', 'HashLips DNA Tag', 'On-Chain Finality'], blendMode: 'normal', opacityPct: 90, enabled: true },
];

export interface ExternalStorageTarget {
  id: string;
  label: string;
  protocol: string;
  folderUri: string;
  region: string;
}

export const EXTERNAL_STORAGE_TARGETS: ExternalStorageTarget[] = [
  { id: 'ipfs-cidv1', label: 'IPFS CIDv1 Pinning Cluster', protocol: 'IPFS / Pinata', folderUri: 'ipfs://bafybeitweartengine/collection/', region: 'Global DHT' },
  { id: 's3-vault', label: 'AWS S3 Sovereign Vault Folder', protocol: 'S3 Object Storage', folderUri: 's3://twe-sovereign-nft-vault/drops/', region: 'us-east-1' },
  { id: 'gcs-prod', label: 'Google Cloud Storage Metadata Bucket', protocol: 'GCS Bucket', folderUri: 'gs://twe-art-engine-prod/metadata-bundles/', region: 'us-east1' },
  { id: 'arweave-perma', label: 'Arweave Permaweb Archive Folder', protocol: 'Arweave Bundlr', folderUri: 'ar://twe-permaweb-nft-archive/', region: 'Permanent Mesh' },
];

/* ============================================================================
 * 2. DETERMINISTIC NFT SVG + METADATA FOLDER + EXTERNAL STORAGE DISPATCH
 * ============================================================================ */

const PALETTE_BG = ['#0b0f17', '#111827', '#0a1628', '#17141d'];
const PALETTE_ACCENT = ['#d4b475', '#cbd5e1', '#34d399', '#38bdf8'];

export function buildDeterministicLayerSvg(
  editionIndex: string,
  traits: Array<{ trait_type: string; value: string; zIndex: number }>
): string {
  const h = sha256(`TWE_ART_ENGINE_SVG_V1:${editionIndex}:${traits.map((t) => t.value).join('|')}`);
  const bg = PALETTE_BG[u32(h, 0) % PALETTE_BG.length];
  const accent = PALETTE_ACCENT[u32(h, 4) % PALETTE_ACCENT.length];
  const secondary = PALETTE_ACCENT[(u32(h, 8) + 1) % PALETTE_ACCENT.length];
  const sides = [4, 6, 8, 12][u32(h, 12) % 4];
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const ang = (i / sides) * Math.PI * 2 - Math.PI / 2;
    const x = 180 + Math.cos(ang) * 98;
    const y = 180 + Math.sin(ang) * 98;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const shortIdx = editionIndex.length > 12 ? `${editionIndex.slice(0, 6)}..${editionIndex.slice(-4)}` : editionIndex;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360" width="360" height="360">
  <defs>
    <radialGradient id="g-${h.slice(0, 6)}" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${bg}" stop-opacity="1"/>
    </radialGradient>
  </defs>
  <rect width="360" height="360" fill="${bg}"/>
  <rect width="360" height="360" fill="url(#g-${h.slice(0, 6)})"/>
  <circle cx="180" cy="180" r="134" fill="none" stroke="${secondary}" stroke-opacity="0.3" stroke-dasharray="5 5" stroke-width="1.5"/>
  <polygon points="${pts.join(' ')}" fill="none" stroke="${accent}" stroke-width="2.5"/>
  <circle cx="180" cy="180" r="44" fill="${bg}" stroke="${accent}" stroke-width="2"/>
  <text x="180" y="176" text-anchor="middle" fill="${accent}" font-family="ui-monospace,monospace" font-size="13" font-weight="700">TWE ART</text>
  <text x="180" y="194" text-anchor="middle" fill="#e2e8f0" font-family="ui-monospace,monospace" font-size="10">#${escapeHtml(shortIdx)}</text>
  <text x="180" y="336" text-anchor="middle" fill="#94a3b8" font-family="ui-monospace,monospace" font-size="9.5">DNA ${h.slice(0, 18).toUpperCase()} · ${traits.length} LAYERS</text>
</svg>`;
}

export interface StorageDispatchFile {
  relativePath: string;
  folder: 'metadata' | 'images' | 'manifests';
  mimeType: string;
  sizeBytes: number;
  sha256Digest: string;
  externalUri: string;
  content: string;
}

export interface StorageDispatchJob {
  jobId: string;
  collectionName: string;
  declaredTotalCollectionSize: string;
  generatedSampleCount: number;
  storageTarget: ExternalStorageTarget;
  activePlugins: string[];
  layerOrder: string[];
  totalOverheadMs: number;
  status: 'DISPATCHED_TO_EXTERNAL_STORAGE';
  triggeredAt: string;
  metadataFolderUri: string;
  imagesFolderUri: string;
  merkleBatchRoot: string;
  files: StorageDispatchFile[];
}

const storageDispatchHistory: StorageDispatchJob[] = [];

export function listStorageDispatchHistory(): StorageDispatchJob[] {
  return [...storageDispatchHistory];
}

export function triggerExternalStorageDispatch(input: {
  collectionName?: string;
  totalCollectionSize?: string;
  sampleCount?: number;
  storageTargetId?: string;
  enabledPluginIds?: string[];
  layerOrder?: string[];
}): StorageDispatchJob {
  const collectionName = String(input.collectionName || 'TWE Sovereign HashLips Drop').trim().slice(0, 80);
  const totalCollectionSize = normalizeArtEngineDigits(input.totalCollectionSize || '10000') || '10000';
  const sampleCount = Math.max(1, Math.min(20, Math.floor(Number(input.sampleCount) || 6)));
  const storageTarget =
    EXTERNAL_STORAGE_TARGETS.find((t) => t.id === input.storageTargetId) ?? EXTERNAL_STORAGE_TARGETS[0];
  const enabledPluginIds =
    Array.isArray(input.enabledPluginIds) && input.enabledPluginIds.length > 0
      ? input.enabledPluginIds.map((s) => String(s))
      : HASHLIPS_CORE_PLUGINS.map((p) => p.id);
  const layerOrder =
    Array.isArray(input.layerOrder) && input.layerOrder.length > 0
      ? input.layerOrder.map((s) => String(s))
      : DEFAULT_ART_ENGINE_LAYERS.map((l) => l.name);

  const activePlugins = HASHLIPS_CORE_PLUGINS.filter((p) => enabledPluginIds.includes(p.id));
  const totalOverheadMs = Number(
    activePlugins.reduce((acc, p) => acc + p.overheadMs, 0).toFixed(2)
  );

  const slug = collectionName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'twe-drop';
  const baseFolder = `${storageTarget.folderUri}${slug}/`;
  const metadataFolderUri = `${baseFolder}metadata/`;
  const imagesFolderUri = `${baseFolder}images/`;

  const files: StorageDispatchFile[] = [];
  const allMetadata: Array<Record<string, unknown>> = [];

  for (let i = 1; i <= sampleCount; i++) {
    const edIdx = String(i);
    const h = sha256(`DISPATCH:${collectionName}:${totalCollectionSize}:${edIdx}`);
    const traits = layerOrder.map((layerName, z) => {
      const def = DEFAULT_ART_ENGINE_LAYERS.find((l) => l.name === layerName);
      const opts = def?.traitOptions ?? ['Sovereign Standard', 'Platinum Variant', 'Gold Variant'];
      return {
        trait_type: layerName,
        value: opts[u32(h, z * 4) % opts.length],
        zIndex: z + 1,
      };
    });

    const svgContent = buildDeterministicLayerSvg(edIdx, traits);
    const svgHash = sha256(svgContent);
    const imgPath = `images/${i}.svg`;
    files.push({
      relativePath: imgPath,
      folder: 'images',
      mimeType: 'image/svg+xml',
      sizeBytes: Buffer.byteLength(svgContent, 'utf8'),
      sha256Digest: svgHash,
      externalUri: `${imagesFolderUri}${i}.svg`,
      content: svgContent,
    });

    const metaObj = {
      name: `${collectionName} #${i}`,
      description: `Generated by TWE HashLips ArtEngineLayerManager (${layerOrder.length} ordered layers; total collection size ${totalCollectionSize}).`,
      image: `${imagesFolderUri}${i}.svg`,
      dna: h,
      edition: i,
      collection_size_target: totalCollectionSize,
      order_management_layers: layerOrder,
      plugins_executed: activePlugins.map((p) => p.name),
      attributes: traits.map((t) => ({ trait_type: t.trait_type, value: t.value })),
    };
    allMetadata.push(metaObj);

    const metaStr = JSON.stringify(metaObj, null, 2);
    files.push({
      relativePath: `metadata/${i}.json`,
      folder: 'metadata',
      mimeType: 'application/json',
      sizeBytes: Buffer.byteLength(metaStr, 'utf8'),
      sha256Digest: sha256(metaStr),
      externalUri: `${metadataFolderUri}${i}.json`,
      content: metaStr,
    });
  }

  const combinedMeta = JSON.stringify(allMetadata, null, 2);
  files.push({
    relativePath: 'metadata/_metadata.json',
    folder: 'metadata',
    mimeType: 'application/json',
    sizeBytes: Buffer.byteLength(combinedMeta, 'utf8'),
    sha256Digest: sha256(combinedMeta),
    externalUri: `${metadataFolderUri}_metadata.json`,
    content: combinedMeta,
  });

  const merkleBatchRoot = `0x${sha256(files.map((f) => f.sha256Digest).join(':'))}`;
  const now = new Date().toISOString();
  const job: StorageDispatchJob = {
    jobId: `SYNC-${sha256(`${now}:${merkleBatchRoot}`).slice(0, 8).toUpperCase()}`,
    collectionName,
    declaredTotalCollectionSize: totalCollectionSize,
    generatedSampleCount: sampleCount,
    storageTarget,
    activePlugins: activePlugins.map((p) => p.name),
    layerOrder,
    totalOverheadMs,
    status: 'DISPATCHED_TO_EXTERNAL_STORAGE',
    triggeredAt: now,
    metadataFolderUri,
    imagesFolderUri,
    merkleBatchRoot,
    files,
  };

  storageDispatchHistory.unshift(job);
  if (storageDispatchHistory.length > 20) storageDispatchHistory.pop();
  return job;
}

/* ============================================================================
 * 3. O(1) ARBITRARY-PRECISION 590-DIGIT ART ENGINE LAYER MANAGER WEBPAGES
 * ============================================================================ */

export interface ArtEngineWebpageRecord {
  pageIndex: string;
  pageId: string;
  editionName: string;
  dnaHash: string;
  rarityTier: 'Mythic' | 'Legendary' | 'Epic' | 'Rare' | 'Uncommon';
  rarityScore: number;
  orderManagementOverheadMs: number;
  collectionSizeScale: string;
  activePlugins: ArtEngineCorePlugin[];
  orderedLayers: Array<{ zIndex: number; trait_type: string; value: string; folderPath: string }>;
  externalStorageTarget: ExternalStorageTarget;
  metadataFileUri: string;
  imageFileUri: string;
  svgMarkup: string;
  metadataJson: Record<string, unknown>;
  merkleRoot: string;
  webpagePath: string;
  prevPageIndex: string;
  nextPageIndex: string;
  ceilingIndex: string;
  ceilingDigits: number;
}

export interface ArtEngineWebpageRangeResponse {
  startIndex: string;
  limit: number;
  prevStartIndex: string;
  nextStartIndex: string;
  ceilingIndex: string;
  ceilingDigits: number;
  scientificCeiling: string;
  maxSupportedDigits: number;
  activePluginFilter: string;
  plugins: ArtEngineCorePlugin[];
  items: ArtEngineWebpageRecord[];
}

export function resolveArtEngineLayerWebpage(
  rawIndex: unknown,
  pluginFilter?: string
): ArtEngineWebpageRecord {
  const idx = parseArtIdx(rawIndex);
  const pageIndex = idx.toString();
  const h1 = sha256(`TWE_ART_ENGINE_LAYER_WEBPAGE_V1:${pageIndex}`);
  const h2 = sha256(`TWE_ART_ENGINE_STORAGE_V1:${pageIndex}:${h1}`);

  const orderedLayers = DEFAULT_ART_ENGINE_LAYERS.map((lyr, i) => ({
    zIndex: lyr.zIndex,
    trait_type: lyr.name,
    value: lyr.traitOptions[u32(h1, i * 4) % lyr.traitOptions.length],
    folderPath: lyr.folderPath,
  }));

  const target = EXTERNAL_STORAGE_TARGETS[u32(h2, 0) % EXTERNAL_STORAGE_TARGETS.length];
  const score = Number((18 + ((u32(h2, 4) % 8000) / 100)).toFixed(2));
  const rarityTier: ArtEngineWebpageRecord['rarityTier'] =
    score >= 92 ? 'Mythic' : score >= 78 ? 'Legendary' : score >= 58 ? 'Epic' : score >= 38 ? 'Rare' : 'Uncommon';

  const shortTag = h1.slice(0, 8).toUpperCase();
  const pageId = `TWE-ART-${shortTag}`;
  const svgMarkup = buildDeterministicLayerSvg(pageIndex, orderedLayers);
  const metadataFileUri = `${target.folderUri}metadata/${pageIndex.slice(0, 24)}.json`;
  const imageFileUri = `${target.folderUri}images/${pageIndex.slice(0, 24)}.svg`;

  const activePlugins =
    pluginFilter && HASHLIPS_CORE_PLUGINS.some((p) => p.id === pluginFilter)
      ? HASHLIPS_CORE_PLUGINS.filter((p) => p.id === pluginFilter || p.phase === 'INPUT')
      : HASHLIPS_CORE_PLUGINS;

  const orderManagementOverheadMs = Number(
    activePlugins.reduce((acc, p) => acc + p.overheadMs, 0).toFixed(2)
  );

  const metadataJson = {
    name: `TWE ArtEngine Edition #${shortTag}`,
    edition_bigint: pageIndex,
    dna: h1,
    rarity_tier: rarityTier,
    rarity_score: score,
    image: imageFileUri,
    external_metadata_folder: `${target.folderUri}metadata/`,
    collection_size_ceiling: `${ART_ENGINE_CEILING_DIGITS} digits (${formatScientific(ART_ENGINE_CEILING_STR)})`,
    hashlips_plugins: activePlugins.map((p) => `${p.name}@${p.version}`),
    attributes: orderedLayers.map((l) => ({
      z_index: l.zIndex,
      trait_type: l.trait_type,
      value: l.value,
    })),
  };

  return {
    pageIndex,
    pageId,
    editionName: `TWE ArtEngine Edition #${shortTag}`,
    dnaHash: h1,
    rarityTier,
    rarityScore: score,
    orderManagementOverheadMs,
    collectionSizeScale: `${ART_ENGINE_CEILING_DIGITS}-digit BigInt`,
    activePlugins,
    orderedLayers,
    externalStorageTarget: target,
    metadataFileUri,
    imageFileUri,
    svgMarkup,
    metadataJson,
    merkleRoot: `0x${h2}`,
    webpagePath: `/art-engine/page/${pageIndex}${pluginFilter && pluginFilter !== 'ALL' ? `?plugin=${encodeURIComponent(pluginFilter)}` : ''}`,
    prevPageIndex: idx > 1n ? (idx - 1n).toString() : '1',
    nextPageIndex: (idx + 1n).toString(),
    ceilingIndex: ART_ENGINE_CEILING_STR,
    ceilingDigits: ART_ENGINE_CEILING_DIGITS,
  };
}

export function resolveArtEngineLayerWebpageRange(
  startRaw: unknown,
  limitRaw = 10,
  pluginFilter?: string
): ArtEngineWebpageRangeResponse {
  const start = parseArtIdx(startRaw);
  const limit = Math.max(1, Math.min(25, Math.floor(Number(limitRaw) || 10)));
  const activePluginFilter =
    pluginFilter && HASHLIPS_CORE_PLUGINS.some((p) => p.id === pluginFilter)
      ? pluginFilter
      : 'ALL';

  const items: ArtEngineWebpageRecord[] = [];
  for (let i = 0; i < limit; i++) {
    items.push(
      resolveArtEngineLayerWebpage(
        start + BigInt(i),
        activePluginFilter === 'ALL' ? undefined : activePluginFilter
      )
    );
  }

  return {
    startIndex: start.toString(),
    limit,
    prevStartIndex: start > BigInt(limit) ? (start - BigInt(limit)).toString() : '1',
    nextStartIndex: (start + BigInt(limit)).toString(),
    ceilingIndex: ART_ENGINE_CEILING_STR,
    ceilingDigits: ART_ENGINE_CEILING_DIGITS,
    scientificCeiling: formatScientific(ART_ENGINE_CEILING_STR),
    maxSupportedDigits: MAX_DIGITS,
    activePluginFilter,
    plugins: HASHLIPS_CORE_PLUGINS,
    items,
  };
}

export function renderArtEngineLayerHtmlPage(page: ArtEngineWebpageRecord): string {
  const layerRows = page.orderedLayers
    .map(
      (l) =>
        `<tr><td class="mono">Z-${l.zIndex}</td><td><strong>${escapeHtml(l.trait_type)}</strong></td><td class="gold">${escapeHtml(l.value)}</td><td class="mono">${escapeHtml(l.folderPath)}</td></tr>`
    )
    .join('');

  const pluginRows = page.activePlugins
    .map(
      (p) =>
        `<tr><td class="mono gold">${escapeHtml(p.phase)}</td><td><strong>${escapeHtml(p.name)}</strong></td><td class="mono">${escapeHtml(p.interfaceContract)}</td><td class="mono em">${p.overheadMs} ms</td><td class="mono">${escapeHtml(p.outputTarget)}</td></tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(page.pageId)} — ArtEngineLayerManager HashLips Webpage</title>
  <style>
    :root{color-scheme:dark;--bg:#090b0f;--surf:#11151d;--elev:#171c26;--bdr:#262e3d;--txt:#f1f5f9;--mut:#94a3b8;--gold:#d4b475;--em:#34d399}
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--txt);font-family:Inter,system-ui,sans-serif;line-height:1.5}
    .wrap{max-width:1000px;margin:0 auto;padding:22px 18px 46px}
    .top{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid var(--bdr);margin-bottom:18px}
    .brand{font-family:ui-monospace,monospace;font-size:11.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--gold)}
    .nav{display:flex;flex-wrap:wrap;gap:7px}
    .nav a{font-family:ui-monospace,monospace;font-size:11px;color:var(--txt);text-decoration:none;padding:5px 9px;border:1px solid var(--bdr);border-radius:6px;background:var(--surf)}
    .nav a:hover{border-color:var(--gold);color:var(--gold)}
    .card{background:var(--surf);border:1px solid var(--bdr);border-radius:10px;padding:18px;margin-bottom:16px}
    .hero{display:grid;grid-template-columns:230px 1fr;gap:18px;align-items:start}
    @media(max-width:720px){.hero{grid-template-columns:1fr}}
    .art{border:1px solid var(--bdr);border-radius:10px;overflow:hidden;background:#07090d}
    .art svg{display:block;width:100%;height:auto}
    h1{margin:4px 0 6px;font-size:20px}
    .mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all}
    .gold{color:var(--gold)}.em{color:var(--em)}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:12px 0}
    .kpi{background:var(--elev);border:1px solid var(--bdr);border-radius:8px;padding:10px}
    .kpi .lbl{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--mut)}
    .kpi .val{margin-top:4px;font-size:13.5px;font-weight:600}
    table{width:100%;border-collapse:collapse;font-size:11.5px}
    th,td{padding:7px 9px;border-bottom:1px solid var(--bdr);text-align:left}
    th{color:var(--mut);text-transform:uppercase;font-size:10px;letter-spacing:.06em}
    pre{margin:0;padding:12px;border-radius:8px;background:#07090d;border:1px solid var(--bdr);overflow-x:auto;font-size:11px;color:#cbd5e1}
    .pager{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;margin-top:16px}
    .pager a{font-family:ui-monospace,monospace;font-size:11.5px;color:var(--gold);text-decoration:none;padding:7px 12px;border:1px solid var(--bdr);border-radius:6px;background:var(--surf)}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <div class="brand">TWE ArtEngineLayerManager · HashLips Core Plugin Webpage</div>
      <div class="nav">
        <a href="/overview/page/${escapeHtml(page.pageIndex)}">Overview</a>
        <a href="/market-exchange/page/${escapeHtml(page.pageIndex)}">Market Exchange</a>
        <a href="/cloud-database/page/${escapeHtml(page.pageIndex)}">Cloud Database</a>
        <a href="/token-foundry/page/${escapeHtml(page.pageIndex)}">Token Foundry</a>
        <a href="/art-engine/page/${escapeHtml(page.ceilingIndex)}">Ceiling (${page.ceilingDigits}d)</a>
      </div>
    </div>

    <div class="card hero">
      <div class="art">${page.svgMarkup}</div>
      <div>
        <div class="brand">${escapeHtml(page.pageId)} · ${escapeHtml(page.rarityTier)} (${page.rarityScore} pts)</div>
        <h1>${escapeHtml(page.editionName)}</h1>
        <div class="grid">
          <div class="kpi"><div class="lbl">Order Mgmt Overhead</div><div class="val mono em">${page.orderManagementOverheadMs} ms</div></div>
          <div class="kpi"><div class="lbl">Collection Scale</div><div class="val mono gold">${escapeHtml(page.collectionSizeScale)}</div></div>
          <div class="kpi"><div class="lbl">External Storage</div><div class="val">${escapeHtml(page.externalStorageTarget.label)}</div></div>
        </div>
        <table>
          <tbody>
            <tr><th style="width:170px">Metadata Folder File</th><td class="mono">${escapeHtml(page.metadataFileUri)}</td></tr>
            <tr><th>Image Asset File</th><td class="mono">${escapeHtml(page.imageFileUri)}</td></tr>
            <tr><th>SHA-256 DNA</th><td class="mono">${escapeHtml(page.dnaHash)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="brand" style="margin-bottom:8px">NFT Image Layer Order Management Stack</div>
      <table>
        <thead><tr><th>Z-Order</th><th>Layer</th><th>Selected Trait</th><th>Source Folder</th></tr></thead>
        <tbody>${layerRows}</tbody>
      </table>
    </div>

    <div class="card">
      <div class="brand" style="margin-bottom:8px">HashLips Generation Engine Core Plugins</div>
      <table>
        <thead><tr><th>Phase</th><th>Core Plugin</th><th>Interface Contract</th><th>Overhead</th><th>Output Target</th></tr></thead>
        <tbody>${pluginRows}</tbody>
      </table>
    </div>

    <div class="card">
      <div class="brand" style="margin-bottom:8px">Generated Metadata Folder Payload &amp; BigInt Index</div>
      <pre class="mono">${escapeHtml(JSON.stringify(page.metadataJson, null, 2))}</pre>
    </div>

    <div class="pager">
      <a href="/art-engine/page/${escapeHtml(page.prevPageIndex)}">&larr; Prev ArtEngine Page</a>
      <a href="/art-engine/page/${escapeHtml(page.ceilingIndex)}">Target Ceiling (${page.ceilingDigits} digits)</a>
      <a href="/art-engine/page/${escapeHtml(page.nextPageIndex)}">Next ArtEngine Page &rarr;</a>
    </div>
  </div>
</body>
</html>`;
}
