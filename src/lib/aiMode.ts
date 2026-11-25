const AI_MODE_STORAGE_KEY = 'twe-ai-mode';
const AI_MODE_EVENT = 'twe:ai-mode-changed';

type AiModeListener = (enabled: boolean) => void;

const listeners = new Set<AiModeListener>();

function readStoredAiMode(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const saved = window.localStorage.getItem(AI_MODE_STORAGE_KEY);
    if (saved === null) return true;
    return saved === 'true';
  } catch {
    return true;
  }
}

let cachedAiMode: boolean = readStoredAiMode();

/**
 * Global helper to verify whether AI Mode is currently enabled before
 * invoking intensive Gemini API / multimodal / synthesis operations.
 */
export function isAiEnabled(): boolean {
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(AI_MODE_STORAGE_KEY);
      if (saved !== null) {
        cachedAiMode = saved === 'true';
      }
    } catch {
      // use cached value if storage is unavailable
    }
  }
  return cachedAiMode;
}

export function setAiModeEnabled(enabled: boolean): void {
  cachedAiMode = Boolean(enabled);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(AI_MODE_STORAGE_KEY, String(cachedAiMode));
    } catch {
      // ignore storage errors in restricted iframes
    }
    window.dispatchEvent(new CustomEvent<boolean>(AI_MODE_EVENT, { detail: cachedAiMode }));
  }
  listeners.forEach((cb) => {
    try {
      cb(cachedAiMode);
    } catch {
      // isolate listener errors
    }
  });
}

export function subscribeAiMode(listener: AiModeListener): () => void {
  listeners.add(listener);
  const handleCustom = (ev: Event) => {
    const detail = (ev as CustomEvent<boolean>).detail;
    if (typeof detail === 'boolean') {
      listener(detail);
    }
  };
  const handleStorage = (ev: StorageEvent) => {
    if (ev.key === AI_MODE_STORAGE_KEY && ev.newValue !== null) {
      cachedAiMode = ev.newValue === 'true';
      listener(cachedAiMode);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(AI_MODE_EVENT, handleCustom);
    window.addEventListener('storage', handleStorage);
  }

  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') {
      window.removeEventListener(AI_MODE_EVENT, handleCustom);
      window.removeEventListener('storage', handleStorage);
    }
  };
}

declare global {
  interface Window {
    isAiEnabled?: () => boolean;
  }
}

if (typeof window !== 'undefined') {
  window.isAiEnabled = isAiEnabled;
}
