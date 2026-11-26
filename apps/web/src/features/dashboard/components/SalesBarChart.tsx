"use client";

import { theme } from "antd";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SalesReport } from "@/lib/api";
import { formatDate, formatPrice, plural } from "@/lib/format";

export type SalesDailyPoint = SalesReport["daily"][number];

export interface SalesBarChartProps {
  daily: readonly SalesDailyPoint[];
}

interface SalesChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{
    payload?: SalesDailyPoint;
  }>;
}

function SalesChartTooltip({ active, payload }: SalesChartTooltipProps) {
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
        {formatPrice(point.revenue)}
      </div>
      <div className="font-sans text-[12px] leading-[18px] text-muted">
        {plural(point.bookings, "booking")}
      </div>
    </div>
  );
}

export function SalesBarChart({ daily }: SalesBarChartProps) {
  const { token } = theme.useToken();
  const chartData = [...daily];

  return (
    <div className="h-[280px] w-full" data-testid="sales-bar-chart">
      <ResponsiveContainer
        width="100%"
        height={280}
        initialDimension={{ width: 520, height: 280 }}
      >
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={token.colorBorderSecondary} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => formatDate(value, { includeYear: false })}
            tick={{ fill: token.colorTextSecondary, fontSize: 12 }}
            axisLine={{ stroke: token.colorBorderSecondary }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(value: number) => formatPrice(value, { includeCurrency: false })}
            tick={{ fill: token.colorTextSecondary, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip
            cursor={{ fill: token.colorBgTextHover }}
            content={<SalesChartTooltip />}
          />
          <Bar
            dataKey="revenue"
            name="Revenue"
            fill={token.colorPrimary}
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
