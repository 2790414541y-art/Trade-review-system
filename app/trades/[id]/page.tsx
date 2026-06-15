import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTrade, imageUrl } from "@/lib/api";
import type { Trade as BaseTrade } from "@/lib/types";

type Analysis = {
  technical_analysis?: Record<string, unknown>;
  macro_analysis?: Record<string, unknown>;
  behavior_analysis?: Record<string, unknown>;
  strategy_score?: number;
  mistakes?: string[];
  strengths?: string[];
  suggestions?: string[];
  risk_grade?: string;
};

type Trade = BaseTrade & {
  mt5_image_path?: string | null;
  atas_image_path?: string | null;
  ai_analysis_result?: Analysis | null;
};

type PageProps = {
  params: Promise<{ id: string }>;
};

function latestAnalysis(trade: Trade): Analysis | null {
  return trade.ai_analysis_result || trade.analyses?.[0] || null;
}

function JsonBlock({ value }: { value?: Record<string, unknown> }) {
  const entries = Object.entries(value || {});
  if (!entries.length) return <p className="text-sm text-muted-foreground">No data.</p>;
  return (
    <div className="space-y-2">
      {entries.map(([key, item]) => (
        <div key={key} className="rounded-md border bg-muted/30 p-3">
          <div className="text-xs font-medium uppercase text-muted-foreground">{key}</div>
          <div className="mt-1 text-sm">{typeof item === "object" ? JSON.stringify(item) : String(item)}</div>
        </div>
      ))}
    </div>
  );
}

function ListBlock({ items }: { items?: string[] }) {
  if (!items?.length) return <p className="text-sm text-muted-foreground">No data.</p>;
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="rounded-md border bg-muted/30 p-3 text-sm">
          {item}
        </li>
      ))}
    </ul>
  );
}

function Screenshot({ path, title }: { path?: string | null; title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {path ? (
          <img src={imageUrl(path)} alt={title} className="max-h-[640px] w-full rounded-md object-contain" />
        ) : (
          <p className="text-sm text-muted-foreground">No screenshot uploaded.</p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function TradeReportPage({ params }: PageProps) {
  const { id } = await params;
  const trade = (await getTrade(id).catch(() => null)) as Trade | null;
  if (!trade) notFound();

  const analysis = latestAnalysis(trade);
  const mt5Image = trade.mt5_image_path || trade.image_path;
  const atasImage = trade.atas_image_path;
  const score = analysis?.strategy_score ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">Trade detail #{trade.id}</h1>
            <Badge>{trade.symbol}</Badge>
            <Badge>{trade.direction}</Badge>
            {trade.result && <Badge>{trade.result}</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {trade.timeframe || "-"} - {trade.session || "-"} - {trade.trade_time ? new Date(trade.trade_time).toLocaleString() : "No trade time"}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/trades">Back to trades</Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Screenshot path={mt5Image} title="MT5 screenshot" />
          {atasImage && <Screenshot path={atasImage} title="ATAS screenshot" />}

          {analysis ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Technical analysis</CardTitle>
                  <CardDescription>Trend, entry, stop loss, take profit, R:R, and trend alignment.</CardDescription>
                </CardHeader>
                <CardContent>
                  <JsonBlock value={analysis.technical_analysis} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Macro analysis</CardTitle>
                  <CardDescription>Macro, safe-haven logic, and rate expectation alignment.</CardDescription>
                </CardHeader>
                <CardContent>
                  <JsonBlock value={analysis.macro_analysis} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Behavior analysis</CardTitle>
                  <CardDescription>FOMO, revenge trading, overtrading, emotional decisions, early exit, and holding loss.</CardDescription>
                </CardHeader>
                <CardContent>
                  <JsonBlock value={analysis.behavior_analysis} />
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>AI analysis pending</CardTitle>
                <CardDescription>This trade has no saved AI analysis result yet.</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Trade fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Entry" value={trade.entry_price} />
              <Row label="Stop loss" value={trade.stop_loss ?? "-"} />
              <Row label="Take profit" value={trade.take_profit ?? "-"} />
              <Row label="R:R" value={trade.risk_reward_ratio ?? "-"} />
              <Row label="PnL" value={trade.pnl ?? "-"} />
              <Row label="Emotion" value={trade.emotion_before_trade || "-"} />
              <Row label="Reason" value={trade.reason_for_entry || "-"} />
              <Row label="Notes" value={trade.notes || "-"} />
            </CardContent>
          </Card>

          {analysis && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Strategy score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div className="text-4xl font-semibold">{score}</div>
                    <Badge className="text-sm">Risk {analysis.risk_grade || "C"}</Badge>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary" style={{ width: `${score}%` }} />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Mistakes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ListBlock items={analysis.mistakes} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Strengths</CardTitle>
                </CardHeader>
                <CardContent>
                  <ListBlock items={analysis.strengths} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Suggestions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ListBlock items={analysis.suggestions} />
                </CardContent>
              </Card>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-3 border-b pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
