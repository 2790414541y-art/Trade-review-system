"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Stats } from "@/lib/types";

function EmptyState() {
  return <div className="grid h-64 place-items-center text-sm text-muted-foreground">暂无数据</div>;
}

export function PnlCurve({ data }: { data: Stats["pnl_curve"] }) {
  if (!data.length) return <EmptyState />;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="id" tickLine={false} />
          <YAxis tickLine={false} />
          <Tooltip />
          <Line type="monotone" dataKey="equity" stroke="#047857" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SessionWinRate({ data }: { data: Stats["session_win_rate"] }) {
  if (!data.length) return <EmptyState />;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="session" tickLine={false} />
          <YAxis tickLine={false} />
          <Tooltip />
          <Bar dataKey="win_rate" fill="#0f766e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DirectionWinRate({ data }: { data: Stats["direction_win_rate"] }) {
  if (!data.length) return <EmptyState />;
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="direction" tickLine={false} />
          <YAxis tickLine={false} />
          <Tooltip />
          <Bar dataKey="win_rate" fill="#d97706" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ErrorHeatmap({ data }: { data: Stats["error_heatmap"] }) {
  if (!data.length) return <EmptyState />;
  return (
    <div className="grid gap-2">
      {data.map((item) => (
        <div key={`${item.session}-${item.mistake}`} className="grid grid-cols-[100px_1fr_52px] items-center gap-3 text-sm">
          <span className="text-muted-foreground">{item.session}</span>
          <div className="h-8 overflow-hidden rounded-md bg-muted">
            <div
              className="h-full bg-destructive/80"
              style={{ width: `${Math.min(100, item.count * 18)}%` }}
              title={item.mistake}
            />
          </div>
          <span className="text-right font-medium">{item.count}</span>
          <div className="col-span-3 truncate text-xs text-muted-foreground">{item.mistake}</div>
        </div>
      ))}
    </div>
  );
}
