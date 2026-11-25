import React, { useState } from 'react';
import { Download, Eye, Fingerprint, Sparkles, Upload } from 'lucide-react';
import { AIStatusIndicator } from './AIStatusIndicator';
import { isAiEnabled } from '../lib/aiMode';
import { svgToDataUrl } from '../lib/visualRegistry';

interface ImageAnalysisResult {
  summary?: string;
  assetClassification?: string;
  dominantPalette?: string[];
  detectedTraits?: { trait_type: string; value: string }[];
  complianceAndRiskNotes?: string[];
  detailedReport?: string;
}

interface GeneratedSvgConcept {
  title?: string;
  symbol?: string;
  description?: string;
  svgMarkup?: string;
  attributes?: { trait_type: string; value: string }[];
}

export const AiArtStudioView: React.FC<{
  aiModeEnabled?: boolean;
  onSendArtifactToCodex: (artifact: {
    dataUrl: string;
    name: string;
    traits: { trait_type: string; value: string }[];
  }) => void;
}> = ({ aiModeEnabled, onSendArtifactToCodex }) => {
  const [activeTab, setActiveTab] = useState<'analyze' | 'synthesize'>('analyze');

  // Multimodal Analyzer state
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadMime, setUploadMime] = useState<string>('image/png');
  const [analysisMode, setAnalysisMode] = useState('Artwork & Trait Audit');
  const [analysisPrompt, setAnalysisPrompt] = useState(
    'Analyze visual hierarchy, luxury metallic finishes, suggested TWE asset class, and potential OpenZeppelin NFT traits.'
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null);

  // SVG Concept & Edit state
  const [conceptPrompt, setConceptPrompt] = useState(
    'Architectural Graphite & Champagne-Gold Sovereign Reserve Vault Seal with octagonal meridian rings'
  );
  const [standard, setStandard] = useState<'ERC-721' | 'ERC-1155'>('ERC-721');
  const [refImage, setRefImage] = useState<string | null>(null);
  const [refMime, setRefMime] = useState<string>('image/png');
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthError, setSynthError] = useState<string | null>(null);
  const [concept, setConcept] = useState<GeneratedSvgConcept | null>(null);

  const readFileAsDataUrl = (file: File, onDone: (dataUrl: string, mime: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onDone(reader.result, file.type || 'image/png');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAiEnabled()) {
      setAnalysisError('AI Mode is paused. Enable AI Mode in the top navigation bar to run multimodal image analysis.');
      return;
    }
    if (!uploadPreview) {
      setAnalysisError('Upload a PNG, JPEG, or WEBP image first.');
      return;
    }
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await fetch('/api/ai/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: uploadPreview,
          mimeType: uploadMime,
          mode: analysisMode,
          prompt: analysisPrompt,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Image analysis failed');
      setAnalysisResult(json.analysis);
    } catch (err: unknown) {
      setAnalysisError(err instanceof Error ? err.message : 'Image analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSynthesize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAiEnabled()) {
      setSynthError('AI Mode is paused. Enable AI Mode in the top navigation bar to synthesize SVG concepts.');
      return;
    }
    setSynthesizing(true);
    setSynthError(null);
    try {
      const res = await fetch('/api/ai/generate-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: conceptPrompt,
          standard,
          referenceImageBase64: refImage,
          referenceMimeType: refMime,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Concept synthesis failed');
      setConcept(json.concept);
    } catch (err: unknown) {
      setSynthError(err instanceof Error ? err.message : 'Concept synthesis failed');
    } finally {
      setSynthesizing(false);
    }
  };

  const handleDownloadSvg = () => {
    if (!concept?.svgMarkup) return;
    const blob = new Blob([concept.svgMarkup], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(concept.symbol || 'twe-emblem').toLowerCase()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendSvgToCodex = () => {
    if (!concept?.svgMarkup) return;
    const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(concept.svgMarkup)))}`;
    onSendArtifactToCodex({
      dataUrl,
      name: concept.title || 'TWE AI Sovereign Emblem',
      traits: concept.attributes ?? [],
    });
  };

  const effectiveAiEnabled = typeof aiModeEnabled === 'boolean' ? aiModeEnabled : isAiEnabled();

  return (
    <div className="relative space-y-4">
      <AIStatusIndicator
        enabled={effectiveAiEnabled}
        processing={analyzing || synthesizing}
        placement="corner"
        className="!top-3.5 !right-3.5"
      />
      <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-3 pr-28 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('analyze')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded font-medium cursor-pointer ${
              activeTab === 'analyze'
                ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10]'
                : 'text-[var(--twe-text-secondary)]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Analyze Uploaded Image</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('synthesize')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded font-medium cursor-pointer ${
              activeTab === 'synthesize'
                ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10]'
                : 'text-[var(--twe-text-secondary)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>SVG Concept & Edit Architect</span>
          </button>
        </div>

        <span className="font-mono text-[11px] text-[var(--twe-text-muted)]">
          Server-Side Model: gemini-4-hydrogen
        </span>
      </div>

      {!effectiveAiEnabled && (
        <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-300">
          AI Mode is currently paused. Toggle <strong>AI Mode</strong> in the top header to re-enable Gemini multimodal inspection and SVG emblem synthesis.
        </div>
      )}

      {activeTab === 'analyze' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <form
            onSubmit={handleAnalyze}
            className="lg:col-span-5 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-5 space-y-4"
          >
            <label className="block border border-dashed border-[var(--twe-border-strong)] rounded-lg p-5 text-center bg-[var(--twe-bg-elevated)] hover:border-[#D4B475] cursor-pointer">
              {uploadPreview ? (
                <img
                  src={uploadPreview}
                  alt="Uploaded for Gemini analysis"
                  className="max-h-56 mx-auto rounded border border-[var(--twe-border)] object-contain"
                />
              ) : (
                <div className="space-y-2 py-4">
                  <Upload className="w-6 h-6 mx-auto text-[#A8843E] dark:text-[#D4B475]" />
                  <div className="text-xs font-medium text-[var(--twe-text-primary)]">
                    Upload photo, token art, or diagram
                  </div>
                  <div className="text-[11px] text-[var(--twe-text-muted)]">
                    PNG, JPEG, or WEBP processed server-side
                  </div>
                </div>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    readFileAsDataUrl(file, (url, mime) => {
                      setUploadPreview(url);
                      setUploadMime(mime);
                    });
                  }
                }}
                className="hidden"
              />
            </label>

            <label className="block text-xs">
              <span className="text-[var(--twe-text-muted)]">Inspection Mode</span>
              <select
                value={analysisMode}
                onChange={(e) => setAnalysisMode(e.target.value)}
                className="mt-1 w-full px-3 py-1.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-[var(--twe-text-primary)]"
              >
                <option>Artwork & Trait Audit</option>
                <option>Tokenomics / Architecture Diagram</option>
                <option>Compliance & Risk Visual</option>
              </select>
            </label>

            <label className="block text-xs">
              <span className="text-[var(--twe-text-muted)]">Analysis Instruction</span>
              <textarea
                rows={3}
                value={analysisPrompt}
                onChange={(e) => setAnalysisPrompt(e.target.value)}
                className="mt-1 w-full p-2.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-xs text-[var(--twe-text-primary)]"
              />
            </label>

            <button
              type="submit"
              disabled={analyzing || !uploadPreview}
              className="w-full py-2 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold hover:opacity-90 disabled:opacity-45 cursor-pointer"
            >
              {analyzing ? 'Analyzing via Gemini 4 Hydrogen...' : 'Analyze Uploaded Image'}
            </button>

            {analysisError && (
              <div className="p-3 rounded border border-red-500/40 bg-red-500/10 text-xs text-red-600 dark:text-red-400">
                {analysisError}
              </div>
            )}
          </form>

          <div className="lg:col-span-7 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-5 space-y-4">
            <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
              Multimodal Inspection Output
            </h3>

            {!analysisResult ? (
              <div className="py-12 text-center text-xs text-[var(--twe-text-muted)]">
                Upload an image on the left and run analysis to inspect asset class, visual palette, OpenZeppelin traits, and risk notes.
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
                  <div className="text-[11px] uppercase tracking-wider text-[#A8843E] dark:text-[#D4B475]">
                    Executive Summary · Suggested Class: {analysisResult.assetClassification || 'N/A'}
                  </div>
                  <p className="mt-1.5 text-[var(--twe-text-primary)] leading-relaxed">
                    {analysisResult.summary}
                  </p>
                </div>

                {analysisResult.dominantPalette && analysisResult.dominantPalette.length > 0 && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)] mb-1.5">
                      Observed Palette
                    </div>
                    <div className="font-mono text-[var(--twe-text-secondary)]">
                      {analysisResult.dominantPalette.join(' · ')}
                    </div>
                  </div>
                )}

                {analysisResult.detectedTraits && analysisResult.detectedTraits.length > 0 && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)] mb-1.5">
                      Extracted Metadata Traits
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {analysisResult.detectedTraits.map((tr, i) => (
                        <div key={i} className="p-2 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
                          <div className="text-[10px] uppercase text-[var(--twe-text-muted)]">{tr.trait_type}</div>
                          <div className="font-medium text-[var(--twe-text-primary)]">{tr.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysisResult.complianceAndRiskNotes && analysisResult.complianceAndRiskNotes.length > 0 && (
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)] mb-1.5">
                      Compliance & Risk Observations
                    </div>
                    <ul className="space-y-1 text-[var(--twe-text-secondary)]">
                      {analysisResult.complianceAndRiskNotes.map((note, idx) => (
                        <li key={idx}>• {note}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysisResult.detailedReport && (
                  <div className="pt-2 border-t border-[var(--twe-border)]">
                    <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)] mb-1">
                      Detailed Report
                    </div>
                    <p className="text-[var(--twe-text-secondary)] leading-relaxed whitespace-pre-wrap">
                      {analysisResult.detailedReport}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <form
            onSubmit={handleSynthesize}
            className="lg:col-span-5 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-5 space-y-4"
          >
            <label className="block text-xs">
              <span className="text-[var(--twe-text-muted)]">Emblem / Token Concept Prompt</span>
              <textarea
                rows={4}
                value={conceptPrompt}
                onChange={(e) => setConceptPrompt(e.target.value)}
                className="mt-1 w-full p-2.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-xs text-[var(--twe-text-primary)]"
              />
            </label>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <label>
                <span className="text-[var(--twe-text-muted)]">Metadata Standard</span>
                <select
                  value={standard}
                  onChange={(e) => setStandard(e.target.value as 'ERC-721' | 'ERC-1155')}
                  className="mt-1 w-full px-3 py-1.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-[var(--twe-text-primary)]"
                >
                  <option value="ERC-721">ERC-721</option>
                  <option value="ERC-1155">ERC-1155</option>
                </select>
              </label>

              <label className="block">
                <span className="text-[var(--twe-text-muted)]">Optional Reference Image</span>
                <span className="mt-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-[var(--twe-text-primary)] cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{refImage ? 'Loaded' : 'Attach'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        readFileAsDataUrl(file, (url, mime) => {
                          setRefImage(url);
                          setRefMime(mime);
                        });
                      }
                    }}
                    className="hidden"
                  />
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={synthesizing}
              className="w-full py-2 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold hover:opacity-90 disabled:opacity-45 cursor-pointer"
            >
              {synthesizing ? 'Synthesizing Vector Emblem...' : 'Synthesize SVG Emblem & Metadata'}
            </button>

            {synthError && (
              <div className="p-3 rounded border border-red-500/40 bg-red-500/10 text-xs text-red-600 dark:text-red-400">
                {synthError}
              </div>
            )}
          </form>

          <div className="lg:col-span-7 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-5 space-y-4">
            {!concept ? (
              <div className="py-12 text-center text-xs text-[var(--twe-text-muted)]">
                Generate a 512×512 luxury Graphite & Champagne-Gold SVG emblem with OpenZeppelin metadata traits.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display font-semibold text-base text-[var(--twe-text-primary)]">
                      {concept.title} <span className="font-mono text-xs text-[#A8843E] dark:text-[#D4B475]">({concept.symbol})</span>
                    </h3>
                    <p className="text-xs text-[var(--twe-text-secondary)]">{concept.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadSvg}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--twe-border)] text-xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> SVG
                    </button>
                    <button
                      type="button"
                      onClick={handleSendSvgToCodex}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold cursor-pointer"
                    >
                      <Fingerprint className="w-3.5 h-3.5" /> Hash & Pin in Codex
                    </button>
                  </div>
                </div>

                {concept.svgMarkup && (
                  <div className="w-64 h-64 mx-auto rounded-lg border border-[var(--twe-border)] bg-[#0B0D10] overflow-hidden flex items-center justify-center">
                    <img
                      src={svgToDataUrl(concept.svgMarkup)}
                      alt={concept.title || 'Synthesized TWE SVG Emblem'}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
