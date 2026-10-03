import { useEffect, useState } from 'react'

/** 'system' follows the claude.ai viewer's theme, or the device setting outside the viewer. */
export type ThemePref = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'double-entry-ledger:theme'

export function readThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark') return v
  } catch {
    // Storage blocked: fall back to following the system.
  }
  return 'system'
}

/** Sets `data-mode` on <html>, which index.css uses to pick the palette. */
export function applyThemePref(pref: ThemePref) {
  const root = document.documentElement
  if (pref === 'system') root.removeAttribute('data-mode')
  else root.setAttribute('data-mode', pref)
}

export function useThemePref() {
  const [pref, setPref] = useState<ThemePref>(readThemePref)
  useEffect(() => {
    applyThemePref(pref)
    try {
      if (pref === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, pref)
    } catch {
      // Not persisted; the choice still applies for this visit.
    }
  }, [pref])
  return [pref, setPref] as const
}
