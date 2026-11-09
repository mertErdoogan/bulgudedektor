"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export function Pagination({ page, per, total, param = "s" }: { page: number; per: number; total: number; param?: string }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const pages = Math.max(1, Math.ceil(total / per));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams(sp.toString());
    q.set(param, String(p));
    return `${pathname}?${q}`;
  };
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-mute">
        {(page - 1) * per + 1}–{Math.min(page * per, total)} / {total}
      </span>
      <div className="flex gap-1">
        {page > 1 ? <Link className="rounded-lg border border-line bg-white px-3 py-1.5 font-semibold" href={href(page - 1)}>← Önceki</Link> : null}
        <span className="px-3 py-1.5 font-bold">{page} / {pages}</span>
        {page < pages ? <Link className="rounded-lg border border-line bg-white px-3 py-1.5 font-semibold" href={href(page + 1)}>Sonraki →</Link> : null}
      </div>
    </div>
  );
}
