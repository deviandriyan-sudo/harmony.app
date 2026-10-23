export const PROFILE_SECTIONS = {
  identity: { label: 'Biodata & Kontak', fields: { birth_place: 'Tempat lahir', birth_date: 'Tanggal lahir', religion: 'Agama', nik: 'NIK / Nomor KTP', personal_email: 'Email pribadi', ktp_address: 'Alamat sesuai KTP', domicile_address: 'Alamat domisili', phone: 'Nomor HP', blood_type: 'Golongan darah', clothing_size: 'Ukuran baju', pants_size: 'Ukuran celana' } },
  family: { label: 'Keluarga & Tanggungan', fields: { marital_status: 'Status perkawinan', spouse_name: 'Nama pasangan', spouse_nik: 'NIK pasangan', spouse_birth: 'Tanggal/tempat lahir pasangan', spouse_job: 'Pekerjaan pasangan', spouse_employer: 'Tempat kerja pasangan', father: 'Nama ayah', mother: 'Nama ibu', parents_address: 'Alamat orang tua', father_in_law: 'Ayah mertua', mother_in_law: 'Ibu mertua', in_law_address: 'Alamat mertua', tax_status: 'Status PTKP', children_json: 'Daftar anak' } },
  tax_bank: { label: 'Perpajakan & Rekening', fields: { npwp: 'NPWP', npwp_name: 'Nama sesuai NPWP', npwp_address: 'Alamat NPWP', npwp_registered: 'Tanggal daftar NPWP', bank_name: 'Nama bank', account_number: 'Nomor rekening', account_holder: 'Pemilik rekening', other_bank: 'Bank kedua', other_account: 'Rekening kedua' } },
  emergency: { label: 'Kontak Darurat', fields: { contact_name: 'Nama kontak', contact_relation: 'Hubungan', contact_phone: 'Nomor kontak', contact_address: 'Alamat darurat', beneficiaries_json: 'Daftar ahli waris' } },
  education: { label: 'Pendidikan & Keahlian', fields: { degree_name: 'Nama lengkap dengan gelar', last_education: 'Pendidikan terakhir', major: 'Jurusan', university: 'Institusi', informal_training: 'Pendidikan nonformal', skills: 'Keahlian lain', education_history_json: 'Riwayat pendidikan' } },
  declaration: { label: 'Pernyataan & Tanda Tangan', fields: { tax_statement: 'Pernyataan pajak', heir_statement: 'Pernyataan ahli waris', signed_at: 'Tanggal pernyataan' } },
} as const
export type ProfileSection = keyof typeof PROFILE_SECTIONS
export const PROFILE_SECTION_KEYS = Object.keys(PROFILE_SECTIONS) as ProfileSection[]
export const PROFILE_DOC_CATEGORIES = ['avatar','identity','family','tax_bank','emergency','education','declaration','other'] as const
export function isProfileSection(value: unknown): value is ProfileSection {
  return typeof value === 'string' && Object.hasOwn(PROFILE_SECTIONS, value)
}
