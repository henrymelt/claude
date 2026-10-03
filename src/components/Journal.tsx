import { useMemo, useState } from 'react'
import { entryTotals, sortEntries } from '../lib/ledger'
import { formatMoney } from '../lib/money'
import type { JournalEntry, LedgerData } from '../lib/types'
import { Button, Card, EmptyState, inputClass } from './ui'

export function Journal({
  data,
  onEdit,
  onNew,
  onOpenLedger,
}: {
  data: LedgerData
  onEdit: (e: JournalEntry) => void
  onNew: () => void
  onOpenLedger: (accountId: string) => void
}) {
  const { accounts, entries, currency } = data
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const byId = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])

  const q = query.trim().toLowerCase()
  const shown = useMemo(
    () =>
      sortEntries(entries)
        .reverse()
        .filter((e) => (!from || e.date >= from) && (!to || e.date <= to))
        .filter(
          (e) =>
            !q ||
            e.description.toLowerCase().includes(q) ||
            e.lines.some((l) => {
              const a = byId.get(l.accountId)
              return l.memo?.toLowerCase().includes(q) || a?.name.toLowerCase().includes(q) || a?.code.includes(q)
            }),
        ),
    [entries, from, to, q, byId],
  )

  const total = shown.reduce((s, e) => s + entryTotals(e).debit, 0)

  return (
    <Card>
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 px-4 py-3">
        <input className={`${inputClass} !w-56`} placeholder="Search description, account, memo…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <input type="date" className={`${inputClass} !w-40`} value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
        <span className="pb-1.5 text-sm text-slate-400">to</span>
        <input type="date" className={`${inputClass} !w-40`} value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
        <div className="ml-auto">
          <Button variant="primary" onClick={onNew}>
            + New entry
          </Button>
        </div>
      </div>

      {shown.length === 0 ? (
        <EmptyState title={entries.length ? 'No entries match your filters' : 'No journal entries yet'}>
          {!entries.length && (
            <>
              Record your first transaction, or load sample data from the <b>Data</b> menu.
              <br />
              Tip: start with an <i>Opening balances</i> entry that debits your asset accounts, credits your liabilities, and
              puts the difference in <b>31000 · Opening Balances</b>.
            </>
          )}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="w-28 px-4 py-2">Date</th>
                <th className="px-4 py-2">Account / Description</th>
                <th className="w-36 px-4 py-2 text-right">Debit</th>
                <th className="w-36 px-4 py-2 text-right">Credit</th>
              </tr>
            </thead>
            {shown.map((e) => (
              <tbody key={e.id} className="group cursor-pointer border-b border-slate-200 hover:bg-indigo-50/40" onClick={() => onEdit(e)}>
                {/* Traditional journal layout: debits first, credits indented beneath. */}
                {[...e.lines]
                  .sort((a, b) => Number(b.debit > 0) - Number(a.debit > 0))
                  .map((l, i) => {
                    const a = byId.get(l.accountId)
                    return (
                      <tr key={i}>
                        <td className="px-4 py-1 align-top font-mono text-xs text-slate-500">{i === 0 ? e.date : ''}</td>
                        <td className={`px-4 py-1 ${l.credit ? 'pl-12' : ''}`}>
                          <button
                            type="button"
                            className="hover:text-indigo-600 hover:underline"
                            onClick={(ev) => {
                              ev.stopPropagation()
                              onOpenLedger(l.accountId)
                            }}
                          >
                            <span className="font-mono text-xs text-slate-400">{a?.code}</span> {a?.name ?? 'Unknown account'}
                          </button>
                          {l.memo && <span className="ml-2 text-xs text-slate-400">— {l.memo}</span>}
                        </td>
                        <td className="num px-4 py-1">{l.debit ? formatMoney(l.debit, currency) : ''}</td>
                        <td className="num px-4 py-1">{l.credit ? formatMoney(l.credit, currency) : ''}</td>
                      </tr>
                    )
                  })}
                <tr>
                  <td />
                  <td colSpan={3} className="px-4 pb-2 pt-0.5 text-xs italic text-slate-500">
                    {e.description}
                    <span className="ml-2 not-italic text-indigo-600 opacity-0 group-hover:opacity-100">Edit →</span>
                  </td>
                </tr>
              </tbody>
            ))}
          </table>
        </div>
      )}
      {shown.length > 0 && (
        <div className="flex justify-between border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
          <span>
            {shown.length} {shown.length === 1 ? 'entry' : 'entries'}
          </span>
          <span className="font-mono">Total posted: {formatMoney(total, currency)}</span>
        </div>
      )}
    </Card>
  )
}
