import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useParams, useLocation, useNavigate, Link, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight, ArrowUpRight, Bath, Bed, Building2, Calendar, CheckCircle2, ChevronLeft, ChevronRight,
  Copy, Eye, Hash, Heart, Home, Layers, Mail, MapPin, Maximize2, MessageCircle, Phone, Ruler, Share2, Sparkles, Square, Star,
  TreePine, TrendingDown, TrendingUp, X,
} from 'lucide-react';
import { useProperty, useProperties } from '../hooks/usePublicData';
import PropertyMap from '../components/PropertyMap';
import ListingMapRow from '../components/ListingMapRow';
import { formatShortDate } from '../lib/dateFormat';
import { useIsFavorite } from '../lib/favorites';
import { useCurrency } from '../contexts/CurrencyContext';
import { useLocale, useTranslation } from '../i18n/LocaleContext';
import BookViewingModal from '../components/BookViewingModal';
import PriceCurrencyToggle from '../components/PriceCurrencyToggle';
import { submitLead } from '../lib/leads';
import { applySeo, clipMeta, pageUrl, setJsonLd, SITE_NAME, absoluteImage } from '../lib/seo';
import { personInitials } from '../lib/personInitials';
import { listingsHref } from '../lib/seoListingsUrl';
import { listingMoneyFrom } from '../lib/moneyEntry';
import { parsePropertyId, propertyHref, propertySeoCopy } from '../lib/seoPropertyUrl';
import { formatPublicLocationLine } from '../lib/address';
import { listingBuildingCode, listingIsVerified, publicListingFeatures } from '../lib/listingBadges';
import { hasKnownLocation } from '../lib/listingSearch';
import { formatPhone, priceInsight, similarListings, whatsappNumber } from '../lib/listingInsights';
import VerifiedListingBadge from '../components/VerifiedListingBadge';
import { CONTACT } from '../data/contactInfo';
import { rememberViewed } from '../lib/recentlyViewed';
import { avatarUrl } from '../lib/imageUrl';

/** Long descriptions collapse to a few lines until the reader asks for more. */
const CLAMP_AT_CHARS = 460;

/** "Price in the area" comparison — switched off for now; flip to true to bring it back. */
const SHOW_PRICE_INSIGHT = false;

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
  const { formatMoney, listingToGel } = useCurrency();
  const { id: paramId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const id = parsePropertyId(location.pathname) ?? paramId;
  const { data: property, loading } = useProperty(id);
  const seo = useMemo(
    () => (property ? propertySeoCopy(property, locale === 'en' ? 'en' : 'ka') : null),
    [property, locale],
  );
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
  /** Horizontal swipe on the main photo; a swipe must not also open the lightbox. */
  const touch = useRef<{ x: number; y: number; swiped: boolean } | null>(null);
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
    if (property?.id) rememberViewed(property.id);
  }, [property?.id]);

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
    if (!property || !seo) return;
    const canonical = propertyHref(property);
    const current = location.pathname.endsWith('/') ? location.pathname : `${location.pathname}/`;
    if (current !== canonical) {
      navigate(`${canonical}${location.search}${location.hash}`, { replace: true });
    }
  }, [property, seo, location.pathname, location.search, location.hash, navigate]);

  useEffect(() => {
    if (!property || !seo) return;
    applySeo({
      title: seo.title,
      description: clipMeta(seo.description, 220),
      path: seo.path,
      pathEn: seo.pathEn,
      image: property.images[0],
      keywords: seo.keywords,
      product: {
        id: property.id,
        price: seo.price != null ? String(seo.price) : undefined,
        currency: 'GEL',
        brand: SITE_NAME,
        condition: 'new',
        availability: 'in stock',
      },
    });
    const url = pageUrl(seo.path);
    setJsonLd('page', {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'RealEstateListing',
          name: seo.h1,
          description: clipMeta(property.description || seo.h1, 240),
          url,
          image: property.images.slice(0, 8).map(absoluteImage),
          datePosted: property.listedDate,
          address: {
            '@type': 'PostalAddress',
            streetAddress: formatPublicLocationLine(
              property.address,
              property.district,
              property.city,
              property.showAddress,
            ) || undefined,
            addressLocality: property.city || undefined,
            addressRegion: property.district || undefined,
            addressCountry: 'GE',
          },
          offers: {
            '@type': 'Offer',
            price: String(seo.price ?? property.price),
            priceCurrency: property.priceCurrency === 'USD' ? 'USD' : 'GEL',
            availability: 'https://schema.org/InStock',
            url,
          },
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: SITE_NAME, item: pageUrl('/') },
            { '@type': 'ListItem', position: 2, name: t('common.listings'), item: pageUrl(listingsHref()) },
            { '@type': 'ListItem', position: 3, name: seo.h1, item: url },
          ],
        },
      ],
    });
    return () => setJsonLd('page', null);
  }, [property, seo, t, locale]);

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
    const url = property
      ? `${window.location.origin}${propertyHref(property)}`
      : window.location.href;
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
  }, [property]);

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

  if (!property) return <Navigate to={listingsHref()} replace />;

  const typeLabels: Record<string, string> = {
    apartment: t('propertyTypes.apartment'),
    house: t('propertyTypes.house'),
    villa: t('propertyTypes.villa'),
    commercial: t('propertyTypes.commercial'),
    land: t('propertyTypes.land'),
    hotel: t('home.propertyTypes.hotel'),
  };

  const statusLabels: Record<string, string> = {
    sale: t('propertyStatus.sale'),
    rent: t('propertyStatus.rent'),
    daily_rent: t('propertyStatus.daily_rent'),
    pledge: t('home.dealTypes.mortgage'),
    both: `${t('propertyStatus.sale')} / ${t('propertyStatus.rent')}`,
  };
  const statusLabel = statusLabels[property.status] ?? property.status;
  const unit = t('home.areaUnit');
  const metres = locale === 'ka' ? 'მ' : 'm';

  const buildingStatusLabels: Record<string, string> = {
    new: t('property.buildingNew'),
    old: t('property.buildingOld'),
    under: t('property.buildingUnder'),
  };

  const isSale = property.status === 'sale' || property.status === 'both';
  const moneyFrom = listingMoneyFrom(property);
  const price = formatMoney(property.price, { ...moneyFrom, perMonth: property.status === 'rent' });
  /* A property can be offered for sale and for rent at once. */
  const rentPrice = property.status === 'both' && property.rentPrice
    ? formatMoney(property.rentPrice, { ...moneyFrom, perMonth: true })
    : null;
  const addressLine = formatPublicLocationLine(
    property.address,
    property.district,
    property.city,
    property.showAddress,
  );
  const description = (property.description ?? '').trim();
  const isLong = description.length > CLAMP_AT_CHARS;

  /* Imported feeds occasionally repeat the same amenity. */
  const features = publicListingFeatures(property.features);
  const verified = listingIsVerified(property);
  const amenities = [...new Set(property.amenities)];

  const similar = similarListings(property, allProperties, listingToGel, 4);
  const insight = SHOW_PRICE_INSIGHT ? priceInsight(property, allProperties, listingToGel) : null;
  const locationKnown = hasKnownLocation(property);
  const buildingCode = property.buildingStatus ?? listingBuildingCode(property.features);
  // Imported listings often have no agent number; the office line answers for them.
  const contactPhone = property.agent.phone?.trim() || CONTACT.mobile.tel;
  const contactEmail = property.agent.email?.trim() || CONTACT.email;
  const waNumber = whatsappNumber(contactPhone);
  const waHref = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`${property.title} — ${window.location.origin}${propertyHref(property)}`)}`
    : null;
  const phoneLabel = formatPhone(contactPhone);
  const similarHref = listingsHref({
    status: property.status === 'both' ? 'sale' : property.status,
    type: property.type,
    city: property.city,
    district: property.district,
  });

  const cardPrice = (p: typeof property) => formatMoney(p.price, { ...listingMoneyFrom(p), perMonth: p.status === 'rent' });
  const cardPricePerSqm = (p: typeof property) =>
    formatMoney(Math.round(p.price / Math.max(p.area, 1)), { ...listingMoneyFrom(p), perSqm: true });

  const facts = [
    { icon: Square, value: `${property.area} ${unit}`, label: t('property.areaFull') },
    property.landArea ? { icon: TreePine, value: `${property.landArea} ${unit}`, label: t('property.landAreaFull') } : null,
    property.rooms ? { icon: Layers, value: String(property.rooms), label: t('property.rooms') } : null,
    property.bedrooms > 0 ? { icon: Bed, value: String(property.bedrooms), label: t('property.bedroomsFull') } : null,
    property.bathrooms > 0 ? { icon: Bath, value: String(property.bathrooms), label: t('property.bathroomFull') } : null,
    property.floor != null ? { icon: Building2, value: `${property.floor}${property.totalFloors ? `/${property.totalFloors}` : ''}`, label: t('property.floorFull') } : null,
    property.ceilingHeight ? { icon: Ruler, value: `${property.ceilingHeight} ${metres}`, label: t('property.ceilingHeight') } : null,
  ].filter(Boolean) as { icon: typeof Square; value: string; label: string }[];

  const list = (values?: string[]) => (values && values.length > 0 ? values.join(', ') : null);

  const specGroups = [
    {
      legend: t('property.groupBuilding'),
      rows: [
        { label: t('property.listingType'), value: typeLabels[property.type] },
        { label: t('property.status'), value: statusLabel },
        buildingCode ? { label: t('property.buildingStatus'), value: buildingStatusLabels[buildingCode] } : null,
        property.yearBuilt ? { label: t('property.yearBuiltFull'), value: String(property.yearBuilt) } : null,
        property.projectType ? { label: t('property.projectType'), value: property.projectType } : null,
        { label: t('property.materials'), value: list(property.buildingMaterials) },
        { label: t('property.buildingFeatures'), value: list(property.buildingFeatures) },
      ],
    },
    {
      legend: t('property.groupInterior'),
      rows: [
        { label: t('property.areaFull'), value: `${property.area} ${unit}` },
        property.landArea ? { label: t('property.landAreaFull'), value: `${property.landArea} ${unit}` } : null,
        property.floor != null ? { label: t('property.floorFull'), value: `${property.floor}${property.totalFloors ? `/${property.totalFloors}` : ''}` } : null,
        property.condition ? { label: t('property.condition'), value: property.condition } : null,
        property.balconyCount ? { label: t('property.balcony'), value: `${property.balconyCount}${property.balconyArea ? ` · ${property.balconyArea} ${unit}` : ''}` } : null,
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
        property.cadastralCode
          ? { label: t('property.cadastralCode'), value: property.cadastralCode }
          : null,
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
            <Link to={listingsHref()}>{t('property.listing')}</Link>
            <span>/</span>
            <Link to={listingsHref({ city: property.city, district: property.district })}>
              {property.district}
            </Link>
            <span>/</span>
            <strong>{seo?.h1 ?? property.title}</strong>
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
                onClick={() => {
                  if (touch.current?.swiped) { touch.current = null; return; }
                  setShowGallery(true);
                }}
                onTouchStart={event => {
                  const p = event.touches[0];
                  touch.current = { x: p.clientX, y: p.clientY, swiped: false };
                }}
                onTouchEnd={event => {
                  const start = touch.current;
                  if (!start) return;
                  const p = event.changedTouches[0];
                  const dx = p.clientX - start.x;
                  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(p.clientY - start.y)) {
                    start.swiped = true;
                    step(dx < 0 ? 1 : -1);
                  }
                }}
                aria-label={t('property.showAllPhotos')}
              >
                <img src={images[activeImage]} alt={property.title} />
                <span className="pdp-gallery__shade" aria-hidden="true" />
              </button>

              <span className="pdp-badges">
                {verified && <VerifiedListingBadge />}
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
                    aria-label={`${t('property.showAllPhotos')} · ${i + 2} / ${imageCount}`}
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
              <span className={`pdp-chip ${isSale ? 'is-sale' : 'is-rent'}`}>{statusLabel}</span>
              <span className="pdp-chip">
                <Building2 size={11} strokeWidth={2.2} />{typeLabels[property.type] ?? property.type}
              </span>
              <span className="pdp-chip">
                <Eye size={11} strokeWidth={2.2} />{property.viewCount.toLocaleString()} {t('property.views')}
              </span>
              <span className="pdp-chip">
                <Calendar size={11} strokeWidth={2.2} />{t('property.postedOn')} {formatShortDate(property.listedDate, locale)}
              </span>
            </div>

            <h1 className="pdp-title">{seo?.h1 ?? property.title}</h1>

            <button type="button" className="pdp-address" onClick={() => goTo('location')}>
              <MapPin size={14} strokeWidth={2.4} />
              <span>{addressLine}</span>
              <ArrowUpRight size={13} strokeWidth={2.6} />
            </button>
            {verified && <VerifiedListingBadge variant="detail" />}
          </div>

          <div className="pdp-head__side">
            <div className="pdp-price">
              <p className="pdp-price__value">{price}</p>
              {rentPrice && <p className="pdp-price__rent">{rentPrice}</p>}
              {isSale && (
                <p className="pdp-price__sqm">{formatMoney(property.pricePerSqm, { ...moneyFrom, perSqm: true })}</p>
              )}
              <PriceCurrencyToggle className="pdp-price__fx" />
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

            {/* Price against the neighbourhood */}
            {insight && (
              <section className="pdp-section" id="insight">
                <div className="pdp-card pdp-insight">
                  <div className="pdp-insight__head">
                    <span className={`pdp-insight__icon ${insight.diffPct <= -5 ? 'is-good' : insight.diffPct >= 5 ? 'is-high' : ''}`}>
                      {insight.diffPct >= 5 ? <TrendingUp size={18} strokeWidth={2.2} /> : <TrendingDown size={18} strokeWidth={2.2} />}
                    </span>
                    <div>
                      <p className="pdp-insight__eyebrow">{t('property.insight.title')}</p>
                      <h2 className="pdp-insight__title">
                        {insight.diffPct <= -5
                          ? t('property.insight.cheaper', { pct: Math.abs(insight.diffPct) })
                          : insight.diffPct >= 5
                            ? t('property.insight.pricier', { pct: insight.diffPct })
                            : t('property.insight.average')}
                      </h2>
                      <p className="pdp-insight__basis">{t('property.insight.basis', { district: property.district, n: insight.sample })}</p>
                    </div>
                  </div>

                  <div className="pdp-insight__bar" aria-hidden>
                    <span className="pdp-insight__track" />
                    {[
                      { key: 'median', value: insight.median, label: t('property.insight.median') },
                      { key: 'own', value: insight.own, label: t('property.insight.thisListing') },
                    ].map(mark => {
                      const span = insight.max - insight.min || 1;
                      const left = Math.min(Math.max(((mark.value - insight.min) / span) * 100, 0), 100);
                      return (
                        <span
                          key={mark.key}
                          className={`pdp-insight__mark is-${mark.key}`}
                          data-align={left < 18 ? 'start' : left > 82 ? 'end' : 'center'}
                          style={{ left: `${left}%` }}
                        >
                          <em>{mark.label}</em>
                          <strong>{formatMoney(Math.round(mark.value), { perSqm: true })}</strong>
                        </span>
                      );
                    })}
                  </div>
                  <div className="pdp-insight__scale">
                    <span>{t('property.insight.low')} · {formatMoney(Math.round(insight.min), { perSqm: true })}</span>
                    <span>{formatMoney(Math.round(insight.max), { perSqm: true })} · {t('property.insight.high')}</span>
                  </div>
                </div>
              </section>
            )}

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
                {locationKnown ? (
                  <PropertyMap
                    lat={property.coordinates.lat}
                    lng={property.coordinates.lng}
                    address={addressLine}
                    district={property.district}
                    city={property.city}
                    height={320}
                  />
                ) : (
                  /* The saved point is only a city-centre fallback: showing it as a pin would mislead. */
                  <div className="pdp-noloc">
                    <span className="pdp-noloc__icon"><MapPin size={22} strokeWidth={2} /></span>
                    <p className="pdp-noloc__title">{t('property.locationUnknown')}</p>
                    <p className="pdp-noloc__hint">
                      {t('property.locationUnknownHint', { area: [property.district, property.city].filter(Boolean).join(', ') })}
                    </p>
                  </div>
                )}
                <div className="pdp-map-foot">
                  <p><MapPin size={14} strokeWidth={2.4} />{addressLine}</p>
                  <Link
                    className="pdp-map-link"
                    to={listingsHref({ city: property.city, district: property.district })}
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
                          aria-label={slider.label}
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
                      <p className="pdp-calc__value">{formatMoney(Math.round(monthlyPayment), moneyFrom)}</p>
                      <p className="pdp-calc__label">{t('property.monthlyEstimate')}</p>
                    </div>
                    <div className="pdp-calc__stat">
                      <p className="pdp-calc__value">{formatMoney(Math.round(property.price * downPayment / 100), moneyFrom)}</p>
                      <p className="pdp-calc__label">{t('property.downPayment')}</p>
                    </div>
                    <div className="pdp-calc__stat">
                      <p className="pdp-calc__value">{formatMoney(Math.round(loanPrincipal), moneyFrom)}</p>
                      <p className="pdp-calc__label">{t('property.loanAmount')}</p>
                    </div>
                  </div>
                  <p className="pdp-calc__hint">{t('property.mortgageHint')}</p>
                </div>
              </section>
            )}

            {/* Similar */}
            {similar.length > 0 && (
            <section className="pdp-section" id="similar">
              <div className="pdp-similar-head">
                <h2 className="pdp-card__title">{t('property.similar')}</h2>
                <Link to={similarHref} className="pdp-map-link">
                  {t('property.similarAll')} <ArrowRight size={13} strokeWidth={2.6} />
                </Link>
              </div>
              <div className="pdp-similar-grid">
                {similar.map(item => (
                  <ListingMapRow key={item.id} property={item} formatPrice={cardPrice} formatPricePerSqm={cardPricePerSqm} />
                ))}
              </div>
            </section>
            )}
          </main>

          {/* ── Sticky contact rail ── */}
          <aside className="pdp-aside">
            <div className="pdp-aside__card">
              <div className="pdp-aside__price">
                <div className="pdp-aside__price-row">
                  <div>
                    <p className="pdp-price__value">{price}</p>
                    {rentPrice && <p className="pdp-price__rent">{rentPrice}</p>}
                    {isSale && (
                      <p className="pdp-price__sqm">{formatMoney(property.pricePerSqm, { ...moneyFrom, perSqm: true })}</p>
                    )}
                  </div>
                  <PriceCurrencyToggle align="start" showRate={false} />
                </div>
              </div>

              <div className="pdp-agent">
                {property.agent.photo ? (
                  <img className="pdp-agent__photo" src={avatarUrl(property.agent.photo, 96)} alt={property.agent.name} />
                ) : (
                  <div className="pdp-agent__photo pdp-agent__initials" aria-hidden>
                    {personInitials(property.agent.name)}
                  </div>
                )}
                <div className="pdp-agent__info">
                  <p className="pdp-agent__name">{property.agent.name}</p>
                  {property.agent.reviewCount > 0 && (
                    <p className="pdp-agent__meta">
                      <Star size={11} fill="currentColor" />
                      {property.agent.rating} · {property.agent.reviewCount} {t('property.agentRating')}
                    </p>
                  )}
                  {property.agent.verified && (
                    <p className="pdp-agent__verified">
                      <CheckCircle2 size={11} strokeWidth={2.6} />{t('common.verified')}
                    </p>
                  )}
                </div>
                {property.agent.id && property.agent.id !== 'agency' && (
                  <Link className="pdp-agent__link" to={`/agent/${property.agent.id}`}>
                    {t('property.profile')}
                  </Link>
                )}
              </div>

              <div className="pdp-ctas">
                <a className="pdp-cta is-call" href={`tel:${contactPhone}`}>
                  <Phone size={16} strokeWidth={2.2} />{phoneLabel}
                </a>
                <div className="pdp-cta-row">
                  {waHref && (
                    <a className="pdp-cta is-wa" href={waHref} target="_blank" rel="noopener noreferrer">
                      <MessageCircle size={15} strokeWidth={2.2} />{t('property.whatsapp')}
                    </a>
                  )}
                  {contactEmail && (
                    <a className="pdp-cta is-mail" href={`mailto:${contactEmail}`}>
                      <Mail size={15} strokeWidth={2.2} />{t('common.email')}
                    </a>
                  )}
                </div>
                <button type="button" className="pdp-cta is-book" onClick={() => setShowBooking(true)}>
                  <Calendar size={15} strokeWidth={2.2} />{t('property.bookViewing')}
                </button>
                <div className="pdp-split">
                  <button
                    type="button"
                    className={`pdp-split__lane is-save ${isFavorited ? 'is-on' : ''}`}
                    onClick={toggleFavorite}
                  >
                    <span className="pdp-split__icon">
                      <Heart size={15} strokeWidth={2.3} style={{ fill: isFavorited ? 'currentColor' : 'none' }} />
                    </span>
                    {t('property.save')}
                  </button>
                  <button type="button" className="pdp-split__lane is-share" onClick={share}>
                    <span className="pdp-split__icon">
                      <Share2 size={15} strokeWidth={2.3} />
                    </span>
                    {copied ? t('property.linkCopied') : t('property.share')}
                  </button>
                </div>
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
          <div className="pdp-bar__price-top">
            <p className="pdp-bar__value">{price}</p>
            <PriceCurrencyToggle align="start" showRate={false} className="pdp-bar__fx" />
          </div>
          {isSale && <p className="pdp-bar__sqm">{formatMoney(property.pricePerSqm, { ...moneyFrom, perSqm: true })}</p>}
        </div>
        {waHref && (
          <a className="pdp-bar__wa" href={waHref} target="_blank" rel="noopener noreferrer" aria-label={t('property.whatsapp')}>
            <MessageCircle size={18} strokeWidth={2.2} />
          </a>
        )}
        <a className="pdp-bar__call" href={`tel:${contactPhone}`}>
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
