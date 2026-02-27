"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import {
  TrendingUp,
  Flame,
  Home,
  CheckSquare,
  Bell,
  Calendar,
  Settings,
  Sparkles,
} from "lucide-react";

interface Slide {
  title: string;
  content: React.ReactNode;
}

function CompoundingGraphic() {
  const days = Array.from({ length: 12 }, (_, i) => i);
  const compound = days.map((d) => Math.pow(1.01, d * 30));
  const maxVal = compound[compound.length - 1];

  return (
    <div className="bg-neutral-light rounded-2xl p-6">
      <div className="flex items-end gap-2 h-48">
        {compound.map((val, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t-lg transition-all duration-500"
              style={{
                height: `${(val / maxVal) * 100}%`,
                backgroundColor:
                  i === compound.length - 1 ? "#F2C94C" : "#7FAF8F",
                opacity: 0.4 + (i / compound.length) * 0.6,
              }}
            />
            {i % 3 === 0 && (
              <span className="text-[10px] text-neutral-dark/40">
                {i > 0 ? `${i * 30}d` : "0"}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 text-center">
        <p className="text-3xl font-bold text-primary">37.8x</p>
        <p className="text-sm text-neutral-dark/60">
          1% better every day for a year
        </p>
      </div>
    </div>
  );
}

function MomentumGraphic() {
  return (
    <div className="bg-neutral-light rounded-2xl p-6 flex flex-col items-center gap-4">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <defs>
            <linearGradient id="momentum" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#7FAF8F" />
              <stop offset="100%" stopColor="#F2C94C" />
            </linearGradient>
          </defs>
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="#A7C6B0"
            strokeWidth="6"
            opacity="0.3"
          />
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke="url(#momentum)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="502"
            strokeDashoffset="126"
            className="origin-center -rotate-90"
          />
          <text
            x="100"
            y="95"
            textAnchor="middle"
            className="text-4xl font-bold"
            fill="#2E3A3F"
          >
            75%
          </text>
          <text
            x="100"
            y="118"
            textAnchor="middle"
            className="text-sm"
            fill="#2E3A3F"
            opacity="0.6"
          >
            momentum
          </text>
        </svg>
      </div>
      <p className="text-sm text-neutral-dark/60 text-center max-w-xs">
        A little momentum and determination is all it takes to stay on track
        for a long time. Keep showing up.
      </p>
    </div>
  );
}

function PageTutorial({
  icon: Icon,
  title,
  features,
}: {
  icon: React.ElementType;
  title: string;
  features: string[];
}) {
  return (
    <div className="bg-neutral-light rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <Icon size={22} className="text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-dark">{title}</h3>
      </div>
      <ul className="space-y-2">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-neutral-dark/70">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

const slides: Slide[] = [
  {
    title: "Small wins compound",
    content: <CompoundingGraphic />,
  },
  {
    title: "Momentum matters",
    content: <MomentumGraphic />,
  },
  {
    title: "Your Home dashboard",
    content: (
      <PageTutorial
        icon={Home}
        title="Home"
        features={[
          "See your daily completion percentage at a glance",
          "Track your goal streak — consecutive days hitting your target",
          "View your oldest reminders and pending habits",
        ]}
      />
    ),
  },
  {
    title: "Track your habits",
    content: (
      <PageTutorial
        icon={CheckSquare}
        title="Checklist"
        features={[
          "Add daily habits you want to build",
          "Pick from recommended habits to get started fast",
          "Check off habits as you complete them throughout the day",
          "See a consistency graph of your daily completion over time",
        ]}
      />
    ),
  },
  {
    title: "Never forget",
    content: (
      <PageTutorial
        icon={Bell}
        title="Reminders"
        features={[
          "Add casual reminders or date-specific ones",
          "Check off reminders as you complete them",
          "Undo accidental check-offs instantly",
          "Drag and drop dated reminders between days to reschedule",
        ]}
      />
    ),
  },
  {
    title: "See the big picture",
    content: (
      <PageTutorial
        icon={Calendar}
        title="Calendar"
        features={[
          "View all your reminders on a visual calendar",
          "Each date shows a fill bar for your daily progress",
          "Hover over any date to see details and edit reminders inline",
        ]}
      />
    ),
  },
  {
    title: "Your AI assistant",
    content: (
      <PageTutorial
        icon={Sparkles}
        title="Hapti AI"
        features={[
          'Add reminders by just telling AI — "Remind me to clean my room on March 3rd"',
          "Ask for help planning your schedule",
          "Get motivational and grounded advice",
        ]}
      />
    ),
  },
  {
    title: "Make it yours",
    content: (
      <PageTutorial
        icon={Settings}
        title="Settings"
        features={[
          "Update your username and password",
          "Enable or disable AI and notifications",
          "Wipe your data or delete your account anytime",
        ]}
      />
    ),
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, loading, completeOnboarding } = useAuth();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
      return;
    }
    if (profile?.onboardingComplete) {
      router.replace("/home");
    }
  }, [user, profile, loading, router]);

  const slide = slides[current];
  const isLast = current === slides.length - 1;

  async function handleNext() {
    if (isLast) {
      await completeOnboarding();
      router.replace("/home");
    } else {
      setCurrent((c) => c + 1);
    }
  }

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-neutral-light flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-lg border border-primary-light/30 max-w-lg w-full p-8">
        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <Image
            src="/HaptimizeTLogo.png"
            alt="Haptimize"
            width={140}
            height={35}
            priority
          />
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current
                  ? "w-6 bg-primary"
                  : i < current
                  ? "w-1.5 bg-primary/40"
                  : "w-1.5 bg-primary-light/50"
              }`}
            />
          ))}
        </div>

        <h2 className="text-xl font-semibold text-neutral-dark text-center mb-5">
          {slide.title}
        </h2>

        <div className="mb-6">{slide.content}</div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="text-sm text-neutral-dark/50 hover:text-neutral-dark disabled:opacity-0 cursor-pointer"
          >
            Back
          </button>
          <span className="text-xs text-neutral-dark/40">
            {current + 1} / {slides.length}
          </span>
          <Button onClick={handleNext} size="sm">
            {isLast ? "Get Started" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
