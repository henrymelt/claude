import { ACCOUNT_TYPES, NORMAL_BALANCE } from './types'
import type { Account, AccountType, JournalEntry } from './types'

export interface Totals {
  debit: number
  credit: number
}

export interface DateRange {
  from?: string
  to?: string
}

function inRange(date: string, { from, to }: DateRange): boolean {
  return (!from || date >= from) && (!to || date <= to)
}

export function entryTotals(entry: Pick<JournalEntry, 'lines'>): Totals {
  return entry.lines.reduce(
    (t, l) => ({ debit: t.debit + l.debit, credit: t.credit + l.credit }),
    { debit: 0, credit: 0 },
  )
}

/** True for a real YYYY-MM-DD date (rejects e.g. 2026-02-30). */
export function isCalendarDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s)
}

/** Returns a list of human-readable problems; empty means the entry can be posted. */
export function validateEntry(entry: JournalEntry, accounts: Account[]): string[] {
  const errors: string[] = []
  const byId = new Map(accounts.map((a) => [a.id, a]))

  if (!isCalendarDate(entry.date)) errors.push('Enter a valid date.')
  if (!entry.description.trim()) errors.push('Enter a description.')

  const lines = entry.lines.filter((l) => l.accountId || l.debit || l.credit)
  if (lines.length < 2) errors.push('An entry needs at least two lines.')

  lines.forEach((l, i) => {
    const n = i + 1
    const account = byId.get(l.accountId)
    if (!account) errors.push(`Line ${n}: choose an account.`)
    else if (account.isGroup) errors.push(`Line ${n}: "${account.name}" is a group and cannot be posted to.`)
    if (l.debit < 0 || l.credit < 0) errors.push(`Line ${n}: amounts cannot be negative.`)
    if (l.debit && l.credit) errors.push(`Line ${n}: use either a debit or a credit, not both.`)
    if (!l.debit && !l.credit) errors.push(`Line ${n}: enter a debit or credit amount.`)
  })

  const { debit, credit } = entryTotals({ lines })
  if (debit !== credit) errors.push('Debits must equal credits.')
  else if (debit === 0 && lines.length >= 2) errors.push('Entry total cannot be zero.')

  return errors
}

/** Raw debit/credit totals per account (leaf accounts only — groups never hold postings). */
export function accountTotals(entries: JournalEntry[], range: DateRange = {}): Map<string, Totals> {
  const totals = new Map<string, Totals>()
  for (const e of entries) {
    if (!inRange(e.date, range)) continue
    for (const l of e.lines) {
      const t = totals.get(l.accountId) ?? { debit: 0, credit: 0 }
      t.debit += l.debit
      t.credit += l.credit
      totals.set(l.accountId, t)
    }
  }
  return totals
}

/** Balance expressed in the account's normal direction (positive = normal). */
export function normalBalance(type: AccountType, t: Totals): number {
  return NORMAL_BALANCE[type] === 'debit' ? t.debit - t.credit : t.credit - t.debit
}

/** Normal-direction balance for every account, with group accounts rolled up from descendants. */
export function rolledUpBalances(
  accounts: Account[],
  entries: JournalEntry[],
  range: DateRange = {},
): Map<string, number> {
  const totals = accountTotals(entries, range)
  const children = childrenMap(accounts)
  const result = new Map<string, number>()

  const visit = (a: Account): number => {
    let bal = normalBalance(a.type, totals.get(a.id) ?? { debit: 0, credit: 0 })
    for (const c of children.get(a.id) ?? []) bal += visit(c)
    result.set(a.id, bal)
    return bal
  }
  accounts.filter((a) => !a.parentId).forEach(visit)
  return result
}

export function childrenMap(accounts: Account[]): Map<string | null, Account[]> {
  const map = new Map<string | null, Account[]>()
  for (const a of accounts) {
    const list = map.get(a.parentId) ?? []
    list.push(a)
    map.set(a.parentId, list)
  }
  for (const list of map.values()) list.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
  return map
}

export interface TreeRow {
  account: Account
  depth: number
}

/** Depth-first ordering of the chart, grouped by account type then code. */
export function accountTree(accounts: Account[]): TreeRow[] {
  const children = childrenMap(accounts)
  const rows: TreeRow[] = []
  const walk = (a: Account, depth: number) => {
    rows.push({ account: a, depth })
    for (const c of children.get(a.id) ?? []) walk(c, depth + 1)
  }
  const roots = children.get(null) ?? []
  for (const type of ACCOUNT_TYPES) roots.filter((r) => r.type === type).forEach((r) => walk(r, 0))
  return rows
}

/** Full path label, e.g. "Assets › Cash & Bank › Checking". */
export function accountPath(account: Account, accounts: Account[]): string {
  const byId = new Map(accounts.map((a) => [a.id, a]))
  const parts = [account.name]
  let p = account.parentId ? byId.get(account.parentId) : undefined
  while (p) {
    parts.unshift(p.name)
    p = p.parentId ? byId.get(p.parentId) : undefined
  }
  return parts.join(' › ')
}

export function descendantIds(accountId: string, accounts: Account[]): Set<string> {
  const children = childrenMap(accounts)
  const ids = new Set<string>()
  const walk = (id: string) => {
    for (const c of children.get(id) ?? []) {
      ids.add(c.id)
      walk(c.id)
    }
  }
  walk(accountId)
  return ids
}

export interface LedgerRow {
  entry: JournalEntry
  lineIndex: number
  debit: number
  credit: number
  memo?: string
  balance: number
}

/** General ledger for one account (or a group and all its descendants) with running balance. */
export function accountLedger(
  account: Account,
  accounts: Account[],
  entries: JournalEntry[],
  range: DateRange = {},
): { opening: number; rows: LedgerRow[]; closing: number } {
  const ids = descendantIds(account.id, accounts)
  ids.add(account.id)
  const sign = NORMAL_BALANCE[account.type] === 'debit' ? 1 : -1
  const sorted = sortEntries(entries)

  let opening = 0
  let balance = 0
  const rows: LedgerRow[] = []
  for (const entry of sorted) {
    entry.lines.forEach((l, lineIndex) => {
      if (!ids.has(l.accountId)) return
      const delta = sign * (l.debit - l.credit)
      if (range.from && entry.date < range.from) {
        opening += delta
        balance += delta
        return
      }
      if (range.to && entry.date > range.to) return
      balance += delta
      rows.push({ entry, lineIndex, debit: l.debit, credit: l.credit, memo: l.memo, balance })
    })
  }
  return { opening, rows, closing: balance }
}

export function sortEntries(entries: JournalEntry[]): JournalEntry[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
}

export interface TrialBalanceRow {
  account: Account
  debit: number
  credit: number
}

/** Every postable account with a non-zero balance, placed in the debit or credit column. */
export function trialBalance(
  accounts: Account[],
  entries: JournalEntry[],
  asOf?: string,
): { rows: TrialBalanceRow[]; totalDebit: number; totalCredit: number } {
  const totals = accountTotals(entries, { to: asOf })
  const rows: TrialBalanceRow[] = []
  for (const { account } of accountTree(accounts)) {
    if (account.isGroup) continue
    const t = totals.get(account.id)
    if (!t) continue
    const net = t.debit - t.credit
    if (net === 0) continue
    rows.push({ account, debit: net > 0 ? net : 0, credit: net < 0 ? -net : 0 })
  }
  return {
    rows,
    totalDebit: rows.reduce((s, r) => s + r.debit, 0),
    totalCredit: rows.reduce((s, r) => s + r.credit, 0),
  }
}

export function sumByType(accounts: Account[], totals: Map<string, Totals>, type: AccountType): number {
  return accounts
    .filter((a) => a.type === type && !a.isGroup)
    .reduce((s, a) => s + normalBalance(type, totals.get(a.id) ?? { debit: 0, credit: 0 }), 0)
}

/** Net income (income − expenses) over a range. */
export function netIncome(accounts: Account[], entries: JournalEntry[], range: DateRange = {}): number {
  const totals = accountTotals(entries, range)
  return sumByType(accounts, totals, 'income') - sumByType(accounts, totals, 'expense')
}

export interface BalanceSheetSummary {
  assets: number
  liabilities: number
  equity: number
  /** Cumulative income − expenses not yet closed to equity. */
  retained: number
  balanced: boolean
}

export function balanceSheetSummary(accounts: Account[], entries: JournalEntry[], asOf?: string): BalanceSheetSummary {
  const totals = accountTotals(entries, { to: asOf })
  const assets = sumByType(accounts, totals, 'asset')
  const liabilities = sumByType(accounts, totals, 'liability')
  const equity = sumByType(accounts, totals, 'equity')
  const retained = sumByType(accounts, totals, 'income') - sumByType(accounts, totals, 'expense')
  return { assets, liabilities, equity, retained, balanced: assets === liabilities + equity + retained }
}

export function accountHasPostings(accountId: string, entries: JournalEntry[]): boolean {
  return entries.some((e) => e.lines.some((l) => l.accountId === accountId))
}
