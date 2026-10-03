import { describe, expect, it } from 'vitest'
import { accountIdForCode as A, defaultAccounts, sampleEntries } from './defaultChart'
import {
  accountLedger,
  balanceSheetSummary,
  netIncome,
  rolledUpBalances,
  trialBalance,
  validateEntry,
} from './ledger'
import { parseAmount } from './money'
import type { JournalEntry } from './types'

const accounts = defaultAccounts()
const byCode = (code: string) => accounts.find((a) => a.code === code)!

const je = (id: string, date: string, lines: [string, number, number][]): JournalEntry => ({
  id,
  date,
  description: id,
  lines: lines.map(([code, debit, credit]) => ({ accountId: A(code), debit, credit })),
})

describe('parseAmount', () => {
  it('parses to integer cents', () => {
    expect(parseAmount('12.34')).toBe(1234)
    expect(parseAmount('1,000')).toBe(100000)
    expect(parseAmount('0.1')).toBe(10)
    expect(parseAmount('$5')).toBe(500)
    expect(parseAmount('')).toBe(0)
  })
  it('rejects junk and sub-cent precision', () => {
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('1.234')).toBeNull()
    expect(parseAmount('-5')).toBeNull()
  })
})

describe('validateEntry', () => {
  it('accepts a balanced entry', () => {
    expect(validateEntry(je('x', '2026-01-01', [['5210', 500, 0], ['1110', 0, 500]]), accounts)).toEqual([])
  })
  it('rejects unbalanced, one-sided, group and single-line entries', () => {
    expect(validateEntry(je('x', '2026-01-01', [['5210', 500, 0], ['1110', 0, 400]]), accounts)).toContain(
      'Debits must equal credits.',
    )
    expect(validateEntry(je('x', '2026-01-01', [['5210', 500, 500], ['1110', 0, 0]]), accounts).length).toBeGreaterThan(0)
    expect(validateEntry(je('x', '2026-01-01', [['5200', 500, 0], ['1110', 0, 500]]), accounts)[0]).toMatch(/group/)
    expect(validateEntry(je('x', '2026-02-30', [['5210', 500, 0], ['1110', 0, 500]]), accounts)).toContain(
      'Enter a valid date.',
    )
    expect(validateEntry(je('x', '2026-01-01', [['5210', 500, 0]]), accounts)).toContain(
      'An entry needs at least two lines.',
    )
  })
})

describe('reports', () => {
  const entries = [
    je('1', '2026-01-01', [['1110', 100000, 0], ['3100', 0, 100000]]),
    je('2', '2026-01-15', [['1110', 300000, 0], ['4100', 0, 300000]]),
    je('3', '2026-02-01', [['5110', 120000, 0], ['1110', 0, 120000]]),
    je('4', '2026-02-03', [['5210', 8000, 0], ['2110', 0, 8000]]),
  ]

  it('rolls group balances up from children', () => {
    const bal = rolledUpBalances(accounts, entries)
    expect(bal.get(A('1110'))).toBe(280000)
    expect(bal.get(A('1100'))).toBe(280000)
    expect(bal.get(A('1000'))).toBe(280000)
    expect(bal.get(A('2000'))).toBe(8000)
    expect(bal.get(A('5000'))).toBe(128000)
  })

  it('trial balance debits equal credits', () => {
    const tb = trialBalance(accounts, entries)
    expect(tb.totalDebit).toBe(tb.totalCredit)
    expect(tb.rows.map((r) => r.account.code)).toEqual(['1110', '2110', '3100', '4100', '5110', '5210'])
  })

  it('balance sheet satisfies the accounting equation', () => {
    const bs = balanceSheetSummary(accounts, entries)
    expect(bs).toMatchObject({ assets: 280000, liabilities: 8000, equity: 100000, retained: 172000, balanced: true })
    expect(netIncome(accounts, entries, { from: '2026-02-01', to: '2026-02-28' })).toBe(-128000)
  })

  it('account ledger tracks opening and running balances', () => {
    const l = accountLedger(byCode('1110'), accounts, entries, { from: '2026-01-10' })
    expect(l.opening).toBe(100000)
    expect(l.rows.map((r) => r.balance)).toEqual([400000, 280000])
    expect(l.closing).toBe(280000)
  })

  it('sample data is internally consistent', () => {
    const sample = sampleEntries()
    for (const e of sample) expect(validateEntry(e, accounts)).toEqual([])
    expect(balanceSheetSummary(accounts, sample).balanced).toBe(true)
  })
})

describe('defaults', () => {
  it('new ledgers use Canadian dollars, shown with a plain $ sign', async () => {
    const { emptyLedger } = await import('./defaultChart')
    const { formatMoney } = await import('./money')
    expect(emptyLedger().currency).toBe('CAD')
    expect(formatMoney(123456)).toMatch(/^\$1,234\.56$/)
  })
})
