"use client";

import { theme } from "antd";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OccupancyReport } from "@/lib/api";
import { formatDate, plural } from "@/lib/format";
import { formatOccupancyRate } from "../lib/dashboardFormat";

export type OccupancyDailyPoint = OccupancyReport["daily"][number];

export interface OccupancyChartProps {
  daily: readonly OccupancyDailyPoint[];
}

interface OccupancyChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{
    payload?: OccupancyDailyPoint;
  }>;
}

function OccupancyChartTooltip({ active, payload }: OccupancyChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0]?.payload;
  if (!point) {
    return null;
  }

  return (
    <div className="rounded-md border border-line bg-neutral-0 px-3 py-2.5 shadow-e1">
      <div className="font-sans text-[12px] font-medium leading-[18px] text-muted">
        {formatDate(point.date)}
      </div>
      <div className="mt-1 font-sans text-[14px] font-semibold leading-[20px] tabular text-ink">
        {formatOccupancyRate(point.rate)}
      </div>
      <div className="font-sans text-[12px] leading-[18px] text-muted">
        {plural(point.occupiedRooms, "occupied room")}
      </div>
    </div>
  );
}

export function OccupancyChart({ daily }: OccupancyChartProps) {
  const { token } = theme.useToken();
  const chartData = [...daily];

  return (
    <div className="h-[280px] w-full" data-testid="occupancy-chart">
      <ResponsiveContainer
        width="100%"
        height={280}
        initialDimension={{ width: 520, height: 280 }}
      >
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            stroke={token.colorBorderSecondary}
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => formatDate(value, { includeYear: false })}
            tick={{ fill: token.colorTextSecondary, fontSize: 12 }}
            axisLine={{ stroke: token.colorBorderSecondary }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(value: number) => `${value}%`}
            tick={{ fill: token.colorTextSecondary, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            cursor={{ stroke: token.colorBorderSecondary, strokeDasharray: "3 3" }}
            content={<OccupancyChartTooltip />}
          />
          <Line
            type="monotone"
            dataKey="rate"
            name="Occupancy rate"
            stroke={token.colorPrimary}
            strokeWidth={2}
            dot={{ r: chartData.length === 1 ? 4 : 2.5, fill: token.colorPrimary, strokeWidth: 0 }}
            activeDot={{ r: 4, fill: token.colorPrimary, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
