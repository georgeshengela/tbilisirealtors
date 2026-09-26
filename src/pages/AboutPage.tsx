import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Globe2,
  Handshake,
  Home,
  Landmark,
  MapPin,
} from 'lucide-react';
import { useTranslation } from '../i18n/LocaleContext';
import { listingsHref } from '../lib/seoListingsUrl';

const PAGE_BG = '#f7f9fb';
const CARD_BORDER = '#e6e8ea';
const CARD_SHADOW = '0 10px 32px rgba(15,23,42,0.06)';

export default function AboutPage() {
  const { t } = useTranslation();

  const foci = [
    { icon: Home, label: t('about.focusResidential') },
    { icon: Landmark, label: t('about.focusCommercial') },
    { icon: Building2, label: t('about.focusInvestment') },
  ];

  const work = [
    { icon: Handshake, label: t('about.workBuy') },
    { icon: Building2, label: t('about.workAnalysis') },
    { icon: Globe2, label: t('about.workDeals') },
  ];

  return (
    <div className="min-h-screen page-under-header" style={{ background: PAGE_BG }}>
      <section className="relative overflow-hidden">
        <img
          src="/5e6a55c3201bd.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_35%]"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(11,18,32,0.78) 0%, rgba(11,18,32,0.58) 48%, rgba(11,18,32,0.42) 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(11,18,32,0.18) 0%, rgba(11,18,32,0.12) 40%, rgba(11,18,32,0.35) 100%)',
          }}
        />
        <div className="container-xl relative py-16 sm:py-20 lg:py-[88px]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-300">
              {t('about.badge')}
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-[56px] lg:leading-[1.05]">
              {t('about.title')}
            </h1>
            <p className="mt-3 max-w-xl text-base font-medium tracking-tight text-white/75 sm:text-lg">
              {t('about.tagline')}
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {foci.map(item => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[12.5px] font-semibold text-white backdrop-blur-sm"
                >
                  <item.icon size={13} strokeWidth={2.2} className="text-blue-200" />
                  {item.label}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container-xl py-10 sm:py-12 lg:py-16">
        <div className="grid items-start gap-6 lg:grid-cols-12 lg:gap-10">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-7"
          >
            <p className="text-xl font-medium leading-relaxed text-slate-800 sm:text-[22px] sm:leading-[1.55]">
              {t('about.p1')}
            </p>
            <div className="mt-6 space-y-5 text-[16px] leading-8 text-slate-600">
              <p>{t('about.p2')}</p>
              <p>{t('about.p3')}</p>
            </div>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid gap-3 lg:col-span-5"
          >
            {work.map(item => (
              <li
                key={item.label}
                className="flex items-center gap-4 rounded-2xl border bg-white px-5 py-5"
                style={{ borderColor: CARD_BORDER, boxShadow: CARD_SHADOW }}
              >
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                  style={{ background: 'rgba(37,99,235,0.08)' }}
                >
                  <item.icon size={20} strokeWidth={2.1} className="text-blue-600" />
                </span>
                <span className="text-[15px] font-bold leading-snug text-slate-800">
                  {item.label}
                </span>
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative mt-10 overflow-hidden rounded-[28px] lg:mt-14"
          style={{ background: '#0f172a' }}
        >
          <div
            className="pointer-events-none absolute -right-16 top-0 h-64 w-64 rounded-full opacity-40"
            style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.45) 0%, transparent 70%)' }}
          />
          <div className="relative grid lg:grid-cols-12">
            <div className="lg:col-span-8 p-7 sm:p-9 lg:p-11">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-300">
                {t('about.usLabel')} · {t('about.nyCity')}
              </p>
              <p className="mt-4 max-w-3xl text-[16px] leading-8 text-white">
                {t('about.p5')}
              </p>
            </div>
            <div className="flex flex-col justify-center gap-6 border-t border-white/10 p-7 sm:p-9 lg:col-span-4 lg:border-l lg:border-t-0 lg:p-11">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="mt-0.5 shrink-0 text-blue-300" />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
                    {t('about.usLabel')}
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-white">{t('about.nyCity')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Landmark size={18} className="mt-0.5 shrink-0 text-blue-300" />
                <p className="text-[15px] font-semibold leading-snug text-white">
                  {t('about.kwFirm')}
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:mt-8">
          {[t('about.p4'), t('about.p6')].map((text, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="rounded-[28px] border bg-white p-7 sm:p-8"
              style={{ borderColor: CARD_BORDER, boxShadow: CARD_SHADOW }}
            >
              <span
                className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl"
                style={{ background: i === 0 ? 'rgba(37,99,235,0.08)' : 'rgba(15,23,42,0.06)' }}
              >
                {i === 0
                  ? <Handshake size={18} className="text-blue-600" />
                  : <Globe2 size={18} className="text-slate-800" />}
              </span>
              <p className="text-[15.5px] leading-8 text-slate-600">{text}</p>
            </motion.div>
          ))}
        </div>

        <motion.footer
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-6 flex flex-col items-start justify-between gap-6 rounded-[28px] border bg-white p-7 sm:p-8 lg:mt-8 lg:flex-row lg:items-center"
          style={{ borderColor: CARD_BORDER, boxShadow: CARD_SHADOW }}
        >
          <div className="max-w-3xl">
            <p className="text-lg font-extrabold tracking-tight text-slate-900">
              {t('about.title')}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-500">{t('about.tagline')}</p>
            <p className="mt-3 text-[15px] leading-7 text-slate-600">{t('about.p7')}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Link
              to={listingsHref()}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800"
            >
              {t('about.ctaListings')}
              <ArrowRight size={16} strokeWidth={2.4} />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <MapPin size={15} strokeWidth={2.3} />
              {t('about.ctaContact')}
            </Link>
          </div>
        </motion.footer>
      </div>
    </div>
  );
}
