"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api/client";
import { useTransition } from "@/contexts/TransitionContext";
import BlobBackground from "@/components/ui/BlobBackground";
import ClickSpark from "@/components/ui/ClickSpark";

export default function SignupPage() {
  const router = useRouter();
  const { user, loading, signInWithGoogle } = useAuth();
  const { endTransition, startTransition } = useTransition();

  useEffect(() => {
    const t = setTimeout(() => endTransition(), 150);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      startTransition("/home");
    }
  }, [loading, user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (mode === "signup") {
        const res = await api.requestSignupCode(email, password);
        if (!res.ok) {
          setError(res.error ?? "Something went wrong");
          return;
        }
        const params = new URLSearchParams({ email });
        router.push(`/verify?${params}`);
      } else {
        const { signInWithEmailAndPassword } = await import("firebase/auth");
        const { auth } = await import("@/lib/firebase/client");
        await signInWithEmailAndPassword(auth, email, password);
        startTransition("/home");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(
        msg === "Failed to fetch" ? "Connection error. Please check your internet and try again." : msg
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      await signInWithGoogle();
      startTransition("/home");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    }
  }

  return (
    <div className="min-h-screen flex relative bg-[#F0F5F2] overflow-hidden">
      <BlobBackground />

      {/* Desktop: left blob, right = full opaque panel (like reference) */}
      <div className="hidden lg:grid flex-1 grid-cols-[3fr_2fr] min-h-screen relative z-10">
        {/* Left — blob background visible */}
        <div aria-hidden />

        {/* Right — opaque box takes entire column, full height */}
        <div
          className="flex flex-col min-h-screen border-l border-white/50 bg-white/40 backdrop-blur-2xl px-8 py-6"
          style={{
            boxShadow: "-10px 0 40px -10px rgba(127, 175, 143, 0.08)",
          }}
        >
          {/* Back to home — separate button on opaque box */}
          <ClickSpark sparkColor="#7FAF8F" sparkSize={8} sparkRadius={14} className="mb-6 h-auto min-h-0 w-fit">
            <button
              type="button"
              onClick={() => startTransition("/")}
              className="px-4 py-2 rounded-xl bg-white/90 border border-primary-light/40 text-sm text-neutral-dark/70 hover:text-neutral-dark hover:bg-white cursor-pointer shadow-sm"
            >
              ← Back to home
            </button>
          </ClickSpark>

          <div className="flex flex-col flex-1 justify-center max-w-sm mx-auto w-full">
            <div className="mb-4 flex flex-col items-center">
              <Image
                src="/CircularHaptimizeLogo.png"
                alt="Haptimize"
                width={64}
                height={64}
                priority
                className="rounded-full"
              />
              <p className="text-xs text-neutral-dark/50 mt-1.5">Win Today, Win Tomorrow.</p>
            </div>

            <h2 className="text-base font-semibold text-neutral-dark mb-3 text-center">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h2>

            <Button variant="secondary" fullWidth onClick={handleGoogleSignIn} size="sm" className="mb-3 gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </Button>

            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 h-px bg-primary-light/50" />
              <span className="text-[10px] text-neutral-dark/40 uppercase tracking-wide">or</span>
              <div className="flex-1 h-px bg-primary-light/50" />
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-2">
              <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="py-2 text-sm" />
              <Input label="Password" type="password" placeholder="Min 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="py-2 text-sm" />
              {error && <p className="text-xs text-error bg-error/10 rounded-lg px-2.5 py-1.5">{error}</p>}
              <Button type="submit" fullWidth loading={submitting} size="sm" className="py-2">
                {mode === "signup" ? "Sign Up" : "Log In"}
              </Button>
            </form>

            <p className="text-xs text-center text-neutral-dark/60 mt-3">
              {mode === "signup" ? (
                <>Already have an account? <ClickSpark sparkColor="#7FAF8F" sparkSize={8} sparkRadius={14} className="inline-flex"><button className="text-primary font-medium hover:underline cursor-pointer" onClick={() => { setMode("login"); setError(""); }}>Log in</button></ClickSpark></>
              ) : (
                <>Don&apos;t have an account? <ClickSpark sparkColor="#7FAF8F" sparkSize={8} sparkRadius={14} className="inline-flex"><button className="text-primary font-medium hover:underline cursor-pointer" onClick={() => { setMode("signup"); setError(""); }}>Sign up</button></ClickSpark></>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Mobile: full opaque panel, compact to fit */}
      <div className="lg:hidden flex flex-1 flex-col min-h-screen w-full relative z-10 bg-white/40 backdrop-blur-2xl border-l-0">
        <div className="flex flex-col flex-1 justify-center p-5 max-w-sm mx-auto w-full">
          <ClickSpark sparkColor="#7FAF8F" sparkSize={8} sparkRadius={14} className="absolute top-5 left-5 h-auto min-h-0 w-fit">
            <button
              type="button"
              onClick={() => startTransition("/")}
              className="px-3 py-1.5 rounded-xl bg-white/90 border border-primary-light/40 text-xs text-neutral-dark/70 hover:text-neutral-dark cursor-pointer shadow-sm"
            >
              ← Back to home
            </button>
          </ClickSpark>
          <div className="mb-3 flex flex-col items-center">
            <Image src="/CircularHaptimizeLogo.png" alt="Haptimize" width={56} height={56} priority className="rounded-full" />
            <p className="text-xs text-neutral-dark/50 mt-1">Win Today, Win Tomorrow.</p>
          </div>
          <h2 className="text-base font-semibold text-neutral-dark mb-2.5 text-center">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h2>
          <Button variant="secondary" fullWidth onClick={handleGoogleSignIn} size="sm" className="mb-2.5 gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </Button>
          <div className="flex items-center gap-2 my-2.5">
            <div className="flex-1 h-px bg-primary-light/50" />
            <span className="text-[10px] text-neutral-dark/40 uppercase tracking-wide">or</span>
            <div className="flex-1 h-px bg-primary-light/50" />
          </div>
          <form onSubmit={handleEmailSubmit} className="space-y-2">
            <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="py-2 text-sm" />
            <Input label="Password" type="password" placeholder="Min 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="py-2 text-sm" />
            {error && <p className="text-xs text-error bg-error/10 rounded-lg px-2.5 py-1.5">{error}</p>}
            <Button type="submit" fullWidth loading={submitting} size="sm" className="py-2">{mode === "signup" ? "Sign Up" : "Log In"}</Button>
          </form>
          <p className="text-xs text-center text-neutral-dark/60 mt-2.5">
            {mode === "signup" ? (
              <>Already have an account? <ClickSpark sparkColor="#7FAF8F" sparkSize={8} sparkRadius={14} className="inline-flex"><button className="text-primary font-medium hover:underline cursor-pointer" onClick={() => { setMode("login"); setError(""); }}>Log in</button></ClickSpark></>
            ) : (
              <>Don&apos;t have an account? <ClickSpark sparkColor="#7FAF8F" sparkSize={8} sparkRadius={14} className="inline-flex"><button className="text-primary font-medium hover:underline cursor-pointer" onClick={() => { setMode("signup"); setError(""); }}>Sign up</button></ClickSpark></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
