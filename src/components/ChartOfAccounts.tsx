import { useMemo, useState } from 'react'
import { accountHasPostings, accountTree, balanceSheetSummary, rolledUpBalances } from '../lib/ledger'
import { formatAccounting, formatMoney } from '../lib/money'
import type { Action } from '../lib/store'
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPES, NORMAL_BALANCE } from '../lib/types'
import type { Account, AccountType, LedgerData } from '../lib/types'
import { AccountForm } from './AccountForm'
import { TYPE_DOT } from './typeColors'
import { Button, Card, ConfirmButton, inputClass, TypeBadge } from './ui'

type Editing = { account?: Account; parentId?: string } | null

export function ChartOfAccounts({
  data,
  dispatch,
  onOpenLedger,
}: {
  data: LedgerData
  dispatch: (a: Action) => void
  onOpenLedger: (accountId: string) => void
}) {
  const { accounts, entries, currency } = data
  const [filter, setFilter] = useState<AccountType | 'all'>('all')
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<Editing>(null)

  const balances = useMemo(() => rolledUpBalances(accounts, entries), [accounts, entries])
  const summary = useMemo(() => balanceSheetSummary(accounts, entries), [accounts, entries])
  const tree = useMemo(() => accountTree(accounts), [accounts])
  const postingCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of entries) for (const l of e.lines) m.set(l.accountId, (m.get(l.accountId) ?? 0) + 1)
    return m
  }, [entries])

  const q = query.trim().toLowerCase()
  const visible = useMemo(() => {
    const matches = (a: Account) => a.name.toLowerCase().includes(q) || a.code.includes(q)
    const byId = new Map(accounts.map((a) => [a.id, a]))
    const isHidden = (a: Account) => {
      for (let p = a.parentId ? byId.get(a.parentId) : undefined; p; p = p.parentId ? byId.get(p.parentId) : undefined)
        if (collapsed.has(p.id)) return true
      return false
    }
    return tree.filter(({ account: a }) => {
      if (filter !== 'all' && a.type !== filter) return false
      if (!showArchived && a.archived) return false
      if (q) return matches(a) || tree.some((r) => r.account.parentId === a.id && matches(r.account))
      return !isHidden(a)
    })
  }, [tree, filter, showArchived, q, collapsed, accounts])

  const toggle = (id: string) =>
    setCollapsed((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const netWorth = summary.assets - summary.liabilities

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total assets" value={formatMoney(summary.assets, currency)} dot={TYPE_DOT.asset} />
        <Stat label="Total liabilities" value={formatMoney(summary.liabilities, currency)} dot={TYPE_DOT.liability} />
        <Stat label="Net worth" value={formatMoney(netWorth, currency)} dot={TYPE_DOT.equity} emphasis />
        <Stat
          label="Accounting equation"
          value={summary.balanced ? 'In balance' : 'Out of balance'}
          sub="Assets = Liabilities + Equity"
          dot={summary.balanced ? 'bg-emerald-500' : 'bg-rose-500'}
        />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {(['all', ...ACCOUNT_TYPES] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilter(t)}
                className={`rounded-md px-2.5 py-1 text-sm font-medium ${
                  filter === t ? 'bg-slate-900 text-slate-50' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t === 'all' ? 'All' : ACCOUNT_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <input
              className={`${inputClass} !w-48`}
              placeholder="Search code or name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <label className="flex items-center gap-1.5 text-sm text-slate-600">
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
              Archived
            </label>
            <Button variant="primary" onClick={() => setEditing({})}>
              + New account
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="w-24 px-4 py-2">Code</th>
                <th className="px-4 py-2">Account</th>
                <th className="px-4 py-2">Type</th>
                <th className="hidden px-4 py-2 md:table-cell">Normal</th>
                <th className="hidden px-4 py-2 text-right md:table-cell">Postings</th>
                <th className="px-4 py-2 text-right">Balance</th>
                <th className="w-40 px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {visible.map(({ account: a, depth }) => {
                const bal = balances.get(a.id) ?? 0
                const isRoot = !a.parentId
                const hasChildren = accounts.some((c) => c.parentId === a.id)
                const deletable = !isRoot && !hasChildren && !accountHasPostings(a.id, entries)
                return (
                  <tr
                    key={a.id}
                    className={`group border-b border-slate-100 last:border-0 hover:bg-slate-50 ${
                      isRoot ? 'bg-slate-50/70' : ''
                    } ${a.archived ? 'opacity-50' : ''}`}
                  >
                    <td className={`px-4 py-2 font-mono text-xs ${a.isGroup ? 'font-semibold' : 'text-slate-500'}`}>{a.code}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5" style={{ paddingLeft: depth * 20 }}>
                        {a.isGroup ? (
                          <button
                            type="button"
                            onClick={() => toggle(a.id)}
                            className="flex size-5 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                            aria-label={collapsed.has(a.id) ? 'Expand' : 'Collapse'}
                          >
                            <span className={`text-[10px] transition-transform ${collapsed.has(a.id) ? '' : 'rotate-90'}`}>▶</span>
                          </button>
                        ) : (
                          <span className="w-5" />
                        )}
                        <button
                          type="button"
                          onClick={() => onOpenLedger(a.id)}
                          className={`whitespace-nowrap text-left hover:text-indigo-600 hover:underline ${a.isGroup ? 'font-semibold' : ''}`}
                          title={a.description}
                        >
                          {a.name}
                        </button>
                        {a.archived && <span className="text-xs text-slate-500">(archived)</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <TypeBadge type={a.type} />
                    </td>
                    <td className="hidden px-4 py-2 text-xs capitalize text-slate-500 md:table-cell">{NORMAL_BALANCE[a.type]}</td>
                    <td className="num hidden px-4 py-2 text-slate-500 md:table-cell">{a.isGroup ? '' : postingCounts.get(a.id) ?? 0}</td>
                    <td className={`num px-4 py-2 ${a.isGroup ? 'font-semibold' : ''} ${bal < 0 ? 'text-rose-600' : ''}`}>
                      {formatAccounting(bal, currency)}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        {a.isGroup && (
                          <Button size="sm" variant="ghost" onClick={() => setEditing({ parentId: a.id })} title="Add sub-account">
                            + Sub
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setEditing({ account: a })}>
                          Edit
                        </Button>
                        {!isRoot && !deletable && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => dispatch({ type: 'saveAccount', account: { ...a, archived: !a.archived } })}
                            title={a.archived ? 'Restore' : 'Hide from pickers; history is kept'}
                          >
                            {a.archived ? 'Restore' : 'Archive'}
                          </Button>
                        )}
                        {deletable && (
                          <ConfirmButton
                            size="sm"
                            variant="ghost"
                            className="text-rose-600"
                            confirmLabel="Confirm delete"
                            onConfirm={() => dispatch({ type: 'deleteAccount', id: a.id })}
                          >
                            Delete
                          </ConfirmButton>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs text-slate-500">
        Balances are shown in each account's normal direction; a figure in (parentheses) is opposite to normal — for
        example an overdrawn bank account. Group balances roll up their sub-accounts.
      </p>

      {editing && (
        <AccountForm
          account={editing.account}
          defaultParentId={editing.parentId}
          accounts={accounts}
          entries={entries}
          onClose={() => setEditing(null)}
          onSave={(account) => {
            dispatch({ type: 'saveAccount', account })
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function Stat({ label, value, sub, dot, emphasis }: { label: string; value: string; sub?: string; dot: string; emphasis?: boolean }) {
  return (
    <Card className="px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <span className={`size-2 rounded-full ${dot}`} />
        {label}
      </div>
      <div className={`mt-1 font-mono tabular-nums ${emphasis ? 'text-xl font-semibold' : 'text-lg font-medium'}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </Card>
  )
}
