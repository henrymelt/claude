# Personal Ledger

A personal finance tracker built on **double-entry bookkeeping**. Every transaction is a balanced journal entry: total debits equal total credits, so the books always satisfy *Assets = Liabilities + Equity*.

## Features

- **Chart of accounts**: a hierarchical tree of 5-digit GL codes: Assets (1xxxx), Liabilities (2xxxx), Equity (3xxxx), Income (4xxxx) and Expenses (5xxxx) with rolled-up balances, normal-balance indicators, search, type filters, sub-accounts, archiving and deletion of unused accounts.
- **Journal**: multi-line (split) entries with live debit/credit totals, a one-click "balance" helper and strict validation. The list uses the traditional journal layout, with credits indented under debits.
- **General ledger**: per-account (or per-group) postings with a running balance, counter-accounts, a date-range opening balance and a T-account summary.
- **Reports**: trial balance, balance sheet (with unclosed net income) and income & expenditure (with surplus and savings rate), all for any date or period.
- **Local-first**: an installable web app that runs offline. Your ledger is stored only in the browser on your device (`localStorage`, with persistent storage requested); nothing is sent to any server, and fonts are bundled so the app makes no outside requests. JSON export/import for backups and moving between devices.
- **British English** throughout: account names (current account, pension, car loan), sample entries and date formats.
- **How it works**: a built-in guide with the debit/credit rules and common example entries.

Amounts are stored as integer cents, so there is no floating-point drift.

## Install

The app is published to GitHub Pages by `.github/workflows/pages.yml` on every push to `master`:
**https://henrymelt.github.io/claude/**

- **Mac (Safari, macOS Sonoma or later):** open the link, then **File → Add to Dock**.
- **Mac or Windows (Chrome / Edge):** open the link, then click the install icon in the address bar.
- **iPhone / iPad (Safari):** Share → **Add to Home Screen**.

After the first visit it works with no internet connection. Each browser or installed app keeps its own ledger; use **Data → Export backup / Import backup** to move it.

One-time setup for the repository owner: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Development

```sh
npm install
npm run dev     # http://localhost:5173
npm test        # ledger logic unit tests (Vitest)
npm run lint
npm run build
npm run build:single   # one self-contained HTML file in dist-single/
```

Stack: React 19, TypeScript, Vite, Tailwind CSS v4.

## Layout

- `src/lib/`: framework-free accounting core (`ledger.ts`), money parsing and formatting, the default chart and sample data, and the persisted store
- `src/components/`: the chart of accounts, journal, entry form, ledger and report views
