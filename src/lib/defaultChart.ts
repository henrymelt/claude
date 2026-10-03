import type { Account, AccountType, JournalEntry, LedgerData } from './types'

type Seed = [code: string, name: string, children?: Seed[], description?: string]

const TREE: Record<AccountType, Seed> = {
  asset: ['10000', 'Assets', [
    ['11000', 'Cash & Bank', [
      ['11100', 'Current Account'],
      ['11200', 'Savings Account'],
      ['11300', 'Cash on Hand'],
    ]],
    ['12000', 'Investments', [
      ['12100', 'Investment Account'],
      ['12200', 'Pension'],
    ]],
    ['13000', 'Property', [
      ['13100', 'Home'],
      ['13200', 'Vehicle'],
    ]],
    ['14000', 'Receivables', [['14100', 'Money Owed to Me']]],
  ]],
  liability: ['20000', 'Liabilities', [
    ['21000', 'Credit Cards', [['21100', 'Credit Card']]],
    ['22000', 'Loans', [
      ['22100', 'Mortgage'],
      ['22200', 'Car Loan'],
      ['22300', 'Student Loan'],
    ]],
    ['23000', 'Other Payables', [['23100', 'Money I Owe']]],
  ]],
  equity: ['30000', 'Equity', [
    ['31000', 'Opening Balances', undefined, 'Offset for starting balances when you begin tracking.'],
    ['32000', 'Retained Earnings', undefined, 'Accumulated net income from closed periods.'],
  ]],
  income: ['40000', 'Income', [
    ['41000', 'Salary & Wages'],
    ['42000', 'Interest Income'],
    ['43000', 'Dividends'],
    ['44000', 'Gifts Received'],
    ['49000', 'Other Income'],
  ]],
  expense: ['50000', 'Expenses', [
    ['51000', 'Housing', [
      ['51100', 'Rent'],
      ['51200', 'Mortgage Interest'],
      ['51300', 'Utilities'],
      ['51400', 'Home Maintenance'],
    ]],
    ['52000', 'Food', [
      ['52100', 'Groceries'],
      ['52200', 'Eating Out'],
    ]],
    ['53000', 'Transport', [
      ['53100', 'Fuel'],
      ['53200', 'Public Transport'],
      ['53300', 'Vehicle Maintenance'],
    ]],
    ['54000', 'Health', [
      ['54100', 'Medical'],
      ['54200', 'Fitness'],
    ]],
    ['55000', 'Personal', [
      ['55100', 'Clothing'],
      ['55200', 'Entertainment'],
      ['55300', 'Subscriptions'],
    ]],
    ['56000', 'Insurance'],
    ['57000', 'Tax'],
    ['58000', 'Interest & Bank Charges'],
    ['59000', 'Miscellaneous'],
  ]],
}

/**
 * Names the default chart used before it switched to British English, keyed by code.
 * Saved ledgers still carrying one of these (i.e. never renamed by the user) are updated on load.
 */
export const LEGACY_DEFAULT_NAMES: Record<string, string> = {
  '1110': 'Checking Account',
  '1210': 'Brokerage Account',
  '1220': 'Retirement Account',
  '2220': 'Auto Loan',
  '5220': 'Dining Out',
  '5300': 'Transportation',
  '5320': 'Public Transit',
  '5700': 'Taxes',
  '5800': 'Interest & Bank Fees',
}

/**
 * Stable internal id for a default account, from its 5-digit code (11100 → acc-1110).
 * Ids were fixed when the chart used 4-digit codes and never change, so journal entries in
 * saved ledgers keep pointing at the same accounts. The visible code is free to change.
 */
export const accountIdForCode = (code: string) => `acc-${code.slice(0, 4)}`

/** GL codes are exactly five digits. */
export const CODE_LENGTH = 5
export const isValidCode = (code: string) => /^\d{5}$/.test(code)

export function defaultAccounts(): Account[] {
  const out: Account[] = []
  const add = (type: AccountType, [code, name, children, description]: Seed, parentId: string | null) => {
    const id = accountIdForCode(code)
    out.push({ id, code, name, type, parentId, isGroup: !!children, archived: false, description })
    children?.forEach((c) => add(type, c, id))
  }
  for (const [type, seed] of Object.entries(TREE) as [AccountType, Seed][]) add(type, seed, null)
  return out
}

export function emptyLedger(): LedgerData {
  return { version: 1, currency: 'CAD', codeLength: CODE_LENGTH, accounts: defaultAccounts(), entries: [] }
}

/** A few months of realistic activity so the reports have something to show. */
export function sampleEntries(): JournalEntry[] {
  const A = accountIdForCode
  const d = (n: number) => Math.round(n * 100)
  let seq = 0
  const entry = (date: string, description: string, lines: [string, number, number, string?][]): JournalEntry => ({
    id: `sample-${String(++seq).padStart(3, '0')}`,
    date,
    description,
    lines: lines.map(([code, debit, credit, memo]) => ({ accountId: A(code), debit, credit, memo })),
  })

  const year = new Date().getFullYear()
  const entries: JournalEntry[] = [
    entry(`${year}-01-01`, 'Opening balances', [
      ['11100', d(3200), 0],
      ['11200', d(12000), 0],
      ['12100', d(18500), 0],
      ['13200', d(14000), 0],
      ['21100', 0, d(850)],
      ['22200', 0, d(9600)],
      ['31000', 0, d(37250)],
    ]),
  ]

  for (const [m, mm] of [[1, '01'], [2, '02'], [3, '03']] as const) {
    const eom = mm === '02' ? '28' : '30'
    entries.push(
      entry(`${year}-${mm}-01`, 'Rent', [['51100', d(1650), 0], ['11100', 0, d(1650)]]),
      entry(`${year}-${mm}-05`, 'Weekly food shop', [['52100', d(142.37), 0], ['21100', 0, d(142.37)]]),
      entry(`${year}-${mm}-12`, 'Electricity & broadband', [
        ['51300', d(85.2), 0, 'Electricity'],
        ['51300', d(60), 0, 'Broadband'],
        ['11100', 0, d(145.2)],
      ]),
      entry(`${year}-${mm}-15`, 'Salary', [
        ['11100', d(2980), 0, 'Net pay'],
        ['57000', d(720), 0, 'Income tax'],
        ['56000', d(95), 0, 'Health insurance'],
        ['12200', d(305), 0, 'Pension contribution'],
        ['41000', 0, d(4100), 'Gross pay'],
      ]),
      entry(`${year}-${mm}-18`, 'Dinner with friends', [['52200', d(64.5 + m * 3), 0], ['21100', 0, d(64.5 + m * 3)]]),
      entry(`${year}-${mm}-20`, 'Car loan repayment', [
        ['22200', d(310), 0, 'Capital'],
        ['58000', d(42), 0, 'Interest'],
        ['11100', 0, d(352)],
      ]),
      entry(`${year}-${mm}-22`, 'Fuel', [['53100', d(48 + m * 2), 0], ['21100', 0, d(48 + m * 2)]]),
      entry(`${year}-${mm}-26`, 'Credit card repayment', [['21100', d(400), 0], ['11100', 0, d(400)]]),
      entry(`${year}-${mm}-28`, 'Transfer to savings', [['11200', d(500), 0], ['11100', 0, d(500)]]),
      entry(`${year}-${mm}-${eom}`, 'Salary', [
        ['11100', d(2980), 0, 'Net pay'],
        ['57000', d(720), 0, 'Income tax'],
        ['56000', d(95), 0, 'Health insurance'],
        ['12200', d(305), 0, 'Pension contribution'],
        ['41000', 0, d(4100), 'Gross pay'],
      ]),
      entry(`${year}-${mm}-${eom}`, 'Savings interest', [['11200', d(18 + m), 0], ['42000', 0, d(18 + m)]]),
    )
  }
  entries.push(
    entry(`${year}-02-14`, 'Streaming subscriptions', [['55300', d(27.98), 0], ['21100', 0, d(27.98)]]),
    entry(`${year}-03-08`, 'Car service', [['53300', d(79.99), 0], ['11300', 0, d(40)], ['21100', 0, d(39.99)]]),
    entry(`${year}-03-02`, 'Cash machine withdrawal', [['11300', d(100), 0], ['11100', 0, d(100)]]),
    entry(`${year}-03-25`, 'Quarterly dividend', [['12100', d(132.4), 0], ['43000', 0, d(132.4)]]),
  )
  return entries
}
