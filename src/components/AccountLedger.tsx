import { useMemo, useState } from 'react'
import { accountLedger, accountPath, descendantIds } from '../lib/ledger'
import { formatAccounting, formatMoney } from '../lib/money'
import { NORMAL_BALANCE } from '../lib/types'
import type { JournalEntry, LedgerData } from '../lib/types'
import { AccountSelect } from './AccountSelect'
import { Card, EmptyState, Field, inputClass, TypeBadge } from './ui'

export function AccountLedger({
  data,
  accountId,
  onSelect,
  onEditEntry,
}: {
  data: LedgerData
  accountId: string
  onSelect: (id: string) => void
  onEditEntry: (e: JournalEntry) => void
}) {
  const { accounts, entries, currency } = data
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const account = accounts.find((a) => a.id === accountId)
  const byId = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])

  const ledger = useMemo(
    () => (account ? accountLedger(account, accounts, entries, { from: from || undefined, to: to || undefined }) : null),
    [account, accounts, entries, from, to],
  )

  const inScope = useMemo(
    () => (account ? new Set([account.id, ...descendantIds(account.id, accounts)]) : new Set<string>()),
    [account, accounts],
  )

  const totals = ledger?.rows.reduce((t, r) => ({ debit: t.debit + r.debit, credit: t.credit + r.credit }), { debit: 0, credit: 0 })

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3 px-4 py-3">
        <div className="min-w-64 flex-1">
          <Field label="Account">
            <AccountSelect accounts={accounts} value={accountId} onChange={onSelect} postableOnly={false} />
          </Field>
        </div>
        <Field label="From">
          <input type="date" className={`${inputClass} !w-40`} value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <input type="date" className={`${inputClass} !w-40`} value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </Card>

      {!account || !ledger || !totals ? (
        <Card>
          <EmptyState title="Choose an account">Pick an account above, or click any account name in the chart.</EmptyState>
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-4 py-4">
            <div>
              <div className="text-xs text-slate-500">{accountPath(account, accounts)}</div>
              <h2 className="mt-0.5 flex items-center gap-2 text-lg font-semibold">
                <span className="font-mono text-slate-400">{account.code}</span> {account.name} <TypeBadge type={account.type} />
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Normal balance: <span className="capitalize">{NORMAL_BALANCE[account.type]}</span>
                {account.isGroup && ' · Includes all sub-accounts'}
              </p>
            </div>
            {/* T-account summary */}
            <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 text-sm">
              <div className="border-b border-r border-slate-200 bg-slate-50 px-4 py-1 text-center text-xs font-semibold uppercase text-slate-500">Dr</div>
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-1 text-center text-xs font-semibold uppercase text-slate-500">Cr</div>
              <div className="num border-r border-slate-200 px-4 py-1.5">{formatMoney(totals.debit, currency)}</div>
              <div className="num px-4 py-1.5">{formatMoney(totals.credit, currency)}</div>
              <div className="col-span-2 border-t border-slate-200 px-4 py-1.5 text-center">
                <span className="text-xs text-slate-500">Closing balance </span>
                <span className="font-mono font-semibold">{formatAccounting(ledger.closing, currency)}</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="w-28 px-4 py-2">Date</th>
                  <th className="px-4 py-2">Description</th>
                  <th className="px-4 py-2">Counter account</th>
                  <th className="w-32 px-4 py-2 text-right">Debit</th>
                  <th className="w-32 px-4 py-2 text-right">Credit</th>
                  <th className="w-36 px-4 py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-600">
                  <td className="px-4 py-1.5 font-mono text-xs">{from || '—'}</td>
                  <td className="px-4 py-1.5 italic" colSpan={4}>
                    Opening balance
                  </td>
                  <td className="num px-4 py-1.5">{formatAccounting(ledger.opening, currency)}</td>
                </tr>
                {ledger.rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No activity in this period.
                    </td>
                  </tr>
                )}
                {ledger.rows.map((r) => {
                  const others = r.entry.lines.filter((l) => !inScope.has(l.accountId))
                  const counter =
                    others.length === 1
                      ? byId.get(others[0].accountId)?.name
                      : others.length === 0
                        ? 'Internal transfer'
                        : `Split (${others.length} accounts)`
                  const line = r.entry.lines[r.lineIndex]
                  return (
                    <tr
                      key={`${r.entry.id}-${r.lineIndex}`}
                      className="cursor-pointer border-b border-slate-100 hover:bg-indigo-50/40"
                      onClick={() => onEditEntry(r.entry)}
                    >
                      <td className="px-4 py-1.5 font-mono text-xs text-slate-500">{r.entry.date}</td>
                      <td className="px-4 py-1.5">
                        {r.entry.description}
                        {r.memo && <span className="ml-2 text-xs text-slate-400">— {r.memo}</span>}
                        {account.isGroup && <span className="ml-2 text-xs text-slate-400">[{byId.get(line.accountId)?.name}]</span>}
                      </td>
                      <td className="px-4 py-1.5 text-slate-600">{counter}</td>
                      <td className="num px-4 py-1.5">{r.debit ? formatMoney(r.debit, currency) : ''}</td>
                      <td className="num px-4 py-1.5">{r.credit ? formatMoney(r.credit, currency) : ''}</td>
                      <td className={`num px-4 py-1.5 ${r.balance < 0 ? 'text-rose-600' : ''}`}>{formatAccounting(r.balance, currency)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 font-semibold">
                  <td className="px-4 py-2" colSpan={3}>
                    Totals / closing balance
                  </td>
                  <td className="num px-4 py-2">{formatMoney(totals.debit, currency)}</td>
                  <td className="num px-4 py-2">{formatMoney(totals.credit, currency)}</td>
                  <td className="num px-4 py-2">{formatAccounting(ledger.closing, currency)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
