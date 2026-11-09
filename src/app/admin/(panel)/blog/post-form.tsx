import { asc, ne } from "drizzle-orm";
import { db } from "@/db";
import { categories, products, type posts } from "@/db/schema";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { CountedField } from "@/components/admin/counted-field";
import { SingleImageField } from "@/components/admin/single-image-field";
import { Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import { savePost } from "./actions";

type Post = typeof posts.$inferSelect;
const CATS = ["Rehber", "Cihaz seçimi", "Karşılaştırma", "Kullanım ve ayarlar", "Bakım", "Mevzuat", "Saha notları"];
const local = (d: Date | null | undefined) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export async function PostForm({ post }: { post?: Post }) {
  const [prods, cats] = await Promise.all([
    db.select({ id: products.id, name: products.name }).from(products).where(ne(products.status, "ARCHIVED")).orderBy(asc(products.name)),
    db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.sortOrder)),
  ]);
  return (
    <ActionForm action={savePost} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      {post ? <input type="hidden" name="id" value={post.id} /> : null}
      <div className="flex min-w-0 flex-col gap-5">
        <Card>
          <CardHeader title="İçerik" description="Başlığı kullanıcının Google'a yazacağı soru gibi kur: 'Yeni başlayan için hangi dedektör alınır?'" />
          <div className="flex flex-col gap-4 p-5">
            <Field label="Başlık (H1) *"><CountedField name="title" defaultValue={post?.title} min={30} max={70} /></Field>
            <Field
              label="Kısa cevap (doğrudan yanıt) *"
              hint="Sorunun cevabını İLK cümlede ver, 40–60 kelime. Google AI Overviews, ChatGPT, Perplexity ve Claude çoğunlukla bu paragrafı alıntılar. Rakam, model adı, net öneri içersin."
            >
              <CountedField name="answer" defaultValue={post?.answer} min={40} max={60} unit="word" multiline />
            </Field>
            <Field label="Liste özeti" hint="Blog kartlarında ve RSS'te görünür, 1–2 cümle."><Textarea name="excerpt" defaultValue={post?.excerpt ?? ""} className="min-h-[60px]" /></Field>
            <Field
              label="Metin (Markdown)"
              hint={<>## Alt başlık (soru biçiminde) · ### ara başlık · - liste · 1. adım · **kalın** · [link](/urun/...) · {"| tablo | sütun |"} · {"> not kutusu"}. Her bölüm kendi sorusuna ilk cümlede cevap versin.</>}
            >
              <Textarea name="content" defaultValue={post?.content ?? ""} className="min-h-[420px] font-mono text-[12.5px] leading-relaxed" />
            </Field>
            <Field label="Yazıya özel SSS" hint="Her satıra: Soru | Cevap — sayfada görünür ve FAQ şemasına eklenir.">
              <Textarea name="faq" defaultValue={(post?.faq ?? []).map((f) => `${f.q} | ${f.a}`).join("\n")} className="min-h-[140px] text-[13px]" />
            </Field>
          </div>
        </Card>
        <Card>
          <CardHeader title="Arama motoru görünümü" description="Boş bırakırsan başlık ve liste özeti kullanılır." />
          <div className="flex flex-col gap-4 p-5">
            <Field label="SEO başlığı"><CountedField name="seoTitle" defaultValue={post?.seoTitle} min={40} max={60} /></Field>
            <Field label="Meta açıklama"><CountedField name="seoDescription" defaultValue={post?.seoDescription} min={120} max={160} multiline /></Field>
          </div>
        </Card>
      </div>
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader title="Yayın" />
          <div className="flex flex-col gap-4 p-5">
            <Field label="Durum">
              <Select name="status" defaultValue={post?.status ?? "DRAFT"}>
                <option value="DRAFT">Taslak</option>
                <option value="PUBLISHED">Yayında</option>
              </Select>
            </Field>
            <Field label="Yayın tarihi" hint="İleri tarih verirsen o zamana kadar görünmez."><Input type="datetime-local" name="publishedAt" defaultValue={local(post?.publishedAt)} /></Field>
            <Field label="URL"><Input name="slug" defaultValue={post?.slug} placeholder="otomatik" /></Field>
            <Field label="Kategori">
              <Input name="category" list="post-cats" defaultValue={post?.category ?? "Rehber"} />
              <datalist id="post-cats">{CATS.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Etiketler" hint="Virgülle ayır"><Input name="tags" defaultValue={post?.tags.join(", ")} /></Field>
            <Field label="Kapak görseli" hint="16:9, en az 1200 px genişlik"><SingleImageField name="coverImage" defaultValue={post?.coverImage} /></Field>
            <SubmitButton>{post ? "Kaydet" : "Oluştur"}</SubmitButton>
          </div>
        </Card>
        <Card>
          <CardHeader title="Yazar (E-E-A-T)" description="Gerçek bir kişi ve uzmanlığı: Google ve AI motorları deneyimi olan yazarı daha güvenilir bulur." />
          <div className="flex flex-col gap-4 p-5">
            <Field label="Ad"><Input name="authorName" defaultValue={post?.authorName ?? "Bulgu Dedektör Uzman Ekibi"} /></Field>
            <Field label="Unvan"><Input name="authorTitle" defaultValue={post?.authorTitle ?? ""} placeholder="12 yıllık saha uzmanı, Minelab eğitmeni" /></Field>
            <Field label="Kısa biyografi"><Textarea name="authorBio" defaultValue={post?.authorBio ?? ""} className="min-h-[80px]" /></Field>
          </div>
        </Card>
        <Card>
          <CardHeader title="İç bağlantılar" description="Seçilen ürün ve kategorilerin sayfasında bu yazı 'Uzman rehberleri' olarak görünür." />
          <div className="flex flex-col gap-4 p-5">
            <Field label="İlgili ürünler" hint="Ctrl/⌘ ile çoklu seçim">
              <Select name="relatedProductIds" multiple defaultValue={post?.relatedProductIds ?? []} className="h-44">
                {prods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="İlgili kategoriler">
              <div className="flex flex-col gap-1.5">
                {cats.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="relatedCategoryIds" value={c.id} defaultChecked={post?.relatedCategoryIds.includes(c.id)} className="h-4 w-4 accent-[#3f6b4f]" /> {c.name}
                  </label>
                ))}
              </div>
            </Field>
          </div>
        </Card>
      </div>
    </ActionForm>
  );
}
