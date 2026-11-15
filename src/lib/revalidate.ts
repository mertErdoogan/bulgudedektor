import { revalidatePath, revalidateTag } from "next/cache";

/**
 * Panelde mağazada görünen bir şey değişince çağrılır: sayfa önbelleği + başlık/menü önbelleği ("header" etiketi)
 * birlikte temizlenir, değişiklik bir sonraki sayfa yenilemesinde görünür.
 */
export function revalidateStore(path: string, type?: "layout" | "page") {
  revalidatePath(path, type);
  revalidateTag("header");
}
