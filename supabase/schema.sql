-- =====================================================================
-- KN Studio · Supabase schema (run once in Supabase > SQL Editor > New query)
-- บัญชีแยกจาก KTY Hub · สมัคร → ยืนยันอีเมล → รออนุมัติ → แอดมินอนุมัติและกำหนดสิทธิ์
-- รันซ้ำได้ (ใช้ if not exists / or replace)
-- =====================================================================

-- ---------- tables ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  email        text,
  display_name text,
  phone        text,
  extra        jsonb not null default '{}'::jsonb,      -- ช่องสมัครที่แอดมินเพิ่มเอง
  role         text  not null default 'viewer',          -- admin | engineer | drafter | viewer | (บทบาทที่แอดมินสร้าง)
  status       text  not null default 'pending',         -- pending | active | suspended | rejected
  perms        jsonb not null default '{}'::jsonb,       -- สิทธิ์รายคน (ทับค่าของบทบาท)
  expires_at   date,
  note         text,
  created_at   timestamptz not null default now(),
  approved_at  timestamptz,
  approved_by  uuid,
  last_seen    timestamptz
);

create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null default auth.uid() references auth.users on delete cascade,
  name       text not null default 'โครงการใหม่',
  data       jsonb not null default '{}'::jsonb,
  rev        bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.project_members (
  project_id uuid references public.projects on delete cascade,
  user_id    uuid references auth.users on delete cascade,
  can_edit   boolean not null default false,
  primary key (project_id, user_id)
);

-- ---------- helper functions ----------
create or replace function public.kn_is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'active');
$$;

create or replace function public.kn_is_active() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id = auth.uid() and status = 'active'
                and (expires_at is null or expires_at >= current_date));
$$;

create or replace function public.kn_can_see(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from projects where id = p and owner = auth.uid())
      or exists(select 1 from project_members where project_id = p and user_id = auth.uid())
      or kn_is_admin();
$$;

create or replace function public.kn_can_edit(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from projects where id = p and owner = auth.uid())
      or exists(select 1 from project_members where project_id = p and user_id = auth.uid() and can_edit);
$$;

create or replace function public.kn_is_owner(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from projects where id = p and owner = auth.uid());
$$;

-- รายชื่อผู้ใช้ที่ใช้งานอยู่ (สำหรับแชร์โครงการ) · ไม่เปิดเบอร์โทรหรือข้อมูลอื่น
create or replace function public.kn_directory()
returns table(id uuid, display_name text, email text)
language sql stable security definer set search_path = public as $$
  select id, display_name, email from profiles
   where status = 'active' and kn_is_active() order by display_name;
$$;

-- ---------- new user -> profile ----------
create or replace function public.kn_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into profiles(id, email, display_name, phone, extra, role, status, approved_at)
  values (new.id, new.email,
          nullif(m->>'display_name',''), nullif(m->>'phone',''),
          coalesce(m->'extra','{}'::jsonb),
          case when lower(new.email) = 'kittiwat.nach@gmail.com' then 'admin' else 'viewer' end,
          case when lower(new.email) = 'kittiwat.nach@gmail.com' then 'active' else 'pending' end,
          case when lower(new.email) = 'kittiwat.nach@gmail.com' then now() end)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists kn_on_auth_user on auth.users;
create trigger kn_on_auth_user after insert on auth.users
  for each row execute function public.kn_new_user();

-- ผู้ใช้ทั่วไปแก้ได้เฉพาะชื่อ เบอร์ ข้อมูลเพิ่มเติม และเวลาเข้าใช้ล่าสุด
create or replace function public.kn_guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not kn_is_admin() then
    new.role := old.role; new.status := old.status; new.perms := old.perms;
    new.expires_at := old.expires_at; new.approved_at := old.approved_at;
    new.approved_by := old.approved_by; new.email := old.email; new.note := old.note;
  elsif new.status = 'active' and old.status <> 'active' then
    new.approved_at := now(); new.approved_by := auth.uid();
  end if;
  -- กันแอดมินคนสุดท้ายถอดสิทธิ์ตัวเอง
  if old.role = 'admin' and old.status = 'active' and (new.role <> 'admin' or new.status <> 'active')
     and (select count(*) from profiles where role = 'admin' and status = 'active') <= 1 then
    raise exception 'ต้องมีแอดมินที่ใช้งานอยู่อย่างน้อย 1 คน';
  end if;
  return new;
end $$;

drop trigger if exists kn_guard_profile on public.profiles;
create trigger kn_guard_profile before update on public.profiles
  for each row execute function public.kn_guard_profile();

create or replace function public.kn_touch_project() returns trigger
language plpgsql as $$
begin new.updated_at := now(); new.updated_by := auth.uid(); new.rev := old.rev + 1; return new; end $$;

drop trigger if exists kn_touch_project on public.projects;
create trigger kn_touch_project before update on public.projects
  for each row execute function public.kn_touch_project();

-- ---------- row level security ----------
alter table public.profiles        enable row level security;
alter table public.app_settings    enable row level security;
alter table public.projects        enable row level security;
alter table public.project_members enable row level security;

drop policy if exists p_sel on public.profiles;
drop policy if exists p_upd on public.profiles;
drop policy if exists p_del on public.profiles;
create policy p_sel on public.profiles for select using (id = auth.uid() or kn_is_admin());
create policy p_upd on public.profiles for update using (id = auth.uid() or kn_is_admin());
create policy p_del on public.profiles for delete using (kn_is_admin() and id <> auth.uid());

drop policy if exists s_sel on public.app_settings;
drop policy if exists s_all on public.app_settings;
create policy s_sel on public.app_settings for select using (true);          -- ช่องสมัครต้องอ่านได้ก่อนล็อกอิน
create policy s_all on public.app_settings for all using (kn_is_admin()) with check (kn_is_admin());

drop policy if exists pr_sel on public.projects;
drop policy if exists pr_ins on public.projects;
drop policy if exists pr_upd on public.projects;
drop policy if exists pr_del on public.projects;
create policy pr_sel on public.projects for select using (kn_is_active() and kn_can_see(id));
create policy pr_ins on public.projects for insert with check (kn_is_active() and owner = auth.uid());
create policy pr_upd on public.projects for update using (kn_is_active() and kn_can_edit(id));
create policy pr_del on public.projects for delete using (owner = auth.uid() or kn_is_admin());

drop policy if exists pm_sel on public.project_members;
drop policy if exists pm_all on public.project_members;
create policy pm_sel on public.project_members for select using (user_id = auth.uid() or kn_is_owner(project_id) or kn_is_admin());
create policy pm_all on public.project_members for all using (kn_is_owner(project_id)) with check (kn_is_owner(project_id));

grant execute on function public.kn_directory() to authenticated;

-- ---------- default settings (แก้ได้ในหน้าแอดมิน) ----------
insert into public.app_settings(key, value) values
 ('signup_fields', '[{"key":"phone","label":"เบอร์โทร","type":"tel","required":true}]'::jsonb),
 ('roles', '{
   "admin":   {"label":"แอดมิน","beam":"edit","cut":"edit","export":true,"pc":true,"settings":"edit"},
   "engineer":{"label":"วิศวกร","beam":"edit","cut":"edit","export":true,"pc":true,"settings":"edit"},
   "drafter": {"label":"ผู้เขียนแบบ","beam":"edit","cut":"view","export":true,"pc":false,"settings":"view"},
   "viewer":  {"label":"ผู้ดูอย่างเดียว","beam":"view","cut":"view","export":false,"pc":false,"settings":"none"}
 }'::jsonb),
 ('offline', '{"grace_days":14}'::jsonb),
 ('desktop', '{"url":"https://github.com/kong2540/KN-Studio/releases/latest","note":""}'::jsonb)
on conflict (key) do nothing;

-- ถ้าสมัครแอดมินไว้ก่อนรันไฟล์นี้ ให้บรรทัดนี้ยกบัญชีเป็นแอดมิน
update public.profiles set role='admin', status='active', approved_at=coalesce(approved_at,now())
 where lower(email)='kittiwat.nach@gmail.com';
