import { checked } from "@/lib/query-result";
import { QueryError } from "@/components/QueryError";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useMinAttendance } from "@/lib/threshold";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, CalendarDays, Percent, Users, Lightbulb } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/StatCard";
import { attendancePercent, teachingSuggestions, type AttendanceStatus } from "@/lib/insights";

export const Route = createFileRoute("/_authenticated/admin/")({ head: () => ({ meta: [{ title: "Dashboard — AttendIQ" }, { name: "description", content: "Dashboard and attendance management in AttendIQ." }, { property: "og:title", content: "Dashboard — AttendIQ" }, { property: "og:description", content: "Dashboard and attendance management in AttendIQ." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: AdminDashboard });

async function fetchDashboard() {
  const [{ data: sessions }, { data: att }, { data: roles }] = await Promise.all([
    checked(supabase.from("class_sessions").select("id,title,session_date").order("session_date")),
    checked(supabase.from("attendance").select("session_id,status,engagement")),
    checked(supabase.from("user_roles").select("user_id").eq("role", "student")),
  ]);
  return { sessions: sessions ?? [], att: att ?? [], students: roles?.length ?? 0 };
}

function AdminDashboard() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["dashboard"], queryFn: fetchDashboard });
  if (error) return <QueryError error={error} retry={refetch} />;
  if (isLoading || !data) return <div className="text-muted-foreground">Loading dashboard…</div>;

  const perSession = data.sessions.map((s) => {
    const rows = data.att.filter((a) => a.session_id === s.id);
    const eng = rows.filter((r) => r.engagement !== null);
    return {
      name: `${s.title.slice(0, 12)} (${s.session_date.slice(5)})`,
      attendance: attendancePercent(rows.map((r) => r.status as AttendanceStatus)),
      engagement: eng.length ? Math.round(eng.reduce((a, r) => a + (r.engagement ?? 0), 0) / eng.length) : null,
      present: rows.filter((r) => r.status !== "absent").length,
    };
  });
  const overall = attendancePercent(data.att.map((a) => a.status as AttendanceStatus));
  const engRows = data.att.filter((a) => a.engagement !== null);
  const avgEng = engRows.length ? Math.round(engRows.reduce((a, r) => a + (r.engagement ?? 0), 0) / engRows.length) : null;
  const last = perSession.at(-1);
  const tips = teachingSuggestions({ attendance: last?.attendance ?? overall, engagement: last ? last.engagement : avgEng });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your classes at a glance.</p>
      </div>
      <ThresholdSetting />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Students" value={data.students} icon={Users} />
        <StatCard label="Sessions" value={data.sessions.length} icon={CalendarDays} />
        <StatCard label="Overall attendance" value={`${overall}%`} icon={Percent} />
        <StatCard label="Avg engagement" value={avgEng === null ? "—" : `${avgEng}%`} icon={Activity} hint="Teacher-rated, approximate" />
      </div>

      {perSession.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
          No sessions yet. Create one under “Sessions & Attendance” to see charts here.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Attendance % per session">
            <BarChart data={perSession}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
              <Bar dataKey="attendance" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartCard>
          <ChartCard title="Engagement trend">
            <LineChart data={perSession}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
              <Line dataKey="engagement" stroke="var(--chart-2)" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ChartCard>
        </div>
      )}

      <div className="rounded-2xl border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Lightbulb className="size-5 text-warning" /> Teaching assistant</h2>
        <p className="mb-4 text-xs text-muted-foreground">Rule-based suggestions from your latest session. Runs entirely in the app, no external AI.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {tips.map((t) => (
            <div key={t.title} className={`rounded-xl border-l-4 bg-muted p-4 ${t.tone === "good" ? "border-success" : t.tone === "warn" ? "border-warning" : "border-destructive"}`}>
              <div className="font-medium">{t.title}</div>
              <div className="text-sm text-muted-foreground">{t.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ThresholdSetting() {
  const { role } = useAuth();
  const { threshold, key } = useMinAttendance();
  const qc = useQueryClient();
  if (role !== "admin") return null;
  return (
    <form className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-5" onSubmit={async (e) => {
      e.preventDefault();
      const min_attendance = Number(new FormData(e.currentTarget).get("min"));
      try {
        await checked(supabase.from("university_settings").upsert({ college_key: key, min_attendance, updated_at: new Date().toISOString() }));
        toast.success("Minimum attendance saved");
        await qc.invalidateQueries({ queryKey: ["min-attendance"] });
      } catch (err) { toast.error(err instanceof Error ? err.message : "Could not save. Please try again."); }
    }}>
      <div className="space-y-1.5"><Label htmlFor="min">Minimum attendance for your university (%)</Label><Input key={threshold} id="min" name="min" type="number" min={1} max={100} required defaultValue={threshold} className="w-32" /></div>
      <Button>Save</Button>
    </form>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </div>
  );
}
