import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BellRing,
  CheckCheck,
  ExternalLink,
  FileText,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Rss,
  Search,
  X,
} from 'lucide-react';
import type { ComplianceFiling } from '../types/twe';

export interface TrackedCompany {
  ticker: string;
  cik: string;
  name: string;
  sector: string;
  active: boolean;
}

export interface TrackedEightKFiling {
  id: string;
  accessionNumber: string;
  cik: string;
  ticker: string;
  companyName: string;
  formType: '8-K' | '8-K/A' | string;
  itemCode: string;
  itemTitle: string;
  filedAt: string;
  rssTimestamp: string;
  headline: string;
  summary: string;
  secArchiveUrl: string;
  commissionFileNumber: string;
  irsEin: string;
  stateOfIncorp: string;
  htmlSections: Array<{ heading: string; body: string }>;
  plainText: string;
  isNew: boolean;
}

interface EightKTemplate {
  itemCode: string;
  itemTitle: string;
  headlineBuilder: (company: TrackedCompany) => string;
  summaryBuilder: (company: TrackedCompany) => string;
  sectionsBuilder: (company: TrackedCompany, filedDate: string) => Array<{ heading: string; body: string }>;
}

const DEFAULT_TRACKED_COMPANIES: TrackedCompany[] = [
  { ticker: 'AAPL', cik: '0000320193', name: 'Apple Inc.', sector: 'Technology', active: true },
  { ticker: 'MSFT', cik: '0000789019', name: 'Microsoft Corporation', sector: 'Cloud & AI', active: true },
  { ticker: 'NVDA', cik: '0001045810', name: 'NVIDIA Corporation', sector: 'Semiconductors', active: true },
  { ticker: 'JPM', cik: '0000019617', name: 'JPMorgan Chase & Co.', sector: 'Banking & ATS', active: true },
  { ticker: 'TSLA', cik: '0001318605', name: 'Tesla, Inc.', sector: 'Automotive & Energy', active: true },
  { ticker: 'AMZN', cik: '0001018724', name: 'Amazon.com, Inc.', sector: 'Commerce & AWS', active: true },
  { ticker: 'COIN', cik: '0001679788', name: 'Coinbase Global, Inc.', sector: 'Digital Assets', active: true },
  { ticker: 'BLK', cik: '0001364742', name: 'BlackRock, Inc.', sector: 'Asset Management', active: true },
];

const KNOWN_DIRECTORY: Record<string, { cik: string; name: string; sector: string }> = {
  GOOGL: { cik: '0001652044', name: 'Alphabet Inc.', sector: 'Technology' },
  META: { cik: '0001326801', name: 'Meta Platforms, Inc.', sector: 'Technology' },
  MSTR: { cik: '0001050446', name: 'Strategy Incorporated', sector: 'Enterprise & BTC Treasury' },
  GS: { cik: '0000886982', name: 'The Goldman Sachs Group, Inc.', sector: 'Investment Banking' },
  V: { cik: '0001403161', name: 'Visa Inc.', sector: 'Payments' },
  HOOD: { cik: '0001783879', name: 'Robinhood Markets, Inc.', sector: 'Brokerage & Crypto' },
};

const EIGHT_K_TEMPLATES: EightKTemplate[] = [
  {
    itemCode: '1.01',
    itemTitle: 'Entry into a Material Definitive Agreement',
    headlineBuilder: (c) => `${c.name} executes syndicated credit & tokenized settlement facility agreement`,
    summaryBuilder: (c) =>
      `${c.name} (${c.ticker}) entered into an amended five-year revolving institutional liquidity and digital settlement credit facility totaling $2.5B.`,
    sectionsBuilder: (c, filedDate) => [
      {
        heading: 'Item 1.01 Entry into a Material Definitive Agreement',
        body: `On ${filedDate}, ${c.name} (the "Company") entered into an Amended and Restated Institutional Liquidity and Settlement Credit Agreement with a syndicate of primary clearing banks. The facility provides committed liquidity lines up to $2,500,000,000 with T+0 DvP tokenized collateral eligibility and matures five years from the effective closing date.`,
      },
      {
        heading: 'Item 2.03 Creation of a Direct Financial Obligation',
        body: `The disclosures set forth under Item 1.01 above are incorporated herein by reference. No amounts have been drawn under the revolving tranche as of the filing timestamp.`,
      },
    ],
  },
  {
    itemCode: '2.02',
    itemTitle: 'Results of Operations and Financial Condition',
    headlineBuilder: (c) => `${c.name} furnishes quarterly financial results & institutional guidance release`,
    summaryBuilder: (c) =>
      `${c.name} (${c.ticker}) furnished Exhibit 99.1 reporting quarterly revenue expansion, operating margin metrics, and updated capital allocation guidance.`,
    sectionsBuilder: (c, filedDate) => [
      {
        heading: 'Item 2.02 Results of Operations and Financial Condition',
        body: `On ${filedDate}, ${c.name} issued a press release announcing its unaudited financial results for the fiscal quarter ended recently. Gross institutional net inflows and free cash flow exceeded consensus midpoint estimates. A copy of the earnings release is furnished herewith as Exhibit 99.1.`,
      },
      {
        heading: 'Item 9.01 Financial Statements and Exhibits',
        body: `Exhibit 99.1 — Press Release of ${c.name} dated ${filedDate}.\nExhibit 104 — Cover Page Interactive Data File (embedded within the Inline XBRL document).`,
      },
    ],
  },
  {
    itemCode: '5.02',
    itemTitle: 'Departure/Appointment of Directors or Principal Officers',
    headlineBuilder: (c) => `${c.name} announces Audit & Risk Committee Chair appointment`,
    summaryBuilder: (c) =>
      `Board of Directors of ${c.name} (${c.ticker}) appointed an independent financial expert to the Audit & Digital Risk Oversight Committee.`,
    sectionsBuilder: (c, filedDate) => [
      {
        heading: 'Item 5.02 Departure of Directors or Certain Officers; Election of Directors',
        body: `Effective ${filedDate}, the Board of Directors of ${c.name} expanded its Audit and Institutional Risk Oversight Committee and appointed an independent director satisfying NYSE/NASDAQ and SEC Rule 10A-3 independence standards. There are no arrangements or understandings between the appointee and any other person pursuant to which they were selected.`,
      },
    ],
  },
  {
    itemCode: '7.01',
    itemTitle: 'Regulation FD Disclosure',
    headlineBuilder: (c) => `${c.name} publishes institutional investor presentation & treasury reserve update`,
    summaryBuilder: (c) =>
      `${c.name} (${c.ticker}) furnished Regulation FD slides detailing capital return program updates and sovereign/treasury custody controls.`,
    sectionsBuilder: (c, filedDate) => [
      {
        heading: 'Item 7.01 Regulation FD Disclosure',
        body: `On ${filedDate}, ${c.name} made available on its investor relations portal an updated Institutional Capital & Treasury Overview presentation (furnished as Exhibit 99.1). The information in this Item 7.01 shall not be deemed "filed" for purposes of Section 18 of the Securities Exchange Act of 1934.`,
      },
      {
        heading: 'Item 9.01 Financial Statements and Exhibits',
        body: `Exhibit 99.1 — Investor Presentation (${c.ticker} Institutional Overview).\nExhibit 104 — Cover Page Interactive Data File (Inline XBRL).`,
      },
    ],
  },
  {
    itemCode: '8.01',
    itemTitle: 'Other Events',
    headlineBuilder: (c) => `${c.name} authorizes $1.5B share repurchase & structured note settlement update`,
    summaryBuilder: (c) =>
      `${c.name} (${c.ticker}) disclosed Board authorization for supplemental open-market share repurchases and secondary ATS liquidity alignment.`,
    sectionsBuilder: (c, filedDate) => [
      {
        heading: 'Item 8.01 Other Events',
        body: `On ${filedDate}, ${c.name} announced that its Board of Directors authorized an incremental $1,500,000,000 capital return and repurchase program effective immediately. Purchases may be executed through open-market transactions, 10b5-1 trading plans, or negotiated institutional blocks.`,
      },
    ],
  },
  {
    itemCode: '1.05',
    itemTitle: 'Material Cybersecurity Incidents',
    headlineBuilder: (c) => `${c.name} files cybersecurity resilience & zero-loss incident containment notice`,
    summaryBuilder: (c) =>
      `${c.name} (${c.ticker}) reported successful containment of an attempted third-party API credential probe with zero customer data or ledger impact.`,
    sectionsBuilder: (c, filedDate) => [
      {
        heading: 'Item 1.05 Material Cybersecurity Incidents',
        body: `On ${filedDate}, ${c.name} completed an assessment regarding unauthorized reconnaissance activity detected at a non-core vendor gateway. Automated isolation controls terminated the session within 4 minutes. Core settlement, custody enclaves, and financial reporting systems remained completely unaffected with zero material operational or financial impact.`,
      },
    ],
  },
];

function buildAccessionNumber(cik: string, seq: number): string {
  const prefix = cik.replace(/^0+/, '').padStart(10, '0').slice(0, 10);
  const tail = String(100000 + (seq % 899999)).padStart(6, '0');
  return `${prefix}-26-${tail}`;
}

function buildPlainText(
  company: TrackedCompany,
  accession: string,
  filedDate: string,
  rssTimestamp: string,
  itemCode: string,
  itemTitle: string,
  sections: Array<{ heading: string; body: string }>,
  fileNo: string,
  ein: string,
  stateOfIncorp: string,
): string {
  const bodyBlock = sections.map((s) => `${s.heading.toUpperCase()}\n${'-'.repeat(s.heading.length)}\n${s.body}`).join('\n\n');
  return `UNITED STATES
SECURITIES AND EXCHANGE COMMISSION
Washington, D.C. 20549

FORM 8-K
CURRENT REPORT
Pursuant to Section 13 or 15(d) of the Securities Exchange Act of 1934

Date of Report (Date of earliest event reported): ${filedDate}
SEC EDGAR Accession Number: ${accession}
RSS Feed Timestamp: ${rssTimestamp} UTC

EXACT NAME OF REGISTRANT AS SPECIFIED IN ITS CHARTER:
${company.name.toUpperCase()}
CIK: ${company.cik}   |   Ticker: ${company.ticker}
State of Incorporation: ${stateOfIncorp}   |   Commission File No.: ${fileNo}   |   IRS EIN: ${ein}

Check the appropriate box below if the Form 8-K filing is intended to simultaneously satisfy the filing obligation of the registrant:
[ ] Written communications pursuant to Rule 425 under the Securities Act
[ ] Soliciting material pursuant to Rule 14a-12 under the Exchange Act
[ ] Pre-commencement communications pursuant to Rule 14d-2(b) under the Exchange Act

Reported SEC Item: Item ${itemCode} — ${itemTitle}

================================================================================
${bodyBlock}
================================================================================

SIGNATURE

Pursuant to the requirements of the Securities Exchange Act of 1934, the registrant has duly caused this report to be signed on its behalf by the undersigned hereunto duly authorized.

${company.name.toUpperCase()}

By: /s/ Office of the Corporate Secretary
Title: Executive Vice President, General Counsel & Corporate Secretary
Date: ${filedDate}`;
}

function createEightKFiling(company: TrackedCompany, templateIdx: number, seq: number, isNew: boolean, offsetMinutes = 0): TrackedEightKFiling {
  const tpl = EIGHT_K_TEMPLATES[templateIdx % EIGHT_K_TEMPLATES.length];
  const now = new Date(Date.now() - offsetMinutes * 60_000);
  const filedDate = now.toISOString().slice(0, 10);
  const rssTimestamp = now.toISOString().slice(11, 19);
  const accessionNumber = buildAccessionNumber(company.cik, seq);
  const cikNum = String(Number(company.cik));
  const accNoNoDash = accessionNumber.replace(/-/g, '');
  const secArchiveUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNoNoDash}/${accessionNumber}-index.htm`;
  const fileNo = `001-${String(10000 + (Number(company.cik.slice(-4)) % 89999))}`;
  const ein = `${String(10 + (Number(company.cik.slice(-2)) % 85))}-${String(1000000 + (Number(company.cik.slice(-5)) % 8999999))}`;
  const stateOfIncorp = company.ticker === 'MSFT' ? 'Washington' : company.ticker === 'AAPL' ? 'California' : 'Delaware';
  const htmlSections = tpl.sectionsBuilder(company, filedDate);

  return {
    id: `${company.ticker}-${accessionNumber}-${seq}`,
    accessionNumber,
    cik: company.cik,
    ticker: company.ticker,
    companyName: company.name,
    formType: '8-K',
    itemCode: tpl.itemCode,
    itemTitle: tpl.itemTitle,
    filedAt: `${filedDate} ${rssTimestamp} UTC`,
    rssTimestamp,
    headline: tpl.headlineBuilder(company),
    summary: tpl.summaryBuilder(company),
    secArchiveUrl,
    commissionFileNumber: fileNo,
    irsEin: ein,
    stateOfIncorp,
    htmlSections,
    plainText: buildPlainText(
      company,
      accessionNumber,
      filedDate,
      rssTimestamp,
      tpl.itemCode,
      tpl.itemTitle,
      htmlSections,
      fileNo,
      ein,
      stateOfIncorp,
    ),
    isNew,
  };
}

export function buildDocumentFromComplianceFiling(f: ComplianceFiling): TrackedEightKFiling {
  const cik = '0001948201';
  const company: TrackedCompany = {
    ticker: f.assetSymbol,
    cik,
    name: f.issuer,
    sector: f.jurisdiction,
    active: true,
  };
  const sections = [
    {
      heading: `${f.formType} Regulatory Filing Overview`,
      body: `Issuer ${f.issuer} (${f.assetSymbol}) maintains active compliance registration under ${f.jurisdiction}. Current filing status is verified as "${f.status}" with filing date ${f.filedDate}.`,
    },
    {
      heading: 'Attestation & EDGAR Archive Reference',
      body: `Accession Number ${f.accessionNumber} has been indexed in the TWE ATS Regulatory Register and cross-checked against Rule 17a-4 WORM audit logs.`,
    },
  ];
  return {
    id: `reg-${f.id}`,
    accessionNumber: f.accessionNumber,
    cik,
    ticker: f.assetSymbol,
    companyName: f.issuer,
    formType: f.formType,
    itemCode: f.formType.includes('8-K') ? '8.01' : 'REG',
    itemTitle: `${f.formType} (${f.jurisdiction})`,
    filedAt: `${f.filedDate} 16:05:00 UTC`,
    rssTimestamp: '16:05:00',
    headline: `${f.issuer} — ${f.formType} (${f.jurisdiction})`,
    summary: `Filed ${f.filedDate} · Status: ${f.status} · Asset: ${f.assetSymbol}`,
    secArchiveUrl: `https://www.sec.gov/edgar/search/#/q=${encodeURIComponent(f.accessionNumber)}`,
    commissionFileNumber: '024-11982',
    irsEin: '88-4129044',
    stateOfIncorp: 'Delaware',
    htmlSections: sections,
    plainText: buildPlainText(
      company,
      f.accessionNumber,
      f.filedDate,
      '16:05:00',
      f.formType.includes('8-K') ? '8.01' : 'REG',
      f.formType,
      sections,
      '024-11982',
      '88-4129044',
      'Delaware',
    ),
    isNew: false,
  };
}

interface RegulatoryFilingMonitorProps {
  selectedFilingId?: string | null;
  onSelectDocument: (filing: TrackedEightKFiling) => void;
}

export const RegulatoryFilingMonitor: React.FC<RegulatoryFilingMonitorProps> = ({
  selectedFilingId,
  onSelectDocument,
}) => {
  const [trackedCompanies, setTrackedCompanies] = useState<TrackedCompany[]>(DEFAULT_TRACKED_COMPANIES);
  const [tickerFilter, setTickerFilter] = useState<string>('ALL');
  const [itemFilter, setItemFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [newTickerInput, setNewTickerInput] = useState('');
  const [pollingActive, setPollingActive] = useState(true);
  const [pollIntervalSec, setPollIntervalSec] = useState<number>(10);
  const [pollCount, setPollCount] = useState<number>(1);
  const [lastPolledAt, setLastPolledAt] = useState<string>(() => new Date().toISOString().slice(11, 19));
  const [secondsToNextPoll, setSecondsToNextPoll] = useState<number>(10);
  const [isPollingNow, setIsPollingNow] = useState(false);

  const seqRef = useRef(410200);
  const [filings, setFilings] = useState<TrackedEightKFiling[]>(() => [
    createEightKFiling(DEFAULT_TRACKED_COMPANIES[2], 1, 410101, true, 1),
    createEightKFiling(DEFAULT_TRACKED_COMPANIES[0], 4, 410102, true, 4),
    createEightKFiling(DEFAULT_TRACKED_COMPANIES[3], 0, 410103, false, 9),
    createEightKFiling(DEFAULT_TRACKED_COMPANIES[1], 3, 410104, false, 16),
    createEightKFiling(DEFAULT_TRACKED_COMPANIES[6], 5, 410105, false, 23),
    createEightKFiling(DEFAULT_TRACKED_COMPANIES[4], 2, 410106, false, 31),
  ]);

  const activeCompanies = useMemo(
    () => trackedCompanies.filter((c) => c.active),
    [trackedCompanies],
  );

  const countdownRef = useRef<number>(pollIntervalSec);

  const executeRssPoll = useCallback(() => {
    setIsPollingNow(true);
    const pool = activeCompanies.length > 0 ? activeCompanies : trackedCompanies;
    const company = pool[Math.floor(Math.random() * pool.length)];
    const templateIdx = Math.floor(Math.random() * EIGHT_K_TEMPLATES.length);
    seqRef.current += 1;
    const nextFiling = createEightKFiling(company, templateIdx, seqRef.current, true, 0);

    setFilings((prev) => [nextFiling, ...prev].slice(0, 35));
    setPollCount((c) => c + 1);
    setLastPolledAt(new Date().toISOString().slice(11, 19));
    countdownRef.current = pollIntervalSec;
    setSecondsToNextPoll(pollIntervalSec);
    window.setTimeout(() => setIsPollingNow(false), 320);
  }, [activeCompanies, trackedCompanies, pollIntervalSec]);

  useEffect(() => {
    countdownRef.current = pollIntervalSec;
    setSecondsToNextPoll(pollIntervalSec);
  }, [pollIntervalSec]);

  useEffect(() => {
    if (!pollingActive) return;
    const ticker = window.setInterval(() => {
      if (countdownRef.current <= 1) {
        executeRssPoll();
      } else {
        countdownRef.current -= 1;
        setSecondsToNextPoll(countdownRef.current);
      }
    }, 1000);
    return () => window.clearInterval(ticker);
  }, [pollingActive, executeRssPoll]);

  const toggleCompanyActive = (ticker: string) => {
    setTrackedCompanies((prev) =>
      prev.map((c) => (c.ticker === ticker ? { ...c, active: !c.active } : c)),
    );
  };

  const handleAddCompany = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newTickerInput.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '');
    if (!cleaned) return;
    if (trackedCompanies.some((c) => c.ticker === cleaned)) {
      setTrackedCompanies((prev) =>
        prev.map((c) => (c.ticker === cleaned ? { ...c, active: true } : c)),
      );
      setNewTickerInput('');
      return;
    }
    const known = KNOWN_DIRECTORY[cleaned];
    const added: TrackedCompany = known
      ? { ticker: cleaned, cik: known.cik, name: known.name, sector: known.sector, active: true }
      : {
          ticker: cleaned,
          cik: String(1000000 + Math.floor(Math.random() * 8999999)).padStart(10, '0'),
          name: `${cleaned} Holdings Corp.`,
          sector: 'Custom Tracked',
          active: true,
        };
    setTrackedCompanies((prev) => [...prev, added]);
    seqRef.current += 1;
    const immediateFiling = createEightKFiling(added, 0, seqRef.current, true, 0);
    setFilings((prev) => [immediateFiling, ...prev].slice(0, 35));
    setNewTickerInput('');
  };

  const markAllSeen = () => {
    setFilings((prev) => prev.map((f) => ({ ...f, isNew: false })));
  };

  const handleOpenFiling = (filing: TrackedEightKFiling) => {
    setFilings((prev) =>
      prev.map((f) => (f.id === filing.id ? { ...f, isNew: false } : f)),
    );
    onSelectDocument({ ...filing, isNew: false });
  };

  const activeTickerSet = useMemo(
    () => new Set(activeCompanies.map((c) => c.ticker)),
    [activeCompanies],
  );

  const visibleFilings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return filings.filter((f) => {
      if (!activeTickerSet.has(f.ticker)) return false;
      if (tickerFilter !== 'ALL' && f.ticker !== tickerFilter) return false;
      if (itemFilter !== 'ALL' && f.itemCode !== itemFilter) return false;
      if (!q) return true;
      return (
        f.ticker.toLowerCase().includes(q) ||
        f.companyName.toLowerCase().includes(q) ||
        f.accessionNumber.toLowerCase().includes(q) ||
        f.headline.toLowerCase().includes(q) ||
        f.itemTitle.toLowerCase().includes(q)
      );
    });
  }, [filings, activeTickerSet, tickerFilter, itemFilter, searchQuery]);

  const unreadCount = useMemo(
    () => visibleFilings.filter((f) => f.isNew).length,
    [visibleFilings],
  );

  return (
    <section
      aria-label="Regulatory Filing Monitor"
      className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden"
    >
      {/* Top Monitor Header & Simulated SEC RSS Poller Controls */}
      <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 p-1.5 rounded-md bg-[#A8843E]/10 dark:bg-[#D4B475]/15 border border-[#A8843E]/30 dark:border-[#D4B475]/30">
            <Rss className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
                Regulatory Filing Monitor — SEC EDGAR 8-K RSS Stream
              </h3>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${
                  pollingActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                }`}
              >
                <Radio className={`w-3 h-3 ${pollingActive ? 'animate-pulse' : ''}`} />
                {pollingActive ? `Polling ${pollIntervalSec}s` : 'Paused'}
              </span>
              {unreadCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#A8843E]/15 dark:bg-[#D4B475]/20 text-[#A8843E] dark:text-[#D4B475] border border-[#A8843E]/30">
                  <BellRing className="w-3 h-3" />
                  {unreadCount} NEW 8-K
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-[var(--twe-text-muted)] mt-0.5">
              Feed: sec.gov/cgi-bin/browse-edgar?action=getcurrent&amp;type=8-K&amp;output=atom · Polls #{pollCount} · Last check {lastPolledAt} UTC
              {pollingActive ? ` · Next in ${secondsToNextPoll}s` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[var(--twe-text-secondary)]">
            <span>Interval</span>
            <select
              aria-label="RSS poll interval"
              value={pollIntervalSec}
              onChange={(e) => setPollIntervalSec(Number(e.target.value))}
              className="px-2 py-1 rounded border border-[var(--twe-border-strong)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-primary)] font-mono text-[11px]"
            >
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => setPollingActive((p) => !p)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-surface)] hover:border-[#D4B475] text-[11px] font-medium cursor-pointer"
          >
            {pollingActive ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-500" />
                <span>Pause Feed</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-500" />
                <span>Resume Feed</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={executeRssPoll}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#A8843E]/50 dark:border-[#D4B475]/50 bg-[#A8843E]/10 dark:bg-[#D4B475]/10 text-[#A8843E] dark:text-[#D4B475] hover:bg-[#A8843E]/20 text-[11px] font-semibold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPollingNow ? 'animate-spin' : ''}`} />
            <span>Poll RSS Now</span>
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllSeen}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[var(--twe-border)] hover:border-[var(--twe-border-strong)] text-[11px] text-[var(--twe-text-secondary)] cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark Seen</span>
            </button>
          )}
        </div>
      </div>

      {/* Tracked Companies Selector + Filters */}
      <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-surface)] space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--twe-text-muted)] mr-1">
              Tracked Issuers ({activeCompanies.length}/{trackedCompanies.length}):
            </span>
            {trackedCompanies.map((company) => (
              <button
                key={company.ticker}
                type="button"
                onClick={() => toggleCompanyActive(company.ticker)}
                title={`${company.name} (CIK ${company.cik}) — click to ${company.active ? 'untrack' : 'track'}`}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                  company.active
                    ? 'bg-[var(--twe-bg-elevated)] border-[#A8843E]/45 dark:border-[#D4B475]/45 text-[var(--twe-text-primary)]'
                    : 'bg-transparent border-[var(--twe-border)] text-[var(--twe-text-muted)] opacity-55 line-through'
                }`}
              >
                <span className="font-semibold text-[#A8843E] dark:text-[#D4B475]">{company.ticker}</span>
                <span className="hidden sm:inline text-[10px] text-[var(--twe-text-muted)]">
                  {company.cik.slice(-4)}
                </span>
              </button>
            ))}
          </div>

          <form onSubmit={handleAddCompany} className="flex items-center gap-1.5">
            <input
              type="text"
              value={newTickerInput}
              onChange={(e) => setNewTickerInput(e.target.value)}
              placeholder="Track ticker (e.g. GOOGL)"
              maxLength={10}
              className="w-40 px-2.5 py-1 rounded border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] text-xs font-mono text-[var(--twe-text-primary)] placeholder:text-[var(--twe-text-muted)]"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] hover:border-[#D4B475] text-[11px] font-medium cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Track</span>
            </button>
          </form>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--twe-text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter accession, headline, company..."
                className="pl-8 pr-7 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs text-[var(--twe-text-primary)] placeholder:text-[var(--twe-text-muted)] w-64"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear filter"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--twe-text-muted)] hover:text-[var(--twe-text-primary)] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <select
              aria-label="Filter by tracked company"
              value={tickerFilter}
              onChange={(e) => setTickerFilter(e.target.value)}
              className="px-2.5 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-mono text-[var(--twe-text-primary)]"
            >
              <option value="ALL">All Tracked Companies</option>
              {activeCompanies.map((c) => (
                <option key={c.ticker} value={c.ticker}>
                  {c.ticker} — {c.name}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by SEC 8-K item"
              value={itemFilter}
              onChange={(e) => setItemFilter(e.target.value)}
              className="px-2.5 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-xs font-mono text-[var(--twe-text-primary)]"
            >
              <option value="ALL">All 8-K Items</option>
              <option value="1.01">Item 1.01 · Material Agreement</option>
              <option value="1.05">Item 1.05 · Cybersecurity</option>
              <option value="2.02">Item 2.02 · Financial Results</option>
              <option value="5.02">Item 5.02 · Officer / Director</option>
              <option value="7.01">Item 7.01 · Regulation FD</option>
              <option value="8.01">Item 8.01 · Other Events</option>
            </select>
          </div>

          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[var(--twe-text-muted)] tabular-nums">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span>Showing {visibleFilings.length} live 8-K filings</span>
          </div>
        </div>
      </div>

      {/* Real-Time 8-K Filings Feed List */}
      <div className="divide-y divide-[var(--twe-border)] max-h-[420px] overflow-y-auto">
        {visibleFilings.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-[var(--twe-text-muted)]">
            No 8-K filings match your current tracked company or item filters. Enable at least one tracked ticker or click &ldquo;Poll RSS Now&rdquo;.
          </div>
        ) : (
          visibleFilings.map((filing) => {
            const isSelected = selectedFilingId === filing.id;
            return (
              <div
                key={filing.id}
                className={`px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 transition-colors ${
                  isSelected
                    ? 'bg-[#A8843E]/10 dark:bg-[#D4B475]/10'
                    : 'hover:bg-[var(--twe-bg-elevated)]'
                }`}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-1.5 py-0.5 rounded font-mono font-semibold text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                      FORM {filing.formType}
                    </span>
                    <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-[var(--twe-text-secondary)]">
                      Item {filing.itemCode} · {filing.itemTitle}
                    </span>
                    <span className="font-mono font-semibold text-[#A8843E] dark:text-[#D4B475]">
                      {filing.ticker}
                    </span>
                    <span className="text-[var(--twe-text-primary)] font-medium truncate">
                      {filing.companyName}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--twe-text-muted)] tabular-nums">
                      CIK {filing.cik}
                    </span>
                    {filing.isNew && (
                      <span className="px-1.5 py-0.5 rounded font-mono font-semibold text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        NEW
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-medium text-[var(--twe-text-primary)]">
                    {filing.headline}
                  </p>
                  <p className="text-[11px] text-[var(--twe-text-secondary)] line-clamp-2">
                    {filing.summary}
                  </p>
                </div>

                <div className="flex flex-wrap lg:flex-col items-center lg:items-end justify-between gap-2 shrink-0">
                  <div className="text-right font-mono text-[11px] tabular-nums">
                    <div className="text-[var(--twe-text-primary)]">{filing.accessionNumber}</div>
                    <div className="text-[10px] text-[var(--twe-text-muted)]">RSS {filing.rssTimestamp} UTC</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href="#edgar-document-viewer"
                      onClick={(e) => {
                        e.preventDefault();
                        handleOpenFiling(filing);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${
                        isSelected
                          ? 'bg-[#A8843E] text-white border-[#A8843E] dark:bg-[#D4B475] dark:text-[#111318] dark:border-[#D4B475]'
                          : 'border-[#A8843E]/50 dark:border-[#D4B475]/50 bg-[var(--twe-bg-elevated)] text-[#A8843E] dark:text-[#D4B475] hover:bg-[#A8843E]/15'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{isSelected ? 'Viewing in ComplianceEdgarView' : 'View Document in ComplianceEdgarView'}</span>
                    </a>
                    <a
                      href={filing.secArchiveUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Open official SEC EDGAR archive index"
                      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md border border-[var(--twe-border)] text-[11px] text-[var(--twe-text-muted)] hover:text-[var(--twe-text-primary)] hover:border-[var(--twe-border-strong)]"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
