import { TradeUploadForm } from "@/components/trade-upload-form";

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Upload trade screenshots</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload the required MT5 screenshot, add optional ATAS context, enter manual trade data, then run AI review.
        </p>
      </div>
      <TradeUploadForm />
    </div>
  );
}
