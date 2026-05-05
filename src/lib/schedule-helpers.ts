import { DateTime } from "luxon";

export function scheduleTimezone(): string {
  return process.env.SCHEDULE_TIMEZONE?.trim() || "America/Sao_Paulo";
}

/** Luxon: seg=1 … dom=7 → esquema Koncluí: dom=0 … sáb=6 */
export function luxonWeekdayToOur(dt: DateTime): number {
  return dt.weekday % 7;
}

export function parseTimeLocal(t: string): { hour: number; minute: number } {
  const p = t.trim().split(":");
  const hour = Math.min(23, Math.max(0, parseInt(p[0] ?? "0", 10) || 0));
  const minute = Math.min(59, Math.max(0, parseInt(p[1] ?? "0", 10) || 0));
  return { hour, minute };
}

/** Data local (YYYY-MM-DD) de um instante UTC ISO na zona dada */
export function utcIsoToLocalDateKey(iso: string, zone: string): string {
  return DateTime.fromISO(iso).setZone(zone).toISODate() ?? "";
}

/** Instante de hoje à hora `timeLocal` ("HH:mm" ou "HH:mm:ss") na zona, em ISO UTC */
export function todayDueUtcIso(timeLocal: string, zone: string): string {
  const { hour, minute } = parseTimeLocal(timeLocal);
  const zoned = DateTime.now().setZone(zone).startOf("day").set({ hour, minute, second: 0, millisecond: 0 });
  return zoned.toUTC().toISO() ?? new Date().toISOString();
}
