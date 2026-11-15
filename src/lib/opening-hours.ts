/**
 * schema.org biçimindeki çalışma saatlerini ("Mo-Fr 09:00-20:00, Sa 10:00-18:00") okuyup
 * İstanbul saatine göre "şu an açık mı" bilgisini çıkarır. Okunamayan metinde null döner (rozet gösterilmez).
 */
const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
type Slot = { days: number[]; open: number; close: number };

function parse(spec: string): Slot[] {
  const out: Slot[] = [];
  for (const part of spec.split(",").map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^([A-Z][a-z])(?:-([A-Z][a-z]))?\s+(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
    if (!m) continue;
    const a = DAYS.indexOf(m[1] as (typeof DAYS)[number]);
    const b = m[2] ? DAYS.indexOf(m[2] as (typeof DAYS)[number]) : a;
    if (a < 0 || b < 0) continue;
    const days: number[] = [];
    for (let d = a; ; d = (d + 1) % 7) {
      days.push(d);
      if (d === b) break;
    }
    out.push({ days, open: +m[3] * 60 + +m[4], close: +m[5] * 60 + +m[6] });
  }
  return out;
}

/** nextDay: 0 = Pazartesi … 6 = Pazar; bugün daha sonra açılıyorsa nextDay = null */
export type OpenState = { open: boolean; until?: string; next?: string; nextDay?: number | null } | null;

export function openState(spec: string, now = new Date()): OpenState {
  const slots = parse(spec || "");
  if (!slots.length) return null;
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const wd = f.find((p) => p.type === "weekday")!.value.slice(0, 2);
  const day = DAYS.indexOf(wd as (typeof DAYS)[number]);
  const min = +f.find((p) => p.type === "hour")!.value * 60 + +f.find((p) => p.type === "minute")!.value;
  const hm = (x: number) => `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
  const today = slots.find((s) => s.days.includes(day) && min >= s.open && min < s.close);
  if (today) return { open: true, until: hm(today.close) };
  // bir sonraki açılış (bugün daha sonra ya da sonraki günler)
  for (let i = 0; i < 7; i++) {
    const d = (day + i) % 7;
    const s = slots.filter((x) => x.days.includes(d) && (i > 0 || x.open > min)).sort((p, q) => p.open - q.open)[0];
    if (s) return { open: false, next: hm(s.open), nextDay: i === 0 ? null : d };
  }
  return { open: false };
}
