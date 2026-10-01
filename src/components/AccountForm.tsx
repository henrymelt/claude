import { useState } from 'react'
import type { FormEvent } from 'react'
import { accountHasPostings, descendantIds } from '../lib/ledger'
import { newId } from '../lib/store'
import { NORMAL_BALANCE } from '../lib/types'
import type { Account, JournalEntry } from '../lib/types'
import { AccountSelect } from './AccountSelect'
import { Button, Field, inputClass, Modal } from './ui'

export function AccountForm({
  account,
  defaultParentId,
  accounts,
  entries,
  onSave,
  onClose,
}: {
  account?: Account
  defaultParentId?: string
  accounts: Account[]
  entries: JournalEntry[]
  onSave: (a: Account) => void
  onClose: () => void
}) {
  const isRoot = !!account && !account.parentId
  const [parentId, setParentId] = useState(account?.parentId ?? defaultParentId ?? '')
  const [code, setCode] = useState(account?.code ?? suggestCode(defaultParentId, accounts))
  const [name, setName] = useState(account?.name ?? '')
  const [isGroup, setIsGroup] = useState(account?.isGroup ?? false)
  const [description, setDescription] = useState(account?.description ?? '')
  const [errors, setErrors] = useState<string[]>([])

  const parent = accounts.find((a) => a.id === parentId)
  const type = account && isRoot ? account.type : parent?.type
  const hasPostings = account ? accountHasPostings(account.id, entries) : false
  const hasChildren = account ? accounts.some((a) => a.parentId === account.id) : false

  // A group can't be moved beneath itself or its own descendants.
  const excluded = account ? new Set([account.id, ...descendantIds(account.id, accounts)]) : new Set<string>()
  const parentChoices = accounts.filter((a) => a.isGroup && !excluded.has(a.id))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const errs: string[] = []
    if (!isRoot && !parent) errs.push('Choose a parent group.')
    if (!code.trim()) errs.push('Enter an account code.')
    else if (accounts.some((a) => a.code === code.trim() && a.id !== account?.id)) errs.push(`Code ${code} is already used.`)
    if (!name.trim()) errs.push('Enter an account name.')
    if (account && parent && parent.type !== account.type && (hasPostings || hasChildren))
      errs.push('Accounts with activity or sub-accounts cannot move to a different account type.')
    setErrors(errs)
    if (errs.length || !type) return
    onSave({
      id: account?.id ?? newId('acc'),
      code: code.trim(),
      name: name.trim(),
      type,
      parentId: isRoot ? null : parentId,
      isGroup,
      archived: account?.archived ?? false,
      description: description.trim() || undefined,
    })
  }

  return (
    <Modal title={account ? `Edit ${account.name}` : 'New account'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {!isRoot && (
          <Field label="Parent group">
            <AccountSelect
              accounts={parentChoices}
              value={parentId}
              onChange={(id) => {
                setParentId(id)
                if (!account) setCode(suggestCode(id, accounts))
              }}
              postableOnly={false}
            />
          </Field>
        )}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Code">
            <input className={`${inputClass} font-mono`} value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <div className="col-span-2">
            <Field label="Name">
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </Field>
          </div>
        </div>
        <Field label="Description (optional)">
          <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-slate-300 text-indigo-600"
            checked={isGroup}
            disabled={isRoot || (isGroup ? hasChildren : hasPostings)}
            onChange={(e) => setIsGroup(e.target.checked)}
          />
          <span>
            <span className="font-medium">Group account</span>
            <span className="block text-xs text-slate-500">
              Groups organise sub-accounts and show their combined balance. You can't post transactions to a group.
              {isGroup && hasChildren && ' (Has sub-accounts, so it must stay a group.)'}
              {!isGroup && hasPostings && ' (Has transactions, so it cannot become a group.)'}
            </span>
          </span>
        </label>
        {type && (
          <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Type: <span className="font-medium capitalize">{type}</span> · Normal balance:{' '}
            <span className="font-medium capitalize">{NORMAL_BALANCE[type]}</span> — increases with{' '}
            {NORMAL_BALANCE[type] === 'debit' ? 'debits' : 'credits'}, decreases with{' '}
            {NORMAL_BALANCE[type] === 'debit' ? 'credits' : 'debits'}.
          </p>
        )}
        {errors.length > 0 && (
          <ul className="space-y-1 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            {account ? 'Save changes' : 'Create account'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/** Next free code under a parent: 5200 → 5230 if 5210/5220 exist; 5210 → 5211. */
function suggestCode(parentId: string | undefined, accounts: Account[]): string {
  const parent = accounts.find((a) => a.id === parentId)
  if (!parent) return ''
  const siblings = accounts.filter((a) => a.parentId === parent.id).map((a) => Number(a.code)).filter(Number.isFinite)
  const base = Number(parent.code)
  if (!Number.isFinite(base)) return ''
  const trailingZeros = parent.code.length - parent.code.replace(/0+$/, '').length
  const step = trailingZeros >= 2 ? 10 ** (trailingZeros - 1) : 1
  const used = new Set(accounts.map((a) => a.code))
  let next = siblings.length ? Math.max(...siblings) + step : base + step
  while (used.has(String(next))) next += 1
  return String(next)
}
