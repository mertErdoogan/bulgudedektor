import { PageHeader } from "@/components/admin/shell";
import { requireStaff } from "@/lib/auth";
import { ManualOrderForm } from "./form";

export const metadata = { title: "Yeni sipariş" };

export default async function NewOrderPage() {
  const staff = await requireStaff("orders.manage");
  return (
    <>
      <PageHeader title="Telefon / showroom siparişi" description="Telefonda veya mağazada satılan cihazı sisteme işle: stok düşer, müşteri kaydı açılır, garanti takibi başlar." />
      <ManualOrderForm maxDiscount={staff.maxDiscountPct} />
    </>
  );
}
