import { ProfileWorkspace } from '@/components/profile/ProfileWorkspace'
// Presentation-only entry point; reuses the existing authenticated document APIs.
export default function EmployeeDocumentsPage() {
  return <main className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6"><ProfileWorkspace initialSection="documents" /></main>
}
