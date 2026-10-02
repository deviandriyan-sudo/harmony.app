'use client'

import { useParams } from 'next/navigation'
import { PaymentRequestPrint } from '@/components/remed/PaymentRequestPrint'

export default function Page() {
  const params = useParams<{ id: string }>()
  return <PaymentRequestPrint claimId={String(params.id)} />
}
