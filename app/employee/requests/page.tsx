import { Topbar } from '@/components/layout/Topbar'

export default function EmployeeRequestsPage() {
  return (
    <>
      <Topbar
        title="Pengajuan Saya"
        description="Ajukan cuti, izin, sakit, dan PHL."
      />

      <section className="p-6">
        <div className="harmony-card p-6">
          Halaman pengajuan employee akan kita isi pada tahap cuti.
        </div>
      </section>
    </>
  )
}