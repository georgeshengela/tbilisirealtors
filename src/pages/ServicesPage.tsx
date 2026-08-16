import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Ruler, Sparkles, Hammer, Landmark, Scale, Truck, ArrowRight, Phone } from 'lucide-react';
import { useLocale } from '../i18n/LocaleContext';
import { CONTACT } from '../data/contactInfo';

const SERVICES = [
  { id: 'survey',     key: 'survey',     icon: Ruler,    color: '#2563eb' },
  { id: 'design',     key: 'design',     icon: Sparkles, color: '#ec4899' },
  { id: 'renovation', key: 'renovation', icon: Hammer,   color: '#f59e0b' },
  { id: 'banks',      key: 'banks',      icon: Landmark, color: '#10b981' },
  { id: 'legal',      key: 'legal',      icon: Scale,    color: '#8b5cf6' },
  { id: 'moving',     key: 'moving',     icon: Truck,    color: '#0ea5e9' },
] as const;

export default function ServicesPage() {
  const { t } = useLocale();

  return (
    <div className="min-h-screen bg-slate-50 pt-[122px] lg:pt-[122px] pb-20">
      <div className="container-xl px-4 sm:px-6">
        <motion.header
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl py-10 sm:py-14"
        >
          <span className="text-blue-600 text-xs font-bold uppercase tracking-widest">
            {t('services.subtitle')}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3 tracking-tight">
            {t('services.title')}
          </h1>
          <p className="text-slate-600 text-base leading-relaxed mt-4">
            {t('services.intro')}
          </p>
        </motion.header>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {SERVICES.map((service, index) => (
            <motion.article
              key={service.id}
              id={service.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: index * 0.05 }}
              className="scroll-mt-32 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <span
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: `${service.color}14` }}
              >
                <service.icon size={22} style={{ color: service.color }} />
              </span>
              <h2 className="text-lg font-extrabold text-slate-900 mt-4">
                {t(`services.${service.key}.title` as 'services.survey.title')}
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed mt-1.5">
                {t(`services.${service.key}.desc` as 'services.survey.desc')}
              </p>
            </motion.article>
          ))}
        </div>

        <div
          className="mt-10 rounded-3xl p-8 sm:p-10 text-white"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)' }}
        >
          <h2 className="text-2xl font-extrabold">{t('services.cta')}</h2>
          <p className="text-blue-100 text-sm mt-2 max-w-xl leading-relaxed">{t('services.ctaNote')}</p>
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-blue-700 text-sm font-bold hover:bg-blue-50 transition-colors"
            >
              {t('services.ctaButton')}
              <ArrowRight size={16} />
            </Link>
            <a
              href={`tel:${CONTACT.mobile.tel}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/30 text-sm font-bold hover:bg-white/10 transition-colors"
            >
              <Phone size={16} />
              {CONTACT.mobile.display}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
