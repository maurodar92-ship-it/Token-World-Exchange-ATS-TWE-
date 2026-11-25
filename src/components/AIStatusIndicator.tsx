import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { isAiEnabled, subscribeAiMode } from '../lib/aiMode';

export interface AIStatusIndicatorProps {
  /** Optional explicit override from parent App state; defaults to live global aiModeEnabled state. */
  enabled?: boolean;
  /** Optional processing state to intensify pulse during active Gemini inference. */
  processing?: boolean;
  /** Optional label override (defaults to "AI Active"). */
  label?: string;
  /** Positioning mode: corner places a subtle floating indicator in top-right of a relative container. */
  placement?: 'corner' | 'inline';
  className?: string;
}

export const AIStatusIndicator: React.FC<AIStatusIndicatorProps> = ({
  enabled,
  processing = false,
  label = 'AI Active',
  placement = 'corner',
  className = '',
}) => {
  const [globalEnabled, setGlobalEnabled] = useState<boolean>(() => isAiEnabled());

  useEffect(() => {
    setGlobalEnabled(isAiEnabled());
    return subscribeAiMode(setGlobalEnabled);
  }, []);

  const active = typeof enabled === 'boolean' ? enabled : globalEnabled;

  if (!active) {
    return null;
  }

  const positionClasses =
    placement === 'corner'
      ? 'absolute top-2.5 right-2.5 z-20'
      : 'inline-flex';

  return (
    <div
      role="status"
      aria-live="polite"
      title={processing ? 'AI inference running' : 'AI Mode enabled for this module'}
      className={`${positionClasses} inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-500/15 backdrop-blur-sm text-[10px] font-mono font-medium text-emerald-700 dark:text-emerald-300 select-none pointer-events-none ${className}`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span
          className={`absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${
            processing ? 'animate-ping' : 'animate-pulse'
          }`}
        />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <Sparkles className="w-2.5 h-2.5 text-[#A8843E] dark:text-[#D4B475] shrink-0" />
      <span className="tracking-wide uppercase">{processing ? 'AI Processing' : label}</span>
    </div>
  );
};
