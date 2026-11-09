import { pageMeta } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { Wizard } from "./wizard";

export const metadata = pageMeta({ title: "Hangi Dedektörü Almalıyım? 6 Soruda Dedektör Seçimi", description: "Ne arayacağını, bütçeni ve arazini söyle; sana en uygun 3 metal dedektörünü gerekçesiyle önerelim. Ücretsiz, 1 dakika.", path: "/sihirbaz" });

export default async function WizardPage({ searchParams }: { searchParams: Promise<{ amac?: string }> }) {
  const s = await getSettings();
  return <Wizard initialAmac={(await searchParams).amac} whatsapp={s.store.whatsapp} />;
}
