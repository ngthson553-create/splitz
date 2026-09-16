import clsx from 'clsx'
import {
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  forwardRef,
} from 'react'
import { initials } from '../lib/format'

// ── Button ──
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const BTN_BASE =
  'press inline-flex items-center justify-center gap-2 font-semibold rounded-2xl select-none disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60'
const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary: 'gradient-brand text-white shadow-glow hover:brightness-110',
  secondary:
    'bg-[var(--surface-solid)] text-app border border-[var(--border-strong)] hover:border-brand-400/40 shadow-soft',
  ghost: 'text-muted hover:text-app hover:bg-[var(--surface-2)]',
  danger: 'bg-neg text-white hover:brightness-110 shadow-soft',
}
const BTN_SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm rounded-xl',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-[15px]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}) {
  return (
    <button
      className={clsx(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {children}
    </button>
  )
}

// ── Icon button ──
export function IconButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        'press grid place-items-center h-10 w-10 rounded-xl text-muted',
        'bg-[var(--surface-solid)] border border-[var(--border)] shadow-soft hover:text-app',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// ── Card ──
export function Card({
  className,
  interactive,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={clsx('card min-w-0 p-4', interactive && 'hover-lift press cursor-pointer', className)}
      {...props}
    >
      {children}
    </div>
  )
}

// ── Input ──
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={clsx(
          'w-full h-11 px-3.5 rounded-xl text-app placeholder:text-faint surface-sunken',
          'border border-[var(--border)] focus:border-brand-400 focus:ring-2 focus:ring-brand-400/30',
          'outline-none transition tnum',
          className,
        )}
        {...props}
      />
    )
  },
)

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      {children}
      {hint && <span className="block text-xs text-faint">{hint}</span>}
    </label>
  )
}

// ── Avatar ──
const AVATAR_GRAD: Record<string, string> = {
  violet: 'from-violet-400 to-indigo-500',
  indigo: 'from-indigo-400 to-blue-600',
  sky: 'from-sky-400 to-blue-500',
  emerald: 'from-emerald-400 to-teal-500',
  amber: 'from-amber-400 to-orange-500',
  rose: 'from-rose-400 to-pink-500',
  fuchsia: 'from-fuchsia-400 to-purple-500',
  teal: 'from-teal-400 to-cyan-500',
  orange: 'from-orange-400 to-red-500',
  cyan: 'from-cyan-400 to-sky-500',
}

export function Avatar({
  name,
  color = 'sky',
  size = 'md',
  ring = true,
  src,
  className,
}: {
  name: string
  color?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  ring?: boolean
  /** Ảnh đại diện (data URL hoặc URL từ Google/Zalo). Có thì hiển thị ảnh, không thì dùng chữ cái. */
  src?: string | null
  className?: string
}) {
  const dims =
    size === 'xs'
      ? 'h-6 w-6 text-[9px]'
      : size === 'sm'
        ? 'h-7 w-7 text-[10px]'
        : size === 'lg'
          ? 'h-12 w-12 text-base'
          : 'h-9 w-9 text-xs'
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={clsx(
          'rounded-full object-cover shrink-0 bg-[var(--surface-sunken)]',
          ring && 'ring-2 ring-[var(--surface-solid)]',
          'shadow-soft',
          dims,
          className,
        )}
      />
    )
  }
  return (
    <span
      className={clsx(
        'grid place-items-center rounded-full bg-gradient-to-br text-white font-bold shrink-0',
        ring && 'ring-2 ring-[var(--surface-solid)]',
        'shadow-soft',
        AVATAR_GRAD[color] ?? AVATAR_GRAD.sky,
        dims,
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}

// ── Badge / Pill ──
export function Badge({
  children,
  tone = 'brand',
  className,
}: {
  children: ReactNode
  tone?: 'brand' | 'pos' | 'neg' | 'muted'
  className?: string
}) {
  const tones = {
    brand: 'bg-brand-500/12 text-brand-600 dark:text-brand-300',
    pos: 'text-pos bg-pos/12',
    neg: 'text-neg bg-neg/12',
    muted: 'text-muted bg-[var(--surface-2)]',
  }
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

// ── Empty state ──
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      <div className="grid place-items-center h-16 w-16 rounded-2xl gradient-brand-soft text-white shadow-glow mb-4 animate-float">
        {icon}
      </div>
      <h3 className="font-bold text-app">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-muted max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ── Segmented control ──
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={clsx('no-scrollbar flex overflow-x-auto p-1 rounded-xl surface-sunken border border-[var(--border)]', className)}>
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={clsx(
              'press inline-flex h-8 min-w-fit flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[13px] font-semibold transition',
              active ? 'gradient-brand text-white shadow-soft' : 'text-muted hover:text-app',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
