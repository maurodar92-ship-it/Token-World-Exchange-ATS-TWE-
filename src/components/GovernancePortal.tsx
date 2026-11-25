import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Copy,
  ExternalLink,
  FastForward,
  Landmark,
  PlusCircle,
  Shield,
  ShieldCheck,
  UserCheck,
  Vote,
} from 'lucide-react';
import {
  DAO_STAKING_EVENT,
  loadDaoStakingSnapshot,
  type DaoStakingSnapshot,
} from './StakingPool';

interface GovernanceProposal {
  id: number;
  title: string;
  rationale: string;
  proposer: string;
  targetFeeBps: number;
  votesFor: number;
  votesAgainst: number;
  deadlineMs: number;
  executed: boolean;
  executedTxHash?: string;
  votedAddresses: string[];
}

interface AccessRoleSpec {
  roleName: string;
  keccakHash: string;
  scope: string;
  members: string[];
}

interface BridgeOnboardResponse {
  mode: 'live' | 'sandbox_ready';
  kycLinkId: string;
  kycUrl?: string;
  tosUrl?: string;
  status: string;
  customerName: string;
  customerEmail: string;
  accountType: string;
  message: string;
}

const PROPOSALS_STORAGE_KEY = 'twe-governance-dao-proposals-v1';
const FEE_BPS_STORAGE_KEY = 'twe-governance-dao-fee-bps-v1';
const OPERATOR_WALLET = '0x8F4a91C0E27b4d31886A02e9C41D7b22F10E90A4';
const MINIMUM_QUORUM = 100_000;
const VOTING_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

const INITIAL_PROPOSALS: GovernanceProposal[] = [
  {
    id: 1,
    title: 'TIP-001 · Calibrate Sovereign Treasury Swap Fee to 175 bps (1.75%)',
    rationale:
      'Lowers institutional ATS settlement friction while maintaining sustainable staking yield emissions for 90-day and 365-day TWATS lockers.',
    proposer: '0x71C04eA28810b49D120F8a91B4C62dE01944201B',
    targetFeeBps: 175,
    votesFor: 84_500,
    votesAgainst: 11_200,
    deadlineMs: Date.now() + 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000,
    executed: false,
    votedAddresses: ['0x71C04eA28810b49D120F8a91B4C62dE01944201B'],
  },
  {
    id: 2,
    title: 'TIP-002 · Establish 250 bps Commodity Tokenization Fee Cap',
    rationale:
      'Aligns ERC-3643 physical commodity minting fees with the UniversalTreasury reserve rebalancing target.',
    proposer: '0x3A917bF01288E1004a5C9b771D0E42a811C0903E',
    targetFeeBps: 250,
    votesFor: 162_400,
    votesAgainst: 14_000,
    deadlineMs: Date.now() - 3_600_000,
    executed: false,
    votedAddresses: ['0x3A917bF01288E1004a5C9b771D0E42a811C0903E'],
  },
  {
    id: 3,
    title: 'TIP-000 · Genesis Protocol Fee Baseline (200 bps)',
    rationale:
      'Initial DAO ratification setting the TokenWorld ATS Reserve transfer fee to 2.00% on mainnet deployment.',
    proposer: '0x0089E1fA6128B91C3F0419B8A3310D8E92C45001',
    targetFeeBps: 200,
    votesFor: 245_000,
    votesAgainst: 8_100,
    deadlineMs: Date.now() - 7 * 24 * 60 * 60 * 1000,
    executed: true,
    executedTxHash: '0x7a1e8f90c3b2d4510e66a901c88b72d44e109f8a63c210e94b801f33c4128d09',
    votedAddresses: ['0x0089E1fA6128B91C3F0419B8A3310D8E92C45001'],
  },
];

const INITIAL_RBAC_ROLES: AccessRoleSpec[] = [
  {
    roleName: 'GOVERNOR_ROLE',
    keccakHash: '0x7935bd0ae54bc31f548c14dba4d37c5c64b3f8ca900cb468fb8abd54d5894f55',
    scope: 'Proposal execution, protocol fee governance & empire charter approval',
    members: [OPERATOR_WALLET, '0x71C04eA28810b49D120F8a91B4C62dE01944201B'],
  },
  {
    roleName: 'TREASURY_ROLE',
    keccakHash: '0xe1dcbdb91df27212a29bc27177c840cf2f819ecf2187432e1fac86c2dd5dfca9',
    scope: 'UniversalTreasury & EmpireTreasury capital allocation and reserve rebalancing',
    members: ['0x9450FA578102C49A8E34D0012F9B43188A017702'],
  },
  {
    roleName: 'REGISTRAR_ROLE',
    keccakHash: '0xedcc084d3dcd65a1f7f23c65c46722faca6953d28e43150a467cf43e5c309238',
    scope: 'AssetRegistry verification, ERC-3643 identity registry & civilization listing',
    members: ['0x3643E29F0018A4B7C2D1190F8412C66E0419A220'],
  },
  {
    roleName: 'FACTORY_ROLE',
    keccakHash: '0xdfbefbf47cfe66b701d8cfdbce1de81c821590819cb07e71cb01b6602fb0ee27',
    scope: 'InfiniteAssetFactory sovereign token minting and tranche deployment',
    members: ['0x0089E1fA6128B91C3F0419B8A3310D8E92C45001'],
  },
  {
    roleName: 'EXCHANGE_ROLE',
    keccakHash: '0x4b13c8a7910f2c0981f6e52a1b4d8e23f7a09c54d2b180e7f6132a90c4e8123b',
    scope: 'ExchangeCore order matching & SettlementEngine clearing hooks',
    members: ['0x11A092C8B401F53D9E22C00847B19D6A51E40892'],
  },
  {
    roleName: 'AI_ROLE',
    keccakHash: '0x2d8a19c54e70b3f8a6c192d04e5f71a83c9b04d6e2f18a57c0b394d6e8f12a05',
    scope: 'AIGovernorCore risk telemetry, anomaly scoring & allocation recommendations',
    members: ['0xA10044E9C812F77B3D0591C4E820A76B5F1190C3'],
  },
  {
    roleName: 'SECURITY_ROLE',
    keccakHash: '0x9c4e71a82b50d3f91a6c8e402b7d5f193a8c6e04d2b7f195a3c8e06d4b2f19a7',
    scope: 'Emergency circuit breaker, vault freeze & calldata threat mitigation',
    members: [OPERATOR_WALLET],
  },
];

const TOKEN_GOVERNANCE_DAO_SOL = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

interface IFeeManagedToken is IERC20 {
    function setProtocolFeeBps(uint256 newFeeBps) external;
}

contract TokenGovernanceDAO is AccessControl {
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    uint256 public constant VOTING_DURATION = 3 days;
    uint256 public constant MINIMUM_QUORUM = 100_000 * 1e18;
    uint256 public constant MAX_FEE_BPS = 1000; // 10.00% hard ceiling

    IFeeManagedToken public immutable targetToken;
    uint256 public proposalCount;

    struct Proposal {
        uint256 id;
        address proposer;
        uint256 targetFeeBps;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 deadline;
        bool executed;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(uint256 indexed id, address indexed proposer, uint256 targetFeeBps, uint256 deadline);
    event VoteCast(uint256 indexed id, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed id, uint256 appliedFeeBps);

    constructor(address _targetToken, address _governor) {
        targetToken = IFeeManagedToken(_targetToken);
        _grantRole(DEFAULT_ADMIN_ROLE, _governor);
        _grantRole(GOVERNOR_ROLE, _governor);
    }

    function createProposal(uint256 targetFeeBps) external returns (uint256) {
        require(targetFeeBps <= MAX_FEE_BPS, "Fee exceeds 10% cap");
        proposalCount++;
        uint256 deadline = block.timestamp + VOTING_DURATION;
        proposals[proposalCount] = Proposal({
            id: proposalCount,
            proposer: msg.sender,
            targetFeeBps: targetFeeBps,
            votesFor: 0,
            votesAgainst: 0,
            deadline: deadline,
            executed: false
        });
        emit ProposalCreated(proposalCount, msg.sender, targetFeeBps, deadline);
        return proposalCount;
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];
        require(block.timestamp < p.deadline, "Voting ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        uint256 weight = targetToken.balanceOf(msg.sender);
        require(weight > 0, "No voting power");
        hasVoted[proposalId][msg.sender] = true;
        if (support) p.votesFor += weight;
        else p.votesAgainst += weight;
        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    function executeProposal(uint256 proposalId) external onlyRole(GOVERNOR_ROLE) {
        Proposal storage p = proposals[proposalId];
        require(block.timestamp >= p.deadline, "Voting active");
        require(!p.executed, "Already executed");
        require(p.votesFor >= MINIMUM_QUORUM && p.votesFor > p.votesAgainst, "Quorum or majority not met");
        p.executed = true;
        targetToken.setProtocolFeeBps(p.targetFeeBps);
        emit ProposalExecuted(proposalId, p.targetFeeBps);
    }
}`;

function loadProposals(): GovernanceProposal[] {
  try {
    const raw = window.localStorage.getItem(PROPOSALS_STORAGE_KEY);
    if (!raw) return INITIAL_PROPOSALS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PROPOSALS;
  } catch {
    return INITIAL_PROPOSALS;
  }
}

function loadFeeBps(): number {
  try {
    const raw = window.localStorage.getItem(FEE_BPS_STORAGE_KEY);
    const num = Number(raw);
    return Number.isFinite(num) && num >= 0 && num <= 1000 ? num : 200;
  } catch {
    return 200;
  }
}

function isSafeHttpsUrl(value?: string): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function formatRemaining(deadlineMs: number, nowMs: number): string {
  const diff = deadlineMs - nowMs;
  if (diff <= 0) return 'Voting Window Closed';
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  return days > 0 ? `${days}d ${remHours}h ${mins}m left` : `${remHours}h ${mins}m left`;
}

export const GovernancePortal: React.FC<{
  onOpenStaking?: () => void;
}> = ({ onOpenStaking }) => {
  const [activeTab, setActiveTab] = useState<'proposals' | 'rbac' | 'kyc'>('proposals');
  const [proposals, setProposals] = useState<GovernanceProposal[]>(() => loadProposals());
  const [currentFeeBps, setCurrentFeeBps] = useState<number>(() => loadFeeBps());
  const [staking, setStaking] = useState<DaoStakingSnapshot>(() => loadDaoStakingSnapshot());
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // New proposal form
  const [newTitle, setNewTitle] = useState('');
  const [newRationale, setNewRationale] = useState('');
  const [newFeeBps, setNewFeeBps] = useState('150');
  const [proposalFeedback, setProposalFeedback] = useState<string | null>(null);
  const [proposalError, setProposalError] = useState<string | null>(null);

  // RBAC interactive member grant state
  const [roles, setRoles] = useState<AccessRoleSpec[]>(INITIAL_RBAC_ROLES);
  const [grantRoleName, setGrantRoleName] = useState<string>('TREASURY_ROLE');
  const [grantAddress, setGrantAddress] = useState<string>('');
  const [rbacMessage, setRbacMessage] = useState<string | null>(null);
  const [copiedSol, setCopiedSol] = useState(false);

  // Bridge.xyz KYC Onboarding form
  const [kycName, setKycName] = useState('');
  const [kycEmail, setKycEmail] = useState('');
  const [kycType, setKycType] = useState<'individual' | 'business'>('business');
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);
  const [kycResult, setKycResult] = useState<BridgeOnboardResponse | null>(null);

  useEffect(() => {
    const onStakeChange = () => setStaking(loadDaoStakingSnapshot());
    window.addEventListener(DAO_STAKING_EVENT, onStakeChange);
    const tick = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => {
      window.removeEventListener(DAO_STAKING_EVENT, onStakeChange);
      window.clearInterval(tick);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(proposals));
    } catch {
      // ignore storage errors
    }
  }, [proposals]);

  useEffect(() => {
    try {
      window.localStorage.setItem(FEE_BPS_STORAGE_KEY, String(currentFeeBps));
    } catch {
      // ignore storage errors
    }
  }, [currentFeeBps]);

  const effectiveVotingPower = useMemo(() => {
    const boostedStake = Math.round(staking.stakedAmount * staking.multiplier);
    const liquidBalance = Math.round(staking.walletBalance * 0.25);
    return boostedStake + liquidBalance;
  }, [staking]);

  const handleCreateProposal = (e: React.FormEvent) => {
    e.preventDefault();
    setProposalError(null);
    setProposalFeedback(null);

    const feeNum = Number(newFeeBps);
    if (!Number.isInteger(feeNum) || feeNum < 0 || feeNum > 1000) {
      setProposalError('targetFeeBps must be an integer between 0 and 1000 (0.00% – 10.00%).');
      return;
    }
    if (!newTitle.trim()) {
      setProposalError('Provide a concise proposal title.');
      return;
    }

    const nextId = proposals.reduce((max, p) => Math.max(max, p.id), 0) + 1;
    const created: GovernanceProposal = {
      id: nextId,
      title: newTitle.trim(),
      rationale:
        newRationale.trim() ||
        `Update targetToken protocol fee parameter to ${feeNum} bps (${(feeNum / 100).toFixed(2)}%).`,
      proposer: OPERATOR_WALLET,
      targetFeeBps: feeNum,
      votesFor: 0,
      votesAgainst: 0,
      deadlineMs: Date.now() + VOTING_DURATION_MS,
      executed: false,
      votedAddresses: [],
    };
    setProposals((prev) => [created, ...prev]);
    setNewTitle('');
    setNewRationale('');
    setProposalFeedback(`Proposal #${nextId} published to TokenGovernanceDAO with 3-day voting window.`);
  };

  const handleVote = (proposalId: number, support: boolean) => {
    setProposalError(null);
    setProposalFeedback(null);
    if (effectiveVotingPower <= 0) {
      setProposalError('You need TWATS balance or staked vTWATS to cast a governance vote.');
      return;
    }

    setProposals((prev) =>
      prev.map((p) => {
        if (p.id !== proposalId) return p;
        if (p.votedAddresses.includes(OPERATOR_WALLET) || p.executed || nowMs >= p.deadlineMs) {
          return p;
        }
        return {
          ...p,
          votesFor: support ? p.votesFor + effectiveVotingPower : p.votesFor,
          votesAgainst: support ? p.votesAgainst : p.votesAgainst + effectiveVotingPower,
          votedAddresses: [...p.votedAddresses, OPERATOR_WALLET],
        };
      })
    );
    setProposalFeedback(
      `Recorded ${support ? 'FOR' : 'AGAINST'} vote on Proposal #${proposalId} with ${effectiveVotingPower.toLocaleString('en-US')} voting power.`
    );
  };

  const handleFastForwardDeadline = (proposalId: number) => {
    setProposals((prev) =>
      prev.map((p) =>
        p.id === proposalId && !p.executed ? { ...p, deadlineMs: Date.now() - 1000 } : p
      )
    );
    setNowMs(Date.now());
  };

  const handleExecuteProposal = (proposalId: number) => {
    const target = proposals.find((p) => p.id === proposalId);
    if (!target) return;
    if (target.executed) return;
    if (Date.now() < target.deadlineMs) {
      setProposalError('Voting window is still active. Wait until deadline expires before execution.');
      return;
    }
    if (target.votesFor < MINIMUM_QUORUM || target.votesFor <= target.votesAgainst) {
      setProposalError(
        `Execution blocked: requires >= ${MINIMUM_QUORUM.toLocaleString('en-US')} FOR votes and simple majority.`
      );
      return;
    }

    const txHash = `0x${Array.from({ length: 64 }, (_, idx) =>
      ((proposalId * 13 + target.targetFeeBps * 7 + idx * 19) % 16).toString(16)
    ).join('')}`;

    setProposals((prev) =>
      prev.map((p) =>
        p.id === proposalId ? { ...p, executed: true, executedTxHash: txHash } : p
      )
    );
    setCurrentFeeBps(target.targetFeeBps);
    setProposalFeedback(
      `Executed Proposal #${proposalId}: targetToken protocol fee updated to ${target.targetFeeBps} bps (${(
        target.targetFeeBps / 100
      ).toFixed(2)}%).`
    );
  };

  const handleGrantRole = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = grantAddress.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(cleaned)) {
      setRbacMessage('Enter a valid 42-character EVM address (0x followed by 40 hex characters).');
      return;
    }
    setRoles((prev) =>
      prev.map((r) =>
        r.roleName === grantRoleName && !r.members.includes(cleaned)
          ? { ...r, members: [...r.members, cleaned] }
          : r
      )
    );
    setGrantAddress('');
    setRbacMessage(`Granted ${grantRoleName} to ${cleaned} in TokenWorldAccessManager.`);
  };

  const handleCopySolidity = async () => {
    try {
      await navigator.clipboard.writeText(TOKEN_GOVERNANCE_DAO_SOL);
      setCopiedSol(true);
      window.setTimeout(() => setCopiedSol(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleBridgeOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setKycError(null);
    setKycResult(null);
    if (!kycName.trim() || !kycEmail.trim()) {
      setKycError('Full name and valid email address are required.');
      return;
    }

    setKycSubmitting(true);
    try {
      const res = await fetch('/api/twe/bridge/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: kycName.trim(),
          email: kycEmail.trim(),
          type: kycType,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Unable to generate Bridge KYC onboarding link.');
      }
      setKycResult(json as BridgeOnboardResponse);
    } catch (err: unknown) {
      setKycError(err instanceof Error ? err.message : 'Onboarding request failed.');
    } finally {
      setKycSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* DAO Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4">
          <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">
            Active Protocol Fee
          </div>
          <div className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-[#A8843E] dark:text-[#D4B475]">
            {currentFeeBps} bps{' '}
            <span className="text-xs text-[var(--twe-text-secondary)]">
              ({(currentFeeBps / 100).toFixed(2)}%)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-[var(--twe-text-secondary)]">
            Hard Cap: 1,000 bps (10.00%)
          </div>
        </div>

        <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4">
          <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">
            Your Governance Power
          </div>
          <div className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {effectiveVotingPower.toLocaleString('en-US')} vTWATS
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--twe-text-secondary)]">
            <span>{staking.multiplier.toFixed(2)}× staking boost active</span>
            {onOpenStaking && (
              <button
                type="button"
                onClick={onOpenStaking}
                className="text-[#A8843E] dark:text-[#D4B475] underline cursor-pointer"
              >
                Boost
              </button>
            )}
          </div>
        </div>

        <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4">
          <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">
            Minimum Quorum
          </div>
          <div className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-[var(--twe-text-primary)]">
            {MINIMUM_QUORUM.toLocaleString('en-US')} TWATS
          </div>
          <div className="mt-1 text-[11px] text-[var(--twe-text-secondary)]">
            Voting Duration: 3 Days (259,200s)
          </div>
        </div>

        <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4">
          <div className="text-[11px] uppercase tracking-wider text-[var(--twe-text-muted)]">
            Proposals Indexed
          </div>
          <div className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-[var(--twe-text-primary)]">
            {proposals.length} Total
          </div>
          <div className="mt-1 text-[11px] text-[var(--twe-text-secondary)]">
            {proposals.filter((p) => !p.executed).length} open ·{' '}
            {proposals.filter((p) => p.executed).length} executed on-chain
          </div>
        </div>
      </div>

      {/* Sub-Navigation Bar */}
      <div className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-md border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] p-1 text-xs">
          {[
            { id: 'proposals', label: 'DAO Proposals & Voting', icon: Vote },
            { id: 'rbac', label: 'Omega RBAC & Solidity', icon: Shield },
            { id: 'kyc', label: 'Bridge.xyz KYC Onboarding', icon: UserCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as 'proposals' | 'rbac' | 'kyc')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded font-medium cursor-pointer ${
                  active
                    ? 'bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10]'
                    : 'text-[var(--twe-text-secondary)]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="font-mono text-[11px] text-[var(--twe-text-muted)]">
          Governor Wallet: {OPERATOR_WALLET.slice(0, 8)}…{OPERATOR_WALLET.slice(-6)}
        </div>
      </div>

      {/* TAB 1: DAO PROPOSALS & VOTING */}
      {activeTab === 'proposals' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 space-y-3">
            {proposalError && (
              <div className="p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-xs text-red-600 dark:text-red-400">
                {proposalError}
              </div>
            )}
            {proposalFeedback && (
              <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{proposalFeedback}</span>
              </div>
            )}

            {proposals.map((p) => {
              const expired = nowMs >= p.deadlineMs;
              const quorumPct = Math.min(100, (p.votesFor / MINIMUM_QUORUM) * 100);
              const quorumMet = p.votesFor >= MINIMUM_QUORUM && p.votesFor > p.votesAgainst;
              const alreadyVoted = p.votedAddresses.includes(OPERATOR_WALLET);

              return (
                <div
                  key={p.id}
                  className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold text-[#A8843E] dark:text-[#D4B475]">
                          PROPOSAL #{p.id}
                        </span>
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-[var(--twe-text-primary)]">
                          Target Fee: {p.targetFeeBps} bps ({(p.targetFeeBps / 100).toFixed(2)}%)
                        </span>
                        {p.executed ? (
                          <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            Executed
                          </span>
                        ) : expired && quorumMet ? (
                          <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-[#D4B475]/20 text-[#A8843E] dark:text-[#D4B475] border border-[#D4B475]/40">
                            Ready to Execute
                          </span>
                        ) : expired ? (
                          <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            Quorum Not Met
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                            Active Voting
                          </span>
                        )}
                      </div>
                      <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
                        {p.title}
                      </h3>
                      <p className="text-xs text-[var(--twe-text-secondary)] leading-relaxed">
                        {p.rationale}
                      </p>
                    </div>

                    <div className="text-right font-mono text-[11px] text-[var(--twe-text-muted)] shrink-0">
                      <div className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatRemaining(p.deadlineMs, nowMs)}</span>
                      </div>
                      <div className="mt-0.5">
                        Proposer: {p.proposer.slice(0, 6)}…{p.proposer.slice(-4)}
                      </div>
                    </div>
                  </div>

                  {/* Quorum Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        For: {p.votesFor.toLocaleString('en-US')} TWATS ({quorumPct.toFixed(1)}% of quorum)
                      </span>
                      <span className="text-rose-600 dark:text-rose-400">
                        Against: {p.votesAgainst.toLocaleString('en-US')} TWATS
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#A8843E] to-emerald-500 transition-all"
                        style={{ width: `${quorumPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--twe-border)]">
                    <div className="flex flex-wrap items-center gap-2">
                      {!p.executed && !expired && (
                        <>
                          <button
                            type="button"
                            disabled={alreadyVoted}
                            onClick={() => handleVote(p.id, true)}
                            className="px-3 py-1.5 rounded bg-emerald-600 text-white text-xs font-semibold hover:opacity-90 disabled:opacity-45 cursor-pointer"
                          >
                            {alreadyVoted ? 'Voted' : 'Vote For'}
                          </button>
                          <button
                            type="button"
                            disabled={alreadyVoted}
                            onClick={() => handleVote(p.id, false)}
                            className="px-3 py-1.5 rounded border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-500/20 disabled:opacity-45 cursor-pointer"
                          >
                            Vote Against
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFastForwardDeadline(p.id)}
                            title="Advance simulated block timestamp past 3-day voting window"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[11px] font-mono text-[var(--twe-text-secondary)] hover:border-[#D4B475] cursor-pointer"
                          >
                            <FastForward className="w-3 h-3" />
                            <span>End Window</span>
                          </button>
                        </>
                      )}
                      {!p.executed && expired && (
                        <button
                          type="button"
                          disabled={!quorumMet}
                          onClick={() => handleExecuteProposal(p.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold hover:opacity-90 disabled:opacity-40 cursor-pointer"
                        >
                          <Landmark className="w-3.5 h-3.5" />
                          <span>Execute Proposal</span>
                        </button>
                      )}
                    </div>

                    {p.executedTxHash && (
                      <span className="font-mono text-[10px] text-[var(--twe-text-muted)]">
                        Tx: {p.executedTxHash.slice(0, 12)}…{p.executedTxHash.slice(-6)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Form: Submit New Governance Proposal */}
          <form
            onSubmit={handleCreateProposal}
            className="lg:col-span-4 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-5 space-y-4 h-fit"
          >
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#A8843E] dark:text-[#D4B475]">
                <PlusCircle className="w-3.5 h-3.5" />
                <span>createProposal(uint256 targetFeeBps)</span>
              </div>
              <h3 className="mt-1 font-display font-semibold text-sm text-[var(--twe-text-primary)]">
                Submit Protocol Parameter Proposal
              </h3>
            </div>

            <label className="block text-xs">
              <span className="text-[var(--twe-text-muted)]">Proposal Title</span>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. TIP-003 · Adjust Reserve Swap Fee to 150 bps"
                className="mt-1 w-full px-3 py-1.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-xs text-[var(--twe-text-primary)]"
              />
            </label>

            <label className="block text-xs">
              <span className="text-[var(--twe-text-muted)]">Target Fee BPS (0 – 1000)</span>
              <input
                type="number"
                min={0}
                max={1000}
                step={1}
                value={newFeeBps}
                onChange={(e) => setNewFeeBps(e.target.value)}
                className="mt-1 w-full px-3 py-1.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-sm tabular-nums text-[var(--twe-text-primary)]"
              />
              <span className="mt-1 block text-[11px] font-mono text-[var(--twe-text-muted)]">
                Equivalent fee: {((Number(newFeeBps) || 0) / 100).toFixed(2)}% (Solidity hard cap 10.00%)
              </span>
            </label>

            <label className="block text-xs">
              <span className="text-[var(--twe-text-muted)]">Economic Rationale</span>
              <textarea
                rows={4}
                value={newRationale}
                onChange={(e) => setNewRationale(e.target.value)}
                placeholder="Outline liquidity impact, treasury allocation goals, and risk guardrails..."
                className="mt-1 w-full p-2.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-xs text-[var(--twe-text-primary)]"
              />
            </label>

            <button
              type="submit"
              className="w-full py-2 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold hover:opacity-90 cursor-pointer"
            >
              Publish Proposal (3-Day Window)
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: OMEGA RBAC & SOLIDITY CONTRACT */}
      {activeTab === 'rbac' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex items-center justify-between">
              <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
                TokenWorldAccessManager · Omega RBAC Hierarchy
              </h3>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" /> OpenZeppelin AccessControl
              </span>
            </div>

            <div className="divide-y divide-[var(--twe-border)]">
              {roles.map((r) => (
                <div key={r.roleName} className="p-3.5 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-[#A8843E] dark:text-[#D4B475]">
                      {r.roleName}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--twe-text-muted)]">
                      {r.keccakHash.slice(0, 14)}…{r.keccakHash.slice(-8)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--twe-text-secondary)]">{r.scope}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {r.members.map((m) => (
                      <span
                        key={m}
                        className="px-2 py-0.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] font-mono text-[10px] text-[var(--twe-text-primary)]"
                      >
                        {m.slice(0, 8)}…{m.slice(-6)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={handleGrantRole}
              className="p-4 border-t border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-end gap-2.5"
            >
              <label className="w-44 text-xs">
                <span className="text-[var(--twe-text-muted)]">Role</span>
                <select
                  value={grantRoleName}
                  onChange={(e) => setGrantRoleName(e.target.value)}
                  className="mt-1 w-full px-2.5 py-1.5 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] font-mono text-xs text-[var(--twe-text-primary)]"
                >
                  {roles.map((r) => (
                    <option key={r.roleName} value={r.roleName}>
                      {r.roleName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex-1 min-w-[200px] text-xs">
                <span className="text-[var(--twe-text-muted)]">Grant EVM Address</span>
                <input
                  type="text"
                  value={grantAddress}
                  onChange={(e) => setGrantAddress(e.target.value)}
                  placeholder="0x..."
                  className="mt-1 w-full px-2.5 py-1.5 rounded bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] font-mono text-xs text-[var(--twe-text-primary)]"
                />
              </label>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold cursor-pointer"
              >
                grantRole()
              </button>
              {rbacMessage && (
                <div className="w-full text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                  {rbacMessage}
                </div>
              )}
            </form>
          </div>

          <div className="lg:col-span-5 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--twe-text-primary)]">
                <Code2 className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
                TokenGovernanceDAO.sol
              </span>
              <button
                type="button"
                onClick={handleCopySolidity}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--twe-border)] text-[11px] text-[var(--twe-text-secondary)] hover:border-[#D4B475] cursor-pointer"
              >
                {copiedSol ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSol ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-4 text-[11px] font-mono leading-relaxed text-[var(--twe-text-secondary)] overflow-x-auto max-h-[560px]">
              {TOKEN_GOVERNANCE_DAO_SOL}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 3: BRIDGE.XYZ KYC ONBOARDING */}
      {activeTab === 'kyc' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <form
            onSubmit={handleBridgeOnboard}
            className="lg:col-span-5 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-5 space-y-4"
          >
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#A8843E] dark:text-[#D4B475]">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Bridge.xyz Regulated Rail</span>
              </div>
              <h3 className="mt-1 font-display font-semibold text-sm text-[var(--twe-text-primary)]">
                Generate Institutional KYC / KYB Link
              </h3>
              <p className="mt-1 text-xs text-[var(--twe-text-secondary)]">
                Creates a server-authenticated Bridge KYC onboarding session via{' '}
                <span className="font-mono">POST /api/twe/bridge/onboard</span> using server-side{' '}
                <span className="font-mono">BRIDGE_API_KEY</span>.
              </p>
            </div>

            <label className="block text-xs">
              <span className="text-[var(--twe-text-muted)]">Legal Entity or Full Name</span>
              <input
                type="text"
                value={kycName}
                onChange={(e) => setKycName(e.target.value)}
                placeholder="e.g. Sovereign Capital Holdings LLC"
                className="mt-1 w-full px-3 py-1.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-xs text-[var(--twe-text-primary)]"
              />
            </label>

            <label className="block text-xs">
              <span className="text-[var(--twe-text-muted)]">Compliance Contact Email</span>
              <input
                type="email"
                value={kycEmail}
                onChange={(e) => setKycEmail(e.target.value)}
                placeholder="compliance@institution.com"
                className="mt-1 w-full px-3 py-1.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-xs text-[var(--twe-text-primary)]"
              />
            </label>

            <label className="block text-xs">
              <span className="text-[var(--twe-text-muted)]">Verification Track</span>
              <select
                value={kycType}
                onChange={(e) => setKycType(e.target.value as 'individual' | 'business')}
                className="mt-1 w-full px-3 py-1.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-xs text-[var(--twe-text-primary)]"
              >
                <option value="business">Business / Institutional KYB</option>
                <option value="individual">Accredited Individual KYC</option>
              </select>
            </label>

            {kycError && (
              <div className="p-2.5 rounded border border-red-500/40 bg-red-500/10 text-xs text-red-600 dark:text-red-400">
                {kycError}
              </div>
            )}

            <button
              type="submit"
              disabled={kycSubmitting}
              className="w-full py-2 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold hover:opacity-90 disabled:opacity-45 cursor-pointer"
            >
              {kycSubmitting ? 'Creating KYC Session...' : 'Generate Bridge KYC Link'}
            </button>
          </form>

          <div className="lg:col-span-7 bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg p-5 space-y-4">
            <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
              KYC Session Verification Output
            </h3>
            {!kycResult ? (
              <div className="py-12 text-center text-xs text-[var(--twe-text-muted)]">
                Submit an applicant profile on the left to generate a live Bridge.xyz KYC/KYB onboarding link or verify server-side configuration.
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-md bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase text-[#A8843E] dark:text-[#D4B475]">
                      Mode: {kycResult.mode === 'live' ? 'Live Bridge.xyz API' : 'Sandbox Ready'}
                    </span>
                    <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                      Status: {kycResult.status}
                    </span>
                  </div>
                  <div className="font-mono text-xs text-[var(--twe-text-primary)]">
                    Session ID: {kycResult.kycLinkId}
                  </div>
                  <p className="text-[var(--twe-text-secondary)]">{kycResult.message}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-xs">
                  <div className="p-3 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
                    <div className="text-[10px] uppercase text-[var(--twe-text-muted)]">Applicant</div>
                    <div className="mt-1 text-[var(--twe-text-primary)]">{kycResult.customerName}</div>
                  </div>
                  <div className="p-3 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)]">
                    <div className="text-[10px] uppercase text-[var(--twe-text-muted)]">Contact Email</div>
                    <div className="mt-1 text-[var(--twe-text-primary)]">{kycResult.customerEmail}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {isSafeHttpsUrl(kycResult.kycUrl) && (
                    <a
                      href={kycResult.kycUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] text-xs font-semibold"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Hosted KYC Link</span>
                    </a>
                  )}
                  {isSafeHttpsUrl(kycResult.tosUrl) && (
                    <a
                      href={kycResult.tosUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] text-xs font-medium text-[var(--twe-text-primary)]"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Terms of Service</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
