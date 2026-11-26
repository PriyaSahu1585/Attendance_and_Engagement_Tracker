import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { UserRound, LayoutDashboard, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { profileSchema, accountDestination } from '@/lib/signup';
import { supabase } from '@/integrations/supabase/client';
import { checked } from '@/lib/query-result';
import { AppShell, FullPageLoader } from '@/components/AppShell';
import { AccountUnavailable } from '@/components/AccountUnavailable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const Route = createFileRoute('/_authenticated/profile')({
  head: () => ({ meta: [{ title: 'My academic profile — AttendIQ' }, { name: 'description', content: 'Manage your college, subject and contact details.' }, { property: 'og:title', content: 'My academic profile — AttendIQ' }, { property: 'og:description', content: 'Manage your college, subject and contact details.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: ProfilePage,
});
const fields = [{ name: 'full_name', label: 'Full name', max: 100 }, { name: 'college_name', label: 'College name', max: 160 }, { name: 'department', label: 'Department', max: 100 }, { name: 'teaching_subject', label: 'Subject', max: 160 }, { name: 'phone', label: 'Phone', max: 30 }, { name: 'roll_no', label: 'Roll number', max: 50 }, { name: 'study_year', label: 'Year / semester', max: 30 }] as const;

function ProfilePage() {
  const { user, profile, role, loading, error, retry } = useAuth();
  const [busy, setBusy] = useState(false);
  if (loading) return <FullPageLoader />;
  if (error || !profile || !role) return <AccountUnavailable />;
  return <AppShell title="My account" nav={[{ to: accountDestination(role), label: 'Dashboard', icon: LayoutDashboard }, { to: '/profile', label: 'My profile', icon: UserRound }]}>
    <div className="max-w-3xl space-y-8"><div><h1 className="text-3xl font-semibold">My profile</h1><p className="mt-2 break-all text-muted-foreground">{user?.email} · <span className="capitalize">{role}</span></p></div>
      <form className="space-y-6 border-t pt-6" onSubmit={async e => {
        e.preventDefault();
        const parsed = profileSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
        if (!parsed.success) { toast.error(parsed.error.issues[0]?.message || 'Check your details'); return; }
        if (!user) return;
        setBusy(true);
        try { await checked(supabase.from('profiles').update(parsed.data).eq('id', user.id)); toast.success('Profile saved'); await retry(); }
        catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save profile'); }
        finally { setBusy(false); }
      }}><div className="grid gap-5 sm:grid-cols-2">{fields.map(f => <div key={f.name} className="space-y-2"><Label htmlFor={f.name}>{f.label}</Label><Input id={f.name} name={f.name} defaultValue={profile[f.name] || ''} maxLength={f.max} required={f.name === 'full_name' || f.name === 'college_name'} readOnly={f.name === 'college_name'} /></div>)}</div><Button disabled={busy}><Save className="size-4" />{busy ? 'Saving…' : 'Save details'}</Button></form>
    </div>
  </AppShell>;
}