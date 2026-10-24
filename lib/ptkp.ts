/** PTKP recommendation only. Payroll/canonical tax records are not modified here.
 * Pasal 7 UU PPh (UU HPP), PMK 168/2023, DJP guidance.
 * Status is determined from conditions on 1 January of the tax year.
 */
import { createHash } from 'node:crypto'
export function currentTaxYearWita(){return Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Makassar',year:'numeric'}).format(new Date()))}
export type PtkpResult={year:number;code:string|null;annualAmount:number|null;dependentsCount:number;unresolvedCount:number;eligibleNames:string[];notCounted:string[];warnings:string[];needsHRReview:boolean;basis:'employee_declaration';fingerprint:string}
type RecordValue=Record<string,unknown>
function str(v:unknown){return typeof v==='string'?v.trim():''}
function choice(v:unknown){return str(v).toLowerCase().replace(/[\s_-]+/g,'')}
function yes(v:unknown){return ['yes','ya','true','1','iya'].includes(choice(v))}
function no(v:unknown){return ['no','tidak','false','0'].includes(choice(v))}
function readArray(v:unknown):RecordValue[]{try{const x=typeof v==='string'?JSON.parse(v):v;return Array.isArray(x)?x.filter(y=>y&&typeof y==='object'&&!Array.isArray(y)).slice(0,30):[]}catch{return []}}
function dateOnly(v:unknown){const s=str(v);if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;const d=new Date(s+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s?s:null}
function ageAt(birth:string,year:number){const [y,m,d]=birth.split('-').map(Number);return year-y-(m>1||m===1&&d>1?1:0)}
function relation(v:unknown){return choice(v).replace(/[^a-z]/g,'')}
function allowedRelation(v:unknown){return ['child','anak','anakkandung','anakangkat','anaktiri','father','ayah','ayahkandung','mother','ibu','ibukandung','fatherinlaw','mertua','ayahmertua','motherinlaw','ibumertua'].includes(relation(v))}
function simpleFingerprint(s:string){return createHash('sha256').update(s).digest('hex')}
export function calculatePtkp(sections:Record<string,Record<string,string>>|null|undefined,year=currentTaxYearWita()):PtkpResult {
 const identity=sections?.identity||{},family=sections?.family||{};const warnings:string[]=[],eligibleNames:string[]=[],notCounted:string[]=[];let unresolvedCount=0
 const gender=choice(identity.gender),marital=choice(family.marital_status),cutoff=`${year}-01-01`
 const isFemale=['perempuan','female','wanita','p'].includes(gender),isMale=['lakilaki','male','pria','l'].includes(gender)
 const married=['married','kawin','menikah','k'].includes(marital)
 const unmarried=['unmarried','belumkawin','belummenikah','single','divorced','cerai','widowed','janda','duda','tk'].includes(marital)
 if(!isFemale&&!isMale)warnings.push('Jenis kelamin belum diisi atau belum valid.')
 if(!married&&!unmarried)warnings.push('Status perkawinan belum diisi.')
 if(married){const since=dateOnly(family.married_since);if(!since)warnings.push('Tanggal perkawinan diperlukan untuk menilai kondisi pada 1 Januari.');else if(since>cutoff)warnings.push(`Perkawinan setelah 1 Januari ${year} baru diperhitungkan untuk tahun pajak berikutnya.`)}
 const children=readArray(family.children_json),others=readArray(family.dependents_json)
 const candidates:RecordValue[]=[...children.map((x):RecordValue=>({...x,relation:x.relation||'child'})),...others]
 for(const [idx,c] of candidates.entries()){
  const label=str(c.name)||`Tanggungan ${idx+1}`;const birth=dateOnly(c.birth)||dateOnly(c.birth_date)
  if(!allowedRelation(c.relation)){notCounted.push(`${label}: hubungan tidak memenuhi kriteria.`);continue}
  if(!birth){notCounted.push(`${label}: tanggal lahir belum valid (YYYY-MM-DD).`);unresolvedCount++;continue}
  if(birth>cutoff){notCounted.push(`${label}: belum tercatat pada 1 Januari ${year}.`);continue}
  if(yes(c.married)||yes(c.has_income)||yes(c.earning)){notCounted.push(`${label}: menikah atau memiliki penghasilan sendiri.`);continue}
  if(!yes(c.fully_dependent)||!no(c.has_income)||!no(c.married)){
   notCounted.push(`${label}: pernyataan ditanggung penuh, tidak berpenghasilan dan belum menikah belum lengkap.`);unresolvedCount++;continue
  }
  if(ageAt(birth,year)>=18) warnings.push(`${label} berusia ${ageAt(birth,year)} tahun pada 1 Januari ${year}; HR perlu mengonfirmasi ketergantungan finansial.`)
  eligibleNames.push(label)
 }
 if(eligibleNames.length>3)warnings.push(`Ditemukan ${eligibleNames.length} calon tanggungan sah; sesuai aturan hanya 3 dihitung.`)
 let code:string|null=null;const count=Math.min(3,eligibleNames.length)
 if((isFemale||isMale)&&(married||unmarried)){
  const validMarried=married&&!!dateOnly(family.married_since)&&dateOnly(family.married_since)! <= cutoff
  if(married&&!dateOnly(family.married_since))code=null
  else if(!validMarried)code=`TK/${count}`
  else if(isFemale){
   // Female married employees: default TK/0 for employer withholding.
   // Special evidence/HR review required when husband has no income.
   code=yes(family.husband_no_income_proof)?`K/${count}`:'TK/0'
   if(yes(family.husband_no_income_proof))warnings.push('K/.. untuk karyawati kawin membutuhkan surat keterangan suami tidak berpenghasilan dan verifikasi HR.')
  }else if(yes(family.combined_spouse_income)){
   code=`K/I/${count}`;warnings.push('K/I/.. adalah perlakuan khusus penghasilan istri digabung, wajib dikonfirmasi HR pajak.')
  }else code=`K/${count}`
 }
 if(notCounted.length)warnings.push('Data tanggungan belum lengkap/tidak memenuhi syarat tidak dihitung sampai dilengkapi.')
 const amount=code?(code.startsWith('K/I/')?112500000:code.startsWith('K/')?58500000:54000000)+count*4500000: null
 // TK/0 for married women is independent of dependents; do not add count here.
 const actualAmount=code==='TK/0'&&isFemale&&married?54000000:amount
 const fingerprint=simpleFingerprint(JSON.stringify({year,identity:{gender:identity.gender},family:{marital_status:family.marital_status,married_since:family.married_since,children_json:family.children_json,dependents_json:family.dependents_json,husband_no_income_proof:family.husband_no_income_proof,combined_spouse_income:family.combined_spouse_income}}))
 return {year,code,unresolvedCount,annualAmount:actualAmount,dependentsCount:code==='TK/0'&&isFemale&&married?0:count,eligibleNames:eligibleNames.slice(0,3),notCounted,warnings,needsHRReview:true,basis:'employee_declaration',fingerprint}
}
