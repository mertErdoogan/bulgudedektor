"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import * as Icons from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { NAV } from "./nav";

type Props = {
  user: { name: string; roleName: string; permissions: string[] };
  badges: Record<string, number>;
  setupPending: boolean;
  logout: () => Promise<void>;
  children: React.ReactNode;
};

export function AdminShell({ user, badges, setupPending, logout, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => user.permissions.includes(i.perm)) })).filter((g) => g.items.length);

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto px-3 pb-6">
      {setupPending && user.permissions.includes("settings.manage") ? (
        <Link href="/admin/kurulum" onClick={() => setOpen(false)} className="mb-2 flex items-center gap-2 rounded-lg bg-deep px-3 py-2.5 text-sm font-bold text-white">
          <Icons.Rocket size={16} /> Kurulumu tamamla
        </Link>
      ) : null}
      {groups.map((g) => (
        <div key={g.label} className="mt-2">
          {g.label ? <p className="px-3 pb-1 text-[11px] font-bold tracking-wider text-mute uppercase">{g.label}</p> : null}
          {g.items.map((i) => {
            const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[i.icon] ?? Icons.Circle;
            const active = i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href);
            const b = i.badgeKey ? badges[i.badgeKey] : 0;
            return (
              <Link
                key={i.href}
                href={i.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-deep/85 hover:bg-soft",
                  active && "bg-pop text-on-pop hover:bg-pop",
                )}
              >
                <Icon size={17} className="shrink-0" />
                <span className="flex-1">{i.label}</span>
                {b ? <span className="rounded-full bg-accent px-1.5 text-[11px] font-extrabold text-white">{b}</span> : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-soft">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-white lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/admin">
            <Logo size={24} withSub={false} />
          </Link>
          <span className="ml-2 rounded bg-soft px-1.5 py-0.5 text-[10px] font-bold text-mute">PANEL</span>
        </div>
        {sidebar}
      </aside>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white">
            <div className="flex h-16 items-center justify-between px-5">
              <Logo size={24} withSub={false} />
              <button onClick={() => setOpen(false)} aria-label="Menüyü kapat" className="p-2">
                <Icons.X size={20} />
              </button>
            </div>
            {sidebar}
          </aside>
        </div>
      ) : null}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur md:px-6">
          <button className="rounded-lg p-2 hover:bg-soft lg:hidden" onClick={() => setOpen(true)} aria-label="Menüyü aç">
            <Icons.Menu size={20} />
          </button>
          <form action="/admin/ara" className="flex max-w-md flex-1 items-center gap-2 rounded-lg bg-soft px-3">
            <Icons.Search size={16} className="text-mute" />
            <input name="q" placeholder="Sipariş no, müşteri, ürün, seri no…" className="h-10 w-full bg-transparent text-sm outline-none" />
          </form>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/" target="_blank" className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-soft sm:flex">
              <Icons.ExternalLink size={15} /> Mağazayı aç
            </Link>
            <Link href="/admin/hesap" className="hidden rounded-lg px-2 py-1 text-right hover:bg-soft sm:block" title="Hesabım: şifre ve iki adımlı doğrulama">
              <p className="text-sm leading-tight font-bold">{user.name}</p>
              <p className="text-xs text-mute">{user.roleName}</p>
            </Link>
            <Link href="/admin/hesap" className="rounded-lg p-2 text-mute hover:bg-soft hover:text-deep sm:hidden" aria-label="Hesabım">
              <Icons.UserCog size={18} />
            </Link>
            <form action={logout}>
              <button className="rounded-lg p-2 text-mute hover:bg-soft hover:text-deep" title="Çıkış yap" aria-label="Çıkış yap">
                <Icons.LogOut size={18} />
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-extrabold">{title}</h1>
        {description ? <p className="mt-1 text-sm text-mute">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
