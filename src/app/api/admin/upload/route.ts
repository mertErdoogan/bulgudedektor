import { NextResponse } from "next/server";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { getStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { saveUpload } from "@/lib/storage";

export async function POST(req: Request) {
  const staff = await getStaff();
  if (!staff || !(can(staff.permissions, "products.edit") || can(staff.permissions, "cms.manage") || can(staff.permissions, "catalog.manage")))
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  const fd = await req.formData();
  const files = fd.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return NextResponse.json({ error: "Dosya seçilmedi" }, { status: 400 });
  try {
    const out = [];
    for (const f of files) {
      const saved = await saveUpload(f);
      const [row] = await db.insert(mediaAssets).values(saved).returning();
      out.push(row);
    }
    return NextResponse.json({ files: out });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Yükleme başarısız" }, { status: 400 });
  }
}
