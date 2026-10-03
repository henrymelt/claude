import { useThemePref } from '../lib/theme'
import type { ThemePref } from '../lib/theme'

const OPTIONS: { value: ThemePref; icon: string; label: string; title: string }[] = [
  { value: 'light', icon: '☀', label: 'Light', title: 'Light mode' },
  { value: 'dark', icon: '☾', label: 'Dark', title: 'Dark mode' },
  { value: 'system', icon: '◐', label: 'Auto', title: 'Match the Claude app or your device' },
]

export function ThemeSwitch() {
  const [pref, setPref] = useThemePref()
  return (
    <div role="radiogroup" aria-label="Appearance" className="flex rounded-md bg-slate-100 p-0.5 text-xs font-medium">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={pref === o.value}
          title={o.title}
          onClick={() => setPref(o.value)}
          className={`flex items-center gap-1 rounded px-2 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-indigo-600 ${
            pref === o.value ? 'bg-surface text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <span aria-hidden="true">{o.icon}</span>
          {o.label}
        </button>
      ))}
    </div>
  )
}
