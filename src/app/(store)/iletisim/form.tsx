"use client";
import { useT } from "@/components/i18n";

import Link from "@/components/locale-link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Turnstile } from "@/components/turnstile";
import { Checkbox, Field, Input, Textarea } from "@/components/ui";
import { contactForm } from "../actions";

export function ContactForm({ subject }: { subject: string }) {
  const t0 = useT();
  const L = (tr: string, en: string) => (t0.locale === "en" ? en : tr);
  return (
    <ActionForm action={contactForm} resetOnSuccess className="flex flex-col gap-4 rounded-2xl border border-line p-6">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <Field label={L("Adın", "Your name")}><Input name="name" required /></Field>
      <Field label={L("Telefon veya e-posta", "Phone or email")}><Input name="contact" required /></Field>
      <Field label={L("Konu", "Subject")}><Input name="subject" defaultValue={subject} /></Field>
      <Field label={L("Mesajın", "Your message")}><Textarea name="message" required className="min-h-[130px]" /></Field>
      <Checkbox name="kvkk" required label={<><Link href="/sayfa/kvkk-aydinlatma-metni" target="_blank" className="font-bold text-link">{L("Aydınlatma metnini", "I have read the privacy notice")}</Link>{L(" okudum.", ".")}</>} />
      <Turnstile />
      <SubmitButton size="lg">{L("Gönder", "Send")}</SubmitButton>
    </ActionForm>
  );
}
