/** Parse a user-typed amount ("1,234.5", "$12") into integer cents. Returns null if invalid. */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[,\s$€£]/g, '')
  if (cleaned === '') return 0
  if (!/^\d*(\.\d{0,2})?$/.test(cleaned) || cleaned === '.') return null
  const [whole, frac = ''] = cleaned.split('.')
  return Number(whole || '0') * 100 + Number(frac.padEnd(2, '0'))
}

/** Plain decimal string for an input field, e.g. 123456 -> "1234.56"; 0 -> "". */
export function centsToInput(cents: number): string {
  if (!cents) return ''
  return (cents / 100).toFixed(2)
}

const formatters = new Map<string, Intl.NumberFormat>()

export function formatMoney(cents: number, currency = 'CAD'): string {
  let f = formatters.get(currency)
  if (!f) {
    f = new Intl.NumberFormat('en-GB', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
    formatters.set(currency, f)
  }
  return f.format(cents / 100)
}

/** Accounting style: negatives in parentheses, zero as an en dash. */
export function formatAccounting(cents: number, currency = 'CAD'): string {
  if (cents === 0) return '–'
  const s = formatMoney(Math.abs(cents), currency)
  return cents < 0 ? `(${s})` : s
}
