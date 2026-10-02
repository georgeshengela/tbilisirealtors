/**
 * Small building blocks shared by the sign-in pages and the member account area.
 * Light surfaces, navy primary actions and the brand blue for focus and links —
 * the same language as the header and listing cards.
 */

import {
  createContext, useCallback, useContext, useEffect, useId, useRef, useState,
  type InputHTMLAttributes, type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, X, type LucideIcon } from 'lucide-react';
import { personInitials } from '../../lib/personInitials';

export const card = 'bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)]';

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white font-bold text-sm ' +
  'px-5 h-11 hover:bg-slate-800 active:scale-[0.99] transition disabled:opacity-60 disabled:pointer-events-none';

export const btnBlue =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white font-bold text-sm ' +
  'px-5 h-11 hover:bg-blue-700 active:scale-[0.99] transition disabled:opacity-60 disabled:pointer-events-none';

export const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-700 ' +
  'font-bold text-sm px-4 h-11 hover:border-slate-300 hover:bg-slate-50 transition disabled:opacity-60 disabled:pointer-events-none';

export const btnDanger =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 text-white font-bold text-sm ' +
  'px-5 h-11 hover:bg-red-700 transition disabled:opacity-60 disabled:pointer-events-none';

export const iconBtn =
  'w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 ' +
  'hover:text-slate-900 hover:border-slate-300 transition';

const inputBase =
  'w-full h-12 rounded-xl border bg-white px-4 text-[15px] text-slate-900 placeholder-slate-400 ' +
  'outline-none transition focus:ring-4';

export function inputCls(invalid?: boolean) {
  return `${inputBase} ${invalid
    ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
    : 'border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:ring-blue-100'}`;
}

/* ── Avatar ─────────────────────────────────────────────────────────────── */

export function Avatar({ name, src, size = 44, className = '' }: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 bg-blue-600 text-white font-bold select-none ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {src && !broken
        ? <img src={src} alt="" className="w-full h-full object-cover" onError={() => setBroken(true)} />
        : personInitials(name)}
    </span>
  );
}

/* ── Form fields ────────────────────────────────────────────────────────── */

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: ReactNode;
  icon?: LucideIcon;
  trailing?: ReactNode;
}

export function Field({ label, error, hint, icon: Icon, trailing, className = '', id, ...input }: FieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="block text-[13px] font-bold text-slate-700 mb-1.5">{label}</label>
      <div className="relative">
        {Icon && <Icon size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />}
        <input
          id={fieldId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${fieldId}-err` : undefined}
          {...input}
          className={`${inputCls(Boolean(error))} ${Icon ? 'pl-11' : ''} ${trailing ? 'pr-12' : ''}`}
        />
        {trailing && <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
      {error
        ? <p id={`${fieldId}-err`} className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>
        : hint ? <div className="mt-1.5 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

export function PasswordField(props: Omit<FieldProps, 'type' | 'trailing'> & { showLabel: string; hideLabel: string }) {
  const { showLabel, hideLabel, ...rest } = props;
  const [visible, setVisible] = useState(false);
  return (
    <Field
      {...rest}
      type={visible ? 'text' : 'password'}
      trailing={(
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? hideLabel : showLabel}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      )}
    />
  );
}

/** 0–4, rough but honest: length plus character variety. */
export function passwordScore(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-zა-ჰ]/i.test(password) && /\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9ა-ჰ]/.test(password) || (/[a-z]/.test(password) && /[A-Z]/.test(password))) score += 1;
  return Math.min(4, password.length < 8 ? Math.min(score, 1) : score);
}

const STRENGTH_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];

export function PasswordStrength({ password, labels }: { password: string; labels: string[] }) {
  if (!password) return null;
  const score = passwordScore(password);
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map(i => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors"
            style={{ background: i < Math.max(score, 1) ? STRENGTH_COLORS[score] : '#e2e8f0' }}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs font-semibold" style={{ color: STRENGTH_COLORS[score] }}>{labels[score]}</p>
    </div>
  );
}

/* ── Feedback ───────────────────────────────────────────────────────────── */

export function Alert({ tone, title, children }: {
  tone: 'error' | 'success' | 'info' | 'warning';
  title?: ReactNode;
  children?: ReactNode;
}) {
  const styles = {
    error: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    info: 'bg-blue-50 border-blue-200 text-blue-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
  }[tone];
  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-3 px-4 py-3 rounded-xl border text-sm ${styles}`}>
      <Icon size={18} className="mt-px flex-shrink-0" />
      <div className="min-w-0">
        {title && <p className="font-bold">{title}</p>}
        {children && <div className={title ? 'mt-0.5 opacity-90' : 'font-semibold'}>{children}</div>}
      </div>
    </div>
  );
}

type Toast = { id: number; text: string; tone: 'success' | 'error' };
const ToastContext = createContext<(text: string, tone?: Toast['tone']) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const push = useCallback((text: string, tone: Toast['tone'] = 'success') => {
    const id = ++seq.current;
    setToasts(list => [...list, { id, text, tone }]);
    window.setTimeout(() => setToasts(list => list.filter(item => item.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      {createPortal(
        <div className="fixed z-[200] bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none w-[calc(100%-32px)] max-w-sm">
          <AnimatePresence>
            {toasts.map(toast => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                className="pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold shadow-xl w-full"
              >
                {toast.tone === 'success'
                  ? <CheckCircle2 size={17} className="text-emerald-400 flex-shrink-0" />
                  : <AlertCircle size={17} className="text-red-400 flex-shrink-0" />}
                {toast.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/* ── Modal ──────────────────────────────────────────────────────────────── */

export function Modal({ open, onClose, title, children, closeLabel = 'Close', width = 440 }: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  closeLabel?: string;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button type="button" aria-label={closeLabel} onClick={onClose} className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] cursor-default" />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative w-full bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto"
            style={{ maxWidth: width }}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-6">
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
              <button type="button" onClick={onClose} aria-label={closeLabel} className="-mr-2 -mt-1 w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 pb-6 pt-3">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ── Layout bits ────────────────────────────────────────────────────────── */

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: {
  icon: LucideIcon;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className={`${card} px-6 py-14 text-center`}>
      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-5">
        <Icon size={26} className="text-blue-600" />
      </div>
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">{text}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-20 text-slate-400 ${className}`}>
      <Loader2 size={24} className="animate-spin" />
    </div>
  );
}
