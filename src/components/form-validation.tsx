"use client";

import { useEffect } from "react";

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
    if (el instanceof HTMLInputElement && el.type === "checkbox") return custom ?? "Devam etmek için bu kutuyu onaylaman gerekiyor.";
    if (el instanceof HTMLSelectElement) return name ? `${name} seç.` : "Bir seçenek seç.";
    return name ? `${name} boş bırakılamaz.` : "Bu alanı doldur.";
  }
  if (custom) return custom;
  if (v.typeMismatch) return el.type === "email" ? "Geçerli bir e-posta yaz (ör. ad@ornek.com)." : el.type === "url" ? "Geçerli bir bağlantı yaz (https:// ile)." : "Biçim hatalı.";
  if (v.tooShort) return `En az ${(el as HTMLInputElement).minLength} karakter olmalı.`;
  if (v.tooLong) return `En fazla ${(el as HTMLInputElement).maxLength} karakter olabilir.`;
  if (v.rangeUnderflow) return `En az ${(el as HTMLInputElement).min} olmalı.`;
  if (v.rangeOverflow) return `En fazla ${(el as HTMLInputElement).max} olabilir.`;
  if (v.patternMismatch) return el.title || "Biçim hatalı.";
  return "Bu alanı kontrol et.";
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
