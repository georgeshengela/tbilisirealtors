import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Clock, Sparkles, Wrench, Shield, Server,
  Filter, Rocket,
} from 'lucide-react';
import {
  PLATFORM_UPDATES,
  UPDATE_PHASES,
  CATEGORY_META,
  STATUS_META,
  type UpdateCategory,
  type UpdateStatus,
} from '../data/platformUpdates';
import { useLocale } from '../i18n/LocaleContext';

type FilterKey = 'all' | UpdateCategory | UpdateStatus;

const PHASE_ORDER = ['aug2026-sprint', 'aug2026-admin', 'aug2026-analytics', 'aug2026-infra'];

const CATEGORY_ICONS: Record<UpdateCategory, typeof Sparkles> = {
  feature: Sparkles,
  fix: Wrench,
  admin: Shield,
  platform: Server,
};

export default function UpdatesPage() {
  const { locale } = useLocale();
  const lang = locale === 'ka' ? 'ka' : 'en';
  const [filter, setFilter] = useState<FilterKey>('all');

  const stats = useMemo(() => ({
    done: PLATFORM_UPDATES.filter(u => u.status === 'done').length,
    fixes: PLATFORM_UPDATES.filter(u => u.category === 'fix' && u.status === 'done').length,
    features: PLATFORM_UPDATES.filter(u => u.category === 'feature' && u.status === 'done').length,
    inProgress: PLATFORM_UPDATES.filter(u => u.status === 'in_progress').length,
  }), []);

  const filtered = useMemo(() => {
    if (filter === 'all') return PLATFORM_UPDATES;
    if (filter === 'done' || filter === 'in_progress' || filter === 'planned') {
      return PLATFORM_UPDATES.filter(u => u.status === filter);
    }
    return PLATFORM_UPDATES.filter(u => u.category === filter);
  }, [filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const item of filtered) {
      const list = map.get(item.phase) ?? [];
      list.push(item);
      map.set(item.phase, list);
    }
    return PHASE_ORDER
      .filter(phase => map.has(phase))
      .map(phase => ({ phase, items: map.get(phase)! }));
  }, [filtered]);

  const filterChips: { key: FilterKey; label: string; icon?: typeof Sparkles }[] = [
    { key: 'all', label: lang === 'ka' ? 'ყველა' : 'All' },
    { key: 'feature', label: CATEGORY_META.feature[lang], icon: Sparkles },
    { key: 'fix', label: CATEGORY_META.fix[lang], icon: Wrench },
    { key: 'admin', label: CATEGORY_META.admin[lang], icon: Shield },
    { key: 'done', label: STATUS_META.done[lang], icon: CheckCircle2 },
    { key: 'in_progress', label: STATUS_META.in_progress[lang], icon: Clock },
  ];

  return (
    <div className="min-h-screen page-under-header" style={{ background: '#f7f9fb' }}>
      <div className="container-xl pb-16 sm:pb-20">
        {/* Hero */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-8 sm:pt-10 pb-8"
        >
          <div
            className="rounded-2xl lg:rounded-3xl border p-6 sm:p-8 lg:p-10"
            style={{ background: '#fff', borderColor: '#eceef0', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}
          >
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div className="max-w-2xl">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider"
                  style={{ background: '#eff6ff', color: '#2563eb' }}
                >
                  <Rocket size={12} strokeWidth={2.5} />
                  {lang === 'ka' ? 'პლატფორმის განახლებები' : 'Platform updates'}
                </span>
                <h1
                  className="font-extrabold mt-4 tracking-tight"
                  style={{ fontSize: 'clamp(28px, 4vw, 40px)', color: '#191c1e', lineHeight: 1.15 }}
                >
                  {lang === 'ka' ? 'რა გავაკეთეთ' : 'What we shipped'}
                </h1>
                <p className="text-[15px] sm:text-base mt-3 leading-relaxed" style={{ color: '#45464d' }}>
                  {lang === 'ka'
                    ? 'ფუნქციები, გამოსწორებები და ადმინის გაუმჯობესებები — ყველა დასრულებული პუნქტი WhatsApp / sprint სიიდან.'
                    : 'Features, fixes, and admin improvements — every completed item from our sprint list.'}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-shrink-0">
                {[
                  { label: lang === 'ka' ? 'დასრულებული' : 'Completed', value: stats.done, color: '#059669' },
                  { label: lang === 'ka' ? 'ფუნქციები' : 'Features', value: stats.features, color: '#2563eb' },
                  { label: lang === 'ka' ? 'ფიქსები' : 'Fixes', value: stats.fixes, color: '#10b981' },
                  { label: lang === 'ka' ? 'მიმდინარე' : 'In progress', value: stats.inProgress, color: '#d97706' },
                ].map(stat => (
                  <div
                    key={stat.label}
                    className="rounded-xl border px-4 py-3"
                    style={{ background: '#f7f9fb', borderColor: '#eceef0' }}
                  >
                    <p className="text-2xl font-extrabold tabular-nums" style={{ color: stat.color }}>
                      {stat.value}
                    </p>
                    <p className="text-[11px] font-semibold mt-0.5" style={{ color: '#76777d' }}>
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.header>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <span className="flex items-center gap-1.5 text-xs font-semibold mr-1" style={{ color: '#76777d' }}>
            <Filter size={14} />
            {lang === 'ka' ? 'ფილტრი' : 'Filter'}
          </span>
          {filterChips.map(chip => {
            const active = filter === chip.key;
            const Icon = chip.icon;
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setFilter(chip.key)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold border transition-colors"
                style={{
                  background: active ? '#191c1e' : '#fff',
                  color: active ? '#fff' : '#45464d',
                  borderColor: active ? '#191c1e' : '#e4e6ea',
                }}
              >
                {Icon && <Icon size={14} strokeWidth={2} />}
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Timeline */}
        <div className="space-y-10">
          {grouped.map(({ phase, items }) => (
            <section key={phase}>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-px flex-1" style={{ background: '#e4e6ea' }} />
                <h2 className="text-xs font-bold uppercase tracking-widest px-2" style={{ color: '#76777d' }}>
                  {UPDATE_PHASES[phase][lang]}
                </h2>
                <div className="h-px flex-1" style={{ background: '#e4e6ea' }} />
              </div>

              <div className="grid gap-3">
                {items.map((item, index) => {
                  const cat = CATEGORY_META[item.category];
                  const status = STATUS_META[item.status];
                  const CatIcon = CATEGORY_ICONS[item.category];
                  const dateLabel = new Date(item.date).toLocaleDateString('ka-GE', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  });

                  return (
                    <motion.article
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-20px' }}
                      transition={{ delay: index * 0.03, duration: 0.35 }}
                      className="rounded-xl border overflow-hidden"
                      style={{
                        background: '#fff',
                        borderColor: '#eceef0',
                        boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
                      }}
                    >
                      <div className="flex gap-0">
                        <div
                          className="w-1 flex-shrink-0"
                          style={{ background: cat.color }}
                        />
                        <div className="flex-1 p-4 sm:p-5 min-w-0">
                          <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide"
                                style={{ background: `${cat.color}14`, color: cat.color }}
                              >
                                <CatIcon size={11} strokeWidth={2.5} />
                                {cat[lang]}
                              </span>
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide"
                                style={{ background: status.bg, color: status.color }}
                              >
                                {item.status === 'done' && <CheckCircle2 size={11} strokeWidth={2.5} />}
                                {item.status === 'in_progress' && <Clock size={11} strokeWidth={2.5} />}
                                {status[lang]}
                              </span>
                            </div>
                            <time className="text-[12px] font-medium tabular-nums" style={{ color: '#76777d' }}>
                              {dateLabel}
                            </time>
                          </div>
                          <h3 className="text-[15px] sm:text-base font-bold leading-snug" style={{ color: '#191c1e' }}>
                            {item.title[lang]}
                          </h3>
                          <p className="text-sm mt-1.5 leading-relaxed" style={{ color: '#45464d' }}>
                            {item.description[lang]}
                          </p>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center py-16 text-sm font-medium" style={{ color: '#76777d' }}>
            {lang === 'ka' ? 'ამ ფილტრზე ჩანაწერები არ არის.' : 'No updates match this filter.'}
          </p>
        )}
      </div>
    </div>
  );
}
