import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/PasswordInput";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Set new password — AttendIQ" },
      { name: "description", content: "Choose a new password for your AttendIQ account." },
      { property: "og:title", content: "Set new password — AttendIQ" },
      { property: "og:description", content: "Choose a new password for your AttendIQ account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    const recovery = window.location.hash.includes("type=recovery");
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    if (recovery) void supabase.auth.getUser().then(({ data }) => setReady(Boolean(data.user)));
    return () => data.subscription.unsubscribe();
  }, []);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password"));
    if (!ready) return;
    setBusy(true);
    try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    toast.success("Password updated");
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not update your password. Please try again."); }
    finally { setBusy(false); }
  };
  return (
    <div className="grid min-h-screen place-items-center bg-hero px-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-3xl border bg-card p-8">
        <h1 className="text-2xl font-semibold">Set a new password</h1>
        {!ready && <p role="status">Open the password reset link from your email. If it has expired, request a new link on the sign-in page.</p>}
        {notice && <p role="alert">{notice}</p>}
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <PasswordInput id="password" name="password" minLength={6} required />
        </div>
        <Button variant="hero" className="w-full" disabled={busy || !ready}>{busy ? "Updating…" : "Update password"}</Button>
      </form>
    </div>
  );
}
