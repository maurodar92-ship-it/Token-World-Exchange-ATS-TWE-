/**
 * Phase 0 Security Test Specification for TWE Asset Workspace Firestore Rules.
 * Verifies all "Dirty Dozen" adversarial payloads against the Eight Pillars.
 * Run with Firebase Emulator Suite (`@firebase/rules-unit-testing`) when testing locally.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: {
    uid: string;
    email: string;
    email_verified: boolean;
  } | null;
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
  enforcedByRule: string;
}

export const DIRTY_DOZEN_SECURITY_TESTS: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on UserProfile Create',
    operation: 'create',
    path: '/users/user_alice',
    auth: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    payload: {
      uid: 'user_alice',
      email: 'alice@example.com',
      displayName: 'Alice',
      organization: 'TWE Desk',
      preferredHub: 'overview',
      isAdmin: true,
      createdAt: '__SERVER_TIMESTAMP__',
      updatedAt: '__SERVER_TIMESTAMP__',
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'isValidUser(incoming()) keys().hasOnly(...) rejects isAdmin',
  },
  {
    id: 2,
    name: 'Unverified Email Admin Spoof',
    operation: 'get',
    path: '/users/user_bob',
    auth: { uid: 'user_spoof', email: 'maurodar08@gmail.com', email_verified: false },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'isBootstrappedAdmin() mandates request.auth.token.email_verified == true',
  },
  {
    id: 3,
    name: 'Cross-User PII Profile Read',
    operation: 'get',
    path: '/users/user_bob',
    auth: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'PII isolation restricts /users/{userId} get to owner or verified admin',
  },
  {
    id: 4,
    name: 'Blanket User Directory Scrape',
    operation: 'list',
    path: '/users',
    auth: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'allow list: if false on /users/{userId}',
  },
  {
    id: 5,
    name: 'Identity Spoofing on Asset Create',
    operation: 'create',
    path: '/assets/asset_spoof_01',
    auth: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    payload: {
      ownerId: 'user_bob',
      symbol: 'TWATS',
      name: 'Spoofed Token',
      kind: 'Tokens',
      chain: 'Ethereum',
      standard: 'ERC-3643',
      contractAddress: '0x1234',
      priceUsd: 100,
      supplyFormatted: '1000',
      status: 'Active',
      watchlisted: false,
      notes: '',
      createdAt: '__SERVER_TIMESTAMP__',
      updatedAt: '__SERVER_TIMESTAMP__',
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'isValidAsset(incoming()) and create rule mandate ownerId == request.auth.uid',
  },
  {
    id: 6,
    name: 'ID Poisoning with Oversized/Invalid Document ID',
    operation: 'create',
    path: `/assets/${'a'.repeat(160)}`,
    auth: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    payload: { ownerId: 'user_alice' },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'isValidId(assetId) enforces <= 128 chars and ^[a-zA-Z0-9_\\-]+$',
  },
  {
    id: 7,
    name: 'Client Timestamp Forgery on Asset Create',
    operation: 'create',
    path: '/assets/asset_backdated',
    auth: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    payload: {
      ownerId: 'user_alice',
      symbol: 'TWATS',
      name: 'Backdated Asset',
      kind: 'Tokens',
      chain: 'Ethereum',
      standard: 'ERC-3643',
      contractAddress: '0x1234',
      priceUsd: 50,
      supplyFormatted: '1000',
      status: 'Active',
      watchlisted: false,
      notes: '',
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'incoming().createdAt == request.time && incoming().updatedAt == request.time',
  },
  {
    id: 8,
    name: 'Orphaned Order Referencing Nonexistent Asset',
    operation: 'create',
    path: '/orders/order_orphan_01',
    auth: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    payload: {
      ownerId: 'user_alice',
      assetId: 'missing_asset_999',
      symbol: 'TWATS',
      side: 'BUY',
      orderType: 'LIMIT',
      quantity: 10,
      limitPriceUsd: 100,
      status: 'OPEN',
      createdAt: '__SERVER_TIMESTAMP__',
      updatedAt: '__SERVER_TIMESTAMP__',
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'exists(/databases/$(database)/documents/assets/$(incoming().assetId))',
  },
  {
    id: 9,
    name: 'Cross-Tenant Order Creation on Another User Asset',
    operation: 'create',
    path: '/orders/order_cross_tenant',
    auth: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    payload: {
      ownerId: 'user_alice',
      assetId: 'bob_owned_asset_01',
      symbol: 'TWATS',
      side: 'SELL',
      orderType: 'MARKET',
      quantity: 5,
      limitPriceUsd: 100,
      status: 'OPEN',
      createdAt: '__SERVER_TIMESTAMP__',
      updatedAt: '__SERVER_TIMESTAMP__',
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'get(/databases/$(database)/documents/assets/$(incoming().assetId)).data.ownerId == request.auth.uid',
  },
  {
    id: 10,
    name: 'Terminal State Mutation on FILLED Order',
    operation: 'update',
    path: '/orders/order_filled_01',
    auth: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    payload: {
      status: 'OPEN',
      updatedAt: '__SERVER_TIMESTAMP__',
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: "existing().status == 'OPEN' terminal state gate",
  },
  {
    id: 11,
    name: 'Value Poisoning on Allowed Update Field (notes > 500 chars)',
    operation: 'update',
    path: '/assets/asset_valid_01',
    auth: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    payload: {
      notes: 'X'.repeat(1500),
      updatedAt: '__SERVER_TIMESTAMP__',
    },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'isValidAsset(incoming()) validates notes.size() <= 500 on every update',
  },
  {
    id: 12,
    name: 'Unfiltered Collection Scrape on /assets',
    operation: 'list',
    path: '/assets',
    auth: { uid: 'user_alice', email: 'alice@example.com', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
    enforcedByRule: 'allow list mandates resource.data.ownerId == request.auth.uid',
  },
];
