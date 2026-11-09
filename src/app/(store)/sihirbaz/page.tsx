import { getSettings } from "@/lib/settings";
import { Wizard } from "./wizard";

export const metadata = { title: "Bana hangisi? 6 soruda dedektör seçimi" };

export default async function WizardPage({ searchParams }: { searchParams: Promise<{ amac?: string }> }) {
  const s = await getSettings();
  return <Wizard initialAmac={(await searchParams).amac} whatsapp={s.store.whatsapp} />;
}
