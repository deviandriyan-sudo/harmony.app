'use client'

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react'

/** A single provider for the entire HRIS. No third-party theme runtime is required. */
export type HarmonyTheme = 'light' | 'dark'
export type HarmonyThemePreference = HarmonyTheme | 'system'
type ThemeContextValue = {
  theme: HarmonyTheme
  preference: HarmonyThemePreference
  setTheme: (preference: HarmonyThemePreference) => void
  ready: boolean
}

const STORAGE_KEY = 'harmony-color-theme'
const CHANGE_EVENT = 'harmony-color-theme-changed'
const ThemeContext = createContext<ThemeContextValue | null>(null)
let storageUnavailableSelection: HarmonyThemePreference | null = null

function systemTheme(): HarmonyTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readPreference(): HarmonyThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light' || stored === 'system') return stored
  } catch {
    return storageUnavailableSelection ?? 'system'
  }
  return storageUnavailableSelection ?? 'system'
}

function readTheme(): HarmonyTheme {
  const selected = readPreference()
  return selected === 'system' ? systemTheme() : selected
}

function applyTheme(theme: HarmonyTheme, preference: HarmonyThemePreference) {
  document.documentElement.dataset.harmonyTheme = theme
  document.documentElement.dataset.harmonyThemePreference = preference
  document.documentElement.style.colorScheme = theme
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
const serverPreference = (): HarmonyThemePreference => 'system'

export function HarmonyThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, serverTheme)
  const preference = useSyncExternalStore(subscribeTheme, readPreference, serverPreference)
  const ready = useSyncExternalStore(subscribeTheme, clientReady, serverReady)

  useEffect(() => { applyTheme(theme, preference) }, [theme, preference])

  const setTheme = useCallback((value: HarmonyThemePreference) => {
    if (value !== 'light' && value !== 'dark' && value !== 'system') return
    const resolved = value === 'system' ? systemTheme() : value
    applyTheme(resolved, value)
    try {
      window.localStorage.setItem(STORAGE_KEY, value)
      storageUnavailableSelection = null
    } catch {
      storageUnavailableSelection = value
    }
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }, [])

  return <ThemeContext.Provider value={{ theme, preference, setTheme, ready }}>{children}</ThemeContext.Provider>
}

export function useHarmonyTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useHarmonyTheme must be used inside HarmonyThemeProvider')
  return value
}
