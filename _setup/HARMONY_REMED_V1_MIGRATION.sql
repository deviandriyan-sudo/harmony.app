-- HARMONY + RE-MED V1.1.2 DATABASE MIGRATION
-- IMPORTANT FOR SUPABASE SQL EDITOR:
-- 1) Open this WHOLE file.
-- 2) Press Ctrl+A so the entire script is selected.
-- 3) Click Run. Never execute a fragment beginning with IF/ELSIF/END IF.
-- 4) This file uses explicit $remed_fn$ delimiters for every PL/pgSQL function body.

-- HARMONY + Re-Med integrated migration V1.1.1 (legacy DB consolidation)
-- Baseline: HARMONY V8.1.2 Stable Pre-Outsource
-- Re-Med uses the SAME Supabase project and the existing public.employees master.

begin;

create extension if not exists pgcrypto;

create table if not exists public.remed_claim_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.remed_user_access (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid,
  employee_id uuid references public.employees(id) on delete set null,
  email text not null,
  role text not null check (role in ('employee','hr','finance')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists remed_user_access_email_uq on public.remed_user_access (lower(email));
create unique index if not exists remed_user_access_auth_user_uq on public.remed_user_access (auth_user_id) where auth_user_id is not null;
create index if not exists remed_user_access_employee_idx on public.remed_user_access(employee_id);

create table if not exists public.remed_entitlements (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete restrict,
  period_year integer not null check (period_year between 2020 and 2100),
  plafond_total numeric(14,2) not null default 0 check (plafond_total >= 0),
  legacy_used numeric(14,2) not null default 0 check (legacy_used >= 0),
  current_used numeric(14,2) not null default 0 check (current_used >= 0),
  reserved_amount numeric(14,2) not null default 0 check (reserved_amount >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(employee_id, period_year)
);

create table if not exists public.remed_claim_sequences (
  period_key text primary key,
  last_value integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.remed_claims (
  id uuid primary key default gen_random_uuid(),
  claim_number text not null unique,
  employee_id uuid not null references public.employees(id) on delete restrict,
  claim_type_id uuid not null references public.remed_claim_types(id) on delete restrict,
  treatment_date date not null,
  provider_name text,
  submitted_amount numeric(14,2) not null check (submitted_amount > 0),
  approved_amount numeric(14,2) check (approved_amount is null or approved_amount > 0),
  employee_note text,
  status text not null check (status in ('pending_hr','rejected_hr','pending_finance','rejected_finance','waiting_payment','paid','cancelled','legacy_record')),
  hr_note text,
  hr_reviewed_by uuid,
  hr_reviewed_at timestamptz,
  finance_note text,
  finance_reviewed_by uuid,
  finance_reviewed_at timestamptz,
  bank_name text,
  bank_account_number text,
  bank_account_name text,
  payment_date date,
  payment_reference text,
  payment_proof_path text,
  affects_entitlement boolean not null default true,
  legacy_status text,
  legacy_receipt_url text,
  legacy_payment_proof_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists remed_claims_employee_idx on public.remed_claims(employee_id, created_at desc);
create index if not exists remed_claims_status_idx on public.remed_claims(status, created_at desc);
create index if not exists remed_claims_treatment_idx on public.remed_claims(treatment_date);

create table if not exists public.remed_claim_attachments (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.remed_claims(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  file_size bigint,
  attachment_kind text not null check (attachment_kind in ('receipt','payment_proof')),
  uploaded_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists remed_claim_attachments_claim_idx on public.remed_claim_attachments(claim_id);

create table if not exists public.remed_status_logs (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.remed_claims(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_auth_user_id uuid,
  actor_email text,
  actor_role text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists remed_status_logs_claim_idx on public.remed_status_logs(claim_id, created_at);

create table if not exists public.remed_payment_logs (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.remed_claims(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  payment_date date not null,
  payment_reference text,
  payment_proof_path text,
  actor_auth_user_id uuid,
  actor_email text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.remed_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_auth_user_id uuid,
  actor_email text,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists remed_audit_logs_entity_idx on public.remed_audit_logs(entity_type, entity_id, created_at desc);


create table if not exists public.remed_legacy_imports (
  id uuid primary key default gen_random_uuid(),
  source_table text not null,
  source_id text not null,
  employee_id uuid references public.employees(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  unique(source_table, source_id)
);
create index if not exists remed_legacy_imports_employee_idx on public.remed_legacy_imports(employee_id, imported_at desc);

create or replace function public.remed_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $remed_fn$
begin
  new.updated_at = now();
  return new;
end;
$remed_fn$;

drop trigger if exists remed_claim_types_touch on public.remed_claim_types;
create trigger remed_claim_types_touch before update on public.remed_claim_types for each row execute function public.remed_touch_updated_at();
drop trigger if exists remed_user_access_touch on public.remed_user_access;
create trigger remed_user_access_touch before update on public.remed_user_access for each row execute function public.remed_touch_updated_at();
drop trigger if exists remed_entitlements_touch on public.remed_entitlements;
create trigger remed_entitlements_touch before update on public.remed_entitlements for each row execute function public.remed_touch_updated_at();
drop trigger if exists remed_claims_touch on public.remed_claims;
create trigger remed_claims_touch before update on public.remed_claims for each row execute function public.remed_touch_updated_at();

insert into public.remed_claim_types(code,name,description,sort_order,is_active) values
  ('outpatient','Rawat Jalan','Biaya perawatan medis tanpa rawat inap.',10,true),
  ('inpatient','Rawat Inap','Biaya perawatan dengan rawat inap.',20,true),
  ('medicine','Obat','Pembelian obat sesuai ketentuan reimbursement.',30,true),
  ('dental','Dental','Perawatan gigi.',40,true),
  ('glasses','Kacamata','Pembelian atau penggantian kacamata.',50,true),
  ('maternity','Maternity','Biaya terkait persalinan sesuai ketentuan.',60,true),
  ('medical_checkup','Medical Check Up','Pemeriksaan kesehatan.',70,true),
  ('other','Lainnya','Klaim medical lain yang diizinkan.',100,true)
on conflict(code) do update set name=excluded.name, description=excluded.description, sort_order=excluded.sort_order;

-- Legacy Re-Med import staging (passwords are intentionally excluded).
-- V1.1.1: use short-lived regular staging tables instead of TEMP TABLE.
-- This is robust in Supabase SQL runners that may commit between statements.
drop table if exists public._remed_migration_legacy_users;
create table public._remed_migration_legacy_users (
  legacy_id bigint primary key,
  full_name text not null,
  email text not null,
  role text not null,
  employee_number text,
  phone text
);
revoke all on table public._remed_migration_legacy_users from anon, authenticated;

insert into public._remed_migration_legacy_users(legacy_id,full_name,email,role,employee_number,phone) values
    (43, 'Finance', 'finance@polteksimasberau.ac.id', 'finance', '67890', null),
    (44, 'HR', 'hr@polteksimasberau.ac.id', 'hr', '16278', null),
    (46, 'Fanny Rizki', 'fanny.rizki@polteksimasberau.ac.id', 'employee', '1010689', '6281336198890'),
    (47, 'Dewi Safitriani', 'dewisafitriani@polteksimasberau.ac.id', 'employee', '1010767', '628115444685'),
    (48, 'Dedy Sufriansyah', 'dedy.sufriansyah@polteksimasberau.ac.id', 'employee', '1010770', '6281347004321'),
    (49, 'Zulkarnaen', 'zulkarnaen@polteksimasberau.ac.id', 'employee', '1010771', '6282250838881'),
    (50, 'Masnur', 'masnur@polteksimasberau.ac.id', 'employee', '1010772', '6281254508975'),
    (51, 'Munawar Yulianto', 'munawar.yulianto@polteksimasberau.ac.id', 'employee', '1010773', '6281321210631'),
    (52, 'Renal Fajri', 'renalfajri@polteksimasberau.ac.id', 'employee', '1010774', '6285195891234'),
    (53, 'Hamim Rachman', 'hamim@polteksimasberau.ac.id', 'employee', '1010775', '6281256660812'),
    (54, 'Okki Mandasari', 'okkimandasari@polteksimasberau.ac.id', 'employee', '1010776', '6282148784156'),
    (55, 'Maria Relita Ndeto', 'mariarelita@polteksimasberau.ac.id', 'employee', '1010777', '6282247692788'),
    (56, 'Arjuliska Nazar Eka Saputri', 'arjuliskanazar@polteksimasberau.ac.id', 'employee', '1010778', '6285218900799'),
    (57, 'Ilmawan Suryapradana', 'ilmawan@polteksimasberau.ac.id', 'employee', '1010779', '6285394452711'),
    (58, 'Fajariyah Mulyani', 'fajariyah.mulyani@polteksimasberau.ac.id', 'employee', '1010780', '6282264632028'),
    (59, 'Loryena Ayu Karondia', 'loryenaayu@polteksimasberau.ac.id', 'employee', '1010781', '6282211661709'),
    (60, 'Feri Putra Prakus Tidar', 'feri@polteksimasberau.ac.id', 'employee', '1010782', '6281331451484'),
    (61, 'Arfan Halim', 'arfan.halim@polteksimasberau.ac.id', 'employee', '1010784', '6285299198244'),
    (62, 'Gita Amelia', 'gita.amelia@polteksimasberau.ac.id', 'employee', '1010785', '6282350612706'),
    (63, 'Muhammad Fadly Dani', 'muhammadfadlydani@polteksimasberau.ac.id', 'employee', '1010786', '6285215712012'),
    (64, 'Nadya Novi Rahmadana', 'nadya@polteksimasberau.ac.id', 'employee', '1010787', '6282231484894'),
    (65, 'Dzul Fadli', 'dzulfadli@polteksimasberau.ac.id', 'employee', '1010788', '6285247625303'),
    (66, 'Kamelia Saputri', 'kamelia.saputri@polteksimasberau.ac.id', 'employee', '1010789', '6281288808130'),
    (67, 'Faisal Fachrureza', 'faisal@polteksimasberau.ac.id', 'employee', '1010791', '6285941915929'),
    (68, 'Irma Yusiyanti', 'irma.yusiyanti@polteksimasberau.ac.id', 'employee', '1010792', '6288216232012'),
    (69, 'Devi Andriyan Subakti', 'devi.andriyan@polteksimasberau.ac.id', 'employee', '1010793', '6281229722175'),
    (70, 'Muhammad Noor Arridho', 'arridho@polteksimasberau.ac.id', 'employee', '1010794', '6281235106416'),
    (71, 'Zulfahmi Noor', 'zulfahmi@polteksimasberau.ac.id', 'employee', '1010795', '6285399329322'),
    (72, 'Murdawati', 'murdawati@polteksimasberau.ac.id', 'employee', '1010796', '628126770671'),
    (73, 'Syaiful Muflichin Purnama', 'sylpurnama@polteksimasberau.ac.id', 'employee', '1010797', '6285743131314'),
    (74, 'Nurya Ramadhania', 'nurya.ramadhania@polteksimasberau.ac.id', 'employee', '1010799', '6285899179827'),
    (75, 'Nur Ainun Musvirah', 'nur.ainun@polteksimasberau.ac.id', 'employee', '1010800', '6282250243318'),
    (76, 'Nova Tri Anggraini', 'nova@polteksimasberau.ac.id', 'employee', '1010801', '6282155201268'),
    (77, 'Devika Rahma Damayanti Yusuf', 'devika@polteksimasberau.ac.id', 'employee', '1010803', '62895636731469'),
    (78, 'Nurmasitya Kemalaintan', 'nurmasitya@polteksimasberau.ac.id', 'employee', '1010804', '6281392432063'),
    (79, 'Gilang Restu Prakoso', 'gilang.restu@polteksimasberau.ac.id', 'employee', '1010808', '6285245892021'),
    (80, 'Tiffany Fredy', 'tiffany@polteksimasberau.ac.id', 'employee', '1010809', '6281545981597'),
    (81, 'Muhammad Masbukhin', 'masbukhin@polteksimasberau.ac.id', 'employee', '1010810', '6285930095030'),
    (82, 'Vincentsius Felmi Ajang', 'vincentsius@polteksimasberau.ac.id', 'employee', '1010811', '6285167267017');

drop table if exists public._remed_migration_legacy_employees;
create table public._remed_migration_legacy_employees (
  legacy_id bigint primary key,
  full_name text not null,
  plafond_total numeric(14,2) not null,
  remaining_amount numeric(14,2) not null,
  legacy_department text,
  legacy_position text
);
revoke all on table public._remed_migration_legacy_employees from anon, authenticated;

insert into public._remed_migration_legacy_employees(legacy_id,full_name,plafond_total,remaining_amount,legacy_department,legacy_position) values
    (61, 'Arfan Halim', 5000000, 3286000, 'Perawatan Mesin', 'Dosen'),
    (56, 'Arjuliska Nazar Eka Saputri', 3000000, 2410200, 'Kemahasiswaan dan Kerjasama', 'Staf Kemahasiswaan Non Akademik'),
    (48, 'Dedy Sufriansyah', 3000000, 2499400, 'Perawatan Mesin', 'Instruktur'),
    (69, 'Devi Andriyan Subakti', 3000000, 2935000, 'Human Resource', 'Staf'),
    (77, 'Devika Rahma Damayanti Yusuf', 3000000, 3000000, 'Survey dan Pemetaan', 'Dosen'),
    (47, 'Dewi Safitriani', 5000000, 4509000, 'Teknologi Rekayasa Logistik', 'Ketua Program Studi'),
    (65, 'Dzul Fadli', 3000000, 3000000, 'Kemahasiswaan dan Kerjasama', 'Staf'),
    (67, 'Faisal Fachrureza', 3000000, 2530000, 'Layanan Administrasi Akademik', 'Staf'),
    (58, 'Fajariyah Mulyani', 3000000, 2755000, 'Perawatan Mesin', 'Dosen'),
    (46, 'Fanny Rizki', 5000000, 5000000, 'Kemahasiswaan dan Kerjasama', 'Wakil Direktur'),
    (60, 'Feri Putra Prakus Tidar', 5000000, 1271208, 'Unit Penjaminan Mutu Internal / Perawatan Mesin', 'Kepala Unit/Dosen'),
    (79, 'Gilang Restu Prakoso', 3000000, 3000000, 'Survey dan Pemetaan', 'Instruktur'),
    (62, 'Gita Amelia', 3000000, 2675000, 'Sekretariat dan Tata Naskah Direksi', 'Sekretaris'),
    (53, 'Hamim Rachman', 5000000, 3517800, 'Kemahasiswaan dan Kerjasama / Teknologi Rekayasa Logistik', 'Kepala Unit Kerjasama / Dosen'),
    (57, 'Ilmawan Suryapradana', 3000000, 0, 'Perawatan Mesin', 'Dosen'),
    (68, 'Irma Yusiyanti', 3000000, 0, 'Kemahasiswaan dan Kerjasama / Survey dan Pemetaan', 'Staf Kemahasiswaan Akademik / Dosen'),
    (66, 'Kamelia Saputri', 3000000, 2600000, 'Perpustakaan', 'Pustakawan'),
    (59, 'Loryena Ayu Karondia', 5000000, 5000000, 'Survey dan Pemetaan', 'Ketua Program Studi'),
    (55, 'Maria Relita Ndeto', 3000000, 0, 'Kemahasiswaan dan Kerjasama', 'Staf'),
    (50, 'Masnur', 3000000, 3000000, 'Perawatan Mesin', 'Instruktur'),
    (63, 'Muhammad Fadly Dani', 3000000, 2110000, 'Survey dan Pemetaan', 'Instruktur'),
    (81, 'Muhammad Masbukhin', 3000000, 1749224, 'Unit Penelitian, Pengabdian, dan Sentra Penelitian Terapan / Teknologi Rekayasa Logistik', 'Kepala Unit / Dosen'),
    (70, 'Muhammad Noor Arridho', 3000000, 2409000, 'Teknologi Rekayasa Logistik', 'Dosen'),
    (51, 'Munawar Yulianto', 3000000, 3000000, 'Perawatan Mesin', 'Instruktur'),
    (72, 'Murdawati', 3000000, 3000000, 'Survey dan Pemetaan', 'Dosen'),
    (64, 'Nadya Novi Rahmadana', 3000000, 1498000, 'Survey dan Pemetaan', 'Instruktur'),
    (76, 'Nova Tri Anggraini', 3000000, 1419950, 'Finance', 'Staf'),
    (75, 'Nur Ainun Musvirah', 3000000, 2437114, 'Teknologi Rekayasa Logistik', 'Instruktur'),
    (78, 'Nurmasitya Kemalaintan', 3000000, 3000000, 'Teknologi Rekayasa Logistik', 'Dosen'),
    (74, 'Nurya Ramadhania', 3000000, 3000000, 'Survey dan Pemetaan', 'Dosen'),
    (54, 'Okki Mandasari', 3000000, 3000000, 'Layanan Administrasi Akademik', 'Supervisor'),
    (52, 'Renal Fajri', 5000000, 5000000, 'Perawatan Mesin', 'Ketua Program Studi'),
    (73, 'Syaiful Muflichin Purnama', 3000000, 3000000, 'Survey dan Pemetaan', 'Dosen'),
    (80, 'Tiffany Fredy', 3000000, 3000000, 'Kemahasiswaan dan Kerjasama', 'Staf'),
    (82, 'Vincentsius Felmi Ajang', 3000000, 3000000, 'Teknologi Rekayasa Logistik', 'Instruktur'),
    (71, 'Zulfahmi Noor', 5000000, 5000000, 'Language and Career Center / Teknologi Rekayasa Logistik', 'Ketua Unit / Dosen'),
    (49, 'Zulkarnaen', 5000000, 5000000, 'Sarana dan Prasarana', 'Kepala Unit');

drop table if exists public._remed_migration_legacy_claims;
create table public._remed_migration_legacy_claims (
  legacy_id bigint primary key,
  full_name text not null,
  claim_type_name text,
  amount numeric(14,2) not null,
  treatment_date date,
  employee_note text,
  legacy_created_at timestamptz,
  receipt_url text,
  legacy_status text,
  claim_number text,
  approved_by_hr text,
  approved_by_finance text,
  payment_date date,
  payment_proof_url text,
  phone text,
  bank_name text,
  bank_account_number text,
  bank_account_name text,
  finance_note text
);
revoke all on table public._remed_migration_legacy_claims from anon, authenticated;

insert into public._remed_migration_legacy_claims(
  legacy_id,full_name,claim_type_name,amount,treatment_date,employee_note,legacy_created_at,receipt_url,
  legacy_status,claim_number,approved_by_hr,approved_by_finance,payment_date,payment_proof_url,phone,
  bank_name,bank_account_number,bank_account_name,finance_note
) values
    (23, 'Vincentsius Felmi Ajang', 'Kacamata', 250000, '2026-05-19', 'Biaya pembelian kacamata', '2026-05-19 08:04:17.314026+00', 'https://vcquglaxrptwhubnrcgo.supabase.co/storage/v1/object/public/reimbursement-files/2629b847-cb8e-4c2b-8f1b-fa592560749c.jpeg', 'approved', 'CLM-1779177856945', 'HR', 'Finance', null, 'https://vcquglaxrptwhubnrcgo.supabase.co/storage/v1/object/public/payment-proof/1a5b4fb4-88cd-4495-9366-fabe8aafd540.jpeg', '6285167267017', 'Bank Sinarmas', '1234567890', 'Bank Sinarmas', null);

-- Consolidate identity data into the existing HARMONY employee master without overwriting current canonical values.
update public.employees e
set
  employee_number = case when nullif(trim(coalesce(e.employee_number,'')), '') is null then u.employee_number else e.employee_number end,
  email = case when nullif(trim(coalesce(e.email,'')), '') is null then lower(u.email) else e.email end,
  phone = case when nullif(trim(coalesce(e.phone,'')), '') is null then u.phone else e.phone end,
  updated_at = now()
from public._remed_migration_legacy_users u
where u.role='employee'
  and lower(trim(e.full_name))=lower(trim(u.full_name))
  and (
    (nullif(trim(coalesce(e.employee_number,'')), '') is null and nullif(trim(coalesce(u.employee_number,'')), '') is not null)
    or (nullif(trim(coalesce(e.email,'')), '') is null and nullif(trim(coalesce(u.email,'')), '') is not null)
    or (nullif(trim(coalesce(e.phone,'')), '') is null and nullif(trim(coalesce(u.phone,'')), '') is not null)
  );

-- Existing HARMONY users receive Re-Med access without duplicating the HARMONY role model.
insert into public.remed_user_access(auth_user_id,employee_id,email,role,is_active)
select coalesce((select u.id from auth.users u where lower(u.email)=lower(au.email) limit 1), au.id),
       au.employee_id,
       lower(trim(au.email)),
       case when lower(au.role)='hr' then 'hr' else 'employee' end,
       coalesce(au.is_active,true)
from public.app_users au
where lower(au.role) in ('hr','employee')
  and (lower(au.role)='hr' or au.employee_id is not null)
on conflict do nothing;

-- Legacy Employee access is only used when HARMONY does not already have Re-Med access for that employee.
insert into public.remed_user_access(auth_user_id,employee_id,email,role,is_active)
select (select a.id from auth.users a where lower(a.email)=lower(u.email) limit 1),
       e.id,
       lower(trim(u.email)),
       'employee',
       true
from public._remed_migration_legacy_users u
join public.employees e on lower(trim(e.full_name))=lower(trim(u.full_name))
where u.role='employee'
  and not exists(select 1 from public.remed_user_access r where r.employee_id=e.id and r.role='employee')
  and not exists(select 1 from public.remed_user_access r where lower(r.email)=lower(u.email))
on conflict do nothing;

-- Legacy generic HR/Finance identities become Re-Med-only access. Plaintext passwords are never migrated.
insert into public.remed_user_access(auth_user_id,employee_id,email,role,is_active)
select (select a.id from auth.users a where lower(a.email)=lower(u.email) limit 1),
       null,
       lower(trim(u.email)),
       u.role,
       true
from public._remed_migration_legacy_users u
where u.role in ('hr','finance')
on conflict do nothing;

-- Preserve 2026 plafond + remaining balance as opening historical balance.
insert into public.remed_entitlements(employee_id,period_year,plafond_total,legacy_used,current_used,reserved_amount,note)
select e.id,
       2026,
       l.plafond_total,
       greatest(0,l.plafond_total-l.remaining_amount),
       0,
       0,
       'Opening historical balance dari Re-Med legacy CSV; saldo lama tidak dihitung ulang dari detail reimbursement.'
from public._remed_migration_legacy_employees l
join public.employees e on lower(trim(e.full_name))=lower(trim(l.full_name))
on conflict(employee_id,period_year) do nothing;

-- Preserve every supplied legacy reimbursement as a historical audit claim that does not deduct entitlement again.
insert into public.remed_claims(
  claim_number, employee_id, claim_type_id, treatment_date, provider_name, submitted_amount, approved_amount,
  employee_note, status, hr_note, finance_note, bank_name, bank_account_number, bank_account_name,
  payment_date, affects_entitlement, legacy_status, legacy_receipt_url, legacy_payment_proof_url, created_at
)
select
  c.claim_number,
  e.id,
  ct.id,
  c.treatment_date,
  null,
  c.amount,
  case when lower(coalesce(c.legacy_status,'')) in ('approved','paid') then c.amount else null end,
  c.employee_note,
  'legacy_record',
  nullif(concat_ws(' / ', nullif(c.approved_by_hr,''), nullif(c.approved_by_finance,'')), ''),
  c.finance_note,
  c.bank_name,
  c.bank_account_number,
  c.bank_account_name,
  c.payment_date,
  false,
  c.legacy_status,
  c.receipt_url,
  c.payment_proof_url,
  coalesce(c.legacy_created_at,now())
from public._remed_migration_legacy_claims c
join public.employees e on lower(trim(e.full_name))=lower(trim(c.full_name))
join public.remed_claim_types ct on ct.code = case lower(trim(coalesce(c.claim_type_name,'')))
  when 'kacamata' then 'glasses'
  when 'rawat jalan' then 'outpatient'
  when 'rawat inap' then 'inpatient'
  when 'obat' then 'medicine'
  when 'dental' then 'dental'
  when 'gigi' then 'dental'
  when 'maternity' then 'maternity'
  when 'medical check up' then 'medical_checkup'
  else 'other'
end
where nullif(trim(coalesce(c.claim_number,'')), '') is not null
on conflict(claim_number) do nothing;

-- Keep a sanitized copy of every legacy source row inside the same HARMONY database for traceability.
insert into public.remed_legacy_imports(source_table,source_id,employee_id,payload)
select 'Users_rows', u.legacy_id::text, e.id,
       jsonb_build_object(
         'legacy_id',u.legacy_id,'nama',u.full_name,'email',u.email,'role',u.role,
         'nik',u.employee_number,'nomor_wa',u.phone
       )
from public._remed_migration_legacy_users u
left join public.employees e on u.role='employee' and lower(trim(e.full_name))=lower(trim(u.full_name))
on conflict(source_table,source_id) do nothing;

insert into public.remed_legacy_imports(source_table,source_id,employee_id,payload)
select 'employees_rows', l.legacy_id::text, e.id,
       jsonb_build_object(
         'legacy_id',l.legacy_id,'nama',l.full_name,'plafond',l.plafond_total,'sisa_plafond',l.remaining_amount,
         'department',l.legacy_department,'jabatan',l.legacy_position
       )
from public._remed_migration_legacy_employees l
left join public.employees e on lower(trim(e.full_name))=lower(trim(l.full_name))
on conflict(source_table,source_id) do nothing;

insert into public.remed_legacy_imports(source_table,source_id,employee_id,payload)
select 'reimbursements_rows', c.legacy_id::text, e.id,
       jsonb_build_object(
         'legacy_id',c.legacy_id,'nama',c.full_name,'jenis_claim',c.claim_type_name,'nominal',c.amount,
         'tanggal_pengobatan',c.treatment_date,'catatan',c.employee_note,'created_at',c.legacy_created_at,
         'bukti_kuitansi',c.receipt_url,'status',c.legacy_status,'claim_number',c.claim_number,
         'approved_by_hr',c.approved_by_hr,'approved_by_finance',c.approved_by_finance,
         'tanggal_bayar',c.payment_date,'bukti_bayar',c.payment_proof_url,'nomor_wa',c.phone,
         'nama_bank',c.bank_name,'nomor_rekening',c.bank_account_number,'nama_pemilik_rekening',c.bank_account_name,
         'finance_note',c.finance_note
       )
from public._remed_migration_legacy_claims c
left join public.employees e on lower(trim(e.full_name))=lower(trim(c.full_name))
on conflict(source_table,source_id) do nothing;

-- Remove migration-only staging data before creating runtime functions.
drop table if exists public._remed_migration_legacy_claims;
drop table if exists public._remed_migration_legacy_employees;
drop table if exists public._remed_migration_legacy_users;

create or replace function public.remed_next_claim_number()
returns text
language plpgsql
security definer
set search_path = public
as $remed_fn$
declare
  v_period text := to_char(now(), 'YYYYMM');
  v_next integer;
begin
  insert into public.remed_claim_sequences(period_key,last_value,updated_at)
  values(v_period,1,now())
  on conflict(period_key) do update
    set last_value = public.remed_claim_sequences.last_value + 1, updated_at=now()
  returning last_value into v_next;
  return 'RM-' || v_period || '-' || lpad(v_next::text,5,'0');
end;
$remed_fn$;

create or replace function public.remed_submit_claim_v1(
  p_employee_id uuid, p_claim_type_id uuid, p_treatment_date date, p_provider_name text,
  p_submitted_amount numeric, p_employee_note text, p_bank_name text, p_bank_account_number text,
  p_bank_account_name text, p_actor_auth_user_id uuid, p_actor_email text
)
returns table(claim_id uuid, claim_number text)
language plpgsql
security definer
set search_path = public
as $remed_fn$
declare
  v_ent public.remed_entitlements%rowtype;
  v_claim_id uuid;
  v_claim_number text;
  v_available numeric;
  v_year integer := extract(year from p_treatment_date)::integer;
begin
  if p_submitted_amount is null or p_submitted_amount <= 0 then raise exception 'Nominal klaim harus lebih dari 0.'; end if;
  if not exists(select 1 from public.remed_user_access a where a.auth_user_id=p_actor_auth_user_id and a.employee_id=p_employee_id and a.role='employee' and a.is_active) then
    raise exception 'Akun employee tidak berhak membuat klaim untuk employee ini.';
  end if;
  if not exists(select 1 from public.remed_claim_types t where t.id=p_claim_type_id and t.is_active) then raise exception 'Jenis klaim tidak aktif.'; end if;

  select * into v_ent from public.remed_entitlements where employee_id=p_employee_id and period_year=v_year for update;
  if not found then raise exception 'Plafond tahun % belum diatur oleh HR.', v_year; end if;
  v_available := v_ent.plafond_total-v_ent.legacy_used-v_ent.current_used-v_ent.reserved_amount;
  if p_submitted_amount > v_available then raise exception 'Nominal melebihi sisa plafond tersedia.'; end if;

  v_claim_number := public.remed_next_claim_number();
  insert into public.remed_claims(claim_number,employee_id,claim_type_id,treatment_date,provider_name,submitted_amount,employee_note,status,bank_name,bank_account_number,bank_account_name)
  values(v_claim_number,p_employee_id,p_claim_type_id,p_treatment_date,nullif(trim(p_provider_name),''),p_submitted_amount,nullif(trim(p_employee_note),''),'pending_hr',trim(p_bank_name),trim(p_bank_account_number),trim(p_bank_account_name))
  returning id into v_claim_id;

  update public.remed_entitlements set reserved_amount=reserved_amount+p_submitted_amount where id=v_ent.id;
  insert into public.remed_status_logs(claim_id,from_status,to_status,actor_auth_user_id,actor_email,actor_role,note)
  values(v_claim_id,null,'pending_hr',p_actor_auth_user_id,p_actor_email,'employee','Pengajuan reimbursement dibuat.');
  insert into public.remed_audit_logs(actor_auth_user_id,actor_email,actor_role,action,entity_type,entity_id,metadata)
  values(p_actor_auth_user_id,p_actor_email,'employee','claim_submitted','remed_claim',v_claim_id,jsonb_build_object('amount',p_submitted_amount));

  return query select v_claim_id, v_claim_number;
end;
$remed_fn$;

create or replace function public.remed_cancel_claim_v1(
  p_claim_id uuid, p_actor_auth_user_id uuid, p_actor_email text, p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $remed_fn$
declare
  v_claim public.remed_claims%rowtype;
  v_access public.remed_user_access%rowtype;
begin
  select * into v_claim from public.remed_claims where id=p_claim_id for update;
  if not found then raise exception 'Klaim tidak ditemukan.'; end if;
  if v_claim.status <> 'pending_hr' then raise exception 'Hanya klaim yang masih menunggu HR yang dapat dibatalkan.'; end if;

  if p_actor_auth_user_id is not null then
    select * into v_access from public.remed_user_access where auth_user_id=p_actor_auth_user_id and is_active;
    if not found or v_access.role <> 'employee' or v_access.employee_id <> v_claim.employee_id then raise exception 'Akses pembatalan ditolak.'; end if;
  end if;

  if v_claim.affects_entitlement then
    update public.remed_entitlements
      set reserved_amount=greatest(0,reserved_amount-v_claim.submitted_amount)
      where employee_id=v_claim.employee_id and period_year=extract(year from v_claim.treatment_date)::integer;
  end if;
  update public.remed_claims set status='cancelled' where id=v_claim.id;
  insert into public.remed_status_logs(claim_id,from_status,to_status,actor_auth_user_id,actor_email,actor_role,note)
  values(v_claim.id,'pending_hr','cancelled',p_actor_auth_user_id,p_actor_email,case when p_actor_auth_user_id is null then 'system' else 'employee' end,p_reason);
end;
$remed_fn$;

create or replace function public.remed_hr_review_claim_v1(
  p_claim_id uuid, p_decision text, p_approved_amount numeric, p_note text, p_actor_auth_user_id uuid, p_actor_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $remed_fn$
declare
  v_claim public.remed_claims%rowtype;
  v_ent public.remed_entitlements%rowtype;
begin
  if not exists (
    select 1
    from public.remed_user_access
    where auth_user_id = p_actor_auth_user_id
      and role = 'hr'
      and is_active
  ) then
    raise exception 'Akses HR Re-Med ditolak.';
  end if;
  select * into v_claim from public.remed_claims where id=p_claim_id for update;
  if not found then raise exception 'Klaim tidak ditemukan.'; end if;
  if v_claim.status <> 'pending_hr' then raise exception 'Klaim sudah tidak berada pada antrean HR.'; end if;
  select * into v_ent from public.remed_entitlements where employee_id=v_claim.employee_id and period_year=extract(year from v_claim.treatment_date)::integer for update;

  if lower(p_decision)='approve' then
    if p_approved_amount is null or p_approved_amount <= 0 or p_approved_amount > v_claim.submitted_amount then raise exception 'Nominal approved HR tidak valid.'; end if;
    update public.remed_entitlements set reserved_amount=greatest(0,reserved_amount-v_claim.submitted_amount+p_approved_amount) where id=v_ent.id;
    update public.remed_claims set status='pending_finance', approved_amount=p_approved_amount, hr_note=p_note, hr_reviewed_by=p_actor_auth_user_id, hr_reviewed_at=now() where id=v_claim.id;
    insert into public.remed_status_logs(claim_id,from_status,to_status,actor_auth_user_id,actor_email,actor_role,note) values(v_claim.id,'pending_hr','pending_finance',p_actor_auth_user_id,p_actor_email,'hr',p_note);
  elsif lower(p_decision)='reject' then
    update public.remed_entitlements set reserved_amount=greatest(0,reserved_amount-v_claim.submitted_amount) where id=v_ent.id;
    update public.remed_claims set status='rejected_hr', hr_note=p_note, hr_reviewed_by=p_actor_auth_user_id, hr_reviewed_at=now() where id=v_claim.id;
    insert into public.remed_status_logs(claim_id,from_status,to_status,actor_auth_user_id,actor_email,actor_role,note) values(v_claim.id,'pending_hr','rejected_hr',p_actor_auth_user_id,p_actor_email,'hr',p_note);
  else raise exception 'Keputusan HR tidak valid.'; end if;
end;
$remed_fn$;

create or replace function public.remed_finance_review_claim_v1(
  p_claim_id uuid, p_decision text, p_note text, p_actor_auth_user_id uuid, p_actor_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $remed_fn$
declare
  v_claim public.remed_claims%rowtype;
begin
  if not exists (
    select 1
    from public.remed_user_access
    where auth_user_id = p_actor_auth_user_id
      and role = 'finance'
      and is_active
  ) then
    raise exception 'Akses Finance Re-Med ditolak.';
  end if;
  select * into v_claim from public.remed_claims where id=p_claim_id for update;
  if not found then raise exception 'Klaim tidak ditemukan.'; end if;
  if v_claim.status <> 'pending_finance' then raise exception 'Klaim sudah tidak berada pada antrean Finance.'; end if;

  if lower(p_decision)='approve' then
    update public.remed_claims set status='waiting_payment', finance_note=p_note, finance_reviewed_by=p_actor_auth_user_id, finance_reviewed_at=now() where id=v_claim.id;
    insert into public.remed_status_logs(claim_id,from_status,to_status,actor_auth_user_id,actor_email,actor_role,note) values(v_claim.id,'pending_finance','waiting_payment',p_actor_auth_user_id,p_actor_email,'finance',p_note);
  elsif lower(p_decision)='reject' then
    update public.remed_entitlements set reserved_amount=greatest(0,reserved_amount-coalesce(v_claim.approved_amount,v_claim.submitted_amount)) where employee_id=v_claim.employee_id and period_year=extract(year from v_claim.treatment_date)::integer;
    update public.remed_claims set status='rejected_finance', finance_note=p_note, finance_reviewed_by=p_actor_auth_user_id, finance_reviewed_at=now() where id=v_claim.id;
    insert into public.remed_status_logs(claim_id,from_status,to_status,actor_auth_user_id,actor_email,actor_role,note) values(v_claim.id,'pending_finance','rejected_finance',p_actor_auth_user_id,p_actor_email,'finance',p_note);
  else raise exception 'Keputusan Finance tidak valid.'; end if;
end;
$remed_fn$;

create or replace function public.remed_mark_claim_paid_v1(
  p_claim_id uuid, p_payment_date date, p_payment_reference text, p_payment_proof_path text, p_note text,
  p_actor_auth_user_id uuid, p_actor_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $remed_fn$
declare
  v_claim public.remed_claims%rowtype;
  v_amount numeric;
begin
  if not exists (
    select 1
    from public.remed_user_access
    where auth_user_id = p_actor_auth_user_id
      and role = 'finance'
      and is_active
  ) then
    raise exception 'Akses Finance Re-Med ditolak.';
  end if;
  select * into v_claim from public.remed_claims where id=p_claim_id for update;
  if not found then raise exception 'Klaim tidak ditemukan.'; end if;
  if v_claim.status <> 'waiting_payment' then raise exception 'Klaim belum berada pada tahap pembayaran.'; end if;
  v_amount := coalesce(v_claim.approved_amount,v_claim.submitted_amount);

  update public.remed_entitlements
    set reserved_amount=greatest(0,reserved_amount-v_amount), current_used=current_used+v_amount
    where employee_id=v_claim.employee_id and period_year=extract(year from v_claim.treatment_date)::integer;
  update public.remed_claims set status='paid', payment_date=p_payment_date, payment_reference=p_payment_reference, payment_proof_path=p_payment_proof_path, finance_note=coalesce(p_note,finance_note) where id=v_claim.id;
  insert into public.remed_payment_logs(claim_id,amount,payment_date,payment_reference,payment_proof_path,actor_auth_user_id,actor_email,note)
  values(v_claim.id,v_amount,p_payment_date,p_payment_reference,p_payment_proof_path,p_actor_auth_user_id,p_actor_email,p_note);
  insert into public.remed_status_logs(claim_id,from_status,to_status,actor_auth_user_id,actor_email,actor_role,note) values(v_claim.id,'waiting_payment','paid',p_actor_auth_user_id,p_actor_email,'finance',p_note);
end;
$remed_fn$;

create or replace function public.remed_set_entitlement_v1(
  p_employee_id uuid, p_period_year integer, p_plafond_total numeric, p_note text, p_actor_auth_user_id uuid, p_actor_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $remed_fn$
declare
  v_used numeric := 0;
begin
  if not exists (
    select 1
    from public.remed_user_access
    where auth_user_id = p_actor_auth_user_id
      and role = 'hr'
      and is_active
  ) then
    raise exception 'Akses HR Re-Med ditolak.';
  end if;
  select coalesce(legacy_used,0)+coalesce(current_used,0)+coalesce(reserved_amount,0) into v_used from public.remed_entitlements where employee_id=p_employee_id and period_year=p_period_year;
  if found and p_plafond_total < v_used then raise exception 'Plafond tidak boleh lebih kecil dari nilai yang sudah terpakai/terreservasi.'; end if;
  insert into public.remed_entitlements(employee_id,period_year,plafond_total,note) values(p_employee_id,p_period_year,p_plafond_total,p_note)
  on conflict(employee_id,period_year) do update set plafond_total=excluded.plafond_total, note=excluded.note;
  insert into public.remed_audit_logs(actor_auth_user_id,actor_email,actor_role,action,entity_type,entity_id,metadata)
  values(p_actor_auth_user_id,p_actor_email,'hr','entitlement_updated','employee',p_employee_id,jsonb_build_object('year',p_period_year,'plafond_total',p_plafond_total,'note',p_note));
end;
$remed_fn$;

-- Private Storage bucket. New Re-Med files are never public URLs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('remed-private','remed-private',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

-- Re-Med is API-only from the browser. Service role is the database boundary.
alter table public.remed_claim_types enable row level security;
alter table public.remed_user_access enable row level security;
alter table public.remed_entitlements enable row level security;
alter table public.remed_claim_sequences enable row level security;
alter table public.remed_claims enable row level security;
alter table public.remed_claim_attachments enable row level security;
alter table public.remed_status_logs enable row level security;
alter table public.remed_payment_logs enable row level security;
alter table public.remed_audit_logs enable row level security;
alter table public.remed_legacy_imports enable row level security;

revoke all on public.remed_claim_types, public.remed_user_access, public.remed_entitlements, public.remed_claim_sequences, public.remed_claims, public.remed_claim_attachments, public.remed_status_logs, public.remed_payment_logs, public.remed_audit_logs, public.remed_legacy_imports from anon, authenticated;
grant all on public.remed_claim_types, public.remed_user_access, public.remed_entitlements, public.remed_claim_sequences, public.remed_claims, public.remed_claim_attachments, public.remed_status_logs, public.remed_payment_logs, public.remed_audit_logs, public.remed_legacy_imports to service_role;
revoke execute on function public.remed_next_claim_number() from public, anon, authenticated;
revoke execute on function public.remed_submit_claim_v1(uuid,uuid,date,text,numeric,text,text,text,text,uuid,text) from public, anon, authenticated;
revoke execute on function public.remed_cancel_claim_v1(uuid,uuid,text,text) from public, anon, authenticated;
revoke execute on function public.remed_hr_review_claim_v1(uuid,text,numeric,text,uuid,text) from public, anon, authenticated;
revoke execute on function public.remed_finance_review_claim_v1(uuid,text,text,uuid,text) from public, anon, authenticated;
revoke execute on function public.remed_mark_claim_paid_v1(uuid,date,text,text,text,uuid,text) from public, anon, authenticated;
revoke execute on function public.remed_set_entitlement_v1(uuid,integer,numeric,text,uuid,text) from public, anon, authenticated;

grant execute on function public.remed_next_claim_number() to service_role;
grant execute on function public.remed_submit_claim_v1(uuid,uuid,date,text,numeric,text,text,text,text,uuid,text) to service_role;
grant execute on function public.remed_cancel_claim_v1(uuid,uuid,text,text) to service_role;
grant execute on function public.remed_hr_review_claim_v1(uuid,text,numeric,text,uuid,text) to service_role;
grant execute on function public.remed_finance_review_claim_v1(uuid,text,text,uuid,text) to service_role;
grant execute on function public.remed_mark_claim_paid_v1(uuid,date,text,text,text,uuid,text) to service_role;
grant execute on function public.remed_set_entitlement_v1(uuid,integer,numeric,text,uuid,text) to service_role;

commit;
