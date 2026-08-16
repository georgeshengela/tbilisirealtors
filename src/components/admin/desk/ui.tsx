/** Small presentational pieces shared by every manager-desk board. */
import type { ReactNode } from 'react';
import { Image as ImageIcon, Loader2, X } from 'lucide-react';
import { roleColor, roleLabel } from '../../../lib/permissions';

export const GEL = (value: number | string | null | undefined): string =>
  value === null || value === undefined || value === ''
    ? '—'
    : `${Number(value).toLocaleString('ka-GE')} ₾`;

export const inputCls =
  'w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:border-blue-400 transition-colors';
export const selectCls =
  'w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:border-blue-400 transition-colors';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

export function Avatar({
  name,
  photo,
  size = 36,
}: {
  name: string;
  photo?: string | null;
  size?: number;
}) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        width={size}
        height={size}
        className="rounded-xl object-cover flex-shrink-0 bg-slate-100"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-xl bg-slate-800 text-white flex items-center justify-center flex-shrink-0 font-bold"
      style={{ width: size, height: size, fontSize: Math.round(size / 2.8) }}
    >
      {initials(name) || '?'}
    </div>
  );
}

export function Thumb({ src, size = 44 }: { src?: string | null; size?: number }) {
  if (!src) {
    return (
      <div
        className="rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <ImageIcon size={size / 3} className="text-slate-300" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      className="rounded-lg object-cover flex-shrink-0 bg-slate-100"
      style={{ width: size, height: size }}
    />
  );
}

export function Chip({
  label,
  bg,
  text,
  icon,
  title,
}: {
  label: string;
  bg: string;
  text: string;
  icon?: ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap"
      style={{ background: bg, color: text }}
    >
      {icon}
      {label}
    </span>
  );
}

export function RoleChip({ role }: { role: string }) {
  const color = roleColor(role);
  return <Chip label={roleLabel(role)} bg={color.bg} text={color.text} />;
}

export function StatTile({
  label,
  value,
  hint,
  tone = 'slate',
  icon,
  onClick,
  active,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: 'slate' | 'blue' | 'amber' | 'red' | 'green';
  icon?: ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  const tones: Record<string, { bg: string; text: string; ring: string }> = {
    slate: { bg: 'bg-slate-50', text: 'text-slate-700', ring: 'ring-slate-300' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-400' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-400' },
    red: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-400' },
    green: { bg: 'bg-green-50', text: 'text-green-700', ring: 'ring-green-400' },
  };
  const tint = tones[tone] ?? tones.slate;
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      onClick={onClick}
      className={`text-left w-full rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm transition-all ${
        onClick ? 'hover:shadow-md hover:-translate-y-0.5' : ''
      } ${active ? `ring-2 ${tint.ring}` : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        {icon && <span className={`${tint.bg} ${tint.text} rounded-lg p-1.5`}>{icon}</span>}
      </div>
      <p className={`mt-1.5 text-2xl font-extrabold ${tint.text}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
    </Tag>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3 text-slate-400">
        {icon}
      </div>
      <p className="text-sm font-bold text-slate-700">{title}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-sm">
      <Loader2 size={18} className="animate-spin" />
      {label ?? 'იტვირთება…'}
    </div>
  );
}

export function DeskModal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  width = 'max-w-3xl',
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${width} max-h-[92vh] flex flex-col`}>
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-800 truncate">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && <div className="border-t border-slate-100 px-6 py-4 bg-slate-50/60 rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}