import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpDown, BadgePercent, CalendarClock, Check, Headset, HardHat, MapPin, MessageCircle, Phone, SearchX, Wallet,
} from 'lucide-react';
import { useLocale, useTranslation } from '../i18n/LocaleContext';
import { useProjects } from '../hooks/usePublicData';
import { useCurrency } from '../contexts/CurrencyContext';
import { projectStatusLabels } from '../i18n/labels';
import { ProjectCard } from '../components/projects/ProjectParts';
import ProjectsMap from '../components/projects/ProjectsMap';
import { CONTACT } from '../data/contactInfo';
import type { ConstructionProject, ProjectStatus } from '../types/project';

type Sort = 'recommended' | 'price' | 'completion' | 'progress';

/** "2027 Q2" / "2027-06" → a sortable number; unknown dates go last. */
function completionKey(p: ConstructionProject): number {
  const q = /(\d{4})\s*Q([1-4])/i.exec(p.completion ?? '');
  if (q) return Number(q[1]) * 10 + Number(q[2]);
  const d = /(\d{4})-(\d{2})/.exec(p.deliveryDate ?? '');
  if (d) return Number(d[1]) * 10 + Math.ceil(Number(d[2]) / 3);
  return Number.MAX_SAFE_INTEGER;
}

export default function ProjectsPage() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { formatMoney, listingToGel } = useCurrency();
  const { data: projects, loading } = useProjects();
  const statusLabels = projectStatusLabels(t);

  const [status, setStatus] = useState<'' | ProjectStatus>('');
  const [city, setCity] = useState('');
  const [sort, setSort] = useState<Sort>('recommended');

  const count = (n: number) => n.toLocaleString(locale === 'ka' ? 'ka-GE' : 'en-US');

  const stats = useMemo(() => ({
    projects: projects.length,
    units: projects.reduce((sum, p) => sum + (p.units || 0), 0),
    // Projects may be priced in ₾ or $ — compare in GEL.
    priceFrom: projects.reduce((min, p) => {
      const gel = listingToGel(p.priceFrom, p.priceCurrency);
      return gel > 0 && gel < min ? gel : min;
    }, Infinity),
    developers: new Set(projects.map(p => p.developer).filter(Boolean)).size,
  }), [projects, listingToGel]);

  const cities = useMemo(() => [...new Set(projects.map(p => p.city).filter(Boolean))], [projects]);
  const statusTabs = useMemo(() => {
    const order: ProjectStatus[] = ['presale', 'building', 'completed'];
    return [
      { v: '' as const, l: t('common.all'), n: projects.filter(p => !city || p.city === city).length },
      ...order.map(s => ({ v: s, l: statusLabels[s], n: projects.filter(p => p.status === s && (!city || p.city === city)).length })),
    ].filter(tab => tab.v === '' || tab.n > 0);
  }, [projects, city, statusLabels, t]);

  const shown = useMemo(() => {
    const list = projects.filter(p => (!status || p.status === status) && (!city || p.city === city));
    switch (sort) {
      case 'price': return [...list].sort((a, b) => listingToGel(a.priceFrom, a.priceCurrency) - listingToGel(b.priceFrom, b.priceCurrency));
      case 'completion': return [...list].sort((a, b) => completionKey(a) - completionKey(b));
      case 'progress': return [...list].sort((a, b) => (b.status === 'completed' ? 100 : b.constructionProgress) - (a.status === 'completed' ? 100 : a.constructionProgress));
      default: return list; // admin order
    }
  }, [projects, status, city, sort, listingToGel]);

  const sortOptions: { v: Sort; l: string }[] = [
    { v: 'recommended', l: t('projectsPage.sortRecommended') },
    { v: 'price', l: t('projectsPage.sortPrice') },
    { v: 'completion', l: t('projectsPage.sortCompletion') },
    { v: 'progress', l: t('projectsPage.sortProgress') },
  ];

  const perks = [
    { icon: CalendarClock, label: t('home.projectChips.presale') },
    { icon: BadgePercent, label: t('home.projectChips.noCommission') },
    { icon: Wallet, label: t('home.showcase.installment') },
    { icon: Headset, label: t('home.projectChips.freeConsult') },
  ];

  return (
    <div className="ppage page-under-header">
      {/* ── Hero ── */}
      <section className="ppage-hero">
        <div className="container-xl ppage-hero__inner">
          <div className="ppage-hero__copy">
            <span className="pcs__eyebrow"><HardHat size={13} strokeWidth={2.4} />{t('home.showcase.eyebrow')}</span>
            <h1>{t('projectsPage.title')}</h1>
            <p>{t('projectsPage.subtitle')}</p>
            <ul className="ppage-hero__perks">
              {perks.map(perk => <li key={perk.label}><perk.icon size={15} strokeWidth={2.2} />{perk.label}</li>)}
            </ul>
          </div>
          <dl className="ppage-hero__stats">
            {[
              { k: 'projects', v: loading ? '—' : count(stats.projects), l: t('projectsPage.statProjects') },
              { k: 'units', v: loading ? '—' : count(stats.units), l: t('projectsPage.statUnits') },
              { k: 'price', v: loading || !Number.isFinite(stats.priceFrom) ? '—' : formatMoney(stats.priceFrom, { compact: true }), l: t('projectsPage.statPrice') },
              { k: 'devs', v: loading ? '—' : count(stats.developers), l: t('projectsPage.statDevelopers') },
            ].map(s => (
              <div key={s.k}>
                <dd>{s.v}</dd>
                <dt>{s.l}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="container-xl ppage-main">
        {/* ── Toolbar ── */}
        <div className="ppage-bar">
          <div className="home-tabs ppage-tabs" role="tablist" aria-label={t('projectsPage.statusFilter')}>
            {statusTabs.map(tab => (
              <button
                key={tab.v || 'all'}
                type="button"
                role="tab"
                aria-selected={status === tab.v}
                className={status === tab.v ? 'is-on' : ''}
                onClick={() => setStatus(tab.v)}
              >
                {tab.l}<span>{tab.n}</span>
              </button>
            ))}
          </div>
          <div className="ppage-bar__end">
            {cities.length > 1 && (
              <label className="ppage-select">
                <MapPin size={14} strokeWidth={2.2} />
                <select value={city} onChange={e => setCity(e.target.value)} aria-label={t('home.city')}>
                  <option value="">{t('home.loc.allCities')}</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            )}
            <label className="ppage-select">
              <ArrowUpDown size={14} strokeWidth={2.2} />
              <select value={sort} onChange={e => setSort(e.target.value as Sort)} aria-label={t('listings.bar.sort')}>
                {sortOptions.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </label>
          </div>
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div className="ppage-grid" aria-busy="true">
            {[0, 1, 2].map(i => (
              <div key={i} className="lc-skel">
                <div className="lc-skel__img skeleton" style={{ aspectRatio: '16 / 11' }} />
                <div className="lc-skel__body">
                  <span className="skeleton" style={{ width: '55%', height: 18 }} />
                  <span className="skeleton" style={{ width: '80%' }} />
                  <span className="skeleton" style={{ width: '100%', height: 6 }} />
                </div>
              </div>
            ))}
          </div>
        ) : shown.length === 0 ? (
          <div className="lp-empty">
            <span className="lp-empty__icon"><SearchX size={26} strokeWidth={1.8} /></span>
            <h3>{t('home.projectDetail.notFound')}</h3>
            <div className="lp-empty__actions">
              <button type="button" className="lp-btn lp-btn--primary" onClick={() => { setStatus(''); setCity(''); }}>
                {t('listings.clearFilters')}
              </button>
            </div>
          </div>
        ) : (
          <div className="ppage-grid">
            {shown.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}

        {/* ── Map ── */}
        {!loading && shown.length > 0 && (
          <section className="ppage-map">
            <div className="ppage-map__head">
              <h2>{t('projectsPage.mapTitle')}</h2>
              <p>{t('projectsPage.mapHint')}</p>
            </div>
            <ProjectsMap projects={shown} />
          </section>
        )}

        {/* ── Consultation ── */}
        <section className="ppage-cta">
          <div className="ppage-cta__copy">
            <span className="ppage-cta__icon"><Headset size={22} strokeWidth={2} /></span>
            <div>
              <h2>{t('projectsPage.ctaTitle')}</h2>
              <p>{t('projectsPage.ctaText')}</p>
            </div>
          </div>
          <div className="ppage-cta__actions">
            <a href={`tel:${CONTACT.mobile.tel}`} className="ppage-cta__btn is-call"><Phone size={16} strokeWidth={2.4} />{CONTACT.mobile.display}</a>
            <a href={CONTACT.mobile.whatsapp} target="_blank" rel="noopener noreferrer" className="ppage-cta__btn is-wa">
              <MessageCircle size={16} strokeWidth={2.4} />WhatsApp
            </a>
            <Link to="/contact" className="ppage-cta__btn is-ghost"><Check size={16} strokeWidth={2.6} />{t('projectsPage.ctaForm')}</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
