import { readUpload } from "@/lib/storage";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", svg: "image/svg+xml", avif: "image/avif", pdf: "application/pdf" };

export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const rel = path.join("/");
  const priv = rel.startsWith("private/");
  if (priv) {
    // Kişisel belgeler (dekont): yalnızca sipariş yetkisi olan personel
    const { getStaff } = await import("@/lib/auth");
    const { can } = await import("@/lib/permissions");
    const staff = await getStaff();
    if (!staff || !can(staff.permissions, "orders.view")) return new Response("Bulunamadı", { status: 404 });
  }
  try {
    const buf = await readUpload(rel);
    const ext = rel.split(".").pop()?.toLowerCase() ?? "";
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": priv ? "private, no-store" : "public, max-age=31536000, immutable",
        ...(ext === "svg" ? { "Content-Security-Policy": "script-src 'none'" } : {}),
      },
    });
  } catch {
    return new Response("Bulunamadı", { status: 404 });
  }
}
