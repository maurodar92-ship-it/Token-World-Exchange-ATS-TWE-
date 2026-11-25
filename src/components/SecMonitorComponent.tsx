import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BellRing,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Flame,
  History,
  Mail,
  Plus,
  RefreshCw,
  Rss,
  Search,
  Settings2,
  ShieldAlert,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface SecMonitorFiling {
  id: string;
  ticker: string;
  cik: string;
  companyName: string;
  formType: '10-K' | '10-Q' | '8-K';
  filingDate: string;
  accessionNumber: string;
  primaryDocument: string;
  items: string;
  filingUrl: string;
  documentText: string;
  htmlContent: string;
  source: 'edgartools-sec-live' | 'edgartools-cache';
}

export interface DocumentSummaryMetrics {
  risk_mentions: number;
  revenue_mentions: number;
  guidance_mentions: number;
  matchedRiskKeywords: Record<string, number>;
  wordCount: number;
  isHighRisk8K: boolean;
}

export interface SecAlertRecord {
  id: string;
  filingId: string;
  ticker: string;
  companyName: string;
  formType: string;
  accessionNumber: string;
  filingDate: string;
  risk_mentions: number;
  revenue_mentions: number;
  reason: string;
  channels: string[];
  triggeredAt: string;
}

interface XbrlPeriodPoint {
  period: string;
  revenueBillions: number;
  netIncomeBillions: number;
  eps: number;
}

interface SecRssEntry {
  id: string;
  formType: string;
  companyName: string;
  cik: string;
  title: string;
  updated: string;
  link: string;
  summary: string;
}

type MonitorTab = 'filings' | 'heatmap' | 'analytics' | 'rss' | 'alerts';

const REGULATORY_RISK_KEYWORDS = [
  'litigation',
  'volatility',
  'regulatory',
  'cybersecurity',
  'antitrust',
  'investigation',
  'enforcement',
  'sanctions',
  'impairment',
  'default',
  'contingency',
];

const RISK_PATTERN = new RegExp(`\\b(${REGULATORY_RISK_KEYWORDS.join('|')})\\b`, 'gi');
const REVENUE_PATTERN = /\b(revenue|revenues|sales|net income|operating margin|top-line)\b/gi;
const GUIDANCE_PATTERN = /\b(guidance|outlook|forecast|full-year|projected|expectation)\b/gi;

export function summarize_document(
  text: string,
  formType = '',
  items = '',
): DocumentSummaryMetrics {
  const safeText = text || '';
  const riskMatches = safeText.match(RISK_PATTERN) ?? [];
  const revenueMatches = safeText.match(REVENUE_PATTERN) ?? [];
  const guidanceMatches = safeText.match(GUIDANCE_PATTERN) ?? [];

  const matchedRiskKeywords: Record<string, number> = {};
  for (const kw of riskMatches) {
    const lower = kw.toLowerCase();
    matchedRiskKeywords[lower] = (matchedRiskKeywords[lower] ?? 0) + 1;
  }

  const wordCount = safeText.trim() ? safeText.trim().split(/\s+/).length : 0;
  const highRiskItems = /1\.05|1\.01|5\.02|4\.02/.test(items);
  const isHighRisk8K =
    formType.startsWith('8-K') && (riskMatches.length >= 4 || highRiskItems);

  return {
    risk_mentions: riskMatches.length,
    revenue_mentions: revenueMatches.length,
    guidance_mentions: guidanceMatches.length,
    matchedRiskKeywords,
    wordCount,
    isHighRisk8K,
  };
}

function renderHighlightedRiskText(text: string): React.ReactNode[] {
  const parts = text.split(RISK_PATTERN);
  const kwSet = new Set(REGULATORY_RISK_KEYWORDS);
  return parts.map((part, idx) => {
    if (kwSet.has(part.toLowerCase())) {
      return (
        <strong
          key={`kw-${idx}`}
          className="font-bold px-1 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
        >
          {part}
        </strong>
      );
    }
    return <React.Fragment key={`txt-${idx}`}>{part}</React.Fragment>;
  });
}

function getHeatColor(riskCount: number): string {
  if (riskCount >= 12) return '#f43f5e';
  if (riskCount >= 8) return '#f59e0b';
  if (riskCount >= 4) return '#d4b475';
  return '#10b981';
}

export const SecMonitorComponent: React.FC = () => {
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('twe-sec-monitor-watchlist');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // use defaults
    }
    return ['AAPL', 'MSFT', 'NVDA'];
  });
  const [tickerInput, setTickerInput] = useState('');
  const [formFilter, setFormFilter] = useState<'ALL' | '10-K' | '10-Q' | '8-K'>('ALL');
  const [tickerFilter, setTickerFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<MonitorTab>('filings');

  const [filings, setFilings] = useState<SecMonitorFiling[]>([]);
  const [loadingFilings, setLoadingFilings] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [selectedFilingId, setSelectedFilingId] = useState<string | null>(null);

  // Analytics tab state
  const [analyticsTicker, setAnalyticsTicker] = useState<string>('AAPL');
  const [xbrlSeries, setXbrlSeries] = useState<XbrlPeriodPoint[]>([]);
  const [xbrlCompanyName, setXbrlCompanyName] = useState<string>('Apple Inc.');
  const [xbrlSource, setXbrlSource] = useState<string>('');
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // RSS tab state
  const [rssEntries, setRssEntries] = useState<SecRssEntry[]>([]);
  const [rssSource, setRssSource] = useState<string>('');
  const [rssFormFilter, setRssFormFilter] = useState<string>('ALL');
  const [loadingRss, setLoadingRss] = useState(false);

  // Automated Alert Service & Sensitivity Threshold Settings
  const [riskThreshold, setRiskThreshold] = useState<number>(4);
  const [revenueThreshold, setRevenueThreshold] = useState<number>(3);
  const [notifyUiEnabled, setNotifyUiEnabled] = useState<boolean>(true);
  const [notifyEmailEnabled, setNotifyEmailEnabled] = useState<boolean>(true);
  const [alertEmail, setAlertEmail] = useState<string>('compliance-desk@twe-ats.io');
  const [alertHistory, setAlertHistory] = useState<SecAlertRecord[]>([]);
  const [showSettingsPanel, setShowSettingsPanel] = useState<boolean>(false);

  const triggeredKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      localStorage.setItem('twe-sec-monitor-watchlist', JSON.stringify(watchlist));
    } catch {
      // ignore storage quota errors
    }
  }, [watchlist]);

  useEffect(() => {
    if (!watchlist.includes(analyticsTicker) && watchlist.length > 0) {
      setAnalyticsTicker(watchlist[0]);
    }
  }, [watchlist, analyticsTicker]);

  const fetchWatchlistFilings = useCallback(async () => {
    if (watchlist.length === 0) {
      setFilings([]);
      return;
    }
    setLoadingFilings(true);
    try {
      const res = await fetch(
        `/api/twe/edgar/sec-monitor?tickers=${encodeURIComponent(watchlist.join(','))}`,
      );
      if (res.ok) {
        const json = (await res.json()) as {
          filings?: SecMonitorFiling[];
          fetchedAt?: string;
        };
        const rows = json.filings ?? [];
        setFilings(rows);
        setLastUpdated(json.fetchedAt ?? new Date().toISOString());
        if (rows.length > 0) {
          setSelectedFilingId((prev) =>
            prev && rows.some((r) => r.id === prev) ? prev : rows[0].id,
          );
        }
      }
    } finally {
      setLoadingFilings(false);
    }
  }, [watchlist]);

  useEffect(() => {
    void fetchWatchlistFilings();
  }, [fetchWatchlistFilings]);

  const fetchXbrlFinancials = useCallback(async (ticker: string) => {
    if (!ticker) return;
    setLoadingAnalytics(true);
    try {
      const res = await fetch(`/api/twe/edgar/financials/${encodeURIComponent(ticker)}`);
      if (res.ok) {
        const json = (await res.json()) as {
          series?: XbrlPeriodPoint[];
          companyName?: string;
          source?: string;
        };
        setXbrlSeries(json.series ?? []);
        setXbrlCompanyName(json.companyName ?? ticker);
        setXbrlSource(json.source ?? 'edgartools');
      }
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    void fetchXbrlFinancials(analyticsTicker);
  }, [analyticsTicker, fetchXbrlFinancials]);

  const fetchSecRssFeed = useCallback(async () => {
    setLoadingRss(true);
    try {
      const res = await fetch('/api/twe/edgar/rss');
      if (res.ok) {
        const json = (await res.json()) as {
          entries?: SecRssEntry[];
          source?: string;
        };
        setRssEntries(json.entries ?? []);
        setRssSource(json.source ?? 'sec-atom');
      }
    } finally {
      setLoadingRss(false);
    }
  }, []);

  useEffect(() => {
    void fetchSecRssFeed();
  }, [fetchSecRssFeed]);

  const enrichedFilings = useMemo(
    () =>
      filings.map((f) => ({
        ...f,
        summary: summarize_document(f.documentText, f.formType, f.items),
      })),
    [filings],
  );

  // Automated High-Risk 8-K & Threshold Alert Service
  const dispatchAlertNotification = useCallback(
    async (
      filing: SecMonitorFiling & { summary: DocumentSummaryMetrics },
      reason: string,
    ) => {
      const channels: string[] = [];
      if (notifyUiEnabled) channels.push('UI SSE Toast');
      if (notifyEmailEnabled && alertEmail.trim()) channels.push(`Email (${alertEmail.trim()})`);
      if (channels.length === 0) channels.push('Audit Log');

      const record: SecAlertRecord = {
        id: `sec-al-${filing.accessionNumber}-${Date.now()}`,
        filingId: filing.id,
        ticker: filing.ticker,
        companyName: filing.companyName,
        formType: filing.formType,
        accessionNumber: filing.accessionNumber,
        filingDate: filing.filingDate,
        risk_mentions: filing.summary.risk_mentions,
        revenue_mentions: filing.summary.revenue_mentions,
        reason,
        channels,
        triggeredAt: new Date().toISOString(),
      };

      setAlertHistory((prev) =>
        [record, ...prev.filter((p) => p.accessionNumber !== filing.accessionNumber)].slice(0, 50),
      );

      if (notifyUiEnabled) {
        try {
          await fetch('/api/twe/notifications/alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'sec_disclosure_alert',
              title: `SEC Alert: ${filing.ticker} Form ${filing.formType}`,
              message: `${reason} — Accession ${filing.accessionNumber} (${channels.join(' + ')})`,
              symbol: filing.ticker,
              severity: filing.summary.isHighRisk8K ? 'alert' : 'warning',
            }),
          });
        } catch {
          // ignore network hiccup on alert publish
        }
      }
    },
    [notifyUiEnabled, notifyEmailEnabled, alertEmail],
  );

  useEffect(() => {
    for (const f of enrichedFilings) {
      const riskBreach = f.summary.risk_mentions >= riskThreshold;
      const revBreach = f.summary.revenue_mentions >= revenueThreshold;
      const isEightKAlert = f.formType === '8-K' && (f.summary.isHighRisk8K || riskBreach);
      if (!isEightKAlert && !(riskBreach && revBreach)) continue;

      const dedupeKey = `${f.accessionNumber}:${riskThreshold}:${revenueThreshold}`;
      if (triggeredKeysRef.current.has(dedupeKey)) continue;
      triggeredKeysRef.current.add(dedupeKey);

      const reasons: string[] = [];
      if (f.summary.isHighRisk8K) reasons.push('High-risk 8-K disclosure');
      if (riskBreach) reasons.push(`risk_mentions=${f.summary.risk_mentions} (>=${riskThreshold})`);
      if (revBreach) reasons.push(`revenue_mentions=${f.summary.revenue_mentions} (>=${revenueThreshold})`);

      void dispatchAlertNotification(f, reasons.join(' · '));
    }
  }, [enrichedFilings, riskThreshold, revenueThreshold, dispatchAlertNotification]);

  const filteredFilings = useMemo(
    () =>
      enrichedFilings.filter((f) => {
        if (formFilter !== 'ALL' && f.formType !== formFilter) return false;
        if (tickerFilter !== 'ALL' && f.ticker !== tickerFilter) return false;
        return true;
      }),
    [enrichedFilings, formFilter, tickerFilter],
  );

  const selectedFiling = useMemo(
    () =>
      enrichedFilings.find((f) => f.id === selectedFilingId) ??
      filteredFilings[0] ??
      enrichedFilings[0] ??
      null,
    [enrichedFilings, filteredFilings, selectedFilingId],
  );

  // Risk Heatmap Aggregation across watchlist tickers
  const riskHeatmapData = useMemo(() => {
    return watchlist.map((ticker) => {
      const tickerFilings = enrichedFilings.filter((f) => f.ticker === ticker);
      const totalRiskMentions = tickerFilings.reduce((acc, f) => acc + f.summary.risk_mentions, 0);
      const totalRevenueMentions = tickerFilings.reduce((acc, f) => acc + f.summary.revenue_mentions, 0);
      const totalGuidanceMentions = tickerFilings.reduce((acc, f) => acc + f.summary.guidance_mentions, 0);
      const highRisk8KCount = tickerFilings.filter((f) => f.summary.isHighRisk8K).length;
      return {
        ticker,
        companyName: tickerFilings[0]?.companyName ?? ticker,
        filingsCount: tickerFilings.length,
        riskMentions: totalRiskMentions,
        revenueMentions: totalRevenueMentions,
        guidanceMentions: totalGuidanceMentions,
        highRisk8KCount,
        heatColor: getHeatColor(totalRiskMentions),
      };
    });
  }, [watchlist, enrichedFilings]);

  const handleAddTicker = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = tickerInput.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '');
    if (!cleaned) return;
    if (!watchlist.includes(cleaned)) {
      setWatchlist((prev) => [...prev, cleaned]);
    }
    setTickerInput('');
  };

  const handleRemoveTicker = (ticker: string) => {
    setWatchlist((prev) => prev.filter((t) => t !== ticker));
    if (tickerFilter === ticker) setTickerFilter('ALL');
  };

  // CSV Report Export
  const handleExportCsv = () => {
    const header = [
      'Ticker',
      'Company Name',
      'CIK',
      'Form',
      'Filing Date',
      'Accession Number',
      'SEC Items',
      'Risk Mentions',
      'Revenue Mentions',
      'Guidance Mentions',
      'High Risk 8-K',
      'SEC Filing URL',
    ];
    const rows = filteredFilings.map((f) => [
      f.ticker,
      `"${f.companyName.replace(/"/g, '""')}"`,
      f.cik,
      f.formType,
      f.filingDate,
      f.accessionNumber,
      `"${f.items.replace(/"/g, '""')}"`,
      String(f.summary.risk_mentions),
      String(f.summary.revenue_mentions),
      String(f.summary.guidance_mentions),
      f.summary.isHighRisk8K ? 'YES' : 'NO',
      f.filingUrl,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TWE-SEC-Monitor-Report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Full HTML Archival Download for selected SEC filing
  const handleDownloadHtml = (filing: SecMonitorFiling & { summary: DocumentSummaryMetrics }) => {
    const highlightedHtmlBody = filing.documentText.replace(
      RISK_PATTERN,
      (match) => `<strong class="kw">${match}</strong>`,
    );
    const structuredHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${filing.companyName} (${filing.ticker}) — SEC Form ${filing.formType} (${filing.filingDate})</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; max-width: 920px; margin: 40px auto; padding: 0 24px; color: #111827; line-height: 1.65; }
    .banner { border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px; }
    .metrics { display: flex; gap: 16px; font-family: monospace; font-size: 13px; margin: 14px 0 22px; padding: 12px; background: #f8fafc; border: 1px solid #cbd5e1; }
    .kw { background: #fef3c7; font-weight: 700; padding: 1px 4px; border-radius: 3px; }
    pre { white-space: pre-wrap; font-family: Georgia, serif; font-size: 14px; }
  </style>
</head>
<body>
  <div class="banner">
    <div><strong>UNITED STATES SECURITIES AND EXCHANGE COMMISSION — EDGAR ARCHIVAL COPY</strong></div>
    <h1>${filing.companyName} (${filing.ticker}) — Form ${filing.formType}</h1>
    <div>CIK: ${filing.cik} | Accession Number: ${filing.accessionNumber} | Filed: ${filing.filingDate}</div>
  </div>
  <div class="metrics">
    <span>Risk Mentions: <strong>${filing.summary.risk_mentions}</strong></span>
    <span>Revenue Mentions: <strong>${filing.summary.revenue_mentions}</strong></span>
    <span>Guidance Mentions: <strong>${filing.summary.guidance_mentions}</strong></span>
    <span>Source URL: <a href="${filing.filingUrl}">${filing.filingUrl}</a></span>
  </div>
  <pre>${highlightedHtmlBody}</pre>
</body>
</html>`;

    const blob = new Blob([structuredHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filing.ticker}-Form-${filing.formType}-${filing.accessionNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredRssEntries = useMemo(
    () =>
      rssEntries.filter((e) =>
        rssFormFilter === 'ALL' ? true : e.formType.toUpperCase().includes(rssFormFilter),
      ),
    [rssEntries, rssFormFilter],
  );

  return (
    <div className="space-y-4">
      {/* Watchlist Search & Export Header */}
      <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-semibold text-base text-[var(--twe-text-primary)]">
                SEC Monitor — edgartools Live Intelligence
              </h2>
              <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                10-K · 10-Q · 8-K
              </span>
              {alertHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('alerts')}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 cursor-pointer"
                >
                  <BellRing className="w-3 h-3" />
                  <span>{alertHistory.length} Alerts</span>
                </button>
              )}
            </div>
            <p className="text-xs text-[var(--twe-text-secondary)] mt-0.5">
              Configurable ticker watchlist with summarize_document NLP metrics, risk-keyword highlighting, Recharts Heatmaps &amp; XBRL Analytics, RSS feed, and CSV/HTML archival export.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setShowSettingsPanel((s) => !s)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border font-medium cursor-pointer ${
                showSettingsPanel
                  ? 'border-[#A8843E] dark:border-[#D4B475] bg-[var(--twe-gold-soft)] text-[var(--twe-text-primary)]'
                  : 'border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] hover:border-[#D4B475]'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
              <span>Alert Thresholds</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredFilings.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] hover:border-[#D4B475] font-medium cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => void fetchWatchlistFilings()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#A8843E]/50 dark:border-[#D4B475]/50 bg-[#A8843E]/10 dark:bg-[#D4B475]/10 text-[#A8843E] dark:text-[#D4B475] font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingFilings ? 'animate-spin' : ''}`} />
              <span>Refresh EDGAR</span>
            </button>
          </div>
        </div>

        {/* Watchlist Search Bar + Ticker Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--twe-border)]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--twe-text-muted)] mr-1">
              Watchlist ({watchlist.length}):
            </span>
            {watchlist.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border-strong)] text-xs font-mono"
              >
                <button
                  type="button"
                  onClick={() => {
                    setTickerFilter((prev) => (prev === t ? 'ALL' : t));
                    setAnalyticsTicker(t);
                  }}
                  className={`font-semibold cursor-pointer ${
                    tickerFilter === t
                      ? 'text-emerald-500'
                      : 'text-[#A8843E] dark:text-[#D4B475]'
                  }`}
                >
                  {t}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveTicker(t)}
                  aria-label={`Remove ${t} from watchlist`}
                  className="text-[var(--twe-text-muted)] hover:text-rose-500 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <form onSubmit={handleAddTicker} className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--twe-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tickerInput}
                onChange={(e) => setTickerInput(e.target.value)}
                placeholder="Add ticker (e.g. TSLA, COIN, JPM)"
                maxLength={10}
                className="pl-8 pr-3 py-1.5 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] text-xs font-mono text-[var(--twe-text-primary)] placeholder:text-[var(--twe-text-muted)] w-56"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] hover:border-[#D4B475] text-xs font-medium cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Ticker</span>
            </button>
          </form>
        </div>

        {/* Collapsible Sensitivity Threshold Settings Panel */}
        {showSettingsPanel && (
          <div className="p-3.5 rounded-lg bg-[var(--twe-bg-elevated)] border border-[#A8843E]/40 dark:border-[#D4B475]/40 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <label className="space-y-1">
              <span className="font-mono text-[10px] uppercase text-[var(--twe-text-muted)] block">
                risk_mentions Alert Threshold ({riskThreshold})
              </span>
              <input
                type="range"
                min={1}
                max={15}
                value={riskThreshold}
                onChange={(e) => setRiskThreshold(Number(e.target.value))}
                className="w-full accent-[#D4B475]"
              />
            </label>
            <label className="space-y-1">
              <span className="font-mono text-[10px] uppercase text-[var(--twe-text-muted)] block">
                revenue_mentions Alert Threshold ({revenueThreshold})
              </span>
              <input
                type="range"
                min={1}
                max={12}
                value={revenueThreshold}
                onChange={(e) => setRevenueThreshold(Number(e.target.value))}
                className="w-full accent-[#D4B475]"
              />
            </label>
            <label className="space-y-1">
              <span className="font-mono text-[10px] uppercase text-[var(--twe-text-muted)] block">
                Compliance Email Recipient
              </span>
              <input
                type="email"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                className="w-full px-2.5 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] font-mono text-xs"
              />
            </label>
            <div className="flex flex-col justify-between gap-2">
              <div className="flex items-center gap-3 text-[11px]">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyUiEnabled}
                    onChange={(e) => setNotifyUiEnabled(e.target.checked)}
                    className="accent-[#D4B475]"
                  />
                  <span>UI Alert</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyEmailEnabled}
                    onChange={(e) => setNotifyEmailEnabled(e.target.checked)}
                    className="accent-[#D4B475]"
                  />
                  <span>Email Digest</span>
                </label>
              </div>
              {selectedFiling && (
                <button
                  type="button"
                  onClick={() =>
                    void dispatchAlertNotification(
                      selectedFiling,
                      `Manual test alert (risk_mentions=${selectedFiling.summary.risk_mentions})`,
                    )
                  }
                  className="px-2.5 py-1 rounded border border-[#A8843E]/50 text-[#A8843E] dark:text-[#D4B475] font-mono text-[11px] hover:bg-[#A8843E]/10 cursor-pointer"
                >
                  Trigger Test Alert Now
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--twe-border)] pb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'filings', label: 'Live Filings & Summary', icon: FileText },
              { id: 'heatmap', label: 'Risk Heatmap', icon: Flame },
              { id: 'analytics', label: 'Analytics (XBRL Charts)', icon: BarChart3 },
              { id: 'rss', label: 'RSS Feed', icon: Rss },
              { id: 'alerts', label: `Alert History (${alertHistory.length})`, icon: History },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                  active
                    ? 'border-[#A8843E] dark:border-[#D4B475] bg-[var(--twe-gold-soft)] text-[var(--twe-text-primary)] font-semibold'
                    : 'border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-secondary)] hover:border-[#D4B475]/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <span className="font-mono text-[11px] text-[var(--twe-text-muted)] tabular-nums">
          {lastUpdated ? `Synced ${lastUpdated.slice(11, 19)} UTC` : 'Initializing...'}
        </span>
      </div>

      {/* TAB 1: Live Filings & Summary Detail View + Risk Highlighting Viewer */}
      {activeTab === 'filings' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
          {/* Left: Live 10-K, 10-Q, 8-K Feed */}
          <div className="xl:col-span-5 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-2">
              <span className="font-display font-semibold text-xs text-[var(--twe-text-primary)]">
                Watchlist Filings ({filteredFilings.length})
              </span>
              <div className="flex items-center gap-1">
                {(['ALL', '10-K', '10-Q', '8-K'] as const).map((fm) => (
                  <button
                    key={fm}
                    type="button"
                    onClick={() => setFormFilter(fm)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                      formFilter === fm
                        ? 'bg-[#A8843E] text-white dark:bg-[#D4B475] dark:text-[#111318] border-transparent font-semibold'
                        : 'border-[var(--twe-border)] text-[var(--twe-text-secondary)]'
                    }`}
                  >
                    {fm}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-[var(--twe-border)] max-h-[580px] overflow-y-auto">
              {filteredFilings.map((f) => {
                const isSelected = selectedFiling?.id === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFilingId(f.id)}
                    className={`w-full text-left px-3.5 py-3 space-y-1.5 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#A8843E]/12 dark:bg-[#D4B475]/12 border-l-2 border-l-[#D4B475]'
                        : 'hover:bg-[var(--twe-bg-elevated)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-[#A8843E] dark:text-[#D4B475]">
                          {f.ticker}
                        </span>
                        <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
                          {f.formType}
                        </span>
                        {f.summary.isHighRisk8K && (
                          <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold bg-rose-500/15 text-rose-500 border border-rose-500/30">
                            HIGH-RISK 8-K
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] tabular-nums text-[var(--twe-text-muted)]">
                        {f.filingDate}
                      </span>
                    </div>

                    <div className="text-xs font-medium text-[var(--twe-text-primary)] truncate">
                      {f.companyName}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-[var(--twe-text-muted)] tabular-nums">
                      <span>{f.accessionNumber}</span>
                      <span>
                        Risk {f.summary.risk_mentions} · Rev {f.summary.revenue_mentions} · Guid{' '}
                        {f.summary.guidance_mentions}
                      </span>
                    </div>
                  </button>
                );
              })}
              {filteredFilings.length === 0 && (
                <div className="px-4 py-8 text-center text-xs text-[var(--twe-text-muted)]">
                  No filings match your watchlist or form filter.
                </div>
              )}
            </div>
          </div>

          {/* Right: Summary Detail View + Risk-Highlighted Filing Viewer + HTML Download */}
          <div className="xl:col-span-7 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden">
            {selectedFiling ? (
              <div className="divide-y divide-[var(--twe-border)]">
                <div className="px-4 py-3 bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-[#A8843E] dark:text-[#D4B475]">
                        {selectedFiling.ticker}
                      </span>
                      <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-[var(--twe-bg-surface)] border border-[var(--twe-border)]">
                        FORM {selectedFiling.formType}
                      </span>
                      <span className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
                        {selectedFiling.companyName}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-[var(--twe-text-muted)] mt-0.5 tabular-nums">
                      Accession {selectedFiling.accessionNumber} · CIK {selectedFiling.cik} · Filed{' '}
                      {selectedFiling.filingDate} · {selectedFiling.source}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleDownloadHtml(selectedFiling)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#A8843E]/50 dark:border-[#D4B475]/50 bg-[#A8843E]/10 dark:bg-[#D4B475]/10 text-[#A8843E] dark:text-[#D4B475] font-semibold cursor-pointer"
                    >
                      <FileCode2 className="w-3.5 h-3.5" />
                      <span>Download .html</span>
                    </button>
                    <a
                      href={selectedFiling.filingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-surface)] hover:border-[#D4B475] text-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>SEC.gov</span>
                    </a>
                  </div>
                </div>

                {/* summarize_document Summary Detail View */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--twe-text-muted)]">
                      summarize_document() NLP Disclosure Summary
                    </span>
                    <span className="text-[11px] font-mono text-[var(--twe-text-muted)] tabular-nums">
                      {selectedFiling.summary.wordCount} tokens analyzed
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-lg bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
                      <div className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">
                        risk_mentions
                      </div>
                      <div
                        className={`mt-1 font-mono text-xl font-bold tabular-nums ${
                          selectedFiling.summary.risk_mentions >= riskThreshold
                            ? 'text-rose-500'
                            : 'text-[var(--twe-text-primary)]'
                        }`}
                      >
                        {selectedFiling.summary.risk_mentions}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
                      <div className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">
                        revenue_mentions
                      </div>
                      <div className="mt-1 font-mono text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        {selectedFiling.summary.revenue_mentions}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
                      <div className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">
                        guidance_mentions
                      </div>
                      <div className="mt-1 font-mono text-xl font-bold tabular-nums text-cyan-600 dark:text-cyan-400">
                        {selectedFiling.summary.guidance_mentions}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
                      <div className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">
                        Alert Status
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs font-mono font-semibold">
                        {selectedFiling.summary.isHighRisk8K ? (
                          <>
                            <ShieldAlert className="w-4 h-4 text-rose-500" />
                            <span className="text-rose-500">HIGH RISK</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-emerald-500">NOMINAL</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detected Regulatory Risk Keywords */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)] mr-1">
                      Highlighted Keywords:
                    </span>
                    {Object.entries(selectedFiling.summary.matchedRiskKeywords).map(
                      ([kw, count]) => (
                        <span
                          key={kw}
                          className="px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 tabular-nums"
                        >
                          {kw} ×{count}
                        </span>
                      ),
                    )}
                  </div>
                </div>

                {/* Filing Document Viewer with Auto-Bolded Risk Keywords */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--twe-text-muted)]">
                    <span>SEC FILING VIEWER (REGULATORY RISK KEYWORDS AUTO-BOLDED)</span>
                    <span>Items: {selectedFiling.items}</span>
                  </div>
                  <div className="p-4 rounded-lg bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-sans text-xs leading-relaxed whitespace-pre-wrap text-[var(--twe-text-primary)] max-h-[340px] overflow-y-auto">
                    {renderHighlightedRiskText(selectedFiling.documentText)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[var(--twe-text-muted)]">
                Select a filing on the left to inspect summarize_document() metrics and risk-highlighted text.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Recharts Risk Heatmap */}
      {activeTab === 'heatmap' && (
        <div className="space-y-4">
          <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
                  Watchlist Regulatory Risk Disclosure Heatmap (Recharts)
                </h3>
                <p className="text-xs text-[var(--twe-text-secondary)]">
                  Aggregates risk_mentions, revenue_mentions, and guidance_mentions across your tracked tickers to spot rising regulatory activity.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500">Low (&lt;4)</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-500">Elevated (4–11)</span>
                <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-500">High (&gt;=12)</span>
              </div>
            </div>

            {/* Heatmap Intensity Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {riskHeatmapData.map((row) => (
                <div
                  key={row.ticker}
                  onClick={() => {
                    setTickerFilter(row.ticker);
                    setActiveTab('filings');
                  }}
                  style={{ borderColor: row.heatColor }}
                  className="p-3 rounded-lg bg-[var(--twe-bg-elevated)] border-2 cursor-pointer transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-sm text-[var(--twe-text-primary)]">
                      {row.ticker}
                    </span>
                    <span
                      style={{ color: row.heatColor }}
                      className="text-xs font-bold tabular-nums"
                    >
                      {row.riskMentions} risk
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--twe-text-muted)] truncate mt-0.5">
                    {row.companyName}
                  </div>
                  <div className="mt-2 pt-2 border-t border-[var(--twe-border)] flex items-center justify-between text-[10px] font-mono tabular-nums text-[var(--twe-text-secondary)]">
                    <span>{row.filingsCount} filings</span>
                    <span>{row.highRisk8KCount} 8-K alerts</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Recharts Aggregated Risk BarChart */}
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskHeatmapData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                  <XAxis dataKey="ticker" tick={{ fontSize: 11, fill: 'currentColor' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--twe-bg-surface)',
                      borderColor: 'var(--twe-border-strong)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="riskMentions" name="Risk Mentions" radius={[4, 4, 0, 0]}>
                    {riskHeatmapData.map((entry) => (
                      <Cell key={`cell-${entry.ticker}`} fill={entry.heatColor} />
                    ))}
                  </Bar>
                  <Bar dataKey="revenueMentions" name="Revenue Mentions" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="guidanceMentions" name="Guidance Mentions" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Analytics (Recharts Revenue, Net Income & EPS XBRL Charts) */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
                XBRL Financial Trends — {xbrlCompanyName} ({analyticsTicker})
              </h3>
              <p className="text-xs text-[var(--twe-text-secondary)] font-mono">
                Source: {xbrlSource || 'edgartools'} · Historical 10-K US-GAAP Revenues, Net Income &amp; Diluted EPS
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[var(--twe-text-muted)]">Company:</span>
              <select
                aria-label="Select company for XBRL charts"
                value={analyticsTicker}
                onChange={(e) => setAnalyticsTicker(e.target.value)}
                className="px-3 py-1.5 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] text-xs font-mono text-[var(--twe-text-primary)]"
              >
                {watchlist.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void fetchXbrlFinancials(analyticsTicker)}
                className="p-1.5 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] hover:border-[#D4B475] cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAnalytics ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue & Net Income ($B) */}
            <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display font-semibold text-xs text-[var(--twe-text-primary)] flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[#D4B475]" />
                  <span>Revenue &amp; Net Income ($ Billions)</span>
                </span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={xbrlSeries} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'currentColor' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--twe-bg-surface)',
                        borderColor: 'var(--twe-border-strong)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="revenueBillions" name="Revenue ($B)" fill="#D4B475" radius={[4, 4, 0, 0]} />
                    <Area
                      type="monotone"
                      dataKey="netIncomeBillions"
                      name="Net Income ($B)"
                      stroke="#10b981"
                      fill="rgba(16,185,129,0.22)"
                      strokeWidth={2}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Diluted EPS Trend */}
            <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display font-semibold text-xs text-[var(--twe-text-primary)] flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-cyan-500" />
                  <span>Diluted Earnings Per Share (USD / Share)</span>
                </span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={xbrlSeries} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'currentColor' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--twe-bg-surface)',
                        borderColor: 'var(--twe-border-strong)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line
                      type="monotone"
                      dataKey="eps"
                      name="Diluted EPS ($)"
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#38bdf8' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Official SEC RSS Feed Tab */}
      {activeTab === 'rss' && (
        <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-display font-semibold text-sm text-[var(--twe-text-primary)] flex items-center gap-2">
                <Rss className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
                <span>Official SEC EDGAR Atom RSS Feed</span>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-emerald-500/15 text-emerald-500">
                  {rssSource || 'sec-atom'}
                </span>
              </div>
              <p className="text-[11px] font-mono text-[var(--twe-text-muted)]">
                sec.gov/cgi-bin/browse-edgar?action=getcurrent&amp;output=atom
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <select
                aria-label="Filter RSS form type"
                value={rssFormFilter}
                onChange={(e) => setRssFormFilter(e.target.value)}
                className="px-2.5 py-1 rounded border border-[var(--twe-border-strong)] bg-[var(--twe-bg-surface)] font-mono text-xs"
              >
                <option value="ALL">All Forms</option>
                <option value="8-K">8-K</option>
                <option value="10-K">10-K</option>
                <option value="10-Q">10-Q</option>
                <option value="4">Form 4</option>
              </select>
              <button
                type="button"
                onClick={() => void fetchSecRssFeed()}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded border border-[var(--twe-border-strong)] bg-[var(--twe-bg-surface)] hover:border-[#D4B475] font-medium cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRss ? 'animate-spin' : ''}`} />
                <span>Poll SEC Atom</span>
              </button>
            </div>
          </div>

          <div className="divide-y divide-[var(--twe-border)] max-h-[460px] overflow-y-auto">
            {filteredRssEntries.map((entry) => (
              <div
                key={entry.id}
                className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-[var(--twe-bg-elevated)]"
              >
                <div className="space-y-1 max-w-3xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-1.5 py-0.5 rounded font-mono font-semibold text-[10px] bg-sky-500/15 text-sky-500 border border-sky-500/30">
                      {entry.formType}
                    </span>
                    <span className="font-semibold text-[var(--twe-text-primary)]">
                      {entry.companyName}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--twe-text-muted)]">
                      CIK {entry.cik}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--twe-text-secondary)]">{entry.summary || entry.title}</p>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px] shrink-0">
                  <span className="text-[var(--twe-text-muted)] tabular-nums">
                    {entry.updated.slice(0, 19).replace('T', ' ')}
                  </span>
                  <a
                    href={entry.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[var(--twe-border-strong)] hover:border-[#D4B475] text-[#A8843E] dark:text-[#D4B475]"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Inspect</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Alert History Tab */}
      {activeTab === 'alerts' && (
        <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-display font-semibold text-sm text-[var(--twe-text-primary)]">
              <Bell className="w-4 h-4 text-rose-500" />
              <span>Triggered High-Risk 8-K &amp; Threshold Alert History</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--twe-text-muted)]">
              <Mail className="w-3.5 h-3.5" />
              <span>
                Thresholds: risk &gt;= {riskThreshold} · rev &gt;= {revenueThreshold}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="border-b border-[var(--twe-border)] text-[var(--twe-text-muted)] uppercase">
                <tr>
                  <th className="px-4 py-2.5">Timestamp</th>
                  <th className="px-4 py-2.5">Ticker / Form</th>
                  <th className="px-4 py-2.5">Trigger Reason</th>
                  <th className="px-4 py-2.5">Delivery Channels</th>
                  <th className="px-4 py-2.5 text-right">Filing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--twe-border)]">
                {alertHistory.map((al) => (
                  <tr key={al.id} className="hover:bg-[var(--twe-bg-elevated)]">
                    <td className="px-4 py-2.5 font-mono tabular-nums text-[var(--twe-text-muted)]">
                      {al.triggeredAt.slice(0, 19).replace('T', ' ')}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono font-bold text-[#A8843E] dark:text-[#D4B475] mr-2">
                        {al.ticker}
                      </span>
                      <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-rose-500/15 text-rose-500">
                        {al.formType}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--twe-text-secondary)]">
                      <span className="inline-flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{al.reason}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--twe-text-secondary)]">
                      {al.channels.join(' · ')}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFilingId(al.filingId);
                          setActiveTab('filings');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[var(--twe-border-strong)] hover:border-[#D4B475] text-[11px] font-medium text-[#A8843E] dark:text-[#D4B475] cursor-pointer"
                      >
                        <FileText className="w-3 h-3" />
                        <span>View Filing</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {alertHistory.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-xs text-[var(--twe-text-muted)]">
                      No high-risk 8-K or threshold alerts recorded yet. Lower sensitivity thresholds in Alert Thresholds or refresh watchlist filings.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
