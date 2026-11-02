'use client'

import { Moon, Sun } from 'lucide-react'
import { useHarmonyTheme } from './ThemeProvider'

type Props = { compact?: boolean; className?: string }

/** Icon-only theme choices; aria labels retain discoverability for keyboard and screen readers. */
export function HarmonyThemeToggle({ compact = false, className = '' }: Props) {
  const { theme, setTheme, ready } = useHarmonyTheme()
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
