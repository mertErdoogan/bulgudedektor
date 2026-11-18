import { pageMeta } from "@/lib/seo";
import { getT } from "@/lib/i18n/server";
import { activeBrandNames } from "@/lib/settings";
import { Catalog, type SP } from "@/components/store/catalog";

export const generateMetadata = async () => {
  const names = (await activeBrandNames()).slice(0, 4);
  const t = await getT();
  const lead = names.length ? t("all.lead", { markalar: names.join(", ") }) : t("all.leadNone");
  return pageMeta({ title: t("all.metaTitle"), description: `${lead} ${t("all.metaDesc")}`, path: "/urunler" });
};

export default async function AllProducts({ searchParams }: { searchParams: Promise<SP> }) {
  const t = await getT();
  return <Catalog title={t("all.title")} crumbs={[{ href: "/urunler", label: t("all.title") }]} sp={await searchParams} />;
}
