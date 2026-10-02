-- HARMONY Re-Med V2.3 — Signature Management
-- NON-DESTRUCTIVE / IDEMPOTENT
-- Signature image binaries are NOT stored in public assets.
-- After deploy, HR imports the supplied seed signatures through Re-Med > Manajemen Tanda Tangan.

begin;

create table if not exists public.remed_signature_profiles (
  employee_id uuid primary key references public.employees(id) on delete cascade,
  signer_role text null check (signer_role in ('hr','finance')),
  signature_path text null,
  signature_origin text null check (signature_origin in ('seed','upload')),
  signature_file_name text null,
  signature_mime_type text null,
  updated_by_auth_user_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.remed_signature_profiles
  add column if not exists signer_role text null,
  add column if not exists signature_path text null,
  add column if not exists signature_origin text null,
  add column if not exists signature_file_name text null,
  add column if not exists signature_mime_type text null,
  add column if not exists updated_by_auth_user_id uuid null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists remed_signature_profiles_signer_role_uidx
  on public.remed_signature_profiles(signer_role)
  where signer_role is not null;

alter table public.remed_signature_profiles enable row level security;
revoke all on table public.remed_signature_profiles from anon, authenticated;
grant all on table public.remed_signature_profiles to service_role;

alter table public.remed_claims
  add column if not exists hr_signatory_employee_id uuid null references public.employees(id) on delete set null,
  add column if not exists finance_signatory_employee_id uuid null references public.employees(id) on delete set null;

create index if not exists remed_claims_hr_signatory_idx
  on public.remed_claims(hr_signatory_employee_id)
  where hr_signatory_employee_id is not null;

create index if not exists remed_claims_finance_signatory_idx
  on public.remed_claims(finance_signatory_employee_id)
  where finance_signatory_employee_id is not null;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'remed-signatures',
  'remed-signatures',
  false,
  2097152,
  array['image/png','image/jpeg','image/webp']
)
on conflict(id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Default function owners requested by user.
-- Applied only when the role does not already have an assigned signer,
-- so re-running this migration will not overwrite later HR configuration.
do $remed_defaults$
begin
  if not exists(select 1 from public.remed_signature_profiles where signer_role='hr') then
    insert into public.remed_signature_profiles(employee_id, signer_role, updated_at)
    select id, 'hr', now()
    from public.employees
    where employee_number='1010793'
    on conflict(employee_id) do update set signer_role='hr', updated_at=now();
  end if;

  if not exists(select 1 from public.remed_signature_profiles where signer_role='finance') then
    insert into public.remed_signature_profiles(employee_id, signer_role, updated_at)
    select id, 'finance', now()
    from public.employees
    where employee_number='1010801'
    on conflict(employee_id) do update set signer_role='finance', updated_at=now();
  end if;
end;
$remed_defaults$;

create or replace function public.remed_set_signatory_v1(
  p_role text,
  p_employee_id uuid,
  p_actor_auth_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $remed_signature$
declare
  v_role text := lower(trim(coalesce(p_role,'')));
  v_name text;
begin
  if v_role not in ('hr','finance') then
    raise exception 'Role penandatangan harus HR atau Finance.';
  end if;

  select full_name into v_name
  from public.employees
  where id=p_employee_id and coalesce(is_active,true)=true;

  if v_name is null then
    raise exception 'Employee penandatangan tidak ditemukan atau nonaktif.';
  end if;

  if exists(
    select 1 from public.remed_signature_profiles
    where employee_id=p_employee_id
      and signer_role is not null
      and signer_role<>v_role
  ) then
    raise exception 'Employee tersebut sudah menjadi penandatangan role lain.';
  end if;

  update public.remed_signature_profiles
  set signer_role=null, updated_at=now(), updated_by_auth_user_id=p_actor_auth_user_id
  where signer_role=v_role and employee_id<>p_employee_id;

  insert into public.remed_signature_profiles(
    employee_id, signer_role, updated_by_auth_user_id, updated_at
  )
  values(p_employee_id, v_role, p_actor_auth_user_id, now())
  on conflict(employee_id) do update set
    signer_role=excluded.signer_role,
    updated_by_auth_user_id=excluded.updated_by_auth_user_id,
    updated_at=now();

  return jsonb_build_object(
    'role', v_role,
    'employee_id', p_employee_id,
    'employee_name', v_name
  );
end;
$remed_signature$;

revoke all on function public.remed_set_signatory_v1(text,uuid,uuid) from public, anon, authenticated;
grant execute on function public.remed_set_signatory_v1(text,uuid,uuid) to service_role;

-- Snapshot current function owners for claims that have already passed approval.
update public.remed_claims c
set hr_signatory_employee_id = p.employee_id
from public.remed_signature_profiles p
where p.signer_role='hr'
  and c.hr_signatory_employee_id is null
  and c.hr_reviewed_at is not null
  and c.status in ('pending_finance','waiting_payment','paid');

update public.remed_claims c
set finance_signatory_employee_id = p.employee_id
from public.remed_signature_profiles p
where p.signer_role='finance'
  and c.finance_signatory_employee_id is null
  and c.finance_reviewed_at is not null
  and c.status in ('waiting_payment','paid');

commit;
