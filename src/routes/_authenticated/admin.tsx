import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, CalendarCheck, LayoutDashboard, Users, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AppShell, FullPageLoader } from "@/components/AppShell";
import { AccountUnavailable } from '@/components/AccountUnavailable';

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', context.user.id);
    if (error) throw error;
    if (!data?.some(r => r.role === 'admin' || r.role === 'teacher')) throw redirect({ to: "/student" });
  },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Admin — AttendIQ" },
      { name: "description", content: "Manage sessions, attendance and students." },
      { property: "og:title", content: "Admin — AttendIQ" },
      { property: "og:description", content: "Manage sessions, attendance and students." },
    ],
  }),
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/subjects", label: "Subjects", icon: BookOpen },
  { to: "/admin/sessions", label: "Sessions & Attendance", icon: CalendarCheck },
  { to: "/admin/students", label: "Students", icon: Users },
];

function AdminLayout() {
  const { role, loading, error } = useAuth();
  if (loading) return <FullPageLoader />;
  if (error || (role !== "admin" && role !== 'teacher')) return <AccountUnavailable />;
  return (
    <AppShell nav={[...nav, ...(role === 'admin' ? [{ to: '/admin/approvals', label: 'Access requests', icon: ShieldCheck }] : []), { to: '/profile', label: 'My profile', icon: UserRound }]} title={role === 'teacher' ? 'Teacher workspace' : 'Admin workspace'}>
      <Outlet />
    </AppShell>
  );
}
