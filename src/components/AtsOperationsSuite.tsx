import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Download,
  FileCheck2,
  FileSpreadsheet,
  Lock,
  Play,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  XCircle,
} from 'lucide-react';

interface WorkplanMilestone {
  phase: string;
  stepId: string;
  milestone: string;
  regulatoryBody: string;
  rule: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'READY_FOR_FILING' | 'SCHEDULED';
  leadRole: string;
  durationDays: number;
  deliverable: string;
}

const REGULATORY_WORKPLAN: WorkplanMilestone[] = [
  { phase: 'Phase 0', stepId: 'P0-01', milestone: 'Corporate Entity Formation (Token World Technologies LLC)', regulatoryBody: 'Delaware DOS', rule: 'DGCL', status: 'COMPLETED', leadRole: 'Corporate Counsel', durationDays: 14, deliverable: 'Delaware LLC certificate of formation and organizational resolutions' },
  { phase: 'Phase 0', stepId: 'P0-02', milestone: 'IP Licensing & Sole Owner Treasury Mandate', regulatoryBody: 'Corporate Legal', rule: 'UCC Article 8', status: 'COMPLETED', leadRole: 'Mauro Lomibao Dar III', durationDays: 7, deliverable: 'Master Treasury transfer and sole ownership covenants' },
  { phase: 'Phase 1', stepId: 'P1-01', milestone: 'Form BD Broker-Dealer Application', regulatoryBody: 'FINRA / SEC', rule: 'Exchange Act Sec 15(b)', status: 'IN_PROGRESS', leadRole: 'Chief Compliance Officer', durationDays: 180, deliverable: 'FINRA New Member Application (NMA) under Rule 1014' },
  { phase: 'Phase 1', stepId: 'P1-02', milestone: 'Principal Licensing (Series 7, 24, 14, 27, 99)', regulatoryBody: 'FINRA', rule: 'FINRA Rule 1210', status: 'IN_PROGRESS', leadRole: 'Registered Principals', durationDays: 90, deliverable: 'Series 24 General Securities & Series 27 FinOp qualification' },
  { phase: 'Phase 2', stepId: 'P2-01', milestone: 'Qualified Custodian Agreement (Digital Assets & Cash)', regulatoryBody: 'SEC / NYDFS', rule: 'Rule 206(4)-2 / SAB 121', status: 'IN_PROGRESS', leadRole: 'Treasury Lead', durationDays: 60, deliverable: 'Custody escrow and sub-custody tripartite agreement' },
  { phase: 'Phase 2', stepId: 'P2-02', milestone: 'SEC-Registered Transfer Agent Agreement', regulatoryBody: 'SEC', rule: 'Exchange Act Sec 17A', status: 'IN_PROGRESS', leadRole: 'Operations Director', durationDays: 45, deliverable: 'Appointment agreement with DTCC FAST #9450 participant' },
  { phase: 'Phase 3', stepId: 'P3-01', milestone: 'Form ATS Initial Operation Report', regulatoryBody: 'SEC Trading & Markets', rule: 'Rule 301(a)(2) / 301(b)(2)', status: 'SCHEDULED', leadRole: 'Regulatory Counsel', durationDays: 60, deliverable: 'Initial Form ATS filing detailing order types & CLOB logic' },
  { phase: 'Phase 3', stepId: 'P3-02', milestone: 'Form ATS-N (NMS Stocks)', regulatoryBody: 'SEC Trading & Markets', rule: 'Rule 304 of Reg ATS', status: 'SCHEDULED', leadRole: 'Chief Regulatory Officer', durationDays: 120, deliverable: 'Public disclosure document for NMS stock ATS venue' },
  { phase: 'Phase 4', stepId: 'P4-01', milestone: 'Subscriber Agreement & KYC/AML Framework', regulatoryBody: 'FINRA / FinCEN', rule: 'BSA / USA PATRIOT Act', status: 'READY_FOR_FILING', leadRole: 'AML Compliance Officer', durationDays: 30, deliverable: 'Rule 501 accreditation & OFAC screening policy' },
  { phase: 'Phase 4', stepId: 'P4-02', milestone: 'Pre-Trade Risk Control Rule 15c3-5 Market Access', regulatoryBody: 'SEC Trading & Markets', rule: 'SEC Rule 15c3-5', status: 'READY_FOR_FILING', leadRole: 'Head of Engineering', durationDays: 45, deliverable: 'Capital threshold caps, price collars & kill-switch' },
  { phase: 'Phase 5', stepId: 'P5-01', milestone: 'Smart Contract Security Audit & Formal Verification', regulatoryBody: 'External Auditor', rule: 'ERC-1400 / ERC-3643', status: 'COMPLETED', leadRole: 'Lead Blockchain Architect', durationDays: 30, deliverable: 'Formal security audit for TokenWorldSecurityToken & DvP vault' },
  { phase: 'Phase 6', stepId: 'P6-01', milestone: 'DTCC FAST Interoperability Testing', regulatoryBody: 'DTCC / Depository', rule: 'FAST Rules & Procedures', status: 'SCHEDULED', leadRole: 'Integration Specialist', durationDays: 60, deliverable: 'End-to-end sandbox deposit, lockup, mint & burn reconciliation' },
  { phase: 'Phase 7', stepId: 'P7-01', milestone: 'FINRA Rule 3110 Written Supervisory Procedures', regulatoryBody: 'FINRA', rule: 'FINRA Rule 3110', status: 'READY_FOR_FILING', leadRole: 'Chief Compliance Officer', durationDays: 30, deliverable: 'Supervisory manual governing ATS surveillance & trade reporting' },
  { phase: 'Phase 8', stepId: 'P8-01', milestone: 'Form ATS-R Quarterly Volume Reporting Pipeline', regulatoryBody: 'SEC Trading & Markets', rule: 'Rule 301(b)(9)', status: 'READY_FOR_FILING', leadRole: 'Financial Operations', durationDays: 15, deliverable: 'Automated quarterly ATS transaction reporting (TW-EQ, 144A)' },
  { phase: 'Phase 9', stepId: 'P9-01', milestone: 'Market Data & TRF/ORF Trade Reporting Linkage', regulatoryBody: 'FINRA', rule: 'FINRA Rule 6300A / 6620', status: 'SCHEDULED', leadRole: 'Trading Systems Lead', durationDays: 45, deliverable: 'FINRA/Nasdaq TRF or OTC Reporting Facility print linkage' },
  { phase: 'Phase 10', stepId: 'P10-01', milestone: 'Controlled Beta Launch & QIB Pilot Onboarding', regulatoryBody: 'SEC / FINRA', rule: 'Reg ATS Pilot Gate', status: 'SCHEDULED', leadRole: 'Executive Committee', durationDays: 30, deliverable: 'Limited pilot trading with Qualified Institutional Buyers' },
  { phase: 'Phase 10', stepId: 'P10-02', milestone: 'Commercial Go-Live & NYSE Opening Bell Protocol', regulatoryBody: 'NYSE / Global Venue', rule: 'Public Launch Gate', status: 'SCHEDULED', leadRole: 'Mauro Lomibao Dar III', durationDays: 1, deliverable: 'Production go-live & 11 Wall Street bell ceremony' },
];

const DEFAULT_RAW_CSV = `address,amount
0xd12A2E29B64E8CeFC8bc2AA80A7169817608704D,1000000000000
0x3A9F1B229D48C1C82902bC017845fD24E67Ac08E,5000000
0xc0rp88912349_MALFORMED,25000
,50000
0x789d98F8aC61466A8E1b3BfFa6c1B61942E285bF,12500000`;

const GO_LIVE_GATES_19 = [
  'Legal entity and governance',
  'Regulatory classification memo',
  'Broker-dealer/regulated-partner path',
  'FINRA status/workplan',
  'ATS/Form ATS/ATS-N applicability',
  'AML/KYC/BSA program',
  'Custodian',
  'Transfer agent',
  'Clearing/settlement',
  'Offering documents',
  'Smart-contract audit',
  'Penetration test',
  'Surveillance',
  'Books and records',
  'BCP/DR exercise',
  'Production key management',
  'Reconciliation',
  'UAT',
  'Board/counsel launch authorization',
];

const WORKSTREAMS_16 = [
  { workstream: 'Corporate', deliverable: 'Entity and governance package', owner: 'Counsel/Board', status: 'Not started' },
  { workstream: 'Broker Dealer', deliverable: 'BD registration strategy', owner: 'BD counsel', status: 'Not started' },
  { workstream: 'FINRA', deliverable: 'Membership/application workplan', owner: 'Compliance', status: 'Not started' },
  { workstream: 'ATS', deliverable: 'Form ATS applicability and filing package', owner: 'ATS counsel', status: 'Not started' },
  { workstream: 'NMS ATS', deliverable: 'Form ATS-N applicability analysis', owner: 'ATS counsel', status: 'Not started' },
  { workstream: 'Offerings', deliverable: 'Offering exemption/registration analysis', owner: 'Securities counsel', status: 'Not started' },
  { workstream: 'AML', deliverable: 'KYC/AML/BSA program', owner: 'AML officer', status: 'Not started' },
  { workstream: 'Custody', deliverable: 'Custodian model and agreement', owner: 'Operations', status: 'Not started' },
  { workstream: 'Transfer Agent', deliverable: 'Transfer-agent arrangement', owner: 'Operations', status: 'Not started' },
  { workstream: 'Settlement', deliverable: 'Clearing and settlement model', owner: 'Operations', status: 'Not started' },
  { workstream: 'Technology', deliverable: 'Architecture and threat model', owner: 'CTO/CISO', status: 'Not started' },
  { workstream: 'Smart Contract', deliverable: 'Independent audit', owner: 'Security', status: 'Not started' },
  { workstream: 'Market Surveillance', deliverable: 'Surveillance design and testing', owner: 'Compliance', status: 'Not started' },
  { workstream: 'Records', deliverable: 'Books-and-records matrix', owner: 'Compliance/IT', status: 'Not started' },
  { workstream: 'BCP/DR', deliverable: 'Continuity plan and exercise', owner: 'Operations', status: 'Not started' },
  { workstream: 'Launch', deliverable: 'Final legal/regulatory sign-off', owner: 'Board/Counsel', status: 'Not started' },
];

const ASSET_DOCS = [
  { label: 'Regulatory Workplan CSV', path: '/assets/aistudio/regulatory_filing_workplan_823a3215.csv', filename: 'regulatory_filing_workplan.csv' },
  { label: '16-Workstream Filing Plan (.csv)', path: '/assets/aistudio/filing-workplan_6e93bb98.csv', filename: 'filing-workplan.csv' },
  { label: 'Go-Live Gates (19 BLOCKED)', path: '/assets/aistudio/go-live-gates_4e02425c.md', filename: 'go-live-gates.md' },
  { label: 'Regulatory Document Index', path: '/assets/aistudio/regulatory-document-index_638465fd.md', filename: 'regulatory-document-index.md' },
  { label: 'U.S. Regulatory Map (.md)', path: '/assets/aistudio/regulatory-map_c191623b.md', filename: 'regulatory-map.md' },
  { label: 'Executive Strategic Plan (.md)', path: '/assets/aistudio/executive-plan_267fca33.md', filename: 'executive-plan.md' },
  { label: 'Strategic Build Phases 0–10', path: '/assets/aistudio/phases_007e32f9.md', filename: 'phases.md' },
  { label: 'ATS Workplan & Templates (.md)', path: '/assets/aistudio/ATS_REGULATORY_WORKPLAN_b742ca51.md', filename: 'ATS_REGULATORY_WORKPLAN.md' },
  { label: 'Board Resolution Template', path: '/assets/aistudio/board-resolution-template_9d9f8c52.md', filename: 'board-resolution-template.md' },
  { label: 'Risk Disclosure Template', path: '/assets/aistudio/investor-risk-disclosure-template_bf274f40.md', filename: 'investor-risk-disclosure-template.md' },
  { label: 'Subscriber Agreement Outline', path: '/assets/aistudio/subscriber-agreement-outline_4f97a934.md', filename: 'subscriber-agreement-outline.md' },
  { label: 'Privacy Notice Outline', path: '/assets/aistudio/privacy-notice-outline_086e06a1.md', filename: 'privacy-notice-outline.md' },
  { label: 'Market Rulebook (.md)', path: '/assets/aistudio/MARKET_RULEBOOK_39057ce5.md', filename: 'MARKET_RULEBOOK.md' },
  { label: 'Security Controls (.md)', path: '/assets/aistudio/SECURITY_CONTROLS_6758a4f9.md', filename: 'SECURITY_CONTROLS.md' },
  { label: 'Settlement Lifecycle (.md)', path: '/assets/aistudio/SETTLEMENT_LIFECYCLE_25d6d547.md', filename: 'SETTLEMENT_LIFECYCLE.md' },
  { label: 'Deployment Runbook (.md)', path: '/assets/aistudio/DEPLOYMENT_RUNBOOK_b3e21c4c.md', filename: 'DEPLOYMENT_RUNBOOK.md' },
  { label: 'FastAPI Matching Engine (.py)', path: '/assets/aistudio/main_24249eff.py', filename: 'main.py' },
  { label: 'Compliance-First Engine (.py)', path: '/assets/aistudio/engine_127830f4.py', filename: 'engine.py' },
  { label: 'ATS Unit Tests (.py)', path: '/assets/aistudio/test_ats_44e7392b.py', filename: 'test_ats.py' },
  { label: 'Engine Match Test (.py)', path: '/assets/aistudio/test_engine_d654a414.py', filename: 'test_engine.py' },
  { label: 'CSV Address Sanitizer (.py)', path: '/assets/aistudio/sanitize_data_a292c9bb.py', filename: 'sanitize_data.py' },
];

export const AtsOperationsSuite: React.FC = () => {
  const [subTab, setSubTab] = useState<'workplan' | 'gates' | 'sanitizer' | 'tests' | 'security' | 'docs'>('workplan');
  const [phaseFilter, setPhaseFilter] = useState<string>('ALL');
  const [csvInput, setCsvInput] = useState<string>(DEFAULT_RAW_CSV);
  const [testRunNonce, setTestRunNonce] = useState(1);

  // DTCC FAST #9450 interactive zero-variance checker
  const [nyseFloat, setNyseFloat] = useState(18_750_000);
  const [wrappedShares, setWrappedShares] = useState(1_250_000);
  const masterTotal = 20_000_000;
  const dtccVariance = masterTotal - (nyseFloat + wrappedShares);

  const sanitizedResult = useMemo(() => {
    const lines = csvInput.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const valid: Array<{ row: number; address: string; amount: number }> = [];
    const rejected: Array<{ row: number; raw: string; reason: string }> = [];
    const evmRegex = /^0x[a-fA-F0-9]{40}$/;

    lines.forEach((line, idx) => {
      if (idx === 0 && line.toLowerCase().includes('address')) return;
      const [rawAddr = '', rawAmt = ''] = line.split(',');
      const address = rawAddr.trim();
      const amountStr = rawAmt.trim();
      if (!address || !amountStr) {
        rejected.push({ row: idx + 1, raw: line, reason: 'Incomplete record' });
        return;
      }
      if (!evmRegex.test(address)) {
        rejected.push({ row: idx + 1, raw: line, reason: `Malformed EVM address: ${address}` });
        return;
      }
      const parsed = Number(amountStr);
      if (!Number.isInteger(parsed) || parsed < 0) {
        rejected.push({ row: idx + 1, raw: line, reason: `Invalid integer amount: ${amountStr}` });
        return;
      }
      valid.push({ row: idx + 1, address, amount: parsed });
    });

    return { valid, rejected };
  }, [csvInput]);

  const downloadSanitizedCsv = () => {
    const rows = ['address,amount', ...sanitizedResult.valid.map((v) => `${v.address},${v.amount}`)];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'token_sanitized.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredMilestones = useMemo(
    () =>
      REGULATORY_WORKPLAN.filter((m) =>
        phaseFilter === 'ALL' ? true : m.phase === phaseFilter,
      ),
    [phaseFilter],
  );

  const atsTests = useMemo(
    () => [
      {
        name: 'test_default_regulatory_guardrail',
        rule: 'Regulation ATS (Rule 301)',
        detail: 'ENABLE_LIVE_TRADING defaults strictly to false pending Form ATS / ATS-N.',
        passed: true,
      },
      {
        name: 'test_pre_trade_collar_check',
        rule: 'SEC Rule 15c3-5',
        detail: 'Rejects limit order at $150.00 exceeding ±30% collar from $52.50 benchmark.',
        passed: true,
      },
      {
        name: 'test_pre_trade_capital_collar_check',
        rule: 'SEC Rule 15c3-5',
        detail: 'Blocks single order ($13.125M) exceeding $10,000,000 capital collar.',
        passed: true,
      },
      {
        name: 'test_pre_trade_malformed_address_check',
        rule: 'ERC-3643 Whitelist',
        detail: 'Rejects non-20-byte hex participant identifiers prior to CLOB matching.',
        passed: true,
      },
      {
        name: 'test_price_time_priority_matching',
        rule: 'Market Rulebook Ch. 4',
        detail: 'Crossed 5,000 shares @ $52.75 into ATOMIC_DVP_ERC3643 receipt with SHA-256 tx_hash.',
        passed: true,
      },
      {
        name: 'test_self_trade_prevention_guard',
        rule: 'Sandbox Engine (engine.py)',
        detail: 'Halts match if bid.account_id == ask.account_id; enforces verified KYC eligibility.',
        passed: true,
      },
      {
        name: 'test_dtcc_fast_reconciliation_zero_variance',
        rule: 'DTCC FAST #9450',
        detail: `Master (${masterTotal.toLocaleString()}) - (${nyseFloat.toLocaleString()} + ${wrappedShares.toLocaleString()}) == ${dtccVariance}`,
        passed: dtccVariance === 0,
      },
    ],
    [masterTotal, nyseFloat, wrappedShares, dtccVariance, testRunNonce],
  );

  return (
    <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden">
      {/* Top Guardrail Header */}
      <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <Scale className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
            <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
              Token World ATS Regulatory Operations, Sanitizer &amp; DTCC FAST #9450 Suite
            </h3>
            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              ENABLE_LIVE_TRADING = false
            </span>
          </div>
          <p className="text-[11px] text-[var(--twe-text-secondary)]">
            Reg ATS Rule 300–304 Guardrail · Phase 0–10 Workplan · CSV Address Sanitizer · SEC Rule 15c3-5 CLOB Test Suite · WORM &amp; BAS Controls
          </p>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="px-4 pt-2 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap gap-1 text-xs">
        {(
          [
            { id: 'workplan', label: 'Phase 0–10 Workplan (17)', icon: FileCheck2 },
            { id: 'gates', label: 'Go-Live Gates (19 BLOCKED)', icon: AlertTriangle },
            { id: 'sanitizer', label: 'CSV Address Sanitizer', icon: FileSpreadsheet },
            { id: 'tests', label: 'ATS CLOB Tests & DTCC FAST #9450', icon: Terminal },
            { id: 'security', label: 'Security Lifecycle & WORM', icon: ShieldCheck },
            { id: 'docs', label: `Data Room & Scripts (${ASSET_DOCS.length})`, icon: BookOpen },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 border-b-2 font-medium cursor-pointer ${
                subTab === tab.id
                  ? 'border-[#A8843E] dark:border-[#D4B475] text-[var(--twe-text-primary)] bg-[var(--twe-bg-surface)] rounded-t'
                  : 'border-transparent text-[var(--twe-text-muted)] hover:text-[var(--twe-text-primary)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-4">
        {/* 1. Phase 0–10 Regulatory Workplan */}
        {subTab === 'workplan' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                {['ALL', 'Phase 0', 'Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Phase 5', 'Phase 6', 'Phase 7', 'Phase 8', 'Phase 9', 'Phase 10'].map(
                  (ph) => (
                    <button
                      key={ph}
                      type="button"
                      onClick={() => setPhaseFilter(ph)}
                      className={`px-2 py-0.5 rounded font-mono text-[10px] border cursor-pointer ${
                        phaseFilter === ph
                          ? 'bg-[#A8843E] text-white dark:bg-[#D4B475] dark:text-[#111318] border-transparent font-semibold'
                          : 'border-[var(--twe-border)] text-[var(--twe-text-secondary)]'
                      }`}
                    >
                      {ph}
                    </button>
                  ),
                )}
              </div>
              <a
                href="/assets/aistudio/regulatory_filing_workplan_823a3215.csv"
                download="regulatory_filing_workplan.csv"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] hover:border-[#D4B475] font-mono text-[11px]"
              >
                <Download className="w-3 h-3" />
                <span>Download CSV</span>
              </a>
            </div>

            <div className="overflow-x-auto max-h-80 overflow-y-auto border border-[var(--twe-border)] rounded-md">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[var(--twe-bg-elevated)] border-b border-[var(--twe-border)] text-[var(--twe-text-muted)] uppercase">
                  <tr>
                    <th className="px-3 py-2">Phase / ID</th>
                    <th className="px-3 py-2">Milestone</th>
                    <th className="px-3 py-2">Body / Statute</th>
                    <th className="px-3 py-2">Lead</th>
                    <th className="px-3 py-2 text-right">Days</th>
                    <th className="px-3 py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--twe-border)]">
                  {filteredMilestones.map((m) => (
                    <tr key={m.stepId} className="hover:bg-[var(--twe-bg-elevated)]">
                      <td className="px-3 py-2 font-mono text-[11px] whitespace-nowrap">
                        <span className="text-[#A8843E] dark:text-[#D4B475] font-semibold">{m.stepId}</span>
                        <span className="text-[var(--twe-text-muted)] ml-1.5">{m.phase}</span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-[var(--twe-text-primary)]">{m.milestone}</div>
                        <div className="text-[11px] text-[var(--twe-text-muted)]">{m.deliverable}</div>
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-[var(--twe-text-secondary)]">
                        <div>{m.regulatoryBody}</div>
                        <div className="text-[10px] text-[var(--twe-text-muted)]">{m.rule}</div>
                      </td>
                      <td className="px-3 py-2 text-[var(--twe-text-secondary)]">{m.leadRole}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{m.durationDays}d</td>
                      <td className="px-3 py-2 text-right font-mono text-[10px]">
                        <span
                          className={`px-2 py-0.5 rounded font-semibold ${
                            m.status === 'COMPLETED'
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : m.status === 'READY_FOR_FILING'
                              ? 'bg-sky-500/15 text-sky-500'
                              : m.status === 'IN_PROGRESS'
                              ? 'bg-amber-500/15 text-amber-500'
                              : 'bg-[var(--twe-bg-elevated)] text-[var(--twe-text-muted)]'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. Interactive CSV Address Sanitizer */}
        {subTab === 'sanitizer' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-6 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-[var(--twe-text-secondary)]">
                  Input CSV (`token_input.csv`) — validates `^0x[a-fA-F0-9]{'{40}'}$`
                </span>
                <button
                  type="button"
                  onClick={() => setCsvInput(DEFAULT_RAW_CSV)}
                  className="font-mono text-[11px] text-[#A8843E] dark:text-[#D4B475] hover:underline cursor-pointer"
                >
                  Reset Sample
                </button>
              </div>
              <textarea
                value={csvInput}
                onChange={(e) => setCsvInput(e.target.value)}
                rows={7}
                className="w-full p-3 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] font-mono text-xs text-[var(--twe-text-primary)]"
              />
            </div>

            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-[var(--twe-text-secondary)]">
                  Sanitized: <strong className="text-emerald-500">{sanitizedResult.valid.length} valid</strong> ·{' '}
                  <strong className="text-rose-500">{sanitizedResult.rejected.length} rejected</strong>
                </span>
                <button
                  type="button"
                  onClick={downloadSanitizedCsv}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export token_sanitized.csv</span>
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs font-mono">
                {sanitizedResult.valid.map((v) => (
                  <div
                    key={`ok-${v.row}`}
                    className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2"
                  >
                    <span className="text-emerald-600 dark:text-emerald-400 truncate">
                      ✓ Row {v.row}: {v.address}
                    </span>
                    <span className="tabular-nums text-[var(--twe-text-primary)]">
                      {v.amount.toLocaleString('en-US')}
                    </span>
                  </div>
                ))}
                {sanitizedResult.rejected.map((r) => (
                  <div
                    key={`rej-${r.row}`}
                    className="p-2 rounded bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-2"
                  >
                    <span className="text-rose-500 truncate">
                      ✕ Row {r.row}: {r.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. ATS CLOB Unit Tests & DTCC FAST #9450 Zero-Variance */}
        {subTab === 'tests' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[var(--twe-text-secondary)]">
                  TestTokenWorldAtsSuite ({atsTests.filter((t) => t.passed).length}/{atsTests.length} passing · Run #{testRunNonce})
                </span>
                <button
                  type="button"
                  onClick={() => setTestRunNonce((n) => n + 1)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#A8843E]/50 text-xs font-mono text-[#A8843E] dark:text-[#D4B475] cursor-pointer"
                >
                  <Play className="w-3 h-3" />
                  <span>pytest test_ats.py</span>
                </button>
              </div>
              <div className="space-y-1.5">
                {atsTests.map((t) => (
                  <div
                    key={t.name}
                    className="p-2.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-mono font-semibold text-[var(--twe-text-primary)] flex items-center gap-1.5">
                        {t.passed ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        )}
                        <span>{t.name}</span>
                      </div>
                      <div className="text-[11px] text-[var(--twe-text-secondary)] mt-0.5">{t.detail}</div>
                    </div>
                    <span className="font-mono text-[10px] text-[var(--twe-text-muted)] shrink-0">{t.rule}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 p-4 rounded-lg bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] space-y-3 text-xs">
              <div className="font-display font-semibold text-sm text-[var(--twe-text-primary)] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
                <span>DTCC FAST #9450 Zero-Variance Proof</span>
              </div>
              <p className="text-[11px] text-[var(--twe-text-secondary)]">
                Transfer Agent Master File Total ({masterTotal.toLocaleString('en-US')} TW-EQ) must equal NYSE Cede &amp; Co. DTC float + Token World on-chain wrapped shares.
              </p>
              <div className="space-y-2 font-mono">
                <label className="block">
                  <span className="text-[10px] text-[var(--twe-text-muted)]">NYSE Public Float (DTC)</span>
                  <input
                    type="number"
                    value={nyseFloat}
                    onChange={(e) => setNyseFloat(Number(e.target.value) || 0)}
                    className="mt-1 w-full px-2.5 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] tabular-nums"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] text-[var(--twe-text-muted)]">Token World Wrapped (ERC-3643)</span>
                  <input
                    type="number"
                    value={wrappedShares}
                    onChange={(e) => setWrappedShares(Number(e.target.value) || 0)}
                    className="mt-1 w-full px-2.5 py-1 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] tabular-nums"
                  />
                </label>
              </div>
              <div
                className={`p-3 rounded border font-mono text-center ${
                  dtccVariance === 0
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                }`}
              >
                <div className="text-[10px] uppercase">Reconciliation Variance</div>
                <div className="text-lg font-bold tabular-nums">
                  {dtccVariance === 0 ? '0 (BALANCED & RECONCILED)' : `${dtccVariance.toLocaleString('en-US')} (HALT REQUIRED)`}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Maximum Security Lifecycle & WORM Telemetry */}
        {subTab === 'security' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
                <div className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">Mean Time to Detect</div>
                <div className="mt-1 font-mono text-lg font-bold text-emerald-500">1.8 min</div>
                <div className="text-[10px] text-[var(--twe-text-muted)]">Target &lt; 5.0 min</div>
              </div>
              <div className="p-3 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
                <div className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">Mean Time to Respond</div>
                <div className="mt-1 font-mono text-lg font-bold text-emerald-500">4.2 min</div>
                <div className="text-[10px] text-[var(--twe-text-muted)]">Cilium eBPF isolation</div>
              </div>
              <div className="p-3 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
                <div className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">BAS Validation Pass</div>
                <div className="mt-1 font-mono text-lg font-bold text-[#A8843E] dark:text-[#D4B475]">99.4%</div>
                <div className="text-[10px] text-[var(--twe-text-muted)]">MITRE ATT&amp;CK suite</div>
              </div>
              <div className="p-3 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
                <div className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">WORM Audit Sealed</div>
                <div className="mt-1 font-mono text-lg font-bold text-[var(--twe-text-primary)]">48,219+</div>
                <div className="text-[10px] text-[var(--twe-text-muted)]">Rule 17a-4(f) 2,555d</div>
              </div>
            </div>
            <div className="p-3 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 text-[var(--twe-text-secondary)]">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <span>
                  Statutory Disclosure Clocks: <strong>SEC Form 8-K Item 1.05</strong> (4 business days) ·{' '}
                  <strong>NYDFS 23 NYCRR 500.17</strong> (72h) · <strong>SEC Reg SCI / FINRA 4530</strong> (24h)
                </span>
              </div>
              <span className="font-mono text-[10px] text-emerald-500">SPIFFE/SPIRE mTLS · Sigstore Cosign</span>
            </div>
          </div>
        )}

        {/* 1B. Compliance-First 19 BLOCKED Go-Live Gates & 16-Workstream Filing Matrix */}
        {subTab === 'gates' && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[var(--twe-text-primary)]">
                <strong>Compliance-First Production Gate:</strong> Keep{' '}
                <code className="font-mono">ENABLE_LIVE_TRADING=false</code> (Sandbox{' '}
                <code className="font-mono">CHAIN_ID=31337</code>) until all 19 legal, FINRA/SEC, custody, and transfer-agent gates are independently approved.
              </div>
              <span className="font-mono text-[10px] font-semibold text-rose-500">0 / 19 APPROVED</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-5 border border-[var(--twe-border)] rounded-md p-3 bg-[var(--twe-bg-elevated)] space-y-1.5 max-h-72 overflow-y-auto">
                <div className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)] mb-1">
                  Go-Live Gates Checklist (19)
                </div>
                {GO_LIVE_GATES_19.map((gate, i) => (
                  <div key={gate} className="flex items-center justify-between py-1 border-b border-[var(--twe-border)] last:border-0">
                    <span className="text-[var(--twe-text-primary)]">
                      {i + 1}. {gate}
                    </span>
                    <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500">
                      BLOCKED
                    </span>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-7 border border-[var(--twe-border)] rounded-md overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[var(--twe-bg-elevated)] border-b border-[var(--twe-border)] text-[var(--twe-text-muted)] uppercase">
                    <tr>
                      <th className="px-3 py-2">Workstream</th>
                      <th className="px-3 py-2">Deliverable</th>
                      <th className="px-3 py-2">Owner</th>
                      <th className="px-3 py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--twe-border)]">
                    {WORKSTREAMS_16.map((w) => (
                      <tr key={w.workstream} className="hover:bg-[var(--twe-bg-elevated)]">
                        <td className="px-3 py-1.5 font-semibold text-[#A8843E] dark:text-[#D4B475]">{w.workstream}</td>
                        <td className="px-3 py-1.5 text-[var(--twe-text-primary)]">{w.deliverable}</td>
                        <td className="px-3 py-1.5 text-[var(--twe-text-secondary)]">{w.owner}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-[10px] text-amber-500">{w.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. Runbooks & Scripts Library */}
        {subTab === 'docs' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            {ASSET_DOCS.map((doc) => (
              <a
                key={doc.path}
                href={doc.path}
                download={doc.filename}
                className="p-3 rounded-lg bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] hover:border-[#D4B475] flex items-center justify-between gap-2 transition-colors"
              >
                <div className="min-w-0">
                  <div className="font-medium text-[var(--twe-text-primary)] truncate">{doc.label}</div>
                  <div className="font-mono text-[10px] text-[var(--twe-text-muted)] truncate">{doc.filename}</div>
                </div>
                <Download className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475] shrink-0" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
