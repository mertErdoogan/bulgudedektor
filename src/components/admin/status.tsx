import { Badge } from "@/components/ui";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, PRODUCT_STATUS_LABEL, RETURN_STATUS_LABEL, SERVICE_STATUS_LABEL } from "@/lib/utils";

type Tone = "neutral" | "brand" | "ok" | "warn" | "danger" | "dark" | "gold";

const orderTone: Record<string, Tone> = {
  PENDING_PAYMENT: "neutral",
  PAID: "gold",
  PREPARING: "warn",
  SHIPPED: "brand",
  DELIVERED: "ok",
  CANCELLED: "danger",
  REFUNDED: "danger",
};
export function OrderStatusBadge({ status }: { status: string }) {
  return <Badge tone={orderTone[status] ?? "neutral"}>{ORDER_STATUS_LABEL[status] ?? status}</Badge>;
}
const payTone: Record<string, Tone> = { PENDING: "neutral", PAID: "ok", FAILED: "danger", REFUNDED: "danger", PARTIALLY_REFUNDED: "warn" };
export function PaymentStatusBadge({ status }: { status: string }) {
  return <Badge tone={payTone[status] ?? "neutral"}>{PAYMENT_STATUS_LABEL[status] ?? status}</Badge>;
}
const prodTone: Record<string, Tone> = { DRAFT: "neutral", ACTIVE: "ok", ARCHIVED: "dark" };
export function ProductStatusBadge({ status }: { status: string }) {
  return <Badge tone={prodTone[status] ?? "neutral"}>{PRODUCT_STATUS_LABEL[status] ?? status}</Badge>;
}
const retTone: Record<string, Tone> = { REQUESTED: "gold", APPROVED: "warn", RECEIVED: "brand", REFUNDED: "ok", REJECTED: "danger" };
export function ReturnStatusBadge({ status }: { status: string }) {
  return <Badge tone={retTone[status] ?? "neutral"}>{RETURN_STATUS_LABEL[status] ?? status}</Badge>;
}
const srvTone: Record<string, Tone> = { RECEIVED: "gold", AWAITING_DEVICE: "neutral", IN_REPAIR: "warn", WAITING_PART: "warn", READY: "brand", SHIPPED_BACK: "brand", CLOSED: "ok" };
export function ServiceStatusBadge({ status }: { status: string }) {
  return <Badge tone={srvTone[status] ?? "neutral"}>{SERVICE_STATUS_LABEL[status] ?? status}</Badge>;
}
