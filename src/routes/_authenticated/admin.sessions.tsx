import { checked } from "@/lib/query-result";
import { QueryError } from "@/components/QueryError";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/sessions")({ head: () => ({ meta: [{ title: "Class sessions — AttendIQ" }, { name: "description", content: "Class sessions and attendance management in AttendIQ." }, { property: "og:title", content: "Class sessions — AttendIQ" }, { property: "og:description", content: "Class sessions and attendance management in AttendIQ." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: Sessions });

function Sessions() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: subjects = [] } = useQuery({
    queryKey: ["my-subjects", user?.id],
    enabled: !!user,
    queryFn: async () => (await checked(supabase.from("subjects").select("id,name").eq("teacher_id", user?.id ?? "").order("name"))).data ?? [],
  });
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: sessions = [], isLoading, error, refetch } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data, error } = await checked(supabase.from("class_sessions").select("*, attendance(status)").order("session_date", { ascending: false }));
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (v: { title: string; subject: string; subject_id: string; session_date: string }) => {
      const { error } = await checked(supabase.from("class_sessions").insert({ ...v, created_by: user?.id ?? null }));
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Session created"); setOpen(false); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await checked(supabase.from("class_sessions").delete().eq("id", id));
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Session deleted"); qc.invalidateQueries(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = sessions.filter(s => `${s.title} ${s.subject} ${s.session_date}`.toLowerCase().includes(search.toLowerCase()));
  if (error) return <QueryError error={error} retry={refetch} />;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Sessions & Attendance</h1>
          <p className="text-muted-foreground">Create a class session, then open it to mark attendance.</p>
        </div>
        <Button variant="hero" onClick={() => setOpen((o) => !o)}><Plus className="size-4" /> New session</Button>
      </div>

      <Input aria-label="Search sessions" placeholder="Search session, subject or date" value={search} onChange={e => setSearch(e.target.value)} className="max-w-md" />

      {open && (
        <form
          className="grid gap-4 rounded-2xl border bg-card p-5 md:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const subject = subjects.find((s) => s.id === String(f.get("subject_id")));
            if (!subject) { toast.error("Add a subject first under Subjects."); return; }
            create.mutate({ title: String(f.get("title")), subject: subject.name, subject_id: subject.id, session_date: String(f.get("date")) });
          }}
        >
          <div className="space-y-1.5"><Label htmlFor="title">Title</Label><Input id="title" name="title" maxLength={200} required placeholder="Lecture 5" /></div>
          <div className="space-y-1.5"><Label htmlFor="subject_id">Subject</Label><select id="subject_id" name="subject_id" required className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">{subjects.length ? subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>) : <option value="">Add a subject first</option>}</select></div>
          <div className="space-y-1.5"><Label htmlFor="date">Date</Label><Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>
          <div className="flex items-end"><Button className="w-full" disabled={create.isPending}>Save session</Button></div>
        </form>
      )}

      {isLoading ? (
        <div className="text-muted-foreground">Loading sessions…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">No sessions yet. Click “New session” to start.</div>
      ) : (
        <div className="divide-y rounded-2xl border bg-card">
          {filtered.map((s) => {
            const marked = s.attendance.length;
            const present = s.attendance.filter((a) => a.status !== "absent").length;
            return (
              <div key={s.id} className="flex items-center gap-4 p-4">
                <Link to="/admin/session/$sessionId" params={{ sessionId: s.id }} className="flex flex-1 items-center gap-4 hover:opacity-80">
                  <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-muted text-center text-xs font-semibold">
                    {new Date(s.session_date).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{s.title}</div>
                    <div className="text-sm text-muted-foreground">{s.subject || "General"} · {marked ? `${present}/${marked} present` : "Attendance not marked"}</div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
                <Button variant="ghost" size="icon" aria-label="Delete session" onClick={() => confirm("Delete this session and its attendance?") && remove.mutate(s.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
