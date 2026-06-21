"use client";

import { TrendingDown } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  CheckIn,
  formatWeeklyTrendSpeed,
} from "@/lib/steadycut";
import { cn } from "@/lib/utils";

const chartConfig = {
  weight: {
    label: "Weight",
    color: "var(--chart-1)",
  },
  trendWeight: {
    label: "7-day trend",
    color: "var(--primary)",
  },
  targetWeight: {
    label: "Target",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

export function WeightTrendCard({
  compact = false,
  delta,
  latest,
  latestTrendWeight,
  trendData,
  weeklySpeed,
  targetWeight,
}: {
  compact?: boolean;
  delta: number;
  latest: CheckIn | null;
  latestTrendWeight: number | null;
  trendData: Array<{
    date: string;
    label: string;
    weight: number;
    trendWeight: number;
  }>;
  weeklySpeed: number | null;
  targetWeight?: number;
}) {
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  const filteredData = useMemo(() => {
    if (range === "all") return trendData;
    if (trendData.length === 0) return trendData;

    const latestDateStr = trendData[trendData.length - 1].date;
    const latestDate = new Date(`${latestDateStr}T12:00:00`);
    const daysLimit = range === "7d" ? 7 : range === "30d" ? 30 : 90;

    return trendData.filter((point) => {
      const pointDate = new Date(`${point.date}T12:00:00`);
      const diffTime = latestDate.getTime() - pointDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays < daysLimit;
    });
  }, [trendData, range]);

  const yDomain = useMemo(() => {
    if (filteredData.length === 0) return ["auto", "auto"];
    const weights = filteredData.flatMap((d) => [d.weight, d.trendWeight]);
    let min = Math.min(...weights);
    let max = Math.max(...weights);
    if (targetWeight) {
      min = Math.min(min, targetWeight);
      max = Math.max(max, targetWeight);
    }
    return [Math.floor(min - 1.5), Math.ceil(max + 1.5)];
  }, [filteredData, targetWeight]);

  return (
    <Card size={compact ? "sm" : "default"} className="glass-card transition-all duration-300">
      <CardHeader className="flex-row items-start justify-between pb-2">
        <div>
          <CardTitle>Weight trend</CardTitle>
          <div className="mt-4 flex items-end gap-2">
            <span className="text-3xl font-semibold">
              {latestTrendWeight ? latestTrendWeight.toFixed(1) : "--"}
            </span>
            <span className="pb-1 text-sm font-medium text-muted-foreground">
              kg
            </span>
          </div>
          <p className="text-sm text-muted-foreground">7-day EWMA</p>
        </div>
        <div className="text-right flex flex-col items-end gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-1 border border-border/40 w-fit">
            {(["7d", "30d", "90d", "all"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200 uppercase text-center min-w-[38px]",
                  range === r
                    ? "bg-background text-foreground shadow-sm scale-105"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <div>
            <div className="flex items-center justify-end gap-2 font-medium text-primary">
              <TrendingDown />
              <span>{formatWeeklyTrendSpeed(weeklySpeed)}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {latest ? `${Math.abs(delta).toFixed(1)} kg raw move` : "No logs"}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer
          className={cn(
            "w-full",
            compact ? "h-[170px] min-h-[170px]" : "h-[230px] min-h-[230px]"
          )}
          config={chartConfig}
          initialDimension={{
            width: 300,
            height: compact ? 170 : 230,
          }}
        >
          <AreaChart data={filteredData} margin={{ left: 0, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="label"
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              axisLine={false}
              domain={yDomain}
              tickLine={false}
              tickFormatter={(value) => `${Math.round(Number(value))}`}
              tickMargin={10}
              width={44}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              dataKey="weight"
              fill="var(--color-weight)"
              fillOpacity={0.1}
              stroke="var(--color-weight)"
              strokeWidth={2}
              type="monotone"
            />
            <Area
              dataKey="trendWeight"
              fill="var(--color-trendWeight)"
              fillOpacity={0.16}
              stroke="var(--color-trendWeight)"
              strokeWidth={3}
              type="monotone"
            />
            {targetWeight && (
              <ReferenceLine
                y={targetWeight}
                stroke="var(--color-targetWeight)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Target: ${targetWeight} kg`,
                  position: "insideBottomRight",
                  fill: "var(--muted-foreground)",
                  fontSize: 10,
                  fontWeight: 600,
                  offset: 8,
                }}
              />
            )}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
