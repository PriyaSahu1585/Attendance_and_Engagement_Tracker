import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { GraduationCap, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export type NavItem = { to: string; label: string; icon: LucideIcon };

export function AppShell({ nav, title, children }: { nav: NavItem[]; title: string; children: ReactNode }) {
  const { profile, user, signOut } = useAuth();
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-sidebar-border bg-sidebar md:sticky md:top-0 md:h-screen md:w-64 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
            <GraduationCap className="size-5" />
          </span>
          <div>
            <div className="font-display font-semibold">AttendIQ</div>
            <div className="text-xs text-muted-foreground">{title}</div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: true }}
              className="flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium" }}
            >
              <n.icon className="size-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden px-5 py-4 md:absolute md:bottom-0 md:block md:w-64">
          <div className="truncate text-sm font-medium">{profile?.full_name || "User"}</div>
          {profile?.college_name && <div className="mb-1 truncate text-xs text-muted-foreground">{profile.college_name}</div>}
          <div className="mb-3 truncate text-xs text-muted-foreground">{user?.email}</div>
          <Button variant="outline" size="sm" className="w-full" onClick={async () => { await signOut(); }}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-5 md:p-8">
        <div className="mb-4 flex justify-end md:hidden">
          <Button variant="outline" size="sm" onClick={async () => { await signOut(); }}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
        {children}
      </main>
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
