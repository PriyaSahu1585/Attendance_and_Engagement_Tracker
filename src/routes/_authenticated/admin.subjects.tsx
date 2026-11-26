import { checked } from "@/lib/query-result";
import { QueryError } from "@/components/QueryError";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/subjects")({ head: () => ({ meta: [{ title: "Subjects — AttendIQ" }, { name: "description", content: "Set up your subjects and add students to them." }, { property: "og:title", content: "Subjects — AttendIQ" }, { property: "og:description", content: "Set up your subjects and add students to them." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Subjects });

function Subjects() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["subjects", uid],
    enabled: !!uid,
    queryFn: async () => {
      const [{ data: subjects }, { data: roles }] = await Promise.all([
        checked(supabase.from("subjects").select("id,name,total_sessions,subject_students(student_id)").eq("teacher_id", uid).order("name")),
        checked(supabase.from("user_roles").select("user_id").eq("role", "student")),
      ]);
      const ids = (roles ?? []).map((r) => r.user_id);
      const { data: students } = ids.length ? await checked(supabase.from("profiles").select("id,full_name,email,roll_no").in("id", ids).order("full_name")) : { data: [] };
      return { subjects: subjects ?? [], students: students ?? [] };
    },
  });
  const run = useMutation({
    mutationFn: async (work: () => PromiseLike<{ data: unknown; error: { message: string } | null }>) => { await checked(work()); },
    onSuccess: () => qc.invalidateQueries(),
    onError: (e: Error) => toast.error(e.message),
  });

  if (error) return <QueryError error={error} retry={refetch} />;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Subjects</h1>
        <p className="text-muted-foreground">Set the number of sessions for each subject, then add the registered students who take it.</p>
      </div>
      <form className="grid gap-4 rounded-2xl border bg-card p-5 md:grid-cols-3" onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        run.mutate(() => supabase.from("subjects").insert({ name: String(f.get("name")).trim(), total_sessions: Number(f.get("total")), teacher_id: uid }), { onSuccess: () => { toast.success("Subject added"); form.reset(); } });
      }}>
        <div className="space-y-1.5"><Label htmlFor="name">Subject name</Label><Input id="name" name="name" maxLength={160} required placeholder="Mathematics" /></div>
        <div className="space-y-1.5"><Label htmlFor="total">Total sessions</Label><Input id="total" name="total" type="number" min={1} max={500} required placeholder="40" /></div>
        <div className="flex items-end"><Button className="w-full" disabled={run.isPending}>Add subject</Button></div>
      </form>
      {isLoading || !data ? <div className="text-muted-foreground">Loading subjects…</div> : !data.subjects.length ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">No subjects yet. Add your first subject above.</div>
      ) : data.subjects.map((s) => {
        const enrolled = new Set(s.subject_students.map((x) => x.student_id));
        return (
          <section key={s.id} className="rounded-2xl border bg-card">
            <div className="flex items-center justify-between gap-3 border-b p-4">
              <div className="min-w-0"><h2 className="truncate font-semibold">{s.name}</h2><p className="text-sm text-muted-foreground">{s.total_sessions} sessions · {enrolled.size} students</p></div>
              <Button variant="ghost" size="icon" aria-label={`Delete ${s.name}`} onClick={() => confirm("Delete this subject and its student list?") && run.mutate(() => supabase.from("subjects").delete().eq("id", s.id))}><Trash2 className="size-4 text-destructive" /></Button>
            </div>
            {!data.students.length ? <p className="p-4 text-sm text-muted-foreground">No students from your university have registered yet.</p> : (
              <div className="divide-y">
                {data.students.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0"><div className="truncate font-medium">{p.full_name || p.email}</div><div className="truncate text-xs text-muted-foreground">{p.roll_no ? `Roll ${p.roll_no}` : p.email}</div></div>
                    {enrolled.has(p.id)
                      ? <Button size="sm" variant="outline" disabled={run.isPending} onClick={() => run.mutate(() => supabase.from("subject_students").delete().eq("subject_id", s.id).eq("student_id", p.id))}>Remove</Button>
                      : <Button size="sm" disabled={run.isPending} onClick={() => run.mutate(() => supabase.from("subject_students").insert({ subject_id: s.id, student_id: p.id }))}>Add</Button>}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
