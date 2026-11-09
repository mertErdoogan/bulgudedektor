"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import type { ActionResult } from "@/lib/action";
import { Button, type ButtonProps } from "@/components/ui";

/** Onaylı tek tık işlem butonu (silme, durum değiştirme vb.) */
export function ActionButton({
  run,
  confirmText,
  children,
  ...props
}: Omit<ButtonProps, "onClick"> & { run: () => Promise<ActionResult>; confirmText?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirmText && !confirm(confirmText)) return;
        start(async () => {
          const r = await run();
          if (r.ok) {
            if (r.message) toast.success(r.message);
            if (r.redirect) router.push(r.redirect);
            else router.refresh();
          } else toast.error(r.error);
        });
      }}
      {...props}
    >
      {children}
    </Button>
  );
}

export function DeleteButton({ run, label = "Sil", confirmText }: { run: () => Promise<ActionResult>; label?: string; confirmText: string }) {
  return (
    <ActionButton run={run} confirmText={confirmText} variant="danger-ghost" size="sm">
      <Trash2 size={14} /> {label}
    </ActionButton>
  );
}
