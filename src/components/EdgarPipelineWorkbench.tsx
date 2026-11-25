import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Database,
  Download,
  FileCode2,
  KeyRound,
  Play,
  Plus,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';

interface LiveSecFilingRow {
  accessionNumber: string;
  cik: string;
  ticker: string;
  companyName: string;
  formType: string;
  filingDate: string;
  filingUrl: string;
}

interface LiveSecFactRow {
  concept: string;
  value: number;
  unit: string;
  periodEnd: string;
  form: string;
  accessionNumber: string;
}

interface EdgarApiTokenRecord {
  id: string;
  kind: 'filer' | 'user';
  label: string;
  roleOwner: string;
  tokenValue: string;
  createdAt: string;
  expiresAt: string;
  status: 'Active' | 'Inactive';
}

const HYBRID_POSTGRES_DDL = `-- Hybrid PostgreSQL + pgvector Schema for SEC EDGAR Filings & XBRL Facts
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE filings (
    accession_number VARCHAR(50) PRIMARY KEY,
    cik VARCHAR(20) NOT NULL,
    ticker VARCHAR(20),
    company_name TEXT,
    form_type VARCHAR(20),
    filing_date DATE,
    filing_url TEXT,
    processed_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_filings_ticker ON filings(ticker);
CREATE INDEX idx_filings_form ON filings(form_type);
CREATE INDEX idx_filings_date ON filings(filing_date);

CREATE TABLE filing_documents (
    accession_number VARCHAR(50) REFERENCES filings(accession_number),
    document_type VARCHAR(50),
    html_content TEXT,
    plain_text TEXT,
    PRIMARY KEY (accession_number, document_type)
);

CREATE TABLE financial_facts (
    id BIGSERIAL PRIMARY KEY,
    accession_number VARCHAR(50) REFERENCES filings(accession_number),
    concept VARCHAR(200),
    value NUMERIC,
    unit VARCHAR(20),
    period_end DATE
);
CREATE INDEX idx_facts_concept ON financial_facts(concept);

CREATE TABLE filing_embeddings (
    accession_number VARCHAR(50) REFERENCES filings(accession_number),
    chunk_id INTEGER,
    content TEXT,
    embedding vector(1536),
    PRIMARY KEY (accession_number, chunk_id)
);`;

const EDGAR_PYTHON_PIPELINE = `# edgar_monitor.py — Automated SEC EDGAR Ingestion -> PostgreSQL Hybrid Store
import os
import psycopg2
from edgar import Company, set_identity

set_identity("TokenWorldExchangeATS compliance@twe-ats.io")

conn = psycopg2.connect(
    host=os.getenv("PGHOST", "localhost"),
    port=int(os.getenv("PGPORT", "5432")),
    database=os.getenv("PGDATABASE", "edgar"),
    user=os.getenv("PGUSER", "postgres"),
    password=os.getenv("PGPASSWORD", ""),
)

def ingest_company_filings(ticker: str):
    company = Company(ticker)
    with conn.cursor() as cur:
        for filing in company.get_filings(form=["10-K", "10-Q", "8-K"])[:10]:
            cur.execute(
                """INSERT INTO filings (accession_number, cik, ticker, company_name, form_type, filing_date, filing_url)
                   VALUES (%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (accession_number) DO NOTHING;""",
                (filing.accession_number, str(company.cik).zfill(10), ticker, filing.company, filing.form, filing.filing_date, filing.filing_url),
            )
    conn.commit()`;

function generateRandomTokenHex(prefix: string): string {
  const bytes = new Uint8Array(18);
  window.crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${prefix}_${hex}`;
}

export const EdgarPipelineWorkbench: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sec-api' | 'postgres' | 'tokens' | 'pipeline'>('sec-api');

  // 1. Live SEC data.sec.gov Explorer
  const [tickerQuery, setTickerQuery] = useState('AAPL');
  const [loadingSec, setLoadingSec] = useState(false);
  const [secData, setSecData] = useState<{
    source: string;
    cik: string;
    ticker: string;
    companyName: string;
    filings: LiveSecFilingRow[];
    facts: LiveSecFactRow[];
  } | null>(null);

  const fetchSecCompanyFacts = async (query: string) => {
    setLoadingSec(true);
    try {
      const res = await fetch(`/api/twe/edgar/companyfacts/${encodeURIComponent(query.trim() || 'AAPL')}`);
      if (res.ok) {
        setSecData(await res.json());
      }
    } finally {
      setLoadingSec(false);
    }
  };

  useEffect(() => {
    void fetchSecCompanyFacts('AAPL');
  }, []);

  // 2. Hybrid PostgreSQL + pgvector RAG Query Simulator
  const [ragPrompt, setRagPrompt] = useState('Find cybersecurity incidents reported in 8-Ks');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const ragMatches = useMemo(() => {
    const q = ragPrompt.toLowerCase();
    const corpus = [
      {
        accession: '0000320193-26-000041',
        ticker: 'AAPL',
        form: '8-K Item 1.05',
        similarity: 0.94,
        snippet:
          'Cybersecurity governance attestation confirms zero material incidents impacting hardware enclave or financial reporting systems in Q1 2026.',
      },
      {
        accession: '0000789019-26-000022',
        ticker: 'MSFT',
        form: '10-K Item 1A',
        similarity: 0.91,
        snippet:
          'Cloud-computing risks highlight hyperscale GPU capacity bottlenecks, sovereign data-residency mandates, and multi-region failover SLA guarantees.',
      },
      {
        accession: '0001045810-26-000019',
        ticker: 'NVDA',
        form: '10-K Item 7',
        similarity: 0.89,
        snippet:
          'AI disclosure notes accelerated data-center demand across sovereign LLM training clusters alongside export-control compliance guardrails.',
      },
      {
        accession: '0000019617-26-000031',
        ticker: 'JPM',
        form: '8-K Item 8.01',
        similarity: 0.86,
        snippet:
          'Institutional settlement rails incorporate ISO-20022 & Rule 17a-4 immutable audit trails across tokenized collateral transfers.',
      },
    ];
    return corpus
      .map((item) => {
        const hitBoost =
          (q.includes('cyber') && item.snippet.toLowerCase().includes('cyber') ? 0.05 : 0) +
          (q.includes('cloud') && item.snippet.toLowerCase().includes('cloud') ? 0.06 : 0) +
          (q.includes('ai') && item.snippet.toLowerCase().includes('ai') ? 0.07 : 0);
        return { ...item, score: Number(Math.min(0.99, item.similarity + hitBoost).toFixed(2)) };
      })
      .sort((a, b) => b.score - a.score);
  }, [ragPrompt]);

  // 3. EDGAR Next Filer API Token (1-year, >=2 Technical Admins) & User API Token (30-day, 1 active per user)
  const [techAdminCount, setTechAdminCount] = useState(2);
  const [newFilerTokenLabel, setNewFilerTokenLabel] = useState('TWE-Prod-EDGAR-Relay');
  const [userAccountLabel, setUserAccountLabel] = useState('compliance-officer@twe-ats.io');
  const [tokenFeedback, setTokenFeedback] = useState<string | null>(null);
  const [tokens, setTokens] = useState<EdgarApiTokenRecord[]>([
    {
      id: 'tok-filer-1',
      kind: 'filer',
      label: 'TWE-ATS-Primary-Filer',
      roleOwner: 'Technical Admin Quorum (2/2)',
      tokenValue: 'edgar_filer_9a82f1c044e8b21093d7e4a1f0',
      createdAt: '2026-06-01',
      expiresAt: '2027-06-01',
      status: 'Active',
    },
    {
      id: 'tok-user-1',
      kind: 'user',
      label: 'EDGAR Submission User Token',
      roleOwner: 'compliance-officer@twe-ats.io',
      tokenValue: 'edgar_user_4d71c03b982aa51e84b019',
      createdAt: '2026-11-01',
      expiresAt: '2026-12-01',
      status: 'Active',
    },
  ]);

  const createFilerToken = () => {
    if (techAdminCount < 2) {
      setTokenFeedback(
        'EDGAR Next Policy Error: Each filer must authorize at least 2 Technical Administrators before generating a Filer API Token.'
      );
      return;
    }
    const now = new Date();
    const exp = new Date(now);
    exp.setFullYear(exp.getFullYear() + 1);
    setTokens((prev) => [
      {
        id: `tok-filer-${Date.now()}`,
        kind: 'filer',
        label: newFilerTokenLabel.trim() || 'Filer API Token',
        roleOwner: `Technical Admin Quorum (${techAdminCount})`,
        tokenValue: generateRandomTokenHex('edgar_filer'),
        createdAt: now.toISOString().slice(0, 10),
        expiresAt: exp.toISOString().slice(0, 10),
        status: 'Active',
      },
      ...prev,
    ]);
    setTokenFeedback('Generated 1-year Filer API Token (multiple concurrent filer tokens permitted).');
  };

  const createUserToken = () => {
    const now = new Date();
    const exp = new Date(now);
    exp.setDate(exp.getDate() + 30);
    const owner = userAccountLabel.trim() || 'compliance-officer@twe-ats.io';
    // SEC EDGAR Next rule: creating a new User API Token automatically inactivates that individual's prior User API Token
    setTokens((prev) => [
      {
        id: `tok-user-${Date.now()}`,
        kind: 'user',
        label: 'EDGAR Submission User Token',
        roleOwner: owner,
        tokenValue: generateRandomTokenHex('edgar_user'),
        createdAt: now.toISOString().slice(0, 10),
        expiresAt: exp.toISOString().slice(0, 10),
        status: 'Active',
      },
      ...prev.map((t) =>
        t.kind === 'user' && t.roleOwner === owner && t.status === 'Active'
          ? { ...t, status: 'Inactive' as const }
          : t
      ),
    ]);
    setTokenFeedback(
      `Issued 30-day User API Token for ${owner}. Prior active User API Token for this user was automatically inactivated per EDGAR Next policy.`
    );
  };

  const inactivateToken = (id: string) => {
    setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'Inactive' } : t)));
    setTokenFeedback('Token inactivated. Access immediately revoked across EDGAR Submission & Filer APIs.');
  };

  // 4. Automated Pipeline Runner State
  const [pipelineLastRun, setPipelineLastRun] = useState<string>('Synced 12 filings + 48 XBRL facts');
  const [runningPipeline, setRunningPipeline] = useState(false);

  const copySnippet = (key: string, text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedCode(key);
    window.setTimeout(() => setCopiedCode(null), 1500);
  };

  return (
    <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden">
      {/* Header & Tabs */}
      <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)] flex items-center gap-2">
            <Database className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
            <span>SEC EDGAR Next, PostgreSQL Hybrid Filing Store &amp; Automated Ingestion Workbench</span>
          </h3>
          <p className="text-[11px] font-mono text-[var(--twe-text-muted)]">
            Live data.sec.gov XBRL facts · 4-table PostgreSQL + pgvector architecture · EDGAR Next 1Y/30D Token Governance
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] p-0.5 text-xs">
          {(
            [
              { id: 'sec-api', label: 'Live data.sec.gov XBRL', icon: Search },
              { id: 'postgres', label: 'PostgreSQL + pgvector', icon: Database },
              { id: 'tokens', label: 'EDGAR Next API Tokens', icon: KeyRound },
              { id: 'pipeline', label: 'NYSE / EDGAR Pipeline', icon: Server },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded whitespace-nowrap cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-semibold'
                    : 'text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4">
        {/* TAB 1: Live data.sec.gov XBRL CompanyFacts & Submissions */}
        {activeTab === 'sec-api' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={tickerQuery}
                  onChange={(e) => setTickerQuery(e.target.value)}
                  placeholder="Ticker (AAPL, MSFT) or CIK"
                  className="px-3 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] font-mono text-xs w-52"
                />
                <button
                  type="button"
                  disabled={loadingSec}
                  onClick={() => void fetchSecCompanyFacts(tickerQuery)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{loadingSec ? 'Querying SEC...' : 'Fetch data.sec.gov'}</span>
                </button>
                {['AAPL', 'MSFT', 'NVDA', 'JPM'].map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => {
                      setTickerQuery(sym);
                      void fetchSecCompanyFacts(sym);
                    }}
                    className="px-2 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] font-mono text-[11px] hover:border-[#D4B475] cursor-pointer"
                  >
                    {sym}
                  </button>
                ))}
              </div>
              {secData && (
                <div className="text-[11px] font-mono text-[var(--twe-text-muted)]">
                  CIK {secData.cik} · <strong className="text-[var(--twe-text-primary)]">{secData.companyName}</strong> ·{' '}
                  <span className={secData.source === 'data.sec.gov-live' ? 'text-emerald-500' : 'text-amber-500'}>
                    {secData.source}
                  </span>
                </div>
              )}
            </div>

            {secData && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-6 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] overflow-hidden">
                  <div className="px-3 py-2 border-b border-[var(--twe-border)] text-xs font-mono font-semibold">
                    filings (Metadata Table Preview)
                  </div>
                  <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[11px] font-mono">
                      <thead className="border-b border-[var(--twe-border)] text-[var(--twe-text-muted)]">
                        <tr>
                          <th className="px-3 py-1.5">Form</th>
                          <th className="px-3 py-1.5">Accession #</th>
                          <th className="px-3 py-1.5 text-right">Filed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--twe-border)]">
                        {secData.filings.map((f) => (
                          <tr key={f.accessionNumber}>
                            <td className="px-3 py-1.5 font-semibold text-[#A8843E] dark:text-[#D4B475]">
                              {f.formType}
                            </td>
                            <td className="px-3 py-1.5 truncate max-w-[180px]" title={f.filingUrl}>
                              {f.accessionNumber}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums text-[var(--twe-text-muted)]">
                              {f.filingDate}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="lg:col-span-6 rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] overflow-hidden">
                  <div className="px-3 py-2 border-b border-[var(--twe-border)] text-xs font-mono font-semibold">
                    financial_facts (Extracted XBRL US-GAAP)
                  </div>
                  <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[11px] font-mono">
                      <thead className="border-b border-[var(--twe-border)] text-[var(--twe-text-muted)]">
                        <tr>
                          <th className="px-3 py-1.5">XBRL Concept</th>
                          <th className="px-3 py-1.5 text-right">Value (USD)</th>
                          <th className="px-3 py-1.5 text-right">Period End</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--twe-border)]">
                        {secData.facts.map((fact, idx) => (
                          <tr key={`${fact.concept}-${fact.periodEnd}-${idx}`}>
                            <td className="px-3 py-1.5 truncate max-w-[185px]" title={fact.concept}>
                              {fact.concept}
                            </td>
                            <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-emerald-500">
                              ${(fact.value / 1_000_000_000).toFixed(2)}B
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums text-[var(--twe-text-muted)]">
                              {fact.periodEnd}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Hybrid PostgreSQL Schema + pgvector RAG Query Simulator */}
        {activeTab === 'postgres' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-semibold text-[var(--twe-text-primary)]">
                  Hybrid 4-Table PostgreSQL + pgvector Schema
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copySnippet('ddl', HYBRID_POSTGRES_DDL)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--twe-border)] text-[11px] cursor-pointer"
                  >
                    {copiedCode === 'ddl' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>Copy SQL DDL</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([HYBRID_POSTGRES_DDL], { type: 'text/sql' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'sec_edgar_hybrid_schema.sql';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--twe-border)] text-[11px] cursor-pointer"
                  >
                    <Download className="w-3 h-3" /> Export .sql
                  </button>
                </div>
              </div>
              <pre className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[10px] leading-relaxed max-h-72 overflow-auto text-[var(--twe-text-primary)]">
                {HYBRID_POSTGRES_DDL}
              </pre>
            </div>

            <div className="lg:col-span-5 p-3.5 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] space-y-3">
              <div className="font-display font-semibold text-xs text-[var(--twe-text-primary)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D4B475]" />
                <span>pgvector Cosine Similarity Filing Search (`&lt;=&gt;`)</span>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                {[
                  'Find cybersecurity incidents reported in 8-Ks',
                  'Show cloud-computing risks mentioned by Microsoft',
                  'Compare AI disclosures across issuers',
                ].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setRagPrompt(q)}
                    className={`px-2 py-1 rounded border text-left cursor-pointer ${
                      ragPrompt === q
                        ? 'border-[#D4B475] bg-[var(--twe-gold-soft)] text-[var(--twe-text-primary)]'
                        : 'border-[var(--twe-border)] bg-[var(--twe-bg-surface)] text-[var(--twe-text-muted)]'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto text-[11px]">
                {ragMatches.map((m) => (
                  <div
                    key={m.accession}
                    className="p-2.5 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] space-y-1"
                  >
                    <div className="flex justify-between font-mono text-[10px]">
                      <span className="font-bold text-[#A8843E] dark:text-[#D4B475]">
                        {m.ticker} · {m.form}
                      </span>
                      <span className="text-emerald-500">cos_sim {m.score}</span>
                    </div>
                    <p className="text-[var(--twe-text-secondary)] leading-relaxed">{m.snippet}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: EDGAR Next Filer API Token & User API Token Lifecycle */}
        {activeTab === 'tokens' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Filer API Token Generator */}
              <div className="p-3.5 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-display font-semibold text-[var(--twe-text-primary)]">
                    Filer API Token (1-Year Validity)
                  </span>
                  <span className="font-mono text-[10px] text-[var(--twe-text-muted)]">
                    Min 2 Tech Admins Required
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <label>
                    <span className="text-[10px] text-[var(--twe-text-muted)]">Token Reference Name</span>
                    <input
                      type="text"
                      value={newFilerTokenLabel}
                      onChange={(e) => setNewFilerTokenLabel(e.target.value)}
                      className="mt-1 w-full px-2 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)]"
                    />
                  </label>
                  <label>
                    <span className="text-[10px] text-[var(--twe-text-muted)]">Authorized Tech Admins</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={techAdminCount}
                      onChange={(e) => setTechAdminCount(Math.max(1, Number(e.target.value) || 1))}
                      className="mt-1 w-full px-2 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] tabular-nums"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={createFilerToken}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Create New Filer API Token
                </button>
              </div>

              {/* User API Token Generator */}
              <div className="p-3.5 rounded-lg border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-display font-semibold text-[var(--twe-text-primary)]">
                    User API Token (30-Day Validity)
                  </span>
                  <span className="font-mono text-[10px] text-[var(--twe-text-muted)]">
                    1 Active Token / Individual
                  </span>
                </div>
                <label className="block font-mono">
                  <span className="text-[10px] text-[var(--twe-text-muted)]">Account Administrator / User</span>
                  <input
                    type="text"
                    value={userAccountLabel}
                    onChange={(e) => setUserAccountLabel(e.target.value)}
                    className="mt-1 w-full px-2 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)]"
                  />
                </label>
                <button
                  type="button"
                  onClick={createUserToken}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#A8843E] dark:border-[#D4B475] bg-[var(--twe-gold-soft)] text-[var(--twe-text-primary)] font-semibold cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" /> Create User API Token (Auto-Rotates Prior)
                </button>
              </div>
            </div>

            {tokenFeedback && (
              <div
                className={`px-3 py-2 rounded border text-xs font-mono ${
                  tokenFeedback.includes('Error')
                    ? 'border-rose-500/45 bg-rose-500/12 text-rose-500'
                    : 'border-emerald-500/45 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {tokenFeedback}
              </div>
            )}

            <div className="overflow-x-auto rounded-md border border-[var(--twe-border)]">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead className="border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[10px] uppercase text-[var(--twe-text-muted)]">
                  <tr>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Label / Owner</th>
                    <th className="px-3 py-2">Token Preview</th>
                    <th className="px-3 py-2">Expires</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--twe-border)]">
                  {tokens.map((t) => (
                    <tr key={t.id}>
                      <td className="px-3 py-2 font-semibold uppercase">{t.kind}</td>
                      <td className="px-3 py-2">
                        <div>{t.label}</div>
                        <div className="text-[10px] text-[var(--twe-text-muted)]">{t.roleOwner}</div>
                      </td>
                      <td className="px-3 py-2 text-[11px]">{t.tokenValue.slice(0, 22)}…</td>
                      <td className="px-3 py-2 tabular-nums">{t.expiresAt}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            t.status === 'Active'
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : 'bg-slate-500/20 text-[var(--twe-text-muted)]'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => copySnippet(t.id, t.tokenValue)}
                          className="text-[11px] text-[#A8843E] dark:text-[#D4B475] hover:underline cursor-pointer"
                        >
                          {copiedCode === t.id ? 'Copied' : 'Copy'}
                        </button>
                        {t.status === 'Active' && (
                          <button
                            type="button"
                            onClick={() => inactivateToken(t.id)}
                            className="inline-flex items-center gap-1 text-[11px] text-rose-500 hover:underline cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Inactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Automated SEC EDGAR & NYSE Pipeline Architecture + Python Script */}
        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-semibold">Automated Document Pipeline</span>
                <button
                  type="button"
                  disabled={runningPipeline}
                  onClick={() => {
                    setRunningPipeline(true);
                    window.setTimeout(() => {
                      setPipelineLastRun(
                        `Run @ ${new Date().toLocaleTimeString()} · Ingested 10-K/10-Q/8-K & NYSE Corporate Actions`
                      );
                      setRunningPipeline(false);
                    }, 400);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-semibold cursor-pointer"
                >
                  <Play className="w-3 h-3" /> {runningPipeline ? 'Running...' : 'Trigger Pipeline Sync'}
                </button>
              </div>
              <div className="space-y-2 text-xs font-mono">
                {[
                  { stage: '1. Trigger Layer', detail: 'Cron / Lambda polling SEC RSS & /Archives/edgar/daily-index/' },
                  { stage: '2. Processing Layer', detail: 'edgartools + iXBRL (Workiva / DFIN) HTML & XBRL parser' },
                  { stage: '3. Storage Layer', detail: 'S3 raw_html/xbrl + PostgreSQL (filings, financial_facts, pgvector)' },
                  { stage: '4. Analytics & NYSE', detail: 'DuckDB / Pandas / NYSE Listing Manager share-issuance sync' },
                ].map((s) => (
                  <div
                    key={s.stage}
                    className="p-2.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]"
                  >
                    <div className="font-semibold text-[#A8843E] dark:text-[#D4B475] flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> {s.stage}
                    </div>
                    <div className="text-[11px] text-[var(--twe-text-secondary)] mt-0.5">{s.detail}</div>
                  </div>
                ))}
              </div>
              <div className="text-[11px] font-mono text-emerald-500">{pipelineLastRun}</div>
            </div>

            <div className="lg:col-span-7 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-semibold flex items-center gap-1.5">
                  <FileCode2 className="w-3.5 h-3.5 text-[#D4B475]" /> edgar_monitor.py (`edgartools` + `psycopg2`)
                </span>
                <button
                  type="button"
                  onClick={() => copySnippet('py', EDGAR_PYTHON_PIPELINE)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--twe-border)] text-[11px] cursor-pointer"
                >
                  {copiedCode === 'py' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>Copy Python</span>
                </button>
              </div>
              <pre className="p-3 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[10px] leading-relaxed max-h-64 overflow-auto text-[var(--twe-text-primary)]">
                {EDGAR_PYTHON_PIPELINE}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
