'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { useHarmonyTheme, type HarmonyThemePreference } from './ThemeProvider'

type Props = { compact?: boolean; className?: string }

const choices = [
  { value: 'light', label: 'Terang', Icon: Sun },
  { value: 'dark', label: 'Gelap', Icon: Moon },
  { value: 'system', label: 'Sistem', Icon: Monitor },
] as const

/** One shared control for Employee, HR, Finance, Re-Med and the public login. */
export function HarmonyThemeToggle({ compact = false, className = '' }: Props) {
  const { theme, preference, setTheme, ready } = useHarmonyTheme()
  const [opened, setOpened] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!opened) return
    function outside(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpened(false)
    }
    function keydown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setOpened(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', keydown)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', keydown)
    }
  }, [opened])

  const select = (value: HarmonyThemePreference) => {
    setTheme(value)
    setOpened(false)
  }
  const CurrentIcon = preference === 'system' ? Monitor : theme === 'dark' ? Moon : Sun

  if (compact) {
    return (
      <div className={`harmony-theme-anchor relative shrink-0 ${className}`} ref={containerRef}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpened(current => !current)}
          disabled={!ready}
          aria-label="Pilih mode tampilan"
          title={`Tampilan: ${preference === 'system' ? 'Sistem' : theme === 'dark' ? 'Gelap' : 'Terang'}`}
          aria-expanded={opened}
          aria-controls="harmony-theme-choices"
          className="harmony-theme-topbar harmony-liquid-lit inline-flex h-10 w-10 items-center justify-center rounded-2xl border"
        >
          <CurrentIcon size={18} aria-hidden="true" />
        </button>
        {opened && (
          <div id="harmony-theme-choices" className="harmony-theme-popover absolute right-0 top-full z-[1900] mt-2 w-44 rounded-2xl border p-1.5 shadow-xl" role="group" aria-label="Pilih tema HARMONY">
            {choices.map(({ value, label, Icon }) => (
              <button key={value} type="button" onClick={() => select(value)} aria-pressed={preference === value}
                className={`harmony-theme-choice flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold ${preference === value ? 'is-selected' : ''}`}>
                <Icon size={16} aria-hidden="true" />
                <span className="flex-1">{label}</span>
                {preference === value && <Check size={14} aria-hidden="true" />}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`harmony-theme-switch ${className}`} role="group" aria-label="Mode tampilan HARMONY">
      <button type="button" onClick={() => select('dark')} disabled={!ready} aria-pressed={ready && preference === 'dark'} aria-label="Aktifkan mode gelap" title="Mode gelap" className={ready && preference === 'dark' ? 'is-selected' : ''}>
        <Moon size={18} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => select('light')} disabled={!ready} aria-pressed={ready && preference === 'light'} aria-label="Aktifkan mode terang" title="Mode terang" className={ready && preference === 'light' ? 'is-selected' : ''}>
        <Sun size={18} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => select('system')} disabled={!ready} aria-pressed={ready && preference === 'system'} aria-label="Ikuti tema sistem" title="Ikuti sistem" className={ready && preference === 'system' ? 'is-selected' : ''}>
        <Monitor size={18} aria-hidden="true" />
      </button>
    </div>
  )
}
