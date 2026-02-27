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
  type User,
} from "@/lib/firebase/client";

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  authProvider: "email" | "google";
  onboardingComplete: boolean;
  aiEnabled: boolean;
  streakThreshold: number;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isDemoMode: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDemoMode(sessionStorage.getItem("haptimize_demo") === "true");
    }
  }, []);

  const loadProfile = useCallback(async (u: User) => {
    try {
      const ref = doc(db, "users", u.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
      } else {
        const newProfile: UserProfile = {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          authProvider: u.providerData[0]?.providerId === "google.com" ? "google" : "email",
          onboardingComplete: false,
          aiEnabled: true,
          streakThreshold: 80,
        };
        await setDoc(ref, newProfile);
        setProfile(newProfile);
      }
    } catch {
      setProfile({
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        authProvider: "email",
        onboardingComplete: false,
        aiEnabled: true,
        streakThreshold: 80,
      });
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        if (isDemoMode) {
          setIsDemoMode(false);
          sessionStorage.removeItem("haptimize_demo");
        }
        await loadProfile(u);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [loadProfile, isDemoMode]);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
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

  const enterDemoMode = useCallback(() => {
    setIsDemoMode(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("haptimize_demo", "true");
    }
  }, []);

  const exitDemoMode = useCallback(() => {
    setIsDemoMode(false);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("haptimize_demo");
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isDemoMode,
        signInWithGoogle,
        logout,
        completeOnboarding,
        enterDemoMode,
        exitDemoMode,
      }}
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
