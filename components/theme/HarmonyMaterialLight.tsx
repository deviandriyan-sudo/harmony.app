'use client'

/**
 * Adapted from AndreyBegma/glass-ui src/material-light.tsx (MIT).
 * Copyright (c) 2026 AndreyBegma.
 * Original: https://github.com/AndreyBegma/glass-ui
 * See docs/THIRD_PARTY_GLASS_NOTICES.md for the full MIT notice.
 *
 * A single delegated listener illuminates only opted-in chrome surfaces.
 * No canvas, external scripts, tracking, network requests or GPU shaders.
 */
import { useEffect } from 'react'

export function HarmonyMaterialLight() {
  useEffect(() => {
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reduceTransparency = window.matchMedia('(prefers-reduced-transparency: reduce)')
    const increaseContrast = window.matchMedia('(prefers-contrast: more)')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!canHover.matches || reduceTransparency.matches || increaseContrast.matches || reduceMotion.matches) return

    let active: HTMLElement | null = null
    let lastFrame = 0
    const reset = () => {
      if (active) active.style.setProperty('--harmony-lit', '0')
      active = null
    }
    const move = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) {
        reset()
        return
      }
      const next = event.target.closest<HTMLElement>('.harmony-liquid-lit')
      if (!next) {
        reset()
        return
      }
      if (next === active && event.timeStamp - lastFrame < 16) return
      lastFrame = event.timeStamp
      if (active !== next) reset()
      const rect = next.getBoundingClientRect()
      next.style.setProperty('--harmony-lx', `${event.clientX - rect.left}px`)
      next.style.setProperty('--harmony-ly', `${event.clientY - rect.top}px`)
      next.style.setProperty('--harmony-lit', '1')
      active = next
    }
    document.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerleave', reset)
    window.addEventListener('blur', reset)
    return () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', reset)
      window.removeEventListener('blur', reset)
      reset()
    }
  }, [])
  return null
}
