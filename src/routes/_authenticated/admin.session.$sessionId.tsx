import { checked } from "@/lib/query-result";
import { QueryError } from "@/components/QueryError";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { AttendanceStatus } from "@/lib/insights";

export const Route = createFileRoute("/_authenticated/admin/session/$sessionId")({ head: () => ({ meta: [{ title: "Mark attendance — AttendIQ" }, { name: "description", content: "Mark attendance and attendance management in AttendIQ." }, { property: "og:title", content: "Mark attendance — AttendIQ" }, { property: "og:description", content: "Mark attendance and attendance management in AttendIQ." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: MarkAttendance });

type Row = { status: AttendanceStatus; engagement: number };

function MarkAttendance() {
  const { sessionId } = Route.useParams();
  const qc = useQueryClient();
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [saving, setSaving] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["mark", sessionId],
    queryFn: async () => {
      const [{ data: session }, { data: roles }, { data: att }] = await Promise.all([
        checked(supabase.from("class_sessions").select("*").eq("id", sessionId).maybeSingle()),
        checked(supabase.from("user_roles").select("user_id").eq("role", "student")),
        checked(supabase.from("attendance").select("student_id,status,engagement").eq("session_id", sessionId)),
      ]);
      const { data: links } = session?.subject_id ? await checked(supabase.from("subject_students").select("student_id").eq("subject_id", session.subject_id)) : { data: null };
      const ids = links ? links.map((l) => l.student_id) : (roles ?? []).map((r) => r.user_id);
      const { data: students } = ids.length
        ? await checked(supabase.from("profiles").select("id,full_name,roll_no,email").in("id", ids).order("full_name"))
        : { data: [] };
      return { session, students: students ?? [], att: att ?? [] };
    },
  });

  useEffect(() => {
    if (!data) return undefined;
    const init: Record<string, Row> = {};
    for (const s of data.students) {
      const a = data.att.find((x) => x.student_id === s.id);
      init[s.id] = { status: (a?.status as AttendanceStatus) ?? "present", engagement: a?.engagement ?? 70 };
    }
    setRows(init);
    return undefined;
  }, [data]);

  if (error) return <QueryError error={error} retry={refetch} />;
  if (isLoading || !data) return <div className="text-muted-foreground">Loading…</div>;
  if (!data.session) return <div>Session not found.</div>;

  const save = async () => {
    setSaving(true);
    try {
    const payload = Object.entries(rows).map(([student_id, r]) => ({
      session_id: sessionId,
      student_id,
      status: r.status,
      engagement: r.status === "absent" ? null : r.engagement,
    }));
    await checked(supabase.from("attendance").upsert(payload, { onConflict: "session_id,student_id" }));
    toast.success("Attendance saved");
    await qc.invalidateQueries();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save attendance. Please try again."); }
    finally { setSaving(false); }
  };

  const setAll = (status: AttendanceStatus) =>
    setRows((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, { ...v, status }])));

  return (
    <div className="space-y-6">
      <Link to="/admin/sessions" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All sessions
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{data.session.title}</h1>
          <p className="text-muted-foreground">{data.session.subject || "General"} · {new Date(data.session.session_date).toDateString()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={saving} onClick={() => setAll("present")}><CheckCheck className="size-4" /> All present</Button>
          <Button variant="hero" onClick={save} disabled={saving || !data.students.length}>{saving ? "Saving…" : "Save attendance"}</Button>
        </div>
      </div>

      {data.students.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
          No students have been added to this subject yet. Add registered students under Subjects.
        </div>
      ) : (
        <div className="divide-y rounded-2xl border bg-card">
          {data.students.map((s) => {
            const r = rows[s.id];
            if (!r) return null;
            return (
              <div key={s.id} className="grid items-center gap-4 p-4 md:grid-cols-[1fr_auto_220px]">
                <div>
                  <div className="font-medium">{s.full_name || s.email}</div>
                  <div className="text-xs text-muted-foreground">{s.roll_no ? `Roll ${s.roll_no}` : s.email}</div>
                </div>
                <div className="flex gap-1 rounded-lg bg-muted p-1">
                  {(["present", "late", "absent"] as const).map((st) => (
                    <Button type="button" size="sm" variant={r.status === st ? "default" : "ghost"} disabled={saving} aria-pressed={r.status === st}
                      key={st}
                      onClick={() => setRows((p) => ({ ...p, [s.id]: { ...r, status: st } }))}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                        r.status === st
                          ? st === "present" ? "bg-success text-background" : st === "late" ? "bg-warning text-background" : "bg-destructive text-destructive-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {st}
                    </Button>
                  ))}
                </div>
                <div className={r.status === "absent" ? "pointer-events-none opacity-30" : ""}>
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Engagement</span><span>{r.engagement}%</span></div>
                  <Slider value={[r.engagement]} max={100} step={5} onValueChange={([v]) => setRows((p) => ({ ...p, [s.id]: { ...r, engagement: v ?? r.engagement } }))} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Engagement is your own approximate rating of participation, not an automatic measurement.</p>
    </div>
  );
}
