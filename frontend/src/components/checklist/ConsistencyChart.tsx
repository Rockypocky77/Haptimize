"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface DayData {
  date: string;
  pct: number;
}

interface ConsistencyChartProps {
  data: DayData[];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDateLabel(dateStr: string): string {
  const parts = dateStr.split("-").map(Number);
  const y = parts.length >= 3 ? parts[0] : new Date().getFullYear();
  const m = parts.length >= 3 ? parts[1] : parts[0];
  const d = parts.length >= 3 ? parts[2] : parts[1];
  const date = new Date(y, m - 1, d);
  const dayName = WEEKDAYS[date.getDay()];
  return `${dayName} ${m}/${d}`;
}

const tickStyle = {
  fontSize: 11,
  fill: "var(--theme-foreground)",
  opacity: 0.7,
};

export default function ConsistencyChart({ data }: ConsistencyChartProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (data.length > 0) {
      const id = requestAnimationFrame(() => setShow(true));
      return () => cancelAnimationFrame(id);
    }
  }, [data.length]);

  const chartData = useMemo(
    () => data.map((d) => ({ ...d, label: formatDateLabel(d.date) })),
    [data]
  );

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-neutral-dark/40">
        Complete habits to see your consistency graph
      </div>
    );
  }

  return (
    <div
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 600ms cubic-bezier(0.25, 0.1, 0.25, 1), transform 600ms cubic-bezier(0.25, 0.1, 0.25, 1)",
      }}
    >
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart
          data={chartData}
          margin={{
            top: 5,
            right: 10,
            left: -20,
            bottom: chartData.length > 12 ? 30 : 0,
          }}
        >
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7FAF8F" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#7FAF8F" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-foreground)" strokeOpacity={0.15} />
          <XAxis
            dataKey="label"
            tick={{ ...tickStyle, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval={chartData.length > 8 ? Math.max(0, Math.floor(chartData.length / 7)) : 0}
            angle={0}
          />
          <YAxis
            domain={[0, 100]}
            tick={tickStyle}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--theme-surface)",
              color: "var(--theme-foreground)",
              border: "1px solid var(--theme-muted)",
              borderRadius: 12,
              fontSize: 13,
            }}
            formatter={(value) => [`${value}%`, "Completion"]}
            labelFormatter={(label) => label}
          />
          <Area
            type="monotone"
            dataKey="pct"
            stroke="#7FAF8F"
            strokeWidth={2}
            fill="url(#areaGrad)"
            dot={{ r: 3, fill: "#7FAF8F", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#7FAF8F", stroke: "#fff", strokeWidth: 2 }}
            isAnimationActive={show}
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
