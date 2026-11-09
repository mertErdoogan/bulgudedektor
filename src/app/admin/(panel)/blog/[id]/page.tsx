import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { PageHeader } from "@/components/admin/shell";
import { requireStaff } from "@/lib/auth";
import { PostForm } from "../post-form";

export const metadata = { title: "Yazıyı düzenle" };

export default async function EditPost({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("cms.manage");
  const post = await db.query.posts.findFirst({ where: eq(posts.id, (await params).id) });
  if (!post) notFound();
  return (
    <>
      <PageHeader title={post.title} description={post.status === "PUBLISHED" ? <a className="text-link" href={`/blog/${post.slug}`} target="_blank">/blog/{post.slug} ↗</a> : "Taslak"} />
      <PostForm post={post} />
    </>
  );
}
