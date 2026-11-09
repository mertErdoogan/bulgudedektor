"use client";

import { useActionState, useEffect, useRef } from "react";
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

export function ActionForm({ action, children, resetOnSuccess, confirm, onDone, ...rest }: Props) {
  const [state, formAction] = useActionState(action, null);
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      if (state.message) toast.success(state.message);
      if (resetOnSuccess) ref.current?.reset();
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
    <form
      ref={ref}
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      {...rest}
    >
      {children}
    </form>
  );
}

export function SubmitButton({ children, pendingText, ...props }: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? pendingText ?? "Kaydediliyor…" : children}
    </Button>
  );
}
