import { NextResponse } from "next/server";
import { BF_PAYMENTS, BF_STATUSES, bfCargo, bfInvoiceLink, bfOrders, birfaturaAuth, parseBfDate } from "@/lib/einvoice/birfatura";

export const dynamic = "force-dynamic";

/**
 * BirFatura Özel Entegrasyon uçları. BirFatura'ya site adresi olarak https://<site>/api/birfatura verilir;
 * BirFatura bunun sonuna /api/orderStatus, /api/paymentMethods, /api/orders, /api/invoiceLinkUpdate,
 * /api/orderCargoUpdate ekleyerek çağırır. Her istek "token" başlığı taşır.
 */
async function handle(req: Request, endpoint: string) {
  if (!(await birfaturaAuth(req))) return NextResponse.json({ Success: false, success: false, Message: "Yetkisiz: token hatalı ya da BirFatura entegrasyonu kapalı." }, { status: 401 });
  const body = req.method === "POST" ? ((await req.json().catch(() => ({}))) as Record<string, unknown>) : {};
  const qs = new URL(req.url).searchParams;
  switch (endpoint) {
    case "orderStatus":
      return NextResponse.json({ OrderStatus: BF_STATUSES.map(({ Id, Value }) => ({ Id, Value })), orderStatuses: BF_STATUSES.map(({ Id, Value }) => ({ Id, Value })) });
    case "paymentMethods":
      return NextResponse.json({ PaymentMethods: BF_PAYMENTS.map(({ Id, Value }) => ({ Id, Value })), paymentMethods: BF_PAYMENTS.map(({ Id, Value }) => ({ Id, Value })) });
    case "orders": {
      const start = parseBfDate(body.startDateTime ?? qs.get("startDate"));
      const end = parseBfDate(body.endDateTime ?? qs.get("endDate")) ?? new Date();
      if (!start) return NextResponse.json({ Success: false, Message: "startDateTime 'dd.MM.yyyy HH:mm:ss' biçiminde olmalı." }, { status: 400 });
      const sid = Number(body.orderStatusId ?? qs.get("status") ?? 0) || null;
      const list = await bfOrders(start, end, sid);
      return NextResponse.json({ Orders: list, orders: list });
    }
    case "invoiceLinkUpdate": {
      const r = await bfInvoiceLink(body);
      return NextResponse.json({ Success: r.status === 200, success: r.status === 200, Message: r.message }, { status: r.status });
    }
    case "orderCargoUpdate": {
      const r = await bfCargo(body);
      return NextResponse.json({ Success: r.status === 200, success: r.status === 200, Message: r.message }, { status: r.status });
    }
    default:
      return NextResponse.json({ Success: false, Message: "Bilinmeyen uç." }, { status: 404 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ endpoint: string }> }) {
  return handle(req, (await params).endpoint);
}
export async function GET(req: Request, { params }: { params: Promise<{ endpoint: string }> }) {
  return handle(req, (await params).endpoint);
}
