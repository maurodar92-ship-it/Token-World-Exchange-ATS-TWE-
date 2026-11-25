export interface WorkspaceAnalyticsPayload {
  n: string;
  v: number;
  u: string;
  d: string;
  r: string | null;
  p?: Record<string, string>;
  sd?: number;
  e?: number;
  m?: string;
  $?: Record<string, string | number>;
}

const DEFAULT_FILE_TYPES = [
  'pdf', 'xlsx', 'docx', 'txt', 'rtf', 'csv', 'exe', 'key', 'pps', 'ppt',
  'pptx', '7z', 'pkg', 'rar', 'gz', 'zip', 'avi', 'mov', 'mp4', 'mpeg',
  'wmv', 'midi', 'mp3', 'wav', 'wma', 'dmg', 'md', 'json', 'png', 'svg',
];

let initialized = false;
let currentUrl = '';
let currentProps: Record<string, string> = {};
let maxScrollHeight = 0;
let maxViewedY = 0;
let lastReportedScroll = -1;
let engagementStartMs = 0;
let engagementAccumMs = 0;
let engagementSentForPage = false;

function isIgnored(): boolean {
  try {
    return window.localStorage.getItem('plausible_ignore') === 'true';
  } catch {
    return false;
  }
}

function measureDocHeight(): number {
  const b = document.body;
  const d = document.documentElement;
  return Math.max(
    b?.scrollHeight || 0,
    b?.offsetHeight || 0,
    b?.clientHeight || 0,
    d?.scrollHeight || 0,
    d?.offsetHeight || 0,
    d?.clientHeight || 0
  );
}

function measureViewedY(): number {
  const h = window.innerHeight;
  const y = window.scrollY;
  return maxScrollHeight <= h ? maxScrollHeight : y + h;
}

function activeDurationMs(): number {
  return engagementStartMs ? engagementAccumMs + (Date.now() - engagementStartMs) : engagementAccumMs;
}

function sendEventPayload(payload: WorkspaceAnalyticsPayload): void {
  if (isIgnored()) return;
  try {
    void fetch('/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      keepalive: true,
      body: JSON.stringify(payload),
    });
  } catch {
    // non-blocking analytics transport
  }
}

function flushEngagement(): void {
  const elapsed = activeDurationMs();
  if (!engagementSentForPage && (lastReportedScroll < maxViewedY || elapsed >= 3000)) {
    lastReportedScroll = maxViewedY;
    const sd = maxScrollHeight > 0 ? Math.min(100, Math.round((maxViewedY / maxScrollHeight) * 100)) : 100;
    sendEventPayload({
      n: 'engagement',
      v: 37,
      d: window.location.host,
      u: currentUrl || window.location.href,
      r: document.referrer || null,
      p: currentProps,
      sd,
      e: elapsed,
    });
    engagementStartMs = 0;
    engagementAccumMs = 0;
  }
}

function parseTaggedClasses(el: Element | null): {
  name: string | null;
  props: Record<string, string>;
  revenue: Record<string, string>;
} {
  const res = { name: null as string | null, props: {} as Record<string, string>, revenue: {} as Record<string, string> };
  let node: Element | null = el;
  for (let depth = 0; depth <= 3 && node; depth++) {
    const cl = node.classList;
    if (cl) {
      let hasEvent = false;
      for (let i = 0; i < cl.length; i++) {
        const cls = cl.item(i) || '';
        const evMatch = cls.match(/plausible-event-(.+)(?:=|--)(.+)/);
        if (evMatch) {
          hasEvent = true;
          const k = evMatch[1];
          const val = evMatch[2].replace(/\+/g, ' ');
          if (k.toLowerCase() === 'name') res.name = val;
          else res.props[k] = val;
        }
        const revMatch = cls.match(/plausible-revenue-(.+)(?:=|--)(.+)/);
        if (revMatch) {
          res.revenue[revMatch[1]] = revMatch[2];
        }
      }
      if (hasEvent) break;
    }
    node = node.parentElement;
  }
  return res;
}

export function trackWorkspaceEvent(
  name: string,
  props?: Record<string, string>,
  revenue?: Record<string, string | number>
): void {
  if (isIgnored()) return;
  const isPageview = name === 'pageview';
  if (isPageview && currentUrl) {
    flushEngagement();
  }

  maxScrollHeight = measureDocHeight();
  maxViewedY = measureViewedY();

  const payload: WorkspaceAnalyticsPayload = {
    n: name,
    v: 37,
    u: window.location.href,
    d: window.location.host,
    r: document.referrer || null,
  };
  if (props && Object.keys(props).length > 0) payload.p = props;
  if (revenue && Object.keys(revenue).length > 0) payload.$ = revenue;

  if (isPageview) {
    engagementSentForPage = false;
    currentUrl = payload.u;
    currentProps = props ?? {};
    lastReportedScroll = -1;
    engagementAccumMs = 0;
    engagementStartMs = Date.now();
  }

  sendEventPayload(payload);
}

export function setAnalyticsIgnored(ignore: boolean): void {
  try {
    if (ignore) window.localStorage.setItem('plausible_ignore', 'true');
    else window.localStorage.removeItem('plausible_ignore');
  } catch {
    // ignore storage failures
  }
}

export function getAnalyticsIgnored(): boolean {
  return isIgnored();
}

export function initAnalyticsTracker(): () => void {
  if (initialized) return () => {};
  initialized = true;

  maxScrollHeight = measureDocHeight();
  maxViewedY = measureViewedY();

  const onVisibilityOrFocus = () => {
    if (document.visibilityState === 'visible' && document.hasFocus() && engagementStartMs === 0) {
      engagementStartMs = Date.now();
    } else if (document.visibilityState !== 'visible' || !document.hasFocus()) {
      engagementAccumMs = activeDurationMs();
      engagementStartMs = 0;
      flushEngagement();
    }
  };

  const onScroll = () => {
    const viewed = measureViewedY();
    if (viewed > maxViewedY) maxViewedY = viewed;
  };

  const onClick = (ev: MouseEvent) => {
    if (ev.type === 'auxclick' && ev.button !== 1) return;
    const target = ev.target as Element | null;
    if (!target) return;

    const tagged = parseTaggedClasses(target);
    const anchor = target.closest('a') as HTMLAnchorElement | null;

    if (tagged.name) {
      const props = { ...tagged.props };
      if (anchor?.href) props.url = anchor.href;
      trackWorkspaceEvent(tagged.name, props, tagged.revenue);
      return;
    }

    if (anchor && typeof anchor.href === 'string') {
      if (anchor.host && anchor.host !== window.location.host) {
        trackWorkspaceEvent('Outbound Link: Click', { url: anchor.href });
        return;
      }
      const cleanPath = anchor.href.split('?')[0];
      const ext = cleanPath.split('.').pop()?.toLowerCase() ?? '';
      if (anchor.hasAttribute('download') || DEFAULT_FILE_TYPES.includes(ext)) {
        trackWorkspaceEvent('File Download', { url: cleanPath, file: anchor.getAttribute('download') || cleanPath });
      }
    }
  };

  const resizeObserver = new ResizeObserver(() => {
    maxScrollHeight = measureDocHeight();
  });
  resizeObserver.observe(document.documentElement);

  document.addEventListener('visibilitychange', onVisibilityOrFocus);
  window.addEventListener('blur', onVisibilityOrFocus);
  window.addEventListener('focus', onVisibilityOrFocus);
  document.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('click', onClick);
  document.addEventListener('auxclick', onClick);

  // Expose Plausible-compatible global function
  const w = window as unknown as { plausible?: ((name: string, opts?: { props?: Record<string, string>; revenue?: Record<string, string | number> }) => void) & { v?: number } };
  w.plausible = (name, opts) => trackWorkspaceEvent(name, opts?.props, opts?.revenue);
  w.plausible.v = 37;

  return () => {
    resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', onVisibilityOrFocus);
    window.removeEventListener('blur', onVisibilityOrFocus);
    window.removeEventListener('focus', onVisibilityOrFocus);
    document.removeEventListener('scroll', onScroll);
    document.removeEventListener('click', onClick);
    document.removeEventListener('auxclick', onClick);
    initialized = false;
  };
}
