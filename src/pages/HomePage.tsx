import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Search, MapPin, ChevronDown, ChevronLeft, ChevronRight, ArrowRight,
  Sparkles, X, Tag, Home, Maximize2, DollarSign,
  Bed, Bath, SlidersHorizontal,
  Square, Heart, Rocket, HardHat, BookOpen, HelpCircle, Clock, BadgePercent,
} from 'lucide-react';
import { constructionProjects, faqItems } from '../data/mockData';
import type { Property, BlogPost } from '../types/listing';
import { useProperties, useBlogPosts } from '../hooks/usePublicData';
import { useCurrency } from '../contexts/CurrencyContext';
import { useLocale, useTranslation } from '../i18n/LocaleContext';
import { cityFilterOptions, propertyTypeFilterOptions, dealTypeOptions, bedroomOptions } from '../i18n/labels';
import { districtLabel, findCityArea, findDistrictArea } from '../data/districts';
import ConstructionProjectCard from '../components/ConstructionProjectCard';

/** Areas promoted in the search box, resolved against the district dictionary. */
const POPULAR_AREAS = [
  { city: 'თბილისი', district: 'ვაკე', count: 842 },
  { city: 'თბილისი', district: 'საბურთალო', count: 614 },
  { city: 'თბილისი', district: 'ისანი', count: 398 },
  { city: 'თბილისი', district: 'ნაძალადევი', count: 271 },
  { city: 'ბათუმი', district: 'რუსთაველი', count: 503 },
  { city: 'ბათუმი', district: 'ძველი ბათუმი', count: 389 },
] as const;

/* ────────────────────────────────────────────────────────────────────────── */

function InViewFade({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

type SectionAccent = 'blue' | 'green';

const SECTION_ACCENTS: Record<SectionAccent, { color: string }> = {
  blue: { color: '#2563eb' },
  green: { color: '#10B981' },
};

function SectionIcon({
  icon: Icon,
  color,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties; color?: string }>;
  color: string;
}) {
  return (
    <div
      className="flex items-center justify-center flex-shrink-0 w-8 h-8 sm:w-[38px] sm:h-[38px] rounded-[9px] sm:rounded-[11px]"
      style={{
        border: `2px solid ${color}`,
        background: 'transparent',
      }}
    >
      <Icon size={16} strokeWidth={2.5} style={{ color }} />
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  accent = 'blue',
  linkTo,
  linkLabel,
  align = 'left',
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties; color?: string }>;
  title: string;
  accent?: SectionAccent;
  linkTo?: string;
  linkLabel?: string;
  align?: 'left' | 'center';
}) {
  const a = SECTION_ACCENTS[accent];
  const centered = align === 'center';

  const cta = linkTo && linkLabel ? (
    <Link
      to={linkTo}
      className="group inline-flex items-center gap-1 text-[13px] font-semibold flex-shrink-0 transition-opacity duration-200 hover:opacity-70"
      style={{ color: a.color }}
    >
      {linkLabel}
      <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  ) : null;

  if (centered) {
    return (
      <header className="mb-8 sm:mb-10 flex flex-col items-center text-center">
        <div className="mb-3">
          <SectionIcon icon={Icon} color={a.color} />
        </div>
        <h2
          className="font-extrabold"
          style={{ fontSize: 'clamp(18px, 4.2vw, 28px)', color: '#14161a', lineHeight: 1.18, letterSpacing: '-0.02em' }}
        >
          {title}
        </h2>
      </header>
    );
  }

  return (
    <header className="mb-5 sm:mb-8 flex items-center justify-between gap-4 sm:gap-5">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <SectionIcon icon={Icon} color={a.color} />
        <h2
          className="font-extrabold min-w-0"
          style={{ fontSize: 'clamp(17px, 4vw, 27px)', color: '#14161a', lineHeight: 1.18, letterSpacing: '-0.02em' }}
        >
          {title}
        </h2>
      </div>

      {cta}
    </header>
  );
}

function BlogCard({ post }: { post: BlogPost }) {
  const { t } = useTranslation();
  return (
    <Link
      to={`/blog/${post.id}`}
      className="group flex flex-col h-full rounded-2xl overflow-hidden bg-white"
      style={{
        border: '1px solid #eceef0',
        transition: 'border-color 0.22s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(37, 99, 235,0.35)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = '#eceef0';
      }}
    >
      <div className="relative aspect-[4/3] overflow-hidden flex-shrink-0">
        <img
          src={post.image}
          alt={post.title}
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(10,13,20,0.45) 0%, transparent 55%)' }}
        />
        <span
          className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold"
          style={{ background: 'rgba(255,255,255,0.95)', color: '#2563eb' }}
        >
          {post.category}
        </span>
        <span
          className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold"
          style={{ background: 'rgba(0,0,0,0.45)', color: '#fff', backdropFilter: 'blur(6px)' }}
        >
          <Clock size={10} />
          {t('home.readTime', { min: post.readTime })}
        </span>
      </div>

      <div className="flex flex-col flex-1 p-5">
        <h3
          className="font-bold text-[15px] leading-snug line-clamp-2 group-hover:text-[#2563eb] transition-colors"
          style={{ color: '#191c1e', minHeight: '2.75rem' }}
        >
          {post.title}
        </h3>
        <p
          className="mt-2 text-[13px] leading-relaxed line-clamp-2"
          style={{ color: '#76777d', minHeight: '2.5rem' }}
        >
          {post.excerpt}
        </p>

        <div
          className="mt-auto pt-4 flex items-center justify-between gap-3"
          style={{ borderTop: '1px solid #eceef0' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={post.author.photo}
              alt={post.author.name}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0"
              style={{ border: '1.5px solid #eceef0' }}
            />
            <span className="text-[12px] font-semibold truncate" style={{ color: '#45464d' }}>
              {post.author.name}
            </span>
          </div>
          <span
            className="flex items-center gap-1 text-[12px] font-semibold flex-shrink-0 group-hover:gap-1.5 transition-all"
            style={{ color: '#2563eb' }}
          >
            წაიკითხე
            <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}

type AdVariant = 'navy' | 'blue' | 'light';

const AD_THEMES: Record<AdVariant, {
  bg: string;
  accent: string;
  title: string;
  subtitle: string;
  ctaBg: string;
  ctaColor: string;
  border?: string;
}> = {
  navy: {
    bg: 'linear-gradient(135deg, #131b2e 0%, #1a2d5a 60%, #131b2e 100%)',
    accent: '#2563eb',
    title: '#fff',
    subtitle: 'rgba(255,255,255,0.55)',
    ctaBg: '#2563eb',
    ctaColor: '#fff',
  },
  blue: {
    bg: 'linear-gradient(135deg, #1e3a6e 0%, #2563eb 100%)',
    accent: 'rgba(255,255,255,0.75)',
    title: '#fff',
    subtitle: 'rgba(255,255,255,0.65)',
    ctaBg: '#fff',
    ctaColor: '#1e3a6e',
  },
  light: {
    bg: '#fff',
    accent: '#2563eb',
    title: '#14161a',
    subtitle: '#76777d',
    ctaBg: '#2563eb',
    ctaColor: '#fff',
    border: '1px solid #eceef0',
  },
};

function AdBanner({
  sponsor,
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  variant = 'navy',
  image,
  icon: Icon = BadgePercent,
}: {
  sponsor: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  variant?: AdVariant;
  image?: string;
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties; color?: string }>;
}) {
  const { t: tr } = useTranslation();
  const t = AD_THEMES[variant];

  return (
    <Link
      to={ctaHref}
      className="group relative flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8 rounded-2xl overflow-hidden px-6 sm:px-8 py-6 sm:py-7"
      style={{
        background: t.bg,
        border: t.border,
        transition: 'border-color 0.22s ease',
      }}
    >
      <span
        className="absolute top-3 right-3 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest"
        style={{
          color: variant === 'light' ? '#9ea0a7' : 'rgba(255,255,255,0.35)',
          background: variant === 'light' ? '#f2f4f6' : 'rgba(255,255,255,0.08)',
        }}
      >
        {tr('home.ads.sponsored')}
      </span>

      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          border: `2px solid ${variant === 'light' ? '#2563eb' : 'rgba(255,255,255,0.25)'}`,
          background: variant === 'light' ? 'rgba(37, 99, 235,0.08)' : 'rgba(255,255,255,0.08)',
        }}
      >
        <Icon size={22} strokeWidth={2.2} style={{ color: variant === 'light' ? '#2563eb' : '#fff' }} />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className="text-[10px] font-bold uppercase tracking-wider mb-1"
          style={{ color: t.accent }}
        >
          {sponsor}
        </p>
        <h3
          className="font-extrabold leading-tight"
          style={{ fontSize: 'clamp(17px, 2vw, 22px)', color: t.title, letterSpacing: '-0.02em' }}
        >
          {title}
        </h3>
        <p className="mt-1 text-[13px] leading-snug" style={{ color: t.subtitle }}>
          {subtitle}
        </p>
      </div>

      {image && (
        <div
          className="hidden md:block flex-shrink-0 rounded-xl overflow-hidden"
          style={{
            width: 140,
            height: 80,
            border: variant === 'light' ? '1px solid #eceef0' : '2px solid rgba(255,255,255,0.15)',
          }}
        >
          <img src={image} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <span
        className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-[13px] font-bold flex-shrink-0 transition-transform duration-200 group-hover:scale-[1.02]"
        style={{ background: t.ctaBg, color: t.ctaColor }}
      >
        {ctaLabel}
        <ArrowRight size={14} strokeWidth={2.5} />
      </span>
    </Link>
  );
}

function AdStrip({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <div className="py-8 sm:py-10" style={{ background: bg }}>
      <div className="container-xl">
        <InViewFade>{children}</InViewFade>
      </div>
    </div>
  );
}

/* ─────────────── Compact card (6-per-row) — VIP & New ─────────────────── */
type CardBadge = 'vip' | 'new';

function VipListingCard({ property, badge = 'vip' }: { property: Property; badge?: CardBadge }) {
  const { t } = useTranslation();
  const [liked, setLiked] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const badgeCfg = {
    vip: { bg: 'linear-gradient(135deg, #2563eb 0%, #3458d8 100%)', color: '#fff', icon: <Rocket size={8} strokeWidth={3} />, label: t('home.superVip') },
    new: { bg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#fff', icon: <Sparkles size={8} strokeWidth={3} />, label: t('common.new') },
  };
  const cfg = badgeCfg[badge];
  const images = property.images;
  const accentColor = badge === 'vip' ? '#2563eb' : '#059669';
  const { formatMoney } = useCurrency();

  const priceLabel = formatMoney(property.price, { perMonth: property.status === 'rent' });

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (images.length <= 1) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 0.999);
    setImgIndex(Math.floor(ratio * images.length));
  };

  return (
    <Link
      ref={cardRef}
      to={`/property/${property.id}`}
      className="group relative flex flex-col h-full rounded-2xl overflow-hidden bg-white"
      style={{
        border: `1px solid ${hovered ? `${accentColor}45` : '#eceef0'}`,
        transition: 'border-color 0.25s ease',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setImgIndex(0); }}
    >
      {/* ── Image area ── */}
      <div className="relative overflow-hidden flex-shrink-0" style={{ aspectRatio: '4/3' }}>
        {images.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={i === 0 ? property.title : ''}
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              opacity: i === imgIndex ? 1 : 0,
              transition: 'opacity 0.12s ease',
              transform: hovered ? 'scale(1.04)' : 'scale(1)',
              transitionProperty: 'opacity, transform',
              transitionDuration: '0.12s, 0.4s',
            }}
            draggable={false}
          />
        ))}

        {/* Photo scrub bars */}
        {images.length > 1 && (
          <div className="absolute top-2 left-2.5 right-2.5 z-20 flex gap-0.5 pointer-events-none">
            {images.map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-full transition-all duration-150"
                style={{
                  height: 2.5,
                  background: i === imgIndex ? '#fff' : 'rgba(255,255,255,0.45)',
                  boxShadow: i === imgIndex ? '0 0 4px rgba(0,0,0,0.35)' : 'none',
                }}
              />
            ))}
          </div>
        )}

        {/* Subtle base shade for badge legibility */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 28%)' }}
        />

        {/* Badge — top left */}
        <div className="absolute top-2.5 left-2.5">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: cfg.bg, color: cfg.color, letterSpacing: '0.03em' }}
          >
            {cfg.icon} {cfg.label}
          </span>
        </div>

        {/* Heart — top right */}
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); setLiked(l => !l); }}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-200"
          style={{
            background: liked ? '#ef4444' : 'rgba(255,255,255,0.92)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.16)',
          }}
        >
          <Heart size={12} strokeWidth={2} style={{ color: liked ? '#fff' : '#76777d', fill: liked ? '#fff' : 'none' }} />
        </button>

        {/* Status — bottom left over image */}
        <div className="absolute bottom-2.5 left-2.5">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: 'rgba(15,17,20,0.55)', color: '#fff', backdropFilter: 'blur(6px)' }}
          >
            {property.status === 'sale' ? t('propertyStatus.sale') : t('propertyStatus.rent')}
          </span>
        </div>
      </div>

      {/* ── White content area ── */}
      <div className="flex flex-col flex-1 p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="font-extrabold" style={{ fontSize: 16, color: '#191c1e', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
            {priceLabel}
          </span>
          {property.floor && (
            <span className="text-[10px] font-semibold flex-shrink-0 mt-0.5" style={{ color: '#9ea0a7' }}>
              {property.floor}/{property.totalFloors} {t('property.floorShort')}
            </span>
          )}
        </div>

        <p
          className="font-semibold line-clamp-1 leading-snug mb-1.5 transition-colors duration-200"
          style={{ fontSize: 12.5, color: hovered ? accentColor : '#45464d' }}
        >
          {property.title}
        </p>

        <div className="flex items-center gap-1 mb-2.5">
          <MapPin size={10} strokeWidth={2} style={{ color: accentColor, flexShrink: 0 }} />
          <span className="truncate text-[11px] font-medium" style={{ color: '#9ea0a7' }}>
            {property.district}, {property.city}
          </span>
        </div>

        {/* Stats row */}
        <div className="mt-auto flex items-center gap-0 pt-2" style={{ borderTop: '1px solid #f0f2f5' }}>
          {property.bedrooms > 0 && (
            <div className="flex items-center gap-1 pr-2.5" style={{ borderRight: '1px solid #f0f2f5' }}>
              <Bed size={11} strokeWidth={2} style={{ color: '#b0b2ba' }} />
              <span className="text-[11px] font-bold" style={{ color: '#191c1e' }}>{property.bedrooms}</span>
            </div>
          )}
          <div className="flex items-center gap-1 px-2.5" style={{ borderRight: '1px solid #f0f2f5' }}>
            <Bath size={11} strokeWidth={2} style={{ color: '#b0b2ba' }} />
            <span className="text-[11px] font-bold" style={{ color: '#191c1e' }}>{property.bathrooms}</span>
          </div>
          <div className="flex items-center gap-1 px-2.5">
            <Square size={11} strokeWidth={2} style={{ color: '#b0b2ba' }} />
            <span className="text-[11px] font-bold" style={{ color: '#191c1e' }}>{property.area}მ²</span>
          </div>
          <ArrowRight
            size={13}
            strokeWidth={2.5}
            className="ml-auto transition-colors duration-200"
            style={{ color: hovered ? accentColor : '#c0c2ca' }}
          />
        </div>
      </div>
    </Link>
  );
}

/* ─────────────── Horizontal listing slider ─────────────────────────────── */
function ListingSlider({
  items,
  badge = 'vip',
}: {
  items: Property[];
  badge?: CardBadge;
}) {
  const { t } = useTranslation();
  const trackRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [items]);

  const accent = badge === 'vip'
    ? { main: '#2563eb', soft: 'rgba(37, 99, 235,0.10)', ring: 'rgba(37, 99, 235,0.28)' }
    : { main: '#059669', soft: 'rgba(5,150,105,0.10)', ring: 'rgba(5,150,105,0.28)' };

  const scroll = (dir: 'left' | 'right') => {
    const el = trackRef.current;
    if (!el) return;
    const slide = el.querySelector('[data-slide]') as HTMLElement | null;
    const step = slide ? slide.offsetWidth + 12 : el.clientWidth * 0.6;
    el.scrollBy({ left: dir === 'left' ? -step * 2 : step * 2, behavior: 'smooth' });
  };

  const NavBtn = ({ dir }: { dir: 'left' | 'right' }) => {
    const enabled = dir === 'left' ? canLeft : canRight;
    return (
      <button
        type="button"
        onClick={() => scroll(dir)}
        disabled={!enabled}
        aria-label={dir === 'left' ? t('home.prev') : t('home.next')}
        className={[
          'absolute top-1/2 -translate-y-1/2 z-10 hidden sm:flex items-center justify-center rounded-full',
          'opacity-0 group-hover/slider:opacity-100 transition-all duration-200',
          enabled ? 'group-hover/slider:pointer-events-auto pointer-events-none' : 'pointer-events-none',
        ].join(' ')}
        style={{
          width: 40,
          height: 40,
          left: dir === 'left' ? 10 : undefined,
          right: dir === 'right' ? 10 : undefined,
          background: '#fff',
          border: `1px solid ${accent.ring}`,
          boxShadow: '0 4px 16px rgba(15,23,42,0.10)',
        }}
        onMouseEnter={e => {
          if (!enabled) return;
          (e.currentTarget as HTMLElement).style.background = accent.soft;
          (e.currentTarget as HTMLElement).style.borderColor = accent.main;
        }}
        onMouseLeave={e => {
          if (!enabled) return;
          (e.currentTarget as HTMLElement).style.background = '#fff';
          (e.currentTarget as HTMLElement).style.borderColor = accent.ring;
        }}
      >
        {dir === 'left'
          ? <ChevronLeft size={18} strokeWidth={2.5} style={{ color: accent.main }} />
          : <ChevronRight size={18} strokeWidth={2.5} style={{ color: accent.main }} />
        }
      </button>
    );
  };

  return (
    <div className="group/slider relative w-full">
      {canLeft && <NavBtn dir="left" />}
      {canRight && <NavBtn dir="right" />}

      <div
        ref={trackRef}
        className="listing-slider flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map(p => (
          <div
            key={p.id}
            data-slide
            className="flex-shrink-0 snap-start w-[calc((100%-12px)/2)] sm:w-[calc((100%-24px)/3)] lg:w-[calc((100%-48px)/5)]"
          >
            <VipListingCard property={p} badge={badge} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export default function HomePage() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const { data: properties } = useProperties();
  const { data: blogPosts } = useBlogPosts();
  const propertyTypeOpts = useMemo(() => propertyTypeFilterOptions(t), [t]);
  const propertyTypeShortOpts = useMemo(() => propertyTypeFilterOptions(t, true), [t]);
  const dealTypeOpts = useMemo(() => dealTypeOptions(t), [t]);
  const bedroomOpts = useMemo(() => bedroomOptions(t), [t]);
  const cityOpts = useMemo(() => cityFilterOptions(t), [t]);
  const [tab, setTab] = useState<'sale' | 'rent'>('sale');
  const [form, setForm] = useState({
    city: '', district: '', type: '', bedrooms: '',
    priceMin: '', priceMax: '',
    areaMin: '', areaMax: '',
    propType: '',
  });

  const popularAreas = useMemo(
    () =>
      POPULAR_AREAS.map(area => {
        const city = findCityArea(area.city);
        const district = findDistrictArea(city, area.district);
        return {
          ...area,
          label: district ? districtLabel(district, locale) : area.district,
          cityLabel: city ? t(city.labelKey) : area.city,
        };
      }),
    [locale, t],
  );

  /** "Vake, Tbilisi" in the location field, in the active language. */
  const locationLabel = useMemo(() => {
    const city = findCityArea(form.city);
    const district = findDistrictArea(city, form.district);
    return [
      district ? districtLabel(district, locale) : form.district,
      city ? t(city.labelKey) : form.city,
    ].filter(Boolean).join(', ');
  }, [form.city, form.district, locale, t]);
  const [openField, setOpenField] = useState<string | null>(null);
  const [mobileSheet, setMobileSheet] = useState<'location' | 'beds' | 'price' | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchPanelRef.current && !searchPanelRef.current.contains(e.target as Node)) setOpenField(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (!mobileSheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mobileSheet]);

  const [openFaq, setOpenFaq] = useState<string | null>(faqItems[0]?.id ?? null);
  const featured = useMemo(() => properties.filter(p => p.isFeatured).slice(0, 12), [properties]);
  const newest = useMemo(() => properties.filter(p => p.isNew).slice(0, 12), [properties]);
  const handleSearch = () => {
    const p = new URLSearchParams({ status: tab, city: form.city, district: form.district, type: form.propType || form.type, bedrooms: form.bedrooms, priceMin: form.priceMin, priceMax: form.priceMax, areaMin: form.areaMin, areaMax: form.areaMax });
    p.forEach((v, k) => { if (!v) p.delete(k); });
    navigate(`/listings?${p}`);
    setFilterModalOpen(false);
  };
  const clearFilters = () => setForm({ city: '', district: '', type: '', bedrooms: '', priceMin: '', priceMax: '', areaMin: '', areaMax: '', propType: '' });

  return (
    <div className="min-h-screen" style={{ background: '#f7f9fb' }}>

      {/* ══════════════════════════════════════════════════════
          HERO — contained, border-radius background
      ══════════════════════════════════════════════════════ */}
      <section className="pt-[56px] lg:pt-[106px] pb-4 sm:pb-8" style={{ background: '#f7f9fb' }}>
        <div className="container-xl pt-2 lg:pt-3">
          <div className="relative">

            {/* ── Hero image ── */}
            <div
              className="relative overflow-hidden min-h-[300px] sm:min-h-[360px] lg:min-h-[520px] rounded-2xl lg:rounded-[2rem]"
            >
              <motion.img
                src="/5e6a55c3201bd.jpg"
                alt="Hero"
                className="absolute inset-0 w-full h-full object-cover object-center"
                initial={{ scale: 1.08 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
              />
              <div
                className="absolute inset-0 lg:hidden"
                style={{ background: 'linear-gradient(180deg, rgba(8,10,18,0.15) 0%, rgba(8,10,18,0.45) 55%, rgba(8,10,18,0.82) 100%)' }}
              />
              <div
                className="absolute inset-0 hidden lg:block"
                style={{ background: 'linear-gradient(180deg, rgba(8,10,18,0.18) 0%, rgba(8,10,18,0.55) 100%)' }}
              />

              {/* Mobile hero copy */}
              <div className="lg:hidden absolute inset-0 flex flex-col justify-end px-4 pb-5 sm:px-5 sm:pb-6">
                <div
                  className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full mb-3"
                  style={{ background: 'rgba(16,185,129,0.18)', border: '1px solid rgba(16,185,129,0.35)' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  <span className="text-[10px] font-bold tracking-wide uppercase" style={{ color: '#6ee7b7' }}>{t('home.liveCount')}</span>
                </div>
                <h1 className="text-white font-extrabold text-[1.65rem] sm:text-[2rem] leading-[1.15] max-w-[16rem] sm:max-w-xs" style={{ textShadow: '0 2px 16px rgba(0,0,0,0.45)' }}>
                  {t('home.heroTitle')}{' '}
                  <span style={{ color: '#34d399' }}>{t('home.heroTitleAccent')}</span>
                </h1>
                <p className="text-white/80 text-[13px] sm:text-sm mt-2 max-w-[18rem] sm:max-w-sm leading-relaxed font-medium" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
                  {t('home.heroSubtitle')}
                </p>
              </div>

              {/* Desktop hero copy */}
              <div className="hidden lg:flex absolute inset-0 flex-col items-start justify-end px-10 pb-44">
                <h1 className="text-white font-extrabold text-4xl xl:text-5xl leading-tight" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.35)' }}>
                  {t('home.heroTitle')} <span style={{ color: '#34d399' }}>{t('home.heroTitleAccent')}</span>
                </h1>
                <p className="text-white/75 text-base mt-2 font-medium" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
                  {t('home.heroSubtitle')}
                </p>
              </div>
            </div>

            {/* ── Search panel ── */}
            <div
              className="relative z-10 -mt-10 sm:-mt-12 lg:mt-0 lg:absolute lg:inset-0 lg:flex lg:items-center lg:justify-center lg:px-10 lg:py-8 lg:z-10"
              style={{ pointerEvents: 'none' } as React.CSSProperties}
            >
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full"
                style={{ pointerEvents: 'auto' }}
              >
                <div
                  ref={searchPanelRef}
                  className="relative"
                  style={{
                    borderRadius: 20,
                    background: '#fff',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04), 0 12px 40px rgba(10,15,30,0.18), 0 0 0 1px rgba(210,218,230,0.8)',
                  }}
                >

              {/* ── MOBILE SEARCH ── */}
              <div className="lg:hidden p-3.5 space-y-3">
                {/* Sale / Rent */}
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl" style={{ background: '#eef0f4' }}>
                  {([{ v: 'sale', l: t('propertyStatus.sale') }, { v: 'rent', l: t('propertyStatus.rent') }] as const).map(({ v, l }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setTab(v)}
                      className="py-2.5 rounded-lg text-[13px] font-bold transition-all duration-200"
                      style={{
                        background: tab === v ? '#fff' : 'transparent',
                        color: tab === v ? '#2563eb' : '#76777d',
                        boxShadow: tab === v ? '0 1px 4px rgba(15,20,35,0.08)' : 'none',
                      }}
                    >
                      {l}
                    </button>
                  ))}
                </div>

                {/* Property types */}
                <div className="grid grid-cols-5 gap-1.5">
                  {propertyTypeShortOpts.map(c => {
                    const active = form.propType === c.v;
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.v}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, propType: c.v }))}
                        className="flex flex-col items-center justify-center gap-1 py-2 px-0.5 rounded-xl transition-all duration-150"
                        style={{
                          background: active ? 'rgba(37,99,235,0.10)' : '#f4f5f7',
                          border: `1.5px solid ${active ? '#2563eb' : 'transparent'}`,
                        }}
                      >
                        <Icon size={15} strokeWidth={2.2} style={{ color: active ? '#2563eb' : '#9ca3af' }} />
                        <span className="text-[9px] font-semibold leading-tight text-center" style={{ color: active ? '#2563eb' : '#6b7280' }}>
                          {c.l}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Location */}
                <button
                  type="button"
                  onClick={() => { setOpenField(null); setMobileSheet('location'); }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-colors"
                  style={{ background: '#f8f9fb', border: '1.5px solid #e8eaed' }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#eef0f4' }}>
                    <MapPin size={16} strokeWidth={2.3} style={{ color: '#2563eb' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#9ea0a7' }}>{t('home.location')}</p>
                    <p className="text-[14px] font-semibold truncate" style={{ color: locationLabel ? '#191c1e' : '#b0b2ba' }}>
                      {locationLabel || t('listings.searchPlaceholder')}
                    </p>
                  </div>
                  <ChevronDown size={14} strokeWidth={2.5} style={{ color: '#b0b2ba', flexShrink: 0 }} />
                </button>

                {/* Beds + Price */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setOpenField(null); setMobileSheet('beds'); }}
                    className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-left"
                    style={{ background: '#f8f9fb', border: '1.5px solid #e8eaed' }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#eef0f4' }}>
                      <Bed size={14} strokeWidth={2.3} style={{ color: '#6b7280' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: '#9ea0a7' }}>{t('home.bedroomLabel')}</p>
                      <p className="text-[13px] font-semibold truncate" style={{ color: form.bedrooms ? '#191c1e' : '#b0b2ba' }}>
                        {form.bedrooms ? t('home.roomsCount', { n: form.bedrooms }) : t('common.any')}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setOpenField(null); setMobileSheet('price'); }}
                    className="flex items-center gap-2.5 px-3 py-3 rounded-xl text-left"
                    style={{ background: '#f8f9fb', border: '1.5px solid #e8eaed' }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#eef0f4' }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#6b7280' }}>₾</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: '#9ea0a7' }}>{t('home.price')}</p>
                      <p className="text-[13px] font-semibold truncate" style={{ color: (form.priceMin || form.priceMax) ? '#191c1e' : '#b0b2ba' }}>
                        {form.priceMin && form.priceMax
                          ? `₾${Number(form.priceMin).toLocaleString()} – ₾${Number(form.priceMax).toLocaleString()}`
                          : form.priceMax
                          ? t('home.upToPrice', { amount: Number(form.priceMax).toLocaleString() })
                          : form.priceMin
                          ? t('home.fromPricePlus', { amount: Number(form.priceMin).toLocaleString() })
                          : t('common.any')}
                      </p>
                    </div>
                  </button>
                </div>

                {/* Search CTA */}
                <button
                  type="button"
                  onClick={handleSearch}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white text-[15px]"
                  style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
                >
                  <Search size={17} strokeWidth={2.5} />
                  {t('home.searchBtn')}
                </button>

                {/* More filters */}
                <button
                  type="button"
                  onClick={() => { setMobileSheet(null); setFilterModalOpen(true); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold"
                  style={{ color: '#45464d', border: '1.5px solid #e8eaed', background: '#fff' }}
                >
                  <SlidersHorizontal size={15} strokeWidth={2.3} />
                  {t('listings.filter')}
                </button>
              </div>

              {/* ── DESKTOP SEARCH ── */}
              <div className="hidden lg:block">
              {/* ── Row 1: Deal type + property chips ── */}
              <div className="flex items-center gap-2 px-3 sm:px-4 pt-2.5 pb-2.5 flex-wrap" style={{ borderBottom: '1px solid #f0f2f5' }}>
                <div className="flex rounded-lg p-0.5 gap-0.5 flex-shrink-0" style={{ background: '#eef0f4' }}>
                  {([{ v: 'sale', l: t('propertyStatus.sale') }, { v: 'rent', l: t('propertyStatus.rent') }] as const).map(({ v, l }) => (
                    <button key={v} onClick={() => setTab(v)}
                      className="px-3 py-1 rounded-md text-[12px] font-bold transition-all duration-200"
                      style={{ background: tab === v ? '#2563eb' : 'transparent', color: tab === v ? '#fff' : '#76777d' }}
                    >{l}</button>
                  ))}
                </div>

                <div className="flex items-center gap-1 flex-nowrap flex-1 min-w-0">
                  {propertyTypeShortOpts.map(c => {
                    const active = form.propType === c.v;
                    const Icon = c.icon;
                    return (
                      <button key={c.v}
                        onClick={() => setForm(f => ({ ...f, propType: c.v }))}
                        className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-lg text-[11.5px] font-semibold transition-all duration-150"
                        style={{
                          background: active ? 'rgba(37,99,235,0.08)' : 'transparent',
                          color: active ? '#2563eb' : '#76777d',
                          border: `1.5px solid ${active ? '#2563eb' : '#e4e6ea'}`,
                        }}
                      >
                        <span className="flex items-center justify-center flex-shrink-0" style={{ width: 20, height: 20, borderRadius: 6, background: active ? '#2563eb' : '#f0f2f5' }}>
                          <Icon size={11} strokeWidth={2.2} style={{ color: active ? '#fff' : '#9ca3af' }} />
                        </span>
                        {c.l}
                      </button>
                    );
                  })}
                </div>

                <div className="hidden sm:flex items-center gap-1.5 ml-auto px-2.5 py-1 rounded-full flex-shrink-0"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  <span className="text-[10.5px] font-bold" style={{ color: '#10B981' }}>{t('home.liveCount')}</span>
                </div>
              </div>

              {/* ── Row 2: Search fields ── */}
              <div className="px-3 sm:px-4 pt-3 pb-3">
                <div
                  className="flex flex-col lg:flex-row"
                  style={{ border: '1.5px solid #e4e6ea', borderRadius: 14, background: '#fff' }}
                >

                {/* ① Location */}
                <div className="relative flex-[2.2] lg:border-r lg:border-[#eceef0]">
                  <div
                    className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-all duration-150 h-full border-b lg:border-b-0 border-[#f0f2f5]"
                    style={{ background: openField === 'location' ? 'rgba(37,99,235,0.04)' : 'transparent' }}
                    onClick={() => setOpenField(openField === 'location' ? null : 'location')}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: openField === 'location' ? 'rgba(37,99,235,0.14)' : '#f3f4f7' }}>
                      <MapPin size={14} strokeWidth={2.3} style={{ color: openField === 'location' ? '#2563eb' : '#6b7280' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: openField === 'location' ? '#2563eb' : '#9ea0a7', marginBottom: 1 }}>{t('home.location')}</p>
                      <p className="text-[13px] font-semibold truncate" style={{ color: locationLabel ? '#191c1e' : '#bbbdc4' }}>{locationLabel || t('listings.searchPlaceholder')}</p>
                    </div>
                    <ChevronDown size={12} strokeWidth={2.5} style={{ color: '#b0b2ba', flexShrink: 0, transform: openField === 'location' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>

                  <AnimatePresence>
                    {openField === 'location' && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.18 }}
                        className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50"
                        style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06)', minWidth: 280 }}
                      >
                        {/* City quick picks */}
                        <div className="px-4 pt-4 pb-2" style={{ borderBottom: '1px solid #f2f4f6' }}>
                          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ea0a7', marginBottom: 8 }}>ქალაქი</p>
                          <div className="flex flex-wrap gap-1.5">
                            {cityOpts.slice(0, 6).map(c => (
                              <button key={c.v}
                                onClick={() => { setForm(f => ({ ...f, city: c.v, district: '' })); setOpenField(null); }}
                                className="px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all duration-100"
                                style={{
                                  background: form.city === c.v ? '#191c1e' : '#f2f4f6',
                                  color: form.city === c.v ? '#fff' : '#45464d',
                                }}>{c.l}</button>
                            ))}
                          </div>
                        </div>
                        {/* Popular districts */}
                        <div className="px-3 pb-3">
                          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ea0a7', padding: '10px 4px 6px' }}>
                            {t('home.popularDistricts')}
                          </p>
                          {popularAreas.map(opt => (
                            <div key={`${opt.city}-${opt.district}`}
                              className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors duration-100"
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f7f9fb'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                              onClick={() => { setForm(f => ({ ...f, city: opt.city, district: opt.district })); setOpenField(null); }}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#f0f2f5' }}>
                                  <MapPin size={11} style={{ color: '#9ea0a7' }} />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold" style={{ color: '#191c1e', lineHeight: 1.2 }}>{opt.label}</p>
                                  <p style={{ fontSize: 11, color: '#9ea0a7' }}>{opt.cityLabel}</p>
                                </div>
                              </div>
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#f0f2f5', color: '#76777d' }}>
                                {opt.count.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ② Bedrooms */}
                <div className="relative flex-1 lg:border-r lg:border-[#eceef0]">
                  <div
                    className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-all duration-150 h-full border-b lg:border-b-0 border-[#f0f2f5]"
                    style={{ background: openField === 'beds' ? 'rgba(37,99,235,0.04)' : 'transparent' }}
                    onClick={() => setOpenField(openField === 'beds' ? null : 'beds')}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: openField === 'beds' ? 'rgba(37,99,235,0.14)' : '#f3f4f7' }}>
                      <Bed size={14} strokeWidth={2.3} style={{ color: openField === 'beds' ? '#2563eb' : '#6b7280' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: openField === 'beds' ? '#2563eb' : '#9ea0a7', marginBottom: 1 }}>საძინებელი</p>
                      <p className="text-[13px] font-semibold" style={{ color: form.bedrooms ? '#191c1e' : '#bbbdc4' }}>{form.bedrooms ? t('home.roomsCount', { n: form.bedrooms }) : t('common.any')}</p>
                    </div>
                    <ChevronDown size={12} strokeWidth={2.5} style={{ color: '#b0b2ba', flexShrink: 0, transform: openField === 'beds' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>

                  <AnimatePresence>
                    {openField === 'beds' && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.18 }}
                        className="absolute top-full left-0 right-0 mt-2 rounded-2xl p-4 z-50"
                        style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06)', minWidth: 200 }}
                      >
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ea0a7', marginBottom: 10 }}>{t('home.rooms')}</p>
                        <div className="grid grid-cols-3 gap-2">
                          {bedroomOpts.map(opt => (
                            <button key={opt.v}
                              onClick={() => { setForm(f => ({ ...f, bedrooms: opt.v })); setOpenField(null); }}
                              className="py-2.5 rounded-xl text-sm font-bold transition-all duration-150 text-center"
                              style={{
                                background: form.bedrooms === opt.v ? '#191c1e' : '#f2f4f6',
                                color: form.bedrooms === opt.v ? '#fff' : '#45464d',
                              }}>{opt.l}</button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ③ Price */}
                <div className="relative flex-[1.4] lg:border-r lg:border-[#eceef0]">
                  <div
                    className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-all duration-150 h-full border-b lg:border-b-0 border-[#f0f2f5]"
                    style={{ background: openField === 'price' ? 'rgba(37,99,235,0.04)' : 'transparent' }}
                    onClick={() => setOpenField(openField === 'price' ? null : 'price')}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: openField === 'price' ? 'rgba(37,99,235,0.14)' : '#f3f4f7' }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: openField === 'price' ? '#2563eb' : '#6b7280', lineHeight: 1 }}>₾</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: openField === 'price' ? '#2563eb' : '#9ea0a7', marginBottom: 1 }}>ფასი</p>
                      <p className="text-[13px] font-semibold truncate" style={{ color: (form.priceMin || form.priceMax) ? '#191c1e' : '#bbbdc4' }}>
                        {form.priceMin && form.priceMax ? `₾${Number(form.priceMin).toLocaleString()} – ₾${Number(form.priceMax).toLocaleString()}` : form.priceMax ? t('home.upToPrice', { amount: Number(form.priceMax).toLocaleString() }) : form.priceMin ? t('home.fromPricePlus', { amount: Number(form.priceMin).toLocaleString() }) : t('common.any')}
                      </p>
                    </div>
                    <ChevronDown size={12} strokeWidth={2.5} style={{ color: '#b0b2ba', flexShrink: 0, transform: openField === 'price' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>

                  <AnimatePresence>
                    {openField === 'price' && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.18 }}
                        className="absolute top-full left-0 mt-2 rounded-2xl p-4 z-50"
                        style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06)', width: 280 }}
                      >
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ea0a7', marginBottom: 10 }}>{t('home.priceRange')}</p>
                        {/* Min/Max inputs at top */}
                        <div className="flex items-center gap-2 mb-4">
                          <div className="flex-1 flex items-center gap-1.5 px-3 py-2.5 rounded-xl" style={{ border: '1.5px solid #eceef0', background: '#fafbfc' }}>
                            <span style={{ color: '#b0b2ba', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>₾</span>
                            <input type="number" placeholder={t('home.from')} value={form.priceMin}
                              onChange={e => setForm(f => ({ ...f, priceMin: e.target.value }))}
                              onClick={e => e.stopPropagation()}
                              className="bare-input" />
                          </div>
                          <span style={{ color: '#b0b2ba', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>—</span>
                          <div className="flex-1 flex items-center gap-1.5 px-3 py-2.5 rounded-xl" style={{ border: '1.5px solid #eceef0', background: '#fafbfc' }}>
                            <span style={{ color: '#b0b2ba', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>₾</span>
                            <input type="number" placeholder={t('home.to')} value={form.priceMax}
                              onChange={e => setForm(f => ({ ...f, priceMax: e.target.value }))}
                              onClick={e => e.stopPropagation()}
                              className="bare-input" />
                          </div>
                        </div>
                        {/* Quick presets */}
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#c0c2ca', marginBottom: 8 }}>{t('home.quickSelect')}</p>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { max: '50000', l: '₾50K' }, { max: '100000', l: '₾100K' },
                            { max: '200000', l: '₾200K' }, { max: '350000', l: '₾350K' },
                            { max: '500000', l: '₾500K' }, { max: '1000000', l: '₾1M+' },
                          ].map(opt => (
                            <button key={opt.max}
                              onClick={() => { setForm(f => ({ ...f, priceMin: '', priceMax: opt.max })); setOpenField(null); }}
                              className="py-2 rounded-xl text-xs font-bold transition-all duration-150"
                              style={{
                                background: form.priceMax === opt.max && !form.priceMin ? '#2563eb' : '#f2f4f6',
                                color: form.priceMax === opt.max && !form.priceMin ? '#fff' : '#45464d',
                              }}>{opt.l}</button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ④ Actions */}
                <div className="flex items-stretch gap-0 flex-shrink-0 overflow-hidden rounded-b-[12px] lg:rounded-none">
                  <button
                    onClick={() => { setOpenField(null); setFilterModalOpen(true); }}
                    className="flex items-center justify-center gap-1.5 px-3 py-3 lg:py-0 font-bold text-[13px] transition-all duration-150 border-b-0 lg:border-r border-[#eceef0]"
                    style={{ background: '#f8f9fb', color: '#45464d', minWidth: 52 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f0f2f5'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f8f9fb'; }}
                  >
                    <SlidersHorizontal size={14} strokeWidth={2.3} />
                    <span className="hidden sm:inline">{t('listings.filter')}</span>
                  </button>

                  <button
                    onClick={handleSearch}
                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-5 sm:px-7 py-3 lg:py-0 font-bold text-white text-[14px] transition-all duration-150 lg:min-w-[148px] lg:rounded-r-[12px]"
                    style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #047857 0%, #059669 100%)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #059669 0%, #10b981 100%)'; }}
                  >
                    <Search size={15} strokeWidth={2.5} />
                    {t('home.searchBtn')}
                  </button>
                </div>
                </div>
              </div>

              {/* ── Row 3: Popular tags ── */}
              <div
                className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 overflow-x-auto scrollbar-hide lg:flex-wrap lg:overflow-visible rounded-b-[20px]"
                style={{ background: '#fafbfc', borderTop: '1px solid #f0f2f5' }}
              >
                <span className="flex-shrink-0" style={{ fontSize: 11, color: '#9ea0a7', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{t('home.popular')}</span>
                {[
                  { l: t('home.popularTags.vake'), q: '?city=თბილისი&district=ვაკე' },
                  { l: t('home.popularTags.batumiCenter'), q: '?city=ბათუმი&district=ძველი ბათუმი' },
                  { l: t('home.popularTags.newComplex'), q: '?new=true' },
                  { l: t('home.popularTags.threeRoom'), q: '?bedrooms=3' },
                  { l: t('home.popularTags.rentApartment'), q: '?status=rent&propType=apartment' },
                ].map(tag => (
                  <button key={tag.l}
                    onClick={() => navigate(`/listings${tag.q}`)}
                    className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-150 flex-shrink-0"
                    style={{ background: '#fff', color: '#5a5c64', border: '1px solid #e8eaed' }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(37, 99, 235,0.08)';
                      (e.currentTarget as HTMLElement).style.color = '#2563eb';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(37, 99, 235,0.25)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = '#fff';
                      (e.currentTarget as HTMLElement).style.color = '#5a5c64';
                      (e.currentTarget as HTMLElement).style.borderColor = '#e8eaed';
                    }}>{tag.l}</button>
                ))}
              </div>
              </div>{/* desktop search */}

              {/* ── MOBILE BOTTOM SHEETS ── */}
              <AnimatePresence>
                {mobileSheet && (
                  <>
                    <motion.div
                      key="mobile-sheet-backdrop"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="lg:hidden fixed inset-0 z-[160]"
                      style={{ background: 'rgba(15,20,30,0.5)' }}
                      onClick={() => setMobileSheet(null)}
                    />
                    <motion.div
                      key="mobile-sheet-panel"
                      initial={{ y: '100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '100%' }}
                      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                      className="lg:hidden fixed inset-x-0 bottom-0 z-[161] rounded-t-2xl overflow-hidden"
                      style={{ background: '#fff', maxHeight: '82vh', boxShadow: '0 -8px 40px rgba(0,0,0,0.18)' }}
                    >
                      <div className="flex justify-center pt-3 pb-1">
                        <div className="w-10 h-1 rounded-full" style={{ background: '#e4e6ea' }} />
                      </div>

                      {mobileSheet === 'location' && (
                        <div className="px-4 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(82vh - 24px)' }}>
                          <div className="flex items-center justify-between mb-4">
                            <p className="font-bold text-[#191c1e]" style={{ fontSize: 16 }}>{t('home.location')}</p>
                            <button type="button" onClick={() => setMobileSheet(null)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#f2f4f6' }}>
                              <X size={15} strokeWidth={2.5} style={{ color: '#45464d' }} />
                            </button>
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: '#9ea0a7' }}>{t('listings.city')}</p>
                          <div className="flex flex-wrap gap-2 mb-5">
                            {cityOpts.slice(0, 6).map(c => (
                              <button
                                key={c.v}
                                type="button"
                                onClick={() => { setForm(f => ({ ...f, city: c.v, district: '' })); setMobileSheet(null); }}
                                className="px-3.5 py-2 rounded-xl text-[13px] font-semibold"
                                style={{
                                  background: form.city === c.v ? '#2563eb' : '#f2f4f6',
                                  color: form.city === c.v ? '#fff' : '#45464d',
                                }}
                              >
                                {c.l}
                              </button>
                            ))}
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: '#9ea0a7' }}>{t('home.popularDistricts')}</p>
                          <div className="space-y-1">
                            {popularAreas.map(opt => (
                              <button
                                key={`${opt.city}-${opt.district}`}
                                type="button"
                                onClick={() => { setForm(f => ({ ...f, city: opt.city, district: opt.district })); setMobileSheet(null); }}
                                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left"
                                style={{ background: form.district === opt.district ? 'rgba(37,99,235,0.08)' : 'transparent' }}
                              >
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#f0f2f5' }}>
                                  <MapPin size={13} style={{ color: '#9ea0a7' }} />
                                </div>
                                <div>
                                  <p className="text-[14px] font-semibold" style={{ color: '#191c1e' }}>{opt.label}</p>
                                  <p className="text-[12px]" style={{ color: '#9ea0a7' }}>{opt.cityLabel}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {mobileSheet === 'beds' && (
                        <div className="px-4 pb-8">
                          <div className="flex items-center justify-between mb-4">
                            <p className="font-bold text-[#191c1e]" style={{ fontSize: 16 }}>{t('home.bedroomLabel')}</p>
                            <button type="button" onClick={() => setMobileSheet(null)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#f2f4f6' }}>
                              <X size={15} strokeWidth={2.5} style={{ color: '#45464d' }} />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {bedroomOpts.map(opt => (
                              <button
                                key={opt.v}
                                type="button"
                                onClick={() => { setForm(f => ({ ...f, bedrooms: opt.v })); setMobileSheet(null); }}
                                className="py-3.5 rounded-xl text-[15px] font-bold"
                                style={{
                                  background: form.bedrooms === opt.v ? '#2563eb' : '#f2f4f6',
                                  color: form.bedrooms === opt.v ? '#fff' : '#45464d',
                                }}
                              >
                                {opt.l}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {mobileSheet === 'price' && (
                        <div className="px-4 pb-8 overflow-y-auto" style={{ maxHeight: 'calc(82vh - 24px)' }}>
                          <div className="flex items-center justify-between mb-4">
                            <p className="font-bold text-[#191c1e]" style={{ fontSize: 16 }}>{t('home.priceRange')}</p>
                            <button type="button" onClick={() => setMobileSheet(null)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#f2f4f6' }}>
                              <X size={15} strokeWidth={2.5} style={{ color: '#45464d' }} />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mb-5">
                            <div className="flex-1 flex items-center gap-1.5 px-3 py-3 rounded-xl" style={{ border: '1.5px solid #eceef0', background: '#fafbfc' }}>
                              <span style={{ color: '#b0b2ba', fontWeight: 700, fontSize: 12 }}>₾</span>
                              <input type="number" placeholder={t('home.from')} value={form.priceMin}
                                onChange={e => setForm(f => ({ ...f, priceMin: e.target.value }))}
                                className="bare-input" />
                            </div>
                            <span style={{ color: '#b0b2ba', fontWeight: 600 }}>—</span>
                            <div className="flex-1 flex items-center gap-1.5 px-3 py-3 rounded-xl" style={{ border: '1.5px solid #eceef0', background: '#fafbfc' }}>
                              <span style={{ color: '#b0b2ba', fontWeight: 700, fontSize: 12 }}>₾</span>
                              <input type="number" placeholder={t('home.to')} value={form.priceMax}
                                onChange={e => setForm(f => ({ ...f, priceMax: e.target.value }))}
                                className="bare-input" />
                            </div>
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: '#9ea0a7' }}>{t('home.quickSelect')}</p>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { max: '50000', l: '₾50K' }, { max: '100000', l: '₾100K' },
                              { max: '200000', l: '₾200K' }, { max: '350000', l: '₾350K' },
                              { max: '500000', l: '₾500K' }, { max: '1000000', l: '₾1M+' },
                            ].map(opt => (
                              <button
                                key={opt.max}
                                type="button"
                                onClick={() => { setForm(f => ({ ...f, priceMin: '', priceMax: opt.max })); setMobileSheet(null); }}
                                className="py-3 rounded-xl text-[13px] font-bold"
                                style={{
                                  background: form.priceMax === opt.max && !form.priceMin ? '#2563eb' : '#f2f4f6',
                                  color: form.priceMax === opt.max && !form.priceMin ? '#fff' : '#45464d',
                                }}
                              >
                                {opt.l}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => setMobileSheet(null)}
                            className="w-full mt-4 py-3 rounded-xl font-bold text-white"
                            style={{ background: '#2563eb' }}
                          >
                            {t('common.search')}
                          </button>
                        </div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
                </div>{/* searchPanelRef */}
              </motion.div>
            </div>{/* search overlay */}
          </div>{/* relative wrapper */}

          {/* ── FILTER MODAL ── */}
          <AnimatePresence>
            {filterModalOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
                style={{ background: 'rgba(15,20,30,0.55)', backdropFilter: 'blur(4px)' }}
                onClick={e => { if (e.target === e.currentTarget) setFilterModalOpen(false); }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 40, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 30, scale: 0.97 }}
                  transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full sm:w-[560px] max-h-[92vh] overflow-y-auto overflow-x-hidden rounded-t-3xl sm:rounded-3xl"
                  style={{ background: '#fff', boxShadow: '0 32px 80px rgba(0,0,0,0.28)' }}
                >
                  {/* Modal header */}
                  <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #f0f2f5' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(37, 99, 235,0.10)' }}>
                        <SlidersHorizontal size={16} strokeWidth={2.2} style={{ color: '#2563eb' }} />
                      </div>
                      <div>
                        <p className="font-bold text-[#191c1e]" style={{ fontSize: 16 }}>{t('home.filterTitle')}</p>
                        <p style={{ fontSize: 12, color: '#9ea0a7' }}>{t('home.filterSubtitle')}</p>
                      </div>
                    </div>
                    <button onClick={() => setFilterModalOpen(false)} className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors" style={{ background: '#f2f4f6' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#eceef0'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#f2f4f6'}>
                      <X size={16} strokeWidth={2.5} style={{ color: '#45464d' }} />
                    </button>
                  </div>

                  <div className="px-6 py-2">

                    {/* ── Property type ── */}
                    <div className="py-5" style={{ borderBottom: '1px solid #f2f4f6' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(37, 99, 235,0.10)' }}>
                          <Home size={13} strokeWidth={2.3} style={{ color: '#2563eb' }} />
                        </div>
                        <p className="font-bold text-[#191c1e]" style={{ fontSize: 13 }}>{t('home.propertyType')}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {propertyTypeOpts.map(c => {
                          const active = form.propType === c.v;
                          const Icon = c.icon;
                          return (
                            <button key={c.v}
                              onClick={() => setForm(f => ({ ...f, propType: c.v }))}
                              className="flex items-center gap-2 pl-2 pr-3.5 py-2 rounded-xl text-[13px] font-semibold transition-all duration-150"
                              style={{
                                background: active ? '#191c1e' : '#f4f5f7',
                                color: active ? '#fff' : '#4b5563',
                                border: `1.5px solid ${active ? '#191c1e' : '#eceef0'}`,
                              }}
                            >
                              <Icon size={14} strokeWidth={2.2} style={{ color: active ? '#fff' : '#9ca3af', flexShrink: 0 }} />
                              {c.l}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Deal type ── */}
                    <div className="py-5" style={{ borderBottom: '1px solid #f2f4f6' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.10)' }}>
                          <Tag size={13} strokeWidth={2.3} style={{ color: '#16a34a' }} />
                        </div>
                        <p className="font-bold text-[#191c1e]" style={{ fontSize: 13 }}>{t('home.dealType')}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {dealTypeOpts.map(c => (
                          <button key={c.v}
                            onClick={() => setTab(c.v as 'sale' | 'rent')}
                            className="px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-all duration-150"
                            style={{
                              background: tab === c.v ? '#2563eb' : '#f4f5f7',
                              color: tab === c.v ? '#fff' : '#4b5563',
                              border: `1.5px solid ${tab === c.v ? '#2563eb' : '#eceef0'}`,
                            }}>{c.l}</button>
                        ))}
                      </div>
                    </div>

                    {/* ── Bedrooms ── */}
                    <div className="py-5" style={{ borderBottom: '1px solid #f2f4f6' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.10)' }}>
                          <Bed size={13} strokeWidth={2.3} style={{ color: '#d97706' }} />
                        </div>
                        <p className="font-bold text-[#191c1e]" style={{ fontSize: 13 }}>{t('home.bedroomCount')}</p>
                      </div>
                      <div className="flex gap-2">
                        {bedroomOpts.map(c => (
                          <button key={c.v}
                            onClick={() => setForm(f => ({ ...f, bedrooms: c.v }))}
                            className="flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-150 text-center"
                            style={{
                              background: form.bedrooms === c.v ? '#191c1e' : '#f4f5f7',
                              color: form.bedrooms === c.v ? '#fff' : '#4b5563',
                              border: `1.5px solid ${form.bedrooms === c.v ? '#191c1e' : '#eceef0'}`,
                            }}>{c.l}</button>
                        ))}
                      </div>
                    </div>

                    {/* ── Price range ── */}
                    <div className="py-5" style={{ borderBottom: '1px solid #f2f4f6' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.10)' }}>
                          <DollarSign size={13} strokeWidth={2.3} style={{ color: '#059669' }} />
                        </div>
                        <p className="font-bold text-[#191c1e]" style={{ fontSize: 13 }}>{t('home.totalPrice')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl transition-all" style={{ border: '1.5px solid #eceef0', background: '#fafbfc' }}>
                          <span style={{ color: '#9ea0a7', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>₾</span>
                          <input type="number" placeholder={t('home.from')} value={form.priceMin}
                            onChange={e => setForm(f => ({ ...f, priceMin: e.target.value }))}
                            className="bare-input" />
                        </div>
                        <div className="flex-shrink-0 w-5 h-px" style={{ background: '#d1d5db' }} />
                        <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl transition-all" style={{ border: '1.5px solid #eceef0', background: '#fafbfc' }}>
                          <span style={{ color: '#9ea0a7', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>₾</span>
                          <input type="number" placeholder={t('home.to')} value={form.priceMax}
                            onChange={e => setForm(f => ({ ...f, priceMax: e.target.value }))}
                            className="bare-input" />
                        </div>
                      </div>
                    </div>

                    {/* ── Area range ── */}
                    <div className="py-5" style={{ borderBottom: '1px solid #f2f4f6' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.10)' }}>
                          <Maximize2 size={13} strokeWidth={2.3} style={{ color: '#2563eb' }} />
                        </div>
                        <p className="font-bold text-[#191c1e]" style={{ fontSize: 13 }}>{t('home.area')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 flex items-center justify-between gap-2 px-4 py-3 rounded-2xl" style={{ border: '1.5px solid #eceef0', background: '#fafbfc' }}>
                          <input type="number" placeholder={t('home.from')} value={form.areaMin}
                            onChange={e => setForm(f => ({ ...f, areaMin: e.target.value }))}
                            className="bare-input" />
                          <span style={{ color: '#b0b2ba', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>მ²</span>
                        </div>
                        <div className="flex-shrink-0 w-5 h-px" style={{ background: '#d1d5db' }} />
                        <div className="flex-1 flex items-center justify-between gap-2 px-4 py-3 rounded-2xl" style={{ border: '1.5px solid #eceef0', background: '#fafbfc' }}>
                          <input type="number" placeholder={t('home.to')} value={form.areaMax}
                            onChange={e => setForm(f => ({ ...f, areaMax: e.target.value }))}
                            className="bare-input" />
                          <span style={{ color: '#b0b2ba', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>მ²</span>
                        </div>
                      </div>
                    </div>

                    {/* ── City ── */}
                    <div className="py-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.10)' }}>
                          <MapPin size={13} strokeWidth={2.3} style={{ color: '#dc2626' }} />
                        </div>
                        <p className="font-bold text-[#191c1e]" style={{ fontSize: 13 }}>{t('home.city')}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {cityOpts.map(c => (
                          <button key={c.v}
                            onClick={() => setForm(f => ({ ...f, city: c.v, district: '' }))}
                            className="px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-all duration-150"
                            style={{
                              background: form.city === c.v ? '#2563eb' : '#f4f5f7',
                              color: form.city === c.v ? '#fff' : '#4b5563',
                              border: `1.5px solid ${form.city === c.v ? '#2563eb' : '#eceef0'}`,
                            }}>{c.l}</button>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Modal footer */}
                  <div className="flex items-center justify-between px-6 py-4 gap-3" style={{ borderTop: '1px solid #f0f2f5' }}>
                    <button onClick={clearFilters}
                      className="px-5 py-3 rounded-2xl text-sm font-bold transition-all duration-150"
                      style={{ background: '#f2f4f6', color: '#45464d' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#eceef0'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#f2f4f6'}>
                      გასუფთავება
                    </button>
                    <button onClick={handleSearch}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white transition-all duration-200"
                      style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #047857 0%, #059669 100%)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #059669 0%, #10b981 100%)'; }}>
                      <Search size={15} strokeWidth={2.5} />
                      {t('home.searchBtn')}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SUPER VIP LISTINGS
      ══════════════════════════════════════════════════════ */}
      {featured.length > 0 && (
      <section className="py-10 sm:py-16 lg:py-20" style={{ background: '#fff' }}>
        <div className="container-xl">
          <InViewFade>
            <SectionTitle
              icon={Rocket}
              title={t('home.sections.vip')}
              linkTo="/listings?vip=true"
              linkLabel={t('home.sections.vipAll')}
            />
          </InViewFade>
          <ListingSlider items={featured} badge="vip" />
        </div>
      </section>
      )}

      <AdStrip bg="#f7f9fb">
        <AdBanner
          sponsor="Bank of Georgia"
          title={t('home.ads.mortgageTitle')}
          subtitle={t('home.ads.mortgageSubtitle')}
          ctaLabel={t('home.ads.calculate')}
          ctaHref="/contact"
          variant="navy"
        />
      </AdStrip>

      {/* ══════════════════════════════════════════════════════
          NEW LISTINGS
      ══════════════════════════════════════════════════════ */}
      {newest.length > 0 && (
      <section className="py-10 sm:py-16 lg:py-20" style={{ background: '#f7f9fb' }}>
        <div className="container-xl">
          <InViewFade>
            <SectionTitle
              icon={Sparkles}
              title={t('home.sections.newListings')}
              accent="green"
              linkTo="/listings?new=true"
              linkLabel={t('home.sections.newAll')}
            />
          </InViewFade>
          <ListingSlider items={newest} badge="new" />
        </div>
      </section>
      )}

      <AdStrip bg="#fff">
        <AdBanner
          sponsor="TbilisiRealtor.GE"
          title={t('home.ads.vipTitle')}
          subtitle={t('home.ads.vipSubtitle')}
          ctaLabel={t('home.ads.vipCta')}
          ctaHref="/listings?vip=true"
          variant="blue"
          icon={Rocket}
        />
      </AdStrip>

      {/* ══════════════════════════════════════════════════════
          NEW CONSTRUCTION PROJECTS
      ══════════════════════════════════════════════════════ */}
      <section className="py-8 sm:py-10 lg:py-12 bg-white">
        <div className="container-xl">
          <InViewFade>
            <SectionTitle
              icon={HardHat}
              title={t('home.sections.projects')}
              linkTo="/projects"
              linkLabel={t('home.sections.projectsAll')}
            />
          </InViewFade>

          <InViewFade delay={0.04}>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 -mt-2 mb-4 sm:mb-5">
              {[
                { label: t('home.projectChips.presale'), color: '#2563eb', bg: '#eff6ff' },
                { label: t('home.projectChips.noCommission'), color: '#059669', bg: '#ecfdf5' },
                { label: t('home.projectChips.freeConsult'), color: '#d97706', bg: '#fff7ed' },
              ].map(chip => (
                <span
                  key={chip.label}
                  className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[9px] sm:text-[10px] font-bold"
                  style={{ background: chip.bg, color: chip.color, border: `1px solid ${chip.color}22` }}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          </InViewFade>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {constructionProjects.map((project, i) => (
              <InViewFade key={project.id} delay={0.06 + i * 0.04}>
                <ConstructionProjectCard project={project} />
              </InViewFade>
            ))}
          </div>
        </div>
      </section>

      <AdStrip bg="#f7f9fb">
        <AdBanner
          sponsor="Archi Group"
          title={t('home.ads.archiTitle')}
          subtitle={t('home.ads.archiSubtitle')}
          ctaLabel={t('home.ads.viewProject')}
          ctaHref="/project/panorama-residence"
          variant="light"
          icon={HardHat}
          image="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=80"
        />
      </AdStrip>

      {/* ══════════════════════════════════════════════════════
          BLOG & BUYING GUIDES
      ══════════════════════════════════════════════════════ */}
      {blogPosts.length > 0 && (
      <section className="py-10 sm:py-16 lg:py-20" style={{ background: '#f7f9fb' }}>
        <div className="container-xl">
          <InViewFade>
            <SectionTitle
              icon={BookOpen}
              title={t('home.sections.blog')}
              linkTo="/blog"
              linkLabel={t('home.sections.blogAll')}
            />
          </InViewFade>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            {blogPosts.slice(0, 3).map((post, i) => (
              <InViewFade key={post.id} delay={i * 0.05} className="h-full">
                <BlogCard post={post} />
              </InViewFade>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ══════════════════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════════════════ */}
      <section className="py-10 sm:py-16 lg:py-20 bg-white">
        <div className="container-xl">
          <InViewFade>
            <SectionTitle
              icon={HelpCircle}
              title={t('home.sections.faq')}
            />
          </InViewFade>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {faqItems.map((item, i) => {
              const isOpen = openFaq === item.id;
              return (
                <InViewFade key={item.id} delay={i * 0.04}>
                  <div
                    className="rounded-2xl overflow-hidden h-full transition-colors duration-200"
                    style={{
                      border: '1px solid #eceef0',
                      background: '#fff',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : item.id)}
                      className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left"
                    >
                      <span
                        className="font-semibold text-sm leading-snug"
                        style={{ color: isOpen ? '#2563eb' : '#191c1e' }}
                      >
                        {item.question}
                      </span>
                      <div
                        className="flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          border: '2px solid #2563eb',
                          background: 'transparent',
                        }}
                      >
                        <ChevronDown
                          size={14}
                          strokeWidth={2.5}
                          style={{
                            color: '#2563eb',
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                          }}
                        />
                      </div>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-4 pt-0">
                            <p className="text-[13px] leading-relaxed" style={{ color: '#76777d' }}>
                              {item.answer}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </InViewFade>
              );
            })}
          </div>
        </div>
      </section>

    </div>
  );
}
