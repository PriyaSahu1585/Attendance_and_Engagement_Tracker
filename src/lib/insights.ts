// Pure, offline rule-based helpers for attendance math and teaching suggestions.

export type AttendanceStatus = "present" | "absent" | "late";

/** Late counts as attended. Returns a 0-100 integer, or 0 if no records. */
export function attendancePercent(statuses: AttendanceStatus[]): number {
  if (!statuses.length) return 0;
  const attended = statuses.filter((s) => s !== "absent").length;
  return Math.round((attended / statuses.length) * 100);
}

/** Students below 75% attendance are flagged as at risk. */
export const AT_RISK_THRESHOLD = 75;
export function isAtRisk(percent: number) {
  return percent < AT_RISK_THRESHOLD;
}

export type Suggestion = { title: string; detail: string; tone: "good" | "warn" | "alert" };

export function teachingSuggestions(m: { attendance: number; engagement: number | null }): Suggestion[] {
  const out: Suggestion[] = [];
  if (m.attendance < 60)
    out.push({ title: "Low turnout", detail: "Fewer than 60% attended. Send a reminder and share session notes with absentees.", tone: "alert" });
  else if (m.attendance < AT_RISK_THRESHOLD)
    out.push({ title: "Attendance dipping", detail: "Consider a quick check-in with students who missed recent classes.", tone: "warn" });
  if (m.engagement !== null) {
    if (m.engagement < 50)
      out.push({ title: "Engagement is low", detail: "Take a 5-minute break or switch to an interactive activity like a poll or pair discussion.", tone: "alert" });
    else if (m.engagement < 70)
      out.push({ title: "Mixed engagement", detail: "Add a short quiz or ask open questions to bring participation up.", tone: "warn" });
    else out.push({ title: "Class is engaged", detail: "Great energy — a good moment to introduce harder material.", tone: "good" });
  }
  if (!out.length) out.push({ title: "All good", detail: "Attendance is healthy. Keep the current pace.", tone: "good" });
  return out;
}

export function toCsv(rows: Record<string, string | number | null>[]): string {
  if (!rows.length) return "";
  const first = rows[0];
  if (!first) return "";
  const headers = Object.keys(first);
  const esc = (v: unknown) => {
    let value = String(v ?? "");
    if (typeof v === "string" && /^[\s]*[=+@-]/.test(value)) value = `'${value}`;
    return `"${value.replace(/"/g, '""')}"`;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

export function downloadCsv(filename: string, rows: Record<string, string | number | null>[]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Consecutive attended (present/late) classes, counting back from the most recent. Input newest-first. */
export function currentStreak(statusesNewestFirst: AttendanceStatus[]): number {
  let n = 0;
  for (const s of statusesNewestFirst) {
    if (s === "absent") break;
    n++;
  }
  return n;
}

/**
 * Bunk planner: how many upcoming classes a student must attend in a row to reach the
 * requirement, or how many they can miss while staying at or above it.
 */
export function attendancePlanner(attended: number, total: number, threshold = AT_RISK_THRESHOLD) {
  if (total === 0) return { mustAttend: 0, canMiss: 0 };
  const t = threshold / 100;
  if (attended / total >= t) {
    return { mustAttend: 0, canMiss: Math.max(0, Math.floor(attended / t - total + 1e-9)) };
  }
  return { mustAttend: Math.ceil((t * total - attended) / (1 - t) - 1e-9), canMiss: 0 };
}

export type Band = "green" | "yellow" | "red";
export const bandClass: Record<Band, string> = { green: "text-success", yellow: "text-warning", red: "text-destructive" };

/** Green at or above the university minimum, yellow within 10 points below it, red otherwise. */
export function attendanceBand(percent: number, threshold: number): Band {
  return percent >= threshold ? "green" : percent >= threshold - 10 ? "yellow" : "red";
}

/** For a subject with a fixed number of sessions: how many more classes the student must attend to meet the minimum. */
export function classesStillNeeded(attended: number, held: number, total: number, threshold: number) {
  const need = Math.max(0, Math.ceil((threshold * total) / 100 - 1e-9) - attended);
  const remaining = Math.max(0, total - held);
  return { need, remaining, reachable: need <= remaining };
}
