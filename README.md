# Personal Ledger

A personal finance tracker built on **double-entry bookkeeping**. Every transaction is a balanced journal entry: total debits equal total credits, so the books always satisfy *Assets = Liabilities + Equity*.

## Features

- **Chart of accounts**: a hierarchical tree of Assets (1xxx), Liabilities (2xxx), Equity (3xxx), Income (4xxx) and Expenses (5xxx) with rolled-up balances, normal-balance indicators, search, type filters, sub-accounts, archiving and deletion of unused accounts.
- **Journal**: multi-line (split) entries with live debit/credit totals, a one-click "balance" helper and strict validation. The list uses the traditional journal layout, with credits indented under debits.
- **General ledger**: per-account (or per-group) postings with a running balance, counter-accounts, a date-range opening balance and a T-account summary.
- **Reports**: trial balance, balance sheet (with unclosed net income) and income statement (with savings rate), all for any date or period.
- **Data**: stored in the browser's `localStorage`. JSON export/import, sample data, currency selection.

Amounts are stored as integer cents, so there is no floating-point drift.

## Development

```sh
npm install
npm run dev     # http://localhost:5173
npm test        # ledger logic unit tests (Vitest)
npm run lint
npm run build
```

Stack: React 19, TypeScript, Vite, Tailwind CSS v4.

## Layout

- `src/lib/`: framework-free accounting core (`ledger.ts`), money parsing and formatting, the default chart and sample data, and the persisted store
- `src/components/`: the chart of accounts, journal, entry form, ledger and report views
