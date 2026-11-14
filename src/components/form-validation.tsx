"use client";

import { useEffect } from "react";
import { translate, type DictKey } from "@/lib/i18n/dict";
import { isLocale } from "@/lib/i18n/config";

// Sayfa dili <html lang> üzerinden: tr-TR → tr, en → en
const tt = (k: DictKey, v?: Record<string, string | number>) => {
  const l = document.documentElement.lang.slice(0, 2);
  return translate(isLocale(l) ? l : "tr", k, v);
};

/**
 * Sitenin tüm formlarında tarayıcının kendi (çoğu zaman İngilizce) uyarı balonları yerine Türkçe, alanın hemen
 * altında görünen açıklayıcı hata mesajı. Alanın etiketi mesaja eklenir ("Cep telefonu boş bırakılamaz").
 * Özel mesaj için alana data-error="..." verilebilir. İlk hatalı alana kaydırılır ve odaklanılır.
 */
const label = (el: HTMLElement) => {
  const box = el.closest("[data-field]");
  const t = box?.querySelector("[data-field-label]")?.textContent ?? el.getAttribute("aria-label") ?? "";
  return t.replace(/\(.*?\)/g, "").trim();
};

function message(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  const v = el.validity;
  const custom = el.dataset.error;
  const name = label(el);
  if (v.valueMissing) {
    if (el instanceof HTMLInputElement && el.type === "checkbox") return custom ?? tt("v.checkbox");
    if (el instanceof HTMLSelectElement) return name ? tt("v.choose", { alan: name }) : tt("v.chooseAny");
    return name ? tt("v.required", { alan: name }) : tt("v.requiredAny");
  }
  if (custom) return custom;
  if (v.typeMismatch) return el.type === "email" ? tt("v.email") : el.type === "url" ? tt("v.url") : tt("v.format");
  if (v.tooShort) return tt("v.min", { n: (el as HTMLInputElement).minLength });
  if (v.tooLong) return tt("v.max", { n: (el as HTMLInputElement).maxLength });
  if (v.rangeUnderflow) return tt("v.rangeMin", { n: (el as HTMLInputElement).min });
  if (v.rangeOverflow) return tt("v.rangeMax", { n: (el as HTMLInputElement).max });
  if (v.patternMismatch) return el.title || tt("v.format");
  return tt("v.check");
}

const errId = (el: HTMLElement) => {
  if (!el.dataset.errId) el.dataset.errId = `fe-${Math.random().toString(36).slice(2, 8)}`;
  return el.dataset.errId;
};

function anchor(el: HTMLElement) {
  // Onay kutusu etiketin içinde: hata etiketin altına; diğerleri alanın hemen altına
  return el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio") ? (el.closest("label") ?? el) : el;
}

function show(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  const id = errId(el);
  let p = document.getElementById(id);
  if (!p) {
    p = document.createElement("p");
    p.id = id;
    p.className = "field-error";
    p.setAttribute("role", "alert");
    anchor(el).insertAdjacentElement("afterend", p);
  }
  p.textContent = message(el);
  el.setAttribute("aria-invalid", "true");
  el.setAttribute("aria-describedby", id);
}

function clear(el: HTMLElement) {
  const id = el.dataset.errId;
  if (id) document.getElementById(id)?.remove();
  el.removeAttribute("aria-invalid");
  if (el.getAttribute("aria-describedby") === id) el.removeAttribute("aria-describedby");
}

export function FormValidation() {
  useEffect(() => {
    let focused = false;
    const onInvalid = (e: Event) => {
      const el = e.target as EventTarget;
      if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement)) return;
      e.preventDefault(); // tarayıcının İngilizce balonu çıkmasın
      show(el);
      if (!focused) {
        focused = true;
        el.focus({ preventScroll: true });
        anchor(el).scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => (focused = false), 0);
      }
    };
    const onEdit = (e: Event) => {
      const el = e.target as HTMLInputElement;
      if (!el?.dataset?.errId) return;
      if (el.validity?.valid) clear(el); // checkValidity() yeniden 'invalid' olayı tetiklerdi
      else show(el);
    };
    document.addEventListener("invalid", onInvalid, true);
    document.addEventListener("input", onEdit, true);
    document.addEventListener("change", onEdit, true);
    return () => {
      document.removeEventListener("invalid", onInvalid, true);
      document.removeEventListener("input", onEdit, true);
      document.removeEventListener("change", onEdit, true);
    };
  }, []);
  return null;
}
