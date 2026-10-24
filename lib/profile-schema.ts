/** Employee dossier fields are additive; historic keys remain unchanged. */
export const PROFILE_SECTIONS = {
 identity:{label:'Identitas & Kontak',fields:{gender:'Jenis kelamin',birth_place:'Tempat lahir',birth_date:'Tanggal lahir',religion:'Agama',nik:'NIK / Nomor KTP',personal_email:'Email pribadi',ktp_address:'Alamat sesuai KTP',domicile_address:'Alamat domisili',phone:'Nomor HP',blood_type:'Golongan darah',clothing_size:'Ukuran baju',pants_size:'Ukuran celana'}},
 family:{label:'Keluarga & PTKP',fields:{marital_status:'Status perkawinan',married_since:'Tanggal perkawinan',spouse_name:'Nama pasangan',spouse_nik:'NIK pasangan',spouse_birth:'Tempat/tanggal lahir pasangan',spouse_job:'Pekerjaan pasangan',spouse_employer:'Tempat kerja pasangan',husband_no_income_proof:'Suami tidak berpenghasilan (butuh bukti)',combined_spouse_income:'Penghasilan istri digabung dalam pajak keluarga (butuh verifikasi)',father:'Nama ayah',mother:'Nama ibu',parents_address:'Alamat orang tua',father_in_law:'Ayah mertua',mother_in_law:'Ibu mertua',in_law_address:'Alamat mertua',tax_status:'Status PTKP historis (arsip)',children_json:'Data anak',dependents_json:'Tanggungan selain anak'}},
 tax_bank:{label:'Pajak & Rekening',fields:{npwp:'NPWP',npwp_name:'Nama sesuai NPWP',npwp_address:'Alamat NPWP',npwp_registered:'Tanggal daftar NPWP',bank_name:'Nama bank',account_number:'Nomor rekening',account_holder:'Pemilik rekening',other_bank:'Bank kedua',other_account:'Rekening kedua'}},
 emergency:{label:'Kontak Darurat & Ahli Waris',fields:{contact_name:'Nama kontak',contact_relation:'Hubungan',contact_phone:'Nomor kontak',contact_address:'Alamat darurat',beneficiaries_json:'Daftar ahli waris'}},
 education:{label:'Pendidikan & Keahlian',fields:{degree_name:'Nama lengkap dengan gelar',last_education:'Pendidikan terakhir',major:'Jurusan',university:'Institusi',informal_training:'Pendidikan nonformal',skills:'Keahlian lain',education_history_json:'Riwayat pendidikan'}},
 declaration:{label:'Pernyataan & Tanda Tangan',fields:{tax_statement:'Pernyataan pajak',heir_statement:'Pernyataan ahli waris',signed_at:'Tanggal pernyataan'}}
} as const
export type ProfileSection=keyof typeof PROFILE_SECTIONS
export const PROFILE_SECTION_KEYS=Object.keys(PROFILE_SECTIONS) as ProfileSection[]
export const PROFILE_DOC_TYPES={
 avatar:{label:'Foto profil',group:'Foto profil'},
 ktp:{label:'Kartu Tanda Penduduk (KTP)',group:'Identitas'},kk:{label:'Kartu Keluarga (KK)',group:'Identitas'},npwp:{label:'Kartu NPWP',group:'Identitas'},passport:{label:'Paspor',group:'Identitas'},
 bpjs_health:{label:'BPJS Kesehatan',group:'Kepesertaan BPJS'},bpjs_employment:{label:'BPJS Ketenagakerjaan',group:'Kepesertaan BPJS'},
 diploma:{label:'Ijazah',group:'Pendidikan'},transcript:{label:'Transkrip nilai',group:'Pendidikan'},certificate:{label:'Sertifikat pelatihan / kompetensi',group:'Pendidikan'},
 bank_account:{label:'Buku tabungan / keterangan rekening',group:'Administrasi'},
 employment_contract:{label:'Kontrak kerja / SK',group:'Administrasi'},
 family_document:{label:'Dokumen keluarga',group:'Keluarga'},spouse_no_income_letter:{label:'Surat keterangan suami tidak berpenghasilan',group:'Keluarga'},tax_statement:{label:'Pernyataan pajak',group:'Keluarga'},heir_statement:{label:'Pernyataan ahli waris',group:'Keluarga'},signature:{label:'Spesimen tanda tangan',group:'Keluarga'},
 // Legacy categories: retain so existing documents never become invalid.
 identity:{label:'Identitas (arsip lama)',group:'Arsip'},family:{label:'Keluarga (arsip lama)',group:'Arsip'},tax_bank:{label:'Pajak / Rekening (arsip lama)',group:'Arsip'},emergency:{label:'Kontak Darurat (arsip lama)',group:'Arsip'},education:{label:'Pendidikan (arsip lama)',group:'Arsip'},declaration:{label:'Pernyataan (arsip lama)',group:'Arsip'},other:{label:'Dokumen lainnya',group:'Lainnya'}
} as const
export type ProfileDocCategory=keyof typeof PROFILE_DOC_TYPES
export const PROFILE_DOC_CATEGORIES=Object.keys(PROFILE_DOC_TYPES) as ProfileDocCategory[]
export function isProfileSection(value:unknown):value is ProfileSection{return typeof value==='string'&&Object.hasOwn(PROFILE_SECTIONS,value)}
