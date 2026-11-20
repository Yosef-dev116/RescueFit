"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Day = { day: number; baseline_waste_kg: number; rescuefit_waste_kg: number };

/*
 * Daily food expired at the receiving kitchens, for both runs of Fahd's
 * simulation. recharts needs the browser, so this file is a client
 * component and the page passes it plain numbers.
 */
export function DailyWasteChart({ daily }: { daily: Day[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={daily} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="var(--color-stock-shade)" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }}
            label={{ value: "Day", position: "insideBottomRight", offset: -4, fontSize: 11 }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-ink-soft)" }}
            unit=" kg"
            width={56}
          />
          <Tooltip
            formatter={(v) => `${Math.round(Number(v))} kg`}
            labelFormatter={(d) => `Day ${d}`}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="baseline_waste_kg"
            name="Today's network"
            stroke="var(--color-stamp)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="rescuefit_waste_kg"
            name="With RescueFit"
            stroke="var(--color-filed)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
