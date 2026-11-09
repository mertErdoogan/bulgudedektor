"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Copy, ExternalLink, Plus, Trash2 } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ImageUploader, type Img } from "@/components/admin/image-uploader";
import { Badge, Button, Card, CardHeader, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { EXPERIENCE_LABEL, TECH_LABEL, USE_CASES, WATERPROOF_LABEL, formatTL } from "@/lib/utils";
import { deleteProduct, duplicateProduct, saveProduct } from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  sku: string;
  slug: string;
  barcode: string | null;
  brandId: string | null;
  categoryId: string | null;
  status: string;
  shortDescription: string | null;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  costPrice: number | null;
  taxRate: number;
  stock: number;
  lowStockThreshold: number;
  trackSerial: boolean;
  allowBackorder: boolean;
  sameDayShipping: boolean;
  weightKg: number | null;
  warrantyMonths: number;
  technology: string | null;
  waterproof: string | null;
  experience: string | null;
  useCases: string[];
  badges: string[];
  specs: { key: string; value: string }[];
  boxContents: string[];
  idealFor: string[];
  notFor: string[];
  videoUrl: string | null;
  isFeatured: boolean;
  isPro: boolean;
  trialRentalPrice: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  images: Img[];
};

type Opt = { id: string; name: string };

export function ProductForm({
  product,
  brands,
  categories,
  showCost,
  canDelete,
}: {
  product?: Product;
  brands: Opt[];
  categories: Opt[];
  showCost: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [images, setImages] = useState<Img[]>(product?.images ?? []);
  const [specs, setSpecs] = useState(product?.specs?.length ? product.specs : [{ key: "", value: "" }]);
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [cost, setCost] = useState(String(product?.costPrice ?? ""));
  const [tax, setTax] = useState(String(product?.taxRate ?? 20));
  const [trackSerial, setTrackSerial] = useState(product?.trackSerial ?? false);
  const [name, setName] = useState(product?.name ?? "");
  const [seoDesc, setSeoDesc] = useState(product?.seoDescription ?? "");

  const margin = useMemo(() => {
    const p = Number(price.replace(",", "."));
    const c = Number(cost.replace(",", "."));
    const t = Number(tax) || 0;
    if (!p || !c) return null;
    const net = p / (1 + t / 100);
    const netCost = c / (1 + t / 100);
    return { profit: net - netCost, pct: ((net - netCost) / net) * 100 };
  }, [price, cost, tax]);

  return (
    <ActionForm action={saveProduct} className="pb-24">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="specs" value={JSON.stringify(specs)} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Temel bilgiler" />
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Ürün adı *" className="md:col-span-2">
                <Input name="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Örn. Vanquish 560 Pro-Pack" />
              </Field>
              <Field label="Stok kodu (SKU) *" hint="Benzersiz olmalı; fatura ve depoda bu kod kullanılır.">
                <Input name="sku" defaultValue={product?.sku} required />
              </Field>
              <Field label="Barkod (GTIN)">
                <Input name="barcode" defaultValue={product?.barcode ?? ""} />
              </Field>
              <Field label="Marka">
                <Select name="brandId" defaultValue={product?.brandId ?? ""}>
                  <option value="">Seçin</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Kategori">
                <Select name="categoryId" defaultValue={product?.categoryId ?? ""}>
                  <option value="">Seçin</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Kısa açıklama" hint="Ürün sayfasında başlığın altında ve kartlarda görünür. 1–2 cümle." className="md:col-span-2">
                <Textarea name="shortDescription" defaultValue={product?.shortDescription ?? ""} className="min-h-[70px]" maxLength={300} />
              </Field>
              <Field label="Detaylı açıklama" hint="Markdown destekler: ## başlık, **kalın**, - madde" className="md:col-span-2">
                <Textarea name="description" defaultValue={product?.description ?? ""} className="min-h-[160px]" />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Görseller" description="İlk görsel kapak olarak kullanılır. Sürükle-bırak veya dosya seç; oklarla sırala." />
            <div className="p-5">
              <ImageUploader value={images} onChange={setImages} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Fiyat" />
            <div className="grid gap-4 p-5 md:grid-cols-3">
              <Field label="Satış fiyatı (KDV dahil) *">
                <Input name="price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} required />
              </Field>
              <Field label="Liste fiyatı (üstü çizili)" hint="İndirim göstermek için; boş bırakılabilir.">
                <Input name="compareAtPrice" inputMode="decimal" defaultValue={product?.compareAtPrice ?? ""} />
              </Field>
              <Field label="KDV %">
                <Select name="taxRate" value={tax} onChange={(e) => setTax(e.target.value)}>
                  {[20, 10, 1, 0].map((t) => (
                    <option key={t} value={t}>
                      %{t}
                    </option>
                  ))}
                </Select>
              </Field>
              {showCost ? (
                <>
                  <Field label="Alış fiyatı (KDV dahil)" hint="Sadece yetkili kişiler görür.">
                    <Input name="costPrice" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} />
                  </Field>
                  <div className="flex flex-col justify-end md:col-span-2">
                    {margin ? (
                      <div className="rounded-lg bg-soft px-4 py-3 text-sm">
                        Birim kâr (KDV hariç): <b>{formatTL(margin.profit)}</b> · Marj <b className={margin.pct < 10 ? "text-danger" : "text-ok"}>%{margin.pct.toFixed(1)}</b>
                      </div>
                    ) : (
                      <p className="text-sm text-mute">Alış fiyatını girersen kâr marjı burada hesaplanır.</p>
                    )}
                  </div>
                </>
              ) : null}
              <Field label="Deneme kiralaması (3 gün)" hint="Boşsa ürün sayfasında gösterilmez.">
                <Input name="trialRentalPrice" inputMode="decimal" defaultValue={product?.trialRentalPrice ?? ""} />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Stok ve kargo" />
            <div className="grid gap-4 p-5 md:grid-cols-3">
              {product ? (
                <Field label="Mevcut stok" hint={trackSerial ? "Seri numarası ekledikçe artar." : "Değiştirmek için Stok sayfasını kullanın (hareket kaydı tutulur)."}>
                  <div className="flex h-10 items-center gap-2">
                    <Badge tone={product.stock <= 0 ? "danger" : "neutral"} className="text-sm">
                      {product.stock} adet
                    </Badge>
                    <Link href={`/admin/stok?urun=${product.id}`} className="text-sm font-bold text-link">
                      Stok / seri no →
                    </Link>
                  </div>
                </Field>
              ) : (
                <Field label="Açılış stoğu" hint={trackSerial ? "Seri takipli ürünlerde stok, seri no eklenince oluşur." : undefined}>
                  <Input name="stock" type="number" min={0} defaultValue={0} disabled={trackSerial} />
                </Field>
              )}
              <Field label="Az stok uyarı eşiği">
                <Input name="lowStockThreshold" type="number" min={0} defaultValue={product?.lowStockThreshold ?? 2} />
              </Field>
              <Field label="Ağırlık (kg)">
                <Input name="weightKg" inputMode="decimal" defaultValue={product?.weightKg ?? ""} />
              </Field>
              <div className="flex flex-col gap-3 md:col-span-3">
                <Checkbox name="trackSerial" checked={trackSerial} onChange={(e) => setTrackSerial(e.target.checked)} label={<><b>Seri numarası takibi</b> — her cihaz seri no ile satılır, garanti ve orijinallik sorgusu çalışır.</>} />
                <Checkbox name="sameDayShipping" defaultChecked={product?.sameDayShipping ?? true} label="Aynı gün kargo (kesim saatinden önce verilen siparişler)" />
                <Checkbox name="allowBackorder" defaultChecked={product?.allowBackorder} label="Stok bitince de sipariş alınsın (ön sipariş)" />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Teknik özellikler ve filtreler" description="Kategori filtreleri ve 'Bana hangisi?' sihirbazı bu alanları kullanır." />
            <div className="grid gap-4 p-5 md:grid-cols-3">
              <Field label="Teknoloji">
                <Select name="technology" defaultValue={product?.technology ?? ""}>
                  <option value="">—</option>
                  {Object.entries(TECH_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Su geçirmezlik">
                <Select name="waterproof" defaultValue={product?.waterproof ?? ""}>
                  <option value="">—</option>
                  {Object.entries(WATERPROOF_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Kimin için">
                <Select name="experience" defaultValue={product?.experience ?? ""}>
                  <option value="">—</option>
                  {Object.entries(EXPERIENCE_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Garanti (ay)">
                <Input name="warrantyMonths" type="number" min={0} defaultValue={product?.warrantyMonths ?? 24} />
              </Field>
              <Field label="Kullanım amacı" className="md:col-span-2">
                <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
                  {USE_CASES.map((u) => (
                    <Checkbox key={u.key} name="useCases" value={u.key} defaultChecked={product?.useCases.includes(u.key)} label={u.label} />
                  ))}
                </div>
              </Field>
              <div className="md:col-span-3">
                <p className="mb-2 text-[13px] font-semibold text-mute">Özellik tablosu</p>
                <div className="flex flex-col gap-2">
                  {specs.map((s, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
                      <Input placeholder="Özellik (ör. Frekans)" value={s.key} onChange={(e) => setSpecs(specs.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} />
                      <Input placeholder="Değer (ör. Multi-IQ)" value={s.value} onChange={(e) => setSpecs(specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                      <Button type="button" variant="ghost" size="icon" aria-label="Satırı sil" onClick={() => setSpecs(specs.filter((_, j) => j !== i))}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="soft" size="sm" className="self-start" onClick={() => setSpecs([...specs, { key: "", value: "" }])}>
                    <Plus size={14} /> Satır ekle
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Satış içeriği" description="Her satıra bir madde yazın." />
            <div className="grid gap-4 p-5 md:grid-cols-3">
              <Field label="Kimler için ideal">
                <Textarea name="idealFor" defaultValue={product?.idealFor.join("\n")} />
              </Field>
              <Field label="Bunu bekleme (dürüst sınırlar)">
                <Textarea name="notFor" defaultValue={product?.notFor.join("\n")} />
              </Field>
              <Field label="Kutu içeriği">
                <Textarea name="boxContents" defaultValue={product?.boxContents.join("\n")} />
              </Field>
              <Field label="Tanıtım videosu (YouTube bağlantısı)" className="md:col-span-3">
                <Input name="videoUrl" type="url" defaultValue={product?.videoUrl ?? ""} placeholder="https://www.youtube.com/watch?v=…" />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Arama motoru (SEO)" />
            <div className="grid gap-4 p-5">
              <Field label="URL" hint="Boş bırakırsan ürün adından oluşturulur.">
                <div className="flex items-center gap-1 text-sm text-mute">
                  /urun/
                  <Input name="slug" defaultValue={product?.slug ?? ""} placeholder="vanquish-560-pro-pack" />
                </div>
              </Field>
              <Field label="SEO başlığı" hint={`${(product?.seoTitle ?? name).length}/60 karakter önerilir`}>
                <Input name="seoTitle" defaultValue={product?.seoTitle ?? ""} placeholder={name} />
              </Field>
              <Field label="SEO açıklaması" hint={`${seoDesc.length}/155 karakter önerilir`}>
                <Textarea name="seoDescription" value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} className="min-h-[70px]" />
              </Field>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Yayın durumu" />
            <div className="flex flex-col gap-3 p-5">
              <Select name="status" defaultValue={product?.status ?? "DRAFT"}>
                <option value="ACTIVE">Yayında — mağazada görünür</option>
                <option value="DRAFT">Taslak — sadece panelde</option>
                <option value="ARCHIVED">Arşiv — satıştan kaldırıldı</option>
              </Select>
              {product ? (
                <Link href={`/urun/${product.slug}`} target="_blank" className="flex items-center gap-1 text-sm font-bold text-link">
                  <ExternalLink size={14} /> Mağazada gör
                </Link>
              ) : null}
            </div>
          </Card>
          <Card>
            <CardHeader title="Vitrin" />
            <div className="flex flex-col gap-3 p-5">
              <Checkbox name="isFeatured" defaultChecked={product?.isFeatured} label="Ana sayfa 'Çok satanlar'da göster" />
              <Checkbox name="isPro" defaultChecked={product?.isPro} label="'Profesyonel ve derin arama' bölümünde göster" />
              <Field label="Rozetler" hint="Virgülle ayırın: Yeni, Fırsat, Sınırlı stok">
                <Input name="badges" defaultValue={product?.badges.join(", ")} />
              </Field>
            </div>
          </Card>
          {product ? (
            <Card>
              <CardHeader title="Diğer işlemler" />
              <div className="flex flex-col gap-2 p-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    const r = await duplicateProduct(product.id);
                    if (r.ok) {
                      toast.success(r.message);
                      if (r.redirect) window.dispatchEvent(new Event("arena-nav-start")), router.push(r.redirect);
                    } else toast.error(r.error);
                  }}
                >
                  <Copy size={16} /> Kopyasını oluştur
                </Button>
                {canDelete ? (
                  <Button
                    type="button"
                    variant="danger-ghost"
                    onClick={async () => {
                      if (!confirm(`"${product.name}" silinsin mi? Siparişi varsa silinmez, arşivlenir.`)) return;
                      const r = await deleteProduct(product.id);
                      if (r.ok) {
                        toast.success(r.message);
                        window.dispatchEvent(new Event("arena-nav-start")), router.push(r.redirect ?? "/admin/urunler");
                      } else toast.error(r.error);
                    }}
                  >
                    <Trash2 size={16} /> Ürünü sil
                  </Button>
                ) : null}
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      <div className="fixed right-0 bottom-0 left-0 z-20 border-t border-line bg-white/95 backdrop-blur lg:left-60">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link href="/admin/urunler" className="flex items-center gap-1 text-sm font-semibold text-mute hover:text-deep">
            <ArrowLeft size={16} /> Ürünlere dön
          </Link>
          <SubmitButton size="lg" pendingText="Kaydediliyor…">
            {product ? "Değişiklikleri kaydet" : "Ürünü oluştur"} <ArrowRight size={16} />
          </SubmitButton>
        </div>
      </div>
    </ActionForm>
  );
}
