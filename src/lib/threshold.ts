import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { checked } from "@/lib/query-result";
import { AT_RISK_THRESHOLD } from "@/lib/insights";

/** Minimum attendance % set by the signed-in person's university administrator (75 until set). */
export function useMinAttendance() {
  const { profile } = useAuth();
  const key = (profile?.college_name ?? "").trim().toLowerCase();
  const { data } = useQuery({
    queryKey: ["min-attendance", key],
    enabled: !!key,
    queryFn: async () => {
      const { data } = await checked(supabase.from("university_settings").select("min_attendance").eq("college_key", key).maybeSingle());
      return data?.min_attendance ?? AT_RISK_THRESHOLD;
    },
  });
  return { threshold: data ?? AT_RISK_THRESHOLD, key };
}
