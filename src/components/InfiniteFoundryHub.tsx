import React, { useCallback, useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Box,
  Check,
  CheckCircle2,
  CloudUpload,
  Code2,
  Copy,
  Cpu,
  Download,
  FileArchive,
  Globe,
  Hash,
  Image as ImageIcon,
  Layers,
  Search,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';
import { createNftEdition, createPersistedAsset } from '../lib/firestoreStore';
import type { RarityTier } from '../lib/rarityService';
import { FoundryThreeStudio } from './FoundryThreeStudio';
import type { Foundry3DArtifactSpec } from '../lib/foundryThreeEngine';

type FoundryMode = 'token' | 'nft';
type InspectorTab = 'studio3d' | 'webpage' | 'solidity' | 'contract' | 'manifest' | 'layers';
type TokenStandard = 'AUTO' | 'ERC-3643' | 'ERC-1400' | 'ERC-20';
type CollectionFilter =
  | 'ALL'
  | 'Infinite Horizon Cosmic Nexus'
  | 'Matrix Heroes'
  | 'Mythic Titans';

interface InfiniteTokenPage {
  kind: 'token';
  pageIndex: string;
  prevIndex: string | null;
  nextIndex: string;
  catalogCeiling: string;
  contractId: string;
  contractAddress: string;
  deployerAddress: string;
  saltBytes32: string;
  standard: 'ERC-3643' | 'ERC-1400' | 'ERC-20';
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

interface LayerFrequencyEnhancement {
  tier: 'Mythic Foil' | 'Chromatic Rim' | 'Satin Etch' | 'Architectural Base';
  frequencyPct: number;
  infoScore: number;
  badgeColor: string;
  svgEnhancement: string;
  pbrEnhancement: string;
  iridescence: number;
  emissiveBoost: number;
  anisotropyBoost: number;
}

interface InfiniteNftPage {
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
  rarityTier: RarityTier;
  maxEnhancementTier: LayerFrequencyEnhancement['tier'];
  accentHex: string;
  secondaryHex: string;
  pbrProfile: {
    iridescence: number;
    emissiveBoost: number;
    anisotropyBoost: number;
  };
  traits: Array<{
    trait_type: string;
    value: string;
    weightPct: number;
    infoScore: number;
    enhancement: LayerFrequencyEnhancement;
  }>;
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

interface CrossCategoryLayerAnalytics {
  totalCollections: number;
  totalLayerAssets: number;
  enhancementLegend: Array<{
    tier: string;
    threshold: string;
    color: string;
    summary: string;
  }>;
  collections: Array<{
    slug: 'cosmic-nexus' | 'matrix-heroes' | 'mythic-titans';
    name: string;
    description: string;
    baselineStaticCount: number;
    rawCombinations: number;
    exclusions: string[][];
    layers: Array<{
      trait_type: string;
      required: boolean;
      totalWeight: number;
      options: Array<{
        name: string;
        weight: number;
        colorHint: string;
        enhancement: LayerFrequencyEnhancement;
        previewSvg: string;
      }>;
    }>;
  }>;
}

type FoundryPageItem = InfiniteTokenPage | InfiniteNftPage;

interface RangeResponse {
  startIndex: string;
  nextStartIndex: string;
  prevStartIndex: string;
  catalogCeiling: string;
  count: number;
  items: FoundryPageItem[];
}

interface CoreDocSectionBlock {
  h: string;
  p?: string[];
  ul?: string[];
  codeBlock?: string;
}

interface CoreDocPage {
  path: string;
  section: 'TWE' | 'Foundry' | 'About';
  title: string;
  lead: string;
  sections: CoreDocSectionBlock[];
}

interface PortalDirectoryResponse {
  creator: string;
  sandboxText?: string;
  maxDigitsSupported: number;
  staticBaselinePages: number;
  collections: Array<{
    name: CollectionFilter;
    baselineStaticCount: number;
    infiniteCapacity: string;
    sculptureStyle: string;
    description: string;
  }>;
  traitCatalog: Array<{
    trait_type: string;
    options: Array<{ name: string; weightPct: number; color: string }>;
  }>;
  corePages: CoreDocPage[];
  docs: Array<{
    id: string;
    section: string;
    title: string;
    summary: string;
    body: string;
    tags: string[];
  }>;
  checklist: Array<{ label: string; done: boolean }>;
}

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

const TARGET_466_NINES = '9'.repeat(466);
const CEILING_512 = '9'.repeat(512);
const UINT256_MAX =
  '115792089237316195423570985008687907853269984665640564039457584007913129639935';

const SCALE_PRESETS: Array<{ label: string; value: string }> = [
  { label: 'Page #1', value: '1' },
  { label: 'Page #6,850', value: '6850' },
  { label: 'Page #2^256 - 1', value: UINT256_MAX },
  { label: '10^466 - 1 (466 Nines)', value: TARGET_466_NINES },
  { label: '10^512 - 1 (512 Nines)', value: CEILING_512 },
];

function normalizeBigIntInput(raw: string): string {
  const ascii = raw.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (ch) => SUPERSCRIPT_MAP[ch] ?? '');
  return ascii.replace(/[^0-9]/g, '').slice(0, 2048);
}

function formatCompactBigInt(raw: string): string {
  if (raw.length <= 16) return raw;
  return `${raw.slice(0, 7)}…${raw.slice(-7)} (${raw.length}d)`;
}

function generateRandom64DigitIndex(): string {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  let acc = '';
  for (const b of bytes) {
    acc += String(b % 10);
    acc += String(Math.floor(b / 10) % 10);
  }
  const cleaned = acc.replace(/^0+/, '');
  return cleaned.length > 0 ? cleaned.slice(0, 64) : '999999999999999999';
}

function downloadBlob(filename: string, content: string | Blob, mime = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function deriveAccentPalette(page: FoundryPageItem): { accentHex: string; secondaryHex: string } {
  if (page.kind === 'token') {
    if (page.standard === 'ERC-3643') return { accentHex: '#D4B475', secondaryHex: '#38BDF8' };
    if (page.standard === 'ERC-1400') return { accentHex: '#38BDF8', secondaryHex: '#10B981' };
    return { accentHex: '#10B981', secondaryHex: '#D4B475' };
  }
  switch (page.rarityTier) {
    case 'Mythic':
      return { accentHex: '#F43F5E', secondaryHex: '#D4B475' };
    case 'Legendary':
      return { accentHex: '#F59E0B', secondaryHex: '#FDE68A' };
    case 'Epic':
      return { accentHex: '#A78BFA', secondaryHex: '#38BDF8' };
    case 'Rare':
      return { accentHex: '#38BDF8', secondaryHex: '#10B981' };
    default:
      return { accentHex: '#D4B475', secondaryHex: '#CBD5E1' };
  }
}

export const InfiniteFoundryHub: React.FC = () => {
  const { user, signInWithGoogle } = useFirebase();

  const [mode, setMode] = useState<FoundryMode>('nft');
  const [standardFilter, setStandardFilter] = useState<TokenStandard>('AUTO');
  const [collectionFilter, setCollectionFilter] = useState<CollectionFilter>('ALL');
  const [indexInput, setIndexInput] = useState<string>('1');
  const [cursorStart, setCursorStart] = useState<string>('1');
  const [rangeData, setRangeData] = useState<RangeResponse | null>(null);
  const [selectedPage, setSelectedPage] = useState<FoundryPageItem | null>(null);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('studio3d');
  const [loading, setLoading] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);
  const [savingCloud, setSavingCloud] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(
    null
  );
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Frequency-driven SVG & 3D PBR Enhancement toggle + Cross-Category Layer Analytics
  const [enhancementsEnabled, setEnhancementsEnabled] = useState<boolean>(true);
  const [layerAnalytics, setLayerAnalytics] = useState<CrossCategoryLayerAnalytics | null>(null);
  const [layerCollectionTab, setLayerCollectionTab] = useState<
    'ALL' | 'cosmic-nexus' | 'matrix-heroes' | 'mythic-titans'
  >('ALL');

  // Portal documentation, collections & client-side search across all 29 hand-written core pages
  const [portal, setPortal] = useState<PortalDirectoryResponse | null>(null);
  const [portalSearch, setPortalSearch] = useState<string>('');
  const [docSectionFilter, setDocSectionFilter] = useState<'ALL' | 'TWE' | 'Foundry' | 'About'>('ALL');
  const [selectedCoreDocPath, setSelectedCoreDocPath] = useState<string>('twe/index.html');

  useEffect(() => {
    let active = true;
    fetch('/api/foundry/portal')
      .then((res) => (res.ok ? res.json() : null))
      .then((json: PortalDirectoryResponse | null) => {
        if (active && json) {
          setPortal(json);
          if (json.corePages?.length > 0) {
            setSelectedCoreDocPath(json.corePages[0].path);
          }
        }
      })
      .catch(() => undefined);

    fetch('/api/foundry/layers/analytics')
      .then((res) => (res.ok ? res.json() : null))
      .then((json: CrossCategoryLayerAnalytics | null) => {
        if (active && json) {
          setLayerAnalytics(json);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const loadRange = useCallback(
    async (
      startIdx: string,
      targetMode: FoundryMode,
      std: TokenStandard,
      col: CollectionFilter
    ) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          start: startIdx,
          limit: '12',
        });
        if (targetMode === 'token' && std !== 'AUTO') {
          params.set('standard', std);
        }
        if (targetMode === 'nft' && col !== 'ALL') {
          params.set('collection', col);
        }
        const endpoint =
          targetMode === 'token'
            ? `/api/foundry/token/range?${params.toString()}`
            : `/api/foundry/nft/range?${params.toString()}`;
        const res = await fetch(endpoint);
        if (!res.ok) {
          throw new Error(`Failed to resolve ${targetMode} foundry pages (${res.status}).`);
        }
        const json: RangeResponse = await res.json();
        setRangeData(json);
        if (json.items.length > 0) {
          setSelectedPage(json.items[0]);
        }
      } catch (err) {
        setStatusMessage({
          kind: 'err',
          text: err instanceof Error ? err.message : 'Unable to load foundry range.',
        });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadRange(cursorStart, mode, standardFilter, collectionFilter);
  }, [cursorStart, mode, standardFilter, collectionFilter, loadRange]);

  const jumpToIndex = (raw: string) => {
    const cleaned = normalizeBigIntInput(raw);
    const normalized = cleaned.replace(/^0+/, '') || '1';
    setIndexInput(normalized);
    setCursorStart(normalized);
    setStatusMessage(null);
  };

  const stepBigInt = (delta: bigint) => {
    try {
      const current = BigInt(cursorStart || '1');
      const next = current + delta;
      jumpToIndex(next < 1n ? '1' : next.toString());
    } catch {
      jumpToIndex('1');
    }
  };

  const handleCopy = (key: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1600);
  };

  const handleDownloadHtml = async (page: FoundryPageItem) => {
    try {
      const query =
        page.kind === 'nft' && collectionFilter !== 'ALL'
          ? `?collection=${encodeURIComponent(collectionFilter)}`
          : '';
      const res = await fetch(`${page.webpagePath}${query}`);
      if (!res.ok) throw new Error('Unable to fetch standalone HTML page.');
      const html = await res.text();
      const shortId = page.contractId.toLowerCase();
      downloadBlob(`${shortId}.html`, html, 'text/html;charset=utf-8');
    } catch (err) {
      setStatusMessage({
        kind: 'err',
        text: err instanceof Error ? err.message : 'HTML download failed.',
      });
    }
  };

  const handleExportWindowZip = async () => {
    if (!rangeData || rangeData.items.length === 0) return;
    setExportingZip(true);
    setStatusMessage(null);
    try {
      const zip = new JSZip();
      const manifest: Array<Record<string, unknown>> = [];

      for (const item of rangeData.items) {
        const folder = zip.folder(item.contractId);
        if (!folder) continue;

        const htmlRes = await fetch(item.webpagePath);
        const htmlText = htmlRes.ok ? await htmlRes.text() : '';
        folder.file('index.html', htmlText);
        folder.file(`${item.contractId}.sol`, item.soliditySource);
        folder.file('abi.json', item.abiJson);

        if (item.kind === 'nft') {
          folder.file('artwork.svg', item.svgMarkup);
          folder.file('metadata.json', item.metadataJson);
        } else {
          folder.file(
            'token-manifest.json',
            JSON.stringify(
              {
                pageIndex: item.pageIndex,
                contractId: item.contractId,
                contractAddress: item.contractAddress,
                ticker: item.ticker,
                name: item.name,
                standard: item.standard,
                chain: item.chain,
                totalSupplyFormatted: item.totalSupplyFormatted,
                ipfsCidV1: item.ipfsCidV1,
                sha256Fingerprint: item.sha256Fingerprint,
              },
              null,
              2
            )
          );
        }

        manifest.push({
          pageIndex: item.pageIndex,
          contractId: item.contractId,
          contractAddress: item.contractAddress,
          webpagePath: item.webpagePath,
        });
      }

      zip.file('catalog-slice.json', JSON.stringify(manifest, null, 2));
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(
        `twe-${mode}-foundry-slice-${formatCompactBigInt(rangeData.startIndex).replace(/[^a-zA-Z0-9_-]/g, '_')}.zip`,
        blob,
        'application/zip'
      );
      setStatusMessage({
        kind: 'ok',
        text: `Exported ${rangeData.items.length} standalone HTML webpages, Solidity contracts, ABIs, and assets as ZIP.`,
      });
    } catch (err) {
      setStatusMessage({
        kind: 'err',
        text: err instanceof Error ? err.message : 'ZIP bundle export failed.',
      });
    } finally {
      setExportingZip(false);
    }
  };

  const handleSaveToCloudDb = async (page: FoundryPageItem) => {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    setSavingCloud(true);
    setStatusMessage(null);
    try {
      if (page.kind === 'token') {
        await createPersistedAsset(user.uid, {
          symbol: page.ticker,
          name: page.name.slice(0, 120),
          kind: 'Tokens',
          chain: page.chain,
          standard: page.standard,
          contractAddress: page.contractAddress,
          priceUsd: page.initialPriceUsd,
          supplyFormatted: page.totalSupplyFormatted,
          notes: `Contract ID ${page.contractId} · Webpage ${page.webpagePath.slice(0, 96)}`,
        });
        setStatusMessage({
          kind: 'ok',
          text: `Saved ${page.ticker} (${page.contractId}) to your Firestore Cloud Database.`,
        });
      } else {
        await createNftEdition(user.uid, {
          name: page.editionTitle.slice(0, 120),
          collection: page.collection,
          rarityScore: page.rarityScore,
          rarityTier: page.rarityTier,
          traitsSummary: page.traits.map((t) => `${t.trait_type}: ${t.value}`).join(' · '),
          ipfsCid: page.ipfsCidV1,
          sha256Hash: page.sha256Fingerprint,
        });
        setStatusMessage({
          kind: 'ok',
          text: `Archived ${page.contractId} (${page.rarityTier}) to your Firestore NFT Editions ledger.`,
        });
      }
    } catch (err) {
      setStatusMessage({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Could not save record to Firestore.',
      });
    } finally {
      setSavingCloud(false);
    }
  };

  const activeArtifact3D: Foundry3DArtifactSpec | null = useMemo(() => {
    if (!selectedPage) return null;
    if (selectedPage.kind === 'token') {
      const { accentHex, secondaryHex } = deriveAccentPalette(selectedPage);
      return {
        kind: 'token',
        title: selectedPage.name,
        subtitle: `${selectedPage.standard} · ${selectedPage.chain}`,
        contractId: selectedPage.contractId,
        contractAddress: selectedPage.contractAddress,
        pageIndex: selectedPage.pageIndex,
        badgeText: selectedPage.ticker,
        accentHex,
        secondaryHex,
        enhancementsEnabled,
      };
    }
    const fallbackPalette = deriveAccentPalette(selectedPage);
    return {
      kind: 'nft',
      title: selectedPage.editionTitle,
      subtitle: `${selectedPage.collection} · ${selectedPage.rarityTier} · ${selectedPage.maxEnhancementTier}`,
      contractId: selectedPage.contractId,
      contractAddress: selectedPage.contractAddress,
      pageIndex: selectedPage.pageIndex,
      badgeText: selectedPage.rarityTier.toUpperCase(),
      collection: selectedPage.collection,
      accentHex: selectedPage.accentHex || fallbackPalette.accentHex,
      secondaryHex: selectedPage.secondaryHex || fallbackPalette.secondaryHex,
      rarityTier: selectedPage.rarityTier,
      enhancementTier: selectedPage.maxEnhancementTier,
      iridescence: selectedPage.pbrProfile?.iridescence ?? 0,
      emissiveBoost: selectedPage.pbrProfile?.emissiveBoost ?? 0,
      anisotropyBoost: selectedPage.pbrProfile?.anisotropyBoost ?? 0.72,
      enhancementsEnabled,
    };
  }, [selectedPage, enhancementsEnabled]);

  const filteredCorePages = useMemo(() => {
    if (!portal?.corePages) return [];
    const q = portalSearch.trim().toLowerCase();
    return portal.corePages.filter((doc) => {
      if (docSectionFilter !== 'ALL' && doc.section !== docSectionFilter) return false;
      if (!q) return true;
      if (
        doc.title.toLowerCase().includes(q) ||
        doc.lead.toLowerCase().includes(q) ||
        doc.path.toLowerCase().includes(q) ||
        doc.section.toLowerCase().includes(q)
      ) {
        return true;
      }
      return doc.sections.some(
        (sec) =>
          sec.h.toLowerCase().includes(q) ||
          (sec.p ?? []).some((line) => line.toLowerCase().includes(q)) ||
          (sec.ul ?? []).some((line) => line.toLowerCase().includes(q)) ||
          (sec.codeBlock ?? '').toLowerCase().includes(q)
      );
    });
  }, [portal, portalSearch, docSectionFilter]);

  const activeCoreDoc: CoreDocPage | null = useMemo(() => {
    if (filteredCorePages.length === 0) return null;
    return (
      filteredCorePages.find((p) => p.path === selectedCoreDocPath) ?? filteredCorePages[0]
    );
  }, [filteredCorePages, selectedCoreDocPath]);

  return (
    <div className="space-y-5">
      {/* Top Control Console: Mode Switcher + Arbitrary-Precision BigInt Index Navigator */}
      <section className="rounded-xl border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--twe-border)]">
          <div>
            <h2 className="font-display text-base font-semibold text-[var(--twe-text-primary)]">
              TWE &amp; Super NFT Foundry · Three.js 3D PBR &amp; Hyper-Scale Webpage Catalog
            </h2>
            <p className="text-xs text-[var(--twe-text-secondary)] mt-0.5">
              O(1) deterministic BigInt catalog spanning 1 to 10^2048 - 1 webpages (covering the 6,850-page baseline and your 466-digit target index) with interactive Three.js studio PBR artifacts, CREATE2 smart contracts, and live HTML5 pages.
            </p>
          </div>

          {/* Functional Mode Segmented Control */}
          <div className="inline-flex items-center p-1 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] shrink-0">
            <button
              type="button"
              onClick={() => setMode('nft')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                mode === 'nft'
                  ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-semibold'
                  : 'text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)]'
              }`}
            >
              NFT Collections &amp; 3D Foundry
            </button>
            <button
              type="button"
              onClick={() => setMode('token')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                mode === 'token'
                  ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-semibold'
                  : 'text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)]'
              }`}
            >
              Token Smart-Contract Foundry
            </button>
          </div>
        </div>

        {/* BigInt Index Input & Astronomical Scale Presets */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            jumpToIndex(indexInput);
          }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end"
        >
          <label className="lg:col-span-6 block space-y-1">
            <span className="text-xs text-[var(--twe-text-secondary)]">
              Target Webpage Index (1 to 2,048 digits, exact BigInt addressing)
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={indexInput}
              onChange={(e) => setIndexInput(normalizeBigIntInput(e.target.value))}
              placeholder="Enter any integer e.g. 999999999999999999999999..."
              className="w-full px-3 py-2 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] font-mono text-xs tabular-nums text-[var(--twe-text-primary)] focus:outline-none focus:border-[#A8843E] dark:focus:border-[#D4B475]"
            />
          </label>

          {mode === 'token' ? (
            <label className="lg:col-span-3 block space-y-1">
              <span className="text-xs text-[var(--twe-text-secondary)]">Contract Standard</span>
              <select
                value={standardFilter}
                onChange={(e) => setStandardFilter(e.target.value as TokenStandard)}
                className="w-full px-2.5 py-2 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] font-mono text-xs text-[var(--twe-text-primary)]"
              >
                <option value="AUTO">Deterministic Mix</option>
                <option value="ERC-3643">ERC-3643 (T-REX)</option>
                <option value="ERC-1400">ERC-1400</option>
                <option value="ERC-20">ERC-20 Permit</option>
              </select>
            </label>
          ) : (
            <label className="lg:col-span-3 block space-y-1">
              <span className="text-xs text-[var(--twe-text-secondary)]">Flagship NFT Collection</span>
              <select
                value={collectionFilter}
                onChange={(e) => setCollectionFilter(e.target.value as CollectionFilter)}
                className="w-full px-2.5 py-2 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] font-mono text-xs text-[var(--twe-text-primary)]"
              >
                <option value="ALL">All 3 Flagship Collections</option>
                <option value="Infinite Horizon Cosmic Nexus">Infinite Horizon Cosmic Nexus</option>
                <option value="Matrix Heroes">Matrix Heroes</option>
                <option value="Mythic Titans">Mythic Titans</option>
              </select>
            </label>
          )}

          <div className="lg:col-span-3 flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold hover:opacity-90 whitespace-nowrap cursor-pointer"
            >
              Resolve Page
            </button>
            <button
              type="button"
              onClick={() => jumpToIndex(generateRandom64DigitIndex())}
              title="Jump to a random 64-digit BigInt webpage"
              className="px-3 py-2 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-medium text-[var(--twe-text-primary)] hover:border-[#A8843E] dark:hover:border-[#D4B475] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Random</span>
            </button>
          </div>
        </form>

        {/* Scale Jump Bar + Export Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {SCALE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => jumpToIndex(preset.value)}
                className={`px-2.5 py-1 rounded-md border text-xs font-mono transition-colors whitespace-nowrap cursor-pointer ${
                  cursorStart === preset.value
                    ? 'border-[#A8843E] dark:border-[#D4B475] bg-[var(--twe-gold-soft)] text-[var(--twe-text-primary)] font-semibold'
                    : 'border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)]'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/foundry/sitemap.xml"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-mono text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)] hover:border-[#A8843E] dark:hover:border-[#D4B475] whitespace-nowrap"
            >
              <Globe className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
              <span>sitemap.xml</span>
            </a>
            <button
              type="button"
              disabled={exportingZip || !rangeData}
              onClick={() => void handleExportWindowZip()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-medium text-[var(--twe-text-primary)] hover:border-[#A8843E] dark:hover:border-[#D4B475] disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              <FileArchive className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
              <span>{exportingZip ? 'Packaging ZIP...' : 'Download 12-Page Bundle (.zip)'}</span>
            </button>
          </div>
        </div>

        {/* Unboxed Catalog Summary Metrics (Zero-Pill Metadata) */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--twe-text-secondary)] pt-2 border-t border-[var(--twe-border)] font-mono tabular-nums">
          <span>Active Cursor: #{formatCompactBigInt(cursorStart)}</span>
          <span aria-hidden="true">·</span>
          <span>Precision: {cursorStart.length} digits</span>
          <span aria-hidden="true">·</span>
          <span>Addressable Capacity: 10^2048 - 1 webpages</span>
          <span aria-hidden="true">·</span>
          <span>Creator: Mauro Lomibao Dar III</span>
        </div>

        {statusMessage && (
          <div
            className={`rounded-md border px-3 py-2 text-xs flex items-center justify-between gap-2 ${
              statusMessage.kind === 'ok'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="underline text-[11px] cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </section>

      {/* Main 2-Column Workbench: Left BigInt Directory | Right 3D Studio PBR & Contract Inspector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left: 12-Row BigInt Directory Slice */}
        <div className="xl:col-span-5 rounded-xl border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--twe-border)] flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-display font-semibold text-[var(--twe-text-primary)]">
                {mode === 'token' ? 'Token Foundry Directory Slice' : 'NFT Foundry Directory Slice'}
              </div>
              <div className="text-[11px] font-mono text-[var(--twe-text-muted)] tabular-nums">
                Showing 12 webpages from #{formatCompactBigInt(cursorStart)}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => stepBigInt(-12n)}
                className="px-2 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs text-[var(--twe-text-primary)] hover:border-[#A8843E] inline-flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Prev 12</span>
              </button>
              <button
                type="button"
                onClick={() => stepBigInt(12n)}
                className="px-2 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs text-[var(--twe-text-primary)] hover:border-[#A8843E] inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Next 12</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[var(--twe-bg-elevated)] text-[11px] text-[var(--twe-text-muted)] border-b border-[var(--twe-border)]">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Page / Contract ID</th>
                  <th className="text-left px-3 py-2 font-medium">
                    {mode === 'token' ? 'Token / Address' : 'Edition / Collection'}
                  </th>
                  <th className="text-right px-3 py-2 font-medium">
                    {mode === 'token' ? 'Standard' : 'Rarity'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--twe-border)]">
                {loading && !rangeData ? (
                  Array.from({ length: 8 }).map((_, idx) => (
                    <tr key={idx}>
                      <td colSpan={3} className="px-3 py-3">
                        <div className="h-4 rounded bg-[var(--twe-bg-elevated)]" />
                      </td>
                    </tr>
                  ))
                ) : (
                  rangeData?.items.map((item) => {
                    const active = selectedPage?.pageIndex === item.pageIndex;
                    return (
                      <tr
                        key={item.pageIndex}
                        onClick={() => setSelectedPage(item)}
                        className={`cursor-pointer transition-colors ${
                          active
                            ? 'bg-[var(--twe-gold-soft)]'
                            : 'hover:bg-[var(--twe-bg-elevated)]/70'
                        }`}
                      >
                        <td className="px-3 py-2.5 align-top">
                          <div className="font-mono font-semibold text-[#A8843E] dark:text-[#D4B475] tabular-nums">
                            {item.contractId}
                          </div>
                          <div className="text-[11px] font-mono text-[var(--twe-text-muted)] tabular-nums">
                            #{formatCompactBigInt(item.pageIndex)}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <div className="font-medium text-[var(--twe-text-primary)] truncate max-w-[180px]">
                            {item.kind === 'token' ? `${item.ticker} · ${item.name}` : item.editionTitle}
                          </div>
                          <div className="text-[11px] font-mono text-[var(--twe-text-muted)] truncate max-w-[180px]">
                            {item.kind === 'token'
                              ? `${item.contractAddress.slice(0, 10)}…${item.contractAddress.slice(-6)}`
                              : item.collection}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 align-top text-right font-mono tabular-nums whitespace-nowrap">
                          {item.kind === 'token' ? (
                            <div>
                              <div className="text-[var(--twe-text-primary)]">{item.standard}</div>
                              <div className="text-[11px] text-[var(--twe-text-muted)]">
                                ${item.initialPriceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="text-[var(--twe-text-primary)]">{item.rarityTier}</div>
                              <div className="text-[11px] text-[var(--twe-text-muted)]">
                                {item.rarityScore.toFixed(1)} pts
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-2.5 border-t border-[var(--twe-border)] flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => stepBigInt(-1000n)}
              className="text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)] font-mono cursor-pointer"
            >
              -1,000 pages
            </button>
            <button
              type="button"
              onClick={() => stepBigInt(1000n)}
              className="text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)] font-mono cursor-pointer"
            >
              +1,000 pages
            </button>
          </div>
        </div>

        {/* Right: Selected Artifact 3D PBR Studio + Live Webpage + Smart Contract Inspector */}
        <div className="xl:col-span-7 rounded-xl border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] overflow-hidden">
          {selectedPage ? (
            <>
              <div className="p-4 border-b border-[var(--twe-border)] flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="text-sm font-display font-semibold text-[var(--twe-text-primary)] truncate">
                    {selectedPage.kind === 'token' ? selectedPage.name : selectedPage.editionTitle}
                  </div>
                  <div className="text-xs font-mono text-[var(--twe-text-secondary)] break-all">
                    {selectedPage.contractId} · {selectedPage.contractAddress} · {selectedPage.chain}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={savingCloud}
                    onClick={() => void handleSaveToCloudDb(selectedPage)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-medium text-[var(--twe-text-primary)] hover:border-[#A8843E] dark:hover:border-[#D4B475] cursor-pointer whitespace-nowrap"
                  >
                    <CloudUpload className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
                    <span>
                      {savingCloud ? 'Saving...' : user ? 'Save to Cloud DB' : 'Sign In to Save'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDownloadHtml(selectedPage)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold hover:opacity-90 cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .html</span>
                  </button>
                </div>
              </div>

              {/* Inspector Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-medium">
                {(
                  [
                    { id: 'studio3d', label: '3D Studio PBR', icon: Box },
                    { id: 'layers', label: 'Layer Matrix', icon: Layers },
                    {
                      id: 'manifest',
                      label: selectedPage.kind === 'nft' ? 'Art & Traits' : 'Token Spec',
                      icon: selectedPage.kind === 'nft' ? ImageIcon : Hash,
                    },
                    { id: 'webpage', label: 'Live Webpage', icon: Globe },
                    { id: 'solidity', label: 'Smart Contract', icon: Code2 },
                    { id: 'contract', label: 'Contract & ABI', icon: Cpu },
                  ] as const
                ).map((t) => {
                  const Icon = t.icon;
                  const active = inspectorTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setInspectorTab(t.id)}
                      className={`py-2.5 px-2 flex items-center justify-center gap-1.5 border-b-2 whitespace-nowrap cursor-pointer ${
                        active
                          ? 'border-[#A8843E] dark:border-[#D4B475] bg-[var(--twe-bg-surface)] text-[var(--twe-text-primary)] font-semibold'
                          : 'border-transparent text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <div className="p-4">
                {inspectorTab === 'studio3d' && activeArtifact3D && (
                  <div className="space-y-3">
                    {selectedPage.kind === 'nft' && (
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tabular-nums">
                          <span className="font-semibold text-[#A8843E] dark:text-[#D4B475]">
                            Peak Tier: {selectedPage.maxEnhancementTier}
                          </span>
                          <span className="text-[var(--twe-text-secondary)]">
                            Iridescence {selectedPage.pbrProfile.iridescence.toFixed(2)}
                          </span>
                          <span className="text-[var(--twe-text-secondary)]">
                            Emissive +{selectedPage.pbrProfile.emissiveBoost.toFixed(2)}
                          </span>
                          <span className="text-[var(--twe-text-secondary)]">
                            Anisotropy {selectedPage.pbrProfile.anisotropyBoost.toFixed(2)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEnhancementsEnabled((prev) => !prev)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-mono cursor-pointer transition-colors ${
                            enhancementsEnabled
                              ? 'border-[#A8843E] dark:border-[#D4B475] bg-[var(--twe-gold-soft)] text-[var(--twe-text-primary)] font-semibold'
                              : 'border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-secondary)]'
                          }`}
                        >
                          <Sparkles className="w-3 h-3 text-[#A8843E] dark:text-[#D4B475]" />
                          <span>
                            {enhancementsEnabled
                              ? 'Frequency PBR & Foil: ON'
                              : 'Frequency PBR & Foil: RAW'}
                          </span>
                        </button>
                      </div>
                    )}
                    <FoundryThreeStudio artifact={activeArtifact3D} heightClassName="h-[520px]" />
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[var(--twe-text-secondary)]">
                      <span>
                        Drag to orbit · Scroll to zoom · Press H for Zen zero-occlusion mode
                      </span>
                      <span>
                        Procedural PBR Group · Frequency Iridescence · RoomEnvironment IBL
                      </span>
                    </div>
                  </div>
                )}

                {inspectorTab === 'layers' && (
                  <div className="space-y-4 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--twe-border)]">
                      <div>
                        <div className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
                          Cross-Category Image Layer Asset Frequency &amp; Enhancement Matrix
                        </div>
                        <div className="text-[11px] text-[var(--twe-text-secondary)]">
                          Every SVG layer option across Cosmic Nexus, Matrix Heroes, and Mythic Titans automatically receives SVG + 3D PBR enhancements derived from its exact category weight frequency.
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(
                          [
                            { id: 'ALL', label: 'All 3' },
                            { id: 'cosmic-nexus', label: 'Cosmic Nexus' },
                            { id: 'matrix-heroes', label: 'Matrix Heroes' },
                            { id: 'mythic-titans', label: 'Mythic Titans' },
                          ] as const
                        ).map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setLayerCollectionTab(tab.id)}
                            className={`px-2.5 py-1 rounded border text-[11px] font-mono cursor-pointer ${
                              layerCollectionTab === tab.id
                                ? 'border-[#A8843E] dark:border-[#D4B475] bg-[var(--twe-gold-soft)] text-[var(--twe-text-primary)] font-semibold'
                                : 'border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-secondary)]'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {layerAnalytics ? (
                      <>
                        {/* Frequency Enhancement Tier Legend */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {layerAnalytics.enhancementLegend.map((item) => (
                            <div
                              key={item.tier}
                              className="p-2.5 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] space-y-1"
                            >
                              <div className="flex items-center justify-between gap-2 font-mono">
                                <span
                                  className="font-semibold"
                                  style={{ color: item.color }}
                                >
                                  {item.tier}
                                </span>
                                <span className="text-[11px] text-[var(--twe-text-muted)]">
                                  {item.threshold}
                                </span>
                              </div>
                              <div className="text-[11px] text-[var(--twe-text-secondary)]">
                                {item.summary}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Collection Layer Cards */}
                        <div className="space-y-5 max-h-[540px] overflow-y-auto pr-1">
                          {layerAnalytics.collections
                            .filter(
                              (col) =>
                                layerCollectionTab === 'ALL' || col.slug === layerCollectionTab
                            )
                            .map((col) => (
                              <div
                                key={col.slug}
                                className="rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-3.5 space-y-3"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--twe-border)]">
                                  <div>
                                    <div className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
                                      {col.name}
                                    </div>
                                    <div className="text-[11px] font-mono text-[var(--twe-text-muted)] tabular-nums">
                                      {col.layers.length} layers · {col.rawCombinations.toLocaleString('en-US')} raw combinations · {col.exclusions.length} exclusion rule(s)
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMode('nft');
                                      setCollectionFilter(col.name as CollectionFilter);
                                      setInspectorTab('studio3d');
                                    }}
                                    className="px-2.5 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[11px] font-mono text-[#A8843E] dark:text-[#D4B475] cursor-pointer"
                                  >
                                    Inspect in 3D Studio
                                  </button>
                                </div>

                                {col.exclusions.length > 0 && (
                                  <div className="text-[11px] font-mono text-[var(--twe-text-secondary)] bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded px-2.5 py-1.5">
                                    <span className="text-amber-600 dark:text-amber-300 font-semibold">
                                      Pre-Render Exclusions:{' '}
                                    </span>
                                    {col.exclusions.map((rule) => rule.join(' + ')).join('  |  ')}
                                  </div>
                                )}

                                <div className="space-y-3">
                                  {col.layers.map((layer) => (
                                    <div key={`${col.slug}-${layer.trait_type}`} className="space-y-2">
                                      <div className="flex items-center justify-between text-[11px] font-mono text-[var(--twe-text-primary)]">
                                        <span className="font-semibold">
                                          {layer.trait_type} ({layer.options.length} assets)
                                        </span>
                                        <span className="text-[var(--twe-text-muted)]">
                                          {layer.required ? 'Required Layer' : 'Optional Layer'} · Weight Sum {layer.totalWeight}
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {layer.options.map((opt) => (
                                          <div
                                            key={`${layer.trait_type}-${opt.name}`}
                                            className="flex items-start gap-2.5 p-2 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-surface)]"
                                          >
                                            <img
                                              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(opt.previewSvg)}`}
                                              alt={`${layer.trait_type} ${opt.name}`}
                                              referrerPolicy="no-referrer"
                                              className="w-12 h-12 rounded border border-[var(--twe-border)] shrink-0 bg-[#07131f]"
                                            />
                                            <div className="min-w-0 flex-1 space-y-1">
                                              <div className="flex items-center justify-between gap-1">
                                                <span className="font-medium text-[var(--twe-text-primary)] truncate">
                                                  {opt.name}
                                                </span>
                                                <span
                                                  className="font-mono text-[10px] font-semibold shrink-0"
                                                  style={{ color: opt.enhancement.badgeColor }}
                                                >
                                                  {opt.enhancement.tier}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--twe-text-muted)] tabular-nums">
                                                <span>{opt.enhancement.frequencyPct}% freq</span>
                                                <span>·</span>
                                                <span>-ln(p) {opt.enhancement.infoScore.toFixed(2)}</span>
                                                <span>·</span>
                                                <span>IR {opt.enhancement.iridescence.toFixed(2)}</span>
                                              </div>
                                              <div className="w-full h-1.5 rounded-full bg-[var(--twe-bg-elevated)] overflow-hidden">
                                                <div
                                                  className="h-full rounded-full"
                                                  style={{
                                                    width: `${Math.min(100, Math.max(4, opt.enhancement.frequencyPct))}%`,
                                                    backgroundColor: opt.enhancement.badgeColor,
                                                  }}
                                                />
                                              </div>
                                              <div className="text-[10px] text-[var(--twe-text-secondary)] leading-snug">
                                                {opt.enhancement.pbrEnhancement}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                        </div>
                      </>
                    ) : (
                      <div className="py-10 text-center text-[var(--twe-text-muted)] font-mono">
                        Loading cross-category image layer frequency matrix...
                      </div>
                    )}
                  </div>
                )}

                {inspectorTab === 'webpage' && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[var(--twe-text-secondary)]">
                      <span className="truncate">Route: {selectedPage.webpagePath}</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy('route', `${window.location.origin}${selectedPage.webpagePath}`)
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[var(--twe-border)] text-xs text-[var(--twe-text-primary)] cursor-pointer whitespace-nowrap"
                      >
                        {copiedKey === 'route' ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedKey === 'route' ? 'Copied URL' : 'Copy Webpage URL'}</span>
                      </button>
                    </div>
                    <iframe
                      key={`${selectedPage.webpagePath}-${collectionFilter}`}
                      src={
                        selectedPage.kind === 'nft' && collectionFilter !== 'ALL'
                          ? `${selectedPage.webpagePath}?collection=${encodeURIComponent(collectionFilter)}`
                          : selectedPage.webpagePath
                      }
                      title={`${selectedPage.contractId} standalone webpage`}
                      sandbox="allow-same-origin"
                      className="w-full h-[520px] rounded-lg border border-[var(--twe-border)] bg-[#07131f]"
                    />
                  </div>
                )}

                {inspectorTab === 'solidity' && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-mono text-[var(--twe-text-secondary)]">
                        {selectedPage.standard} · OpenZeppelin Solidity ^0.8.24
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy('sol', selectedPage.soliditySource)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[var(--twe-border)] text-xs cursor-pointer"
                        >
                          {copiedKey === 'sol' ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedKey === 'sol' ? 'Copied' : 'Copy Solidity'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            downloadBlob(
                              `${selectedPage.contractId}.sol`,
                              selectedPage.soliditySource
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[var(--twe-border)] text-xs cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download .sol</span>
                        </button>
                      </div>
                    </div>
                    <pre className="p-3.5 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] font-mono text-[11px] leading-relaxed text-[var(--twe-text-primary)] max-h-[500px] overflow-auto">
                      {selectedPage.soliditySource}
                    </pre>
                  </div>
                )}

                {inspectorTab === 'contract' && (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                      <div className="p-3 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)]">
                        <div className="text-[11px] text-[var(--twe-text-muted)]">Contract ID</div>
                        <div className="mt-1 text-[var(--twe-text-primary)] break-all font-semibold">
                          {selectedPage.contractId}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)]">
                        <div className="text-[11px] text-[var(--twe-text-muted)]">
                          Deterministic CREATE2 Address
                        </div>
                        <div className="mt-1 text-[#A8843E] dark:text-[#D4B475] break-all">
                          {selectedPage.contractAddress}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)]">
                        <div className="text-[11px] text-[var(--twe-text-muted)]">
                          CREATE2 Salt (bytes32)
                        </div>
                        <div className="mt-1 text-[var(--twe-text-primary)] break-all">
                          {selectedPage.saltBytes32}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)]">
                        <div className="text-[11px] text-[var(--twe-text-muted)]">
                          IPFS CIDv1 &amp; SHA-256 Digest
                        </div>
                        <div className="mt-1 text-[var(--twe-text-primary)] break-all">
                          {selectedPage.ipfsCidV1}
                        </div>
                      </div>
                    </div>

                    {selectedPage.kind === 'token' && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[var(--twe-text-secondary)]">
                            EVM Creation Bytecode ({selectedPage.bytecodeSizeBytes} bytes)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy('bytecode', selectedPage.bytecodeHex)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--twe-border)] text-xs cursor-pointer"
                          >
                            {copiedKey === 'bytecode' ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>Copy Bytecode</span>
                          </button>
                        </div>
                        <pre className="p-3 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] font-mono text-[11px] break-all whitespace-pre-wrap text-[var(--twe-text-primary)]">
                          {selectedPage.bytecodeHex}
                        </pre>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[var(--twe-text-secondary)]">
                          Contract ABI JSON
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy('abi', selectedPage.abiJson)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--twe-border)] text-xs cursor-pointer"
                        >
                          {copiedKey === 'abi' ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>Copy ABI</span>
                        </button>
                      </div>
                      <pre className="p-3 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] font-mono text-[11px] max-h-60 overflow-auto text-[var(--twe-text-secondary)]">
                        {selectedPage.abiJson}
                      </pre>
                    </div>
                  </div>
                )}

                {inspectorTab === 'manifest' && selectedPage.kind === 'nft' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                      <div className="md:col-span-5 space-y-2">
                        <div className="rounded-lg overflow-hidden border border-[var(--twe-border)] bg-[#07131f]">
                          <img
                            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(
                              enhancementsEnabled ? selectedPage.svgMarkup : selectedPage.rawSvgMarkup
                            )}`}
                            alt={selectedPage.editionTitle}
                            referrerPolicy="no-referrer"
                            className="w-full h-auto block"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setEnhancementsEnabled((prev) => !prev)}
                          className="w-full px-3 py-1.5 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[11px] font-mono text-[var(--twe-text-primary)] hover:border-[#A8843E] dark:hover:border-[#D4B475] cursor-pointer"
                        >
                          {enhancementsEnabled
                            ? `Viewing Enhanced SVG (${selectedPage.maxEnhancementTier}) · Switch to Raw`
                            : 'Viewing Raw Canonical SVG · Switch to Enhanced'}
                        </button>
                      </div>
                      <div className="md:col-span-7 space-y-3 text-xs">
                        <p className="text-[var(--twe-text-secondary)] leading-relaxed">
                          {selectedPage.narrative}
                        </p>
                        <div className="font-mono text-[var(--twe-text-primary)] tabular-nums">
                          Rarity Score (-ln p): {selectedPage.rarityScore.toFixed(2)} pts · Tier:{' '}
                          {selectedPage.rarityTier} · Peak: {selectedPage.maxEnhancementTier}
                        </div>
                        <table className="w-full border-collapse text-xs">
                          <thead className="border-b border-[var(--twe-border)] text-[var(--twe-text-muted)]">
                            <tr>
                              <th className="text-left py-1.5 font-medium">Layer</th>
                              <th className="text-left py-1.5 font-medium">Trait</th>
                              <th className="text-right py-1.5 font-medium">Freq</th>
                              <th className="text-right py-1.5 font-medium">-ln(p)</th>
                              <th className="text-right py-1.5 font-medium">Enhancement</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--twe-border)]">
                            {selectedPage.traits.map((tr) => (
                              <tr key={tr.trait_type}>
                                <td className="py-1.5 text-[var(--twe-text-muted)]">
                                  {tr.trait_type}
                                </td>
                                <td className="py-1.5 text-[var(--twe-text-primary)] font-medium">
                                  {tr.value}
                                </td>
                                <td className="py-1.5 text-right font-mono tabular-nums text-[var(--twe-text-secondary)]">
                                  {tr.weightPct}%
                                </td>
                                <td className="py-1.5 text-right font-mono tabular-nums text-[var(--twe-text-secondary)]">
                                  {tr.infoScore.toFixed(2)}
                                </td>
                                <td
                                  className="py-1.5 text-right font-mono text-[11px] font-semibold whitespace-nowrap"
                                  style={{ color: tr.enhancement.badgeColor }}
                                >
                                  {tr.enhancement.tier}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              downloadBlob(
                                `${selectedPage.contractId}.svg`,
                                enhancementsEnabled
                                  ? selectedPage.svgMarkup
                                  : selectedPage.rawSvgMarkup,
                                'image/svg+xml'
                              )
                            }
                            className="px-3 py-1.5 rounded-md border border-[var(--twe-border)] text-xs font-medium cursor-pointer"
                          >
                            Download SVG
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              downloadBlob(
                                `${selectedPage.contractId}-metadata.json`,
                                selectedPage.metadataJson,
                                'application/json'
                              )
                            }
                            className="px-3 py-1.5 rounded-md border border-[var(--twe-border)] text-xs font-medium cursor-pointer"
                          >
                            Export ERC-721 JSON
                          </button>
                        </div>
                      </div>
                    </div>
                    <pre className="p-3 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] font-mono text-[11px] max-h-56 overflow-auto text-[var(--twe-text-secondary)]">
                      {selectedPage.metadataJson}
                    </pre>
                  </div>
                )}

                {inspectorTab === 'manifest' && selectedPage.kind === 'token' && (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono tabular-nums">
                      <div className="p-3 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)]">
                        <div className="text-[11px] text-[var(--twe-text-muted)]">Ticker</div>
                        <div className="mt-1 font-semibold text-[#A8843E] dark:text-[#D4B475]">
                          {selectedPage.ticker}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)]">
                        <div className="text-[11px] text-[var(--twe-text-muted)]">Supply Cap</div>
                        <div className="mt-1 text-[var(--twe-text-primary)]">
                          {selectedPage.totalSupplyFormatted}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)]">
                        <div className="text-[11px] text-[var(--twe-text-muted)]">
                          Reference Price
                        </div>
                        <div className="mt-1 text-[var(--twe-text-primary)]">
                          ${selectedPage.initialPriceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-[11px] font-mono text-[var(--twe-text-muted)]">
                        Exact Arbitrary-Precision BigInt Page Index ({selectedPage.pageIndex.length}{' '}
                        digits)
                      </div>
                      <pre className="p-3 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] font-mono text-[11px] break-all whitespace-pre-wrap text-[var(--twe-text-primary)]">
                        {selectedPage.pageIndex}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Flagship Collections Overview + Searchable Documentation & Completion Checklist */}
      {portal && (
        <section className="rounded-xl border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] p-4 sm:p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--twe-border)]">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
              <div>
                <h3 className="font-display text-sm font-semibold text-[var(--twe-text-primary)]">
                  TWE &amp; Super NFT Foundry Documentation, Collections &amp; Client-Side Search
                </h3>
                <p className="text-xs text-[var(--twe-text-secondary)]">
                  Switch directly into any flagship collection’s 3D PBR sculpture or search TWE Docs, NFT Foundry specs, FAQ, Glossary &amp; Roadmap.
                </p>
              </div>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--twe-text-muted)]" />
              <input
                type="text"
                value={portalSearch}
                onChange={(e) => setPortalSearch(e.target.value)}
                placeholder="Search docs, traits, CREATE2, FAQ..."
                className="w-full pl-8 pr-3 py-1.5 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs text-[var(--twe-text-primary)] placeholder:text-[var(--twe-text-muted)] focus:outline-none focus:border-[#A8843E] dark:focus:border-[#D4B475]"
              />
            </div>
          </div>

          {/* 3 Flagship Collections Quick-Launch Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {portal.collections.map((col) => {
              const active = mode === 'nft' && collectionFilter === col.name;
              return (
                <button
                  key={col.name}
                  type="button"
                  onClick={() => {
                    setMode('nft');
                    setCollectionFilter(col.name);
                    setInspectorTab('studio3d');
                  }}
                  className={`text-left p-3.5 rounded-lg border transition-colors cursor-pointer ${
                    active
                      ? 'border-[#A8843E] dark:border-[#D4B475] bg-[var(--twe-gold-soft)]'
                      : 'border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] hover:border-[var(--twe-border-strong)]'
                  }`}
                >
                  <div className="text-xs font-display font-semibold text-[var(--twe-text-primary)]">
                    {col.name}
                  </div>
                  <div className="text-[11px] font-mono text-[#A8843E] dark:text-[#D4B475] mt-0.5">
                    {col.sculptureStyle}
                  </div>
                  <p className="text-xs text-[var(--twe-text-secondary)] mt-1.5 leading-relaxed">
                    {col.description}
                  </p>
                  <div className="mt-2 pt-2 border-t border-[var(--twe-border)] flex items-center justify-between text-[11px] font-mono text-[var(--twe-text-muted)] tabular-nums">
                    <span>Baseline: {col.baselineStaticCount.toLocaleString()}</span>
                    <span>O(1) Max: 10^2048 - 1</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Sandbox Boundary Notice */}
          {portal.sandboxText && (
            <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3.5 py-2.5 text-xs text-[var(--twe-text-primary)] flex flex-wrap items-center gap-2">
              <span className="font-mono font-semibold text-amber-600 dark:text-amber-300">
                SANDBOX NOTICE
              </span>
              <span className="text-[var(--twe-text-secondary)]">{portal.sandboxText}</span>
            </div>
          )}

          {/* 29-Page Hand-Written Documentation Reader + Publishing Checklist */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
            {/* Left: Section Filters + Scrollable 29-Page Index */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(['ALL', 'TWE', 'Foundry', 'About'] as const).map((sec) => {
                  const count =
                    sec === 'ALL'
                      ? portal.corePages.length
                      : portal.corePages.filter((p) => p.section === sec).length;
                  return (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setDocSectionFilter(sec)}
                      className={`px-2.5 py-1 rounded-md border text-xs font-mono transition-colors cursor-pointer ${
                        docSectionFilter === sec
                          ? 'border-[#A8843E] dark:border-[#D4B475] bg-[var(--twe-gold-soft)] text-[var(--twe-text-primary)] font-semibold'
                          : 'border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)]'
                      }`}
                    >
                      {sec} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] divide-y divide-[var(--twe-border)] max-h-[460px] overflow-y-auto">
                {filteredCorePages.map((doc) => {
                  const selected = activeCoreDoc?.path === doc.path;
                  return (
                    <button
                      key={doc.path}
                      type="button"
                      onClick={() => setSelectedCoreDocPath(doc.path)}
                      className={`w-full text-left px-3 py-2.5 transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[var(--twe-gold-soft)]'
                          : 'hover:bg-[var(--twe-bg-surface)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#A8843E] dark:text-[#D4B475]">
                          {doc.section}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--twe-text-muted)] truncate">
                          /{doc.path}
                        </span>
                      </div>
                      <div className="text-xs font-display font-semibold text-[var(--twe-text-primary)] mt-0.5">
                        {doc.title}
                      </div>
                      <div className="text-[11px] text-[var(--twe-text-secondary)] line-clamp-1 mt-0.5">
                        {doc.lead}
                      </div>
                    </button>
                  );
                })}
                {filteredCorePages.length === 0 && (
                  <div className="p-6 text-center text-xs text-[var(--twe-text-muted)]">
                    No core documentation pages match “{portalSearch}”.
                  </div>
                )}
              </div>
            </div>

            {/* Center: Full Active Documentation Article Reader */}
            <div className="lg:col-span-5 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-4 sm:p-5 space-y-4">
              {activeCoreDoc ? (
                <>
                  <div className="pb-3 border-b border-[var(--twe-border)] space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#A8843E] dark:text-[#D4B475]">
                        {activeCoreDoc.section} · /{activeCoreDoc.path}
                      </span>
                      <a
                        href={`/${activeCoreDoc.path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[11px] font-mono text-[var(--twe-text-primary)] hover:border-[#A8843E] dark:hover:border-[#D4B475]"
                      >
                        <Globe className="w-3 h-3 text-[#A8843E] dark:text-[#D4B475]" />
                        <span>Open Signal Terminal HTML</span>
                      </a>
                    </div>
                    <h4 className="text-base font-display font-semibold text-[var(--twe-text-primary)]">
                      {activeCoreDoc.title}
                    </h4>
                    <p className="text-xs text-[var(--twe-text-secondary)] leading-relaxed">
                      {activeCoreDoc.lead}
                    </p>
                  </div>

                  <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                    {activeCoreDoc.sections.map((sec) => (
                      <div key={sec.h} className="space-y-1.5">
                        <h5 className="text-xs font-display font-semibold text-[#A8843E] dark:text-[#D4B475]">
                          {sec.h}
                        </h5>
                        {sec.p?.map((para, pIdx) => (
                          <p
                            key={pIdx}
                            className="text-xs text-[var(--twe-text-secondary)] leading-relaxed"
                          >
                            {para}
                          </p>
                        ))}
                        {sec.codeBlock && (
                          <pre className="p-3 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] font-mono text-[11px] text-[var(--twe-text-primary)] overflow-x-auto">
                            {sec.codeBlock}
                          </pre>
                        )}
                        {sec.ul && sec.ul.length > 0 && (
                          <ul className="list-disc pl-4 space-y-1 text-xs text-[var(--twe-text-secondary)]">
                            {sec.ul.map((item, uIdx) => (
                              <li key={uIdx} className="leading-relaxed">
                                {item}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-xs text-[var(--twe-text-muted)] py-10 text-center">
                  Select a documentation page from the index to read.
                </div>
              )}
            </div>

            {/* Right: Foundry Verification Checklist */}
            <div className="lg:col-span-3 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-4 space-y-3">
              <div className="text-xs font-display font-semibold text-[var(--twe-text-primary)]">
                Foundry Publishing &amp; Feature Checklist
              </div>
              <ul className="space-y-2 text-xs text-[var(--twe-text-secondary)]">
                {portal.checklist.map((item) => (
                  <li key={item.label} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
