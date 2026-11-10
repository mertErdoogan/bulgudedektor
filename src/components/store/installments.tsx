import type { InstallmentBank } from "@/lib/iyzico";
import { formatTL } from "@/lib/utils";

/** Taksit tablosu: iyzico verisi varsa banka bazında, yoksa mağaza ayarlarından genel tablo. */
export function InstallmentTable({ price, banks, noInterest, max, rates = {} }: { price: number; banks: InstallmentBank[] | null; noInterest: number; max: number; rates?: Record<string, number> }) {
  if (banks?.length) {
    const ns = [...new Set(banks.flatMap((b) => b.rows.map((r) => r.n)))].sort((a, b) => a - b);
    return (
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="bg-soft text-left">
              <th className="px-3 py-2">Kart</th>
              {ns.map((n) => <th key={n} className="px-3 py-2 text-right whitespace-nowrap">{n} taksit</th>)}
            </tr>
          </thead>
          <tbody>
            {banks.map((b) => (
              <tr key={b.family + b.bank} className="border-t border-line">
                <td className="px-3 py-2"><b>{b.family}</b><span className="block text-xs text-mute">{b.bank}</span></td>
                {ns.map((n) => {
                  const r = b.rows.find((x) => x.n === n);
                  return (
                    <td key={n} className="px-3 py-2 text-right whitespace-nowrap">
                      {r ? <><b>{formatTL(r.monthly)}</b><span className="block text-xs text-mute">{r.total <= price * 1.001 ? "vade farksız" : `toplam ${formatTL(r.total)}`}</span></> : <span className="text-mute">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  // iyzico verisi yoksa: vade farksız taksitler + ayarlardaki genel vade farkı oranları
  const ns = Array.from({ length: Math.max(0, max - 1) }, (_, i) => i + 2).filter((n) => n <= noInterest || rates[String(n)] !== undefined);
  if (!ns.length) return <p className="text-sm text-mute">Kartına özel taksit seçeneklerini ödeme adımında görürsün.</p>;
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {ns.map((n) => {
          const free = n <= noInterest;
          const total = free ? price : Math.round(price * (1 + (rates[String(n)] ?? 0) / 100));
          return (
            <div key={n} className="rounded-xl border border-line p-3 text-center">
              <span className="text-xs text-mute">{n} taksit</span>
              <b className="block text-[17px]">{formatTL(Math.round(total / n))}</b>
              <span className={free ? "text-xs font-semibold text-ok" : "text-xs text-mute"}>{free ? "vade farksız" : `toplam ${formatTL(total)}`}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-mute">Tüm kredi kartlarında geçerli genel oranlardır; kartına özel kesin tutarları ödeme adımında görürsün.</p>
    </div>
  );
}
