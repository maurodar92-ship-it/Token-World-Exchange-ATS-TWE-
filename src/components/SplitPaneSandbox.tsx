import React, { useState } from 'react';
import { Activity, BookOpen, Send, Sparkles, X } from 'lucide-react';
import { AIStatusIndicator } from './AIStatusIndicator';
import { isAiEnabled } from '../lib/aiMode';
import type { HubId, SovereignVaultState, TradeExecution } from '../types/twe';

interface SplitPaneSandboxProps {
  activeHub: HubId;
  vault: SovereignVaultState;
  recentTrades: TradeExecution[];
  aiModeEnabled?: boolean;
  onClose: () => void;
  onAdvanceTick: () => void;
}

export const SplitPaneSandbox: React.FC<SplitPaneSandboxProps> = ({
  activeHub,
  vault,
  recentTrades,
  aiModeEnabled,
  onClose,
  onAdvanceTick,
}) => {
  const [tab, setTab] = useState<'copilot' | 'tape' | 'spec'>('copilot');
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: `Cloud Sandbox ready. Inspecting "${activeHub}" · Sovereign Vault ${vault.vaultUuid.slice(0, 8)}… (${vault.maxUnitsFormula}).`,
    },
  ]);
  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || sending) return;
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setPrompt('');
    if (!isAiEnabled()) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'AI Mode is currently paused. Toggle AI Mode in the top navigation bar to resume live Sandbox Copilot responses.',
        },
      ]);
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, activeHub }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Assistant request failed');
      setMessages((prev) => [...prev, { role: 'assistant', text: json.reply }]);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: err instanceof Error ? err.message : 'Unable to reach Gemini endpoint.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <aside
      aria-label="Hybrid Manus x AI Studio Split-Pane Sandbox"
      className="relative w-full xl:w-[360px] shrink-0 border-l border-[var(--twe-border)] bg-[var(--twe-bg-surface)] flex flex-col h-full"
    >
      <AIStatusIndicator
        enabled={aiModeEnabled}
        processing={sending}
        placement="corner"
        className="!top-2.5 !right-10"
      />
      <div className="px-4 py-3 border-b border-[var(--twe-border)] flex items-center justify-between gap-2">
        <div className="font-display font-semibold text-xs uppercase tracking-wider text-[var(--twe-text-primary)] truncate pr-20">
          Cloud Sandbox
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close split pane"
          className="p-1 rounded hover:bg-[var(--twe-bg-muted)] text-[var(--twe-text-muted)] cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 border-b border-[var(--twe-border)] bg-[var(--twe-bg-elevated)] text-[11px]">
        {[
          { id: 'copilot', label: 'Copilot', icon: Sparkles },
          { id: 'tape', label: 'Live Tape', icon: Activity },
          { id: 'spec', label: 'API Spec', icon: BookOpen },
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as 'copilot' | 'tape' | 'spec')}
              className={`py-2 inline-flex items-center justify-center gap-1 font-medium border-b-2 cursor-pointer ${
                active
                  ? 'border-[#A8843E] dark:border-[#D4B475] text-[var(--twe-text-primary)]'
                  : 'border-transparent text-[var(--twe-text-muted)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3.5">
        {tab === 'copilot' && (
          <div className="flex flex-col h-full justify-between gap-3">
            <div className="space-y-2.5">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-md text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[var(--twe-gold-soft)] text-[var(--twe-text-primary)] ml-4'
                      : 'bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-[var(--twe-text-secondary)] mr-2'
                  }`}
                >
                  <div className="font-mono text-[10px] uppercase text-[var(--twe-text-muted)] mb-1">
                    {m.role === 'user' ? 'Operator' : 'TWE Sandbox Copilot'}
                  </div>
                  <div className="whitespace-pre-wrap">{m.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'tape' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={onAdvanceTick}
              className="w-full py-1.5 rounded border border-[var(--twe-border-strong)] bg-[var(--twe-bg-elevated)] text-xs font-medium text-[var(--twe-text-primary)] hover:border-[#D4B475] cursor-pointer"
            >
              Advance Market Sample Tick
            </button>
            <div className="divide-y divide-[var(--twe-border)] text-xs">
              {recentTrades.slice(0, 14).map((tr) => (
                <div key={tr.id} className="py-2 flex items-center justify-between font-mono tabular-nums">
                  <div>
                    <span className={tr.side === 'BUY' ? 'text-emerald-500' : 'text-red-500'}>{tr.side}</span>{' '}
                    <span className="font-semibold text-[var(--twe-text-primary)]">{tr.symbol}</span>
                    <div className="text-[10px] text-[var(--twe-text-muted)]">{tr.venue}</div>
                  </div>
                  <div className="text-right">
                    <div>{tr.quantity} @ ${tr.priceUsd.toFixed(2)}</div>
                    <div className="text-[10px] text-[var(--twe-text-muted)]">${tr.notionalUsd.toLocaleString('en-US')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'spec' && (
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] space-y-1">
              <div className="font-mono text-[10px] uppercase text-[#A8843E] dark:text-[#D4B475]">
                Sovereign Vault UUID
              </div>
              <div className="font-mono text-[11px] break-all">{vault.vaultUuid}</div>
              <div className="font-mono text-[11px] text-[var(--twe-text-muted)]">Bound: {vault.maxUnitsFormula}</div>
            </div>

            <div className="space-y-1.5">
              <div className="font-semibold text-[var(--twe-text-primary)]">Endpoints</div>
              <ul className="font-mono text-[11px] space-y-1 text-[var(--twe-text-secondary)]">
                <li>GET /api/twe/assets</li>
                <li>POST /api/twe/assets/batch-duplicate</li>
                <li>POST /api/twe/assets/batch-delete</li>
                <li>POST /api/twe/orders</li>
                <li>GET /api/twe/notifications/stream</li>
                <li>POST /api/trpc/twe.assets.list</li>
                <li>GET /readme.md</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {tab === 'copilot' && (
        <form onSubmit={handleSend} className="p-3 border-t border-[var(--twe-border)] flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask about vault, RSI, or calldata..."
            className="flex-1 px-2.5 py-1.5 rounded bg-[var(--twe-bg-elevated)] border border-[var(--twe-border)] text-xs text-[var(--twe-text-primary)]"
          />
          <button
            type="submit"
            disabled={sending || !prompt.trim()}
            className="p-2 rounded bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] disabled:opacity-40 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </aside>
  );
};
