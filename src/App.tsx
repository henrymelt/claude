import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AccountLedger } from './components/AccountLedger'
import { ChartOfAccounts } from './components/ChartOfAccounts'
import { Journal } from './components/Journal'
import { JournalEntryForm } from './components/JournalEntryForm'
import { Reports } from './components/Reports'
import { Button } from './components/ui'
import { emptyLedger, sampleEntries } from './lib/defaultChart'
import { isLedgerData, today, useLedger } from './lib/store'
import type { JournalEntry } from './lib/types'

type Tab = 'accounts' | 'journal' | 'ledger' | 'reports'

const TABS: { id: Tab; label: string }[] = [
  { id: 'accounts', label: 'Chart of accounts' },
  { id: 'journal', label: 'Journal' },
  { id: 'ledger', label: 'General ledger' },
  { id: 'reports', label: 'Reports' },
]

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'INR', 'NZD', 'SGD']

export default function App() {
  const [data, dispatch] = useLedger()
  const [tab, setTab] = useState<Tab>('accounts')
  const [ledgerAccountId, setLedgerAccountId] = useState('')
  const [editing, setEditing] = useState<JournalEntry | 'new' | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const openLedger = (id: string) => {
    setLedgerAccountId(id)
    setTab('ledger')
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ledger-${today()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!isLedgerData(parsed)) throw new Error('not a ledger file')
      if (confirm(`Replace current data with ${parsed.accounts.length} accounts and ${parsed.entries.length} entries from "${file.name}"?`))
        dispatch({ type: 'replace', data: parsed })
    } catch {
      alert('That file is not a valid ledger export.')
    }
  }

  const loadSample = () => {
    if (data.entries.length && !confirm('Replace your journal entries with sample data? Your chart of accounts is kept.')) return
    dispatch({ type: 'replace', data: { ...data, entries: sampleEntries() } })
  }

  const reset = () => {
    if (confirm('Erase all accounts and entries and restore the default chart of accounts? Export first if you want a backup.'))
      dispatch({ type: 'replace', data: emptyLedger() })
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 items-center justify-center rounded-lg bg-indigo-600 px-1.5 font-mono text-[11px] font-bold text-white">Dr|Cr</div>
            <div>
              <h1 className="text-sm font-semibold leading-tight">Personal Ledger</h1>
              <p className="text-xs leading-tight text-slate-500">Double-entry bookkeeping</p>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                  tab === t.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="primary" onClick={() => setEditing('new')}>
              + Journal entry
            </Button>
            <div className="relative">
              <Button onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen}>
                Data ▾
              </Button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0" onClick={() => setMenuOpen(false)} />
                  <div
                    className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg"
                    onClick={() => setMenuOpen(false)}
                  >
                    <MenuItem onClick={loadSample}>Load sample data</MenuItem>
                    <MenuItem onClick={exportData}>Export to JSON</MenuItem>
                    <MenuItem onClick={() => fileInput.current?.click()}>Import from JSON…</MenuItem>
                    <div className="my-1 border-t border-slate-100" />
                    <label className="flex items-center justify-between px-3 py-1.5 text-slate-700" onClick={(e) => e.stopPropagation()}>
                      Currency
                      <select
                        className="rounded border border-slate-300 px-1 py-0.5 text-sm"
                        value={data.currency}
                        onChange={(e) => dispatch({ type: 'setCurrency', currency: e.target.value })}
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    <div className="my-1 border-t border-slate-100" />
                    <MenuItem onClick={reset} danger>
                      Reset everything
                    </MenuItem>
                  </div>
                </>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void importData(f)
                  e.target.value = ''
                }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === 'accounts' && <ChartOfAccounts data={data} dispatch={dispatch} onOpenLedger={openLedger} />}
        {tab === 'journal' && (
          <Journal data={data} onEdit={setEditing} onNew={() => setEditing('new')} onOpenLedger={openLedger} />
        )}
        {tab === 'ledger' && (
          <AccountLedger data={data} accountId={ledgerAccountId} onSelect={setLedgerAccountId} onEditEntry={setEditing} />
        )}
        {tab === 'reports' && <Reports data={data} onOpenLedger={openLedger} />}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-slate-400">
        Data is stored only in this browser. Use Data → Export to back it up.
      </footer>

      {editing && (
        <JournalEntryForm
          entry={editing === 'new' ? undefined : editing}
          accounts={data.accounts}
          currency={data.currency}
          onClose={() => setEditing(null)}
          onSave={(entry) => {
            dispatch({ type: 'saveEntry', entry })
            setEditing(null)
          }}
          onDelete={
            editing === 'new'
              ? undefined
              : () => {
                  dispatch({ type: 'deleteEntry', id: editing.id })
                  setEditing(null)
                }
          }
        />
      )}
    </div>
  )
}

function MenuItem({ children, onClick, danger }: { children: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-3 py-1.5 text-left hover:bg-slate-50 ${danger ? 'text-rose-600' : 'text-slate-700'}`}
    >
      {children}
    </button>
  )
}
