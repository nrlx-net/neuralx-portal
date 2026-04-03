'use client'

import { useRouter } from 'next/navigation'
import { BankDataSheet } from '../components/BankDataSheet'

export default function DatosBancariosPage() {
  const router = useRouter()

  return <BankDataSheet open onClose={() => router.push('/dashboard')} />
}

