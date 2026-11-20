'use client'

import { Moon, Sun } from 'lucide-react'
import { useHarmonyTheme } from './ThemeProvider'

type Props = { compact?: boolean; className?: string }

/** Icon-only theme choices; aria labels retain discoverability for keyboard and screen readers. */
export function HarmonyThemeToggle({ compact = false, className = '' }: Props) {
  const { theme, setTheme, ready } = useHarmonyTheme()
  if (compact) return <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} disabled={!ready}
    aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
    aria-pressed={ready && theme === 'dark'} title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
    className={`harmony-theme-topbar inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${className}`}>
    {theme === 'dark' ? <Sun size={18} aria-hidden="true"/> : <Moon size={18} aria-hidden="true"/>}
  </button>
  return (
    <div className={`harmony-theme-switch ${compact ? 'harmony-theme-switch--compact' : ''} ${className}`} role="group" aria-label="Mode tampilan HARMONY">
      <button type="button" onClick={() => setTheme('dark')} disabled={!ready} aria-pressed={ready && theme === 'dark'} aria-label="Aktifkan mode gelap" title="Mode gelap" className={ready && theme === 'dark' ? 'is-selected' : ''}>
        <Moon size={18} aria-hidden="true" />
      </button>
      <button type="button" onClick={() => setTheme('light')} disabled={!ready} aria-pressed={ready && theme === 'light'} aria-label="Aktifkan mode terang" title="Mode terang" className={ready && theme === 'light' ? 'is-selected' : ''}>
        <Sun size={18} aria-hidden="true" />
      </button>
    </div>
  )
}
