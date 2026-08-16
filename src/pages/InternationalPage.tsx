import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Globe2, ArrowRight, Phone } from 'lucide-react';
import { useLocale } from '../i18n/LocaleContext';
import { CONTACT } from '../data/contactInfo';

/** Destinations we are preparing — listings get attached as they are signed. */
const DESTINATIONS = [
  { id: 'uae',    name: 'დუბაი, არაბეთის გაერთიანებული საამიროები', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80' },
  { id: 'turkey', name: 'სტამბოლი და ანტალია, თურქეთი',            image: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=800&q=80' },
  { id: 'greece', name: 'ათენი და კუნძულები, საბერძნეთი',           image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&q=80' },
  { id: 'spain',  name: 'ბარსელონა და კოსტა-ბრავა, ესპანეთი',       image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&q=80' },
];

export default function InternationalPage() {
  const { t } = useLocale();

  return (
    <div className="min-h-screen bg-slate-50 pt-[122px] pb-20">
      <div className="container-xl px-4 sm:px-6">
        <motion.header
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl py-10 sm:py-14"
        >
          <span className="inline-flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-widest">
            <Globe2 size={14} />
            {t('international.subtitle')}
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3 tracking-tight">
            {t('international.title')}
          </h1>
          <p className="text-slate-600 text-base leading-relaxed mt-4">
            {t('international.intro')}
          </p>
        </motion.header>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {DESTINATIONS.map((destination, index) => (
            <motion.div
              key={destination.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: index * 0.05 }}
              className="relative rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-sm"
            >
              <div className="aspect-[4/3] bg-slate-100">
                <img src={destination.image} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <span className="inline-block px-2 py-0.5 rounded-md bg-white/90 text-[10px] font-extrabold text-slate-700 uppercase tracking-wide">
                  {t('international.comingSoon')}
                </span>
                <p className="text-white font-bold text-sm mt-1.5 leading-snug">{destination.name}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div
          className="mt-10 rounded-3xl p-8 sm:p-10 text-white"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)' }}
        >
          <h2 className="text-2xl font-extrabold">{t('international.cta')}</h2>
          <p className="text-blue-100 text-sm mt-2 max-w-xl leading-relaxed">{t('international.ctaNote')}</p>
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-blue-700 text-sm font-bold hover:bg-blue-50 transition-colors"
            >
              {t('international.ctaButton')}
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
