import { checked } from "@/lib/query-result";
import { QueryError } from "@/components/QueryError";
import { AccountUnavailable } from '@/components/AccountUnavailable';
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { Flame, Target, Activity, CalendarCheck, Download, LayoutDashboard, Percent, XCircle, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppShell, FullPageLoader } from "@/components/AppShell";
import { StatCard, StatusBadge } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { attendanceBand, attendancePlanner, bandClass, classesStillNeeded, currentStreak, attendancePercent, downloadCsv, type AttendanceStatus } from "@/lib/insights";
import { useMinAttendance } from "@/lib/threshold";

export const Route = createFileRoute("/_authenticated/student")({
  beforeLoad: async ({ context }) => {
    const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', context.user.id);
    if (error) throw error;
    if (data?.some(r => r.role === 'admin' || r.role === 'teacher')) throw redirect({ to: "/admin" });
    if (!data?.some(r => r.role === 'student')) throw redirect({ to: '/auth' });
  },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "My attendance — AttendIQ" },
      { name: "description", content: "Check your attendance history and percentage." },
      { property: "og:title", content: "My attendance — AttendIQ" },
      { property: "og:description", content: "Check your attendance history and percentage." },
    ],
  }),
  component: StudentPage,
});

function StudentPage() {
  const { user, role, loading, profile, error: accountError } = useAuth();
  const { data: records = [], isLoading, error, refetch } = useQuery({
    queryKey: ["my-attendance", user?.id],
    enabled: !!user && role === "student",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("status,engagement,class_sessions(title,subject,subject_id,session_date)")
        .eq("student_id", user?.id ?? "");
      if (error) throw error;
      return (data ?? []).sort((a, b) => (b.class_sessions?.session_date ?? "").localeCompare(a.class_sessions?.session_date ?? ""));
    },
  });

  const { threshold } = useMinAttendance();
  const { data: subjects = [] } = useQuery({
    queryKey: ["my-subjects", user?.id],
    enabled: !!user && role === "student",
    queryFn: async () => ((await checked(supabase.from("subject_students").select("subjects(id,name,total_sessions)").eq("student_id", user?.id ?? ""))).data ?? []).flatMap((r) => (r.subjects ? [r.subjects] : [])),
  });

  if (loading) return <FullPageLoader />;
  if (accountError || role !== "student") return <AccountUnavailable />;

  const pct = attendancePercent(records.map((r) => r.status as AttendanceStatus));
  const absent = records.filter((r) => r.status === "absent").length;
  const eng = records.filter((r) => r.engagement !== null);
  const avgEng = eng.length ? Math.round(eng.reduce((a, r) => a + (r.engagement ?? 0), 0) / eng.length) : null;

  const statuses = records.map((r) => r.status as AttendanceStatus);
  const streak = currentStreak(statuses);
  const plan = attendancePlanner(records.length - absent, records.length, threshold);

  if (error) return <QueryError error={error} retry={refetch} />;
  return (
    <AppShell nav={[{ to: "/student", label: "My attendance", icon: LayoutDashboard }, { to: '/profile', label: 'My profile', icon: UserRound }]} title="Student portal">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Hi {profile?.full_name?.split(" ")[0] || "there"} 👋</h1>
          <p className="text-muted-foreground">Here is your attendance record{profile?.roll_no ? ` · Roll ${profile.roll_no}` : ""}.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Attendance" value={records.length ? `${pct}%` : "—"} icon={Percent} />
          <StatCard label="Classes recorded" value={records.length} icon={CalendarCheck} />
          <StatCard label="Absences" value={absent} icon={XCircle} />
          <StatCard label="Avg engagement" value={avgEng === null ? "—" : `${avgEng}%`} icon={Activity} />
        </div>
        {records.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-2xl border bg-card p-5">
              <Flame className="mt-0.5 size-6 shrink-0 text-primary" />
              <div>
                <div className="text-sm text-muted-foreground">Attendance streak</div>
                <div className="text-2xl font-semibold">{streak} {streak === 1 ? "class" : "classes"}</div>
                <p className="mt-1 text-sm text-muted-foreground">{streak === 0 ? "Attend your next class to start a new streak." : streak >= 5 ? "On fire! Keep the streak going." : "Nice — keep showing up to grow it."}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border bg-card p-5">
              <Target className="mt-0.5 size-6 shrink-0 text-primary" />
              <div>
                <div className="text-sm text-muted-foreground">Attendance planner</div>
                {plan.mustAttend > 0 ? (
                  <><div className="text-2xl font-semibold">Attend next {plan.mustAttend}</div><p className="mt-1 text-sm text-muted-foreground">Attend {plan.mustAttend} classes in a row to reach {threshold}%.</p></>
                ) : (
                  <><div className="text-2xl font-semibold">{plan.canMiss} spare {plan.canMiss === 1 ? "class" : "classes"}</div><p className="mt-1 text-sm text-muted-foreground">{plan.canMiss === 0 ? `You're right at ${threshold}% — don't miss the next class.` : `You could miss ${plan.canMiss} and still stay at ${threshold}% or above.`}</p></>
                )}
              </div>
            </div>
          </div>
        )}
        <section className="border-y py-5"><h2 className="mb-4 text-lg font-semibold">My subjects</h2>{!subjects.length ? <p className="text-sm text-muted-foreground">Your teacher has not added you to a subject yet.</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{subjects.map(subject => {
          const subjectRecords = records.filter(r => r.class_sessions?.subject_id === subject.id);
          const attended = subjectRecords.filter(r => r.status !== 'absent').length;
          const percent = attendancePercent(subjectRecords.map(r => r.status as AttendanceStatus));
          const plan = classesStillNeeded(attended, subjectRecords.length, subject.total_sessions, threshold);
          const tone = bandClass[subjectRecords.length ? attendanceBand(percent, threshold) : 'green'];
          return <div key={subject.id} className="space-y-2"><div className="flex justify-between gap-3 text-sm"><span className="break-words font-medium">{subject.name}</span><span className={`shrink-0 font-semibold ${tone}`}>{subjectRecords.length ? `${percent}%` : '—'}</span></div><Progress value={percent} /><p className="text-xs text-muted-foreground">{attended} attended of {subjectRecords.length} held · {subject.total_sessions} sessions in total</p><p className={`text-sm ${tone}`}>{plan.need === 0 ? `You have met the ${threshold}% minimum.` : plan.reachable ? `Attend ${plan.need} more of the remaining ${plan.remaining} classes to reach ${threshold}%.` : `${plan.need} more classes are needed but only ${plan.remaining} remain — speak to your teacher.`}</p></div>;
        })}</div>}</section>
        {records.length > 0 && (
          <div className="rounded-2xl border bg-card p-5">
            <div className="mb-2 flex justify-between text-sm"><span>Progress toward {threshold}% requirement</span><span className="font-semibold">{pct}%</span></div>
            <Progress value={pct} />
            <p className={`mt-3 text-sm ${pct < threshold ? "text-destructive" : "text-success"}`}>
              {pct < threshold ? `You are below ${threshold}%. Try not to miss upcoming classes.` : "Great job — you're meeting the attendance requirement."}
            </p>
          </div>
        )}
        <div className="rounded-2xl border bg-card">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="font-semibold">Attendance history</h2>
            <Button
              variant="outline" size="sm" disabled={!records.length}
              onClick={() => downloadCsv("my-attendance.csv", records.map((r) => ({ date: r.class_sessions?.session_date ?? "", session: r.class_sessions?.title ?? "", subject: r.class_sessions?.subject ?? "", status: r.status, engagement: r.engagement })))}
            >
              <Download className="size-4" /> CSV
            </Button>
          </div>
          {isLoading ? (
            <div className="p-6 text-muted-foreground">Loading…</div>
          ) : !records.length ? (
            <div className="p-10 text-center text-muted-foreground">No attendance has been recorded for you yet.</div>
          ) : (
            <div className="divide-y">
              {records.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium">{r.class_sessions?.title}</div>
                    <div className="text-xs text-muted-foreground">{r.class_sessions?.subject || "General"} · {r.class_sessions?.session_date}</div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
