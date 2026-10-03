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
    expect(validateEntry(je('x', '2026-01-01', [['52100', 500, 0], ['11100', 0, 500]]), accounts)).toEqual([])
  })
  it('rejects unbalanced, one-sided, group and single-line entries', () => {
    expect(validateEntry(je('x', '2026-01-01', [['52100', 500, 0], ['11100', 0, 400]]), accounts)).toContain(
      'Debits must equal credits.',
    )
    expect(validateEntry(je('x', '2026-01-01', [['52100', 500, 500], ['11100', 0, 0]]), accounts).length).toBeGreaterThan(0)
    expect(validateEntry(je('x', '2026-01-01', [['52000', 500, 0], ['11100', 0, 500]]), accounts)[0]).toMatch(/group/)
    expect(validateEntry(je('x', '2026-02-30', [['52100', 500, 0], ['11100', 0, 500]]), accounts)).toContain(
      'Enter a valid date.',
    )
    expect(validateEntry(je('x', '2026-01-01', [['52100', 500, 0]]), accounts)).toContain(
      'An entry needs at least two lines.',
    )
  })
})

describe('reports', () => {
  const entries = [
    je('1', '2026-01-01', [['11100', 100000, 0], ['31000', 0, 100000]]),
    je('2', '2026-01-15', [['11100', 300000, 0], ['41000', 0, 300000]]),
    je('3', '2026-02-01', [['51100', 120000, 0], ['11100', 0, 120000]]),
    je('4', '2026-02-03', [['52100', 8000, 0], ['21100', 0, 8000]]),
  ]

  it('rolls group balances up from children', () => {
    const bal = rolledUpBalances(accounts, entries)
    expect(bal.get(A('11100'))).toBe(280000)
    expect(bal.get(A('11000'))).toBe(280000)
    expect(bal.get(A('10000'))).toBe(280000)
    expect(bal.get(A('20000'))).toBe(8000)
    expect(bal.get(A('50000'))).toBe(128000)
  })

  it('trial balance debits equal credits', () => {
    const tb = trialBalance(accounts, entries)
    expect(tb.totalDebit).toBe(tb.totalCredit)
    expect(tb.rows.map((r) => r.account.code)).toEqual(['11100', '21100', '31000', '41000', '51100', '52100'])
  })

  it('balance sheet satisfies the accounting equation', () => {
    const bs = balanceSheetSummary(accounts, entries)
    expect(bs).toMatchObject({ assets: 280000, liabilities: 8000, equity: 100000, retained: 172000, balanced: true })
    expect(netIncome(accounts, entries, { from: '2026-02-01', to: '2026-02-28' })).toBe(-128000)
  })

  it('account ledger tracks opening and running balances', () => {
    const l = accountLedger(byCode('11100'), accounts, entries, { from: '2026-01-10' })
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

describe('British English', () => {
  it('uses British account names', () => {
    const names = defaultAccounts().map((a) => a.name)
    expect(names).toContain('Current Account')
    expect(names).not.toContain('Checking Account')
  })

  it('renames untouched legacy default accounts in saved ledgers, but keeps user renames', async () => {
    const { migrate } = await import('./store')
    const { emptyLedger } = await import('./defaultChart')
    const saved = emptyLedger()
    saved.accounts = saved.accounts.map((a) =>
      a.code === '11100' ? { ...a, name: 'Checking Account' } : a.code === '22200' ? { ...a, name: 'My Van Loan' } : a,
    )
    const out = migrate(saved)
    expect(out.accounts.find((a) => a.code === '11100')?.name).toBe('Current Account')
    expect(out.accounts.find((a) => a.code === '22200')?.name).toBe('My Van Loan')
  })
})

describe('5-digit GL codes', () => {
  it('every default account has a 5-digit code', async () => {
    const { isValidCode } = await import('./defaultChart')
    for (const a of defaultAccounts()) expect(isValidCode(a.code), a.code).toBe(true)
    expect(isValidCode('5230')).toBe(false)
    expect(isValidCode('523000')).toBe(false)
  })

  it('converts a ledger saved with 4-digit codes, keeping ids so entries still post to the same accounts', async () => {
    const { migrate } = await import('./store')
    const old = {
      version: 1 as const,
      currency: 'CAD',
      accounts: [
        { id: 'acc-1110', code: '1110', name: 'Checking Account', type: 'asset' as const, parentId: 'acc-1100', isGroup: false, archived: false },
        { id: 'acc-1100', code: '1100', name: 'Cash & Bank', type: 'asset' as const, parentId: null, isGroup: true, archived: false },
        { id: 'mine', code: '5230', name: 'Coffee Shops', type: 'expense' as const, parentId: null, isGroup: false, archived: false },
        { id: 'clash', code: '1120', name: 'Clash', type: 'asset' as const, parentId: null, isGroup: false, archived: false },
        { id: 'taken', code: '11200', name: 'Already 5-digit', type: 'asset' as const, parentId: null, isGroup: false, archived: false },
      ],
      entries: [{ id: 'e1', date: '2026-01-01', description: 'x', lines: [{ accountId: 'acc-1110', debit: 100, credit: 0 }, { accountId: 'mine', debit: 0, credit: 100 }] }],
    }
    const out = migrate(old)
    const code = (id: string) => out.accounts.find((a) => a.id === id)?.code
    expect(out.codeLength).toBe(5)
    expect(code('acc-1110')).toBe('11100')
    expect(code('acc-1100')).toBe('11000')
    expect(code('mine')).toBe('52300')
    expect(code('clash')).toBe('1120') // 11200 is taken, so it is left for the user to renumber
    expect(out.accounts.find((a) => a.id === 'acc-1110')?.name).toBe('Current Account')
    expect(out.entries).toEqual(old.entries)
    // Running it again changes nothing.
    expect(migrate(out)).toEqual(out)
  })
})
