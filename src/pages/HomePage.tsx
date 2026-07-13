import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Search, MapPin, ChevronDown, ChevronLeft, ChevronRight, ArrowRight,
  Sparkles, Phone, X, Tag, Home, Maximize2, DollarSign,
  Bed, Bath, SlidersHorizontal,
  Square, Heart, Rocket, HardHat, BookOpen, HelpCircle, Clock, BadgePercent,
  TrendingUp, Shield, Building2,
} from 'lucide-react';
import { properties, blogPosts, constructionProjects, faqItems } from '../data/mockData';
import type { Property, BlogPost, ConstructionProject } from '../data/mockData';

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
  blue: { color: '#497cff' },
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
  return (
    <Link
      to={`/blog/${post.id}`}
      className="group flex flex-col h-full rounded-2xl overflow-hidden bg-white"
      style={{
        border: '1px solid #eceef0',
        boxShadow: '0 2px 10px rgba(15,23,42,0.06)',
        transition: 'box-shadow 0.22s ease, border-color 0.22s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(15,23,42,0.10)';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(73,124,255,0.35)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(15,23,42,0.06)';
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
          style={{ background: 'rgba(255,255,255,0.95)', color: '#497cff' }}
        >
          {post.category}
        </span>
        <span
          className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold"
          style={{ background: 'rgba(0,0,0,0.45)', color: '#fff', backdropFilter: 'blur(6px)' }}
        >
          <Clock size={10} />
          {post.readTime} წთ
        </span>
      </div>

      <div className="flex flex-col flex-1 p-5">
        <h3
          className="font-bold text-[15px] leading-snug line-clamp-2 group-hover:text-[#497cff] transition-colors"
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
            style={{ color: '#497cff' }}
          >
            წაიკითხე
            <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}

const PROJECT_STATUS: Record<ConstructionProject['status'], { label: string; bg: string }> = {
  building: { label: 'მშენებარე', bg: '#d97706' },
  presale: { label: 'პრე-გაყიდვა', bg: '#497cff' },
  completed: { label: 'დასრულებული', bg: '#059669' },
};

function ConstructionProjectCard({ project }: { project: ConstructionProject }) {
  const status = PROJECT_STATUS[project.status];

  return (
    <Link
      to="/listings"
      className="group relative block overflow-hidden rounded-2xl"
      style={{
        aspectRatio: '3/4',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        transition: 'box-shadow 0.25s ease',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 36px rgba(73,124,255,0.28)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.25)'; }}
    >
      <img
        src={project.image}
        alt={project.name}
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to top, rgba(8,11,18,0.95) 0%, rgba(8,11,18,0.45) 50%, rgba(8,11,18,0.10) 100%)',
        }}
      />

      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: 'linear-gradient(160deg, rgba(73,124,255,0.25) 0%, transparent 55%)' }}
      />

      <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-[rgba(73,124,255,0.55)] transition-all duration-300" />

      <div className="absolute top-2 left-2 right-2 sm:top-3 sm:left-3 sm:right-3 flex items-start justify-between gap-1.5 sm:gap-2">
        <span
          className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold"
          style={{ background: status.bg, color: '#fff' }}
        >
          {status.label}
        </span>
        <span
          className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[8px] sm:text-[9px] font-semibold truncate max-w-[48%]"
          style={{ background: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)' }}
        >
          {project.developer}
        </span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
        <p className="text-white font-extrabold text-[13px] sm:text-[15px] leading-tight mb-1">{project.name}</p>
        <p className="flex items-center gap-1 text-[10px] sm:text-[11px] mb-2 sm:mb-3" style={{ color: 'rgba(255,255,255,0.55)' }}>
          <MapPin size={10} strokeWidth={2.5} className="flex-shrink-0" />
          <span className="truncate">{project.district}, {project.city}</span>
        </p>

        <p className="font-extrabold text-base sm:text-xl mb-2 sm:mb-3" style={{ color: '#7aabff', letterSpacing: '-0.02em' }}>
          ₾{project.priceFrom.toLocaleString()}
          <span className="text-[11px] sm:text-[12px] font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>+</span>
        </p>

        <div
          className="flex items-center justify-between rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 mb-1.5 sm:mb-2"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          <div className="text-center flex-1 min-w-0">
            <p className="text-[11px] sm:text-[13px] font-bold text-white leading-none truncate">{project.units}</p>
            <p className="text-[8px] sm:text-[9px] font-semibold mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>ბინა</p>
          </div>
          <div className="flex-shrink-0" style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.12)' }} />
          <div className="text-center flex-1 min-w-0">
            <p className="text-[11px] sm:text-[13px] font-bold text-white leading-none truncate">{project.completion}</p>
            <p className="text-[8px] sm:text-[9px] font-semibold mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>დასრულება</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="text-[11px] font-bold" style={{ color: '#7aabff' }}>დეტალები</span>
          <ArrowRight size={11} style={{ color: '#7aabff' }} />
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
    accent: '#7aabff',
    title: '#fff',
    subtitle: 'rgba(255,255,255,0.55)',
    ctaBg: '#497cff',
    ctaColor: '#fff',
  },
  blue: {
    bg: 'linear-gradient(135deg, #1e3a6e 0%, #497cff 100%)',
    accent: 'rgba(255,255,255,0.75)',
    title: '#fff',
    subtitle: 'rgba(255,255,255,0.65)',
    ctaBg: '#fff',
    ctaColor: '#1e3a6e',
  },
  light: {
    bg: '#fff',
    accent: '#497cff',
    title: '#14161a',
    subtitle: '#76777d',
    ctaBg: '#497cff',
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
  const t = AD_THEMES[variant];

  return (
    <Link
      to={ctaHref}
      className="group relative flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8 rounded-2xl overflow-hidden px-6 sm:px-8 py-6 sm:py-7"
      style={{
        background: t.bg,
        border: t.border,
        boxShadow: variant === 'light' ? '0 2px 12px rgba(15,23,42,0.06)' : '0 4px 24px rgba(15,23,42,0.18)',
        transition: 'box-shadow 0.22s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = variant === 'light'
          ? '0 8px 28px rgba(73,124,255,0.14)'
          : '0 8px 32px rgba(73,124,255,0.22)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = variant === 'light'
          ? '0 2px 12px rgba(15,23,42,0.06)'
          : '0 4px 24px rgba(15,23,42,0.18)';
      }}
    >
      <span
        className="absolute top-3 right-3 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest"
        style={{
          color: variant === 'light' ? '#9ea0a7' : 'rgba(255,255,255,0.35)',
          background: variant === 'light' ? '#f2f4f6' : 'rgba(255,255,255,0.08)',
        }}
      >
        სარეკლამო
      </span>

      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          border: `2px solid ${variant === 'light' ? '#497cff' : 'rgba(255,255,255,0.25)'}`,
          background: variant === 'light' ? 'rgba(73,124,255,0.08)' : 'rgba(255,255,255,0.08)',
        }}
      >
        <Icon size={22} strokeWidth={2.2} style={{ color: variant === 'light' ? '#497cff' : '#fff' }} />
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

const BADGE_CONFIG: Record<CardBadge, {
  bg: string; color: string; shadow: string;
  icon: React.ReactNode; label: string;
}> = {
  vip: {
    bg: 'linear-gradient(135deg, #497cff 0%, #3458d8 100%)',
    color: '#fff',
    shadow: '0 2px 8px rgba(73,124,255,0.40)',
    icon: <Rocket size={8} strokeWidth={3} />,
    label: 'SUPER VIP',
  },
  new: {
    bg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    color: '#fff',
    shadow: '0 2px 8px rgba(16,185,129,0.45)',
    icon: <Sparkles size={8} strokeWidth={3} />,
    label: 'ახალი',
  },
};

function VipListingCard({ property, badge = 'vip' }: { property: Property; badge?: CardBadge }) {
  const [liked, setLiked] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const cfg = BADGE_CONFIG[badge];
  const images = property.images;
  const accentColor = badge === 'vip' ? '#497cff' : '#059669';

  const priceLabel = property.status === 'rent'
    ? `₾${property.price.toLocaleString()}/თვ.`
    : `₾${property.price.toLocaleString()}`;

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
        boxShadow: hovered ? '0 10px 28px rgba(15,23,42,0.12)' : '0 2px 10px rgba(15,23,42,0.06)',
        border: `1px solid ${hovered ? `${accentColor}45` : '#eceef0'}`,
        transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
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
            style={{ background: cfg.bg, color: cfg.color, boxShadow: cfg.shadow, letterSpacing: '0.03em' }}
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
            {property.status === 'sale' ? 'იყიდება' : 'ქირავდება'}
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
              {property.floor}/{property.totalFloors} სთ.
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
    ? { main: '#497cff', soft: 'rgba(73,124,255,0.10)', ring: 'rgba(73,124,255,0.28)' }
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
        aria-label={dir === 'left' ? 'წინა' : 'შემდეგი'}
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
  const navigate = useNavigate();
  const [tab, setTab] = useState<'sale' | 'rent'>('sale');
  const [form, setForm] = useState({
    city: '', type: '', bedrooms: '',
    priceMin: '', priceMax: '',
    areaMin: '', areaMax: '',
    propType: '',
  });
  const [openField, setOpenField] = useState<string | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchPanelRef.current && !searchPanelRef.current.contains(e.target as Node)) setOpenField(null);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const [featuredFilter, setFeaturedFilter] = useState<'all'|'apartment'|'house'|'villa'|'commercial'>('all');
  const [openFaq, setOpenFaq] = useState<string | null>(faqItems[0]?.id ?? null);
  const featuredAll = properties.filter(p => p.isFeatured).slice(0, 12);
  const featured = featuredFilter === 'all' ? featuredAll : featuredAll.filter(p => p.type === featuredFilter);
  const newest = properties.filter(p => p.isNew).slice(0, 12);
  const handleSearch = () => {
    const p = new URLSearchParams({ status: tab, city: form.city, type: form.propType || form.type, bedrooms: form.bedrooms, priceMin: form.priceMin, priceMax: form.priceMax, areaMin: form.areaMin, areaMax: form.areaMax });
    p.forEach((v, k) => { if (!v) p.delete(k); });
    navigate(`/listings?${p}`);
    setFilterModalOpen(false);
  };
  const clearFilters = () => setForm({ city: '', type: '', bedrooms: '', priceMin: '', priceMax: '', areaMin: '', areaMax: '', propType: '' });

  return (
    <div className="min-h-screen" style={{ background: '#f7f9fb' }}>

      {/* ══════════════════════════════════════════════════════
          HERO — contained, border-radius background
      ══════════════════════════════════════════════════════ */}
      <section className="pt-[56px] lg:pt-[102px]" style={{ background: '#f7f9fb' }}>
        <div className="container-xl pt-2 lg:pt-3">
          {/* Contained hero card — hidden on mobile, search panel takes over */}
          <div
            className="hidden md:block relative overflow-hidden"
            style={{
              borderRadius: '2rem',
              height: 'clamp(420px, 52vh, 560px)',
            }}
          >
            {/* BG Image */}
            <img
              src="https://static.vecteezy.com/system/resources/previews/059/552/778/large_2x/aerial-view-of-saburtalo-and-vake-districts-of-tbilisi-photo.jpg"
              alt="Hero"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Gradient overlay */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(125deg, rgba(8,10,18,0.88) 0%, rgba(0,23,75,0.55) 50%, rgba(8,10,18,0.40) 100%)' }}
            />
            {/* Ambient glow */}
            <div
              className="absolute pointer-events-none"
              style={{
                width: 480, height: 480, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(73,124,255,0.22) 0%, transparent 70%)',
                top: '-10%', right: '5%',
              }}
            />
            {/* Subtle grid */}
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)',
                backgroundSize: '64px 64px',
              }}
            />

            {/* ── Hero content ── */}
            <div className="relative h-full flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-10 lg:py-12">
              <div className="max-w-2xl">

                {/* Trust pill */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-6"
                  style={{
                    background: 'rgba(255,255,255,0.10)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse flex-shrink-0" />
                  <span className="text-[11px] font-bold tracking-widest uppercase text-white/80">
                    საქართველოს #1 უძრავი განცხადების პლატფორმა
                  </span>
                </motion.div>

                {/* Brand headline */}
                <motion.h1
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="font-bold leading-[1.12] tracking-tight mb-4"
                  style={{ fontSize: 'clamp(28px, 3.8vw, 46px)', letterSpacing: '-0.02em' }}
                >
                  <span className="text-white">თბილისი </span>
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #7aabff 0%, #497cff 60%, #3567f5 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    რეალტორსი
                  </span>
                  <span
                    className="font-semibold ml-1"
                    style={{ fontSize: '0.55em', color: 'rgba(255,255,255,0.45)', verticalAlign: 'super' }}
                  >
                    .ge
                  </span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.22 }}
                  className="text-white/70 mb-7 max-w-md"
                  style={{ fontSize: 15, lineHeight: 1.65 }}
                >
                  იპოვეთ თქვენი საოცნებო სახლი, ბინა ან კომერციული ფართი —
                  12,400+ განცხადება მთელი საქართველოდან.
                </motion.p>

                {/* Stats strip */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.34 }}
                  className="inline-flex items-stretch rounded-2xl overflow-hidden mb-7 max-w-full"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  {[
                    { v: '12,400+', l: 'განცხადება' },
                    { v: '350+',    l: 'აგენტი' },
                    { v: '96%',     l: 'კმაყოფ.' },
                  ].map((s, i) => (
                    <div
                      key={s.l}
                      className="flex flex-col items-center px-3 sm:px-5 py-2.5 sm:py-3"
                      style={{ borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.10)' : 'none' }}
                    >
                      <span className="text-white font-bold text-sm sm:text-base leading-none">{s.v}</span>
                      <span className="text-white/45 text-[10px] sm:text-[11px] font-medium mt-1 whitespace-nowrap">{s.l}</span>
                    </div>
                  ))}
                </motion.div>

                {/* CTA buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.44 }}
                  className="flex flex-wrap items-center gap-3"
                >
                  <Link
                    to="/listings"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all duration-200"
                    style={{
                      background: 'linear-gradient(135deg, #497cff 0%, #3567f5 100%)',
                      boxShadow: '0 4px 20px rgba(73,124,255,0.45)',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 28px rgba(73,124,255,0.55)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(73,124,255,0.45)';
                    }}
                  >
                    განცხადებების ნახვა
                    <ArrowRight size={16} strokeWidth={2.5} />
                  </Link>
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200"
                    style={{
                      background: 'rgba(255,255,255,0.10)',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.22)',
                      backdropFilter: 'blur(8px)',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.18)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.10)';
                    }}
                  >
                    <Phone size={15} strokeWidth={2} />
                    უფასო კონსულტაცია
                  </Link>
                </motion.div>

              </div>
            </div>
          </div>

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
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(73,124,255,0.10)' }}>
                        <SlidersHorizontal size={16} strokeWidth={2.2} style={{ color: '#497cff' }} />
                      </div>
                      <div>
                        <p className="font-bold text-[#191c1e]" style={{ fontSize: 16 }}>დეტალური ფილტრი</p>
                        <p style={{ fontSize: 12, color: '#9ea0a7' }}>გაფილტრეთ განცხადებები</p>
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
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(73,124,255,0.10)' }}>
                          <Home size={13} strokeWidth={2.3} style={{ color: '#497cff' }} />
                        </div>
                        <p className="font-bold text-[#191c1e]" style={{ fontSize: 13 }}>ქონების ტიპი</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { v: '', l: 'ყველა' },
                          { v: 'apartment', l: 'ბინა' },
                          { v: 'house', l: 'კერძო სახლი' },
                          { v: 'villa', l: 'აგარაკი' },
                          { v: 'land', l: 'მინის ნაკვეთი' },
                          { v: 'commercial', l: 'კომერციული ფართი' },
                          { v: 'hotel', l: 'სასტუმრო' },
                        ].map(c => (
                          <button key={c.v}
                            onClick={() => setForm(f => ({ ...f, propType: c.v }))}
                            className="px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-all duration-150"
                            style={{
                              background: form.propType === c.v ? '#191c1e' : '#f4f5f7',
                              color: form.propType === c.v ? '#fff' : '#4b5563',
                              border: `1.5px solid ${form.propType === c.v ? '#191c1e' : '#eceef0'}`,
                            }}>{c.l}</button>
                        ))}
                      </div>
                    </div>

                    {/* ── Deal type ── */}
                    <div className="py-5" style={{ borderBottom: '1px solid #f2f4f6' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.10)' }}>
                          <Tag size={13} strokeWidth={2.3} style={{ color: '#16a34a' }} />
                        </div>
                        <p className="font-bold text-[#191c1e]" style={{ fontSize: 13 }}>გარიგების ტიპი</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { v: 'sale', l: 'იყიდება' },
                          { v: 'rent', l: 'ქირავდება' },
                          { v: 'mortgage', l: 'გირავდება' },
                          { v: 'daily', l: 'ქირავდება დღიურად' },
                        ].map(c => (
                          <button key={c.v}
                            onClick={() => setTab(c.v as 'sale' | 'rent')}
                            className="px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-all duration-150"
                            style={{
                              background: tab === c.v ? '#497cff' : '#f4f5f7',
                              color: tab === c.v ? '#fff' : '#4b5563',
                              border: `1.5px solid ${tab === c.v ? '#497cff' : '#eceef0'}`,
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
                        <p className="font-bold text-[#191c1e]" style={{ fontSize: 13 }}>საძინებლების რაოდენობა</p>
                      </div>
                      <div className="flex gap-2">
                        {[{ v: '', l: 'ნებ.' }, { v: '1', l: '1' }, { v: '2', l: '2' }, { v: '3', l: '3' }, { v: '4', l: '4' }, { v: '5', l: '5+' }].map(c => (
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
                        <p className="font-bold text-[#191c1e]" style={{ fontSize: 13 }}>სრული ფასი</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl transition-all" style={{ border: '1.5px solid #eceef0', background: '#fafbfc' }}
                          onFocus={() => {}} onBlur={() => {}}>
                          <span style={{ color: '#9ea0a7', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>₾</span>
                          <input type="number" placeholder="დან" value={form.priceMin}
                            onChange={e => setForm(f => ({ ...f, priceMin: e.target.value }))}
                            className="bare-input" />
                        </div>
                        <div className="flex-shrink-0 w-5 h-px" style={{ background: '#d1d5db' }} />
                        <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl transition-all" style={{ border: '1.5px solid #eceef0', background: '#fafbfc' }}>
                          <span style={{ color: '#9ea0a7', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>₾</span>
                          <input type="number" placeholder="მდე" value={form.priceMax}
                            onChange={e => setForm(f => ({ ...f, priceMax: e.target.value }))}
                            className="bare-input" />
                        </div>
                      </div>
                    </div>

                    {/* ── Area range ── */}
                    <div className="py-5" style={{ borderBottom: '1px solid #f2f4f6' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.10)' }}>
                          <Maximize2 size={13} strokeWidth={2.3} style={{ color: '#7c3aed' }} />
                        </div>
                        <p className="font-bold text-[#191c1e]" style={{ fontSize: 13 }}>ფართობი</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 flex items-center justify-between gap-2 px-4 py-3 rounded-2xl" style={{ border: '1.5px solid #eceef0', background: '#fafbfc' }}>
                          <input type="number" placeholder="დან" value={form.areaMin}
                            onChange={e => setForm(f => ({ ...f, areaMin: e.target.value }))}
                            className="bare-input" />
                          <span style={{ color: '#b0b2ba', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>მ²</span>
                        </div>
                        <div className="flex-shrink-0 w-5 h-px" style={{ background: '#d1d5db' }} />
                        <div className="flex-1 flex items-center justify-between gap-2 px-4 py-3 rounded-2xl" style={{ border: '1.5px solid #eceef0', background: '#fafbfc' }}>
                          <input type="number" placeholder="მდე" value={form.areaMax}
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
                        <p className="font-bold text-[#191c1e]" style={{ fontSize: 13 }}>ქალაქი</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { v: '', l: 'ყველა' }, { v: 'თბილისი', l: 'თბილისი' }, { v: 'ბათუმი', l: 'ბათუმი' },
                          { v: 'ქუთაისი', l: 'ქუთაისი' }, { v: 'მცხეთა', l: 'მცხეთა' }, { v: 'გორი', l: 'გორი' },
                          { v: 'სიღნაღი', l: 'სიღნაღი' },
                        ].map(c => (
                          <button key={c.v}
                            onClick={() => setForm(f => ({ ...f, city: c.v }))}
                            className="px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-all duration-150"
                            style={{
                              background: form.city === c.v ? '#497cff' : '#f4f5f7',
                              color: form.city === c.v ? '#fff' : '#4b5563',
                              border: `1.5px solid ${form.city === c.v ? '#497cff' : '#eceef0'}`,
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
                      style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', boxShadow: '0 4px 18px rgba(34,197,94,0.30)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(34,197,94,0.45)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 18px rgba(34,197,94,0.30)'}>
                      <Search size={15} strokeWidth={2.5} />
                      ძებნა
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── PREMIUM SEARCH PANEL ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 mt-3 md:-mt-10 mx-3 sm:mx-6 lg:mx-12"
          >
            {/* ── NEW SEARCH CARD ── */}
            <div
              ref={searchPanelRef}
              className="rounded-3xl"
              style={{
                background: '#fff',
                border: '1px solid #e4e6ea',
                boxShadow: '0 8px 40px rgba(15,20,35,0.13), 0 2px 8px rgba(15,20,35,0.06)',
              }}
            >
              {/* ── Row 1: Deal type tabs + property type chips ── */}
              <div className="flex items-center gap-3 px-4 pt-4 pb-3 flex-wrap" style={{ borderBottom: '1px solid #f2f4f6' }}>
                {/* Sale / Rent tabs */}
                <div className="flex rounded-xl p-1 gap-0.5 flex-shrink-0" style={{ background: '#f2f4f6' }}>
                  {([{ v: 'sale', l: 'იყიდება' }, { v: 'rent', l: 'ქირავდება' }] as const).map(({ v, l }) => (
                    <button key={v} onClick={() => setTab(v)}
                      className="px-4 py-1.5 rounded-lg text-[13px] font-bold transition-all duration-200"
                      style={{
                        background: tab === v ? '#191c1e' : 'transparent',
                        color: tab === v ? '#fff' : '#76777d',
                        boxShadow: tab === v ? '0 2px 8px rgba(0,0,0,0.18)' : 'none',
                      }}>{l}</button>
                  ))}
                </div>

                {/* Property type chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {([
                    { v: '', l: 'ყველა' },
                    { v: 'apartment', l: 'ბინა' },
                    { v: 'house', l: 'სახლი' },
                    { v: 'villa', l: 'აგარაკი' },
                    { v: 'commercial', l: 'კომერც.' },
                  ] as const).map(c => (
                    <button key={c.v}
                      onClick={() => setForm(f => ({ ...f, propType: c.v }))}
                      className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-150"
                      style={{
                        background: form.propType === c.v ? 'rgba(73,124,255,0.10)' : 'transparent',
                        color: form.propType === c.v ? '#497cff' : '#76777d',
                        border: `1.5px solid ${form.propType === c.v ? '#497cff' : '#e4e6ea'}`,
                      }}>{c.l}</button>
                  ))}
                </div>

                {/* Live count badge */}
                <div className="hidden sm:flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  <span className="text-[11px] font-bold" style={{ color: '#10B981' }}>12,400+ განცხადება</span>
                </div>
              </div>

              {/* ── Row 2: Search fields ── */}
              <div className="flex flex-col lg:flex-row items-stretch p-3 gap-2 lg:gap-0">

                {/* ① Location field */}
                <div className="relative flex-[2.2] lg:pr-px">
                  <div
                    className="group flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer transition-all duration-200 h-full"
                    style={{
                      border: `1.5px solid ${openField === 'location' ? '#497cff' : '#eceef0'}`,
                      background: openField === 'location' ? 'rgba(73,124,255,0.02)' : '#fafbfc',
                      boxShadow: openField === 'location' ? '0 0 0 3px rgba(73,124,255,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                    onClick={() => setOpenField(openField === 'location' ? null : 'location')}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: openField === 'location' ? 'rgba(73,124,255,0.12)' : '#eef0f3' }}>
                      <MapPin size={14} strokeWidth={2.3} style={{ color: openField === 'location' ? '#497cff' : '#6b7280' }} />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: openField === 'location' ? '#497cff' : '#9ea0a7', marginBottom: 1 }}>
                        ადგილმდებარეობა
                      </p>
                      <p className="text-sm font-semibold truncate" style={{ color: form.city ? '#191c1e' : '#bbbdc4' }}>
                        {form.city || 'ქალაქი, რაიონი, მისამართი...'}
                      </p>
                    </div>
                    <ChevronDown size={13} strokeWidth={2.5} style={{ color: '#b0b2ba', flexShrink: 0, transform: openField === 'location' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
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
                            {[
                              { v: '', l: 'ყველა' }, { v: 'თბილისი', l: 'თბილისი' },
                              { v: 'ბათუმი', l: 'ბათუმი' }, { v: 'ქუთაისი', l: 'ქუთაისი' },
                              { v: 'მცხეთა', l: 'მცხეთა' }, { v: 'გორი', l: 'გორი' },
                            ].map(c => (
                              <button key={c.v}
                                onClick={() => { setForm(f => ({ ...f, city: c.v })); setOpenField(null); }}
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
                            პოპულარული რაიონები
                          </p>
                          {[
                            { v: 'ვაკე', city: 'თბილისი', count: 842 },
                            { v: 'საბურთალო', city: 'თბილისი', count: 614 },
                            { v: 'ისანი', city: 'თბილისი', count: 398 },
                            { v: 'ნაძალადევი', city: 'თბილისი', count: 271 },
                            { v: 'ბულვარი', city: 'ბათუმი', count: 503 },
                            { v: 'ცენტრი', city: 'ბათუმი', count: 389 },
                          ].map(opt => (
                            <div key={opt.v}
                              className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors duration-100"
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f7f9fb'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                              onClick={() => { setForm(f => ({ ...f, city: opt.city })); setOpenField(null); }}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#f0f2f5' }}>
                                  <MapPin size={11} style={{ color: '#9ea0a7' }} />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold" style={{ color: '#191c1e', lineHeight: 1.2 }}>{opt.v}</p>
                                  <p style={{ fontSize: 11, color: '#9ea0a7' }}>{opt.city}</p>
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

                {/* Divider */}
                <div className="hidden lg:flex items-center px-1">
                  <div className="w-px h-10" style={{ background: '#e8eaed' }} />
                </div>

                {/* ② Bedrooms field */}
                <div className="relative flex-1 lg:px-px">
                  <div
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer transition-all duration-200 h-full"
                    style={{
                      border: `1.5px solid ${openField === 'beds' ? '#497cff' : '#eceef0'}`,
                      background: openField === 'beds' ? 'rgba(73,124,255,0.02)' : '#fafbfc',
                      boxShadow: openField === 'beds' ? '0 0 0 3px rgba(73,124,255,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                    onClick={() => setOpenField(openField === 'beds' ? null : 'beds')}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: openField === 'beds' ? 'rgba(73,124,255,0.12)' : '#eef0f3' }}>
                      <Bed size={14} strokeWidth={2.3} style={{ color: openField === 'beds' ? '#497cff' : '#6b7280' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: openField === 'beds' ? '#497cff' : '#9ea0a7', marginBottom: 1 }}>
                        საძინებელი
                      </p>
                      <p className="text-sm font-semibold" style={{ color: form.bedrooms ? '#191c1e' : '#bbbdc4' }}>
                        {form.bedrooms ? `${form.bedrooms}+ ოთახი` : 'ნებისმიერი'}
                      </p>
                    </div>
                    <ChevronDown size={13} strokeWidth={2.5} style={{ color: '#b0b2ba', flexShrink: 0, transform: openField === 'beds' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>

                  <AnimatePresence>
                    {openField === 'beds' && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.18 }}
                        className="absolute top-full left-0 right-0 mt-2 rounded-2xl p-4 z-50"
                        style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06)', minWidth: 200 }}
                      >
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ea0a7', marginBottom: 10 }}>ოთახების რაოდენობა</p>
                        <div className="grid grid-cols-3 gap-2">
                          {[{ v: '', l: 'ნებ.' }, { v: '1', l: '1' }, { v: '2', l: '2' }, { v: '3', l: '3' }, { v: '4', l: '4' }, { v: '5', l: '5+' }].map(opt => (
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

                {/* Divider */}
                <div className="hidden lg:flex items-center px-1">
                  <div className="w-px h-10" style={{ background: '#e8eaed' }} />
                </div>

                {/* ③ Price field */}
                <div className="relative flex-[1.4] lg:px-px">
                  <div
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer transition-all duration-200 h-full"
                    style={{
                      border: `1.5px solid ${openField === 'price' ? '#497cff' : '#eceef0'}`,
                      background: openField === 'price' ? 'rgba(73,124,255,0.02)' : '#fafbfc',
                      boxShadow: openField === 'price' ? '0 0 0 3px rgba(73,124,255,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                    onClick={() => setOpenField(openField === 'price' ? null : 'price')}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: openField === 'price' ? 'rgba(73,124,255,0.12)' : '#eef0f3' }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: openField === 'price' ? '#497cff' : '#6b7280', lineHeight: 1 }}>₾</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: openField === 'price' ? '#497cff' : '#9ea0a7', marginBottom: 1 }}>
                        ფასი
                      </p>
                      <p className="text-sm font-semibold truncate" style={{ color: (form.priceMin || form.priceMax) ? '#191c1e' : '#bbbdc4' }}>
                        {form.priceMin && form.priceMax
                          ? `₾${Number(form.priceMin).toLocaleString()} – ₾${Number(form.priceMax).toLocaleString()}`
                          : form.priceMax
                          ? `მდე ₾${Number(form.priceMax).toLocaleString()}`
                          : form.priceMin
                          ? `₾${Number(form.priceMin).toLocaleString()}+`
                          : 'ნებისმიერი'}
                      </p>
                    </div>
                    <ChevronDown size={13} strokeWidth={2.5} style={{ color: '#b0b2ba', flexShrink: 0, transform: openField === 'price' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>

                  <AnimatePresence>
                    {openField === 'price' && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.18 }}
                        className="absolute top-full left-0 mt-2 rounded-2xl p-4 z-50"
                        style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06)', width: 280 }}
                      >
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9ea0a7', marginBottom: 10 }}>ფასის დიაპაზონი</p>
                        {/* Min/Max inputs at top */}
                        <div className="flex items-center gap-2 mb-4">
                          <div className="flex-1 flex items-center gap-1.5 px-3 py-2.5 rounded-xl" style={{ border: '1.5px solid #eceef0', background: '#fafbfc' }}>
                            <span style={{ color: '#b0b2ba', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>₾</span>
                            <input type="number" placeholder="დან" value={form.priceMin}
                              onChange={e => setForm(f => ({ ...f, priceMin: e.target.value }))}
                              onClick={e => e.stopPropagation()}
                              className="bare-input" />
                          </div>
                          <span style={{ color: '#b0b2ba', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>—</span>
                          <div className="flex-1 flex items-center gap-1.5 px-3 py-2.5 rounded-xl" style={{ border: '1.5px solid #eceef0', background: '#fafbfc' }}>
                            <span style={{ color: '#b0b2ba', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>₾</span>
                            <input type="number" placeholder="მდე" value={form.priceMax}
                              onChange={e => setForm(f => ({ ...f, priceMax: e.target.value }))}
                              onClick={e => e.stopPropagation()}
                              className="bare-input" />
                          </div>
                        </div>
                        {/* Quick presets */}
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#c0c2ca', marginBottom: 8 }}>სწრაფი არჩევა</p>
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
                                background: form.priceMax === opt.max && !form.priceMin ? '#497cff' : '#f2f4f6',
                                color: form.priceMax === opt.max && !form.priceMin ? '#fff' : '#45464d',
                              }}>{opt.l}</button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Divider */}
                <div className="hidden lg:flex items-center px-1">
                  <div className="w-px h-10" style={{ background: '#e8eaed' }} />
                </div>

                {/* ④ Filter button + Search button */}
                <div className="flex items-stretch gap-2 lg:pl-px">
                  {/* Advanced filter button */}
                  <button
                    onClick={() => { setOpenField(null); setFilterModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 flex-shrink-0"
                    style={{
                      background: '#f2f4f6',
                      color: '#45464d',
                      border: '1.5px solid #eceef0',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = '#eceef0';
                      (e.currentTarget as HTMLElement).style.borderColor = '#d0d2da';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = '#f2f4f6';
                      (e.currentTarget as HTMLElement).style.borderColor = '#eceef0';
                    }}
                  >
                    <SlidersHorizontal size={15} strokeWidth={2.3} />
                    <span className="hidden sm:inline">ფილტრი</span>
                  </button>

                  {/* Search button */}
                  <button
                    onClick={handleSearch}
                    className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-white text-sm transition-all duration-200 lg:min-w-[130px]"
                    style={{
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      boxShadow: '0 4px 18px rgba(34,197,94,0.32)',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(34,197,94,0.45)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 18px rgba(34,197,94,0.32)';
                    }}
                  >
                    <Search size={16} strokeWidth={2.5} />
                    ძებნა
                  </button>
                </div>
              </div>

              {/* ── Row 3: Popular tags ── */}
              <div className="flex items-center gap-2 flex-wrap px-4 pb-3.5 pt-0">
                <span style={{ fontSize: 11, color: '#b0b2ba', fontWeight: 600 }}>პოპულარული:</span>
                {[
                  { l: 'ვაკე, თბილისი', q: '?city=თბილისი&district=ვაკე' },
                  { l: 'ბათუმის ცენტრი', q: '?city=ბათუმი' },
                  { l: 'ახალი კომპლექსი', q: '?new=true' },
                  { l: '3-ოთახიანი', q: '?bedrooms=3' },
                  { l: 'ბინა ქირით', q: '?status=rent&propType=apartment' },
                ].map(tag => (
                  <button key={tag.l}
                    onClick={() => navigate(`/listings${tag.q}`)}
                    className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-150"
                    style={{ background: '#f2f4f6', color: '#5a5c64' }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(73,124,255,0.10)';
                      (e.currentTarget as HTMLElement).style.color = '#497cff';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = '#f2f4f6';
                      (e.currentTarget as HTMLElement).style.color = '#5a5c64';
                    }}>{tag.l}</button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ── Quick-access pills ── */}
          <InViewFade delay={0.1}>
            <div className="mt-4 sm:mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mx-3 sm:mx-6 lg:mx-12">
              {[
                { icon: TrendingUp,  label: 'ფასების ანალიტიკა',   color: '#497cff', href: '/blog?cat=market' },
                { icon: BadgePercent,label: 'ბინის შეფასება',      color: '#d97706', href: '/contact' },
                { icon: HardHat,     label: 'ახალი პროექტები',     color: '#10B981', href: '/listings?type=apartment&new=true' },
                { icon: Shield,      label: 'ვერიფიც. აგენტები',   color: '#8b5cf6', href: '/agents?verified=true' },
                { icon: Building2,   label: 'კომერციული ფართები',  color: '#0ea5e9', href: '/listings?type=commercial' },
              ].map(item => (
                <Link
                  key={item.label}
                  to={item.href}
                  className="group flex items-center gap-2.5 rounded-2xl px-3.5 py-3 transition-all duration-200"
                  style={{ background: '#fff', border: '1px solid #eceef0' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${item.color}55`;
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(15,23,42,0.08)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#eceef0';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  <div
                    className="flex items-center justify-center flex-shrink-0 w-9 h-9 rounded-xl transition-transform duration-200 group-hover:scale-105"
                    style={{ background: `${item.color}14` }}
                  >
                    <item.icon size={16} strokeWidth={2.2} style={{ color: item.color }} />
                  </div>
                  <span className="text-[12.5px] font-bold leading-tight" style={{ color: '#2c2d31' }}>
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>
          </InViewFade>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SUPER VIP LISTINGS
      ══════════════════════════════════════════════════════ */}
      <section className="py-10 sm:py-16 lg:py-20" style={{ background: '#fff' }}>
        <div className="container-xl">
          <InViewFade>
            <SectionTitle
              icon={Rocket}
              title="VIP განცხადებები"
              linkTo="/listings?vip=true"
              linkLabel="ყველა VIP"
            />
          </InViewFade>
          <InViewFade delay={0.05}>
            <div className="flex items-center gap-2 flex-wrap mb-8">
              {([
                { v: 'all',        l: 'ყველა'   },
                { v: 'apartment',  l: 'ბინა'    },
                { v: 'house',      l: 'სახლი'   },
                { v: 'villa',      l: 'ვილა'    },
                { v: 'commercial', l: 'კომერც.' },
              ] as const).map(chip => (
                <button
                  key={chip.v}
                  onClick={() => setFeaturedFilter(chip.v)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
                  style={{
                    background: featuredFilter === chip.v ? '#497cff' : '#f2f4f6',
                    color: featuredFilter === chip.v ? '#fff' : '#45464d',
                    border: `1px solid ${featuredFilter === chip.v ? '#497cff' : 'transparent'}`,
                  }}
                >
                  {chip.l}
                </button>
              ))}
            </div>
          </InViewFade>
          <ListingSlider items={featured} badge="vip" />
        </div>
      </section>

      <AdStrip bg="#f7f9fb">
        <AdBanner
          sponsor="Bank of Georgia"
          title="იპოთეკა 8.9%-დან — პირველი 2 წელი ფიქსირებული"
          subtitle="გამოითვლეთ თქვენი ყოველთვიური გადახდა ონლაინ და მიიღეთ წინასწარი დამტკიცება 24 საათში"
          ctaLabel="გამოთვლა"
          ctaHref="/contact"
          variant="navy"
        />
      </AdStrip>

      {/* ══════════════════════════════════════════════════════
          NEW LISTINGS
      ══════════════════════════════════════════════════════ */}
      <section className="py-10 sm:py-16 lg:py-20" style={{ background: '#f7f9fb' }}>
        <div className="container-xl">
          <InViewFade>
            <SectionTitle
              icon={Sparkles}
              title="ახალი განცხადებები"
              accent="green"
              linkTo="/listings?new=true"
              linkLabel="ყველა ახალი"
            />
          </InViewFade>
          <ListingSlider items={newest} badge="new" />
        </div>
      </section>

      <AdStrip bg="#fff">
        <AdBanner
          sponsor="TbilisiRealtors.ge"
          title="SUPER VIP — გაზარდეთ ხილვადობა 10×"
          subtitle="თქვენი განცხადება საიტის პრიორიტეტულ ზონაში. მეტი ვიზიტი, სწრაფი გაყიდვა."
          ctaLabel="VIP აქტივაცია"
          ctaHref="/listings?vip=true"
          variant="blue"
          icon={Rocket}
        />
      </AdStrip>

      {/* ══════════════════════════════════════════════════════
          NEW CONSTRUCTION PROJECTS
      ══════════════════════════════════════════════════════ */}
      <section className="py-10 sm:py-16 lg:py-20 bg-white">
        <div className="container-xl">
          <InViewFade>
            <SectionTitle
              icon={HardHat}
              title="პროექტები"
              linkTo="/listings?type=apartment&new=true"
              linkLabel="ყველა პროექტი"
            />
          </InViewFade>

          <InViewFade delay={0.05}>
            <div
              className="relative rounded-2xl sm:rounded-3xl overflow-hidden p-4 sm:p-6"
              style={{ background: 'linear-gradient(135deg, #131b2e 0%, #1a2d5a 55%, #131b2e 100%)' }}
            >
              <div
                className="absolute inset-0 opacity-[0.06] pointer-events-none"
                style={{
                  backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)',
                  backgroundSize: '32px 32px',
                }}
              />

              <div className="relative flex flex-wrap items-center gap-1.5 sm:gap-2 mb-4 sm:mb-5">
                {[
                  { label: 'პრე-გაყიდვა', color: '#497cff' },
                  { label: '0% საკომისიო', color: '#10B981' },
                  { label: 'უფასო კონსულტაცია', color: '#d97706' },
                ].map(chip => (
                  <span
                    key={chip.label}
                    className="px-2.5 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-bold"
                    style={{ background: `${chip.color}22`, color: chip.color, border: `1px solid ${chip.color}44` }}
                  >
                    {chip.label}
                  </span>
                ))}
              </div>

              <div className="relative grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {constructionProjects.map((project, i) => (
                  <InViewFade key={project.id} delay={0.08 + i * 0.05}>
                    <ConstructionProjectCard project={project} />
                  </InViewFade>
                ))}
              </div>
            </div>
          </InViewFade>
        </div>
      </section>

      <AdStrip bg="#f7f9fb">
        <AdBanner
          sponsor="Archi Group"
          title="Panorama Residence — პრე-გაყიდვა ვაკეში"
          subtitle="186 ბინა · დასრულება 2027 Q2 · ფასი ₾185,000-დან · 0% საკომისიო"
          ctaLabel="პროექტის ნახვა"
          ctaHref="/listings?type=apartment&new=true"
          variant="light"
          icon={HardHat}
          image="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=80"
        />
      </AdStrip>

      {/* ══════════════════════════════════════════════════════
          BLOG & BUYING GUIDES
      ══════════════════════════════════════════════════════ */}
      <section className="py-10 sm:py-16 lg:py-20" style={{ background: '#f7f9fb' }}>
        <div className="container-xl">
          <InViewFade>
            <SectionTitle
              icon={BookOpen}
              title="ბლოგი"
              linkTo="/blog"
              linkLabel="ყველა სტატია"
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

      {/* ══════════════════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════════════════ */}
      <section className="py-10 sm:py-16 lg:py-20 bg-white">
        <div className="container-xl">
          <InViewFade>
            <SectionTitle
              icon={HelpCircle}
              title="ხშირად დასმული კითხვები"
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
                      boxShadow: isOpen ? '0 8px 24px rgba(15,23,42,0.08)' : '0 2px 10px rgba(15,23,42,0.06)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : item.id)}
                      className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left"
                    >
                      <span
                        className="font-semibold text-sm leading-snug"
                        style={{ color: isOpen ? '#497cff' : '#191c1e' }}
                      >
                        {item.question}
                      </span>
                      <div
                        className="flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          border: '2px solid #497cff',
                          background: 'transparent',
                        }}
                      >
                        <ChevronDown
                          size={14}
                          strokeWidth={2.5}
                          style={{
                            color: '#497cff',
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
