"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/action";
import { Button, type ButtonProps } from "./ui";

type Props = Omit<React.FormHTMLAttributes<HTMLFormElement>, "action"> & {
  action: (prev: ActionResult | null, fd: FormData) => Promise<ActionResult>;
  resetOnSuccess?: boolean;
  confirm?: string;
  onDone?: (r: ActionResult) => void;
};

/** Formun bekleme durumu. Form, React 19'un "gönderimden sonra formu sıfırla" davranışını
 * önlemek için onSubmit + startTransition ile gönderilir; bu yüzden useFormStatus yerine bu bağlam kullanılır.
 * Böylece doğrulama hatasında kullanıcının yazdıkları kaybolmaz. */
const PendingCtx = createContext<boolean | null>(null);

export function ActionForm({ action, children, resetOnSuccess, confirm, onDone, ...rest }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      if (state.message) toast.success(state.message);
      // Başarıda önceki davranış korunur (form sıfırlanır, yenilenen varsayılan değerleri alır); hatada korunur.
      if (resetOnSuccess !== false) ref.current?.reset();
      onDone?.(state);
      if (state.redirect) {
        if (/^https?:\/\//.test(state.redirect)) window.location.href = state.redirect;
        else router.push(state.redirect);
      }
      else router.refresh();
    } else if (state.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <PendingCtx.Provider value={pending}>
      <form
        ref={ref}
        {...rest}
        onSubmit={(e) => {
          e.preventDefault();
          if (pending) return;
          if (confirm && !window.confirm(confirm)) return;
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          const fd = new FormData(e.currentTarget, submitter ?? undefined);
          startTransition(() => formAction(fd));
        }}
      >
        {children}
      </form>
    </PendingCtx.Provider>
  );
}

export function SubmitButton({ children, pendingText, ...props }: ButtonProps & { pendingText?: string }) {
  const ctx = useContext(PendingCtx);
  const { pending: formPending } = useFormStatus();
  const pending = ctx ?? formPending;
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? pendingText ?? "Kaydediliyor…" : children}
    </Button>
  );
}
