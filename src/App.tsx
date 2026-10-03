import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AccountLedger } from './components/AccountLedger'
import { ChartOfAccounts } from './components/ChartOfAccounts'
import { Journal } from './components/Journal'
import { JournalEntryForm } from './components/JournalEntryForm'
import { Reports } from './components/Reports'
import { Guide } from './components/Guide'
import { ThemeSwitch } from './components/ThemeSwitch'
import { Button, ConfirmDialog, inputClass, Modal } from './components/ui'
import { emptyLedger, sampleEntries } from './lib/defaultChart'
import { useStoragePersistence } from './lib/persist'
import { saveTextFile } from './lib/saveFile'
import { isLedgerData, migrate, today, useLedger } from './lib/store'
import type { JournalEntry, LedgerData } from './lib/types'

type Tab = 'accounts' | 'journal' | 'ledger' | 'reports'

const TABS: { id: Tab; label: string }[] = [
  { id: 'accounts', label: 'Chart of accounts' },
  { id: 'journal', label: 'Journal' },
  { id: 'ledger', label: 'General ledger' },
  { id: 'reports', label: 'Reports' },
]

type Dialog =
  | { kind: 'import'; data: LedgerData; fileName: string }
  | { kind: 'importError'; fileName: string }
  | { kind: 'sample' }
  | { kind: 'reset' }
  | { kind: 'export' }
  | { kind: 'guide' }

const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'AUD', 'JPY', 'CHF', 'INR', 'NZD', 'SGD']

export default function App() {
  const [data, dispatch] = useLedger()
  const storage = useStoragePersistence(!data.sample && data.entries.length > 0)
  const [tab, setTab] = useState<Tab>('accounts')
  const [ledgerAccountId, setLedgerAccountId] = useState('')
  const [editing, setEditing] = useState<JournalEntry | 'new' | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const [dialog, setDialogState] = useState<Dialog | null>(null)
  const [notice, setNotice] = useState('')
  const setDialog = (d: Dialog | null) => {
    setNotice('')
    setDialogState(d)
  }

  const openLedger = (id: string) => {
    setLedgerAccountId(id)
    setTab('ledger')
  }

  const download = async () => {
    const outcome = await saveTextFile(`ledger-${today()}.json`, JSON.stringify(data, null, 2))
    setNotice(
      outcome === 'saved'
        ? 'Backup file saved.'
        : outcome === 'declined'
          ? 'Download cancelled.'
          : "Download isn't available here. Use Copy JSON instead.",
    )
  }

  const importData = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!isLedgerData(parsed)) throw new Error('not a ledger file')
      setDialog({ kind: 'import', data: migrate(parsed), fileName: file.name })
    } catch {
      setDialog({ kind: 'importError', fileName: file.name })
    }
  }

  const startOwn = () => dispatch({ type: 'replace', data: { ...data, entries: [], sample: false } })

  return (
    <div className="min-h-screen">
      <header style={{ top: 'env(safe-area-inset-top, 0px)' }} className="z-10 border-b sm:sticky border-slate-200 bg-surface/90 backdrop-blur">
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
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <ThemeSwitch />
            <Button variant="ghost" onClick={() => setDialog({ kind: 'guide' })}>
              How it works
            </Button>
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
                    className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-surface py-1 text-sm shadow-lg"
                    onClick={() => setMenuOpen(false)}
                  >
                    <MenuItem onClick={() => setDialog({ kind: 'sample' })}>Load sample data</MenuItem>
                    <MenuItem onClick={() => setDialog({ kind: 'export' })}>Export backup…</MenuItem>
                    <MenuItem onClick={() => fileInput.current?.click()}>Import backup…</MenuItem>
                    <div className="my-1 border-t border-slate-100" />
                    <label className="flex items-center justify-between px-3 py-1.5 text-slate-700" onClick={(e) => e.stopPropagation()}>
                      Currency
                      <select
                        className="rounded border border-slate-300 bg-surface px-1 py-0.5 text-sm text-slate-900"
                        value={data.currency}
                        onChange={(e) => dispatch({ type: 'setCurrency', currency: e.target.value })}
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    <div className="my-1 border-t border-slate-100" />
                    <MenuItem onClick={() => setDialog({ kind: 'reset' })} danger>
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

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {data.sample && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="min-w-0 flex-[1_1_20rem]">
              <b>You're viewing sample data.</b> Explore the accounts, journal and reports, then clear the examples to start
              your own books. Your chart of accounts stays.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setDialog({ kind: 'guide' })}>
                How it works
              </Button>
              <Button size="sm" variant="primary" onClick={startOwn}>
                Clear sample, start my ledger
              </Button>
            </div>
          </div>
        )}
        {tab === 'accounts' && <ChartOfAccounts data={data} dispatch={dispatch} onOpenLedger={openLedger} />}
        {tab === 'journal' && (
          <Journal data={data} onEdit={setEditing} onNew={() => setEditing('new')} onOpenLedger={openLedger} />
        )}
        {tab === 'ledger' && (
          <AccountLedger data={data} accountId={ledgerAccountId} onSelect={setLedgerAccountId} onEditEntry={setEditing} />
        )}
        {tab === 'reports' && <Reports data={data} onOpenLedger={openLedger} />}
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap gap-x-3 gap-y-1 px-4 pb-8 text-xs text-slate-400">
        <span>🔒 Your ledger is stored only on this device. Nothing is sent anywhere.</span>
        <span>
          {storage === 'persistent'
            ? 'Storage is permanent: the browser won’t clear it to save space.'
            : storage === 'best-effort'
              ? 'The browser may clear storage if space runs low, so export backups regularly.'
              : ''}{' '}
          Use Data → Export backup to keep a copy.
        </span>
      </footer>

      {dialog?.kind === 'guide' && <Guide onClose={() => setDialog(null)} />}
      {dialog?.kind === 'export' && (
        <Modal title="Export backup" onClose={() => setDialog(null)} wide>
          <div className="space-y-3 text-sm">
            <p className="text-slate-600">
              Your ledger as JSON ({data.accounts.length} accounts, {data.entries.length} entries). Copy it into a file named
              something like <code className="font-mono">ledger-{today()}.json</code>, or download it directly.
            </p>
            <textarea
              id="export-json"
              readOnly
              className={`${inputClass} h-64 font-mono text-xs`}
              value={JSON.stringify(data, null, 2)}
              onFocus={(e) => e.target.select()}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <span className="mr-auto self-center text-xs text-slate-500">{notice}</span>
              <Button onClick={() => void download()}>Download file</Button>
              <Button
                variant="primary"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(
                    () => setNotice('Copied to clipboard.'),
                    () => (document.getElementById('export-json') as HTMLTextAreaElement | null)?.select(),
                  )
                }}
              >
                Copy JSON
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {dialog?.kind === 'import' && (
        <ConfirmDialog
          title="Import backup"
          confirmLabel="Replace my data"
          danger
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            dispatch({ type: 'replace', data: dialog.data })
            setDialog(null)
          }}
        >
          <p>
            <b>{dialog.fileName}</b> contains {dialog.data.accounts.length} accounts and {dialog.data.entries.length} journal
            entries.
          </p>
          <p>Importing replaces everything currently in this ledger.</p>
        </ConfirmDialog>
      )}
      {dialog?.kind === 'importError' && (
        <Modal title="Can't import this file" onClose={() => setDialog(null)}>
          <div className="space-y-4 text-sm text-slate-700">
            <p>
              <b>{dialog.fileName}</b> isn't a ledger backup. Choose a JSON file created with <b>Data → Export backup</b>.
            </p>
            <div className="flex justify-end">
              <Button onClick={() => setDialog(null)}>OK</Button>
            </div>
          </div>
        </Modal>
      )}
      {dialog?.kind === 'sample' && (
        <ConfirmDialog
          title="Load sample data"
          confirmLabel="Load sample data"
          danger={data.entries.length > 0 && !data.sample}
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            dispatch({ type: 'replace', data: { ...data, entries: sampleEntries(), sample: true } })
            setDialog(null)
          }}
        >
          <p>Adds three months of example transactions: salary, rent, food shopping, a car loan and more.</p>
          {data.entries.length > 0 && !data.sample && (
            <p className="font-medium text-rose-700">
              This replaces your {data.entries.length} journal entries. Export a backup first if you want to keep them.
            </p>
          )}
        </ConfirmDialog>
      )}
      {dialog?.kind === 'reset' && (
        <ConfirmDialog
          title="Reset everything"
          confirmLabel="Erase and reset"
          danger
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            dispatch({ type: 'replace', data: emptyLedger() })
            setDialog(null)
          }}
        >
          <p>Erases all journal entries and restores the default chart of accounts. Custom accounts are removed.</p>
          <p>This can't be undone. Export a backup first if you might need this data.</p>
        </ConfirmDialog>
      )}

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
