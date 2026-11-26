ALTER POLICY "settings read"
ON public.university_settings
TO authenticated
USING (college_key = public.college_key(auth.uid()));