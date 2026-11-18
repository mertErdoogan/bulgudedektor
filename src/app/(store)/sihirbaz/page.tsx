import { getT } from "@/lib/i18n/server";
import { pageMeta } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { Wizard } from "./wizard";

export async function generateMetadata() {
  const t = await getT();
  return pageMeta({ title: t("wiz.meta_title"), description: t("wiz.meta_desc"), path: "/sihirbaz" });
}

export default async function WizardPage({ searchParams }: { searchParams: Promise<{ amac?: string }> }) {
  const s = await getSettings();
  return <Wizard initialAmac={(await searchParams).amac} whatsapp={s.store.whatsapp} />;
}
