import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  doc,
  enableNetwork,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
  type Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

function createFirestoreClient(): Firestore {
  const databaseId = firebaseConfig.firestoreDatabaseId;
  try {
    return initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
        experimentalLongPollingOptions: {
          timeoutSeconds: 10,
        },
        ignoreUndefinedProperties: true,
      },
      databaseId
    );
  } catch {
    return getFirestore(app, databaseId);
  }
}

export const db = createFirestoreClient();
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

// Validate initial Firestore connectivity at boot (using long-polling transport)
async function testConnection() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    if (typeof window !== 'undefined') {
      window.addEventListener(
        'online',
        () => {
          void testConnection();
        },
        { once: true }
      );
    }
    return;
  }

  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      try {
        await enableNetwork(db);
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (retryError) {
        if (retryError instanceof Error && retryError.message.includes('the client is offline')) {
          console.error('Please check your Firebase configuration.');
        }
      }
    }
  }
}

void testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Synchronized verbatim with firebase-blueprint.json constraints
export const BLUEPRINT_LIMITS = {
  idPattern: /^[a-zA-Z0-9_-]+$/,
  idMaxLength: 128,
  tickerPattern: /^[A-Z0-9._-]+$/,
  tickerMaxLength: 24,
  hubPattern: /^[a-z0-9-]+$/,
  hubMaxLength: 64,
  displayNameMaxLength: 120,
  organizationMaxLength: 120,
  assetNameMaxLength: 120,
  chainMaxLength: 64,
  standardMaxLength: 32,
  contractAddressMaxLength: 128,
  supplyFormattedMaxLength: 120,
  notesMaxLength: 500,
  memoMaxLength: 300,
  traitsSummaryMaxLength: 400,
  hashMaxLength: 128,
} as const;

export function sanitizeDocumentId(raw: string, prefix = 'doc'): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 96);
  const base = cleaned.length > 0 ? cleaned : `${prefix}_${Date.now()}`;
  return base.slice(0, BLUEPRINT_LIMITS.idMaxLength);
}

export function generateDocumentId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return sanitizeDocumentId(`${prefix}_${ts}_${rand}`, prefix);
}

export function sanitizeTicker(raw: string): string {
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9._-]/g, '');
  return (cleaned || 'TWATS').slice(0, BLUEPRINT_LIMITS.tickerMaxLength);
}

export function truncateBounded(raw: string, maxLength: number, fallback = ''): string {
  const trimmed = raw.trim();
  if (!trimmed) return fallback.slice(0, maxLength);
  return trimmed.slice(0, maxLength);
}
