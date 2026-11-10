import { exportCustomerData } from "@/lib/account";
import { getCustomer } from "@/lib/auth";

/** KVKK m.11: giriş yapmış müşterinin kendi verilerini JSON olarak indirmesi. */
export async function GET() {
  const me = await getCustomer();
  if (!me) return new Response("Giriş yapmalısın.", { status: 401 });
  const data = await exportCustomerData(me.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="verilerim-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
