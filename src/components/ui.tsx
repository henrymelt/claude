import { useEffect, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { AccountType } from '../lib/types'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm disabled:bg-indigo-300',
  secondary: 'bg-surface text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 shadow-sm',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-surface text-rose-600 ring-1 ring-inset ring-rose-200 hover:bg-rose-50',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors disabled:cursor-not-allowed ${sz} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-surface shadow-sm ${className}`}>{children}</div>
}

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`m-auto w-[calc(100%-2rem)] ${wide ? 'max-w-4xl' : 'max-w-lg'} rounded-xl bg-surface p-0 text-slate-900 shadow-2xl backdrop:bg-black/50`}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
          ✕
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'block w-full rounded-md border-0 bg-surface px-2.5 py-1.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500'

const TYPE_STYLES: Record<AccountType, string> = {
  asset: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  liability: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  equity: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  income: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  expense: 'bg-amber-50 text-amber-800 ring-amber-600/20',
}

export function TypeBadge({ type }: { type: AccountType }) {
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${TYPE_STYLES[type]}`}>
      {type}
    </span>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {children && <div className="mt-2 text-sm text-slate-500">{children}</div>}
    </div>
  )
}

/** Two-step button: the first click arms it, the second click within a few seconds performs the action. */
export function ConfirmButton({
  children,
  confirmLabel = 'Click again to confirm',
  onConfirm,
  ...props
}: Omit<Parameters<typeof Button>[0], 'onClick'> & { confirmLabel?: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <Button
      {...props}
      className={`${props.className ?? ''} ${armed ? '!bg-rose-600 !text-white !ring-rose-600' : ''}`}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
    >
      {armed ? confirmLabel : children}
    </Button>
  )
}

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string
  children: ReactNode
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="space-y-5 text-sm text-slate-700">
        <div className="space-y-2">{children}</div>
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} className={danger ? '!bg-rose-600 !text-white' : ''} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
