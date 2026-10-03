import type { Account, AccountType, JournalEntry, LedgerData } from './types'

type Seed = [code: string, name: string, children?: Seed[], description?: string]

const TREE: Record<AccountType, Seed> = {
  asset: ['1000', 'Assets', [
    ['1100', 'Cash & Bank', [
      ['1110', 'Checking Account'],
      ['1120', 'Savings Account'],
      ['1130', 'Cash on Hand'],
    ]],
    ['1200', 'Investments', [
      ['1210', 'Brokerage Account'],
      ['1220', 'Retirement Account'],
    ]],
    ['1300', 'Property', [
      ['1310', 'Home'],
      ['1320', 'Vehicle'],
    ]],
    ['1400', 'Receivables', [['1410', 'Money Owed to Me']]],
  ]],
  liability: ['2000', 'Liabilities', [
    ['2100', 'Credit Cards', [['2110', 'Credit Card']]],
    ['2200', 'Loans', [
      ['2210', 'Mortgage'],
      ['2220', 'Auto Loan'],
      ['2230', 'Student Loan'],
    ]],
    ['2300', 'Other Payables', [['2310', 'Money I Owe']]],
  ]],
  equity: ['3000', 'Equity', [
    ['3100', 'Opening Balances', undefined, 'Offset for starting balances when you begin tracking.'],
    ['3200', 'Retained Earnings', undefined, 'Accumulated net income from closed periods.'],
  ]],
  income: ['4000', 'Income', [
    ['4100', 'Salary & Wages'],
    ['4200', 'Interest Income'],
    ['4300', 'Dividends'],
    ['4400', 'Gifts Received'],
    ['4900', 'Other Income'],
  ]],
  expense: ['5000', 'Expenses', [
    ['5100', 'Housing', [
      ['5110', 'Rent'],
      ['5120', 'Mortgage Interest'],
      ['5130', 'Utilities'],
      ['5140', 'Home Maintenance'],
    ]],
    ['5200', 'Food', [
      ['5210', 'Groceries'],
      ['5220', 'Dining Out'],
    ]],
    ['5300', 'Transportation', [
      ['5310', 'Fuel'],
      ['5320', 'Public Transit'],
      ['5330', 'Vehicle Maintenance'],
    ]],
    ['5400', 'Health', [
      ['5410', 'Medical'],
      ['5420', 'Fitness'],
    ]],
    ['5500', 'Personal', [
      ['5510', 'Clothing'],
      ['5520', 'Entertainment'],
      ['5530', 'Subscriptions'],
    ]],
    ['5600', 'Insurance'],
    ['5700', 'Taxes'],
    ['5800', 'Interest & Bank Fees'],
    ['5900', 'Miscellaneous'],
  ]],
}

export const accountIdForCode = (code: string) => `acc-${code}`

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
  return { version: 1, currency: 'CAD', accounts: defaultAccounts(), entries: [] }
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
      ['1110', d(3200), 0],
      ['1120', d(12000), 0],
      ['1210', d(18500), 0],
      ['1320', d(14000), 0],
      ['2110', 0, d(850)],
      ['2220', 0, d(9600)],
      ['3100', 0, d(37250)],
    ]),
  ]

  for (const [m, mm] of [[1, '01'], [2, '02'], [3, '03']] as const) {
    const eom = mm === '02' ? '28' : '30'
    entries.push(
      entry(`${year}-${mm}-01`, 'Rent', [['5110', d(1650), 0], ['1110', 0, d(1650)]]),
      entry(`${year}-${mm}-05`, 'Grocery run', [['5210', d(142.37), 0], ['2110', 0, d(142.37)]]),
      entry(`${year}-${mm}-12`, 'Electric & internet', [
        ['5130', d(85.2), 0, 'Electric'],
        ['5130', d(60), 0, 'Internet'],
        ['1110', 0, d(145.2)],
      ]),
      entry(`${year}-${mm}-15`, 'Paycheck', [
        ['1110', d(2980), 0, 'Net deposit'],
        ['5700', d(720), 0, 'Withholding'],
        ['5600', d(95), 0, 'Health insurance'],
        ['1220', d(305), 0, '401(k) contribution'],
        ['4100', 0, d(4100), 'Gross pay'],
      ]),
      entry(`${year}-${mm}-18`, 'Dinner with friends', [['5220', d(64.5 + m * 3), 0], ['2110', 0, d(64.5 + m * 3)]]),
      entry(`${year}-${mm}-20`, 'Car loan payment', [
        ['2220', d(310), 0, 'Principal'],
        ['5800', d(42), 0, 'Interest'],
        ['1110', 0, d(352)],
      ]),
      entry(`${year}-${mm}-22`, 'Fuel', [['5310', d(48 + m * 2), 0], ['2110', 0, d(48 + m * 2)]]),
      entry(`${year}-${mm}-26`, 'Pay credit card', [['2110', d(400), 0], ['1110', 0, d(400)]]),
      entry(`${year}-${mm}-28`, 'Transfer to savings', [['1120', d(500), 0], ['1110', 0, d(500)]]),
      entry(`${year}-${mm}-${eom}`, 'Paycheck', [
        ['1110', d(2980), 0, 'Net deposit'],
        ['5700', d(720), 0, 'Withholding'],
        ['5600', d(95), 0, 'Health insurance'],
        ['1220', d(305), 0, '401(k) contribution'],
        ['4100', 0, d(4100), 'Gross pay'],
      ]),
      entry(`${year}-${mm}-${eom}`, 'Savings interest', [['1120', d(18 + m), 0], ['4200', 0, d(18 + m)]]),
    )
  }
  entries.push(
    entry(`${year}-02-14`, 'Streaming subscriptions', [['5530', d(27.98), 0], ['2110', 0, d(27.98)]]),
    entry(`${year}-03-08`, 'Oil change', [['5330', d(79.99), 0], ['1130', 0, d(40)], ['2110', 0, d(39.99)]]),
    entry(`${year}-03-02`, 'ATM withdrawal', [['1130', d(100), 0], ['1110', 0, d(100)]]),
    entry(`${year}-03-25`, 'Quarterly dividend', [['1210', d(132.4), 0], ['4300', 0, d(132.4)]]),
  )
  return entries
}
