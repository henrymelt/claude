import { Modal } from './ui'

const RULES: [type: string, normal: string, increase: string, decrease: string][] = [
  ['Assets (1xxx)', 'Debit', 'Debit', 'Credit'],
  ['Liabilities (2xxx)', 'Credit', 'Credit', 'Debit'],
  ['Equity (3xxx)', 'Credit', 'Credit', 'Debit'],
  ['Income (4xxx)', 'Credit', 'Credit', 'Debit'],
  ['Expenses (5xxx)', 'Debit', 'Debit', 'Credit'],
]

const EXAMPLES: [what: string, debit: string, credit: string][] = [
  ['Salary paid into your current account', '1110 Current Account', '4100 Salary & Wages'],
  ['Groceries on the credit card', '5210 Groceries', '2110 Credit Card'],
  ['Rent paid from your current account', '5110 Rent', '1110 Current Account'],
  ['Pay off the credit card', '2110 Credit Card', '1110 Current Account'],
  ['Move money to savings', '1120 Savings Account', '1110 Current Account'],
  ['Loan repayment (capital + interest)', '2220 Car Loan + 5800 Interest', '1110 Current Account'],
]

const STEPS: [title: string, body: string][] = [
  [
    'Review the chart of accounts',
    'It lists every account your money lives in (assets, liabilities) and every category it flows through (income, expenses). Use “+ Sub” on a group to add your own accounts, such as each real bank account or card.',
  ],
  [
    'Record your starting position',
    'Post one “Opening balances” entry: debit each asset with what it holds today, credit each debt with what you owe, and put the difference on 3100 Opening Balances (usually a credit). That difference is your starting net worth.',
  ],
  [
    'Record each transaction as a journal entry',
    'Click “+ Journal entry”. Every entry needs at least two lines, and total debits must equal total credits. Use more lines to split a payment, such as a salary payment with tax deducted. If the totals are off, the form offers to add the balancing amount for you.',
  ],
  [
    'Check an account',
    'Click any account name to open its general ledger. It lists every posting with a running balance, so you can reconcile it against your bank statement.',
  ],
  [
    'Read the reports',
    'The trial balance shows that debits equal credits. The balance sheet shows what you own, what you owe and your net worth. The income & expenditure report sets income against spending for a period and shows your surplus and savings rate.',
  ],
]

export function Guide({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="How it works" onClose={onClose} wide>
      <div className="space-y-6 text-sm text-slate-700">
        <p>
          Every transaction moves money <i>from</i> one account <i>to</i> another, so it's recorded twice: a{' '}
          <b>debit</b> to one account and an equal <b>credit</b> to another. Because the two sides always match, the
          books satisfy <b>Assets = Liabilities + Equity</b>, and a mistake shows up as an imbalance.
        </p>

        <ol className="space-y-3">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{title}</p>
                <p className="mt-0.5">{body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="min-w-0">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Debit and credit rules</h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-3 py-1.5">Account type</th>
                    <th className="px-3 py-1.5">Normal</th>
                    <th className="px-3 py-1.5">Increase</th>
                    <th className="px-3 py-1.5">Decrease</th>
                  </tr>
                </thead>
                <tbody>
                  {RULES.map(([type, normal, inc, dec]) => (
                    <tr key={type} className="border-t border-slate-100">
                      <td className="px-3 py-1.5 font-medium">{type}</td>
                      <td className="px-3 py-1.5">{normal}</td>
                      <td className="px-3 py-1.5">{inc}</td>
                      <td className="px-3 py-1.5">{dec}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Common entries</h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-3 py-1.5">Transaction</th>
                    <th className="px-3 py-1.5">Debit</th>
                    <th className="px-3 py-1.5">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {EXAMPLES.map(([what, dr, cr]) => (
                    <tr key={what} className="border-t border-slate-100">
                      <td className="px-3 py-1.5">{what}</td>
                      <td className="px-3 py-1.5 font-mono">{dr}</td>
                      <td className="px-3 py-1.5 font-mono">{cr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Your ledger is saved in this browser only. It isn't synced to other devices, and clearing site data erases it.
          Use Data → Export backup to keep a copy.
        </p>
      </div>
    </Modal>
  )
}
