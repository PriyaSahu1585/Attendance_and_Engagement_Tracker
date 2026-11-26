import { checked } from "@/lib/query-result";
import { QueryError } from "@/components/QueryError";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { attendanceBand, attendancePercent, bandClass, downloadCsv, type AttendanceStatus } from "@/lib/insights";
import { useMinAttendance } from "@/lib/threshold";

export const Route = createFileRoute("/_authenticated/admin/students")({ head: () => ({ meta: [{ title: "Students — AttendIQ" }, { name: "description", content: "Students and attendance management in AttendIQ." }, { property: "og:title", content: "Students — AttendIQ" }, { property: "og:description", content: "Students and attendance management in AttendIQ." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Students });

function Students() {
  const [q, setQ] = useState("");
  const { threshold } = useMinAttendance();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data: roles } = await checked(supabase.from("user_roles").select("user_id").eq("role", "student"));
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) return [];
      const [{ data: profiles }, { data: att }] = await Promise.all([
        checked(supabase.from("profiles").select("id,full_name,email,roll_no").in("id", ids).order("full_name")),
        checked(supabase.from("attendance").select("student_id,status,engagement")),
      ]);
      return (profiles ?? []).map((p) => {
        const mine = (att ?? []).filter((a) => a.student_id === p.id);
        const eng = mine.filter((m) => m.engagement !== null);
        return {
          ...p,
          sessions: mine.length,
          percent: attendancePercent(mine.map((m) => m.status as AttendanceStatus)),
          engagement: eng.length ? Math.round(eng.reduce((a, m) => a + (m.engagement ?? 0), 0) / eng.length) : null,
        };
      });
    },
  });

  const list = (data ?? []).filter((s) => `${s.full_name} ${s.email} ${s.roll_no}`.toLowerCase().includes(q.toLowerCase()));

  if (error) return <QueryError error={error} retry={refetch} />;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Students</h1>
          <p className="text-muted-foreground">Attendance summary for every registered student.</p>
        </div>
        <Button
          variant="outline"
          disabled={!list.length}
          onClick={() =>
            downloadCsv("students-report.csv", list.map((s) => ({ name: s.full_name, roll_no: s.roll_no, email: s.email, sessions: s.sessions, attendance_percent: s.percent, avg_engagement: s.engagement })))
          }
        >
          <Download className="size-4" /> Export CSV
        </Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search name, email or roll no" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {isLoading ? (
        <div className="text-muted-foreground">Loading students…</div>
      ) : !list.length ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">No students found. Students appear here once they create an account.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="p-4 font-medium">Student</th><th className="p-4 font-medium">Roll</th>
                <th className="p-4 font-medium">Sessions</th><th className="p-4 font-medium">Attendance</th><th className="p-4 font-medium">Engagement</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="p-4"><div className="font-medium">{s.full_name || "—"}</div><div className="text-xs text-muted-foreground">{s.email}</div></td>
                  <td className="p-4">{s.roll_no || "—"}</td>
                  <td className="p-4">{s.sessions}</td>
                  <td className="p-4">
                    <span className={`font-semibold ${s.sessions ? bandClass[attendanceBand(s.percent, threshold)] : ""}`}>{s.sessions ? `${s.percent}%` : "—"}</span>
                    {s.sessions > 0 && s.percent < threshold && <span className="ml-2 text-xs text-muted-foreground">below {threshold}%</span>}
                  </td>
                  <td className="p-4">{s.engagement === null ? "—" : `${s.engagement}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
