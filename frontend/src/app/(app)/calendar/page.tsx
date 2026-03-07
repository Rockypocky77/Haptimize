"use client";

import Card from "@/components/ui/Card";
import CalendarGrid from "@/components/calendar/CalendarGrid";
import FadeIn from "@/components/ui/FadeIn";

export default function CalendarPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <FadeIn delay={0}>
        <h1 className="text-2xl font-bold text-neutral-dark">Calendar</h1>
      </FadeIn>
      <FadeIn delay={0.15}>
      <Card>
        <CalendarGrid />
      </Card>
      </FadeIn>
    </div>
  );
}
