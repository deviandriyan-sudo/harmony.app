-- HARMONY + RE-MED V1.1 PRECHECK -- READ ONLY
-- Run this first in Supabase SQL Editor and export the single result grid to CSV.
-- Do NOT run HARMONY_REMED_V1_MIGRATION.sql until every employee row is MATCHED_EXACTLY_ONCE.

with legacy_users(legacy_id,full_name,email,role,employee_number,phone) as (
  values
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
    (82, 'Vincentsius Felmi Ajang', 'vincentsius@polteksimasberau.ac.id', 'employee', '1010811', '6285167267017')
), mapped as (
  select
    u.*,
    (select count(*) from public.employees e where lower(trim(e.full_name))=lower(trim(u.full_name))) as employee_match_count,
    (select e.id::text from public.employees e where lower(trim(e.full_name))=lower(trim(u.full_name)) limit 1) as harmony_employee_id,
    (select e.employee_number from public.employees e where lower(trim(e.full_name))=lower(trim(u.full_name)) limit 1) as harmony_employee_number,
    (select e.email from public.employees e where lower(trim(e.full_name))=lower(trim(u.full_name)) limit 1) as harmony_employee_email,
    (select e.phone from public.employees e where lower(trim(e.full_name))=lower(trim(u.full_name)) limit 1) as harmony_employee_phone,
    exists(select 1 from public.app_users au where lower(trim(au.email))=lower(trim(u.email))) as harmony_app_user_email_exists,
    exists(select 1 from auth.users a where lower(trim(a.email))=lower(trim(u.email))) as auth_email_exists
  from legacy_users u
)
select
  legacy_id,
  full_name,
  email as legacy_email,
  role as legacy_role,
  employee_number as legacy_employee_number,
  phone as legacy_phone,
  harmony_employee_id,
  harmony_employee_number,
  harmony_employee_email,
  harmony_employee_phone,
  harmony_app_user_email_exists,
  auth_email_exists,
  case
    when role in ('hr','finance') then 'ROLE_ONLY_EXPECTED'
    when employee_match_count=1 then 'MATCHED_EXACTLY_ONCE'
    when employee_match_count=0 then 'MISSING_IN_HARMONY_EMPLOYEES'
    else 'DUPLICATE_NAME_IN_HARMONY_EMPLOYEES'
  end as mapping_status,
  employee_match_count,
  to_regclass('public.remed_user_access') is not null as remed_schema_already_exists,
  to_regclass('public.remed_entitlements') is not null as remed_entitlements_already_exists,
  to_regclass('public.remed_claims') is not null as remed_claims_already_exists
from mapped
order by case role when 'employee' then 1 when 'hr' then 2 else 3 end, full_name;
