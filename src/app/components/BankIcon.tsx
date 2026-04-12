'use client'

import { useMemo, useState } from 'react'

const ICON_BY_BANK_ID: Record<string, string> = {
  bbva_mx: 'https://pub-0096ef66aa784fc09207634c34c5baaa.r2.dev/BBVA-icon.jpeg',
  banregio_mx: 'https://pub-0096ef66aa784fc09207634c34c5baaa.r2.dev/BanRegio-icon.png',
  banamex_mx: 'https://pub-0096ef66aa784fc09207634c34c5baaa.r2.dev/Banamex-icon.jpeg',
}

type BankIconProps = {
  bankId?: string | null
  bankName?: string | null
  iconUrl?: string | null
  className?: string
}

function initialsFrom(name: string) {
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'BK'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase() || 'BK'
}

export function BankIcon({ bankId, bankName, iconUrl, className = 'h-8 w-8' }: BankIconProps) {
  const [imgOk, setImgOk] = useState(true)

  const src = useMemo(() => {
    if (iconUrl?.trim()) return iconUrl.trim()
    const id = (bankId || '').trim().toLowerCase()
    if (id && ICON_BY_BANK_ID[id]) return ICON_BY_BANK_ID[id]
    return null
  }, [bankId, iconUrl])

  const title = (bankName || bankId || 'Banco').trim()
  const label = initialsFrom(bankName || bankId || 'Banco')

  if (!src || !imgOk) {
    return (
      <span
        title={title}
        className={`inline-flex items-center justify-center rounded-lg border border-nrlx-border bg-nrlx-accent/15 text-[10px] font-semibold text-nrlx-accent shrink-0 ${className}`}
      >
        {label}
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      title={title}
      onError={() => setImgOk(false)}
      className={`rounded-lg border border-nrlx-border object-contain bg-nrlx-el shrink-0 ${className}`}
    />
  )
}
