import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TradeAliasPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/trades/${id}`);
}
