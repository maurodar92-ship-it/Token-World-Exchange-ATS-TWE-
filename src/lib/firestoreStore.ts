import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import {
  BLUEPRINT_LIMITS,
  db,
  generateDocumentId,
  handleFirestoreError,
  OperationType,
  sanitizeDocumentId,
  sanitizeTicker,
  truncateBounded,
} from './firebase';
import type { AssetKind, InstitutionalOrderType, TweAssetRecord } from '../types/twe';
import type { RarityTier } from './rarityService';

export interface UserProfileDoc {
  uid: string;
  email: string;
  displayName: string;
  organization: string;
  preferredHub: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface PersistedAssetDoc {
  id: string;
  ownerId: string;
  symbol: string;
  name: string;
  kind: AssetKind;
  chain: string;
  standard: string;
  contractAddress: string;
  priceUsd: number;
  supplyFormatted: string;
  status: 'Active' | 'Review' | 'Restricted' | 'Archived';
  watchlisted: boolean;
  notes: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface PersistedOrderDoc {
  id: string;
  ownerId: string;
  assetId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  orderType: InstitutionalOrderType;
  quantity: number;
  limitPriceUsd: number;
  status: 'OPEN' | 'FILLED' | 'CANCELLED';
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface PersistedVaultRecordDoc {
  id: string;
  ownerId: string;
  recordType: 'TRANCHE' | 'BURN' | 'AUDIT';
  symbol: string;
  amountFormatted: string;
  txHash: string;
  memo: string;
  status: 'PENDING' | 'FINALIZED';
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface PersistedNftEditionDoc {
  id: string;
  ownerId: string;
  name: string;
  collection: string;
  rarityScore: number;
  rarityTier: RarityTier;
  traitsSummary: string;
  ipfsCid: string;
  sha256Hash: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

function sortByUpdatedDesc<T extends { updatedAt?: Timestamp | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const am = a.updatedAt ? a.updatedAt.toMillis() : 0;
    const bm = b.updatedAt ? b.updatedAt.toMillis() : 0;
    return bm - am;
  });
}

// ============================================================================
// USER PROFILE (/users/{userId})
// ============================================================================
export async function ensureUserProfile(
  user: User,
  preferredHub = 'overview'
): Promise<UserProfileDoc> {
  const uid = sanitizeDocumentId(user.uid, 'user');
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserProfileDoc;
    }

    const safeHub = BLUEPRINT_LIMITS.hubPattern.test(preferredHub)
      ? preferredHub.slice(0, BLUEPRINT_LIMITS.hubMaxLength)
      : 'overview';

    const payload = {
      uid,
      email: truncateBounded(user.email || 'operator@twe-ats.local', 254, 'operator@twe-ats.local'),
      displayName: truncateBounded(
        user.displayName || user.email?.split('@')[0] || 'TWE Operator',
        BLUEPRINT_LIMITS.displayNameMaxLength,
        'TWE Operator'
      ),
      organization: 'Token World Exchange ATS',
      preferredHub: safeHub,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(ref, payload);
    const created = await getDoc(ref);
    return (created.data() as UserProfileDoc) ?? {
      ...payload,
      createdAt: null,
      updatedAt: null,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserProfile(
  uid: string,
  updates: { displayName?: string; organization?: string; preferredHub?: string }
): Promise<void> {
  const safeUid = sanitizeDocumentId(uid, 'user');
  const path = `users/${safeUid}`;
  const ref = doc(db, 'users', safeUid);

  const patch: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (updates.displayName !== undefined) {
    patch.displayName = truncateBounded(
      updates.displayName,
      BLUEPRINT_LIMITS.displayNameMaxLength,
      'TWE Operator'
    );
  }
  if (updates.organization !== undefined) {
    patch.organization = truncateBounded(
      updates.organization,
      BLUEPRINT_LIMITS.organizationMaxLength,
      'Token World Exchange ATS'
    );
  }
  if (updates.preferredHub !== undefined && BLUEPRINT_LIMITS.hubPattern.test(updates.preferredHub)) {
    patch.preferredHub = updates.preferredHub.slice(0, BLUEPRINT_LIMITS.hubMaxLength);
  }

  try {
    await updateDoc(ref, patch);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ============================================================================
// DIGITAL ASSETS (/assets/{assetId})
// ============================================================================
export function subscribeUserAssets(
  uid: string,
  onData: (assets: PersistedAssetDoc[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'assets';
  const q = query(collection(db, path), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows: PersistedAssetDoc[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PersistedAssetDoc, 'id'>),
      }));
      onData(sortByUpdatedDesc(rows));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export interface CreateAssetInput {
  id?: string;
  symbol: string;
  name: string;
  kind: AssetKind;
  chain: string;
  standard: string;
  contractAddress: string;
  priceUsd: number;
  supplyFormatted: string;
  status?: 'Active' | 'Review';
  watchlisted?: boolean;
  notes?: string;
}

export async function createPersistedAsset(
  uid: string,
  input: CreateAssetInput
): Promise<string> {
  const assetId = input.id
    ? sanitizeDocumentId(input.id, 'asset')
    : generateDocumentId('asset');
  const path = `assets/${assetId}`;

  const payload = {
    ownerId: uid,
    symbol: sanitizeTicker(input.symbol),
    name: truncateBounded(input.name, BLUEPRINT_LIMITS.assetNameMaxLength, 'Unnamed Asset'),
    kind: input.kind,
    chain: truncateBounded(input.chain, BLUEPRINT_LIMITS.chainMaxLength, 'Ethereum'),
    standard: truncateBounded(input.standard, BLUEPRINT_LIMITS.standardMaxLength, 'ERC-3643'),
    contractAddress: truncateBounded(
      input.contractAddress,
      BLUEPRINT_LIMITS.contractAddressMaxLength,
      '0x0000000000000000000000000000000000000000'
    ),
    priceUsd: Number.isFinite(input.priceUsd) && input.priceUsd >= 0 ? Number(input.priceUsd) : 0,
    supplyFormatted: truncateBounded(
      input.supplyFormatted,
      BLUEPRINT_LIMITS.supplyFormattedMaxLength,
      '1,000,000'
    ),
    status: input.status === 'Review' ? 'Review' : 'Active',
    watchlisted: Boolean(input.watchlisted),
    notes: truncateBounded(input.notes ?? '', BLUEPRINT_LIMITS.notesMaxLength, ''),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'assets', assetId), payload);
    return assetId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function syncWorkspaceAssetsToFirestore(
  uid: string,
  assets: TweAssetRecord[],
  existingIds: Set<string>,
  limit = 8
): Promise<number> {
  const candidates = assets.slice(0, limit);
  let created = 0;

  for (const item of candidates) {
    const docId = sanitizeDocumentId(`${uid.slice(0, 8)}_${item.id}`, 'asset');
    if (existingIds.has(docId)) continue;

    await createPersistedAsset(uid, {
      id: docId,
      symbol: item.symbol,
      name: item.name,
      kind: item.kind,
      chain: item.chain,
      standard: item.standard,
      contractAddress: item.contractAddress,
      priceUsd: item.priceUsd,
      supplyFormatted: item.supplyFormatted,
      status: item.status === 'Review' ? 'Review' : 'Active',
      watchlisted: item.watchlisted,
      notes: `Synced from TWE Token Atlas (Chain ID ${item.chainId})`,
    });
    created += 1;
  }
  return created;
}

export async function toggleAssetWatchlist(assetId: string, watchlisted: boolean): Promise<void> {
  const path = `assets/${assetId}`;
  try {
    await updateDoc(doc(db, 'assets', assetId), {
      watchlisted,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateAssetPriceAndNotes(
  assetId: string,
  priceUsd: number,
  notes: string
): Promise<void> {
  const path = `assets/${assetId}`;
  try {
    await updateDoc(doc(db, 'assets', assetId), {
      priceUsd: Number.isFinite(priceUsd) && priceUsd >= 0 ? Number(priceUsd) : 0,
      notes: truncateBounded(notes, BLUEPRINT_LIMITS.notesMaxLength, ''),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateAssetStatus(
  assetId: string,
  status: 'Active' | 'Review' | 'Restricted' | 'Archived'
): Promise<void> {
  const path = `assets/${assetId}`;
  try {
    await updateDoc(doc(db, 'assets', assetId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePersistedAsset(assetId: string): Promise<void> {
  const path = `assets/${assetId}`;
  try {
    await deleteDoc(doc(db, 'assets', assetId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// ATS ORDERS (/orders/{orderId})
// ============================================================================
export function subscribeUserOrders(
  uid: string,
  onData: (orders: PersistedOrderDoc[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'orders';
  const q = query(collection(db, path), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows: PersistedOrderDoc[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PersistedOrderDoc, 'id'>),
      }));
      onData(sortByUpdatedDesc(rows));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export interface CreateOrderInput {
  assetId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  orderType: InstitutionalOrderType;
  quantity: number;
  limitPriceUsd: number;
}

export async function createPersistedOrder(
  uid: string,
  input: CreateOrderInput
): Promise<string> {
  const orderId = generateDocumentId('ord');
  const path = `orders/${orderId}`;

  const payload = {
    ownerId: uid,
    assetId: sanitizeDocumentId(input.assetId, 'asset'),
    symbol: sanitizeTicker(input.symbol),
    side: input.side,
    orderType: input.orderType,
    quantity: Number.isFinite(input.quantity) && input.quantity > 0 ? Number(input.quantity) : 1,
    limitPriceUsd:
      Number.isFinite(input.limitPriceUsd) && input.limitPriceUsd >= 0
        ? Number(input.limitPriceUsd)
        : 0,
    status: 'OPEN',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'orders', orderId), payload);
    return orderId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function settleOrCancelOrder(
  orderId: string,
  status: 'FILLED' | 'CANCELLED'
): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePersistedOrder(orderId: string): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    await deleteDoc(doc(db, 'orders', orderId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// SOVEREIGN VAULT & BURN LEDGER (/vaultRecords/{recordId})
// ============================================================================
export function subscribeUserVaultRecords(
  uid: string,
  onData: (records: PersistedVaultRecordDoc[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'vaultRecords';
  const q = query(collection(db, path), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows: PersistedVaultRecordDoc[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PersistedVaultRecordDoc, 'id'>),
      }));
      onData(sortByUpdatedDesc(rows));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export interface CreateVaultRecordInput {
  recordType: 'TRANCHE' | 'BURN' | 'AUDIT';
  symbol: string;
  amountFormatted: string;
  txHash?: string;
  memo?: string;
}

export async function createVaultRecord(
  uid: string,
  input: CreateVaultRecordInput
): Promise<string> {
  const recordId = generateDocumentId('vlt');
  const path = `vaultRecords/${recordId}`;

  const rawHash = input.txHash?.trim() || `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 18)}`;
  const safeHash = sanitizeDocumentId(rawHash, 'tx');

  const payload = {
    ownerId: uid,
    recordType: input.recordType,
    symbol: sanitizeTicker(input.symbol),
    amountFormatted: truncateBounded(
      input.amountFormatted,
      BLUEPRINT_LIMITS.supplyFormattedMaxLength,
      '0'
    ),
    txHash: safeHash.length >= 4 ? safeHash : `tx_${safeHash}`,
    memo: truncateBounded(input.memo ?? '', BLUEPRINT_LIMITS.memoMaxLength, ''),
    status: 'PENDING',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'vaultRecords', recordId), payload);
    return recordId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function finalizeVaultRecord(recordId: string): Promise<void> {
  const path = `vaultRecords/${recordId}`;
  try {
    await updateDoc(doc(db, 'vaultRecords', recordId), {
      status: 'FINALIZED',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteVaultRecord(recordId: string): Promise<void> {
  const path = `vaultRecords/${recordId}`;
  try {
    await deleteDoc(doc(db, 'vaultRecords', recordId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// NFT EDITIONS & RARITY LEDGER (/nftEditions/{editionId})
// ============================================================================
export function subscribeUserNftEditions(
  uid: string,
  onData: (editions: PersistedNftEditionDoc[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'nftEditions';
  const q = query(collection(db, path), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows: PersistedNftEditionDoc[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PersistedNftEditionDoc, 'id'>),
      }));
      onData(sortByUpdatedDesc(rows));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError?.(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export interface CreateNftEditionInput {
  name: string;
  collection: string;
  rarityScore: number;
  rarityTier: RarityTier;
  traitsSummary: string;
  ipfsCid?: string;
  sha256Hash?: string;
}

export async function createNftEdition(
  uid: string,
  input: CreateNftEditionInput
): Promise<string> {
  const editionId = generateDocumentId('nft');
  const path = `nftEditions/${editionId}`;

  const defaultCid = `bafybei${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  const defaultSha = `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 18)}`.padEnd(16, '0');

  const payload = {
    ownerId: uid,
    name: truncateBounded(input.name, BLUEPRINT_LIMITS.assetNameMaxLength, 'TWE Edition'),
    collection: truncateBounded(
      input.collection,
      BLUEPRINT_LIMITS.assetNameMaxLength,
      'TWE Sovereign Editions'
    ),
    rarityScore:
      Number.isFinite(input.rarityScore) && input.rarityScore >= 0 ? Number(input.rarityScore) : 0,
    rarityTier: input.rarityTier,
    traitsSummary: truncateBounded(
      input.traitsSummary,
      BLUEPRINT_LIMITS.traitsSummaryMaxLength,
      'Standard Composition'
    ),
    ipfsCid: truncateBounded(input.ipfsCid || defaultCid, BLUEPRINT_LIMITS.hashMaxLength, defaultCid),
    sha256Hash: truncateBounded(
      input.sha256Hash || defaultSha,
      BLUEPRINT_LIMITS.hashMaxLength,
      defaultSha
    ),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'nftEditions', editionId), payload);
    return editionId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteNftEdition(editionId: string): Promise<void> {
  const path = `nftEditions/${editionId}`;
  try {
    await deleteDoc(doc(db, 'nftEditions', editionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
