import { getTableName, sql, type Column } from "drizzle-orm";

/**
 * Tablo adıyla nitelenmiş sütun: "tablo"."sütun".
 * Drizzle tek tablolu select'lerde sütunları niteliksiz yazar; ilişkili alt
 * sorgularda dıştaki "id" içteki tablonun "id"sine bağlanır ve sonuç sessizce
 * yanlış olur. sql`` içindeki alt sorgularda her sütunu q() ile yaz.
 */
export function q(col: Column) {
  return sql`${sql.identifier(getTableName(col.table))}.${sql.identifier(col.name)}`;
}
