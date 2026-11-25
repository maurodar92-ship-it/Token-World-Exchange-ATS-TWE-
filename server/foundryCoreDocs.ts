export type CoreDocSectionName = 'TWE' | 'Foundry' | 'About';

export interface CoreDocSectionBlock {
  h: string;
  p?: string[];
  ul?: string[];
  codeBlock?: string;
}

export interface CoreDocPage {
  path: string;
  section: CoreDocSectionName;
  title: string;
  lead: string;
  sections: CoreDocSectionBlock[];
}

export const SANDBOX_TEXT =
  'No real money is accepted or moved. Orders and balances are simulated. Nothing here is a licensed exchange, an offering, or investment advice.';

export const CORE_DOC_PAGES: CoreDocPage[] = [
  /* ---------------------------- TWE ---------------------------- */
  {
    path: 'twe/index.html',
    section: 'TWE',
    title: 'Token World Exchange ATS (TWE)',
    lead: 'Signal Terminal: a full-stack, non-production exchange-design and paper-trading sandbox.',
    sections: [
      {
        h: 'What TWE is',
        p: [
          'TWE brings a sample token market, a paper account, a deterministic token-concept generator, a private NFT collection planner and an architecture-planning workspace into one responsive application.',
          'It is a working software prototype, not a licensed exchange or an operational trading venue. ' +
            SANDBOX_TEXT,
        ],
      },
      {
        h: 'The five working areas',
        ul: [
          'Sample market and order book (illustrative data only)',
          'Paper account with a simulated USD balance and sample holdings',
          'Deterministic token-concept generator (seeded, repeatable)',
          'Private NFT collection planner',
          'Architecture-planning workspace with draft contract specifications',
        ],
      },
      {
        h: 'Where to go next',
        ul: [
          'Sandbox boundary (/twe/sandbox-boundary.html) - what is deliberately disconnected',
          'Paper trading (/twe/paper-trading.html) - how simulated orders and fills work',
          'Token concepts (/twe/token-concepts.html) and the token concept directory (/foundry/token/1)',
          'Technology stack (/twe/tech-stack.html) and repository map (/twe/repository-map.html)',
        ],
      },
    ],
  },
  {
    path: 'twe/sandbox-boundary.html',
    section: 'TWE',
    title: 'Sandbox boundary',
    lead: 'The line between a design prototype and a real market. TWE stays on the prototype side.',
    sections: [
      {
        h: 'Deliberately disconnected',
        p: ['The application does not do any of the following. Keep these capabilities disconnected.'],
        ul: [
          'Custody assets or connect wallets',
          'Mint NFTs',
          'Deploy or call smart contracts',
          'Publish token concepts',
          'Connect a live market or a test chain',
          'Contact a financial or token provider',
        ],
      },
      {
        h: 'Why it matters',
        p: [
          'The database tables account_balances, exchange_orders and exchange_trades are demonstration components. They must never be reused as books for customer funds or real assets.',
          'A separate production-readiness checklist can guide planning. It is not authorization to launch.',
        ],
      },
    ],
  },
  {
    path: 'twe/signal-terminal.html',
    section: 'TWE',
    title: 'The Signal Terminal look',
    lead: 'A dark, technical visual language for dense market data.',
    sections: [
      {
        h: 'Palette',
        ul: [
          'Canvas: deep navy #07131f with raised blue-black panels and thin blue-gray separators',
          'Accent: restrained cyan #20d9ff',
          'Positive sample movement: green #36d7a1',
          'Negative sample movement: coral #ff7184',
        ],
      },
      {
        h: 'Type',
        p: [
          'Space Grotesk is used for headings and general interface text. IBM Plex Mono is used for symbols, labels and numeric market data, so columns of numbers line up.',
        ],
      },
      {
        h: 'This site',
        p: ['This documentation site reuses the same palette so the docs feel like part of the product.'],
      },
    ],
  },
  {
    path: 'twe/paper-trading.html',
    section: 'TWE',
    title: 'Paper trading',
    lead: 'Simulated accounts, simulated orders, simulated fills.',
    sections: [
      {
        h: 'How it works',
        p: [
          'New paper accounts are initialized with a simulated USD balance and sample holdings. Market and limit orders update only paper balances, simulated orders and simulated fills.',
          'No order is routed to a live venue. The sample market and order book are illustrative.',
        ],
      },
      {
        h: 'Order types',
        ul: [
          'Market - fills against the illustrative book at the sample price',
          'Limit - rests until the simulated price crosses the limit',
        ],
      },
      {
        h: 'Rule of thumb',
        p: [
          'If a number on a TWE trading screen ever looks like a quote you could act on, it is not. It is sample data.',
        ],
      },
    ],
  },
  {
    path: 'twe/token-concepts.html',
    section: 'TWE',
    title: 'Token concept generator',
    lead: 'Deterministic, seeded and private to the signed-in owner.',
    sections: [
      {
        h: 'Deterministic by design',
        p: [
          'Token and NFT generators are deterministic from their stored seed. The same seed always yields the same batch, which makes concepts reviewable and reproducible.',
          'Concept batches are private to the signed-in owner. Concepts are not published anywhere.',
        ],
      },
      {
        h: 'The Infinite Horizon / Cosmic Nexus theme',
        p: [
          'The theme symbolizes boundless liquidity, limitless connectivity and continuous evolution across ecosystems. The token concept directory (/foundry/token/1) on this site shows what a large deterministic batch looks like.',
        ],
      },
      {
        h: 'Identifiers on this site',
        p: [
          'Every concept carries a concept ID and a draft specification ID. These are labels derived from a hash. They are not contract addresses, and nothing is deployed.',
        ],
      },
    ],
  },
  {
    path: 'twe/nft-planner.html',
    section: 'TWE',
    title: 'NFT collection planner',
    lead: 'Plan a collection privately before any minting decision exists.',
    sections: [
      {
        h: 'Scope',
        p: [
          'The planner stores NFT-design batches per owner. It does not mint, connect a wallet or publish anything.',
        ],
      },
      {
        h: 'Companion project',
        p: [
          'The Standard Super NFT Foundry (/foundry/index.html) is the generation engine used to explore layered collections: weighted traits, exclusions, duplicate prevention, SVG art, narratives and metadata.',
        ],
      },
    ],
  },
  {
    path: 'twe/architecture-workspace.html',
    section: 'TWE',
    title: 'Architecture workspace',
    lead: 'Owner-scoped planning records with draft-only contract specifications.',
    sections: [
      {
        h: 'Behavior',
        ul: [
          'The workspace is owner-scoped',
          'User-entered evidence references are not fetched or verified',
          'The listing review has no live approval or listing state',
          'Contract specifications are draft-only',
        ],
      },
    ],
  },
  {
    path: 'twe/tech-stack.html',
    section: 'TWE',
    title: 'Technology stack',
    lead: 'React front end, typed tRPC back end, MySQL persistence.',
    sections: [
      {
        h: 'Layers',
        ul: [
          'Frontend: React 19, TypeScript, Vite, Tailwind CSS 4, Wouter routing, Lucide icons, TanStack Query and the tRPC client',
          'Backend: Node.js and Express, typed tRPC routers, Zod input validation, application services and server-side ownership checks',
          'Persistence: MySQL with Drizzle ORM and checked-in migrations. The schema separates users, sample assets, paper balances/orders/trades, token-concept batches, NFT-design batches and architecture-planning records',
          'Tests: Vitest and TypeScript checks',
        ],
      },
    ],
  },
  {
    path: 'twe/repository-map.html',
    section: 'TWE',
    title: 'Repository map',
    lead: 'Where things live in the source.',
    sections: [
      {
        h: 'Folders',
        ul: [
          'client/src/ - React routes, UI components, pages and styles',
          'client/public/ - public assets, including the watermark',
          'drizzle/ - MySQL schema and migrations',
          'server/ - tRPC routers and business services',
          'server/_core/ - Express runtime and platform adapters',
          'shared/ - shared types, enums and deterministic generators',
        ],
      },
    ],
  },
  {
    path: 'twe/run-locally.html',
    section: 'TWE',
    title: 'Run the TWE source locally',
    lead: 'Node, pnpm 10.18.0 and a MySQL database.',
    sections: [
      {
        h: 'Commands',
        codeBlock: 'corepack enable\npnpm install --frozen-lockfile\npnpm check\npnpm test\npnpm build',
      },
      {
        h: 'Environment',
        p: [
          'The original application expects a MySQL database and platform authentication services. Core settings include DATABASE_URL, MANUS_PROJECT_ID, MANUS_JWT_SECRET and MANUS_OAUTH_API_URL.',
          'Never commit .env files or credentials, and never paste them into documents or chats.',
        ],
      },
    ],
  },
  {
    path: 'twe/ai-studio-import.html',
    section: 'TWE',
    title: 'Using the source with Google AI Studio',
    lead: 'An import starting point, not a one-click deployment.',
    sections: [
      {
        h: 'Steps',
        ul: [
          'Extract the source archive and upload it to a private GitHub repository in your own account. Do not add .env files, database passwords, OAuth secrets or private keys',
          'In AI Studio Build mode choose Add files, then Import from GitHub, and pick the repository',
          'Replace the platform OAuth/session adapter with a supported authentication system (Firebase Authentication is a common choice, but server-side identity verification and user-owned data access must still be implemented)',
          'Choose persistence deliberately: keep a securely hosted MySQL database, or redesign and test the schema for Firestore',
          'Keep secrets in the target platform secret manager. The concept generators are deterministic and need no Gemini API key',
        ],
      },
      {
        h: 'Caveat',
        p: [
          'Importing the code does not migrate or provision the existing database, and the platform-bound app does not run unchanged in AI Studio.',
        ],
      },
    ],
  },
  {
    path: 'twe/production-readiness.html',
    section: 'TWE',
    title: 'Production-readiness planning',
    lead: 'A planning checklist, not authorization to launch.',
    sections: [
      {
        h: 'Why this page exists',
        p: [
          'Turning a sandbox into a real venue is mostly a legal, operational and security project rather than a coding one. The list below is a conversation starter for qualified counsel and compliance staff. It is not legal advice.',
        ],
      },
      {
        h: 'Areas to plan',
        ul: [
          'Regulatory pathway. In the United States, an alternative trading system generally operates under SEC Regulation ATS and through a registered broker-dealer. Other jurisdictions differ. Engage specialist counsel',
          'Asset analysis: whether each listed asset is a security, commodity or something else, per jurisdiction',
          'Identity, sanctions and AML programs using authorized providers',
          'Custody and segregation of customer assets, with independent audit',
          'Market surveillance, fair-access rules and recordkeeping',
          'Settlement lifecycle, reconciliation and failure handling',
          'Security controls, key management, incident response and independent smart-contract audits',
          'Separate production books. The demonstration tables must never become customer ledgers',
        ],
      },
    ],
  },

  /* ---------------------------- FOUNDRY ---------------------------- */
  {
    path: 'foundry/index.html',
    section: 'Foundry',
    title: 'Standard Super NFT Foundry',
    lead: 'A runnable Node.js prototype for layered generative collectibles.',
    sections: [
      {
        h: 'What it does',
        p: [
          'The foundry includes a browser dashboard, weighted layer selection, deterministic editions, pre-render trait exclusions, duplicate-fingerprint prevention, SVG rendering, per-edition narratives, ERC-721-style JSON metadata, rarity statistics, a job queue, manifest export and a configurable jurisdiction gate.',
        ],
      },
      {
        h: 'Requirements',
        ul: ['Node.js 22 or newer', 'No third-party runtime dependencies'],
      },
      {
        h: 'Explore',
        ul: [
          'Browse the collections (/foundry/nft/1) generated for this site with the real engine',
          'How it works (/foundry/how-it-works.html)',
          'API reference (/foundry/api.html)',
          'Compliance gate (/foundry/compliance-gate.html)',
        ],
      },
    ],
  },
  {
    path: 'foundry/how-it-works.html',
    section: 'Foundry',
    title: 'How the foundry works',
    lead: 'From a theme definition to a finished edition.',
    sections: [
      {
        h: 'Pipeline',
        ul: [
          'Load a theme: ordered layers, each with weighted options and an SVG fragment',
          'Seed a random generator from a hash of theme, edition number and attempt',
          'Pick one option per layer by weight',
          'Reject the combination if it hits an exclusion rule or repeats a fingerprint',
          'Render the SVG, write the narrative, write the metadata JSON',
        ],
      },
      {
        h: 'Bounded retries',
        p: [
          'Each edition tries up to 2000 seeded attempts. If the trait space is exhausted, or exclusions are too restrictive, the engine throws a clear error. The fix is to add layers or options, or to reduce the batch.',
        ],
      },
    ],
  },
  {
    path: 'foundry/determinism.html',
    section: 'Foundry',
    title: 'Determinism and fingerprints',
    lead: 'Same inputs, same edition; no two editions alike.',
    sections: [
      {
        h: 'Determinism',
        p: [
          'The seed is the first 32 bits of a SHA-256 hash of theme:edition:attempt, feeding a small Mulberry-style generator. Re-running a job reproduces it exactly.',
        ],
      },
      {
        h: 'Fingerprints',
        p: [
          'Each edition gets a SHA-256 fingerprint of its sorted trait_type:value pairs. A fingerprint may be used only once per job, which prevents duplicates.',
        ],
      },
    ],
  },
  {
    path: 'foundry/rarity.html',
    section: 'Foundry',
    title: 'Rarity and weights',
    lead: 'Weights set the odds; rarity statistics report what actually happened.',
    sections: [
      {
        h: 'Weights',
        p: ['Every option has a weight. The chance of an option is its weight divided by the total of its layer.'],
      },
      {
        h: 'Statistics',
        p: [
          'After a job the foundry counts each trait and reports a percentage. On this site, edition pages also show a rarity score (the sum of -ln of each trait frequency) and a tier from Common to Mythic computed over the full generated set.',
        ],
      },
    ],
  },
  {
    path: 'foundry/exclusions.html',
    section: 'Foundry',
    title: 'Trait exclusions',
    lead: 'Rules applied before a combination is accepted.',
    sections: [
      {
        h: 'Example',
        p: [
          'Matrix Heroes forbids Helmet:Crowned with Armor:Obsidian Exo-Suit, and Power Core:Void Engine with Aura:Green Code. A rule is a list of Layer:Option keys. If every key in a rule is present, the combination is blocked.',
        ],
      },
      {
        h: 'Why',
        p: ['Exclusions keep art coherent, for example avoiding low-contrast pairings.'],
      },
    ],
  },
  {
    path: 'foundry/svg-and-narratives.html',
    section: 'Foundry',
    title: 'SVG rendering and narratives',
    lead: 'Self-contained 600 x 600 vector art and a short story for every edition.',
    sections: [
      {
        h: 'SVG',
        p: [
          'Layers are drawn in order into a 600 x 600 SVG with the edition number at the bottom. Titles are XML-escaped. SVG fragments are trusted project assets; never accept arbitrary untrusted SVG uploads in production.',
        ],
      },
      {
        h: 'Narratives',
        p: [
          'The narrative reads the Helmet or Crest, Armor, Power Core or Element, and optional Relic traits, and fills a template. Themes without those layers fall back to generic wording.',
        ],
      },
    ],
  },
  {
    path: 'foundry/metadata.html',
    section: 'Foundry',
    title: 'Metadata format',
    lead: 'ERC-721-style JSON for every edition.',
    sections: [
      {
        h: 'Fields',
        ul: [
          'name, description, image, edition',
          'attributes: a list of { trait_type, value }',
          'properties: fingerprint, theme and creator (the default creator field is Mauro Lomibao Dar III)',
        ],
      },
    ],
  },
  {
    path: 'foundry/api.html',
    section: 'Foundry',
    title: 'API reference',
    lead: 'A small JSON API served by server.js.',
    sections: [
      {
        h: 'Endpoints',
        ul: [
          'GET /api/health',
          'GET /api/config',
          'POST /api/jobs with { theme, count, collectionName, creator, applyThemeExclusions, investmentLinked, jurisdiction, compliance }',
          'GET /api/jobs/:id',
          'GET /api/collections/:id?limit=60',
          'GET /api/export/:id - downloadable JSON manifest',
        ],
      },
      {
        h: 'Running',
        codeBlock: 'npm start\n# http://localhost:3030\nPORT=3030 MAX_BATCH=500 npm start',
        p: ['MAX_BATCH is clamped to 1-5,000; the default is 500.'],
      },
    ],
  },
  {
    path: 'foundry/hashlips.html',
    section: 'Foundry',
    title: 'HashLips integration direction',
    lead: 'Own small engine today; adapter boundary for tomorrow.',
    sections: [
      {
        h: 'Position',
        p: [
          'HashLips Art Engine 2.0 documents a plugin-based engine with inputs, generators, renderers and exporters, and is described as early development. The older hashlips_art_engine package is a separate legacy codebase.',
          'The foundry implements its own small deterministic layer-swapper so it runs without native image dependencies. It does not embed, and is not affiliated with, HashLips.',
        ],
      },
    ],
  },
  {
    path: 'foundry/scaling.html',
    section: 'Foundry',
    title: 'Scaling blueprint',
    lead: 'From one process to a distributed pipeline.',
    sections: [
      {
        h: 'Target shape',
        p: [
          'Browser dashboard, API gateway and auth, PostgreSQL job and collection records, a durable Redis/BullMQ queue, stateless generator workers, S3-compatible object storage, a metadata indexer and IPFS pinning.',
        ],
      },
      {
        h: 'Today',
        p: ['The included queue is a single-process demonstration, not a distributed worker system.'],
      },
      {
        h: 'About huge page and edition counts',
        p: [
          'Page counts and edition counts are bounded by trait space and storage, not by ambition. A theme with 8 layers of 8 options has 16.7 million combinations. At about 3 KB per SVG, one billion editions would need roughly 3 TB. This site is built by a generator with a count setting, so it scales as far as your storage does.',
        ],
      },
    ],
  },
  {
    path: 'foundry/compliance-gate.html',
    section: 'Foundry',
    title: 'Compliance gate',
    lead: 'A configurable software gate. Not legal advice.',
    sections: [
      {
        h: 'What it does',
        p: [
          'Investment-linked collections can be required to carry attestations: identityVerified, sanctionsScreened and qualifiedInvestorVerified. Configured jurisdictions: US, CA, GB, EU, AU and SG. The restricted list is empty by default.',
        ],
      },
      {
        h: 'Notice',
        p: [
          'This policy is a software gate only. It does not determine legal eligibility, provide legal advice, or establish that an offering is compliant. Obtain jurisdiction-specific counsel and use an authorized KYC and sanctions provider before production.',
        ],
      },
    ],
  },
  {
    path: 'foundry/testing.html',
    section: 'Foundry',
    title: 'Testing',
    lead: 'Built-in Node test runner, zero dependencies.',
    sections: [
      {
        h: 'Run',
        codeBlock: 'npm test',
      },
      {
        h: 'Covered',
        ul: [
          'An edition has a 64-character fingerprint, the right number of traits, and stable hashing',
          'Exclusion rules are respected across editions and the used set grows once per edition',
          'SVG output is valid-looking and the narrative mentions the edition number',
        ],
      },
      {
        h: 'Ideas to add',
        ul: [
          'Trait-space exhaustion error',
          'XML escaping of titles',
          'Weighted distribution within tolerance over many samples',
        ],
      },
    ],
  },

  /* ---------------------------- GENERAL ---------------------------- */
  {
    path: 'about.html',
    section: 'About',
    title: 'About this site',
    lead: 'Documentation and a generated catalogue for TWE and the NFT Foundry.',
    sections: [
      {
        h: 'How it was made',
        p: [
          'The core pages are written by hand from the project READMEs. The collection, edition, trait and token-concept pages are generated by a build script that runs the real foundry engine, so every edition page has a genuine unique SVG.',
        ],
      },
      {
        h: 'Creator',
        p: ['Project creator field: Mauro Lomibao Dar III.'],
      },
    ],
  },
  {
    path: 'roadmap.html',
    section: 'About',
    title: 'Roadmap ideas',
    lead: 'Possible next steps.',
    sections: [
      {
        h: 'Foundry',
        ul: [
          'More themes and layers',
          'HashLips adapter',
          'Durable queue and object storage',
          'Metadata pinning (only with explicit approval)',
        ],
      },
      {
        h: 'TWE',
        ul: [
          'Clean, merged single codebase',
          'Security review of contracts and configuration',
          'Counsel-led regulatory plan before any live capability',
        ],
      },
    ],
  },
  {
    path: 'faq.html',
    section: 'About',
    title: 'Frequently asked questions',
    lead: 'Short answers.',
    sections: [
      {
        h: 'Is TWE a real exchange?',
        p: ['No. It is a non-production sandbox. ' + SANDBOX_TEXT],
      },
      {
        h: 'Are the token concepts real tokens?',
        p: [
          'No. They are deterministic names with draft specification labels. No contract is deployed and no address exists.',
        ],
      },
      {
        h: 'Can I mint these NFTs?',
        p: [
          'The foundry generates art and metadata only. Minting is not wired in and would need its own review.',
        ],
      },
      {
        h: 'Why not 9,999,999,999,999,999,999 pages?',
        p: [
          'That is about ten quintillion. It cannot be stored on any real system. The build has a count setting instead.',
        ],
      },
      {
        h: 'Where are the secrets?',
        p: ['Nowhere on this site. Credentials from the uploaded files are intentionally excluded.'],
      },
    ],
  },
  {
    path: 'glossary.html',
    section: 'About',
    title: 'Glossary',
    lead: 'Terms used across the site.',
    sections: [
      {
        h: 'Terms',
        ul: [
          'ATS - alternative trading system',
          'Edition - one generated NFT in a collection',
          'Fingerprint - SHA-256 of an edition sorted trait list',
          'Exclusion rule - a combination of traits that may not appear together',
          'Paper trading - simulated trading with no real value',
          'Concept ID - a label for a generated token concept; not an address',
          'Draft spec ID - a label for a draft contract specification; nothing deployed',
          'Rarity tier - Common, Rare, Epic, Legendary or Mythic, by percentile of rarity score',
        ],
      },
    ],
  },
  {
    path: 'legal/disclaimer.html',
    section: 'About',
    title: 'Disclaimer',
    lead: 'Please read.',
    sections: [
      {
        h: 'Not an offering',
        p: [
          'Nothing on this site is an offer, solicitation, listing, investment advice, legal advice or tax advice. ' +
            SANDBOX_TEXT,
        ],
      },
      {
        h: 'Names',
        p: [
          'Generated token names and tickers are creative concepts and may coincide with existing marks or assets. Run a clearance search before any real use.',
        ],
      },
    ],
  },
];

const CORE_DOC_MAP = new Map<string, CoreDocPage>(
  CORE_DOC_PAGES.map((page) => [page.path, page])
);

export function findCoreDocPage(relPath: string): CoreDocPage | undefined {
  return CORE_DOC_MAP.get(relPath.replace(/^\/+/, ''));
}

function escapeHtml(value: string): string {
  return String(value).replace(/[<>&"']/g, (ch) => {
    switch (ch) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '"':
        return '&quot;';
      case "'":
        return '&apos;';
      default:
        return ch;
    }
  });
}

/**
 * Renders any of the 29 hand-written TWE + NFT Foundry core pages as a standalone
 * Signal Terminal HTML5 webpage (#07131f canvas, #20d9ff cyan accent, #36d7a1 green, #ff7184 coral).
 */
export function renderCoreDocHtmlPage(page: CoreDocPage): string {
  const sameSection = CORE_DOC_PAGES.filter((p) => p.section === page.section);
  const sideNavLinks = sameSection
    .map((p) => {
      const active = p.path === page.path;
      return `<a class="sidenav-link${active ? ' active' : ''}" href="/${escapeHtml(p.path)}">${escapeHtml(p.title)}</a>`;
    })
    .join('\n');

  const bodySections = page.sections
    .map((sec) => {
      const paragraphs = (sec.p ?? []).map((text) => `<p>${escapeHtml(text)}</p>`).join('\n');
      const code = sec.codeBlock ? `<pre><code>${escapeHtml(sec.codeBlock)}</code></pre>` : '';
      const list =
        sec.ul && sec.ul.length > 0
          ? `<ul>${sec.ul.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
          : '';
      return `<section class="doc-section"><h2>${escapeHtml(sec.h)}</h2>${paragraphs}${code}${list}</section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(page.title)} · TWE &amp; NFT Foundry</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif; background: #07131f; color: #e2ecf7; line-height: 1.6; }
    .banner { background: #0d1f33; border-bottom: 1px solid #1b3652; padding: 9px 18px; font-size: 12px; color: #9ec5e6; text-align: center; }
    .banner strong { color: #ff7184; margin-right: 6px; font-family: 'IBM Plex Mono', ui-monospace, monospace; }
    header { position: sticky; top: 0; z-index: 10; background: rgba(7, 19, 31, 0.96); border-bottom: 1px solid #1b3652; }
    .head-inner { max-width: 1100px; margin: 0 auto; padding: 14px 18px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
    .brand { color: #20d9ff; font-weight: 700; text-decoration: none; font-size: 14px; letter-spacing: 0.03em; }
    .nav { display: flex; flex-wrap: wrap; gap: 14px; font-size: 13px; }
    .nav a { color: #b7cde3; text-decoration: none; }
    .nav a:hover, .nav a.active { color: #20d9ff; }
    .layout { max-width: 1100px; margin: 0 auto; padding: 28px 18px 64px; display: grid; grid-template-columns: 240px 1fr; gap: 28px; align-items: start; }
    @media (max-width: 820px) { .layout { grid-template-columns: 1fr; } }
    aside { background: #0b1b2b; border: 1px solid #1b3652; border-radius: 8px; padding: 14px; }
    .aside-title { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #36d7a1; margin-bottom: 10px; }
    .sidenav-link { display: block; padding: 6px 8px; border-radius: 5px; font-size: 13px; color: #b7cde3; text-decoration: none; }
    .sidenav-link:hover { background: #10263c; color: #ffffff; }
    .sidenav-link.active { background: #122d47; color: #20d9ff; font-weight: 600; }
    main { background: #0b1b2b; border: 1px solid #1b3652; border-radius: 8px; padding: 26px 28px; }
    .eyebrow { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #36d7a1; }
    h1 { margin: 6px 0 10px; font-size: 28px; color: #f8fbff; line-height: 1.2; }
    .lead { font-size: 15px; color: #9ec5e6; margin: 0 0 22px; padding-bottom: 18px; border-bottom: 1px solid #1b3652; }
    .doc-section { margin-top: 22px; }
    h2 { font-size: 17px; color: #20d9ff; margin: 0 0 8px; }
    p { margin: 0 0 10px; font-size: 14px; color: #d5e4f2; }
    ul { margin: 8px 0 12px; padding-left: 20px; font-size: 14px; color: #d5e4f2; }
    li { margin-bottom: 6px; }
    pre { background: #050e17; border: 1px solid #1b3652; border-radius: 6px; padding: 14px; overflow-x: auto; font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 12px; color: #36d7a1; }
    footer { max-width: 1100px; margin: 0 auto; padding: 20px 18px 40px; border-top: 1px solid #1b3652; font-size: 12px; color: #7e9ab5; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; }
    footer a { color: #20d9ff; text-decoration: none; }
  </style>
</head>
<body>
  <div class="banner"><strong>SANDBOX</strong>${escapeHtml(SANDBOX_TEXT)}</div>
  <header>
    <div class="head-inner">
      <a class="brand" href="/">TWE &amp; SUPER NFT FOUNDRY · SIGNAL TERMINAL</a>
      <nav class="nav">
        <a href="/twe/index.html"${page.section === 'TWE' ? ' class="active"' : ''}>TWE Docs</a>
        <a href="/foundry/index.html"${page.section === 'Foundry' ? ' class="active"' : ''}>Foundry Docs</a>
        <a href="/foundry/nft/1">NFT Editions</a>
        <a href="/foundry/token/1">Token Concepts</a>
        <a href="/faq.html"${page.path === 'faq.html' ? ' class="active"' : ''}>FAQ</a>
        <a href="/glossary.html"${page.path === 'glossary.html' ? ' class="active"' : ''}>Glossary</a>
        <a href="/about.html"${page.path === 'about.html' ? ' class="active"' : ''}>About</a>
      </nav>
    </div>
  </header>
  <div class="layout">
    <aside>
      <div class="aside-title">${escapeHtml(page.section)} Section</div>
      ${sideNavLinks}
    </aside>
    <main>
      <div class="eyebrow">${escapeHtml(page.section)} · /${escapeHtml(page.path)}</div>
      <h1>${escapeHtml(page.title)}</h1>
      <p class="lead">${escapeHtml(page.lead)}</p>
      ${bodySections}
    </main>
  </div>
  <footer>
    <span>Creator field: Mauro Lomibao Dar III</span>
    <span><a href="/legal/disclaimer.html">Disclaimer</a> · <a href="/roadmap.html">Roadmap</a> · <a href="/foundry/sitemap.xml">Sitemap</a></span>
  </footer>
</body>
</html>`;
}
