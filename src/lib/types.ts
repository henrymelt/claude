export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense'

export const ACCOUNT_TYPES: AccountType[] = ['asset', 'liability', 'equity', 'income', 'expense']

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  income: 'Income',
  expense: 'Expenses',
}

/** Debit-normal accounts grow with debits; credit-normal accounts grow with credits. */
export const NORMAL_BALANCE: Record<AccountType, 'debit' | 'credit'> = {
  asset: 'debit',
  expense: 'debit',
  liability: 'credit',
  equity: 'credit',
  income: 'credit',
}

export interface Account {
  id: string
  code: string
  name: string
  type: AccountType
  parentId: string | null
  /** Group accounts organise the chart and roll up balances, but cannot be posted to. */
  isGroup: boolean
  archived: boolean
  description?: string
}

/** Amounts are integer cents to avoid floating-point drift. */
export interface JournalLine {
  accountId: string
  debit: number
  credit: number
  memo?: string
}

export interface JournalEntry {
  id: string
  date: string // YYYY-MM-DD
  description: string
  lines: JournalLine[]
}

export interface LedgerData {
  version: 1
  currency: string
  accounts: Account[]
  entries: JournalEntry[]
  /** True while the journal holds the bundled example entries rather than the user's own. */
  sample?: boolean
}
