import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, CheckCircle2, Loader2, X } from 'lucide-react';
import { submitLead } from '../lib/leads';
import { useTranslation } from '../i18n/LocaleContext';

interface Props {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  propertyTitle: string;
}

/** Half-hour slots across a normal working day. */
const SLOTS = [
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00',
];

const inputClass =
  'w-full rounded-xl border px-4 py-3 text-sm text-slate-800 transition-colors focus:border-blue-600 focus:outline-none placeholder-slate-400';
const inputStyle = { background: '#f7f9fb', borderColor: '#e0e3e5' };

/** Next seven days, so the visitor picks a real slot instead of typing free text. */
function upcomingDays(): { value: string; label: string; weekday: string }[] {
  const formatter = new Intl.DateTimeFormat('ka-GE', { day: 'numeric', month: 'short' });
  const weekdayFormatter = new Intl.DateTimeFormat('ka-GE', { weekday: 'short' });

  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset + 1);
    return {
      value: date.toISOString().slice(0, 10),
      label: formatter.format(date),
      weekday: weekdayFormatter.format(date),
    };
  });
}

export default function BookViewingModal({ open, onClose, propertyId, propertyTitle }: Props) {
  const { t } = useTranslation();
  const days = useMemo(upcomingDays, []);

  const [day, setDay] = useState(days[0]?.value ?? '');
  const [slot, setSlot] = useState('12:00');
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDone(false);
    setError(null);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending) return;

    if (!form.phone.trim()) {
      setError(t('property.phoneRequired'));
      return;
    }

    setSending(true);
    setError(null);

    const result = await submitLead({
      kind: 'viewing',
      propertyId,
      name: form.name,
      phone: form.phone,
      message: form.message,
      subject: propertyTitle,
      preferredAt: new Date(`${day}T${slot}:00`).toISOString(),
    });

    setSending(false);

    if (!result.ok) {
      setError(result.error ?? null);
      return;
    }

    setForm({ name: '', phone: '', message: '' });
    setDone(true);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-lg rounded-2xl bg-white overflow-hidden"
            style={{ boxShadow: '0 24px 64px rgba(15,23,42,0.28)' }}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b px-6 py-4" style={{ borderColor: '#eceef0' }}>
              <div>
                <p className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <Calendar size={17} className="text-blue-600" />
                  {t('property.bookViewing')}
                </p>
                <p className="mt-1 text-xs text-slate-500 line-clamp-1">{propertyTitle}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label={t('common.close')}
              >
                <X size={18} />
              </button>
            </div>

            {done ? (
              <div className="px-6 py-12 text-center">
                <div
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ background: 'rgba(16,185,129,0.10)' }}
                >
                  <CheckCircle2 size={34} className="text-emerald-500" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900">{t('property.bookingSent')}</h3>
                <p className="text-sm text-slate-500">{t('property.bookingSentHint')}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-6 rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
                  style={{ background: '#2563eb' }}
                >
                  {t('common.close')}
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4 px-6 py-5">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t('property.pickDay')}
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {days.map(option => {
                      const active = option.value === day;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setDay(option.value)}
                          className="flex min-w-[62px] flex-col items-center rounded-xl border px-3 py-2 transition-all"
                          style={{
                            borderColor: active ? '#2563eb' : '#e0e3e5',
                            background: active ? 'rgba(37,99,235,0.07)' : '#ffffff',
                          }}
                        >
                          <span className="text-[10px] uppercase text-slate-400">{option.weekday}</span>
                          <span
                            className="text-xs font-bold"
                            style={{ color: active ? '#2563eb' : '#1e293b' }}
                          >
                            {option.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t('property.pickTime')}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {SLOTS.map(option => {
                      const active = option === slot;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setSlot(option)}
                          className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all"
                          style={{
                            borderColor: active ? '#2563eb' : '#e0e3e5',
                            background: active ? '#2563eb' : '#ffffff',
                            color: active ? '#ffffff' : '#475569',
                          }}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    className={inputClass}
                    style={inputStyle}
                    placeholder={t('property.fullName')}
                    value={form.name}
                    onChange={event => setForm(f => ({ ...f, name: event.target.value }))}
                  />
                  <input
                    className={inputClass}
                    style={inputStyle}
                    placeholder={`${t('property.phone')} *`}
                    value={form.phone}
                    onChange={event => setForm(f => ({ ...f, phone: event.target.value }))}
                  />
                </div>

                <textarea
                  className={`${inputClass} resize-none`}
                  style={inputStyle}
                  rows={3}
                  placeholder={t('property.bookingNotePlaceholder')}
                  value={form.message}
                  onChange={event => setForm(f => ({ ...f, message: event.target.value }))}
                />

                {error && (
                  <p
                    className="rounded-xl px-4 py-2.5 text-sm"
                    style={{ background: '#fef2f2', color: '#b91c1c' }}
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={sending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white transition-opacity disabled:opacity-60"
                  style={{ background: '#2563eb' }}
                >
                  {sending && <Loader2 size={16} className="animate-spin" />}
                  {sending ? t('property.sending') : t('property.confirmBooking')}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
