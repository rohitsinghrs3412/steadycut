"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatDisplayDate } from "@/lib/steadycut";

const chartConfig = {
  weight: {
    label: "Weight",
    color: "var(--chart-1)",
  },
  trendWeight: {
    label: "7-day trend",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

type ProgressChartProps = {
  trendData: Array<{
    date: string;
    label: string;
    weight: number;
    trendWeight: number;
  }>;
};

export function ProgressChart({ trendData }: ProgressChartProps) {
  return (
    <ChartContainer
      className="w-full h-[240px] sm:h-[300px] min-h-[240px]"
      config={chartConfig}
      initialDimension={{ height: 240, width: 400 }}
    >
      <AreaChart data={trendData} margin={{ left: -10, right: 12, top: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="progressColorWeight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="progressColorTrend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/20" />
        <XAxis
          axisLine={false}
          dataKey="label"
          tickLine={false}
          tickMargin={8}
          fontSize={10}
          className="fill-muted-foreground"
        />
        <YAxis
          axisLine={false}
          domain={["dataMin - 1.5", "dataMax + 1.5"]}
          tickLine={false}
          tickMargin={8}
          fontSize={10}
          width={30}
          className="fill-muted-foreground"
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              indicator="dot"
              labelFormatter={(value, payload) => {
                const item = payload[0]?.payload as { date: string } | undefined;
                return item ? formatDisplayDate(item.date) : value;
              }}
            />
          }
          cursor={false}
        />
        <Area
          dataKey="weight"
          fill="url(#progressColorWeight)"
          name="Weight"
          stroke="var(--chart-1)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
          type="monotone"
        />
        <Area
          dataKey="trendWeight"
          fill="url(#progressColorTrend)"
          name="7-day trend"
          stroke="var(--primary)"
          strokeWidth={2.5}
          type="monotone"
        />
      </AreaChart>
    </ChartContainer>
  );
}
