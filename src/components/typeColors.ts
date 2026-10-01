import type { AccountType } from '../lib/types'

export const TYPE_DOT: Record<AccountType, string> = {
  asset: 'bg-emerald-500',
  liability: 'bg-rose-500',
  equity: 'bg-violet-500',
  income: 'bg-sky-500',
  expense: 'bg-amber-500',
}
