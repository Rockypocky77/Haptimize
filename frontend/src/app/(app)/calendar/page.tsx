"use client";

import Card from "@/components/ui/Card";
import CalendarGrid from "@/components/calendar/CalendarGrid";

export default function CalendarPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-neutral-dark">Calendar</h1>
      <Card>
        <CalendarGrid />
      </Card>
    </div>
  );
}
