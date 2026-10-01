import { useEffect, useReducer } from 'react'
import { emptyLedger } from './defaultChart'
import type { Account, JournalEntry, LedgerData } from './types'

const STORAGE_KEY = 'double-entry-ledger:v1'

export type Action =
  | { type: 'saveAccount'; account: Account }
  | { type: 'deleteAccount'; id: string }
  | { type: 'saveEntry'; entry: JournalEntry }
  | { type: 'deleteEntry'; id: string }
  | { type: 'setCurrency'; currency: string }
  | { type: 'replace'; data: LedgerData }

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id)
  if (i === -1) return [...list, item]
  const next = [...list]
  next[i] = item
  return next
}

export function reducer(state: LedgerData, action: Action): LedgerData {
  switch (action.type) {
    case 'saveAccount':
      return { ...state, accounts: upsert(state.accounts, action.account) }
    case 'deleteAccount':
      return { ...state, accounts: state.accounts.filter((a) => a.id !== action.id) }
    case 'saveEntry':
      return { ...state, entries: upsert(state.entries, action.entry) }
    case 'deleteEntry':
      return { ...state, entries: state.entries.filter((e) => e.id !== action.id) }
    case 'setCurrency':
      return { ...state, currency: action.currency }
    case 'replace':
      return action.data
  }
}

export function isLedgerData(x: unknown): x is LedgerData {
  const d = x as LedgerData
  return !!d && d.version === 1 && Array.isArray(d.accounts) && Array.isArray(d.entries) && typeof d.currency === 'string'
}

function load(): LedgerData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isLedgerData(parsed)) return parsed
    }
  } catch {
    // Storage unavailable or corrupt: start fresh.
  }
  return emptyLedger()
}

export function useLedger() {
  const [state, dispatch] = useReducer(reducer, undefined, load)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Ignore quota / privacy-mode failures; data stays in memory.
    }
  }, [state])
  return [state, dispatch] as const
}

export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
