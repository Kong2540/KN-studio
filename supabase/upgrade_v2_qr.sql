-- KN Studio · อัปเกรด v2: QR Code ดูแบบอย่างเดียว (รันครั้งเดียวใน SQL Editor หลังจาก schema.sql)
alter table public.projects add column if not exists view_token uuid not null default gen_random_uuid();

-- ผู้ใช้ที่ได้รับอนุมัติแล้วเท่านั้น ที่ถือ QR ที่ถูกต้อง จึงเปิดดูโครงการได้ (ดูอย่างเดียว)
create or replace function public.kn_view(p uuid, t uuid)
returns table(id uuid, name text, data jsonb, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select pr.id, pr.name, pr.data, pr.updated_at from projects pr
   where pr.id = p and pr.view_token = t and kn_is_active();
$$;

-- ออก QR ใหม่ (QR เดิมใช้ไม่ได้ทันที) · เฉพาะเจ้าของหรือผู้มีสิทธิ์แก้ไข
create or replace function public.kn_new_token(p uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare t uuid := gen_random_uuid();
begin
  if not (kn_is_active() and kn_can_edit(p)) then raise exception 'ไม่มีสิทธิ์ออก QR ใหม่'; end if;
  update projects set view_token = t where id = p;
  return t;
end $$;

grant execute on function public.kn_view(uuid, uuid) to authenticated;
grant execute on function public.kn_new_token(uuid) to authenticated;
