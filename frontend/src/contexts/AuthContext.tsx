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
  signInAnonymously as firebaseSignInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  type User,
} from "@/lib/firebase/client";

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  authProvider: "email" | "google" | "anonymous";
  onboardingComplete: boolean;
  aiEnabled: boolean;
  humanize: boolean;
  streakThreshold: number;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (u: User) => {
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
        };
        await setDoc(ref, newProfile);
        setProfile(newProfile);
      }
    } catch {
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
      });
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await loadProfile(u);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [loadProfile]);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signInAnonymously = useCallback(async () => {
    await firebaseSignInAnonymously(auth);
  }, []);

  const logout = useCallback(async () => {
    await firebaseSignOut(auth);
    setProfile(null);
  }, []);

  const completeOnboarding = useCallback(async () => {
    if (!user) return;
    try {
      const ref = doc(db, "users", user.uid);
      const { updateDoc } = await import("@/lib/firebase/client");
      await updateDoc(ref, { onboardingComplete: true });
      setProfile((prev) => (prev ? { ...prev, onboardingComplete: true } : prev));
    } catch {
      setProfile((prev) => (prev ? { ...prev, onboardingComplete: true } : prev));
    }
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user);
  }, [user, loadProfile]);

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signInWithGoogle, signInAnonymously, logout, completeOnboarding, refreshProfile }}
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
