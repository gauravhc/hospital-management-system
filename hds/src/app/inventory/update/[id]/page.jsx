import { redirect } from "next/navigation";

export default async function InventoryUpdateRedirectPage({ params }) {
  const { id } = await params;
  redirect(`/inventory/manageitems?stock_id=${encodeURIComponent(id)}`);
}
