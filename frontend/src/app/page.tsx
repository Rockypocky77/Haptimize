"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api/client";
import { ArrowRight } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const { user, loading, signInWithGoogle, enterDemoMode } = useAuth();
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [stage, setStage] = useState<"cta" | "morphing" | "auth">("cta");

  if (!loading && user) {
    router.replace("/home");
    return null;
  }

  function handleGetStarted() {
    setStage("morphing");
    setTimeout(() => setStage("auth"), 600);
  }

  function handleTryDemo() {
    enterDemoMode();
    router.push("/home");
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (authMode === "signup") {
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
    <div className="min-h-screen flex relative overflow-hidden bg-[#F0F5F2]">
      {/* Animated blurred blobs background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="blob-1 absolute top-[5%] left-[8%] w-[420px] h-[420px] rounded-full opacity-40 blur-[100px]"
          style={{ backgroundColor: "#7FAF8F" }} />
        <div className="blob-2 absolute top-[55%] left-[25%] w-[350px] h-[350px] rounded-full opacity-30 blur-[120px]"
          style={{ backgroundColor: "#A7C6B0" }} />
        <div className="blob-3 absolute top-[10%] right-[15%] w-[380px] h-[380px] rounded-full opacity-25 blur-[110px]"
          style={{ backgroundColor: "#8FC4A0" }} />
        <div className="blob-4 absolute bottom-[10%] left-[50%] w-[300px] h-[300px] rounded-full opacity-35 blur-[100px]"
          style={{ backgroundColor: "#6B9E7A" }} />
        <div className="blob-5 absolute bottom-[25%] right-[5%] w-[280px] h-[280px] rounded-full opacity-20 blur-[90px]"
          style={{ backgroundColor: "#BDD4C5" }} />
        <div className="blob-2 absolute top-[40%] left-[5%] w-[250px] h-[250px] rounded-full opacity-20 blur-[80px]"
          style={{ backgroundColor: "#98BFAA" }} />
        <div className="blob-4 absolute top-[70%] right-[30%] w-[320px] h-[320px] rounded-full opacity-15 blur-[100px]"
          style={{ backgroundColor: "#C5DDD0" }} />
      </div>

      {/* Left hero — 75% */}
      <div className="hidden lg:flex w-3/4 relative items-center justify-center p-12">
        <div className="max-w-3xl flex flex-col items-start text-left relative z-10 w-full -translate-y-14 translate-x-[130px]">
          {/* Spacer keeps text position fixed; logo is absolutely positioned just above text */}
          <div className="h-[121px] shrink-0" aria-hidden />
          <div className="absolute left-0 top-0 w-[340px] -translate-y-[120px] -translate-x-[40px]">
            <Image
              src="/HaptimizeTLogo.png"
              alt="Haptimize"
              width={340}
              height={85}
              className="w-[340px] h-auto"
              priority
            />
          </div>
          <h1 className="text-6xl font-bold text-neutral-dark leading-tight mt-[11px]">
            Win Today&hellip;
            <br />
            <span className="text-primary">Win Tomorrow&hellip;</span>
          </h1>
          <p className="text-xl text-neutral-dark/70 max-w-lg mt-3">
            Build habits that compound. Track your progress, set reminders, and
            let consistency turn small wins into massive results.
          </p>

          {/* CTA buttons — visible before morph */}
          {stage === "cta" && (
            <div className="flex gap-4 mt-8 items-center">
              <button
                onClick={handleGetStarted}
                className="group flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary text-white font-semibold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer transition-all duration-200"
              >
                Get Started
                <ArrowRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={handleTryDemo}
                className="px-8 py-4 rounded-2xl border-2 border-neutral-dark/15 text-neutral-dark/70 font-semibold text-lg hover:border-primary/40 hover:text-primary cursor-pointer transition-all duration-200"
              >
                Try Demo &rarr;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right auth panel — morphs in */}
      <div
        className={`
          fixed z-50 transition-all duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)]
          ${stage === "cta"
            ? "opacity-0 pointer-events-none scale-75 top-1/2 right-[30%] -translate-y-1/2 w-[200px]"
            : stage === "morphing"
            ? "opacity-100 scale-100 top-1/2 right-6 -translate-y-1/2 w-full max-w-sm lg:right-[calc((25%-380px)/2+24px)]"
            : "opacity-100 scale-100 top-1/2 right-6 -translate-y-1/2 w-full max-w-sm lg:right-[calc((25%-380px)/2+24px)]"
          }
        `}
      >
        <div
          className={`
            rounded-[32px] p-8 border border-white/70 bg-white/95 backdrop-blur-2xl overflow-hidden relative
            transition-all duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)]
            ${stage === "cta" ? "scale-50 opacity-0" : "scale-100 opacity-100"}
          `}
          style={{
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.8) inset, 0 30px 60px -15px rgba(127, 175, 143, 0.06), 0 10px 25px -10px rgba(46, 58, 63, 0.04)",
          }}
        >
          {/* Subtle top-edge glass highlight */}
          <div
            className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-t-[32px]"
            aria-hidden
          />

          {/* Auth card contents — staggered fade in */}
          <div className={`transition-all duration-500 ${stage === "auth" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
            style={{ transitionDelay: stage === "auth" ? "0ms" : "0ms" }}
          >
            {/* Logo inside box */}
            <div className="mb-6 flex flex-col items-center">
              <Image
                src="/HaptimizeTLogo.png"
                alt="Haptimize"
                width={180}
                height={45}
                priority
              />
              <p className="text-sm text-neutral-dark/50 mt-2">
                Win Today, Win Tomorrow.
              </p>
            </div>
          </div>

          <div className={`transition-all duration-500 ${stage === "auth" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
            style={{ transitionDelay: stage === "auth" ? "80ms" : "0ms" }}
          >
            <h2 className="text-xl font-semibold text-neutral-dark mb-6">
              {authMode === "signup" ? "Create your account" : "Welcome back"}
            </h2>
          </div>

          <div className={`transition-all duration-500 ${stage === "auth" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
            style={{ transitionDelay: stage === "auth" ? "160ms" : "0ms" }}
          >
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
          </div>

          <div className={`transition-all duration-500 ${stage === "auth" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
            style={{ transitionDelay: stage === "auth" ? "240ms" : "0ms" }}
          >
            {/* Email/password form */}
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {authMode === "signup" && (
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
                {authMode === "signup" ? "Sign Up" : "Log In"}
              </Button>
            </form>

            <p className="text-sm text-center text-neutral-dark/60 mt-5">
              {authMode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <button
                    className="text-primary font-medium hover:underline cursor-pointer"
                    onClick={() => {
                      setAuthMode("login");
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
                      setAuthMode("signup");
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

      {/* Mobile fallback — always show auth on small screens */}
      <div className="lg:hidden w-full flex flex-col items-center justify-center p-6 relative z-10">
        <div className="mb-6 text-center">
          <Image
            src="/HaptimizeTLogo.png"
            alt="Haptimize"
            width={180}
            height={45}
            className="mx-auto mb-2"
            priority
          />
          <p className="text-sm text-neutral-dark/60">
            Win Today, Win Tomorrow.
          </p>
        </div>
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleGetStarted}
            className="px-6 py-3 rounded-xl bg-primary text-white font-semibold cursor-pointer"
          >
            Get Started
          </button>
          <button
            onClick={handleTryDemo}
            className="px-6 py-3 rounded-xl border-2 border-neutral-dark/15 text-neutral-dark/70 font-semibold cursor-pointer"
          >
            Try Demo
          </button>
        </div>
      </div>
    </div>
  );
}
