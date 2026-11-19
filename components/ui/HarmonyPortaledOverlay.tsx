'use client'

import { useSyncExternalStore, type HTMLAttributes } from 'react'
import { createPortal } from 'react-dom'

const subscribe = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

/**
 * Keep existing HARMONY dialog markup and handlers intact, while mounting the
 * overlay at the body layer instead of inside a page's sticky/transformed shell.
 * Unlike HarmonyModalPortal, this adapter does not impose an extra wrapper or
 * change the existing dialog's close / submit / validation behavior.
 */
export function HarmonyPortaledOverlay({ children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot)
  if (!mounted) return null
  return createPortal(<div {...props}>{children}</div>, document.body)
}
