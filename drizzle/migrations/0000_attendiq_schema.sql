create type public.app_role as enum ('admin','teacher','student');

create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, full_name text not null default '', email text, roll_no text, college_name text not null default '', department text not null default '', teaching_subject text not null default '', phone text not null default '', study_year text not null default '', created_at timestamptz not null default now(),
  constraint academic_profile_lengths check (length(full_name)<=100 and length(college_name)<=160 and length(department)<=100 and length(teaching_subject)<=160 and length(phone)<=30 and length(study_year)<=30 and length(coalesce(roll_no,''))<=50));
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null, role public.app_role not null, unique(user_id,role));
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create function public.has_role(_user_id uuid,_role public.app_role) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create function public.is_teacher(_id uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.user_roles where user_id=_id and role='teacher') $$;
create function public.college_key(_id uuid) returns text language sql stable security definer set search_path=public as $$ select lower(trim(college_name)) from public.profiles where id=_id $$;
create function public.same_college(_id uuid) returns boolean language sql stable security definer set search_path=public as $$ select coalesce(public.college_key(_id)=public.college_key(auth.uid()) and public.college_key(_id)<>'',false) $$;
create function public.admin_of_user(_id uuid) returns boolean language sql stable security definer set search_path=public as $$ select public.has_role(auth.uid(),'admin') and public.same_college(_id) $$;
create function public.university_has_admin(_name text) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.user_roles r join public.profiles p on p.id=r.user_id where r.role='admin' and lower(trim(p.college_name))=lower(trim(_name))) $$;
revoke all on function public.has_role(uuid,public.app_role), public.is_teacher(uuid), public.college_key(uuid), public.same_college(uuid), public.admin_of_user(uuid), public.university_has_admin(text) from public,anon;
grant execute on function public.has_role(uuid,public.app_role), public.is_teacher(uuid), public.college_key(uuid), public.same_college(uuid), public.admin_of_user(uuid) to authenticated,service_role;
grant execute on function public.university_has_admin(text) to anon,authenticated,service_role;

create policy "own role or admin" on public.user_roles for select to authenticated using(user_id=auth.uid() or public.admin_of_user(user_id));
create policy "teacher roster roles" on public.user_roles for select to authenticated using(public.is_teacher(auth.uid()) and role='student' and public.same_college(user_id));
create policy "own profile or admin" on public.profiles for select to authenticated using(id=auth.uid() or public.admin_of_user(id));
create policy "teacher roster profiles" on public.profiles for select to authenticated using(public.is_teacher(auth.uid()) and public.has_role(id,'student') and public.same_college(id));
create policy "update own profile or admin" on public.profiles for update to authenticated using(id=auth.uid() or public.admin_of_user(id)) with check(id=auth.uid() or public.admin_of_user(id));

create function public.lock_profile_college() returns trigger language plpgsql set search_path=public as $$ begin
if auth.uid() is not null and lower(trim(new.college_name))<>lower(trim(old.college_name)) then raise exception 'University cannot be changed after registration'; end if;
return new; end $$;
create trigger profiles_lock_college before update of college_name on public.profiles for each row execute function public.lock_profile_college();

create table public.subjects (id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 160), teacher_id uuid not null references public.profiles(id) on delete cascade, total_sessions int not null check(total_sessions between 1 and 500), created_at timestamptz not null default now());
create unique index subjects_teacher_name_idx on public.subjects(teacher_id, lower(trim(name)));
grant select,insert,update,delete on public.subjects to authenticated;
grant all on public.subjects to service_role;
alter table public.subjects enable row level security;

create table public.subject_students (subject_id uuid not null references public.subjects(id) on delete cascade, student_id uuid not null references public.profiles(id) on delete cascade, created_at timestamptz not null default now(), primary key(subject_id,student_id));
create index subject_students_student_idx on public.subject_students(student_id);
grant select,insert,delete on public.subject_students to authenticated;
grant all on public.subject_students to service_role;
alter table public.subject_students enable row level security;

create function public.owns_subject(_id uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.subjects where id=_id and teacher_id=auth.uid()) $$;
create function public.enrolled_in(_id uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.subject_students where subject_id=_id and student_id=auth.uid()) $$;
revoke all on function public.owns_subject(uuid), public.enrolled_in(uuid) from public,anon;
grant execute on function public.owns_subject(uuid), public.enrolled_in(uuid) to authenticated,service_role;

create policy "subject read" on public.subjects for select to authenticated using(teacher_id=auth.uid() or public.admin_of_user(teacher_id) or public.enrolled_in(id));
create policy "own subject insert" on public.subjects for insert to authenticated with check(teacher_id=auth.uid() and (public.is_teacher(auth.uid()) or public.has_role(auth.uid(),'admin')));
create policy "own subject update" on public.subjects for update to authenticated using(teacher_id=auth.uid() and (public.is_teacher(auth.uid()) or public.has_role(auth.uid(),'admin'))) with check(teacher_id=auth.uid() and (public.is_teacher(auth.uid()) or public.has_role(auth.uid(),'admin')));
create policy "own subject delete" on public.subjects for delete to authenticated using(teacher_id=auth.uid() and (public.is_teacher(auth.uid()) or public.has_role(auth.uid(),'admin')));
create policy "enrolment read" on public.subject_students for select to authenticated using(student_id=auth.uid() or public.owns_subject(subject_id) or public.admin_of_user(student_id));
create policy "teacher adds students" on public.subject_students for insert to authenticated with check(public.owns_subject(subject_id) and public.has_role(student_id,'student') and public.same_college(student_id));
create policy "teacher removes students" on public.subject_students for delete to authenticated using(public.owns_subject(subject_id));

create table public.class_sessions (id uuid primary key default gen_random_uuid(), title text not null check(length(trim(title)) between 1 and 200), subject text not null default '', subject_id uuid references public.subjects(id) on delete set null, session_date date not null default current_date, notes text, created_by uuid, created_at timestamptz not null default now());
create index sessions_date_idx on public.class_sessions(session_date);
create index sessions_subject_idx on public.class_sessions(subject_id);
grant select,insert,update,delete on public.class_sessions to authenticated;
grant all on public.class_sessions to service_role;
alter table public.class_sessions enable row level security;

create table public.attendance (id uuid primary key default gen_random_uuid(), session_id uuid not null references public.class_sessions(id) on delete cascade, student_id uuid not null references public.profiles(id) on delete cascade, status text not null default 'present' check(status in ('present','absent','late')), engagement int check(engagement between 0 and 100), created_at timestamptz not null default now(), unique(session_id,student_id), check(status<>'absent' or engagement is null));
create index attendance_student_idx on public.attendance(student_id);
grant select,insert,update,delete on public.attendance to authenticated;
grant all on public.attendance to service_role;
alter table public.attendance enable row level security;

create function public.can_manage_session(_id uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.class_sessions s where s.id=_id and (public.admin_of_user(s.created_by) or (public.is_teacher(auth.uid()) and s.created_by=auth.uid()))) $$;
revoke all on function public.can_manage_session(uuid) from public,anon;
grant execute on function public.can_manage_session(uuid) to authenticated,service_role;

create policy "attendance read" on public.attendance for select to authenticated using(student_id=auth.uid() or public.can_manage_session(session_id));
create policy "attendance insert" on public.attendance for insert to authenticated with check(public.can_manage_session(session_id) and public.has_role(student_id,'student') and public.same_college(student_id));
create policy "attendance update" on public.attendance for update to authenticated using(public.can_manage_session(session_id)) with check(public.can_manage_session(session_id) and public.has_role(student_id,'student') and public.same_college(student_id));
create policy "attendance delete" on public.attendance for delete to authenticated using(public.can_manage_session(session_id));
create policy "session read" on public.class_sessions for select to authenticated using(public.admin_of_user(created_by) or (public.is_teacher(auth.uid()) and created_by=auth.uid()) or exists(select 1 from public.attendance a where a.session_id=class_sessions.id and a.student_id=auth.uid()));
create policy "session insert" on public.class_sessions for insert to authenticated with check(created_by=auth.uid() and (public.has_role(auth.uid(),'admin') or public.is_teacher(auth.uid())));
create policy "session update" on public.class_sessions for update to authenticated using(public.can_manage_session(id)) with check(public.admin_of_user(created_by) or (public.is_teacher(auth.uid()) and created_by=auth.uid()));
create policy "session delete" on public.class_sessions for delete to authenticated using(public.can_manage_session(id));

create table public.access_requests (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, requested_role text not null check(requested_role in ('admin','teacher','student')), status text not null default 'pending' check(status in ('pending','approved','rejected')), reviewed_by uuid, created_at timestamptz not null default now(), unique(user_id));
grant select on public.access_requests to authenticated;
grant all on public.access_requests to service_role;
alter table public.access_requests enable row level security;
create policy "own or admin requests" on public.access_requests for select to authenticated using(user_id=auth.uid() or public.admin_of_user(user_id));

create table public.university_settings (college_key text primary key check(length(college_key) between 1 and 160), min_attendance int not null default 75 check(min_attendance between 1 and 100), updated_at timestamptz not null default now());
grant select,insert,update on public.university_settings to authenticated;
grant all on public.university_settings to service_role;
alter table public.university_settings enable row level security;
create policy "settings read" on public.university_settings for select to authenticated using(true);
create policy "admin sets own university" on public.university_settings for insert to authenticated with check(public.has_role(auth.uid(),'admin') and college_key=public.college_key(auth.uid()));
create policy "admin updates own university" on public.university_settings for update to authenticated using(public.has_role(auth.uid(),'admin') and college_key=public.college_key(auth.uid())) with check(public.has_role(auth.uid(),'admin') and college_key=public.college_key(auth.uid()));

create function public.handle_attendiq_user() returns trigger language plpgsql security definer set search_path=public as $$ declare wanted text; assigned text; begin
wanted:=coalesce(new.raw_user_meta_data->>'requested_role','student');
if wanted not in ('admin','teacher','student') then raise exception 'Invalid account role'; end if;
insert into public.profiles(id,full_name,email,roll_no,college_name,department,teaching_subject,phone,study_year) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',''),new.email,new.raw_user_meta_data->>'roll_no',coalesce(new.raw_user_meta_data->>'college_name',''),coalesce(new.raw_user_meta_data->>'department',''),coalesce(new.raw_user_meta_data->>'teaching_subject',''),coalesce(new.raw_user_meta_data->>'phone',''),coalesce(new.raw_user_meta_data->>'study_year','')) on conflict(id) do update set email=excluded.email;
if new.email_confirmed_at is not null then
perform pg_advisory_xact_lock(73192451);
if not exists(select 1 from public.user_roles where user_id=new.id) and not exists(select 1 from public.access_requests where user_id=new.id) then
if wanted='admin' then
  if not public.university_has_admin((select college_name from public.profiles where id=new.id)) then assigned:='admin'; end if;
elsif wanted='student' then assigned:='student'; end if;
if assigned is not null then insert into public.user_roles(user_id,role) values(new.id,assigned::public.app_role); end if;
insert into public.access_requests(user_id,requested_role,status) values(new.id,wanted,case when assigned is not null then 'approved' when wanted='admin' then 'rejected' else 'pending' end);
end if; end if; return new; end $$;
revoke all on function public.handle_attendiq_user() from public,anon,authenticated;
create trigger attendiq_user_created after insert on auth.users for each row execute function public.handle_attendiq_user();
create trigger attendiq_user_verified after update of email_confirmed_at,email on auth.users for each row execute function public.handle_attendiq_user();

create function public.review_access_request(_request_id uuid,_approve boolean) returns void language plpgsql security definer set search_path=public as $$ declare req public.access_requests; begin
if not public.has_role(auth.uid(),'admin') then raise exception 'Administrator access required'; end if;
select * into req from public.access_requests where id=_request_id for update;
if not found or req.status<>'pending' then raise exception 'Request is no longer pending'; end if;
if not public.same_college(req.user_id) then raise exception 'Request belongs to another university'; end if;
if req.requested_role='admin' then raise exception 'Each university has one administrator'; end if;
if not exists(select 1 from auth.users where id=req.user_id and email_confirmed_at is not null) then raise exception 'Email confirmation required'; end if;
if _approve then insert into public.user_roles(user_id,role) values(req.user_id,req.requested_role::public.app_role) on conflict(user_id,role) do nothing; end if;
update public.access_requests set status=case when _approve then 'approved' else 'rejected' end,reviewed_by=auth.uid() where id=_request_id;
end $$;
revoke all on function public.review_access_request(uuid,boolean) from public,anon;
grant execute on function public.review_access_request(uuid,boolean) to authenticated;

create function public.validate_academic_signup() returns trigger language plpgsql set search_path=public as $$ begin
if length(coalesce(new.raw_user_meta_data->>'full_name',''))>100 or length(coalesce(new.raw_user_meta_data->>'college_name',''))>160 or length(coalesce(new.raw_user_meta_data->>'department',''))>100 or length(coalesce(new.raw_user_meta_data->>'teaching_subject',''))>160 or length(coalesce(new.raw_user_meta_data->>'phone',''))>30 or length(coalesce(new.raw_user_meta_data->>'roll_no',''))>50 or length(coalesce(new.raw_user_meta_data->>'study_year',''))>30 then raise exception 'Account details exceed allowed lengths'; end if;
if new.raw_user_meta_data ? 'requested_role' then
if length(trim(coalesce(new.raw_user_meta_data->>'full_name','')))=0 or length(trim(coalesce(new.raw_user_meta_data->>'college_name','')))=0 then raise exception 'Full name and college are required'; end if;
if new.raw_user_meta_data->>'requested_role'='teacher' and length(trim(coalesce(new.raw_user_meta_data->>'teaching_subject','')))=0 then raise exception 'Teaching subject is required'; end if;
end if; return new; end $$;
create trigger attendiq_validate_signup before insert on auth.users for each row execute function public.validate_academic_signup();