import { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Clock, Send, CheckCircle, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { submitLead } from '../lib/leads';
import { CONTACT } from '../data/contactInfo';
import BusinessHours from '../components/BusinessHours';
import ContactAddress from '../components/ContactAddress';
import OfficeMap from '../components/OfficeMap';
import { useTranslation } from '../i18n/LocaleContext';

const cardClass =
  'rounded-2xl border bg-white p-5 transition-shadow duration-300 hover:shadow-md';
const cardStyle = { borderColor: '#e6e8ea', boxShadow: '0 4px 20px rgba(15,23,42,0.04)' };

const inputClass =
  'w-full rounded-xl border px-4 py-3.5 text-sm text-slate-800 transition-all focus:border-blue-600 focus:outline-none placeholder-slate-400';
const inputStyle = { background: '#f7f9fb', borderColor: '#e0e3e5' };

export default function ContactPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;

    setSending(true);
    setError(null);

    const result = await submitLead({
      kind: 'contact',
      name: form.name,
      email: form.email,
      phone: form.phone,
      subject: form.subject,
      message: form.message,
    });

    setSending(false);

    if (!result.ok) {
      setError(result.error ?? null);
      return;
    }

    setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 8000);
  };

  const contactInfo = [
    {
      icon: Phone,
      label: t('common.phone'),
      lines: [CONTACT.mobile, CONTACT.phone],
      accent: '#2563eb',
      bg: 'rgba(37,99,235,0.08)',
    },
    {
      icon: Mail,
      label: t('common.email'),
      values: [CONTACT.email],
      accent: '#10B981',
      bg: 'rgba(16,185,129,0.08)',
    },
    {
      icon: MapPin,
      label: t('common.address'),
      isAddress: true as const,
      accent: '#f59e0b',
      bg: 'rgba(245,158,11,0.10)',
    },
  ];

  return (
    <div className="min-h-screen pt-14 lg:pt-[106px]" style={{ background: '#f7f9fb' }}>
      {/* Hero */}
      <section
        className="relative overflow-hidden border-b"
        style={{ background: '#ffffff', borderColor: '#eceef0' }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(37,99,235,0.08) 0%, transparent 70%)',
          }}
        />
        <div className="container-xl relative py-14 lg:py-16 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <span
              className="inline-block text-xs font-bold uppercase tracking-[0.18em] mb-3"
              style={{ color: '#2563eb' }}
            >
              {t('contact.badge')}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              {t('contact.title')}
            </h1>
            <p className="text-slate-500 text-base lg:text-lg max-w-2xl mx-auto leading-relaxed">
              {t('contact.subtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container-xl py-12 lg:py-16">
        <div className="grid lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Form */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-3xl border bg-white p-6 sm:p-8"
              style={{ borderColor: '#e6e8ea', boxShadow: '0 12px 32px rgba(15,23,42,0.06)' }}
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-1">{t('contact.formTitle')}</h2>
              <p className="text-sm text-slate-500 mb-7">{t('contact.formSubtitle')}</p>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
                    style={{ background: 'rgba(16,185,129,0.10)' }}
                  >
                    <CheckCircle size={40} className="text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">{t('contact.sent')}</h3>
                  <p className="text-slate-500">{t('contact.sentHint')}</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        {t('contact.name')} *
                      </label>
                      <input
                        required
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder={t('contact.namePlaceholder')}
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        {t('contact.email')} *
                      </label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder={t('contact.emailPlaceholder')}
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        {t('contact.phone')}
                      </label>
                      <input
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder={t('contact.phonePlaceholder')}
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        {t('contact.subject')} *
                      </label>
                      <select
                        required
                        value={form.subject}
                        onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                        className={`${inputClass} appearance-none`}
                        style={inputStyle}
                      >
                        <option value="">{t('contact.subjectPlaceholder')}</option>
                        <option value="general">{t('contact.subjects.general')}</option>
                        <option value="listing">{t('contact.subjects.listing')}</option>
                        <option value="valuation">{t('contact.subjects.valuation')}</option>
                        <option value="investment">{t('contact.subjects.investment')}</option>
                        <option value="partnership">{t('contact.subjects.partnership')}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      {t('contact.message')} *
                    </label>
                    <textarea
                      required
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      placeholder={t('contact.messagePlaceholder')}
                      rows={6}
                      className={`${inputClass} resize-none`}
                      style={inputStyle}
                    />
                  </div>

                  <div className="flex items-start gap-3">
                    <input type="checkbox" required className="mt-1 w-4 h-4 text-blue-600 rounded" />
                    <p className="text-sm text-slate-500">{t('contact.consent')}</p>
                  </div>

                  {error && (
                    <div
                      className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm"
                      style={{ borderColor: '#fecaca', background: '#fef2f2', color: '#b91c1c' }}
                    >
                      <AlertCircle size={16} />
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full text-white py-4 rounded-xl font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ background: '#2563eb' }}
                    onMouseEnter={e => { if (!sending) e.currentTarget.style.background = '#1d4ed8'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#2563eb'; }}
                  >
                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    {sending ? t('contact.sending') : t('contact.send')}
                  </button>
                </form>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 order-1 lg:order-2 space-y-4">
            {contactInfo.map((info, i) => (
              <motion.div
                key={info.label}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`${cardClass} flex gap-4`}
                style={cardStyle}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: info.bg, color: info.accent }}
                >
                  <info.icon size={20} strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 mb-1.5">{info.label}</p>
                  {'lines' in info ? (
                    <div className="space-y-2">
                      {(info.lines ?? []).map(line => (
                        <div key={line.tel} className="flex flex-wrap items-center gap-2">
                          <span className="text-slate-400 text-xs">{line.label}:</span>
                          <a
                            href={`tel:${line.tel}`}
                            className="text-slate-700 text-sm font-medium hover:text-blue-600 transition-colors"
                          >
                            {line.display}
                          </a>
                          <a
                            href={line.whatsapp}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            WhatsApp
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : 'isAddress' in info && info.isAddress ? (
                    <ContactAddress variant="light" />
                  ) : (
                    'values' in info && info.values.map(v => (
                      <a
                        key={v}
                        href={`mailto:${v}`}
                        className="text-slate-600 text-sm hover:text-blue-600 transition-colors"
                      >
                        {v}
                      </a>
                    ))
                  )}
                </div>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.24 }}
              className={cardClass}
              style={cardStyle}
            >
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(37,99,235,0.08)', color: '#2563eb' }}
                >
                  <Clock size={20} strokeWidth={2.2} />
                </div>
                <p className="font-semibold text-slate-900">{t('businessHours.title')}</p>
              </div>
              <BusinessHours variant="light" showStatus showHeader={false} />
            </motion.div>
          </div>
        </div>

        {/* Map */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="mt-12 lg:mt-16"
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
            <div>
              <span
                className="inline-block text-xs font-bold uppercase tracking-[0.16em] mb-2"
                style={{ color: '#2563eb' }}
              >
                {t('contact.badge')}
              </span>
              <h2 className="text-2xl font-bold text-slate-900">{t('contact.mapTitle')}</h2>
              <p className="text-sm text-slate-500 mt-1">{CONTACT.street}, {CONTACT.city}</p>
            </div>
            <a
              href={CONTACT.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{
                background: 'rgba(37,99,235,0.08)',
                color: '#2563eb',
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={15} />
              {t('contact.mapCta')}
            </a>
          </div>

          <div
            className="rounded-3xl overflow-hidden border"
            style={{ borderColor: '#e0e3e5', boxShadow: '0 24px 64px rgba(15,23,42,0.08)' }}
          >
            <OfficeMap height={440} />
          </div>
        </motion.section>
      </div>
    </div>
  );
}
