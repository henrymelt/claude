import { useMemo } from 'react'
import { accountTree } from '../lib/ledger'
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPES } from '../lib/types'
import type { Account } from '../lib/types'
import { inputClass } from './ui'

/** Dropdown of accounts grouped by type, indented by depth. */
export function AccountSelect({
  accounts,
  value,
  onChange,
  postableOnly = true,
  allowEmpty = true,
  className = '',
  id,
}: {
  accounts: Account[]
  value: string
  onChange: (id: string) => void
  postableOnly?: boolean
  allowEmpty?: boolean
  className?: string
  id?: string
}) {
  const rows = useMemo(() => accountTree(accounts), [accounts])
  return (
    <select id={id} className={`${inputClass} ${className}`} value={value} onChange={(e) => onChange(e.target.value)}>
      {allowEmpty && <option value="">Select account…</option>}
      {ACCOUNT_TYPES.map((type) => (
        <optgroup key={type} label={ACCOUNT_TYPE_LABELS[type]}>
          {rows
            .filter(({ account: a }) => a.type === type && (!a.archived || a.id === value))
            .map(({ account: a, depth }) => {
              const disabled = postableOnly && a.isGroup
              return (
                <option key={a.id} value={a.id} disabled={disabled}>
                  {'  '.repeat(depth)}
                  {a.code} · {a.name}
                </option>
              )
            })}
        </optgroup>
      ))}
    </select>
  )
}
