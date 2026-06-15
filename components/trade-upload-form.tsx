"use client";

import { FormEvent, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud } from "lucide-react";

import { analyzeTrade, createTrade, uploadImages } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FormState = {
  symbol: string;
  direction: "long" | "short";
  entry_price: string;
  stop_loss: string;
  take_profit: string;
  risk_reward_ratio: string;
  timeframe: string;
  trade_time: string;
  session: "Asia" | "London" | "NewYork";
  result: "win" | "loss" | "breakeven";
  pnl: string;
  reason_for_entry: string;
  emotion_before_trade: string;
  notes: string;
  dxy: string;
  us10y: string;
  cpi: string;
  nfp: string;
  adp: string;
  pce: string;
  pmi: string;
  oil: string;
  geopolitical_risks: string;
  fed_rate_expectations: string;
};

const initialState: FormState = {
  symbol: "XAUUSD",
  direction: "long",
  entry_price: "",
  stop_loss: "",
  take_profit: "",
  risk_reward_ratio: "",
  timeframe: "M15",
  trade_time: "",
  session: "London",
  result: "loss",
  pnl: "",
  reason_for_entry: "",
  emotion_before_trade: "",
  notes: "",
  dxy: "",
  us10y: "",
  cpi: "",
  nfp: "",
  adp: "",
  pce: "",
  pmi: "",
  oil: "",
  geopolitical_risks: "",
  fed_rate_expectations: "",
};

function toNumber(value: string) {
  return value.trim() === "" ? null : Number(value);
}

export function TradeUploadForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [mt5File, setMt5File] = useState<File | null>(null);
  const [atasFile, setAtasFile] = useState<File | null>(null);
  const [mt5Preview, setMt5Preview] = useState("");
  const [atasPreview, setAtasPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => mt5File && form.entry_price && form.timeframe && !loading, [mt5File, form.entry_price, form.timeframe, loading]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mt5File) return;

    setLoading(true);
    setError("");
    try {
      const uploaded = await uploadImages(mt5File, atasFile);
      const manualTradeData = {
        symbol: form.symbol,
        direction: form.direction,
        entry_price: Number(form.entry_price),
        stop_loss: toNumber(form.stop_loss),
        take_profit: toNumber(form.take_profit),
        risk_reward_ratio: toNumber(form.risk_reward_ratio),
        timeframe: form.timeframe,
        trade_time: form.trade_time ? new Date(form.trade_time).toISOString() : null,
        session: form.session,
        result: form.result,
        pnl: toNumber(form.pnl),
        reason_for_entry: form.reason_for_entry || null,
        emotion_before_trade: form.emotion_before_trade || null,
        notes: form.notes || null,
      };

      const trade = await createTrade({
        ...manualTradeData,
        mt5_image_path: uploaded.mt5_path,
        atas_image_path: uploaded.atas_path,
      });

      await analyzeTrade({
        trade_id: trade.id,
        image_path: uploaded.mt5_path,
        mt5_image_path: uploaded.mt5_path,
        atas_image_path: uploaded.atas_path,
        manual_trade_data: manualTradeData,
        notes: form.notes,
        macro_context: {
          DXY: form.dxy,
          US10Y: form.us10y,
          CPI: form.cpi,
          NFP: form.nfp,
          ADP: form.adp,
          PCE: form.pce,
          PMI: form.pmi,
          Oil: form.oil,
          "Geopolitical risks": form.geopolitical_risks,
          "Fed rate expectations": form.fed_rate_expectations,
        },
      });

      router.push(`/trade/${trade.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Manual trade input</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Symbol">
              <Input value={form.symbol} onChange={(event) => update("symbol", event.target.value)} />
            </Field>
            <Field label="Direction">
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.direction} onChange={(event) => update("direction", event.target.value as FormState["direction"])}>
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </Field>
            <Field label="Entry price">
              <Input required inputMode="decimal" value={form.entry_price} onChange={(event) => update("entry_price", event.target.value)} />
            </Field>
            <Field label="Stop loss">
              <Input inputMode="decimal" value={form.stop_loss} onChange={(event) => update("stop_loss", event.target.value)} />
            </Field>
            <Field label="Take profit">
              <Input inputMode="decimal" value={form.take_profit} onChange={(event) => update("take_profit", event.target.value)} />
            </Field>
            <Field label="Risk reward ratio">
              <Input inputMode="decimal" value={form.risk_reward_ratio} onChange={(event) => update("risk_reward_ratio", event.target.value)} />
            </Field>
            <Field label="Timeframe">
              <Input required value={form.timeframe} onChange={(event) => update("timeframe", event.target.value)} />
            </Field>
            <Field label="Trade time">
              <Input type="datetime-local" value={form.trade_time} onChange={(event) => update("trade_time", event.target.value)} />
            </Field>
            <Field label="Session">
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.session} onChange={(event) => update("session", event.target.value as FormState["session"])}>
                <option value="Asia">Asia</option>
                <option value="London">London</option>
                <option value="NewYork">NewYork</option>
              </select>
            </Field>
            <Field label="Result">
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.result} onChange={(event) => update("result", event.target.value as FormState["result"])}>
                <option value="win">Win</option>
                <option value="loss">Loss</option>
                <option value="breakeven">Breakeven</option>
              </select>
            </Field>
            <Field label="PnL">
              <Input inputMode="decimal" value={form.pnl} onChange={(event) => update("pnl", event.target.value)} />
            </Field>
            <Field label="Emotion before trade">
              <Input value={form.emotion_before_trade} onChange={(event) => update("emotion_before_trade", event.target.value)} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Reason for entry">
                <Textarea value={form.reason_for_entry} onChange={(event) => update("reason_for_entry", event.target.value)} />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Notes">
                <Textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Macro context</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {[
              ["dxy", "DXY"],
              ["us10y", "US10Y"],
              ["cpi", "CPI"],
              ["nfp", "NFP"],
              ["adp", "ADP"],
              ["pce", "PCE"],
              ["pmi", "PMI"],
              ["oil", "Oil"],
              ["geopolitical_risks", "Geopolitical risks"],
              ["fed_rate_expectations", "Fed rate expectations"],
            ].map(([key, label]) => (
              <Field label={label} key={key}>
                <Input value={form[key as keyof FormState]} onChange={(event) => update(key as keyof FormState, event.target.value)} />
              </Field>
            ))}
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Trade screenshots</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScreenshotInput label="MT5 screenshot required" preview={mt5Preview} required onFile={(file) => {
              setMt5File(file);
              setMt5Preview(file ? URL.createObjectURL(file) : "");
            }} />
            <ScreenshotInput label="ATAS screenshot optional" preview={atasPreview} onFile={(file) => {
              setAtasFile(file);
              setAtasPreview(file ? URL.createObjectURL(file) : "");
            }} />
            {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={!canSubmit} className="w-full">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save, analyze, and open detail
            </Button>
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}

function ScreenshotInput({
  label,
  preview,
  required = false,
  onFile,
}: {
  label: string;
  preview: string;
  required?: boolean;
  onFile: (file: File | null) => void;
}) {
  return (
    <label className="grid min-h-44 cursor-pointer place-items-center rounded-lg border border-dashed bg-muted/40 p-4 text-center hover:bg-muted">
      <input
        type="file"
        required={required}
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(event) => onFile(event.target.files?.[0] || null)}
      />
      {preview ? (
        <img src={preview} alt={label} className="max-h-72 rounded-md object-contain" />
      ) : (
        <div className="space-y-2">
          <UploadCloud className="mx-auto h-8 w-8 text-primary" />
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">PNG, JPG, JPEG</p>
        </div>
      )}
    </label>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
