import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import {
  ensureUserProfile,
  subscribeUserAssets,
  subscribeUserNftEditions,
  subscribeUserOrders,
  subscribeUserVaultRecords,
  updateUserProfile,
  type PersistedAssetDoc,
  type PersistedNftEditionDoc,
  type PersistedOrderDoc,
  type PersistedVaultRecordDoc,
  type UserProfileDoc,
} from '../lib/firestoreStore';

interface FirebaseContextValue {
  user: User | null;
  authReady: boolean;
  profile: UserProfileDoc | null;
  assets: PersistedAssetDoc[];
  orders: PersistedOrderDoc[];
  vaultRecords: PersistedVaultRecordDoc[];
  nftEditions: PersistedNftEditionDoc[];
  signingIn: boolean;
  authError: string | null;
  firestoreError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  saveProfile: (updates: {
    displayName?: string;
    organization?: string;
    preferredHub?: string;
  }) => Promise<void>;
  clearErrors: () => void;
}

const FirebaseContext = createContext<FirebaseContextValue | null>(null);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<UserProfileDoc | null>(null);
  const [assets, setAssets] = useState<PersistedAssetDoc[]>([]);
  const [orders, setOrders] = useState<PersistedOrderDoc[]>([]);
  const [vaultRecords, setVaultRecords] = useState<PersistedVaultRecordDoc[]>([]);
  const [nftEditions, setNftEditions] = useState<PersistedNftEditionDoc[]>([]);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (!nextUser) {
        setProfile(null);
        setAssets([]);
        setOrders([]);
        setVaultRecords([]);
        setNftEditions([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Only attach Firestore listeners and profile sync when auth is ready and user is authenticated
  useEffect(() => {
    if (!authReady || !user) return;

    let cancelled = false;
    setFirestoreError(null);

    void ensureUserProfile(user)
      .then((prof) => {
        if (!cancelled) setProfile(prof);
      })
      .catch((err) => {
        if (!cancelled) {
          setFirestoreError(err instanceof Error ? err.message : String(err));
        }
      });

    const handleErr = (err: Error) => {
      if (!cancelled) setFirestoreError(err.message);
    };

    const unsubAssets = subscribeUserAssets(user.uid, setAssets, handleErr);
    const unsubOrders = subscribeUserOrders(user.uid, setOrders, handleErr);
    const unsubVault = subscribeUserVaultRecords(user.uid, setVaultRecords, handleErr);
    const unsubNfts = subscribeUserNftEditions(user.uid, setNftEditions, handleErr);

    return () => {
      cancelled = true;
      unsubAssets();
      unsubOrders();
      unsubVault();
      unsubNfts();
    };
  }, [authReady, user]);

  const signInWithGoogle = useCallback(async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in was cancelled or blocked.';
      setAuthError(message);
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    await signOut(auth);
  }, []);

  const saveProfile = useCallback(
    async (updates: { displayName?: string; organization?: string; preferredHub?: string }) => {
      if (!user) return;
      await updateUserProfile(user.uid, updates);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              displayName: updates.displayName ?? prev.displayName,
              organization: updates.organization ?? prev.organization,
              preferredHub: updates.preferredHub ?? prev.preferredHub,
            }
          : prev
      );
    },
    [user]
  );

  const clearErrors = useCallback(() => {
    setAuthError(null);
    setFirestoreError(null);
  }, []);

  const value = useMemo<FirebaseContextValue>(
    () => ({
      user,
      authReady,
      profile,
      assets,
      orders,
      vaultRecords,
      nftEditions,
      signingIn,
      authError,
      firestoreError,
      signInWithGoogle,
      signOutUser,
      saveProfile,
      clearErrors,
    }),
    [
      user,
      authReady,
      profile,
      assets,
      orders,
      vaultRecords,
      nftEditions,
      signingIn,
      authError,
      firestoreError,
      signInWithGoogle,
      signOutUser,
      saveProfile,
      clearErrors,
    ]
  );

  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
};

export function useFirebase(): FirebaseContextValue {
  const ctx = useContext(FirebaseContext);
  if (!ctx) {
    throw new Error('useFirebase must be used inside a FirebaseProvider');
  }
  return ctx;
}

interface BoundaryState {
  hasError: boolean;
  message: string;
}

export class FirebaseErrorBoundary extends React.Component<
  { children: React.ReactNode },
  BoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected application error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--twe-bg-canvas)] text-[var(--twe-text-primary)] p-6">
          <div className="max-w-lg w-full rounded-xl border border-rose-500/40 bg-[var(--twe-bg-surface)] p-6 space-y-4">
            <div className="text-sm font-display font-semibold text-rose-500">
              Workspace Recovery Guard
            </div>
            <p className="text-xs text-[var(--twe-text-secondary)] break-words font-mono bg-[var(--twe-bg-elevated)] p-3 rounded border border-[var(--twe-border)]">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="px-3.5 py-2 rounded-md text-xs font-semibold bg-[#A8843E] dark:bg-[#D4B475] text-white dark:text-[#0B0D10] cursor-pointer"
            >
              Return to Workspace
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
