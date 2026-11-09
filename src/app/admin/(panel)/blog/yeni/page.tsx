import { PageHeader } from "@/components/admin/shell";
import { requireStaff } from "@/lib/auth";
import { PostForm } from "../post-form";

export const metadata = { title: "Yeni yazı" };

export default async function NewPost() {
  await requireStaff("cms.manage");
  return (
    <>
      <PageHeader title="Yeni yazı" />
      <PostForm />
    </>
  );
}
