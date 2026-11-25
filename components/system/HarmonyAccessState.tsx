'use client'

import type { ReactNode } from 'react'

import { ArrowLeft } from 'lucide-react'

type HarmonyAccessStateProps = {
  title: string
  message: string
  icon: ReactNode
  tone?: 'employee' | 'hr' | 'remed' | 'danger'
  actionLabel?: string
  onAction?: () => void
}

const toneMap: Record<NonNullable<HarmonyAccessStateProps['tone']>, string> = {
  employee: 'harmony-access-panel--employee',
  hr: 'harmony-access-panel--hr',
  remed: 'harmony-access-panel--remed',
  danger: 'harmony-access-panel--danger',
}

export function HarmonyAccessState({
  title,
  message,
  icon,
  tone = 'employee',
  actionLabel,
  onAction,
}: HarmonyAccessStateProps) {
  return (
    <main className="harmony-access-state harmony-access-stage flex min-h-screen items-center justify-center p-6">
      <div className="harmony-access-backdrop" aria-hidden="true">
        <span className="harmony-access-orb harmony-access-orb--left" />
        <span className="harmony-access-orb harmony-access-orb--right" />
        <span className="harmony-access-grid" />
      </div>
      <section className={`harmony-access-panel ${toneMap[tone]} w-full max-w-[34rem] text-center`} aria-live="polite">
        <div className="harmony-access-sheen" aria-hidden="true" />
        <div className="harmony-access-chip">HARMONY</div>
        <div className="harmony-access-icon-wrap">
          <div className="harmony-access-icon">{icon}</div>
        </div>
        <h1 className="mt-5 text-[clamp(1.75rem,2vw,2.15rem)] font-semibold leading-tight harmony-text-primary">{title}</h1>
        <p className="mx-auto mt-3 max-w-[26rem] text-base leading-7 harmony-text-secondary">{message}</p>
        {actionLabel && onAction ? (
          <div className="mt-7 flex justify-center">
            <button type="button" onClick={onAction} className="harmony-access-button inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold">
              <ArrowLeft size={18} />
              {actionLabel}
            </button>
          </div>
        ) : null}
      </section>
    </main>
  )
}
