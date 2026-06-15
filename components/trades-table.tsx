"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Trade } from "@/lib/types";

export function TradesTable({ trades = [] }: { trades?: Trade[] }) {
  if (!trades.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">No trades found.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b bg-muted/50 text-left">
            <tr>
              <th className="p-3 font-medium">ID</th>
              <th className="p-3 font-medium">Symbol</th>
              <th className="p-3 font-medium">Direction</th>
              <th className="p-3 font-medium">Result</th>
              <th className="p-3 font-medium">PnL</th>
              <th className="p-3 font-medium">Session</th>
              <th className="p-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id} className="border-b last:border-0">
                <td className="p-3">#{trade.id}</td>
                <td className="p-3">{trade.symbol}</td>
                <td className="p-3">
                  <Badge>{trade.direction}</Badge>
                </td>
                <td className="p-3">{trade.result || "-"}</td>
                <td className="p-3">{trade.pnl ?? "-"}</td>
                <td className="p-3">{trade.session || "-"}</td>
                <td className="p-3">
                  <Link href={`/trade/${trade.id}`} className="text-primary underline">
                    View details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
