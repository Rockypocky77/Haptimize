"use client";

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

export default function ConsistencyChart({ data }: ConsistencyChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-neutral-dark/40">
        Complete habits to see your consistency graph
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7FAF8F" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#7FAF8F" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#A7C6B030" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#2E3A3F80" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#2E3A3F80" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #A7C6B040",
            borderRadius: 12,
            fontSize: 13,
          }}
          formatter={(value) => [`${value}%`, "Completion"]}
        />
        <Area
          type="monotone"
          dataKey="pct"
          stroke="#7FAF8F"
          strokeWidth={2}
          fill="url(#areaGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
