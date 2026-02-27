"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api/client";

export default function LandingPage() {
  const router = useRouter();
  const { user, loading, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    router.replace("/home");
    return null;
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (mode === "signup") {
        const res = await api.requestSignupCode(email, password, username || undefined);
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
        router.push("/home");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      await signInWithGoogle();
      router.push("/home");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    }
  }

  return (
    <div className="min-h-screen flex bg-neutral-light">
      {/* Left hero — 75% */}
      <div className="hidden lg:flex w-3/4 relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary-light/20 to-neutral-light items-center justify-center p-12">
        <div className="max-w-2xl space-y-8">
          <Image
            src="/HaptimizeTLogo.png"
            alt="Haptimize"
            width={280}
            height={70}
            className="mb-4"
            priority
          />
          <h1 className="text-5xl font-bold text-neutral-dark leading-tight">
            Win Today&hellip;
            <br />
            <span className="text-primary">win tomorrow&hellip;</span>
          </h1>
          <p className="text-lg text-neutral-dark/70 max-w-md">
            Build habits that compound. Track your progress, set reminders, and
            let consistency turn small wins into massive results.
          </p>

          {/* Angled screenshot placeholders */}
          <div className="relative mt-8">
            <div className="w-72 h-48 bg-white rounded-2xl shadow-xl border border-primary-light/40 transform -rotate-3 absolute top-0 left-0">
              <div className="p-4 space-y-3">
                <div className="h-3 w-24 bg-primary/30 rounded" />
                <div className="h-3 w-36 bg-primary-light/40 rounded" />
                <div className="h-3 w-20 bg-accent/40 rounded" />
                <div className="flex gap-2 mt-4">
                  <div className="h-16 w-16 rounded-full bg-primary/20" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3 w-full bg-primary-light/30 rounded" />
                    <div className="h-3 w-3/4 bg-primary-light/20 rounded" />
                  </div>
                </div>
              </div>
            </div>
            <div className="w-72 h-48 bg-white rounded-2xl shadow-xl border border-primary-light/40 transform rotate-2 ml-40 mt-8">
              <div className="p-4 space-y-3">
                <div className="h-3 w-32 bg-primary/30 rounded" />
                <div className="flex gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/20" />
                  <div className="h-8 w-8 rounded-lg bg-accent/30" />
                  <div className="h-8 w-8 rounded-lg bg-primary-light/40" />
                </div>
                <div className="h-20 w-full bg-primary-light/15 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right auth panel — 25% */}
      <div className="w-full lg:w-1/4 min-w-[360px] flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-lg border border-primary-light/30 p-8">
          {/* Mobile logo */}
          <div className="lg:hidden mb-6 text-center">
            <Image
              src="/HaptimizeTLogo.png"
              alt="Haptimize"
              width={180}
              height={45}
              className="mx-auto mb-2"
              priority
            />
            <p className="text-sm text-neutral-dark/60">
              Win today, win tomorrow.
            </p>
          </div>

          <h2 className="text-xl font-semibold text-neutral-dark mb-6">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h2>

          {/* Google OAuth */}
          <Button
            variant="secondary"
            fullWidth
            onClick={handleGoogleSignIn}
            className="mb-4 gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-primary-light/50" />
            <span className="text-xs text-neutral-dark/40 uppercase tracking-wide">
              or
            </span>
            <div className="flex-1 h-px bg-primary-light/50" />
          </div>

          {/* Email/password form */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {mode === "signup" && (
              <Input
                label="Username"
                placeholder="Your name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            )}
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="Min 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />

            {error && (
              <p className="text-sm text-error bg-error/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" fullWidth loading={submitting}>
              {mode === "signup" ? "Sign Up" : "Log In"}
            </Button>
          </form>

          <p className="text-sm text-center text-neutral-dark/60 mt-5">
            {mode === "signup" ? (
              <>
                Already have an account?{" "}
                <button
                  className="text-primary font-medium hover:underline cursor-pointer"
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                >
                  Log in
                </button>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <button
                  className="text-primary font-medium hover:underline cursor-pointer"
                  onClick={() => {
                    setMode("signup");
                    setError("");
                  }}
                >
                  Sign up
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
