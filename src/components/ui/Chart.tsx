"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";
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
  type?: "line" | "area" | "bar" | "pie";
  xKey?: string;
  yKey?: string;
  color?: string;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--surface-secondary))", "hsl(var(--border))"];

export function Chart({
  data,
  type = "line",
  xKey = "name",
  yKey = "value",
  color = "hsl(var(--primary))",
  className,
  ...props
}: ChartProps) {
  const renderChart = () => {
    switch (type) {
      case "area":
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey={xKey} stroke="hsl(var(--text-secondary))" />
            <YAxis stroke="hsl(var(--text-secondary))" />
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
              fill={color}
              fillOpacity={0.3}
            />
          </AreaChart>
        );

      case "bar":
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey={xKey} stroke="hsl(var(--text-secondary))" />
            <YAxis stroke="hsl(var(--text-secondary))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--surface))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              itemStyle={{ color: "hsl(var(--text))" }}
            />
            <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
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
              label
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
            <Legend />
          </PieChart>
        );

      default:
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey={xKey} stroke="hsl(var(--text-secondary))" />
            <YAxis stroke="hsl(var(--text-secondary))" />
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
