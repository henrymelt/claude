import { useState } from 'react'
import type { FormEvent } from 'react'
import { validateEntry } from '../lib/ledger'
import { centsToInput, formatMoney, parseAmount } from '../lib/money'
import { newId, today } from '../lib/store'
import type { Account, JournalEntry } from '../lib/types'
import { AccountSelect } from './AccountSelect'
import { Button, ConfirmButton, Field, inputClass, Modal } from './ui'

interface DraftLine {
  key: string
  accountId: string
  debit: string
  credit: string
  memo: string
}

const blankLine = (): DraftLine => ({ key: newId('l'), accountId: '', debit: '', credit: '', memo: '' })

export function JournalEntryForm({
  entry,
  accounts,
  currency,
  onSave,
  onDelete,
  onClose,
}: {
  entry?: JournalEntry
  accounts: Account[]
  currency: string
  onSave: (e: JournalEntry) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const [date, setDate] = useState(entry?.date ?? today())
  const [description, setDescription] = useState(entry?.description ?? '')
  const [lines, setLines] = useState<DraftLine[]>(
    entry
      ? entry.lines.map((l) => ({
          key: newId('l'),
          accountId: l.accountId,
          debit: centsToInput(l.debit),
          credit: centsToInput(l.credit),
          memo: l.memo ?? '',
        }))
      : [blankLine(), blankLine()],
  )
  const [errors, setErrors] = useState<string[]>([])

  const parsed = lines.map((l) => ({ debit: parseAmount(l.debit), credit: parseAmount(l.credit) }))
  const totalDebit = parsed.reduce((s, p) => s + (p.debit ?? 0), 0)
  const totalCredit = parsed.reduce((s, p) => s + (p.credit ?? 0), 0)
  const diff = totalDebit - totalCredit

  // Validation messages describe the last submit attempt; drop them once the user edits lines.
  const editLines = (fn: (ls: DraftLine[]) => DraftLine[]) => {
    setErrors([])
    setLines(fn)
  }

  const update = (key: string, patch: Partial<DraftLine>) =>
    editLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  /** Put the outstanding difference on the first line with no amount (adding one if needed). */
  const autoBalance = () => {
    if (!diff) return
    const amt = centsToInput(Math.abs(diff))
    const patch = diff > 0 ? { credit: amt, debit: '' } : { debit: amt, credit: '' }
    editLines((ls) => {
      const target = ls.find((l) => !l.debit && !l.credit)
      return target ? ls.map((l) => (l === target ? { ...l, ...patch } : l)) : [...ls, { ...blankLine(), ...patch }]
    })
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const badAmount = parsed.findIndex((p) => p.debit === null || p.credit === null)
    if (badAmount !== -1) {
      setErrors([`Line ${badAmount + 1}: amount must be a positive number with at most 2 decimals.`])
      return
    }
    const result: JournalEntry = {
      id: entry?.id ?? newId('je'),
      date,
      description: description.trim(),
      lines: lines
        .filter((l) => l.accountId || l.debit || l.credit)
        .map((l) => ({
          accountId: l.accountId,
          debit: parseAmount(l.debit) ?? 0,
          credit: parseAmount(l.credit) ?? 0,
          ...(l.memo.trim() ? { memo: l.memo.trim() } : {}),
        })),
    }
    const errs = validateEntry(result, accounts)
    setErrors(errs)
    if (!errs.length) onSave(result)
  }

  return (
    <Modal title={entry ? 'Edit journal entry' : 'New journal entry'} onClose={onClose} wide>
      <form
        onSubmit={submit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e)
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_1fr]">
          <Field label="Date">
            <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <Field label="Description">
            <input
              className={inputClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Weekly food shop"
              autoFocus
            />
          </Field>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-2">Account</th>
                <th className="px-2 py-2">Memo</th>
                <th className="w-32 px-2 py-2 text-right">Debit</th>
                <th className="w-32 px-2 py-2 text-right">Credit</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.key} className="border-t border-slate-100">
                  <td className="px-2 py-1.5">
                    <AccountSelect accounts={accounts} value={l.accountId} onChange={(id) => update(l.key, { accountId: id })} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input className={inputClass} value={l.memo} onChange={(e) => update(l.key, { memo: e.target.value })} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className={`${inputClass} text-right font-mono ${parsed[i].debit === null ? 'ring-rose-400' : ''}`}
                      inputMode="decimal"
                      placeholder="0.00"
                      value={l.debit}
                      onChange={(e) => update(l.key, { debit: e.target.value, ...(e.target.value ? { credit: '' } : {}) })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className={`${inputClass} text-right font-mono ${parsed[i].credit === null ? 'ring-rose-400' : ''}`}
                      inputMode="decimal"
                      placeholder="0.00"
                      value={l.credit}
                      onChange={(e) => update(l.key, { credit: e.target.value, ...(e.target.value ? { debit: '' } : {}) })}
                    />
                  </td>
                  <td className="pr-2 text-center">
                    <button
                      type="button"
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 disabled:invisible"
                      onClick={() => editLines((ls) => ls.filter((x) => x.key !== l.key))}
                      disabled={lines.length <= 2}
                      aria-label="Remove line"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-slate-50">
              <tr>
                <td className="px-2 py-2" colSpan={2}>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => editLines((ls) => [...ls, blankLine()])}>
                      + Add line
                    </Button>
                    {diff !== 0 && (
                      <Button size="sm" variant="ghost" onClick={autoBalance}>
                        Balance with {diff > 0 ? 'credit' : 'debit'} of {formatMoney(Math.abs(diff), currency)}
                      </Button>
                    )}
                  </div>
                </td>
                <td className="num px-3 py-2 font-semibold">{formatMoney(totalDebit, currency)}</td>
                <td className="num px-3 py-2 font-semibold">{formatMoney(totalCredit, currency)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <div
          className={`rounded-md px-3 py-2 text-sm ${
            diff === 0 && totalDebit > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
          }`}
        >
          {diff === 0 && totalDebit > 0
            ? '✓ Balanced — total debits equal total credits.'
            : diff === 0
              ? 'Enter amounts. Every entry must have equal debits and credits.'
              : `Out of balance by ${formatMoney(Math.abs(diff), currency)} (${diff > 0 ? 'debits' : 'credits'} exceed ${
                  diff > 0 ? 'credits' : 'debits'
                }).`}
        </div>

        {errors.length > 0 && (
          <ul className="space-y-1 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-2 pt-1">
          {onDelete && (
            <ConfirmButton variant="danger" confirmLabel="Click again to delete" onConfirm={onDelete}>
              Delete entry
            </ConfirmButton>
          )}
          <span className="ml-auto hidden text-xs text-slate-400 sm:inline">Ctrl/⌘ + Enter to save</span>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            {entry ? 'Save changes' : 'Post entry'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
