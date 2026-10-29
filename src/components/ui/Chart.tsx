"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes, useId } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

export interface ChartProps extends HTMLAttributes<HTMLDivElement> {
  data: any[];
  appearance?: "default" | "admin" | "student";
  type?: "line" | "area" | "bar" | "pie";
  xKey?: string;
  yKey?: string;
  color?: string;
  series?: { key: string; label: string; color: string }[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--surface-secondary))",
  "hsl(var(--border))",
];

export function Chart({
  data,
  appearance = "default",
  type = "line",
  xKey = "name",
  yKey = "value",
  color = "hsl(var(--primary))",
  series,
  className,
  ...props
}: ChartProps) {
  const admin = appearance !== "default";
  const gradientId = useId();
  const palette = admin
    ? [
        "#facc15",
        "#60a5fa",
        "#34d399",
        "#a78bfa",
        "#fb923c",
        "#f87171",
        "#64748b",
      ]
    : COLORS;
  const renderChart = () => {
    switch (type) {
      case "area":
        return (
          <AreaChart data={data}>
            {admin && (
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.01} />
                </linearGradient>
              </defs>
            )}
            <CartesianGrid
              vertical={!admin}
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
            />
            <XAxis
              axisLine={!admin}
              tickLine={!admin}
              minTickGap={24}
              tick={{ fontSize: admin ? 10 : 12 }}
              dataKey={xKey}
              stroke="hsl(var(--text-secondary))"
            />
            <YAxis
              axisLine={!admin}
              tickLine={!admin}
              tick={{ fontSize: admin ? 10 : 12 }}
              width={admin ? 48 : 60}
              stroke="hsl(var(--text-secondary))"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--surface))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              itemStyle={{ color: "hsl(var(--text))" }}
            />
            <Area
              type="monotone"
              dataKey={yKey}
              stroke={color}
              fill={admin ? `url(#${gradientId})` : color}
              strokeWidth={admin ? 2.5 : 1}
              fillOpacity={admin ? 1 : 0.3}
            />
          </AreaChart>
        );

      case "bar":
        return (
          <BarChart data={data}>
            <CartesianGrid
              vertical={!admin}
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
            />
            <XAxis
              axisLine={!admin}
              tickLine={!admin}
              minTickGap={24}
              tick={{ fontSize: admin ? 10 : 12 }}
              dataKey={xKey}
              stroke="hsl(var(--text-secondary))"
            />
            <YAxis
              axisLine={!admin}
              tickLine={!admin}
              tick={{ fontSize: admin ? 10 : 12 }}
              width={admin ? 48 : 60}
              stroke="hsl(var(--text-secondary))"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--surface))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              itemStyle={{ color: "hsl(var(--text))" }}
            />
            {series?.length ? (
              <>
                <Legend
                  iconType={admin ? "circle" : undefined}
                  iconSize={admin ? 7 : 14}
                />
                {series.map((item) => (
                  <Bar
                    key={item.key}
                    dataKey={item.key}
                    name={item.label}
                    fill={item.color}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </>
            ) : (
              <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
            )}
          </BarChart>
        );

      case "pie":
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={yKey}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={admin ? 58 : 0}
              paddingAngle={admin ? 3 : 0}
              stroke={admin ? "none" : undefined}
              label={!admin}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={palette[index % palette.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--surface))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              itemStyle={{ color: "hsl(var(--text))" }}
            />
            <Legend
              iconType={admin ? "circle" : undefined}
              iconSize={admin ? 7 : 14}
            />
          </PieChart>
        );

      default:
        return (
          <LineChart data={data}>
            <CartesianGrid
              vertical={!admin}
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
            />
            <XAxis
              axisLine={!admin}
              tickLine={!admin}
              minTickGap={24}
              tick={{ fontSize: admin ? 10 : 12 }}
              dataKey={xKey}
              stroke="hsl(var(--text-secondary))"
            />
            <YAxis
              axisLine={!admin}
              tickLine={!admin}
              tick={{ fontSize: admin ? 10 : 12 }}
              width={admin ? 48 : 60}
              stroke="hsl(var(--text-secondary))"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--surface))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              itemStyle={{ color: "hsl(var(--text))" }}
            />
            <Line
              type="monotone"
              dataKey={yKey}
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color }}
            />
          </LineChart>
        );
    }
  };

  return (
    <div className={cn("w-full h-64", className)} {...props}>
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}
