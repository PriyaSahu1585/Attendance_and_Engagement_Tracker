import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, GraduationCap, Lightbulb, ShieldCheck, UserCheck, Users } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { accountDestination } from '@/lib/signup';

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "AttendIQ — Smart Attendance & Engagement" },
      { name: "description", content: "Mark attendance, track engagement and let students check their own record." },
      { property: "og:title", content: "AttendIQ — Smart Attendance & Engagement" },
      { property: "og:description", content: "Mark attendance, track engagement and let students check their own record." },
    ],
  }),
  component: Index,
});

const features = [
  { icon: UserCheck, title: "One-tap attendance", text: "Mark present, late or absent for a whole class in seconds." },
  { icon: BarChart3, title: "Live analytics", text: "Attendance and engagement charts for every session." },
  { icon: Lightbulb, title: "Teaching tips", text: "Built-in suggestions when turnout or engagement drops." },
  { icon: Users, title: "Student portal", text: "Students log in to see their own percentage and history." },
  { icon: ShieldCheck, title: "Private by design", text: "Students only ever see their own records." },
];

function Index() {
  const { user, role } = useAuth();
  const dest = accountDestination(role);
  return (
    <div className="min-h-screen bg-hero">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground"><GraduationCap className="size-5" /></span>
          <span className="font-display text-lg font-semibold">AttendIQ</span>
        </div>
        {user && role ? (
          <Button asChild variant="hero"><Link to={dest}>Open dashboard</Link></Button>
        ) : (
          <Button asChild variant="outline"><Link to="/auth">Sign in</Link></Button>
        )}
      </header>
      <section className="relative isolate overflow-hidden">
        <img src={hero} alt="Classroom with students on laptops" width={1280} height={832} className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-background/85" />
        <div className="mx-auto max-w-6xl px-5 py-12 md:py-16">
          <p className="text-sm font-medium uppercase text-primary">Your classroom, connected</p>
          <h1 className="mt-4 text-5xl font-bold leading-tight md:text-6xl">AttendIQ</h1>
          <p className="mt-5 max-w-lg text-lg text-foreground">A shared home for administrators, teachers and students. Class attendance, academic profiles and insights — together.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="hero"><Link to={user && role ? dest : "/auth"}>Get started</Link></Button>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 sm:grid-cols-2 lg:grid-cols-5">
        {features.map((f) => (
          <div key={f.title} className="border-t p-4">
            <f.icon className="size-6 text-primary" />
            <div className="mt-3 font-semibold">{f.title}</div>
            <div className="mt-1 text-sm text-muted-foreground">{f.text}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
