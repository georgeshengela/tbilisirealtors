import { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, ChevronLeft, ChevronRight, ChevronDown, ArrowRight,
  Sparkles, Bed, Bath,
  Square, Heart, Rocket, HardHat, BookOpen, HelpCircle, Clock, BadgePercent, Key,
} from 'lucide-react';
import { constructionProjects, faqItems } from '../data/mockData';
import type { Property, BlogPost } from '../types/listing';
import { useProperties, useBlogPosts } from '../hooks/usePublicData';
import { useCurrency } from '../contexts/CurrencyContext';
import { useTranslation } from '../i18n/LocaleContext';
import ConstructionProjectCard from '../components/ConstructionProjectCard';
import HomeHero from '../components/HomeHero';

/* ────────────────────────────────────────────────────────────────────────── */

function InViewFade({ children, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return <div className={className}>{children}</div>;
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
      <div className="relative overflow-hidden flex-shrink-0" style={{ aspectRatio: '5/4' }}>
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
        className="listing-slider flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1"
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
  const { data: properties } = useProperties();
  const { data: blogPosts } = useBlogPosts();
  const [openFaq, setOpenFaq] = useState<string | null>(faqItems[0]?.id ?? null);
  const featured = useMemo(() => properties.filter(p => p.isFeatured).slice(0, 12), [properties]);
  const newest = useMemo(() => properties.filter(p => p.isNew).slice(0, 12), [properties]);
  /* Curated rows the office asked for: premium rentals and Vake sales. */
  const premiumRentals = useMemo(
    () => properties
      .filter(p => (p.status === 'rent' || p.status === 'both') && (p.isPremium || p.isFeatured))
      .slice(0, 12),
    [properties],
  );
  const vakeSales = useMemo(
    () => properties
      .filter(p => (p.status === 'sale' || p.status === 'both') && /ვაკე|vake/i.test(p.district ?? ''))
      .slice(0, 12),
    [properties],
  );
  return (
    <div className="min-h-screen" style={{ background: '#f7f9fb' }}>

      <HomeHero />

      {/* SUPER VIP LISTINGS */}
      {featured.length > 0 && (
      <section className="relative py-10 sm:py-16 lg:py-20" style={{ background: '#fff' }}>
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

      {/* ══════════════════════════════════════════════════════
          PREMIUM RENTALS
      ══════════════════════════════════════════════════════ */}
      {premiumRentals.length > 0 && (
      <section className="py-10 sm:py-16 lg:py-20" style={{ background: '#fff' }}>
        <div className="container-xl">
          <InViewFade>
            <SectionTitle
              icon={Key}
              title={t('home.sections.premiumRentals')}
              linkTo="/listings?status=rent&vip=true"
              linkLabel={t('home.sections.premiumRentalsAll')}
            />
          </InViewFade>
          <ListingSlider items={premiumRentals} badge="vip" />
        </div>
      </section>
      )}

      {/* ══════════════════════════════════════════════════════
          VAKE SALES
      ══════════════════════════════════════════════════════ */}
      {vakeSales.length > 0 && (
      <section className="py-10 sm:py-16 lg:py-20" style={{ background: '#f7f9fb' }}>
        <div className="container-xl">
          <InViewFade>
            <SectionTitle
              icon={MapPin}
              title={t('home.sections.vakeSales')}
              accent="green"
              linkTo="/listings?status=sale&district=ვაკე"
              linkLabel={t('home.sections.vakeSalesAll')}
            />
          </InViewFade>
          <ListingSlider items={vakeSales} />
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
