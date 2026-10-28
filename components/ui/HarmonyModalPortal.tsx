'use client'

import { useEffect, useRef, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type HarmonyModalPortalProps = {
  children: ReactNode
  className?: string
  labelledBy: string
  onClose: () => void
  canClose?: boolean
}


const subscribeMount = () => () => {}
const clientMounted = () => true
const serverMounted = () => false

/**
 * Keeps a modal above sticky headers and animated/glass stacking contexts.
 * Portalling preserves React context and event handling in the original form.
 * Do not use backdrop-to-close: partially completed HR forms must not be lost.
 */
export function HarmonyModalPortal({
  children,
  className = '',
  labelledBy,
  onClose,
  canClose = true,
}: HarmonyModalPortalProps) {
  const mounted = useSyncExternalStore(subscribeMount, clientMounted, serverMounted)
  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!mounted) return

    const previouslyFocused = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus({ preventScroll: true })

    return () => {
      document.body.style.overflow = previousOverflow
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus({ preventScroll: true })
      }
    }
  }, [mounted])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      if (canClose) {
        event.preventDefault()
        onClose()
      }
      return
    }

    if (event.key !== 'Tab') return
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? []).filter((element) => element.getClientRects().length > 0 && element.tabIndex >= 0)

    if (!focusable.length) {
      event.preventDefault()
      dialogRef.current?.focus()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const focused = document.activeElement
    if (event.shiftKey && (focused === first || focused === dialogRef.current || !dialogRef.current?.contains(focused))) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && (focused === last || !dialogRef.current?.contains(focused))) {
      event.preventDefault()
      first.focus()
    }
  }

  if (!mounted) return null
  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      tabIndex={-1}
      className={`harmony-modal-surface fixed inset-0 flex items-center justify-center bg-black/35 p-3 backdrop-blur-sm sm:p-5 ${className}`}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>,
    document.body,
  )
}
