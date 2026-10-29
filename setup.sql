-- =====================================================================
--  The Sun Academy LMS — Supabase setup
--  Supabase Dashboard → SQL Editor → New query → এই পুরো ফাইল paste → Run
-- =====================================================================

-- ---------- Tables ----------
create table if not exists public.batches (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists public.members (
  id          uuid primary key references auth.users(id) on delete cascade,
  academy_id  text not null unique,
  name        text not null,
  phone       text not null,
  role        text not null check (role in ('admin','teacher','student')),
  batch_id    bigint references public.batches(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.routines (
  id          bigint generated always as identity primary key,
  batch_id    bigint not null references public.batches(id) on delete cascade,
  day         smallint not null check (day between 0 and 6),   -- 0 = শনিবার ... 6 = শুক্রবার
  start_time  time not null,
  end_time    time,
  subject     text not null,
  teacher     text,
  created_at  timestamptz not null default now()
);

create table if not exists public.exams (
  id          bigint generated always as identity primary key,
  batch_id    bigint not null references public.batches(id) on delete cascade,
  title       text not null,
  subject     text,
  exam_date   date not null,
  start_time  time,
  full_marks  int,
  syllabus    text,
  created_at  timestamptz not null default now()
);

create table if not exists public.materials (
  id          bigint generated always as identity primary key,
  batch_id    bigint references public.batches(id) on delete cascade,  -- null = সব ব্যাচ
  title       text not null,
  subject     text,
  file_path   text not null unique,
  file_name   text,
  uploaded_by uuid references public.members(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.attendance (
  id          bigint generated always as identity primary key,
  student_id  uuid not null references public.members(id) on delete cascade,
  batch_id    bigint references public.batches(id) on delete set null,
  att_date    date not null,
  status      text not null check (status in ('present','absent','late')),
  marked_by   uuid references public.members(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (student_id, att_date)
);
create index if not exists attendance_date_idx on public.attendance (att_date);
create index if not exists members_batch_idx on public.members (batch_id);

-- ---------- Helper functions (role check) ----------
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.members where id = auth.uid()
$$;

create or replace function public.my_batch() returns bigint
language sql stable security definer set search_path = public as $$
  select batch_id from public.members where id = auth.uid()
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.members where id = auth.uid()) in ('admin','teacher'), false)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.members where id = auth.uid()) = 'admin', false)
$$;

-- Admin: সদস্যের মোবাইল নম্বর (= পাসওয়ার্ড) বদলানো
create or replace function public.admin_set_password(target uuid, new_password text) returns void
language plpgsql security definer set search_path = public, extensions, auth as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  update auth.users
     set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = target;
end $$;

-- Admin: সদস্য পুরোপুরি মুছে ফেলা (login সহ)
create or replace function public.admin_delete_user(target uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if target = auth.uid() then raise exception 'cannot delete yourself'; end if;
  delete from auth.users where id = target;
end $$;

-- ---------- Row Level Security ----------
alter table public.batches    enable row level security;
alter table public.members    enable row level security;
alter table public.routines   enable row level security;
alter table public.exams      enable row level security;
alter table public.materials  enable row level security;
alter table public.attendance enable row level security;

-- batches
drop policy if exists batches_read  on public.batches;
drop policy if exists batches_write on public.batches;
create policy batches_read  on public.batches for select to authenticated using (public.my_role() is not null);
create policy batches_write on public.batches for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- members
drop policy if exists members_read  on public.members;
drop policy if exists members_write on public.members;
create policy members_read  on public.members for select to authenticated using (id = auth.uid() or public.is_staff());
create policy members_write on public.members for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- routines
drop policy if exists routines_read  on public.routines;
drop policy if exists routines_write on public.routines;
create policy routines_read  on public.routines for select to authenticated using (public.is_staff() or batch_id = public.my_batch());
create policy routines_write on public.routines for all    to authenticated using (public.is_staff()) with check (public.is_staff());

-- exams
drop policy if exists exams_read  on public.exams;
drop policy if exists exams_write on public.exams;
create policy exams_read  on public.exams for select to authenticated using (public.is_staff() or batch_id = public.my_batch());
create policy exams_write on public.exams for all    to authenticated using (public.is_staff()) with check (public.is_staff());

-- materials
drop policy if exists materials_read  on public.materials;
drop policy if exists materials_write on public.materials;
create policy materials_read  on public.materials for select to authenticated
  using (public.is_staff() or (public.my_role() is not null and (batch_id is null or batch_id = public.my_batch())));
create policy materials_write on public.materials for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- attendance
drop policy if exists attendance_read  on public.attendance;
drop policy if exists attendance_write on public.attendance;
create policy attendance_read  on public.attendance for select to authenticated using (public.is_staff() or student_id = auth.uid());
create policy attendance_write on public.attendance for all    to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------- PDF storage ----------
insert into storage.buckets (id, name, public) values ('materials', 'materials', false)
on conflict (id) do nothing;

drop policy if exists "materials read"   on storage.objects;
drop policy if exists "materials upload" on storage.objects;
drop policy if exists "materials delete" on storage.objects;
create policy "materials read"   on storage.objects for select to authenticated
  using (bucket_id = 'materials' and public.my_role() is not null);
create policy "materials upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'materials' and public.is_staff());
create policy "materials delete" on storage.objects for delete to authenticated
  using (bucket_id = 'materials' and public.is_staff());

-- =====================================================================
--  প্রথম Admin (তুমি) — README-র ধাপ ৪ শেষ করে নিচের অংশ আলাদা করে Run করো
--  (মান বদলে নিও, তারপর -- চিহ্ন সরিয়ে Run)
-- =====================================================================
-- insert into public.members (id, academy_id, name, phone, role)
-- select id, 'tsa001', 'Musfiqur Rahman', '01XXXXXXXXX', 'admin'
-- from auth.users where email = 'tsa001@tsa.example.com';
