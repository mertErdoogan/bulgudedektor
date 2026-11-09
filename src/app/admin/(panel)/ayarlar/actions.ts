"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertStaff } from "@/lib/auth";
import { testConnection } from "@/lib/iyzico";
import { getSettings, saveSettings } from "@/lib/settings";
import { lines, str, toNum } from "@/lib/utils";

const fin = async (staffId: string, key: string) => {
  await audit(staffId, "settings", key, null, `Ayarlar güncellendi: ${key}`);
  revalidatePath("/", "layout");
  return ok("Ayarlar kaydedildi.");
};

export async function saveStore(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("settings.manage");
    const keys = ["name", "legalName", "phone", "whatsapp", "email", "address", "taxOffice", "taxNumber", "mersis", "etbis", "workingHours", "announcement"] as const;
    const v = Object.fromEntries(keys.map((k) => [k, str(fd.get(k))]));
    if (!v.name) return fail("Mağaza adı zorunlu.");
    v.whatsapp = v.whatsapp.replace(/\D/g, "");
    await saveSettings("store", v);
    return fin(staff.id, "store");
  });
}

export async function saveShipping(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("settings.manage");
    const carriers = lines(fd.get("carriers"));
    if (!carriers.length) return fail("En az bir kargo firması girin.");
    const cur = (await getSettings()).shipping;
    const tracking: Record<string, string> = {};
    for (const l of lines(fd.get("tracking"))) {
      const [name, url] = l.split("|").map((x) => x.trim());
      if (name && url) tracking[name] = url;
    }
    await saveSettings("shipping", {
      freeThreshold: toNum(fd.get("freeThreshold"), 0),
      flatRate: toNum(fd.get("flatRate"), 0),
      carriers,
      defaultCarrier: carriers.includes(str(fd.get("defaultCarrier"))) ? str(fd.get("defaultCarrier")) : carriers[0],
      sameDayCutoff: str(fd.get("sameDayCutoff")) || "15:00",
      deliveryEstimate: str(fd.get("deliveryEstimate")),
      pickupEnabled: fd.get("pickupEnabled") === "on",
      pickupAddress: str(fd.get("pickupAddress")),
      trackingUrlTemplate: Object.keys(tracking).length ? tracking : cur.trackingUrlTemplate,
    });
    return fin(staff.id, "shipping");
  });
}

export async function savePayment(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("payments.manage");
    const cur = (await getSettings()).payment;
    const apiKey = str(fd.get("iyzicoApiKey"));
    const secret = str(fd.get("iyzicoSecretKey"));
    const bankAccounts = lines(fd.get("bankAccounts")).map((l) => {
      const [bank, holder, iban] = l.split("|").map((x) => x.trim());
      return { bank: bank ?? "", holder: holder ?? "", iban: (iban ?? "").toUpperCase() };
    });
    if (bankAccounts.some((b) => b.iban && !/^TR\d{2}[\d ]{20,30}$/.test(b.iban))) return fail("IBAN formatı TR ile başlamalı (TR00 0000 ...).");
    const transferEnabled = fd.get("transferEnabled") === "on";
    if (transferEnabled && !bankAccounts.length) return fail("Havale açık ise en az bir banka hesabı girin.");
    await saveSettings("payment", {
      cardEnabled: fd.get("cardEnabled") === "on",
      iyzicoApiKey: apiKey && !apiKey.includes("•") ? apiKey : cur.iyzicoApiKey,
      iyzicoSecretKey: secret && !secret.includes("•") ? secret : cur.iyzicoSecretKey,
      iyzicoSandbox: fd.get("iyzicoSandbox") === "on",
      maxInstallment: Math.min(12, Math.max(1, toNum(fd.get("maxInstallment"), 12))),
      noInterestInstallments: Math.min(12, Math.max(1, toNum(fd.get("noInterestInstallments"), 1))),
      transferEnabled,
      transferDiscountPct: Math.max(0, Math.min(20, toNum(fd.get("transferDiscountPct"), 0))),
      bankAccounts,
    });
    return fin(staff.id, "payment");
  });
}

export async function testIyzico(): Promise<ActionResult> {
  return safe(async () => {
    await assertStaff("payments.manage");
    const r = await testConnection();
    return r.ok ? ok(r.message) : fail(`iyzico: ${r.message}`);
  });
}

export async function saveIntegrations(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("settings.manage");
    const cur = (await getSettings()).integrations;
    const keep = (k: keyof typeof cur) => {
      const v = str(fd.get(k));
      return v.includes("•") ? cur[k] : v;
    };
    await saveSettings("integrations", {
      gaMeasurementId: str(fd.get("gaMeasurementId")),
      metaPixelId: str(fd.get("metaPixelId")),
      whatsappApiToken: keep("whatsappApiToken"),
      smtpHost: str(fd.get("smtpHost")),
      smtpUser: str(fd.get("smtpUser")),
      smtpPass: keep("smtpPass"),
      smtpFrom: str(fd.get("smtpFrom")),
      notifyEmail: str(fd.get("notifyEmail")),
      eInvoiceProvider: str(fd.get("eInvoiceProvider")),
      eInvoiceApiKey: keep("eInvoiceApiKey"),
      cargoApiKey: keep("cargoApiKey"),
    });
    return fin(staff.id, "integrations");
  });
}

export async function saveSeo(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("settings.manage");
    await saveSettings("seo", { title: str(fd.get("title")), description: str(fd.get("description")) });
    return fin(staff.id, "seo");
  });
}
