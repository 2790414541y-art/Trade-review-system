"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Filter, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTrades, imageUrl } from "@/lib/api";
import type { Trade as BaseTrade } from "@/lib/types";

type AnalysisResult = {
  strategy_score?: number;
  mistakes?: string[];
  [key: string]: unknown;
};

type Trade = BaseTrade & {
  mt5_image_path?: string | null;
  atas_image_path?: string | null;
  ai_analysis_result?: AnalysisResult | null;
};

type Filters = {
  date: string;
  result: string;
  session: string;
  mistakeType: string;
};

const initialFilters: Filters = {
  date: "",
  result: "",
  session: "",
  mistakeType: "",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function getTradeImage(trade: Trade, type: "mt5" | "atas") {
  if (type === "mt5") {
    return trade.mt5_image_path || trade.image_path || "";
  }
  return trade.atas_image_path || "";
}

function getStrategyScore(trade: Trade) {
  const storedScore = trade.ai_analysis_result?.strategy_score;
  const latestScore = trade.analyses?.[0]?.strategy_score;
  if (typeof storedScore === "number") return storedScore;
  if (typeof latestScore === "number") return latestScore;
  return null;
}

function getMistakes(trade: Trade) {
  const storedMistakes = trade.ai_analysis_result?.mistakes || [];
  const latestMistakes = trade.analyses?.[0]?.mistakes || [];
  return [...storedMistakes, ...latestMistakes].filter(Boolean);
}

function matchesDate(trade: Trade, date: string) {
  if (!date) return true;
  const sourceDate = trade.trade_time || trade.created_at;
  if (!sourceDate) return false;
  return new Date(sourceDate).toISOString().slice(0, 10) === date;
}

function EmptyState() {
  return (
    <div className="grid min-h-64 place-items-center rounded-lg border border-dashed bg-muted/30 p-6 text-center">
      <div>
        <p className="text-sm font-medium">No trades found</p>
        <p className="mt-1 text-sm text-muted-foreground">Add a trade or adjust the filters to see more results.</p>
        <Button asChild className="mt-4">
          <Link href="/upload">Add trade</Link>
        </Button>
      </div>
    </div>
  );
}

function ScreenshotThumb({ src, label }: { src: string; label: string }) {
  if (!src) {
    return (
      <div className="grid aspect-video min-h-28 place-items-center rounded-md border border-dashed bg-muted/40 text-xs text-muted-foreground">
        {label} missing
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border bg-muted">
      <img src={imageUrl(src)} alt={label} className="aspect-video w-full object-cover" />
    </div>
  );
}

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTrades() {
      setLoading(true);
      setError("");
      try {
        const data = await getTrades();
        setTrades(data as Trade[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load trades");
      } finally {
        setLoading(false);
      }
    }

    loadTrades();
  }, []);

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const mistakes = getMistakes(trade).join(" ").toLowerCase();
      return (
        matchesDate(trade, filters.date) &&
        (!filters.result || trade.result === filters.result) &&
        (!filters.session || trade.session === filters.session) &&
        (!filters.mistakeType || mistakes.includes(filters.mistakeType.toLowerCase()))
      );
    });
  }, [filters, trades]);

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <p className="text-sm text-muted-foreground">Loading trades from GET /trades...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Historical Trades</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review screenshots, AI findings, mistakes, notes, time, and session.</p>
        </div>
        <Button asChild>
          <Link href="/upload">Add trade</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <CardTitle>Filters</CardTitle>
          </div>
          <CardDescription>Filter by date, result, session, and mistake type.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={filters.date} onChange={(event) => updateFilter("date", event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Win/loss</Label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={filters.result}
              onChange={(event) => updateFilter("result", event.target.value)}
            >
              <option value="">All results</option>
              <option value="win">Win</option>
              <option value="loss">Loss</option>
              <option value="breakeven">Breakeven</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Session</Label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={filters.session}
              onChange={(event) => updateFilter("session", event.target.value)}
            >
              <option value="">All sessions</option>
              <option value="Asia">Asia</option>
              <option value="London">London</option>
              <option value="NewYork">NewYork</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Mistake type</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="FOMO, holding loss..."
                value={filters.mistakeType}
                onChange={(event) => updateFilter("mistakeType", event.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredTrades.length} of {trades.length} trades
        </p>
        <Button variant="outline" onClick={() => setFilters(initialFilters)}>
          Clear filters
        </Button>
      </div>

      {filteredTrades.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4">
          {filteredTrades.map((trade) => {
            const mt5Image = getTradeImage(trade, "mt5");
            const atasImage = getTradeImage(trade, "atas");
            const mistakes = getMistakes(trade);
            const strategyScore = getStrategyScore(trade);

            return (
              <Card key={trade.id}>
                <CardContent className="grid gap-5 p-5 lg:grid-cols-[260px_minmax(0,1fr)_180px]">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <ScreenshotThumb src={mt5Image} label="MT5 screenshot" />
                    {atasImage && <ScreenshotThumb src={atasImage} label="ATAS screenshot" />}
                  </div>

                  <div className="min-w-0 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{trade.symbol}</Badge>
                      <Badge className={trade.direction === "long" ? "border-primary/40 text-primary" : "border-accent/50 text-amber-700"}>
                        {trade.direction}
                      </Badge>
                      <Badge>{trade.result || "unknown"}</Badge>
                      {trade.session && <Badge>{trade.session}</Badge>}
                    </div>

                    <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <Info label="PnL" value={trade.pnl ?? "-"} />
                      <Info label="Strategy score" value={strategyScore ?? "Not analyzed"} />
                      <Info label="Trade time" value={formatDate(trade.trade_time)} />
                      <Info label="Session" value={trade.session || "-"} />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Mistakes</p>
                      {mistakes.length ? (
                        <div className="flex flex-wrap gap-2">
                          {mistakes.map((mistake) => (
                            <Badge key={mistake} className="max-w-full truncate border-destructive/30 text-destructive">
                              {mistake}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No mistakes recorded.</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase text-muted-foreground">Notes</p>
                      <p className="line-clamp-3 text-sm">{trade.notes || "No notes."}</p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-4">
                    <div className="rounded-md border bg-muted/30 p-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarDays className="h-4 w-4" />
                        Created
                      </div>
                      <p className="mt-2 text-sm">{formatDate(trade.created_at)}</p>
                    </div>
                    <Button asChild className="w-full">
                      <Link href={`/trade/${trade.id}`}>View details</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}
