import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight, ArrowUpRight, Bath, Bed, Building2, Calendar, CheckCircle2, ChevronLeft, ChevronRight,
  Copy, Eye, Hash, Heart, Home, Layers, Mail, MapPin, Maximize2, Phone, Ruler, Share2, Sparkles, Square, Star, X,
} from 'lucide-react';
import { useProperty, useProperties } from '../hooks/usePublicData';
import PropertyMap from '../components/PropertyMap';
import PropertyCard from '../components/PropertyCard';
import { formatShortDate } from '../lib/dateFormat';
import { useIsFavorite } from '../lib/favorites';
import { useCurrency } from '../contexts/CurrencyContext';
import { useLocale, useTranslation } from '../i18n/LocaleContext';
import BookViewingModal from '../components/BookViewingModal';
import { submitLead } from '../lib/leads';

/** Long descriptions collapse to a few lines until the reader asks for more. */
const CLAMP_AT_CHARS = 460;

interface NavItem {
  id: string;
  label: string;
}

/** Highlights the section the reader is currently looking at. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0] ?? '');

  useEffect(() => {
    const targets = ids
      .map(id => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    setActive(current => (ids.includes(current) ? current : ids[0]));

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        });
        // ids are in document order, so the first visible one is the topmost.
        const topmost = ids.find(id => visible.has(id));
        if (topmost) setActive(topmost);
      },
      { rootMargin: '-180px 0px -55% 0px' },
    );

    targets.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

export default function PropertyDetailPage() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { formatMoney } = useCurrency();
  const { id } = useParams();
  const { data: property, loading } = useProperty(id);
  const { data: allProperties } = useProperties();

  const [isFavorited, toggleFavorite] = useIsFavorite(id ?? '');

  const [activeImage, setActiveImage] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [copied, setCopied] = useState(false);
  const [idCopied, setIdCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mortgageYears, setMortgageYears] = useState(20);
  const [mortgageRate, setMortgageRate] = useState(8);
  const [downPayment, setDownPayment] = useState(20);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showBooking, setShowBooking] = useState(false);

  const images = property?.images?.length ? property.images : [];
  const imageCount = images.length;

  const step = useCallback(
    (delta: number) => {
      if (imageCount === 0) return;
      setActiveImage(i => (i + delta + imageCount) % imageCount);
    },
    [imageCount],
  );

  const navItems = useMemo<NavItem[]>(() => {
    if (!property) return [];
    return [
      { id: 'overview', label: t('property.overview') },
      { id: 'specs', label: t('property.specs') },
      property.amenities.length > 0 ? { id: 'amenities', label: t('property.amenities') } : null,
      { id: 'location', label: t('property.location') },
      property.status === 'sale' ? { id: 'payment', label: t('property.payment') } : null,
      { id: 'similar', label: t('property.similarShort') },
    ].filter((item): item is NavItem => item !== null);
  }, [property, t]);

  const navIds = useMemo(() => navItems.map(item => item.id), [navItems]);
  const activeSection = useActiveSection(navIds);

  useEffect(() => {
    setActiveImage(0);
    setExpanded(false);
    setSent(false);
    setFormError(null);
    setShowBooking(false);
  }, [id]);

  const handleEnquiry = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending || !property) return;

    if (!contactForm.phone.trim()) {
      setFormError(t('property.phoneRequired'));
      return;
    }

    setSending(true);
    setFormError(null);

    const result = await submitLead({
      kind: 'property',
      propertyId: property.id,
      name: contactForm.name,
      phone: contactForm.phone,
      message: contactForm.message,
      subject: property.title,
    });

    setSending(false);

    if (!result.ok) {
      setFormError(result.error ?? null);
      return;
    }

    setContactForm({ name: '', phone: '', message: '' });
    setSent(true);
  };

  useEffect(() => {
    if (!property) return;
    const previous = document.title;
    document.title = `${property.title} — TBILISIREALTOR.GE`;
    return () => { document.title = previous; };
  }, [property]);

  /* Lightbox: arrow keys, Escape, and no page scrolling behind it. */
  useEffect(() => {
    if (!showGallery) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowGallery(false);
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [showGallery, step]);

  const share = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: property?.title ?? document.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      /* the reader dismissed the sheet, or the clipboard is unavailable */
    }
  }, [property?.title]);

  const copyListingId = useCallback(async () => {
    if (!property?.id) return;
    try {
      await navigator.clipboard.writeText(property.id);
      setIdCopied(true);
      window.setTimeout(() => setIdCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  }, [property?.id]);

  const goTo = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <div className="pdp-page">
        <div className="container-xl">
          <div className="pdp-skeleton pdp-skeleton--hero" />
          <div className="pdp-skeleton pdp-skeleton--line" />
          <div className="pdp-skeleton pdp-skeleton--line is-short" />
        </div>
      </div>
    );
  }

  if (!property) return <Navigate to="/listings" replace />;

  const typeLabels: Record<string, string> = {
    apartment: t('propertyTypes.apartment'),
    house: t('propertyTypes.house'),
    villa: t('propertyTypes.villa'),
    commercial: t('propertyTypes.commercial'),
    land: t('propertyTypes.land'),
  };

  const buildingStatusLabels: Record<string, string> = {
    new: t('property.buildingNew'),
    old: t('property.buildingOld'),
    under: t('property.buildingUnder'),
  };

  const isSale = property.status === 'sale' || property.status === 'both';
  const price = formatMoney(property.price, { perMonth: property.status === 'rent' });
  /* A property can be offered for sale and for rent at once. */
  const rentPrice = property.status === 'both' && property.rentPrice
    ? formatMoney(property.rentPrice, { perMonth: true })
    : null;
  /* Feeds often repeat the street inside the address field, so collapse repeats. */
  const addressLine = [...new Set(
    [property.address, property.district, property.city]
      .filter(Boolean)
      .flatMap(part => part.split(',').map(piece => piece.trim()))
      .filter(Boolean),
  )].join(', ');
  const description = (property.description ?? '').trim();
  const isLong = description.length > CLAMP_AT_CHARS;

  /* Imported feeds occasionally repeat the same amenity. */
  const features = [...new Set(property.features)];
  const amenities = [...new Set(property.amenities)];

  const similar = allProperties
    .filter(p => p.id !== property.id && (p.district === property.district || p.city === property.city || p.type === property.type))
    .slice(0, 3);

  const facts = [
    { icon: Square, value: `${property.area} მ²`, label: t('property.areaFull') },
    property.rooms ? { icon: Layers, value: String(property.rooms), label: t('property.rooms') } : null,
    property.bedrooms > 0 ? { icon: Bed, value: String(property.bedrooms), label: t('property.bedroomsFull') } : null,
    property.bathrooms > 0 ? { icon: Bath, value: String(property.bathrooms), label: t('property.bathroomFull') } : null,
    property.floor != null ? { icon: Building2, value: `${property.floor}${property.totalFloors ? `/${property.totalFloors}` : ''}`, label: t('property.floorFull') } : null,
    property.ceilingHeight ? { icon: Ruler, value: `${property.ceilingHeight} მ`, label: t('property.ceilingHeight') } : null,
  ].filter(Boolean) as { icon: typeof Square; value: string; label: string }[];

  const list = (values?: string[]) => (values && values.length > 0 ? values.join(', ') : null);

  const specGroups = [
    {
      legend: t('property.groupBuilding'),
      rows: [
        { label: t('property.listingType'), value: typeLabels[property.type] },
        { label: t('property.status'), value: isSale ? t('property.saleStatus') : t('property.rentStatus') },
        property.buildingStatus ? { label: t('property.buildingStatus'), value: buildingStatusLabels[property.buildingStatus] } : null,
        property.yearBuilt ? { label: t('property.yearBuiltFull'), value: String(property.yearBuilt) } : null,
        property.projectType ? { label: t('property.projectType'), value: property.projectType } : null,
        { label: t('property.materials'), value: list(property.buildingMaterials) },
        { label: t('property.buildingFeatures'), value: list(property.buildingFeatures) },
      ],
    },
    {
      legend: t('property.groupInterior'),
      rows: [
        { label: t('property.areaFull'), value: `${property.area} მ²` },
        property.floor != null ? { label: t('property.floorFull'), value: `${property.floor}${property.totalFloors ? `/${property.totalFloors}` : ''}` } : null,
        property.condition ? { label: t('property.condition'), value: property.condition } : null,
        property.balconyCount ? { label: t('property.balcony'), value: `${property.balconyCount}${property.balconyArea ? ` · ${property.balconyArea} მ²` : ''}` } : null,
        { label: t('property.furniture'), value: list(property.furniture) },
        { label: t('property.windows'), value: list(property.windowsMaterials) },
      ],
    },
    {
      legend: t('property.groupUtilities'),
      rows: [
        { label: t('property.heating'), value: list(property.heating) },
        { label: t('property.hotWater'), value: list(property.hotWater) },
        { label: t('property.parking'), value: list(property.parking) },
        { label: t('property.cityLabel'), value: property.city },
        { label: t('property.districtLabel'), value: property.district },
      ],
    },
  ]
    .map(group => ({
      legend: group.legend,
      rows: group.rows.filter((row): row is { label: string; value: string } => Boolean(row?.value)),
    }))
    .filter(group => group.rows.length > 0);

  const loanPrincipal = property.price * (1 - downPayment / 100);
  const monthlyRate = mortgageRate / 100 / 12;
  const months = mortgageYears * 12;
  const monthlyPayment = monthlyRate === 0
    ? loanPrincipal / months
    : (loanPrincipal * monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1);

  const sliders = [
    { label: t('property.downPaymentLabel', { pct: downPayment }), min: 5, max: 70, stepSize: 5, value: downPayment, set: setDownPayment, lo: '5%', hi: '70%' },
    { label: t('property.interestRate', { rate: mortgageRate }), min: 4, max: 20, stepSize: 0.5, value: mortgageRate, set: setMortgageRate, lo: '4%', hi: '20%' },
    { label: t('property.termYears', { years: mortgageYears }), min: 5, max: 30, stepSize: 1, value: mortgageYears, set: setMortgageYears, lo: `5 ${t('property.yearsShort')}`, hi: `30 ${t('property.yearsShort')}` },
  ];

  return (
    <div className="pdp-page">
      <div className="pdp-crumbs">
        <div className="container-xl">
          <nav className="pdp-crumbs__inner">
            <Link to="/"><Home size={13} strokeWidth={2.2} />{t('property.home')}</Link>
            <span>/</span>
            <Link to="/listings">{t('property.listing')}</Link>
            <span>/</span>
            <Link to={`/listings?city=${encodeURIComponent(property.city)}&district=${encodeURIComponent(property.district)}`}>
              {property.district}
            </Link>
            <span>/</span>
            <strong>{property.title}</strong>
          </nav>
        </div>
      </div>

      <div className="container-xl">
        {/* ── Gallery ── */}
        {imageCount > 0 && (
          <section className={`pdp-gallery ${imageCount < 3 ? 'is-single' : ''}`}>
            <div className="pdp-gallery__stage">
              <button
                type="button"
                className="pdp-gallery__main"
                onClick={() => setShowGallery(true)}
                aria-label={t('property.showAllPhotos')}
              >
                <img src={images[activeImage]} alt={property.title} />
                <span className="pdp-gallery__shade" aria-hidden="true" />
              </button>

              <span className="pdp-badges">
                {property.isPremium && (
                  <span className="pdp-badge is-vip">
                    <Sparkles size={10} fill="currentColor" /> {t('common.premium')}
                  </span>
                )}
                {property.isNew && <span className="pdp-badge is-new">{t('common.new')}</span>}
              </span>

              <span className="pdp-counter">{activeImage + 1} / {imageCount}</span>

              {imageCount > 1 && (
                <>
                  <button
                    type="button"
                    className="pdp-gallery__arrow is-prev"
                    onClick={() => step(-1)}
                    aria-label={t('property.prevPhoto')}
                  >
                    <ChevronLeft size={18} strokeWidth={2.4} />
                  </button>
                  <button
                    type="button"
                    className="pdp-gallery__arrow is-next"
                    onClick={() => step(1)}
                    aria-label={t('property.nextPhoto')}
                  >
                    <ChevronRight size={18} strokeWidth={2.4} />
                  </button>
                </>
              )}

              <button type="button" className="pdp-gallery__all" onClick={() => setShowGallery(true)}>
                <Maximize2 size={13} strokeWidth={2.4} />
                {t('property.showAllPhotos')} ({imageCount})
              </button>
            </div>

            {imageCount >= 3 && (
              <div className="pdp-gallery__side">
                {images.slice(1, 5).map((img, i) => (
                  <button
                    type="button"
                    key={img + i}
                    className="pdp-gallery__cell"
                    onClick={() => { setActiveImage(i + 1); setShowGallery(true); }}
                  >
                    <img src={img} alt="" loading="lazy" />
                    {i === 3 && imageCount > 5 && (
                      <span className="pdp-gallery__more">+{imageCount - 5}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Title and price ── */}
        <header className="pdp-head">
          <div className="pdp-head__main">
            <div className="pdp-chips">
              <button type="button" className="pdp-chip is-id" onClick={copyListingId} title={t('property.copyId')}>
                <Hash size={11} strokeWidth={2.4} />
                <span className="pdp-chip__id">{property.id}</span>
                {idCopied ? <CheckCircle2 size={11} strokeWidth={2.4} /> : <Copy size={10} strokeWidth={2.4} />}
              </button>
              <span className={`pdp-chip ${isSale ? 'is-sale' : 'is-rent'}`}>
                {isSale ? t('propertyStatus.sale') : t('propertyStatus.rent')}
              </span>
              <span className="pdp-chip">
                <Building2 size={11} strokeWidth={2.2} />{typeLabels[property.type]}
              </span>
              <span className="pdp-chip">
                <Eye size={11} strokeWidth={2.2} />{property.viewCount.toLocaleString()} {t('property.views')}
              </span>
              <span className="pdp-chip">
                <Calendar size={11} strokeWidth={2.2} />{t('property.postedOn')} {formatShortDate(property.listedDate, locale)}
              </span>
            </div>

            <h1 className="pdp-title">{property.title}</h1>

            <button type="button" className="pdp-address" onClick={() => goTo('location')}>
              <MapPin size={14} strokeWidth={2.4} />
              <span>{addressLine}</span>
              <ArrowUpRight size={13} strokeWidth={2.6} />
            </button>
          </div>

          <div className="pdp-head__side">
            <div className="pdp-price">
              <p className="pdp-price__value">{price}</p>
              {rentPrice && <p className="pdp-price__rent">{rentPrice}</p>}
              {isSale && (
                <p className="pdp-price__sqm">{formatMoney(property.pricePerSqm, { perSqm: true })}</p>
              )}
            </div>

            <div className="pdp-actions">
              <button
                type="button"
                className={`pdp-icon-btn ${isFavorited ? 'is-active' : ''}`}
                onClick={toggleFavorite}
              >
                <Heart size={15} strokeWidth={2.2} style={{ fill: isFavorited ? 'currentColor' : 'none' }} />
                {t('property.save')}
              </button>
              <button type="button" className="pdp-icon-btn" onClick={share}>
                <Share2 size={15} strokeWidth={2.2} />
                {copied ? t('property.linkCopied') : t('property.share')}
              </button>
            </div>
          </div>
        </header>

        {/* ── Section nav ── */}
        <nav className="pdp-nav">
          <div className="pdp-nav__inner">
            {navItems.map(item => (
              <button
                type="button"
                key={item.id}
                className={`pdp-nav__link ${activeSection === item.id ? 'is-active' : ''}`}
                onClick={() => goTo(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="pdp-layout">
          <main className="pdp-main">
            {/* Overview */}
            <section className="pdp-section" id="overview">
              <div className="pdp-card">
                <div className="pdp-facts">
                  {facts.map(fact => (
                    <div className="pdp-fact" key={fact.label}>
                      <span className="pdp-fact__icon"><fact.icon size={16} strokeWidth={2} /></span>
                      <span className="pdp-fact__text">
                        <span className="pdp-fact__value">{fact.value}</span>
                        <span className="pdp-fact__label">{fact.label}</span>
                      </span>
                    </div>
                  ))}
                </div>

                {description && (
                  <>
                    <h2 className="pdp-card__title">{t('property.aboutTitle')}</h2>
                    <p className={`pdp-prose ${isLong && !expanded ? 'is-clamped' : ''}`}>{description}</p>
                    {isLong && (
                      <button type="button" className="pdp-readmore" onClick={() => setExpanded(v => !v)}>
                        {expanded ? t('property.readLess') : t('common.readMore')}
                        <ChevronRight size={13} strokeWidth={2.6} />
                      </button>
                    )}
                  </>
                )}

                {features.length > 0 && (
                  <>
                    <h3 className="pdp-card__subtitle">{t('property.features')}</h3>
                    <div className="pdp-tags">
                      {features.map(feature => (
                        <span className="pdp-tag" key={feature}>
                          <CheckCircle2 size={12} strokeWidth={2.4} />{feature}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* Specs */}
            <section className="pdp-section" id="specs">
              <div className="pdp-card">
                <h2 className="pdp-card__title">{t('property.specs')}</h2>
                <div className="pdp-specs">
                  {specGroups.map(group => (
                    <div className="pdp-specs__group" key={group.legend}>
                      <p className="pdp-specs__legend">{group.legend}</p>
                      {group.rows.map(row => (
                        <div className="pdp-spec" key={`${group.legend}-${row.label}`}>
                          <span className="pdp-spec__label">{row.label}</span>
                          <span className="pdp-spec__value">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Amenities */}
            {amenities.length > 0 && (
              <section className="pdp-section" id="amenities">
                <div className="pdp-card">
                  <h2 className="pdp-card__title">{t('property.amenities')}</h2>
                  <div className="pdp-amenities">
                    {amenities.map(amenity => (
                      <div className="pdp-amenity" key={amenity}>
                        <CheckCircle2 size={15} strokeWidth={2.2} />
                        {amenity}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Location */}
            <section className="pdp-section" id="location">
              <div className="pdp-card">
                <h2 className="pdp-card__title">{t('property.location')}</h2>
                <PropertyMap
                  lat={property.coordinates.lat}
                  lng={property.coordinates.lng}
                  address={property.address}
                  district={property.district}
                  city={property.city}
                  height={320}
                />
                <div className="pdp-map-foot">
                  <p><MapPin size={14} strokeWidth={2.4} />{addressLine}</p>
                  <Link
                    className="pdp-map-link"
                    to={`/listings?city=${encodeURIComponent(property.city)}&district=${encodeURIComponent(property.district)}`}
                  >
                    {t('property.districtListings', { district: property.district })}
                    <ArrowRight size={13} strokeWidth={2.6} />
                  </Link>
                </div>
              </div>
            </section>

            {/* Mortgage */}
            {isSale && (
              <section className="pdp-section" id="payment">
                <div className="pdp-card">
                  <h2 className="pdp-card__title">{t('property.mortgageCalc')}</h2>
                  <div className="pdp-calc">
                    {sliders.map(slider => (
                      <div className="pdp-slider" key={slider.label}>
                        <label className="pdp-slider__head">{slider.label}</label>
                        <input
                          type="range"
                          className="pdp-range"
                          min={slider.min}
                          max={slider.max}
                          step={slider.stepSize}
                          value={slider.value}
                          onChange={event => slider.set(Number(event.target.value))}
                          style={{
                            '--fill': `${((slider.value - slider.min) / (slider.max - slider.min)) * 100}%`,
                          } as CSSProperties}
                        />
                        <div className="pdp-slider__scale">
                          <span>{slider.lo}</span>
                          <span>{slider.hi}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pdp-calc__result">
                    <div className="pdp-calc__stat is-lead">
                      <p className="pdp-calc__value">{formatMoney(Math.round(monthlyPayment))}</p>
                      <p className="pdp-calc__label">{t('property.monthlyEstimate')}</p>
                    </div>
                    <div className="pdp-calc__stat">
                      <p className="pdp-calc__value">{formatMoney(Math.round(property.price * downPayment / 100))}</p>
                      <p className="pdp-calc__label">{t('property.downPayment')}</p>
                    </div>
                    <div className="pdp-calc__stat">
                      <p className="pdp-calc__value">{formatMoney(Math.round(loanPrincipal))}</p>
                      <p className="pdp-calc__label">{t('property.loanAmount')}</p>
                    </div>
                  </div>
                  <p className="pdp-calc__hint">{t('property.mortgageHint')}</p>
                </div>
              </section>
            )}

            {/* Similar */}
            <section className="pdp-section" id="similar">
              <div className="pdp-similar-head">
                <h2 className="pdp-card__title">{t('property.similar')}</h2>
                <Link to="/listings" className="pdp-map-link">
                  {t('common.viewAll')} <ArrowRight size={13} strokeWidth={2.6} />
                </Link>
              </div>
              <div className="pdp-similar-grid">
                {similar.map(item => <PropertyCard key={item.id} property={item} />)}
              </div>
            </section>
          </main>

          {/* ── Sticky contact rail ── */}
          <aside className="pdp-aside">
            <div className="pdp-aside__card">
              <div className="pdp-aside__price">
                <p className="pdp-price__value">{price}</p>
                {rentPrice && <p className="pdp-price__rent">{rentPrice}</p>}
                {isSale && (
                  <p className="pdp-price__sqm">{formatMoney(property.pricePerSqm, { perSqm: true })}</p>
                )}
              </div>

              <div className="pdp-agent">
                <img className="pdp-agent__photo" src={property.agent.photo} alt={property.agent.name} />
                <div className="pdp-agent__info">
                  <p className="pdp-agent__name">{property.agent.name}</p>
                  <p className="pdp-agent__meta">
                    <Star size={11} fill="currentColor" />
                    {property.agent.rating} · {property.agent.reviewCount} {t('property.agentRating')}
                  </p>
                  {property.agent.verified && (
                    <p className="pdp-agent__verified">
                      <CheckCircle2 size={11} strokeWidth={2.6} />{t('common.verified')}
                    </p>
                  )}
                </div>
                <Link className="pdp-agent__link" to={`/agent/${property.agent.id}`}>
                  {t('property.profile')}
                </Link>
              </div>

              <p className="pdp-reply"><span className="pdp-reply__dot" />{t('property.replyTime')}</p>

              <div className="pdp-ctas">
                <a className="pdp-cta is-call" href={`tel:${property.agent.phone}`}>
                  <Phone size={16} strokeWidth={2.2} />{property.agent.phone}
                </a>
                <a className="pdp-cta is-mail" href={`mailto:${property.agent.email}`}>
                  <Mail size={15} strokeWidth={2.2} />{t('common.email')}
                </a>
                <button type="button" className="pdp-cta is-book" onClick={() => setShowBooking(true)}>
                  <Calendar size={15} strokeWidth={2.2} />{t('property.bookViewing')}
                </button>
              </div>

              <form className="pdp-form" onSubmit={handleEnquiry}>
                <p className="pdp-form__title">{t('property.sendInquiry')}</p>

                {sent ? (
                  <p className="pdp-sent">
                    <CheckCircle2 size={15} strokeWidth={2.4} />{t('property.inquirySent')}
                  </p>
                ) : (
                  <>
                    <input
                      className="pdp-input"
                      placeholder={t('property.fullName')}
                      value={contactForm.name}
                      onChange={event => setContactForm(f => ({ ...f, name: event.target.value }))}
                    />
                    <input
                      className="pdp-input"
                      placeholder={`${t('property.phone')} *`}
                      value={contactForm.phone}
                      onChange={event => setContactForm(f => ({ ...f, phone: event.target.value }))}
                    />
                    <textarea
                      className="pdp-input pdp-textarea"
                      rows={3}
                      placeholder={t('property.messagePlaceholder')}
                      value={contactForm.message}
                      onChange={event => setContactForm(f => ({ ...f, message: event.target.value }))}
                    />
                    {formError && <p className="pdp-form__error">{formError}</p>}
                    <button type="submit" className="pdp-submit" disabled={sending}>
                      {sending ? t('property.sending') : t('property.send')}
                      <ArrowRight size={15} strokeWidth={2.6} />
                    </button>
                  </>
                )}
              </form>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Mobile action bar ── */}
      <div className="pdp-bar">
        <div className="pdp-bar__price">
          <p className="pdp-bar__value">{price}</p>
          {isSale && <p className="pdp-bar__sqm">{formatMoney(property.pricePerSqm, { perSqm: true })}</p>}
        </div>
        <a className="pdp-bar__call" href={`tel:${property.agent.phone}`}>
          <Phone size={16} strokeWidth={2.4} />{t('property.callNow')}
        </a>
      </div>

      {copied && <div className="pdp-toast">{t('property.linkCopied')}</div>}
      {idCopied && <div className="pdp-toast">{t('property.idCopied')}</div>}

      <BookViewingModal
        open={showBooking}
        onClose={() => setShowBooking(false)}
        propertyId={property.id}
        propertyTitle={property.title}
      />

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {showGallery && imageCount > 0 && (
          <motion.div
            className="pdp-lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="pdp-lightbox__top">
              <p>{property.title}</p>
              <span className="pdp-lightbox__count">{activeImage + 1} / {imageCount}</span>
              <button type="button" onClick={() => setShowGallery(false)} aria-label={t('property.closeGallery')}>
                <X size={18} strokeWidth={2.4} />
              </button>
            </div>

            <div className="pdp-lightbox__stage" onClick={() => setShowGallery(false)}>
              {imageCount > 1 && (
                <button
                  type="button"
                  className="pdp-lightbox__nav is-prev"
                  onClick={event => { event.stopPropagation(); step(-1); }}
                  aria-label={t('property.prevPhoto')}
                >
                  <ChevronLeft size={22} strokeWidth={2.2} />
                </button>
              )}
              <motion.img
                key={activeImage}
                className="pdp-lightbox__img"
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.22 }}
                src={images[activeImage]}
                alt={property.title}
                onClick={event => event.stopPropagation()}
              />
              {imageCount > 1 && (
                <button
                  type="button"
                  className="pdp-lightbox__nav is-next"
                  onClick={event => { event.stopPropagation(); step(1); }}
                  aria-label={t('property.nextPhoto')}
                >
                  <ChevronRight size={22} strokeWidth={2.2} />
                </button>
              )}
            </div>

            {imageCount > 1 && (
              <div className="pdp-lightbox__strip">
                {images.map((img, i) => (
                  <button
                    type="button"
                    key={img + i}
                    className={`pdp-lightbox__thumb ${i === activeImage ? 'is-active' : ''}`}
                    onClick={() => setActiveImage(i)}
                  >
                    <img src={img} alt="" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
