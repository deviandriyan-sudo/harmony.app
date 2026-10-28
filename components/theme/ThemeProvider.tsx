'use client'

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react'

type HarmonyTheme = 'light' | 'dark'
type ThemeContextValue = { theme: HarmonyTheme; setTheme: (theme: HarmonyTheme) => void; ready: boolean }

const STORAGE_KEY = 'harmony-color-theme'
const CHANGE_EVENT = 'harmony-color-theme-changed'
const ThemeContext = createContext<ThemeContextValue | null>(null)
let storageUnavailableSelection: HarmonyTheme | null = null

function applyTheme(value: HarmonyTheme) {
  document.documentElement.dataset.harmonyTheme = value
  document.documentElement.style.colorScheme = value
}

function readTheme(): HarmonyTheme {
  let preferred: HarmonyTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') preferred = stored
  } catch { /* storage disabled */
    if (storageUnavailableSelection) preferred = storageUnavailableSelection
  }
  return preferred
}

function subscribeTheme(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener(CHANGE_EVENT, callback)
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(CHANGE_EVENT, callback)
    media.removeEventListener('change', callback)
  }
}

const clientReady = () => true
const serverReady = () => false
const serverTheme = (): HarmonyTheme => 'light'

export function HarmonyThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, serverTheme)
  const ready = useSyncExternalStore(subscribeTheme, clientReady, serverReady)

  useEffect(() => { applyTheme(theme) }, [theme])

  const setTheme = useCallback((value: HarmonyTheme) => {
    applyTheme(value)
    try { window.localStorage.setItem(STORAGE_KEY, value); storageUnavailableSelection = null } catch { storageUnavailableSelection = value }
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }, [])

  return <ThemeContext.Provider value={{ theme, setTheme, ready }}>{children}</ThemeContext.Provider>
}

export function useHarmonyTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useHarmonyTheme must be used inside HarmonyThemeProvider')
  return value
}
