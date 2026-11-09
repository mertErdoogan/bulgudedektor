import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { productQuestions, reviews } from "@/db/schema";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { PageHeader } from "@/components/admin/shell";
import { Badge, Button, Card, CardHeader, Checkbox, Input, Textarea } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { answerQuestion, moderateReview } from "./actions";

export const metadata = { title: "Yorum ve sorular" };

export default async function ReviewsPage() {
  await requireStaff("reviews.manage");
  const [rv, qs] = await Promise.all([
    db.query.reviews.findMany({ orderBy: [reviews.isApproved, desc(reviews.createdAt)], with: { product: { columns: { name: true, slug: true } } }, limit: 100 }),
    db.query.productQuestions.findMany({ orderBy: desc(productQuestions.createdAt), with: { product: { columns: { name: true, slug: true } } }, limit: 100 }),
  ]);
  return (
    <>
      <PageHeader title="Yorum ve sorular" description="Yorumlar onaylanmadan yayınlanmaz. Olumsuz yorumları gizlemek yerine yanıtlamak güven verir." />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Ürün soruları" description={`${qs.filter((q) => !q.answer).length} yanıt bekliyor`} />
          <ul className="divide-y divide-line">
            {qs.map((q) => (
              <li key={q.id} className="p-5 text-sm">
                <p className="text-xs text-mute">
                  <Link href={`/urun/${q.product.slug}`} target="_blank" className="font-bold text-link">{q.product.name}</Link> · {q.name} ({q.contact}) · {formatDate(q.createdAt)}
                </p>
                <p className="mt-1 font-semibold">{q.question}</p>
                <ActionForm action={answerQuestion} className="mt-2 flex flex-col gap-2">
                  <input type="hidden" name="id" value={q.id} />
                  <Textarea name="answer" defaultValue={q.answer ?? ""} placeholder="Yanıtın" className="min-h-[60px]" />
                  <div className="flex items-center justify-between">
                    <Checkbox name="isPublished" defaultChecked={q.isPublished || !q.answer} label="Ürün sayfasında yayınla" />
                    <span className="flex gap-2">
                      <Button type="submit" name="op" value="delete" variant="danger-ghost" size="sm">Sil</Button>
                      <SubmitButton size="sm">{q.answer ? "Güncelle" : "Yanıtla"}</SubmitButton>
                    </span>
                  </div>
                </ActionForm>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Yorumlar" description={`${rv.filter((r) => !r.isApproved).length} onay bekliyor`} />
          <ul className="divide-y divide-line">
            {rv.map((r) => (
              <li key={r.id} className="p-5 text-sm">
                <p className="flex flex-wrap items-center gap-2 text-xs text-mute">
                  <Link href={`/urun/${r.product.slug}`} target="_blank" className="font-bold text-link">{r.product.name}</Link> · {r.name} · {formatDate(r.createdAt)}
                  {r.isVerified ? <Badge tone="brand">Doğrulanmış alıcı</Badge> : null}
                  {r.isApproved ? <Badge tone="ok">Yayında</Badge> : <Badge tone="gold">Onay bekliyor</Badge>}
                </p>
                <p className="mt-1 text-gold">{"★".repeat(r.rating)}<span className="text-line">{"★".repeat(5 - r.rating)}</span></p>
                <p className="mt-1">{r.body}</p>
                <ActionForm action={moderateReview} className="mt-2 flex flex-col gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <Input name="reply" defaultValue={r.reply ?? ""} placeholder="Mağaza yanıtı (isteğe bağlı)" />
                  <div className="flex justify-end gap-2">
                    <Button type="submit" name="op" value="delete" variant="danger-ghost" size="sm">Sil</Button>
                    {r.isApproved ? <Button type="submit" name="op" value="hide" variant="outline" size="sm">Gizle</Button> : null}
                    <Button type="submit" name="op" value={r.isApproved ? "reply" : "approve"} size="sm">{r.isApproved ? "Yanıtı kaydet" : "Onayla"}</Button>
                  </div>
                </ActionForm>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
