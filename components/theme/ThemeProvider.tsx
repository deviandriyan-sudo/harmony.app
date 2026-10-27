'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

type HarmonyTheme = 'light' | 'dark'
type ThemeContextValue = { theme: HarmonyTheme; setTheme: (theme: HarmonyTheme) => void; ready: boolean }

const STORAGE_KEY = 'harmony-color-theme'
const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyTheme(value: HarmonyTheme) {
  document.documentElement.dataset.harmonyTheme = value
  document.documentElement.style.colorScheme = value
}

export function HarmonyThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setState] = useState<HarmonyTheme>('light')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let preferred: HarmonyTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === 'dark' || stored === 'light') preferred = stored
    } catch { /* storage disabled */ }
    applyTheme(preferred)
    setState(preferred)
    setReady(true)

    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      const next = event.newValue === 'light' || event.newValue === 'dark'
        ? event.newValue
        : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      applyTheme(next)
      setState(next)
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const setTheme = useCallback((value: HarmonyTheme) => {
    applyTheme(value)
    setState(value)
    try { window.localStorage.setItem(STORAGE_KEY, value) } catch { /* storage disabled */ }
  }, [])

  return <ThemeContext.Provider value={{ theme, setTheme, ready }}>{children}</ThemeContext.Provider>
}

export function useHarmonyTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useHarmonyTheme must be used inside HarmonyThemeProvider')
  return value
}
