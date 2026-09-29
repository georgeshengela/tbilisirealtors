import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import {
  ArrowDown, Building2, CalendarClock, Car, ChevronLeft, ChevronRight, Expand, Home, Images, Layers,
  MapPin, MessageCircle, Navigation, Pause, Phone, Play, ShieldCheck, Sparkles, TreePine, Trees, Wallet,
} from 'lucide-react';
import { useProject } from '../hooks/usePublicData';
import { useCurrency } from '../contexts/CurrencyContext';
import { useLocale, useTranslation } from '../i18n/LocaleContext';
import { projectStatusLabels } from '../i18n/labels';
import BuildingUnitPicker from '../components/BuildingUnitPicker';
import PropertyMap from '../components/PropertyMap';
import {
  CountUp, InstallmentCalculator, ProgressRing, ProjectLightbox, Reveal, RichDescription,
} from '../components/projects/ProjectDetailParts';
import { featureIcon, sizedImage } from '../lib/projectMedia';
import { CONTACT } from '../data/contactInfo';
import { formatPhone, whatsappNumber } from '../lib/listingInsights';
import { applySeo, clipMeta, pageUrl, setJsonLd, SITE_NAME, absoluteImage } from '../lib/seo';
import type { ProjectUnit } from '../types/project';

const HERO_SLIDES = 6;
const SLIDE_MS = 6500;
// Browsers ship patchy Georgian month data, so the names live here.
const KA_MONTHS = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];

/** "2027/05" → a Date on the first of that month. */
function parseDelivery(value: string): Date | null {
  const match = value?.match(/(\d{4})\D+(\d{1,2})/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, 1);
}

export default function ProjectDetailPage() {
  const { slug } = useParams();
  const { data: project, loading } = useProject(slug);
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { formatMoney } = useCurrency();
  const reduce = useReducedMotion();
  const P = 'home.projectDetail.page';

  const [slide, setSlide] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [showPhone, setShowPhone] = useState(false);
  const [calcUnit, setCalcUnit] = useState<ProjectUnit | null>(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [descOpen, setDescOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const progressX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });

  useEffect(() => {
    if (!project) return;
    const path = `/project/${project.slug}`;
    const place = [project.district, project.city].filter(Boolean).join(', ');
    applySeo({
      title: `${project.name} | ${SITE_NAME}`,
      description: clipMeta(
        [project.name, place, project.description].filter(Boolean).join(' · '),
      ),
      path,
      image: project.image || project.images[0],
    });
    setJsonLd('page', {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Residence',
          name: project.name,
          description: clipMeta(project.description || project.name, 240),
          url: pageUrl(path),
          image: absoluteImage(project.image || project.images[0]),
          address: {
            '@type': 'PostalAddress',
            streetAddress: project.address || undefined,
            addressLocality: project.city || undefined,
            addressRegion: project.district || undefined,
            addressCountry: 'GE',
          },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: SITE_NAME, item: pageUrl('/') },
            { '@type': 'ListItem', position: 2, name: t('seo.projects.title').split(' | ')[0], item: pageUrl('/projects') },
            { '@type': 'ListItem', position: 3, name: project.name, item: pageUrl(path) },
          ],
        },
      ],
    });
    return () => setJsonLd('page', null);
  }, [project, t]);

  const images = useMemo(() => {
    if (!project) return [];
    const list = project.images.length ? project.images : [project.image];
    return list.filter(Boolean);
  }, [project]);
  const slides = images.slice(0, HERO_SLIDES);

  // Hero slideshow; paused while the lightbox is open or the visitor pauses it.
  useEffect(() => {
    if (!playing || reduce || slides.length < 2 || lightbox != null) return;
    const id = window.setTimeout(() => setSlide(s => (s + 1) % slides.length), SLIDE_MS);
    return () => window.clearTimeout(id);
  }, [slide, playing, reduce, slides.length, lightbox]);

  // Warm the next hero frame so the crossfade never shows a blank.
  useEffect(() => {
    const next = slides[(slide + 1) % Math.max(slides.length, 1)];
    if (next) new Image().src = sizedImage(next, 2200);
  }, [slide, slides]);

  const sectionIds = useMemo(() => {
    if (!project) return [];
    const ids = ['overview', 'gallery'];
    if (project.projectUnits.length) ids.push('apartments');
    if (project.paymentOptions.includes('installment')) ids.push('payment');
    if (project.territoryAmenities.length + project.postDeliveryServices.length + project.securityFeatures.length) ids.push('features');
    if (project.coordinates?.lat) ids.push('location');
    return ids;
  }, [project]);

  // Scroll-spy for the section nav.
  useEffect(() => {
    const els = sectionIds.map(id => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (!els.length) return;
    const observer = new IntersectionObserver(
      entries => {
        const hit = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActiveSection(hit.target.id);
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [sectionIds]);

  const navRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    navRef.current?.querySelector<HTMLElement>('.is-active')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [activeSection]);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, [reduce]);

  if (loading) {
    return (
      <div className="pjd">
        <div className="pjd-hero is-loading"><div className="pjd-spinner" /></div>
      </div>
    );
  }

  if (!project) return <Navigate to="/projects" replace />;

  const statusLabels = projectStatusLabels(t);
  const paymentLabels: Record<string, string> = {
    installment: t('home.projectDetail.installment'),
    mortgage: t('home.projectDetail.mortgage'),
    cash: t('home.projectDetail.cash'),
  };
  const money = (n: number, opts: { perSqm?: boolean; compact?: boolean } = {}) =>
    formatMoney(n, { from: project.priceCurrency, ...opts });

  const units = project.projectUnits;
  const priced = units.filter(u => u.price > 0);
  const priceFrom = project.priceFrom || (priced.length ? Math.min(...priced.map(u => u.price)) : 0);
  const priceTo = project.priceTo || (priced.length ? Math.max(...priced.map(u => u.price)) : 0);
  const perSqmUnits = units.filter(u => u.pricePerSqm > 0).map(u => u.pricePerSqm);
  const perSqmFrom = project.pricePerSqmFrom || (perSqmUnits.length ? Math.min(...perSqmUnits) : 0);
  const perSqmTo = project.pricePerSqmTo || (perSqmUnits.length ? Math.max(...perSqmUnits) : 0);
  const calcPerSqm = project.pricePerSqmFrom
    || (perSqmUnits.length ? perSqmUnits.reduce((a, b) => a + b, 0) / perSqmUnits.length : 0);
  const available = units.filter(u => u.status === 'available').length;

  const delivered = project.status === 'completed';
  const pct = delivered ? 100 : Math.min(Math.max(Math.round(project.constructionProgress || 0), 0), 100);
  const deliveryAt = parseDelivery(project.deliveryDate);
  const now = new Date();
  const monthsLeft = deliveryAt
    ? (deliveryAt.getFullYear() - now.getFullYear()) * 12 + deliveryAt.getMonth() - now.getMonth()
    : 0;
  const deliveryLabel = !deliveryAt
    ? project.deliveryDate
    : locale === 'ka'
      ? `${KA_MONTHS[deliveryAt.getMonth()]}, ${deliveryAt.getFullYear()}`
      : new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(deliveryAt);

  const phone = project.phone?.trim() || CONTACT.mobile.tel;
  const telHref = `tel:${phone.replace(/[^\d+]/g, '')}`;
  const projectWa = whatsappNumber(project.phone);
  const waNumber = projectWa && projectWa.startsWith('9955') ? projectWa : whatsappNumber(CONTACT.mobile.tel);
  const waHref = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`${project.name} — ${typeof window === 'undefined' ? '' : window.location.href}`)}`
    : null;
  const revealPhone = (e: MouseEvent) => {
    if (!showPhone) {
      e.preventDefault();
      setShowPhone(true);
    }
  };

  const stats = [
    { icon: Building2, value: project.units || units.length, label: t('home.projectDetail.apartments') },
    { icon: Layers, value: project.floors, label: t('home.projectDetail.floors') },
    { icon: Home, value: project.buildings, label: t('home.projectDetail.buildings') },
    { icon: TreePine, value: project.greenArea, label: t('home.projectDetail.greenArea'), suffix: ' მ²' },
    { icon: Car, value: project.parking, label: t('home.projectDetail.parking') },
    { icon: Sparkles, value: available, label: t(`${P}.availableUnits`), accent: true },
  ].filter(s => s.value > 0);

  const navLabels: Record<string, string> = {
    overview: t(`${P}.navOverview`),
    gallery: t(`${P}.navGallery`),
    apartments: t(`${P}.navApartments`),
    payment: t(`${P}.navPayment`),
    features: t(`${P}.navFeatures`),
    location: t(`${P}.navLocation`),
  };

  const featureGroups = [
    { icon: Trees, title: t('home.projectDetail.territory'), keys: project.territoryAmenities, prefix: 'home.projectDetail.amenities' },
    { icon: Sparkles, title: t('home.projectDetail.postDelivery'), keys: project.postDeliveryServices, prefix: 'home.projectDetail.services' },
    { icon: ShieldCheck, title: t('home.projectDetail.security'), keys: project.securityFeatures, prefix: 'home.projectDetail.securityItems' },
  ].filter(g => g.keys.length);

  const longDesc = project.description.length > 700;
  const bento = images.slice(0, 5);
  const extraPhotos = images.length - bento.length;

  const calculate = (unit: ProjectUnit) => {
    setCalcUnit(unit);
    scrollTo('payment');
  };

  return (
    <div className="pjd">
      <motion.div className="pjd-readbar" style={{ scaleX: progressX }} aria-hidden />

      {/* ── Hero ── */}
      <section className="pjd-hero">
        <div className="pjd-hero__media" aria-hidden>
          <AnimatePresence initial={false}>
            <motion.img
              key={slides[slide]}
              src={sizedImage(slides[slide] ?? project.image, 2200)}
              alt=""
              className={reduce ? '' : 'is-kenburns'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
            />
          </AnimatePresence>
          <span className="pjd-hero__shade" />
        </div>

        <div className="container-xl pjd-hero__inner">
          <nav className="pjd-hero__crumbs" aria-label="breadcrumb">
            <Link to="/"><Home size={13} />{t('property.home')}</Link>
            <span>/</span>
            <Link to="/projects">{t('home.sections.projects')}</Link>
            <span>/</span>
            <strong>{project.name}</strong>
          </nav>

          <div className="pjd-hero__grid">
            <motion.div
              className="pjd-hero__copy"
              initial={reduce ? false : { opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="pjd-hero__pills">
                <span className={`pjd-pill is-${project.status}`}><i />{statusLabels[project.status]}</span>
                {project.paymentOptions.includes('installment') && (
                  <span className="pjd-pill is-glass"><Wallet size={13} />{t('home.projectDetail.installment')}</span>
                )}
                {project.developer && <span className="pjd-pill is-glass"><Building2 size={13} />{project.developer}</span>}
              </div>
              <h1>{project.name}</h1>
              <p className="pjd-hero__loc">
                <MapPin size={16} />
                {[project.address, project.district, project.city].filter(Boolean).join(', ')}
              </p>
              <div className="pjd-hero__actions">
                {units.length > 0 && (
                  <button type="button" className="pjd-btn is-primary is-lg" onClick={() => scrollTo('apartments')}>
                    <Layers size={18} />{t(`${P}.chooseApartment`)}
                  </button>
                )}
                <button type="button" className="pjd-btn is-glass is-lg" onClick={() => setLightbox(slide)}>
                  <Images size={18} />{t(`${P}.allPhotos`, { n: images.length })}
                </button>
              </div>
            </motion.div>

            <motion.aside
              className="pjd-hero__card"
              initial={reduce ? false : { opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              {perSqmFrom > 0 && (
                <div className="pjd-hero__price">
                  <span>{t(`${P}.perSqmFrom`)}</span>
                  <strong>{money(perSqmFrom)}</strong>
                </div>
              )}
              <dl>
                {priceFrom > 0 && <div><dt>{t(`${P}.priceFrom`)}</dt><dd>{money(priceFrom, { compact: priceFrom >= 1_000_000 })}</dd></div>}
                {project.areaFrom > 0 && <div><dt>{t(`${P}.unitSizes`)}</dt><dd>{project.areaFrom}–{project.areaTo} მ²</dd></div>}
                {project.deliveryDate && (
                  <div>
                    <dt>{t('home.projectDetail.delivery')}</dt>
                    <dd>{delivered ? t(`${P}.deliveredLabel`) : project.deliveryDate}</dd>
                  </div>
                )}
              </dl>
            </motion.aside>
          </div>

          {slides.length > 1 && (
            <div className="pjd-hero__slides">
              <button type="button" className="pjd-hero__play" onClick={() => setPlaying(p => !p)}
                aria-label={playing ? t(`${P}.pause`) : t(`${P}.play`)}>
                {playing ? <Pause size={14} /> : <Play size={14} />}
              </button>
              {slides.map((img, i) => (
                <button
                  key={img}
                  type="button"
                  className={`pjd-hero__dot ${i === slide ? 'is-active' : ''} ${i < slide ? 'is-past' : ''}`}
                  onClick={() => setSlide(i)}
                  aria-label={t(`${P}.image`, { n: i + 1 })}
                >
                  <span
                    key={`${slide}-${playing}`}
                    style={{ animationDuration: `${SLIDE_MS}ms`, animationPlayState: playing && !reduce ? 'running' : 'paused' }}
                  />
                </button>
              ))}
              <button type="button" className="pjd-hero__arrow" onClick={() => setSlide(s => (s - 1 + slides.length) % slides.length)}
                aria-label={t(`${P}.prev`)}><ChevronLeft size={18} /></button>
              <button type="button" className="pjd-hero__arrow" onClick={() => setSlide(s => (s + 1) % slides.length)}
                aria-label={t(`${P}.next`)}><ChevronRight size={18} /></button>
            </div>
          )}
        </div>

        <button type="button" className="pjd-hero__scroll" onClick={() => scrollTo('overview')} aria-label={navLabels.overview}>
          <ArrowDown size={18} />
        </button>
      </section>

      {/* ── Section nav ── */}
      <div className="pjd-nav">
        <div className="container-xl pjd-nav__inner">
          <div className="pjd-nav__links" ref={navRef}>
            {sectionIds.map(id => (
              <button key={id} type="button" className={activeSection === id ? 'is-active' : ''} onClick={() => scrollTo(id)}>
                {navLabels[id]}
                {activeSection === id && <motion.span layoutId="pjd-nav-pill" className="pjd-nav__pill" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
              </button>
            ))}
          </div>
          <div className="pjd-nav__cta">
            <span className="pjd-nav__name">{project.name}</span>
            {perSqmFrom > 0 && <span className="pjd-nav__price">{money(perSqmFrom, { perSqm: true })}</span>}
            <a href={telHref} className="pjd-btn is-primary is-sm" onClick={revealPhone}>
              <Phone size={15} />{showPhone ? formatPhone(phone) || phone : t(`${P}.call`)}
            </a>
          </div>
        </div>
      </div>

      {/* ── Overview ── */}
      <section id="overview" className="pjd-section">
        <div className="container-xl">
          <Reveal>
            <div className="pjd-stats">
              {stats.map(({ icon: Icon, value, label, suffix, accent }) => (
                <div key={label} className={`pjd-stat ${accent ? 'is-accent' : ''}`}>
                  <Icon size={20} strokeWidth={1.8} />
                  <strong><CountUp value={value} />{suffix}</strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </Reveal>

          <div className="pjd-overview">
            <Reveal className="pjd-overview__text">
              <span className="pjd-eyebrow">{t('home.projectDetail.about')}</span>
              <h2 className="pjd-h2">{t(`${P}.overviewTitle`)}</h2>
              <div className={`pjd-desc ${longDesc && !descOpen ? 'is-clamped' : ''}`}>
                <RichDescription text={project.description} />
              </div>
              {longDesc && (
                <button type="button" className="pjd-link" onClick={() => setDescOpen(o => !o)}>
                  {descOpen ? t(`${P}.readLess`) : t(`${P}.readMore`)}
                </button>
              )}
            </Reveal>

            <Reveal className="pjd-build" delay={0.1}>
              <ProgressRing pct={pct} label={t(`${P}.progress`)} />
              <div className="pjd-build__status">
                <span className={`pjd-pill is-${project.status}`}><i />{statusLabels[project.status]}</span>
                {project.constructionNote && <p>{project.constructionNote}</p>}
              </div>
              <dl className="pjd-build__facts">
                {deliveryAt && (
                  <div>
                    <dt><CalendarClock size={15} />{t('home.projectDetail.delivery')}</dt>
                    <dd>{deliveryLabel}{!delivered && monthsLeft > 0 && <em>{t(`${P}.monthsLeft`, { n: monthsLeft })}</em>}</dd>
                  </div>
                )}
                {project.deliveryCondition && (
                  <div><dt><Home size={15} />{t('home.projectDetail.deliveryCondition')}</dt><dd>{project.deliveryCondition}</dd></div>
                )}
                {project.developer && (
                  <div><dt><Building2 size={15} />{t('home.projectDetail.developer')}</dt><dd>{project.developer}</dd></div>
                )}
                {project.managementCompany && (
                  <div><dt><ShieldCheck size={15} />{t('home.projectDetail.management')}</dt><dd>{project.managementCompany}</dd></div>
                )}
                {(perSqmFrom > 0 || priceFrom > 0) && (
                  <div>
                    <dt><Wallet size={15} />{t('home.projectDetail.pricePerSqm')}</dt>
                    <dd>{money(perSqmFrom)}{perSqmTo > perSqmFrom && ` – ${money(perSqmTo)}`}</dd>
                  </div>
                )}
                {priceFrom > 0 && (
                  <div>
                    <dt><Wallet size={15} />{t('home.projectDetail.price')}</dt>
                    <dd>{money(priceFrom)}{priceTo > priceFrom && ` – ${money(priceTo)}`}</dd>
                  </div>
                )}
              </dl>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Gallery ── */}
      <section id="gallery" className="pjd-section is-tinted">
        <div className="container-xl">
          <Reveal className="pjd-section__head">
            <div>
              <span className="pjd-eyebrow">{t('home.projectDetail.renders')}</span>
              <h2 className="pjd-h2">{t(`${P}.galleryTitle`)}</h2>
              <p className="pjd-sub">{t(`${P}.gallerySub`, { n: images.length })}</p>
            </div>
            {images.length > 1 && (
              <button type="button" className="pjd-btn is-ghost" onClick={() => setLightbox(0)}>
                <Expand size={16} />{t(`${P}.viewAll`)}
              </button>
            )}
          </Reveal>
          <div className={`pjd-bento is-n${bento.length}`}>
            {bento.map((img, i) => (
              <motion.button
                key={img}
                type="button"
                className="pjd-bento__cell"
                onClick={() => setLightbox(i)}
                initial={reduce ? false : { opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.6, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                aria-label={t(`${P}.image`, { n: i + 1 })}
              >
                <img src={sizedImage(img, i === 0 ? 1400 : 800)} alt="" loading="lazy" decoding="async" />
                {i === bento.length - 1 && extraPhotos > 0 && (
                  <span className="pjd-bento__more">+{extraPhotos}</span>
                )}
              </motion.button>
            ))}
          </div>
          {images.length > bento.length && (
            <div className="pjd-film" aria-label={t(`${P}.navGallery`)}>
              {images.slice(bento.length).map((img, i) => (
                <button key={img} type="button" onClick={() => setLightbox(bento.length + i)} aria-label={t(`${P}.image`, { n: bento.length + i + 1 })}>
                  <img src={sizedImage(img, 480)} alt="" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Apartments ── */}
      {units.length > 0 && (
        <section id="apartments" className="pjd-section">
          <div className="container-xl">
            <Reveal className="pjd-section__head">
              <div>
                <span className="pjd-eyebrow">{t('home.projectDetail.unitPicker')}</span>
                <h2 className="pjd-h2">{t(`${P}.pickerTitle`)}</h2>
              </div>
            </Reveal>
            <Reveal>
              <BuildingUnitPicker project={project} onCalculate={calculate} />
            </Reveal>
          </div>
        </section>
      )}

      {/* ── Payment ── */}
      {sectionIds.includes('payment') && (
        <section id="payment" className="pjd-section is-tinted">
          <div className="container-xl">
            <Reveal className="pjd-section__head">
              <div>
                <span className="pjd-eyebrow">{t('home.projectDetail.paymentOptions')}</span>
                <h2 className="pjd-h2">{t(`${P}.calcSub`)}</h2>
              </div>
              <div className="pjd-paychips">
                {project.paymentOptions.map(opt => <span key={opt}><Wallet size={14} />{paymentLabels[opt]}</span>)}
              </div>
            </Reveal>
            {calcPerSqm > 0 || calcUnit ? (
              <Reveal>
                <InstallmentCalculator project={project} pricePerSqm={calcPerSqm} unit={calcUnit} onClearUnit={() => setCalcUnit(null)} />
              </Reveal>
            ) : null}
          </div>
        </section>
      )}

      {/* ── Amenities ── */}
      {featureGroups.length > 0 && (
        <section id="features" className="pjd-section">
          <div className="container-xl">
            <Reveal className="pjd-section__head">
              <div>
                <span className="pjd-eyebrow">{t(`${P}.navFeatures`)}</span>
                <h2 className="pjd-h2">{t(`${P}.featuresTitle`)}</h2>
              </div>
            </Reveal>
            <div className="pjd-features">
              {featureGroups.map(({ icon: GroupIcon, title, keys, prefix }, gi) => (
                <Reveal key={title} className="pjd-fgroup" delay={gi * 0.08}>
                  <h3><span><GroupIcon size={18} /></span>{title}</h3>
                  <ul>
                    {keys.map((key, i) => {
                      const Icon = featureIcon(key);
                      return (
                        <motion.li
                          key={key}
                          initial={reduce ? false : { opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.15 + i * 0.05, duration: 0.4 }}
                        >
                          <Icon size={17} strokeWidth={1.9} />
                          {t(`${prefix}.${key}`)}
                        </motion.li>
                      );
                    })}
                  </ul>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Location ── */}
      {sectionIds.includes('location') && (
        <section id="location" className="pjd-section is-tinted">
          <div className="container-xl">
            <Reveal className="pjd-section__head">
              <div>
                <span className="pjd-eyebrow">{t(`${P}.navLocation`)}</span>
                <h2 className="pjd-h2">{[project.district, project.city].filter(Boolean).join(', ') || t(`${P}.locationTitle`)}</h2>
              </div>
            </Reveal>
            <Reveal className="pjd-location">
              <PropertyMap
                lat={project.coordinates.lat}
                lng={project.coordinates.lng}
                address={project.address}
                district={project.district}
                city={project.city}
                height="100%"
                zoom={15}
              />
              <div className="pjd-location__card">
                <img src={sizedImage(project.image || images[0], 600)} alt="" loading="lazy" />
                <div>
                  <strong>{project.name}</strong>
                  <p><MapPin size={14} />{[project.address, project.district, project.city].filter(Boolean).join(', ')}</p>
                  <a
                    className="pjd-btn is-primary is-sm"
                    href={`https://www.google.com/maps/search/?api=1&query=${project.coordinates.lat},${project.coordinates.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Navigation size={15} />{t(`${P}.openMaps`)}
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ── Closing CTA ── */}
      <section className="pjd-cta">
        <img src={sizedImage(images[1] ?? project.image, 1800)} alt="" aria-hidden loading="lazy" />
        <div className="container-xl pjd-cta__inner">
          <Reveal>
            <h2>{t(`${P}.ctaTitle`, { project: project.name })}</h2>
            <p>{t(`${P}.ctaText`)}</p>
            <div className="pjd-cta__actions">
              <a href={telHref} className="pjd-btn is-white is-lg" onClick={revealPhone}>
                <Phone size={18} />{showPhone ? formatPhone(phone) || phone : t('home.projectDetail.showPhone')}
              </a>
              {waHref && (
                <a href={waHref} target="_blank" rel="noopener noreferrer" className="pjd-btn is-wa is-lg">
                  <MessageCircle size={18} />WhatsApp
                </a>
              )}
              <Link to="/projects" className="pjd-btn is-glass is-lg">{t('home.projectDetail.allProjects')}</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Mobile action bar ── */}
      <div className="pjd-mbar">
        <div>
          <strong>{project.name}</strong>
          {perSqmFrom > 0 && <span>{money(perSqmFrom, { perSqm: true })}</span>}
        </div>
        {waHref && (
          <a href={waHref} target="_blank" rel="noopener noreferrer" className="pjd-btn is-wa is-icon" aria-label="WhatsApp">
            <MessageCircle size={18} />
          </a>
        )}
        <a href={telHref} className="pjd-btn is-primary"><Phone size={16} />{t(`${P}.call`)}</a>
      </div>

      <AnimatePresence>
        {lightbox != null && images.length > 0 && (
          <ProjectLightbox
            images={images}
            index={lightbox}
            name={project.name}
            onIndex={setLightbox}
            onClose={() => setLightbox(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
