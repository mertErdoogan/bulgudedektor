"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Banknote, Barcode, CheckCircle2, FileText, Inbox, MessageCircle, Package, PackageCheck, Star, Truck, Undo2, UserRound, Wrench } from "lucide-react";
import { assignWork } from "@/app/admin/(panel)/isler/actions";

type Item = {
  key: string;
  kind: string;
  title: string;
  detail: string;
  href: string;
  at: string;
  late: boolean;
  assignee: { id: string; name: string } | null;
  target: { type: "order" | "conversation" | "service"; id: string } | null;
};

const ICON: Record<string, React.ComponentType<{ size?: number }>> = {
  transfer_notice: Banknote,
  transfer_waiting: Banknote,
  serial_missing: Barcode,
  to_prepare: Package,
  to_ship: Truck,
  invoice_missing: FileText,
  message: MessageCircle,
  return: Undo2,
  service: Wrench,
  stock_alert: PackageCheck,
  moderation: Star,
};

function age(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m} dk`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} sa`;
  return `${Math.round(h / 24)} gün`;
}

const initials = (n: string) =>
  n
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toLocaleUpperCase("tr");

export function WorkList({ items, groups, me, staff, compact = false }: { items: Item[]; groups: { id: string; label: string; kinds: string[] }[]; me: string; staff: { id: string; name: string }[]; compact?: boolean }) {
  const [tab, setTab] = useState<"all" | "mine" | "open" | "late">("all");
  const [pending, start] = useTransition();
  const router = useRouter();
  const counts = useMemo(
    () => ({ all: items.length, mine: items.filter((i) => i.assignee?.id === me).length, open: items.filter((i) => !i.assignee && i.target).length, late: items.filter((i) => i.late).length }),
    [items, me],
  );
  const shown = items.filter((i) => (tab === "mine" ? i.assignee?.id === me : tab === "open" ? !i.assignee && i.target : tab === "late" ? i.late : true));

  const assign = (it: Item, userId: string | null) =>
    start(async () => {
      if (!it.target) return;
      const r = await assignWork(it.target.type, it.target.id, userId);
      if (r.ok) {
        toast.success(r.message);
        router.refresh();
      } else toast.error(r.message);
    });

  const tabs = [
    ["all", "Hepsi"],
    ["late", "Gecikenler"],
    ["mine", "Bana atanan"],
    ["open", "Sahipsiz"],
  ] as const;

  return (
    <div className="min-w-0">
      <div className="scrollbar-none flex gap-2 overflow-x-auto pb-3">
        {tabs.map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${tab === k ? "border-deep bg-deep text-white" : "border-line bg-white hover:border-deep"}`}
          >
            {label}
            <span className={`rounded-full px-1.5 text-xs ${tab === k ? "bg-white/20" : k === "late" && counts.late ? "bg-danger text-white" : "bg-soft text-mute"}`}>{counts[k]}</span>
          </button>
        ))}
      </div>
      {!shown.length ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-white py-10 text-center text-sm text-mute">
          <CheckCircle2 size={28} className="text-ok" />
          {tab === "all" ? "Bekleyen iş yok. Harika!" : "Bu filtrede iş yok."}
        </div>
      ) : (
        <div className={`grid min-w-0 grid-cols-1 gap-4 ${compact ? "" : "xl:grid-cols-2"}`}>
          {groups.map((g) => {
            const list = shown.filter((i) => g.kinds.includes(i.kind));
            if (!list.length) return null;
            const max = compact ? 6 : 50;
            return (
              <section key={g.id} className="min-w-0 rounded-xl border border-line bg-white" data-group={g.id}>
                <h3 className="flex items-center justify-between border-b border-line px-4 py-2.5 text-sm font-bold">
                  {g.label}
                  <span className="text-xs font-semibold text-mute">{list.length} iş</span>
                </h3>
                <ul className="divide-y divide-line">
                  {list.slice(0, max).map((it) => {
                    const Icon = ICON[it.kind] ?? Inbox;
                    return (
                      <li key={it.key} className="flex items-center gap-3 px-4 py-2.5" data-work={it.kind}>
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${it.late ? "bg-danger-bg text-danger" : "bg-soft text-deep"}`}>
                          <Icon size={17} />
                        </span>
                        <Link href={it.href} className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">{it.title}</span>
                          <span className="block truncate text-xs text-mute">{it.detail}</span>
                        </Link>
                        <span className={`hidden shrink-0 items-center gap-1 text-xs sm:flex ${it.late ? "font-bold text-danger" : "text-mute"}`} title={it.late ? "Hedef süre aşıldı" : undefined}>
                          {it.late ? <AlertTriangle size={13} /> : null}
                          {age(it.at)}
                        </span>
                        {it.target ? (
                          <AssignMenu it={it} me={me} staff={staff} disabled={pending} onAssign={(u) => assign(it, u)} />
                        ) : (
                          <span className="w-8 shrink-0" />
                        )}
                      </li>
                    );
                  })}
                </ul>
                {list.length > max ? (
                  <Link href="/admin/isler" className="block border-t border-line px-4 py-2 text-center text-xs font-bold text-link">
                    +{list.length - max} iş daha
                  </Link>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AssignMenu({ it, me, staff, disabled, onAssign }: { it: Item; me: string; staff: { id: string; name: string }[]; disabled: boolean; onAssign: (u: string | null) => void }) {
  const value = it.assignee?.id ?? "";
  return (
    <label className="relative shrink-0" title={it.assignee ? `${it.assignee.name} ilgileniyor` : "Kimse ilgilenmiyor — ata"}>
      <span
        className={`grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold ${it.assignee ? (it.assignee.id === me ? "bg-brand text-white" : "bg-deep text-white") : "border border-dashed border-mute text-mute"}`}
      >
        {it.assignee ? initials(it.assignee.name) : <UserRound size={14} />}
      </span>
      <select
        aria-label="Ata"
        disabled={disabled}
        value={value}
        onChange={(e) => onAssign(e.target.value || null)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        <option value="">— Atama yok —</option>
        <option value={me}>Ben üstleniyorum</option>
        {staff
          .filter((s) => s.id !== me)
          .map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
      </select>
    </label>
  );
}

/** Kayıt sayfalarında (sipariş, mesaj, servis) "İlgilenen" seçimi. */
export function AssignSelect({ type, id, current, me, staff }: { type: "order" | "conversation" | "service"; id: string; current: string | null; me: string; staff: { id: string; name: string }[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-mute">İlgilenen:</span>
      <select
        name="assignee"
        disabled={pending}
        defaultValue={current ?? ""}
        onChange={(e) =>
          start(async () => {
            const r = await assignWork(type, id, e.target.value || null);
            if (r.ok) {
              toast.success(r.message);
              router.refresh();
            } else toast.error(r.message);
          })
        }
        className="h-8 rounded-lg border border-line bg-white px-2 text-sm font-semibold"
      >
        <option value="">Kimse</option>
        <option value={me}>Ben</option>
        {staff
          .filter((s) => s.id !== me)
          .map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
      </select>
    </label>
  );
}
