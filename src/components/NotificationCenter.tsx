import React from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import type { TradeNotificationEvent } from '../types/twe';

interface NotificationDrawerProps {
  open: boolean;
  notifications: TradeNotificationEvent[];
  sseConnected: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  open,
  notifications,
  sseConnected,
  onClose,
  onMarkAllRead,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="w-full max-w-md bg-[var(--twe-bg-surface)] border-l border-[var(--twe-border)] h-full flex flex-col">
        <div className="px-4 py-3.5 border-b border-[var(--twe-border)] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 font-display font-semibold text-sm text-[var(--twe-text-primary)]">
              <Bell className="w-4 h-4 text-[#A8843E] dark:text-[#D4B475]" />
              <span>Real-Time Trade Notifications</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-mono text-[var(--twe-text-muted)]">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  sseConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span>{sseConnected ? 'SSE Live Stream Connected' : 'Reconnecting SSE Stream...'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onMarkAllRead}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[var(--twe-border)] text-[11px] text-[var(--twe-text-secondary)] hover:text-[var(--twe-text-primary)] cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark Read</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close notifications"
              className="p-1 rounded hover:bg-[var(--twe-bg-muted)] text-[var(--twe-text-muted)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[var(--twe-border)]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--twe-text-muted)]">
              No trade or batch notifications yet. Execute an order or advance a market tick to see live SSE alerts.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 space-y-1 ${
                  n.read
                    ? 'opacity-75'
                    : n.severity === 'alert'
                    ? 'bg-rose-500/10 border-l-2 border-l-rose-500'
                    : n.severity === 'warning'
                    ? 'bg-amber-500/10 border-l-2 border-l-amber-500'
                    : 'bg-[var(--twe-gold-soft)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-xs text-[var(--twe-text-primary)]">
                    {n.title}
                  </span>
                  <span className="font-mono text-[10px] text-[var(--twe-text-muted)]">
                    {new Date(n.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-xs text-[var(--twe-text-secondary)] leading-relaxed">
                  {n.message}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export const TradeToastStack: React.FC<{
  toasts: TradeNotificationEvent[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 right-5 z-40 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`p-3 rounded-lg border bg-[var(--twe-bg-surface)] shadow-lg flex items-start justify-between gap-2.5 ${
            t.severity === 'alert'
              ? 'border-rose-500/70'
              : t.severity === 'warning'
              ? 'border-amber-500/70'
              : 'border-[#A8843E]/60 dark:border-[#D4B475]/60'
          }`}
        >
          <div className="space-y-0.5 min-w-0">
            <div className="font-display font-semibold text-xs text-[var(--twe-text-primary)] truncate">
              {t.title}
            </div>
            <div className="text-[11px] text-[var(--twe-text-secondary)] line-clamp-2">
              {t.message}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss toast"
            className="p-0.5 text-[var(--twe-text-muted)] hover:text-[var(--twe-text-primary)] cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
