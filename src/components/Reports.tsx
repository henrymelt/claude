import { useMemo, useState } from 'react'
import { accountTree, balanceSheetSummary, netIncome, rolledUpBalances, trialBalance } from '../lib/ledger'
import type { DateRange } from '../lib/ledger'
import { formatAccounting, formatMoney } from '../lib/money'
import { today } from '../lib/store'
import type { Account, AccountType, LedgerData } from '../lib/types'
import { Card, EmptyState, Field, inputClass } from './ui'

type Report = 'trial' | 'balance' | 'income'

const REPORTS: { id: Report; label: string }[] = [
  { id: 'trial', label: 'Trial balance' },
  { id: 'balance', label: 'Balance sheet' },
  { id: 'income', label: 'Income statement' },
]

export function Reports({ data, onOpenLedger }: { data: LedgerData; onOpenLedger: (id: string) => void }) {
  const [report, setReport] = useState<Report>('trial')
  const [asOf, setAsOf] = useState(today())
  const [from, setFrom] = useState(`${today().slice(0, 4)}-01-01`)

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3 px-4 py-3">
        <div className="flex gap-1">
          {REPORTS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setReport(r.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                report === r.id ? 'bg-slate-900 text-slate-50' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-3">
          {report === 'income' && (
            <Field label="From">
              <input type="date" className={`${inputClass} !w-40`} value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
          )}
          <Field label={report === 'income' ? 'To' : 'As of'}>
            <input type="date" className={`${inputClass} !w-40`} value={asOf} onChange={(e) => setAsOf(e.target.value)} />
          </Field>
        </div>
      </Card>

      {report === 'trial' && <TrialBalance data={data} asOf={asOf} onOpenLedger={onOpenLedger} />}
      {report === 'balance' && <BalanceSheet data={data} asOf={asOf} onOpenLedger={onOpenLedger} />}
      {report === 'income' && <IncomeStatement data={data} from={from} to={asOf} onOpenLedger={onOpenLedger} />}
    </div>
  )
}

function ReportHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-b border-slate-200 px-6 py-4 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
  )
}

const longDate = (d: string) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : ''

function TrialBalance({ data, asOf, onOpenLedger }: { data: LedgerData; asOf: string; onOpenLedger: (id: string) => void }) {
  const { accounts, entries, currency } = data
  const tb = useMemo(() => trialBalance(accounts, entries, asOf), [accounts, entries, asOf])
  const balanced = tb.totalDebit === tb.totalCredit

  return (
    <Card>
      <ReportHeader title="Trial balance" subtitle={`As of ${longDate(asOf)}`} />
      {tb.rows.length === 0 ? (
        <EmptyState title="No balances to report" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="w-24 px-6 py-2">Code</th>
                <th className="px-4 py-2">Account</th>
                <th className="w-40 px-4 py-2 text-right">Debit</th>
                <th className="w-40 px-6 py-2 text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {tb.rows.map((r) => (
                <tr key={r.account.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-1.5 font-mono text-xs text-slate-500">{r.account.code}</td>
                  <td className="px-4 py-1.5">
                    <button type="button" className="hover:text-indigo-600 hover:underline" onClick={() => onOpenLedger(r.account.id)}>
                      {r.account.name}
                    </button>
                  </td>
                  <td className="num px-4 py-1.5">{r.debit ? formatMoney(r.debit, currency) : ''}</td>
                  <td className="num px-6 py-1.5">{r.credit ? formatMoney(r.credit, currency) : ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-400 font-semibold">
                <td className="px-6 py-2" colSpan={2}>
                  Totals{' '}
                  <span className={`ml-2 text-xs font-medium ${balanced ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {balanced ? '✓ Balanced' : `✗ Off by ${formatMoney(Math.abs(tb.totalDebit - tb.totalCredit), currency)}`}
                  </span>
                </td>
                <td className="num px-4 py-2 underline decoration-double underline-offset-4">{formatMoney(tb.totalDebit, currency)}</td>
                <td className="num px-6 py-2 underline decoration-double underline-offset-4">{formatMoney(tb.totalCredit, currency)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  )
}

/** Hierarchical section of a statement for one account type, hiding zero-balance accounts. */
function Section({
  type,
  accounts,
  balances,
  currency,
  onOpenLedger,
  extra,
}: {
  type: AccountType
  accounts: Account[]
  balances: Map<string, number>
  currency: string
  onOpenLedger: (id: string) => void
  extra?: { label: string; amount: number }
}) {
  const rows = accountTree(accounts).filter(({ account: a }) => a.type === type && a.parentId && (balances.get(a.id) ?? 0) !== 0)
  const root = accounts.find((a) => a.type === type && !a.parentId)
  const total = accounts.filter((a) => a.type === type && !a.parentId).reduce((s, a) => s + (balances.get(a.id) ?? 0), 0) + (extra?.amount ?? 0)

  return (
    <tbody>
      <tr>
        <td colSpan={2} className="px-6 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {root?.name ?? type}
        </td>
      </tr>
      {rows.map(({ account: a, depth }) => (
        <tr key={a.id} className="hover:bg-slate-50">
          <td className="py-1 pr-4" style={{ paddingLeft: 24 + (depth - 1) * 20 }}>
            <button
              type="button"
              className={`hover:text-indigo-600 hover:underline ${a.isGroup ? 'font-medium' : 'text-slate-700'}`}
              onClick={() => onOpenLedger(a.id)}
            >
              {a.name}
            </button>
          </td>
          <td className={`num px-6 py-1 ${a.isGroup ? 'font-medium' : 'text-slate-600'}`}>{formatAccounting(balances.get(a.id) ?? 0, currency)}</td>
        </tr>
      ))}
      {extra && extra.amount !== 0 && (
        <tr>
          <td className="py-1 pl-6 pr-4 italic text-slate-700">{extra.label}</td>
          <td className="num px-6 py-1 text-slate-600">{formatAccounting(extra.amount, currency)}</td>
        </tr>
      )}
      <tr className="font-semibold">
        <td className="px-6 py-1.5">Total {root?.name.toLowerCase() ?? type}</td>
        <td className="num border-t border-slate-300 px-6 py-1.5">{formatAccounting(total, currency)}</td>
      </tr>
    </tbody>
  )
}

function BalanceSheet({ data, asOf, onOpenLedger }: { data: LedgerData; asOf: string; onOpenLedger: (id: string) => void }) {
  const { accounts, entries, currency } = data
  const balances = useMemo(() => rolledUpBalances(accounts, entries, { to: asOf }), [accounts, entries, asOf])
  const s = useMemo(() => balanceSheetSummary(accounts, entries, asOf), [accounts, entries, asOf])
  const common = { accounts, balances, currency, onOpenLedger }

  return (
    <Card>
      <ReportHeader title="Balance sheet" subtitle={`As of ${longDate(asOf)}`} />
      <table className="w-full text-sm">
        <Section type="asset" {...common} />
        <Section type="liability" {...common} />
        <Section type="equity" {...common} extra={{ label: 'Net income to date (unclosed)', amount: s.retained }} />
        <tbody>
          <tr className="border-t-2 border-slate-400 font-semibold">
            <td className="px-6 py-2">Total liabilities &amp; equity</td>
            <td className="num px-6 py-2 underline decoration-double underline-offset-4">
              {formatAccounting(s.liabilities + s.equity + s.retained, currency)}
            </td>
          </tr>
          <tr>
            <td colSpan={2} className={`px-6 pb-4 pt-1 text-xs ${s.balanced ? 'text-emerald-600' : 'text-rose-600'}`}>
              {s.balanced
                ? `✓ Assets (${formatMoney(s.assets, currency)}) = Liabilities + Equity`
                : '✗ Balance sheet does not balance'}
            </td>
          </tr>
        </tbody>
      </table>
    </Card>
  )
}

function IncomeStatement({ data, from, to, onOpenLedger }: { data: LedgerData; from: string; to: string; onOpenLedger: (id: string) => void }) {
  const { accounts, entries, currency } = data
  const range = useMemo<DateRange>(() => ({ from: from || undefined, to: to || undefined }), [from, to])
  const balances = useMemo(() => rolledUpBalances(accounts, entries, range), [accounts, entries, range])
  const net = useMemo(() => netIncome(accounts, entries, range), [accounts, entries, range])
  const common = { accounts, balances, currency, onOpenLedger }
  const income = accounts.filter((a) => a.type === 'income' && !a.parentId).reduce((s, a) => s + (balances.get(a.id) ?? 0), 0)

  return (
    <Card>
      <ReportHeader title="Income statement" subtitle={`${longDate(from) || 'Beginning'} – ${longDate(to) || 'today'}`} />
      <table className="w-full text-sm">
        <Section type="income" {...common} />
        <Section type="expense" {...common} />
        <tbody>
          <tr className="border-t-2 border-slate-400 font-semibold">
            <td className="px-6 py-2">{net >= 0 ? 'Net income (saved)' : 'Net loss (overspent)'}</td>
            <td className={`num px-6 py-2 underline decoration-double underline-offset-4 ${net < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              {formatAccounting(net, currency)}
            </td>
          </tr>
          {income > 0 && (
            <tr>
              <td colSpan={2} className="px-6 pb-4 pt-1 text-xs text-slate-500">
                Savings rate: {((net / income) * 100).toFixed(1)}% of income
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  )
}
