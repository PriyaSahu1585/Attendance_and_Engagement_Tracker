-- Run through the database read-query tool; a failed assertion raises division by zero.
SELECT 1 / CASE WHEN relrowsecurity THEN 1 ELSE 0 END
  AS university_settings_requires_row_security
FROM pg_class
WHERE oid = 'public.university_settings'::regclass;

-- Only authenticated users may read settings, and only for their own university.
-- Check every SELECT/ALL policy because permissive policies are combined with OR.
SELECT 1 / CASE WHEN count(*) = 1 AND bool_and(
  roles = ARRAY['authenticated']::name[]
  AND qual = '(college_key = college_key(auth.uid()))'
) THEN 1 ELSE 0 END AS university_settings_reads_scoped_to_own_college
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'university_settings'
  AND cmd IN ('SELECT', 'ALL');