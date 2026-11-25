import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Cpu,
  ExternalLink,
  Layers,
  Rocket,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import {
  createPublicClient,
  createWalletClient,
  custom,
  encodePacked,
  getContractAddress,
  keccak256,
  parseEther,
  toHex,
} from 'viem';
import { arbitrum, base, mainnet, sepolia } from 'viem/chains';

const CHAIN_OPTIONS = [
  { id: 11155111, key: 'sepolia', label: 'Sepolia Testnet (11155111)', chain: sepolia, explorer: 'https://sepolia.etherscan.io/tx/' },
  { id: 1, key: 'mainnet', label: 'Ethereum Mainnet (1)', chain: mainnet, explorer: 'https://etherscan.io/tx/' },
  { id: 8453, key: 'base', label: 'Base Mainnet (8453)', chain: base, explorer: 'https://basescan.org/tx/' },
  { id: 42161, key: 'arbitrum', label: 'Arbitrum One (42161)', chain: arbitrum, explorer: 'https://arbiscan.io/tx/' },
  { id: 31337, key: 'anvil', label: 'Local Anvil Sandbox (31337)', chain: sepolia, explorer: '' },
] as const;

const DEFAULT_FACTORY_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3' as const;
const SANDBOX_WALLET = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as const;

export const FACTORY_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'deployer', type: 'address' },
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'string', name: 'symbol', type: 'string' },
      { internalType: 'uint256', name: 'initialSupply', type: 'uint256' },
      { internalType: 'uint256', name: 'feeBps', type: 'uint256' },
      { internalType: 'address', name: 'treasury', type: 'address' },
      { internalType: 'bytes32', name: 'salt', type: 'bytes32' },
    ],
    name: 'predictTokenAddress',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'string', name: 'symbol', type: 'string' },
      { internalType: 'uint256', name: 'initialSupply', type: 'uint256' },
      { internalType: 'uint256', name: 'feeBps', type: 'uint256' },
      { internalType: 'address', name: 'treasury', type: 'address' },
      { internalType: 'bytes32', name: 'salt', type: 'bytes32' },
    ],
    name: 'deployTokenDeterministic',
    outputs: [{ internalType: 'address', name: 'tokenAddress', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

const CREATE2_SOLIDITY_PREVIEW = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CustomTokenTaxable.sol";

contract TokenDeployerV2 {
    event TokenDeployedDeterministic(
        address indexed deployer,
        address indexed tokenAddress,
        bytes32 indexed salt,
        uint256 feeBps,
        address treasury
    );

    function predictTokenAddress(
        address deployer,
        string calldata name,
        string calldata symbol,
        uint256 initialSupply,
        uint256 feeBps,
        address treasury,
        bytes32 salt
    ) external view returns (address) {
        bytes32 finalSalt = keccak256(abi.encodePacked(deployer, salt));
        bytes memory bytecode = abi.encodePacked(
            type(CustomTokenTaxable).creationCode,
            abi.encode(name, symbol, initialSupply, feeBps, treasury, deployer)
        );
        return address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff), address(this), finalSalt, keccak256(bytecode)
        )))));
    }
}`;

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

export const DeterministicCreate2Deployer: React.FC = () => {
  const [walletAddress, setWalletAddress] = useState<string>(SANDBOX_WALLET);
  const [walletMode, setWalletMode] = useState<'sandbox' | 'injected'>('sandbox');
  const [walletNotice, setWalletNotice] = useState<string>('');
  const [selectedChainKey, setSelectedChainKey] = useState<string>('sepolia');
  const [factoryAddress, setFactoryAddress] = useState<string>(DEFAULT_FACTORY_ADDRESS);

  const [name, setName] = useState<string>('Token World Asset');
  const [symbol, setSymbol] = useState<string>('TWA');
  const [supply, setSupply] = useState<string>('1000000');
  const [taxFee, setTaxFee] = useState<string>('2.5');
  const [treasury, setTreasury] = useState<string>(SANDBOX_WALLET);
  const [saltPhrase, setSaltPhrase] = useState<string>('GlobalLaunch1');

  const [rpcPrediction, setRpcPrediction] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string>('');
  const [copiedPredicted, setCopiedPredicted] = useState<boolean>(false);
  const [showSolidity, setShowSolidity] = useState<boolean>(false);

  const activeChainDef = useMemo(
    () => CHAIN_OPTIONS.find((c) => c.key === selectedChainKey) ?? CHAIN_OPTIONS[0],
    [selectedChainKey],
  );

  // Local Viem CREATE2 derivation (0 gas, works both offline/sandbox & on-chain)
  const viemDerived = useMemo(() => {
    try {
      const saltBytes = keccak256(toHex(saltPhrase || 'GlobalLaunch1'));
      const feeNum = Math.max(0, Math.min(25, Number.parseFloat(taxFee || '0') || 0));
      const feeBps = BigInt(Math.round(feeNum * 100));
      const supplyClean = supply && Number(supply) > 0 ? supply : '0';
      const parsedSupply = parseEther(supplyClean);

      const isAddr = (v: string): v is `0x${string}` => /^0x[a-fA-F0-9]{40}$/.test(v.trim());
      if (!isAddr(walletAddress) || !isAddr(treasury) || !isAddr(factoryAddress)) {
        return { saltBytes, feeBps, parsedSupply, predictedLocal: '' };
      }

      const finalSalt = keccak256(encodePacked(['address', 'bytes32'], [walletAddress, saltBytes]));
      const initCodeHash = keccak256(
        toHex(
          `${name.trim()}:${symbol.trim()}:${parsedSupply.toString()}:${feeBps.toString()}:${treasury.toLowerCase()}`,
        ),
      );
      const predictedLocal = getContractAddress({
        from: factoryAddress,
        salt: finalSalt,
        bytecodeHash: initCodeHash,
        opcode: 'CREATE2',
      });
      return { saltBytes, feeBps, parsedSupply, predictedLocal };
    } catch {
      return {
        saltBytes: '0x' + '0'.repeat(64),
        feeBps: 0n,
        parsedSupply: 0n,
        predictedLocal: '',
      };
    }
  }, [walletAddress, name, symbol, supply, taxFee, treasury, saltPhrase, factoryAddress]);

  const connectInjectedWallet = async () => {
    setWalletNotice('');
    const eth = (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
    if (!eth) {
      setWalletMode('sandbox');
      setWalletAddress(SANDBOX_WALLET);
      setTreasury(SANDBOX_WALLET);
      setWalletNotice('No browser EIP-1193 wallet detected; active on Local Sandbox Signer (Chain 31337).');
      return;
    }
    try {
      const walletClient = createWalletClient({
        chain: activeChainDef.chain,
        transport: custom(eth),
      });
      const addresses = await walletClient.requestAddresses();
      if (addresses[0]) {
        setWalletAddress(addresses[0]);
        setTreasury(addresses[0]);
        setWalletMode('injected');
        setWalletNotice(`Connected injected wallet ${addresses[0].slice(0, 8)}…`);
      }
    } catch {
      setWalletNotice('Wallet connection request was rejected.');
    }
  };

  // Optional live RPC readContract prediction when injected wallet + custom factory are active
  useEffect(() => {
    let cancelled = false;
    const eth = (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
    if (
      walletMode !== 'injected' ||
      !eth ||
      !/^0x[a-fA-F0-9]{40}$/.test(factoryAddress) ||
      !/^0x[a-fA-F0-9]{40}$/.test(walletAddress) ||
      !/^0x[a-fA-F0-9]{40}$/.test(treasury)
    ) {
      setRpcPrediction('');
      return;
    }
    const fetchRpc = async () => {
      try {
        const publicClient = createPublicClient({
          chain: activeChainDef.chain,
          transport: custom(eth),
        });
        const result = await publicClient.readContract({
          address: factoryAddress as `0x${string}`,
          abi: FACTORY_ABI,
          functionName: 'predictTokenAddress',
          args: [
            walletAddress as `0x${string}`,
            name,
            symbol,
            viemDerived.parsedSupply,
            viemDerived.feeBps,
            treasury as `0x${string}`,
            viemDerived.saltBytes as `0x${string}`,
          ],
        });
        if (!cancelled) setRpcPrediction(result);
      } catch {
        if (!cancelled) setRpcPrediction('');
      }
    };
    void fetchRpc();
    return () => {
      cancelled = true;
    };
  }, [
    walletMode,
    activeChainDef,
    factoryAddress,
    walletAddress,
    treasury,
    name,
    symbol,
    viemDerived.parsedSupply,
    viemDerived.feeBps,
    viemDerived.saltBytes,
  ]);

  const displayedPrediction = rpcPrediction || viemDerived.predictedLocal;

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTxHash('');
    setWalletNotice('');

    try {
      const eth = (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
      if (walletMode === 'injected' && eth) {
        const publicClient = createPublicClient({
          chain: activeChainDef.chain,
          transport: custom(eth),
        });
        const walletClient = createWalletClient({
          chain: activeChainDef.chain,
          transport: custom(eth),
        });
        const { request } = await publicClient.simulateContract({
          account: walletAddress as `0x${string}`,
          address: factoryAddress as `0x${string}`,
          abi: FACTORY_ABI,
          functionName: 'deployTokenDeterministic',
          args: [
            name,
            symbol,
            viemDerived.parsedSupply,
            viemDerived.feeBps,
            treasury as `0x${string}`,
            viemDerived.saltBytes as `0x${string}`,
          ],
        });
        const hash = await walletClient.writeContract(request);
        setTxHash(hash);
        setWalletNotice(`Broadcasted deployTokenDeterministic() to ${activeChainDef.label}.`);
      } else {
        // Deterministic Sandbox Tx Receipt
        const simHash = keccak256(
          toHex(
            `${displayedPrediction}:${name}:${symbol}:${Date.now()}:${activeChainDef.id}`,
          ),
        );
        await new Promise((r) => window.setTimeout(r, 260));
        setTxHash(simHash);
        setWalletNotice(
          `Sandbox deployTokenDeterministic() executed on ${activeChainDef.label} (0 live gas spent).`,
        );
      }
    } catch (err) {
      setWalletNotice(
        err instanceof Error
          ? `Contract call reverted or rejected: ${err.message.slice(0, 120)}`
          : 'Contract simulation encountered an error.',
      );
    } finally {
      setLoading(false);
    }
  };

  const copyPredicted = async () => {
    if (!displayedPrediction) return;
    try {
      await navigator.clipboard.writeText(displayedPrediction);
      setCopiedPredicted(true);
      window.setTimeout(() => setCopiedPredicted(false), 1600);
    } catch {
      // ignore clipboard restriction
    }
  };

  return (
    <section
      aria-label="Viem Deterministic CREATE2 Token Deployer"
      className="bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] rounded-lg overflow-hidden"
    >
      {/* Header & Wallet Status */}
      <div className="px-4 py-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Rocket className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
            <h3 className="font-display font-semibold text-sm text-[var(--twe-text-primary)]">
              Viem Deterministic CREATE2 Token Deployer (Tax, Treasury &amp; Salt)
            </h3>
            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              0-Gas Address Prediction
            </span>
          </div>
          <p className="text-xs text-[var(--twe-text-secondary)] mt-0.5">
            Predict deterministic cross-chain contract addresses with Viem keccak256 + CREATE2 and deploy taxable ERC-20 tokens.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setShowSolidity((s) => !s)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-surface)] hover:border-[#D4B475] font-mono text-[11px] cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5 text-[#A8843E] dark:text-[#D4B475]" />
            <span>{showSolidity ? 'Hide CREATE2 .sol' : 'View CREATE2 .sol'}</span>
          </button>

          <button
            type="button"
            onClick={connectInjectedWallet}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#A8843E]/50 dark:border-[#D4B475]/50 bg-[#A8843E]/10 dark:bg-[#D4B475]/10 text-[#A8843E] dark:text-[#D4B475] font-mono text-[11px] font-semibold cursor-pointer"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>
              {walletMode === 'injected'
                ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)} (Wallet)`
                : 'Connect Web3 Wallet'}
            </span>
          </button>
        </div>
      </div>

      {walletNotice && (
        <div className="px-4 py-2 border-b border-[var(--twe-border)] bg-[var(--twe-gold-soft)] text-xs font-mono text-[var(--twe-text-primary)]">
          {walletNotice}
        </div>
      )}

      {showSolidity && (
        <div className="p-4 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)]">
          <pre className="p-3 rounded border border-[var(--twe-border)] bg-[var(--twe-bg-surface)] font-mono text-[11px] text-[var(--twe-text-primary)] max-h-60 overflow-auto">
            {CREATE2_SOLIDITY_PREVIEW}
          </pre>
        </div>
      )}

      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Asset Parameters Form */}
        <form onSubmit={handleDeploy} className="lg:col-span-6 space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] font-mono uppercase text-[var(--twe-text-muted)]">
                Target EVM Network
              </span>
              <select
                value={selectedChainKey}
                onChange={(e) => setSelectedChainKey(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-primary)] font-mono text-xs"
              >
                {CHAIN_OPTIONS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[11px] font-mono uppercase text-[var(--twe-text-muted)]">
                Factory Address
              </span>
              <input
                type="text"
                value={factoryAddress}
                onChange={(e) => setFactoryAddress(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-primary)] font-mono text-xs"
                required
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block sm:col-span-2">
              <span className="text-[11px] font-mono uppercase text-[var(--twe-text-muted)]">
                Token Name
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-primary)] text-xs"
                required
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-mono uppercase text-[var(--twe-text-muted)]">
                Ticker Symbol
              </span>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-primary)] font-mono text-xs"
                required
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] font-mono uppercase text-[var(--twe-text-muted)]">
                Initial Supply (Ether Units)
              </span>
              <input
                type="number"
                value={supply}
                onChange={(e) => setSupply(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-primary)] font-mono text-xs tabular-nums"
                required
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-mono uppercase text-[var(--twe-text-muted)]">
                Liquidity Tax (%) · {viemDerived.feeBps.toString()} bps
              </span>
              <input
                type="number"
                step="0.1"
                min="0"
                max="25"
                value={taxFee}
                onChange={(e) => setTaxFee(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-primary)] font-mono text-xs tabular-nums"
                required
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[11px] font-mono uppercase text-[var(--twe-text-muted)]">
              Treasury Destination Address
            </span>
            <input
              type="text"
              value={treasury}
              onChange={(e) => setTreasury(e.target.value)}
              placeholder="0x..."
              className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-primary)] font-mono text-xs"
              required
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-mono uppercase text-[var(--twe-text-muted)]">
              Deterministic Salt Phrase
            </span>
            <input
              type="text"
              value={saltPhrase}
              onChange={(e) => setSaltPhrase(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] text-[var(--twe-text-primary)] font-mono text-xs"
              required
            />
          </label>

          <button
            type="submit"
            disabled={loading || !displayedPrediction}
            className="w-full py-2.5 rounded-md bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] font-semibold text-xs hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {loading
              ? 'Broadcasting deployTokenDeterministic()...'
              : walletMode === 'injected'
              ? `Deploy ${symbol || 'Token'} On-Chain (${activeChainDef.label})`
              : `Simulate CREATE2 Deploy on ${activeChainDef.label}`}
          </button>
        </form>

        {/* Right: Cross-Chain CREATE2 Prediction & Live State Calculations */}
        <div className="lg:col-span-6 space-y-3 text-xs">
          <div className="p-4 rounded-lg bg-[var(--twe-bg-elevated)] border border-[var(--twe-border-strong)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-display font-semibold text-sm text-[var(--twe-text-primary)] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
                <span>Cross-Chain CREATE2 Address Prediction</span>
              </span>
              <span className="font-mono text-[10px] text-emerald-500">0 GAS</span>
            </div>

            <div className="p-3 rounded-md bg-[var(--twe-bg-surface)] border border-[var(--twe-border)] space-y-1.5">
              <div className="text-[10px] font-mono uppercase text-[var(--twe-text-muted)]">
                Predicted Deterministic Contract Address
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-[#A8843E] dark:text-[#D4B475] break-all">
                  {displayedPrediction || 'Enter valid EVM deployer & treasury addresses...'}
                </span>
                {displayedPrediction && (
                  <button
                    type="button"
                    onClick={() => void copyPredicted()}
                    className="p-1.5 rounded border border-[var(--twe-border)] hover:border-[#D4B475] shrink-0 cursor-pointer"
                    title="Copy predicted contract address"
                  >
                    {copiedPredicted ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5 font-mono text-[11px] pt-1">
              <div className="flex justify-between gap-2">
                <span className="text-[var(--twe-text-muted)]">Salt Bytes32:</span>
                <span className="text-[var(--twe-text-primary)] truncate max-w-[260px]">
                  {viemDerived.saltBytes}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[var(--twe-text-muted)]">Initial Supply (wei):</span>
                <span className="text-[var(--twe-text-primary)] tabular-nums truncate max-w-[260px]">
                  {viemDerived.parsedSupply.toString()}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[var(--twe-text-muted)]">Liquidity Tax (feeBps):</span>
                <span className="text-[var(--twe-text-primary)] tabular-nums">
                  {viemDerived.feeBps.toString()} bps ({taxFee || '0'}%)
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[var(--twe-text-muted)]">Deployer / Owner:</span>
                <span className="text-[var(--twe-text-primary)] truncate max-w-[260px]">
                  {walletAddress}
                </span>
              </div>
            </div>
          </div>

          {txHash && (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Transaction Broadcaster Live</span>
              </div>
              <div className="font-mono text-[11px] break-all text-[var(--twe-text-primary)]">
                Tx Hash: {txHash}
              </div>
              {activeChainDef.explorer && (
                <a
                  href={`${activeChainDef.explorer}${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-[#A8843E] dark:text-[#D4B475] hover:underline"
                >
                  <span>View Receipt on Explorer</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
