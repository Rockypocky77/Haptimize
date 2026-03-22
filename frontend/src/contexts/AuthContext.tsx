"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  type User,
} from "@/lib/firebase/client";
import { deleteUser } from "firebase/auth";
import { CURRENT_TERMS_VERSION } from "@/lib/legal-content";

export const DEMO_UID = "demo_shared";
const DEMO_STORAGE_KEY = "haptimize_demo_mode";

/** Fake User object for shared demo mode - no Firebase Auth, no Firestore writes */
const DEMO_USER = {
  uid: DEMO_UID,
  isAnonymous: true,
  email: null,
  displayName: "Demo User",
  metadata: { creationTime: new Date().toISOString() },
} as User;

const DEMO_PROFILE: UserProfile = {
  uid: DEMO_UID,
  email: null,
  displayName: "Demo User",
  authProvider: "anonymous",
  onboardingComplete: true,
  aiEnabled: true,
  humanize: false,
  streakThreshold: 80,
  plan: "free",
};

export type PlanTier = "free" | "pro" | "max";

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  authProvider: "email" | "google" | "anonymous";
  onboardingComplete: boolean;
  aiEnabled: boolean;
  humanize: boolean;
  streakThreshold: number;
  plan?: PlanTier;
  termsVersion?: string | null;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  agreeToTerms: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updatePlan: (plan: PlanTier) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (u: User) => {
    if (u.uid === DEMO_UID) return; // Demo uses local state, no Firestore
    // #region agent log
    if (typeof fetch === "function") {
      fetch("http://127.0.0.1:7587/ingest/2c649473-d553-40ac-a354-2089a54d94ff", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "24f9f6" },
        body: JSON.stringify({
          sessionId: "24f9f6",
          location: "AuthContext:loadProfile:entry",
          message: "loadProfile started",
          data: { uid: u.uid, isAnonymous: u.isAnonymous },
          hypothesisId: "H1",
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
    // #endregion
    try {
      const ref = doc(db, "users", u.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as Record<string, unknown>;
        setProfile({
          ...data,
          uid: u.uid,
          streakThreshold: (data.streakThreshold as number) ?? 80,
          humanize: (data.humanize as boolean) ?? false,
          plan: (data.plan as PlanTier) ?? "free",
        } as UserProfile);
      } else {
        const authProvider: UserProfile["authProvider"] = u.isAnonymous
          ? "anonymous"
          : u.providerData[0]?.providerId === "google.com"
            ? "google"
            : "email";
        const newProfile: UserProfile = {
          uid: u.uid,
          email: u.email ?? null,
          displayName: u.displayName ?? (u.isAnonymous ? "Demo User" : null),
          authProvider,
          onboardingComplete: false,
          aiEnabled: true,
          humanize: false,
          streakThreshold: 80,
          plan: "free",
        };
        await setDoc(ref, newProfile);
        setProfile(newProfile);
      }
    } catch (err) {
      // #region agent log
      if (typeof fetch === "function") {
        fetch("http://127.0.0.1:7587/ingest/2c649473-d553-40ac-a354-2089a54d94ff", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "24f9f6" },
          body: JSON.stringify({
            sessionId: "24f9f6",
            location: "AuthContext:loadProfile:catch",
            message: "loadProfile failed",
            data: { uid: u.uid, error: String(err) },
            hypothesisId: "H1",
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      }
      // #endregion
      const authProvider: UserProfile["authProvider"] = u.isAnonymous
        ? "anonymous"
        : u.providerData[0]?.providerId === "google.com"
          ? "google"
          : "email";
      setProfile({
        uid: u.uid,
        email: u.email ?? null,
        displayName: u.displayName ?? (u.isAnonymous ? "Demo User" : null),
        authProvider,
        onboardingComplete: false,
        aiEnabled: true,
        humanize: false,
        streakThreshold: 80,
        plan: "free",
      });
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        await loadProfile(u);
      } else {
        // Check for persisted demo mode (shared demo - no new Firebase accounts)
        if (typeof window !== "undefined" && localStorage.getItem(DEMO_STORAGE_KEY) === "true") {
          setUser(DEMO_USER);
          setProfile(DEMO_PROFILE);
        } else {
          setUser(null);
          setProfile(null);
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [loadProfile]);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signInAnonymously = useCallback(async () => {
    // Shared demo: no Firebase Auth, no new accounts. All demo users share the same local state.
    if (typeof window !== "undefined") {
      localStorage.setItem(DEMO_STORAGE_KEY, "true");
    }
    setUser(DEMO_USER);
    setProfile(DEMO_PROFILE);
  }, []);

  const logout = useCallback(async () => {
    if (user?.uid === DEMO_UID) {
      if (typeof window !== "undefined") {
        localStorage.removeItem(DEMO_STORAGE_KEY);
      }
      setUser(null);
      setProfile(null);
    } else {
      await firebaseSignOut(auth);
      setProfile(null);
    }
  }, [user]);

  const deleteAccount = useCallback(async () => {
    if (!user) return;
    if (user.uid === DEMO_UID) {
      if (typeof window !== "undefined") {
        localStorage.removeItem(DEMO_STORAGE_KEY);
      }
      setUser(null);
      setProfile(null);
      return;
    }
    const userDocRef = doc(db, "users", user.uid);
    await deleteDoc(userDocRef);
    await deleteUser(user);
    setProfile(null);
  }, [user]);

  const agreeToTerms = useCallback(async () => {
    if (!user) return;
    if (user.uid === DEMO_UID) {
      setProfile((prev) => (prev ? { ...prev, termsVersion: CURRENT_TERMS_VERSION } : prev));
      return;
    }
    try {
      const ref = doc(db, "users", user.uid);
      const { updateDoc } = await import("@/lib/firebase/client");
      await updateDoc(ref, { termsVersion: CURRENT_TERMS_VERSION });
      setProfile((prev) => (prev ? { ...prev, termsVersion: CURRENT_TERMS_VERSION } : prev));
    } catch {
      setProfile((prev) => (prev ? { ...prev, termsVersion: CURRENT_TERMS_VERSION } : prev));
    }
  }, [user]);

  const completeOnboarding = useCallback(async () => {
    if (!user) return;
    if (user.uid === DEMO_UID) {
      setProfile((prev) => (prev ? { ...prev, onboardingComplete: true } : prev));
      return;
    }
    try {
      const ref = doc(db, "users", user.uid);
      const { updateDoc } = await import("@/lib/firebase/client");
      await updateDoc(ref, { onboardingComplete: true });
      setProfile((prev) => (prev ? { ...prev, onboardingComplete: true } : prev));
    } catch (err) {
      // #region agent log
      if (typeof fetch === "function") {
        fetch("http://127.0.0.1:7587/ingest/2c649473-d553-40ac-a354-2089a54d94ff", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "24f9f6" },
          body: JSON.stringify({
            sessionId: "24f9f6",
            location: "AuthContext:completeOnboarding:catch",
            message: "completeOnboarding failed",
            data: { uid: user.uid, error: String(err) },
            hypothesisId: "H5",
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      }
      // #endregion
      setProfile((prev) => (prev ? { ...prev, onboardingComplete: true } : prev));
    }
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    if (user.uid === DEMO_UID) return; // Demo profile is static
    await loadProfile(user);
  }, [user, loadProfile]);

  const updatePlan = useCallback(
    async (plan: PlanTier) => {
      if (!user) return;
      if (user.uid === DEMO_UID) {
        setProfile((prev) => (prev ? { ...prev, plan } : prev));
        return;
      }
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, { plan });
      setProfile((prev) => (prev ? { ...prev, plan } : prev));
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signInWithGoogle, signInAnonymously, logout, deleteAccount, agreeToTerms, completeOnboarding, refreshProfile, updatePlan }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
