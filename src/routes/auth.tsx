import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { authErrorMessage } from '@/lib/auth-errors';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from '@/components/ui/checkbox';
import { signupSchema, accountDestination } from '@/lib/signup';
import { PasswordInput } from '@/components/PasswordInput';

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Sign in — AttendIQ" },
      { name: "description", content: "Sign in or create your AttendIQ account." },
      { property: "og:title", content: "Sign in — AttendIQ" },
      { property: "og:description", content: "Sign in or create your AttendIQ account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, role, loading, error: accountError, signOut, retry } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [requestedRole, setRequestedRole] = useState<'admin' | 'teacher' | 'student'>('student');
  const [requestStatus, setRequestStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user || role || loading) return;
    let active = true;
    supabase.from('access_requests').select('status,requested_role').eq('user_id', user.id).maybeSingle().then(({ data, error }) => {
      if (active) setRequestStatus(error ? 'Your request could not be loaded. Try again.' : data ? `Your ${data.requested_role} access request is ${data.status}.` : 'Confirm your email to activate your account.');
    });
    return () => { active = false; };
  }, [user, role, loading]);

  useEffect(() => {
    if (!loading && user && role) navigate({ to: accountDestination(role) });
  }, [user, role, loading, navigate]);

  const signIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setNotice(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: String(f.get("email")).trim(), password: String(f.get("password")) });
      if (error) throw error;
      toast.success("Welcome back!");
    } catch (error) { setNotice(authErrorMessage(error, "Could not sign in. Please try again.")); }
    finally { setBusy(false); }
  };

  const signUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setNotice(null);
    try {
    const parsed = signupSchema.safeParse({ ...Object.fromEntries(f), requested_role: requestedRole });
    if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || 'Check your account details');
    if (parsed.data.requested_role === 'admin') {
      const { data: taken, error: checkError } = await supabase.rpc('university_has_admin', { _name: parsed.data.college_name });
      if (checkError) throw checkError;
      if (taken) throw new Error('This university already has an administrator. Only one administrator is allowed per university.');
    }
    const { email, password, ...details } = parsed.data;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/auth",
        data: details,
      },
    });
    if (error) throw error;
    if (!data.session) setNotice("Check your email to confirm your account, then sign in.");
    } catch (error) { setNotice(authErrorMessage(error, "Could not create your account. Please try again.")); }
    finally { setBusy(false); }
  };

  const forgot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setNotice(null);
    try {
    const { error } = await supabase.auth.resetPasswordForEmail(String(f.get("email")).trim(), {
      redirectTo: window.location.origin + "/reset-password",
    });
    if (error) throw error;
    setNotice("If an account exists for this email, a password reset link will be sent.");
    } catch (error) { setNotice(authErrorMessage(error, "Could not send a reset link. Please try again.")); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-8">
      <div className="w-full max-w-xl rounded-lg border bg-card p-5 shadow-glow sm:p-8">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
            <GraduationCap className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold">AttendIQ</span>
        </Link>
        {(notice || accountError) && <p role="status" className="mb-4 text-sm text-muted-foreground">{notice || accountError}</p>}
        {user && !role && !loading && <div className="mb-4 space-y-3"><h1 className="text-xl font-semibold">Account approval</h1><p>{requestStatus || 'Checking your access request…'}</p><div className="flex gap-2"><Button onClick={() => void retry()}>Check approval</Button><Button variant="outline" onClick={() => void signOut()}>Sign out</Button></div></div>}
        {!(user && !role && !loading) && <>
        {mode === "forgot" ? (
          <form onSubmit={forgot} className="space-y-4">
            <h1 className="text-2xl font-semibold">Reset password</h1>
            <Field name="email" label="Email" type="email" />
            <Button variant="hero" className="w-full" disabled={busy}>Send reset link</Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("signin")}>Back to sign in</Button>
          </form>
        ) : (
          <Tabs value={mode} onValueChange={(v) => { if (!busy && (v === 'signin' || v === 'signup')) { setMode(v); setNotice(null); } }}>
            <TabsList className="mb-6 grid w-full grid-cols-2">
              <TabsTrigger value="signin" disabled={busy}>Sign in</TabsTrigger>
              <TabsTrigger value="signup" disabled={busy}>Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-4">
                <Field name="email" label="Email" type="email" />
                <Field name="password" label="Password" type="password" />
                <Button variant="hero" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setMode("forgot")}>Forgot password?</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-4">
                <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">I am joining as</legend><div className="grid grid-cols-3 gap-2">
                  {(['admin', 'teacher', 'student'] as const).map(r => <Label key={r} className="flex cursor-pointer items-center gap-2 rounded-md border p-3 capitalize"><Checkbox aria-label={r} checked={requestedRole === r} onCheckedChange={() => setRequestedRole(r)} disabled={busy} />{r}</Label>)}
                </div></fieldset>
                <div className="grid gap-4 sm:grid-cols-2">
                <Field name="full_name" label="Full name" />
                <Field name="college_name" label="College name" />
                <Field name="department" label="Department" required={false} />
                <Field name="phone" label="Phone (optional)" type="tel" required={false} />
                <Field name="teaching_subject" label={requestedRole === 'teacher' ? 'Subject you teach' : 'Subject (optional)'} required={requestedRole === 'teacher'} />
                <Field name="roll_no" label="Roll number" required={false} />
                <Field name="study_year" label="Year / semester" required={false} />
                <Field name="email" label="Email" type="email" />
                </div>
                <Field name="password" label="Password (min 6 characters)" type="password" />
                <Button variant="hero" className="w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
                <p className="text-xs text-muted-foreground">Each university has one administrator. Teachers need that administrator's approval. Students see a subject once its teacher adds them.</p>
              </form>
            </TabsContent>
          </Tabs>
        )}
        </>}
      </div>
    </div>
  );
}

function Field({ name, label, type = "text", required = true }: { name: string; label: string; type?: string; required?: boolean }) {
  const Control = type === 'password' ? PasswordInput : Input;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Control id={name} name={name} type={type} required={required} maxLength={name === 'email' ? 255 : name === 'phone' ? 30 : name === 'roll_no' ? 50 : name === 'study_year' ? 30 : name === 'college_name' || name === 'teaching_subject' ? 160 : type === 'password' ? 128 : 100} minLength={type === "password" ? 6 : undefined} />
    </div>
  );
}
