import React, { useCallback, useEffect, useState } from 'react';
import JSZip from 'jszip';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Copy,
  Download,
  ExternalLink,
  FolderArchive,
  Globe,
  Layers,
  Plug,
  Search,
  Shuffle,
} from 'lucide-react';

interface CorePluginSpec {
  id: string;
  name: string;
  phase: 'INPUT' | 'GENERATOR' | 'RENDERER' | 'EXPORTER';
  interfaceContract: string;
  version: string;
  enabledByDefault: boolean;
  overheadMs: number;
  description: string;
  outputTarget: string;
}

interface LayerSpec {
  id: string;
  zIndex: number;
  name: string;
  folderPath: string;
  traitOptions: string[];
  blendMode: string;
  opacityPct: number;
  enabled: boolean;
}

interface ExternalTargetSpec {
  id: string;
  label: string;
  protocol: string;
  folderUri: string;
  region: string;
}

interface StorageDispatchJob {
  jobId: string;
  collectionName: string;
  declaredTotalCollectionSize: string;
  generatedSampleCount: number;
  storageTarget: ExternalTargetSpec;
  activePlugins: string[];
  layerOrder: string[];
  totalOverheadMs: number;
  status: string;
  triggeredAt: string;
  metadataFolderUri: string;
  imagesFolderUri: string;
  merkleBatchRoot: string;
  files: Array<{
    relativePath: string;
    folder: string;
    mimeType: string;
    sizeBytes: number;
    sha256Digest: string;
    externalUri: string;
    content: string;
  }>;
}

interface ArtEnginePageSummary {
  pageIndex: string;
  pageId: string;
  editionName: string;
  rarityTier: string;
  rarityScore: number;
  orderManagementOverheadMs: number;
  metadataFileUri: string;
  webpagePath: string;
}

interface ArtEngineRangePayload {
  startIndex: string;
  ceilingIndex: string;
  ceilingDigits: number;
  scientificCeiling: string;
  maxSupportedDigits: number;
  items: ArtEnginePageSummary[];
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

const UINT256_MAX =
  '115792089237316195423570985008687907853269984665640564039457584007913129639935';

function normalizeDigits(raw: string): string {
  const ascii = raw.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => SUPERSCRIPT_MAP[c] ?? '');
  return ascii.replace(/[^0-9]/g, '').slice(0, 2048) || '1';
}

function abbrevIdx(idx: string): string {
  if (idx.length <= 15) return idx.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${idx.slice(0, 6)}…${idx.slice(-6)} (${idx.length}d)`;
}

function random64Digit(): string {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += String(bytes[i] % 10) + String((bytes[i] >> 4) % 10);
  }
  return out.replace(/^0+/, '') || '1';
}

export const ArtEngineLayerManager: React.FC = () => {
  const [tab, setTab] = useState<'layers' | 'storage' | 'webpages'>('layers');

  const [plugins, setPlugins] = useState<CorePluginSpec[]>([]);
  const [enabledPluginIds, setEnabledPluginIds] = useState<string[]>([]);
  const [layers, setLayers] = useState<LayerSpec[]>([]);
  const [targets, setTargets] = useState<ExternalTargetSpec[]>([]);
  const [dispatchHistory, setDispatchHistory] = useState<StorageDispatchJob[]>([]);

  // External storage trigger form
  const [collectionName, setCollectionName] = useState('TWE Sovereign HashLips Drop');
  const [totalCollectionSize, setTotalCollectionSize] = useState('10000');
  const [sampleCount, setSampleCount] = useState('6');
  const [selectedTargetId, setSelectedTargetId] = useState('ipfs-cidv1');
  const [triggering, setTriggering] = useState(false);
  const [latestJob, setLatestJob] = useState<StorageDispatchJob | null>(null);

  // 590-digit ArtEngineLayerManager webpages state
  const [cursorIndex, setCursorIndex] = useState('1');
  const [jumpInput, setJumpInput] = useState('1');
  const [pluginFilter, setPluginFilter] = useState('ALL');
  const [range, setRange] = useState<ArtEngineRangePayload | null>(null);
  const [selectedPageIdx, setSelectedPageIdx] = useState('1');
  const [copiedUrl, setCopiedUrl] = useState(false);

  const loadPluginConfig = useCallback(async () => {
    const res = await fetch('/api/twe/art-engine/plugins');
    if (!res.ok) return;
    const json = (await res.json()) as {
      plugins: CorePluginSpec[];
      layers: LayerSpec[];
      storageTargets: ExternalTargetSpec[];
      dispatchHistory: StorageDispatchJob[];
    };
    setPlugins(json.plugins);
    setEnabledPluginIds((prev) => (prev.length ? prev : json.plugins.map((p) => p.id)));
    setLayers((prev) => (prev.length ? prev : json.layers));
    setTargets(json.storageTargets);
    setDispatchHistory(json.dispatchHistory);
    if (json.dispatchHistory.length > 0 && !latestJob) {
      setLatestJob(json.dispatchHistory[0]);
    }
  }, [latestJob]);

  const loadWebpageRange = useCallback(async (start: string, plug: string) => {
    const qs = new URLSearchParams({ start, limit: '10', plugin: plug });
    const res = await fetch(`/api/twe/art-engine/pages/range?${qs.toString()}`);
    if (!res.ok) return;
    const json = (await res.json()) as ArtEngineRangePayload;
    setRange(json);
    if (json.items.length > 0) {
      setSelectedPageIdx((prev) =>
        json.items.some((it) => it.pageIndex === prev) ? prev : json.items[0].pageIndex
      );
    }
  }, []);

  useEffect(() => {
    void loadPluginConfig();
  }, [loadPluginConfig]);

  useEffect(() => {
    void loadWebpageRange(cursorIndex, pluginFilter);
  }, [cursorIndex, pluginFilter, loadWebpageRange]);

  const moveLayer = (index: number, delta: -1 | 1) => {
    setLayers((prev) => {
      const nextIdx = index + delta;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(nextIdx, 0, moved);
      return copy.map((l, i) => ({ ...l, zIndex: i + 1 }));
    });
  };

  const toggleLayer = (id: string) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l)));
  };

  const togglePlugin = (id: string) => {
    setEnabledPluginIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const totalOverheadMs = plugins
    .filter((p) => enabledPluginIds.includes(p.id))
    .reduce((acc, p) => acc + p.overheadMs, 0);

  const handleTriggerExternalStorage = async (e: React.FormEvent) => {
    e.preventDefault();
    setTriggering(true);
    try {
      const res = await fetch('/api/twe/art-engine/trigger-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionName,
          totalCollectionSize,
          sampleCount: Number(sampleCount) || 6,
          storageTargetId: selectedTargetId,
          enabledPluginIds,
          layerOrder: layers.filter((l) => l.enabled).map((l) => l.name),
        }),
      });
      if (res.ok) {
        const job = (await res.json()) as StorageDispatchJob;
        setLatestJob(job);
        setDispatchHistory((prev) => [job, ...prev.filter((j) => j.jobId !== job.jobId)]);
        setTab('storage');
      }
    } finally {
      setTriggering(false);
    }
  };

  const handleDownloadFolderZip = async (job: StorageDispatchJob) => {
    const zip = new JSZip();
    for (const f of job.files) {
      zip.file(f.relativePath, f.content);
    }
    const manifest = {
      jobId: job.jobId,
      collectionName: job.collectionName,
      declaredTotalCollectionSize: job.declaredTotalCollectionSize,
      externalStorageTarget: job.storageTarget,
      metadataFolderUri: job.metadataFolderUri,
      imagesFolderUri: job.imagesFolderUri,
      merkleBatchRoot: job.merkleBatchRoot,
      activePlugins: job.activePlugins,
      layerOrder: job.layerOrder,
    };
    zip.file('storage-dispatch-manifest.json', JSON.stringify(manifest, null, 2));
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `twe-art-engine-${job.jobId.toLowerCase()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const jumpToPage = (raw: string) => {
    const clean = normalizeDigits(raw);
    setCursorIndex(clean);
    setJumpInput(clean);
    setSelectedPageIdx(clean);
  };

  const shiftPage = (delta: bigint) => {
    const next = BigInt(normalizeDigits(cursorIndex)) + delta;
    jumpToPage(next < 1n ? '1' : next.toString());
  };

  const activePage =
    range?.items.find((it) => it.pageIndex === selectedPageIdx) ?? range?.items[0] ?? null;

  const handleCopyUrl = async () => {
    if (!activePage) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${activePage.webpagePath}`);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleDownloadHtml = async () => {
    if (!activePage) return;
    const res = await fetch(activePage.webpagePath);
    if (!res.ok) return;
    const html = await res.text();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `twe-art-engine-page-${activePage.pageIndex.slice(0, 12)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] overflow-hidden">
      {/* Header & Tabs */}
      <div className="px-4 py-3.5 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
            <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
              ArtEngineLayerManager · HashLips Modular Core Plugins &amp; External Storage Pipeline
            </h3>
          </div>
          <p className="text-xs text-[var(--twe-text-secondary)] mt-0.5">
            Order-management layer stack ({layers.filter((l) => l.enabled).length} active layers ·{' '}
            <span className="font-mono text-emerald-600 dark:text-emerald-400">
              {totalOverheadMs.toFixed(1)} ms overhead
            </span>
            ), external folder triggers, and{' '}
            <span className="font-mono text-[#A8843E] dark:text-[#D4B475]">
              {range ? `${range.ceilingDigits}-digit webpages (${range.scientificCeiling})` : '590-digit webpages'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'layers', label: 'Layers & Core Plugins', icon: Plug },
              { id: 'storage', label: `Metadata & External Storage (${dispatchHistory.length})`, icon: CloudUpload },
              { id: 'webpages', label: '590-Digit Webpages', icon: Globe },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                  tab === t.id
                    ? 'bg-[#A8843E] text-white'
                    : 'bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] text-[var(--twe-text-secondary)] hover:border-[#D4B475]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: LAYER ORDER MANAGEMENT + MODULAR HASHLIPS CORE PLUGINS */}
      {tab === 'layers' && (
        <div className="p-4 grid grid-cols-1 xl:grid-cols-12 gap-4">
          <div className="xl:col-span-6 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-display font-semibold text-[var(--twe-text-primary)]">
                NFT Image Layer Order Management Stack
              </span>
              <span className="font-mono text-[11px] text-[var(--twe-text-muted)]">
                Z-Index Bottom → Top
              </span>
            </div>
            <div className="divide-y divide-[var(--twe-border)] rounded-lg border border-[var(--twe-border)] overflow-hidden">
              {layers.map((lyr, idx) => (
                <div
                  key={lyr.id}
                  className="px-3 py-2.5 bg-[var(--twe-bg-elevated)] flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] text-[#A8843E] dark:text-[#D4B475]">
                        Z-{lyr.zIndex}
                      </span>
                      <span className="font-semibold text-[var(--twe-text-primary)]">{lyr.name}</span>
                      <span className="font-mono text-[10px] text-[var(--twe-text-muted)] truncate">
                        {lyr.folderPath}
                      </span>
                    </div>
                    <div className="text-[11px] text-[var(--twe-text-secondary)] mt-0.5 truncate">
                      {lyr.traitOptions.join(' · ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveLayer(idx, -1)}
                      disabled={idx === 0}
                      aria-label={`Move ${lyr.name} up`}
                      className="p-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] disabled:opacity-35 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLayer(idx, 1)}
                      disabled={idx === layers.length - 1}
                      aria-label={`Move ${lyr.name} down`}
                      className="p-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] disabled:opacity-35 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleLayer(lyr.id)}
                      className={`px-2 py-1 rounded text-[10px] font-mono font-semibold cursor-pointer ${
                        lyr.enabled
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-[var(--twe-bg-surface)] text-[var(--twe-text-muted)]'
                      }`}
                    >
                      {lyr.enabled ? 'ACTIVE' : 'MUTED'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="xl:col-span-6 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-display font-semibold text-[var(--twe-text-primary)]">
                HashLips Generation Engine Modular Core Plugins
              </span>
              <span className="font-mono text-[11px] text-[#A8843E] dark:text-[#D4B475]">
                {enabledPluginIds.length} / {plugins.length} Enabled
              </span>
            </div>
            <div className="space-y-2">
              {plugins.map((plug) => {
                const enabled = enabledPluginIds.includes(plug.id);
                return (
                  <div
                    key={plug.id}
                    className={`rounded-lg border p-3 text-xs transition-colors ${
                      enabled
                        ? 'border-[#A8843E]/50 dark:border-[#D4B475]/50 bg-[var(--twe-bg-elevated)]'
                        : 'border-[var(--twe-border)] bg-[var(--twe-bg-surface)] opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--twe-gold-soft)] text-[#A8843E] dark:text-[#D4B475]">
                          {plug.phase}
                        </span>
                        <span className="font-mono font-semibold text-[var(--twe-text-primary)] truncate">
                          {plug.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => togglePlugin(plug.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold cursor-pointer shrink-0 ${
                          enabled
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'border border-[var(--twe-border)] text-[var(--twe-text-muted)]'
                        }`}
                      >
                        {enabled ? 'MOUNTED' : 'DISABLED'}
                      </button>
                    </div>
                    <div className="text-[11px] text-[var(--twe-text-secondary)] mt-1">
                      {plug.description}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-[var(--twe-text-muted)]">
                      <span>{plug.interfaceContract}</span>
                      <span>
                        {plug.overheadMs} ms · {plug.outputTarget}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: METADATA FOLDER GENERATION & EXTERNAL STORAGE TRIGGER */}
      {tab === 'storage' && (
        <div className="p-4 grid grid-cols-1 xl:grid-cols-12 gap-4">
          <form
            onSubmit={handleTriggerExternalStorage}
            className="xl:col-span-5 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-4 space-y-3 h-fit text-xs"
          >
            <div className="flex items-center gap-2 font-display font-semibold text-[var(--twe-text-primary)]">
              <CloudUpload className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
              <span>Generate Metadata Folder &amp; Trigger External Storage</span>
            </div>

            <label className="block space-y-1">
              <span className="text-[10px] uppercase text-[var(--twe-text-muted)]">Collection Name</span>
              <input
                type="text"
                required
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-primary)]"
              />
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              <label className="block space-y-1">
                <span className="text-[10px] uppercase text-[var(--twe-text-muted)]">
                  Total Collection Size (BigInt)
                </span>
                <input
                  type="text"
                  value={totalCollectionSize}
                  onChange={(e) => setTotalCollectionSize(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] font-mono text-[var(--twe-text-primary)]"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] uppercase text-[var(--twe-text-muted)]">
                  Files to Materialize (1–20)
                </span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={sampleCount}
                  onChange={(e) => setSampleCount(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] font-mono text-[var(--twe-text-primary)]"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '3,612', val: '3612' },
                { label: '10,000', val: '10000' },
                { label: '1,000,000', val: '1000000' },
                { label: '590-Digit Ceiling', val: range?.ceilingIndex || '999999999999999999' },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setTotalCollectionSize(p.val)}
                  className="px-2 py-0.5 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] hover:border-[#D4B475] font-mono text-[10px] cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <label className="block space-y-1">
              <span className="text-[10px] uppercase text-[var(--twe-text-muted)]">
                External Storage Folder Target
              </span>
              <select
                value={selectedTargetId}
                onChange={(e) => setSelectedTargetId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-primary)]"
              >
                {targets.map((tg) => (
                  <option key={tg.id} value={tg.id}>
                    {tg.label} ({tg.protocol})
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={triggering}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-md bg-[#A8843E] hover:bg-[#937131] text-white font-semibold cursor-pointer disabled:opacity-50"
            >
              <CloudUpload className="w-3.5 h-3.5" />
              <span>
                {triggering
                  ? 'Syncing Metadata & Images...'
                  : 'Generate Metadata Folder & Trigger External Storage'}
              </span>
            </button>
          </form>

          <div className="xl:col-span-7 space-y-3 text-xs">
            {latestJob ? (
              <div className="rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-mono font-bold text-[#A8843E] dark:text-[#D4B475]">
                      {latestJob.jobId} · {latestJob.status}
                    </div>
                    <div className="text-[11px] text-[var(--twe-text-secondary)]">
                      {latestJob.collectionName} · Target Size: {abbrevIdx(latestJob.declaredTotalCollectionSize)} ·{' '}
                      {latestJob.files.length} files dispatched
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDownloadFolderZip(latestJob)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#A8843E] text-white text-xs font-semibold hover:bg-[#937131] cursor-pointer"
                  >
                    <FolderArchive className="w-3.5 h-3.5" />
                    Download Folder (.ZIP)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[10.5px]">
                  <div className="p-2 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] break-all">
                    <span className="text-[var(--twe-text-muted)] block">Metadata Folder URI</span>
                    {latestJob.metadataFolderUri}
                  </div>
                  <div className="p-2 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] break-all">
                    <span className="text-[var(--twe-text-muted)] block">Images Folder URI</span>
                    {latestJob.imagesFolderUri}
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto border border-[var(--twe-border)] rounded bg-[var(--twe-bg-surface)] divide-y divide-[var(--twe-border)]">
                  {latestJob.files.map((f) => (
                    <div key={f.relativePath} className="px-3 py-2 flex items-center justify-between gap-2 font-mono text-[11px]">
                      <div className="min-w-0">
                        <div className="text-[var(--twe-text-primary)]">{f.relativePath}</div>
                        <div className="text-[10px] text-[var(--twe-text-muted)] truncate">
                          {f.externalUri}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-emerald-600 dark:text-emerald-400">{f.sizeBytes} B</div>
                        <div className="text-[10px] text-[var(--twe-text-muted)]">
                          {f.sha256Digest.slice(0, 12)}…
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-[var(--twe-border)] p-8 text-center text-[var(--twe-text-muted)]">
                Configure your collection size and external storage bucket on the left, then click
                &ldquo;Generate Metadata Folder &amp; Trigger External Storage&rdquo; to dispatch generated metadata and NFT image files.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: HYPER-SCALE 590-DIGIT ART ENGINE LAYER MANAGER WEBPAGES */}
      {tab === 'webpages' && (
        <div>
          <div className="p-4 border-b border-[var(--twe-border)] space-y-2.5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                jumpToPage(jumpInput);
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[var(--twe-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  placeholder="Enter any arbitrary-precision ArtEngineLayerManager webpage index (up to 2,048 digits)..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-xs text-[var(--twe-text-primary)]"
                />
              </div>
              <select
                value={pluginFilter}
                onChange={(e) => setPluginFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-xs text-[var(--twe-text-primary)]"
              >
                <option value="ALL">All Core Plugins</option>
                {plugins.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-md bg-[#A8843E] hover:bg-[#937131] text-white text-xs font-medium cursor-pointer shrink-0"
              >
                Jump to Page
              </button>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => jumpToPage('1')}
                  className="px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[11px] cursor-pointer"
                >
                  #1
                </button>
                <button
                  type="button"
                  onClick={() => jumpToPage(UINT256_MAX)}
                  className="px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[11px] cursor-pointer"
                >
                  2^256 - 1
                </button>
                {range?.ceilingIndex && (
                  <button
                    type="button"
                    onClick={() => jumpToPage(range.ceilingIndex)}
                    className="px-2.5 py-1 rounded bg-[var(--twe-gold-soft)] border border-[#A8843E] dark:border-[#D4B475] font-mono text-[11px] font-medium text-[#A8843E] dark:text-[#D4B475] cursor-pointer"
                  >
                    Target Ceiling ({range.ceilingDigits} digits)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => jumpToPage(random64Digit())}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[11px] cursor-pointer"
                >
                  <Shuffle className="w-3 h-3" />
                  Random 64-Digit
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => shiftPage(-1000n)}
                  className="px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[11px] cursor-pointer"
                >
                  -1,000
                </button>
                <button
                  type="button"
                  onClick={() => shiftPage(-10n)}
                  className="inline-flex items-center gap-0.5 px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-[11px] cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev 10
                </button>
                <button
                  type="button"
                  onClick={() => shiftPage(10n)}
                  className="inline-flex items-center gap-0.5 px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-[11px] cursor-pointer"
                >
                  Next 10
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => shiftPage(1000n)}
                  className="px-2 py-1 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[11px] cursor-pointer"
                >
                  +1,000
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 divide-y xl:divide-y-0 xl:divide-x divide-[var(--twe-border)]">
            <div className="xl:col-span-5 divide-y divide-[var(--twe-border)] max-h-[490px] overflow-y-auto">
              {range?.items.map((item) => {
                const sel = activePage?.pageIndex === item.pageIndex;
                return (
                  <button
                    key={item.pageIndex}
                    type="button"
                    onClick={() => setSelectedPageIdx(item.pageIndex)}
                    className={`w-full text-left px-4 py-2.5 cursor-pointer ${
                      sel ? 'bg-[var(--twe-gold-soft)]' : 'hover:bg-[var(--twe-bg-elevated)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-[#A8843E] dark:text-[#D4B475]">
                        {item.pageId}
                      </span>
                      <span className="font-mono text-[11px] text-[var(--twe-text-muted)]">
                        #{abbrevIdx(item.pageIndex)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between text-[11px]">
                      <span className="text-[var(--twe-text-primary)] truncate">{item.editionName}</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                        {item.rarityTier} · {item.orderManagementOverheadMs}ms
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="xl:col-span-7 flex flex-col">
              {activePage && (
                <>
                  <div className="px-4 py-2 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-[var(--twe-text-secondary)] truncate max-w-[260px]">
                      {activePage.webpagePath}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleCopyUrl()}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] text-[11px] cursor-pointer"
                      >
                        {copiedUrl ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        {copiedUrl ? 'Copied' : 'Copy URL'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDownloadHtml()}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] text-[11px] cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        .HTML
                      </button>
                      <a
                        href={activePage.webpagePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] text-[11px] text-[#A8843E] dark:text-[#D4B475]"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open
                      </a>
                    </div>
                  </div>
                  <iframe
                    key={activePage.webpagePath}
                    title={`ArtEngineLayerManager Webpage ${activePage.pageIndex}`}
                    src={activePage.webpagePath}
                    sandbox="allow-same-origin"
                    className="w-full h-[450px] border-0 bg-[#090b0f]"
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
