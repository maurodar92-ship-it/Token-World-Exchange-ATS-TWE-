import crypto from 'crypto';

const SUPERSCRIPT_MAP: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
};

const MAX_DIGITS = 2048;

const RAW_MARKET_EXCHANGE_CEILING =
  '999999999999999999999999999999999999999999999999999999999999999999999999999⁹99999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999⁹99⁹999999999999⁹9999999999999999999999999999999999999999999⁹999999999999999999999999999999999999999999999999999999999999999999999999999⁹999999999999999999999999999999999999⁹99999⁹99999999999999999999999999999999999999999⁹9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999⁹99999999999999999999999999999999999⁹999999999909999999999999';

export function normalizeMarketBigIntDigits(raw: unknown): string {
  const ascii = String(raw ?? '')
    .trim()
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => SUPERSCRIPT_MAP[c] ?? '');
  return ascii.replace(/[^0-9]/g, '').slice(0, MAX_DIGITS);
}

export const MARKET_EXCHANGE_CEILING_STR = normalizeMarketBigIntDigits(RAW_MARKET_EXCHANGE_CEILING);
export const MARKET_EXCHANGE_CEILING_DIGITS = MARKET_EXCHANGE_CEILING_STR.length;

function parseBigIntIdx(raw: unknown): bigint {
  const clean = normalizeMarketBigIntDigits(raw);
  if (!clean) return 1n;
  const parsed = BigInt(clean);
  return parsed < 1n ? 1n : parsed;
}

function sha256(seed: string): string {
  return crypto.createHash('sha256').update(seed).digest('hex');
}

function u32(hex: string, byteOffset: number): number {
  const start = (byteOffset % 28) * 2;
  return parseInt(hex.slice(start, start + 8), 16) >>> 0;
}

function escapeHtml(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAbbrev(numStr: string): string {
  if (numStr.length <= 18) return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${numStr.slice(0, 8)}…${numStr.slice(-8)} (${numStr.length} digits)`;
}

function formatScientific(numStr: string): string {
  if (numStr.length <= 6) return numStr;
  return `${numStr[0]}.${numStr.slice(1, 3)} × 10^${numStr.length - 1}`;
}

export interface MarketPageTradePoint {
  id: string;
  seq: number;
  timeLabel: string;
  timestampIso: string;
  side: 'BUY' | 'SELL';
  priceUsd: number;
  quantity: number;
  notionalUsd: number;
  venue: string;
}

export interface MarketExchangeWebpageRecord {
  pageIndex: string;
  pageId: string;
  symbol: string;
  assetName: string;
  venue: string;
  standard: string;
  markPriceUsd: number;
  vwapUsd: number;
  change24hPct: number;
  wilderRsi14: number;
  spreadBps: number;
  bestBidUsd: number;
  bestAskUsd: number;
  volume24hUsd: number;
  recentTrades: MarketPageTradePoint[];
  onChainStatus: string;
  sanctionsAttestation: string;
  sha256Fingerprint: string;
  merkleRoot: string;
  webpagePath: string;
  prevPageIndex: string;
  nextPageIndex: string;
  ceilingIndex: string;
  ceilingDigits: number;
}

export interface MarketExchangeRangeResponse {
  startIndex: string;
  limit: number;
  prevStartIndex: string;
  nextStartIndex: string;
  ceilingIndex: string;
  ceilingDigits: number;
  scientificCeiling: string;
  maxSupportedDigits: number;
  activeSymbol: string;
  symbols: string[];
  items: MarketExchangeWebpageRecord[];
}

const MARKET_INSTRUMENTS: Array<{ symbol: string; name: string; basePrice: number; standard: string }> = [
  { symbol: 'TWE-G', name: 'TWE Sovereign Governance', basePrice: 142.85, standard: 'ERC-3643' },
  { symbol: 'CMDTX', name: 'CMDTX Gold Bullion Reserve', basePrice: 2418.4, standard: 'ERC-3643' },
  { symbol: 'USTB-T', name: 'US Treasury Bill Tokenized Note', basePrice: 100.12, standard: 'ERC-1400' },
  { symbol: 'ETH-ATS', name: 'Institutional Staked Ether ATS', basePrice: 3482.5, standard: 'ERC-20' },
  { symbol: 'SOL-QIB', name: 'Solana Institutional Liquidity Unit', basePrice: 196.75, standard: 'SPL-2022' },
  { symbol: 'EURC-TWE', name: 'MiCA Sovereign Euro Clearing', basePrice: 1.084, standard: 'ERC-3643' },
];

const MARKET_VENUES = ['TWE ATS Primary', 'FIX 4.4 Institutional', 'ERC-3643 DvP Pool', 'Base L2 Dark Midpoint'];

export function resolveMarketExchangeWebpage(
  rawIndex: unknown,
  preferredSymbol?: string
): MarketExchangeWebpageRecord {
  const idx = parseBigIntIdx(rawIndex);
  const pageIndex = idx.toString();
  const h1 = sha256(`TWE_MARKET_EXCHANGE_WEBPAGE_V1:${pageIndex}`);
  const h2 = sha256(`TWE_MARKET_EXCHANGE_TAPE_V1:${pageIndex}:${h1}`);

  const matched = MARKET_INSTRUMENTS.find((m) => m.symbol === preferredSymbol);
  const inst = matched ?? MARKET_INSTRUMENTS[u32(h1, 0) % MARKET_INSTRUMENTS.length];
  const venue = MARKET_VENUES[u32(h1, 4) % MARKET_VENUES.length];

  const driftPct = (((u32(h1, 8) % 1400) - 700) / 100);
  const baseMark = Number((inst.basePrice * (1 + driftPct / 100)).toFixed(inst.basePrice < 10 ? 4 : 2));

  const recentTrades: MarketPageTradePoint[] = [];
  let priceCursor = baseMark * 0.992;
  let totalNotional = 0;
  let totalQty = 0;

  for (let i = 0; i < 12; i++) {
    const th = sha256(`${h2}:FILL:${i}`);
    const stepPct = (((u32(th, 0) % 240) - 112) / 10000);
    priceCursor = Math.max(0.01, priceCursor * (1 + stepPct));
    const priceUsd = Number(priceCursor.toFixed(inst.basePrice < 10 ? 4 : 2));
    const quantity = 5 + (u32(th, 4) % 420);
    const notionalUsd = Number((priceUsd * quantity).toFixed(2));
    const side: 'BUY' | 'SELL' = u32(th, 8) % 2 === 0 ? 'BUY' : 'SELL';
    totalNotional += notionalUsd;
    totalQty += quantity;
    const hh = 19;
    const mm = String(48 + i).padStart(2, '0');
    const ss = String(10 + (u32(th, 12) % 45)).padStart(2, '0');
    const timeLabel = `${hh}:${mm}:${ss}`;
    recentTrades.push({
      id: `TRD-${th.slice(0, 8).toUpperCase()}`,
      seq: i + 1,
      timeLabel,
      timestampIso: `2026-11-24T${timeLabel}Z`,
      side,
      priceUsd,
      quantity,
      notionalUsd,
      venue,
    });
  }

  const markPriceUsd = recentTrades[recentTrades.length - 1].priceUsd;
  const vwapUsd = Number((totalNotional / Math.max(1, totalQty)).toFixed(inst.basePrice < 10 ? 4 : 2));
  const spreadBps = Number((1.2 + ((u32(h1, 12) % 68) / 10)).toFixed(1));
  const halfSpread = (markPriceUsd * (spreadBps / 2)) / 10000;
  const bestBidUsd = Number((markPriceUsd - halfSpread).toFixed(inst.basePrice < 10 ? 4 : 2));
  const bestAskUsd = Number((markPriceUsd + halfSpread).toFixed(inst.basePrice < 10 ? 4 : 2));
  const wilderRsi14 = Number((26 + ((u32(h2, 4) % 520) / 10)).toFixed(1));
  const volume24hUsd = Math.round(1_250_000 + (u32(h2, 8) % 48_000_000));

  return {
    pageIndex,
    pageId: `TWE-MKT-${h1.slice(0, 8).toUpperCase()}`,
    symbol: inst.symbol,
    assetName: inst.name,
    venue,
    standard: inst.standard,
    markPriceUsd,
    vwapUsd,
    change24hPct: Number(driftPct.toFixed(2)),
    wilderRsi14,
    spreadBps,
    bestBidUsd,
    bestAskUsd,
    volume24hUsd,
    recentTrades,
    onChainStatus: 'FINALIZED · T+0 DvP',
    sanctionsAttestation: `SANC-OFAC-EU-${h2.slice(0, 10).toUpperCase()}`,
    sha256Fingerprint: h1,
    merkleRoot: `0x${h2}`,
    webpagePath: `/market-exchange/page/${pageIndex}${matched ? `?symbol=${encodeURIComponent(matched.symbol)}` : ''}`,
    prevPageIndex: idx > 1n ? (idx - 1n).toString() : '1',
    nextPageIndex: (idx + 1n).toString(),
    ceilingIndex: MARKET_EXCHANGE_CEILING_STR,
    ceilingDigits: MARKET_EXCHANGE_CEILING_DIGITS,
  };
}

export function resolveMarketExchangeWebpageRange(
  startRaw: unknown,
  limitRaw = 10,
  symbolFilter?: string
): MarketExchangeRangeResponse {
  const start = parseBigIntIdx(startRaw);
  const limit = Math.max(1, Math.min(25, Math.floor(Number(limitRaw) || 10)));
  const activeSymbol =
    symbolFilter && MARKET_INSTRUMENTS.some((m) => m.symbol === symbolFilter)
      ? symbolFilter
      : 'ALL';

  const items: MarketExchangeWebpageRecord[] = [];
  for (let i = 0; i < limit; i++) {
    items.push(
      resolveMarketExchangeWebpage(start + BigInt(i), activeSymbol === 'ALL' ? undefined : activeSymbol)
    );
  }

  return {
    startIndex: start.toString(),
    limit,
    prevStartIndex: start > BigInt(limit) ? (start - BigInt(limit)).toString() : '1',
    nextStartIndex: (start + BigInt(limit)).toString(),
    ceilingIndex: MARKET_EXCHANGE_CEILING_STR,
    ceilingDigits: MARKET_EXCHANGE_CEILING_DIGITS,
    scientificCeiling: formatScientific(MARKET_EXCHANGE_CEILING_STR),
    maxSupportedDigits: MAX_DIGITS,
    activeSymbol,
    symbols: MARKET_INSTRUMENTS.map((m) => m.symbol),
    items,
  };
}

export function renderMarketExchangeHtmlPage(page: MarketExchangeWebpageRecord): string {
  const prices = page.recentTrades.map((t) => t.priceUsd);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const span = Math.max(maxP - minP, 0.0001);
  const w = 860;
  const h = 210;
  const padX = 36;
  const padY = 20;

  const points = page.recentTrades
    .map((t, i) => {
      const x = padX + (i / Math.max(1, page.recentTrades.length - 1)) * (w - padX * 2);
      const y = h - padY - ((t.priceUsd - minP) / span) * (h - padY * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const circles = page.recentTrades
    .map((t, i) => {
      const x = padX + (i / Math.max(1, page.recentTrades.length - 1)) * (w - padX * 2);
      const y = h - padY - ((t.priceUsd - minP) / span) * (h - padY * 2);
      const fill = t.side === 'BUY' ? '#34d399' : '#f43f5e';
      const priceFmt = `$${t.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
      const volFmt = `${t.quantity.toLocaleString('en-US')} units ($${t.notionalUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })})`;
      return `<g class="pt-node" tabindex="0" data-id="${escapeHtml(t.id)}" data-side="${escapeHtml(t.side)}" data-ts="${escapeHtml(t.timestampIso)}" data-price="${escapeHtml(priceFmt)}" data-vol="${escapeHtml(volFmt)}" data-x="${x.toFixed(1)}" data-y="${y.toFixed(1)}">
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="12" fill="transparent" />
        <circle class="pt-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="${fill}" stroke="#090b0f" stroke-width="1.5" />
        <title>${escapeHtml(`${t.id} (${t.side}) · ${t.timestampIso} · Price ${priceFmt} · Volume ${volFmt}`)}</title>
      </g>`;
    })
    .join('');

  const rowsHtml = page.recentTrades
    .map(
      (t) =>
        `<tr><td class="mono">${escapeHtml(t.id)}</td><td class="mono">${escapeHtml(t.timestampIso)}</td><td class="mono" style="color:${t.side === 'BUY' ? '#34d399' : '#f43f5e'}">${escapeHtml(t.side)}</td><td class="mono">$${t.priceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td><td class="mono">${t.quantity.toLocaleString('en-US')}</td><td class="mono">$${t.notionalUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(page.symbol)} (${escapeHtml(page.pageId)}) — Market Exchange Trade History Webpage</title>
  <style>
    :root{color-scheme:dark;--bg:#090b0f;--surf:#11151d;--elev:#171c26;--bdr:#262e3d;--txt:#f1f5f9;--mut:#94a3b8;--gold:#d4b475;--em:#34d399}
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--txt);font-family:Inter,system-ui,sans-serif;line-height:1.5}
    .wrap{max-width:980px;margin:0 auto;padding:22px 18px 44px}
    .top{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid var(--bdr);margin-bottom:18px}
    .brand{font-family:ui-monospace,monospace;font-size:11.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--gold)}
    .nav{display:flex;flex-wrap:wrap;gap:7px}
    .nav a{font-family:ui-monospace,monospace;font-size:11px;color:var(--txt);text-decoration:none;padding:5px 9px;border:1px solid var(--bdr);border-radius:6px;background:var(--surf)}
    .nav a:hover{border-color:var(--gold);color:var(--gold)}
    .card{background:var(--surf);border:1px solid var(--bdr);border-radius:10px;padding:18px;margin-bottom:16px}
    h1{margin:4px 0 6px;font-size:20px}
    .mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin:12px 0}
    .kpi{background:var(--elev);border:1px solid var(--bdr);border-radius:8px;padding:11px}
    .kpi .lbl{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--mut)}
    .kpi .val{margin-top:4px;font-size:14.5px;font-weight:600}
    .gold{color:var(--gold)}.em{color:var(--em)}
    .chart-box{position:relative;margin-top:8px}
    .pt-node{cursor:pointer}
    .pt-node:hover .pt-dot,.pt-node:focus .pt-dot{r:7;stroke:#d4b475;stroke-width:2}
    .tt{position:absolute;pointer-events:none;opacity:0;transition:opacity .12s ease;background:#0e121a;border:1px solid #d4b475;border-radius:8px;padding:9px 12px;font-family:ui-monospace,monospace;font-size:11px;min-width:220px;box-shadow:0 10px 28px rgba(0,0,0,.55);z-index:10}
    .tt.show{opacity:1}
    .tt-row{display:flex;justify-content:space-between;gap:12px;margin-top:3px}
    .tt-lbl{color:var(--mut)}
    table{width:100%;border-collapse:collapse;font-size:11.5px}
    th,td{padding:7px 9px;border-bottom:1px solid var(--bdr);text-align:left}
    th{color:var(--mut);text-transform:uppercase;font-size:10px;letter-spacing:.06em}
    .pager{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;margin-top:16px}
    .pager a{font-family:ui-monospace,monospace;font-size:11.5px;color:var(--gold);text-decoration:none;padding:7px 12px;border:1px solid var(--bdr);border-radius:6px;background:var(--surf)}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <div class="brand">TWE Market &amp; Exchange · Hyper-Scale Trade History Webpage</div>
      <div class="nav">
        <a href="/overview/page/${escapeHtml(page.pageIndex)}">Overview</a>
        <a href="/four-token-systems/page/${escapeHtml(page.pageIndex)}">4-Token Systems</a>
        <a href="/cloud-database/page/${escapeHtml(page.pageIndex)}">Cloud Database</a>
        <a href="/token-foundry/page/${escapeHtml(page.pageIndex)}">Token Foundry</a>
        <a href="/market-exchange/page/${escapeHtml(page.ceilingIndex)}">Ceiling (${page.ceilingDigits}d)</a>
      </div>
    </div>

    <div class="card">
      <div class="brand">${escapeHtml(page.pageId)} · ${escapeHtml(page.venue)} · ${escapeHtml(page.standard)}</div>
      <h1>${escapeHtml(page.symbol)} — ${escapeHtml(page.assetName)}</h1>
      <div class="grid">
        <div class="kpi"><div class="lbl">Mark Price</div><div class="val mono gold">$${page.markPriceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</div></div>
        <div class="kpi"><div class="lbl">Tape VWAP</div><div class="val mono">$${page.vwapUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</div></div>
        <div class="kpi"><div class="lbl">Bid / Ask (${page.spreadBps} bps)</div><div class="val mono">$${page.bestBidUsd} / $${page.bestAskUsd}</div></div>
        <div class="kpi"><div class="lbl">On-Chain &amp; Sanctions</div><div class="val em">${escapeHtml(page.onChainStatus)}</div></div>
      </div>

      <div class="chart-box" id="chartBox">
        <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;background:#07090d;border:1px solid var(--bdr);border-radius:8px;display:block" role="img" aria-label="Interactive Trade History Price Trend Chart">
          <line id="xhair" x1="0" y1="${padY}" x2="0" y2="${h - padY}" stroke="#d4b475" stroke-dasharray="3 3" stroke-opacity="0" />
          <polyline fill="none" stroke="#d4b475" stroke-width="2.2" points="${points}" />
          ${circles}
        </svg>
        <div id="hoverTip" class="tt" role="tooltip">
          <div style="display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid var(--bdr);padding-bottom:4px;margin-bottom:4px">
            <strong id="ttId" class="gold"></strong>
            <strong id="ttSide"></strong>
          </div>
          <div class="tt-row"><span class="tt-lbl">Timestamp</span><span id="ttTs"></span></div>
          <div class="tt-row"><span class="tt-lbl">Price</span><span id="ttPrice" class="gold"></span></div>
          <div class="tt-row"><span class="tt-lbl">Volume</span><span id="ttVol"></span></div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="brand" style="margin-bottom:8px">Recent Trades Execution History (12 Fills)</div>
      <table>
        <thead><tr><th>Trade ID</th><th>Timestamp (UTC)</th><th>Side</th><th>Price</th><th>Volume (Units)</th><th>Notional Volume</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>

    <div class="card">
      <div class="brand" style="margin-bottom:8px">Arbitrary-Precision Index &amp; Cryptographic Audit</div>
      <table>
        <tbody>
          <tr><th style="width:200px">Exact Webpage Index</th><td class="mono">${escapeHtml(page.pageIndex)}</td></tr>
          <tr><th>Sanctions Attestation</th><td class="mono">${escapeHtml(page.sanctionsAttestation)}</td></tr>
          <tr><th>SHA-256 Fingerprint</th><td class="mono">${escapeHtml(page.sha256Fingerprint)}</td></tr>
          <tr><th>Merkle Audit Root</th><td class="mono">${escapeHtml(page.merkleRoot)}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="pager">
      <a href="/market-exchange/page/${escapeHtml(page.prevPageIndex)}">&larr; Prev Market Page</a>
      <a href="/market-exchange/page/${escapeHtml(page.ceilingIndex)}">Target Ceiling (${page.ceilingDigits} digits)</a>
      <a href="/market-exchange/page/${escapeHtml(page.nextPageIndex)}">Next Market Page &rarr;</a>
    </div>
  </div>
  <script>
    (function(){
      var box = document.getElementById('chartBox');
      var tip = document.getElementById('hoverTip');
      var xhair = document.getElementById('xhair');
      var elId = document.getElementById('ttId');
      var elSide = document.getElementById('ttSide');
      var elTs = document.getElementById('ttTs');
      var elPrice = document.getElementById('ttPrice');
      var elVol = document.getElementById('ttVol');
      var nodes = box ? box.querySelectorAll('.pt-node') : [];
      function showNode(n) {
        elId.textContent = n.getAttribute('data-id') || '';
        var side = n.getAttribute('data-side') || '';
        elSide.textContent = side;
        elSide.style.color = side === 'BUY' ? '#34d399' : '#f43f5e';
        elTs.textContent = n.getAttribute('data-ts') || '';
        elPrice.textContent = n.getAttribute('data-price') || '';
        elVol.textContent = n.getAttribute('data-vol') || '';
        var x = parseFloat(n.getAttribute('data-x') || '0');
        xhair.setAttribute('x1', String(x));
        xhair.setAttribute('x2', String(x));
        xhair.setAttribute('stroke-opacity', '0.65');
        var pctX = (x / ${w}) * 100;
        tip.style.left = pctX > 62 ? 'auto' : Math.max(2, pctX) + '%';
        tip.style.right = pctX > 62 ? Math.max(2, 100 - pctX) + '%' : 'auto';
        tip.style.top = '10px';
        tip.classList.add('show');
      }
      function hideNode() {
        xhair.setAttribute('stroke-opacity', '0');
        tip.classList.remove('show');
      }
      nodes.forEach(function(n){
        n.addEventListener('mouseenter', function(){ showNode(n); });
        n.addEventListener('focus', function(){ showNode(n); });
        n.addEventListener('mouseleave', hideNode);
        n.addEventListener('blur', hideNode);
      });
    })();
  </script>
</body>
</html>`;
}
