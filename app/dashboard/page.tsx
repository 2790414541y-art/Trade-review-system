"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, BarChart3, Brain, LineChart as LineChartIcon, Percent, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTrades } from "@/lib/api";
import type { Trade as BaseTrade } from "@/lib/types";

type AnalysisResult = {
  mistakes?: string[];
  behavior_analysis?: {
    emotional_trade?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type DashboardTrade = BaseTrade & {
  ai_analysis_result?: AnalysisResult | null;
  mt5_image_path?: string | null;
  atas_image_path?: string | null;
};

type Metric = {
  label: string;
  value: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

const WIN_LOSS_COLORS: Record<string, string> = {
  win: "#047857",
  loss: "#dc2626",
  breakeven: "#d97706",
};

function isWin(trade: DashboardTrade) {
  return trade.result === "win";
}

function isLoss(trade: DashboardTrade) {
  return trade.result === "loss";
}

function tradePnl(trade: DashboardTrade) {
  return Number(trade.pnl || 0);
}

function tradeMistakes(trade: DashboardTrade) {
  const fromStoredAnalysis = trade.ai_analysis_result?.mistakes || [];
  const fromLatestAnalysis = trade.analyses?.[0]?.mistakes || [];
  return [...fromStoredAnalysis, ...fromLatestAnalysis].filter(Boolean);
}

function isEmotionalTrade(trade: DashboardTrade) {
  const storedBehavior = trade.ai_analysis_result?.behavior_analysis;
  const latestBehavior = trade.analyses?.[0]?.behavior_analysis as AnalysisResult["behavior_analysis"] | undefined;
  if (storedBehavior?.emotional_trade === true || latestBehavior?.emotional_trade === true) {
    return true;
  }

  const emotion = (trade.emotion_before_trade || "").trim().toLowerCase();
  return Boolean(emotion && !["calm", "neutral"].includes(emotion));
}

function maxDrawdownFromCurve(curve: { equity: number }[]) {
  let peak = 0;
  let maxDrawdown = 0;

  for (const point of curve) {
    peak = Math.max(peak, point.equity);
    maxDrawdown = Math.min(maxDrawdown, point.equity - peak);
  }

  return Math.abs(maxDrawdown);
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-lg border border-dashed bg-muted/30 p-6 text-center">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function ChartEmpty() {
  return <EmptyState title="No chart data" description="Add trades to populate this chart." />;
}

export default function DashboardPage() {
  const [trades, setTrades] = useState<DashboardTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTrades() {
      setLoading(true);
      setError("");
      try {
        const data = await getTrades();
        setTrades(data as DashboardTrade[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load trades");
      } finally {
        setLoading(false);
      }
    }

    loadTrades();
  }, []);

  const dashboard = useMemo(() => {
    const sortedTrades = [...trades].sort((a, b) => {
      const aTime = new Date(a.trade_time || a.created_at).getTime();
      const bTime = new Date(b.trade_time || b.created_at).getTime();
      return aTime - bTime;
    });

    const totalTrades = sortedTrades.length;
    const wins = sortedTrades.filter(isWin).length;
    const losses = sortedTrades.filter(isLoss).length;
    const breakevens = sortedTrades.filter((trade) => trade.result === "breakeven").length;
    const winRate = totalTrades ? (wins / totalTrades) * 100 : 0;

    const rrValues = sortedTrades
      .map((trade) => trade.risk_reward_ratio)
      .filter((value): value is number => typeof value === "number");
    const averageRiskReward = rrValues.length ? rrValues.reduce((sum, value) => sum + value, 0) / rrValues.length : 0;

    let runningEquity = 0;
    const pnlCurve = sortedTrades.map((trade, index) => {
      runningEquity += tradePnl(trade);
      return {
        trade: index + 1,
        id: trade.id,
        pnl: tradePnl(trade),
        equity: Number(runningEquity.toFixed(2)),
      };
    });

    const totalPnl = sortedTrades.reduce((sum, trade) => sum + tradePnl(trade), 0);
    const maxDrawdown = maxDrawdownFromCurve(pnlCurve);

    const mistakeMap = new Map<string, number>();
    sortedTrades.forEach((trade) => {
      tradeMistakes(trade).forEach((mistake) => {
        mistakeMap.set(mistake, (mistakeMap.get(mistake) || 0) + 1);
      });
    });
    const mistakeFrequency = Array.from(mistakeMap.entries())
      .map(([mistake, count]) => ({ mistake, count }))
      .sort((a, b) => b.count - a.count);

    const emotionalTrades = sortedTrades.filter(isEmotionalTrade).length;
    const emotionalTradeRatio = totalTrades ? (emotionalTrades / totalTrades) * 100 : 0;

    const sessionMap = new Map<string, { session: string; total: number; wins: number; losses: number; pnl: number }>();
    sortedTrades.forEach((trade) => {
      const session = trade.session || "Unknown";
      const current = sessionMap.get(session) || { session, total: 0, wins: 0, losses: 0, pnl: 0 };
      current.total += 1;
      current.wins += isWin(trade) ? 1 : 0;
      current.losses += isLoss(trade) ? 1 : 0;
      current.pnl += tradePnl(trade);
      sessionMap.set(session, current);
    });
    const sessionAnalysis = Array.from(sessionMap.values()).map((session) => ({
      ...session,
      winRate: session.total ? Number(((session.wins / session.total) * 100).toFixed(2)) : 0,
      pnl: Number(session.pnl.toFixed(2)),
    }));

    const winLossData = [
      { name: "win", value: wins },
      { name: "loss", value: losses },
      { name: "breakeven", value: breakevens },
    ].filter((item) => item.value > 0);

    return {
      totalTrades,
      winRate,
      averageRiskReward,
      totalPnl,
      maxDrawdown,
      mistakeFrequency,
      emotionalTradeRatio,
      sessionAnalysis,
      pnlCurve,
      winLossData,
    };
  }, [trades]);

  const metrics: Metric[] = [
    {
      label: "Total trades",
      value: dashboard.totalTrades.toString(),
      description: "All saved historical trades",
      icon: BarChart3,
    },
    {
      label: "Win rate",
      value: `${dashboard.winRate.toFixed(2)}%`,
      description: "Winning trades divided by total trades",
      icon: Percent,
    },
    {
      label: "Average R:R",
      value: dashboard.averageRiskReward.toFixed(2),
      description: "Average risk reward ratio",
      icon: LineChartIcon,
    },
    {
      label: "Total PnL",
      value: dashboard.totalPnl.toFixed(2),
      description: "Sum of all recorded PnL",
      icon: Wallet,
    },
    {
      label: "Max drawdown",
      value: dashboard.maxDrawdown.toFixed(2),
      description: "Largest equity pullback",
      icon: AlertTriangle,
    },
    {
      label: "Emotional ratio",
      value: `${dashboard.emotionalTradeRatio.toFixed(2)}%`,
      description: "Trades marked or inferred as emotional",
      icon: Brain,
    },
  ];

  if (loading) {
    return <EmptyState title="Loading dashboard" description="Fetching trade history from GET /trades." />;
  }

  if (error) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Dashboard unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/upload">Add a trade</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Trade Review Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Performance, mistakes, emotional patterns, and session behavior from GET /trades.
          </p>
        </div>
        <Button asChild>
          <Link href="/upload">Add trade</Link>
        </Button>
      </div>

      {dashboard.totalTrades === 0 ? (
        <EmptyState title="No trades yet" description="Upload a trade screenshot and manual trade data to start the review log." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <Card key={metric.label}>
                  <CardContent className="flex items-center justify-between p-5">
                    <div>
                      <p className="text-sm text-muted-foreground">{metric.label}</p>
                      <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{metric.description}</p>
                    </div>
                    <Icon className="h-5 w-5 text-primary" />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>PnL curve</CardTitle>
                <CardDescription>Cumulative equity by trade sequence.</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboard.pnlCurve.length ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dashboard.pnlCurve}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="trade" tickLine={false} />
                        <YAxis tickLine={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="equity" stroke="#047857" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <ChartEmpty />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Win/loss chart</CardTitle>
                <CardDescription>Distribution of trade outcomes.</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboard.winLossData.length ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={dashboard.winLossData} dataKey="value" nameKey="name" outerRadius={92} label>
                          {dashboard.winLossData.map((entry) => (
                            <Cell key={entry.name} fill={WIN_LOSS_COLORS[entry.name] || "#64748b"} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <ChartEmpty />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mistake frequency chart</CardTitle>
                <CardDescription>Most common mistakes from AI analysis results.</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboard.mistakeFrequency.length ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboard.mistakeFrequency.slice(0, 8)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mistake" tickLine={false} interval={0} angle={-20} textAnchor="end" height={80} />
                        <YAxis allowDecimals={false} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#d97706" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <ChartEmpty />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Session analysis</CardTitle>
                <CardDescription>Win rate and PnL by trading session.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboard.sessionAnalysis.length ? (
                  dashboard.sessionAnalysis.map((session) => (
                    <div key={session.session} className="rounded-md border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{session.session}</p>
                          <p className="text-xs text-muted-foreground">
                            {session.total} trades - {session.wins} wins - {session.losses} losses
                          </p>
                        </div>
                        <Badge>{session.winRate}%</Badge>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">PnL</span>
                        <span className={session.pnl >= 0 ? "text-primary" : "text-destructive"}>{session.pnl.toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <ChartEmpty />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Mistake frequency</CardTitle>
              <CardDescription>Full mistake list ranked by frequency.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {dashboard.mistakeFrequency.length ? (
                dashboard.mistakeFrequency.map((item) => (
                  <div key={item.mistake} className="flex items-center justify-between gap-3 rounded-md border p-3">
                    <span className="truncate text-sm">{item.mistake}</span>
                    <Badge>{item.count}</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No mistake data yet.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
