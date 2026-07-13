import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Search, MapPin, ChevronDown, ChevronLeft, ChevronRight, ArrowRight,
  Sparkles, Phone,
  Bed, Bath, SlidersHorizontal,
  Square, Heart, Rocket, HardHat, BookOpen, HelpCircle, Clock, BadgePercent,
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
  const [imgIndex, setImgIndex] = useState(0);
  const cardRef = useRef<HTMLAnchorElement>(null);
  const cfg = BADGE_CONFIG[badge];
  const images = property.images;

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

  const handleMouseLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(15,23,42,0.08)';
    setImgIndex(0);
  };

  return (
    <Link
      ref={cardRef}
      to={`/property/${property.id}`}
      className="group relative block overflow-hidden rounded-2xl"
      style={{
        aspectRatio: '3/4',
        boxShadow: '0 2px 10px rgba(15,23,42,0.08)',
        transition: 'box-shadow 0.25s ease',
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(15,23,42,0.16)'; }}
      onMouseLeave={handleMouseLeave}
    >
      {/* Photos — swap on horizontal mouse scrub */}
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={i === 0 ? property.title : ''}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: i === imgIndex ? 1 : 0, transition: 'opacity 0.12s ease' }}
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
                height: 2,
                background: i === imgIndex ? '#fff' : 'rgba(255,255,255,0.35)',
                boxShadow: i === imgIndex ? '0 0 4px rgba(0,0,0,0.25)' : 'none',
              }}
            />
          ))}
        </div>
      )}

      {/* Gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to top, rgba(10,13,20,0.92) 0%, rgba(10,13,20,0.40) 48%, rgba(10,13,20,0.06) 100%)',
        }}
      />

      {/* Hover tint */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: badge === 'vip'
            ? 'linear-gradient(160deg, rgba(73,124,255,0.22) 0%, transparent 55%)'
            : 'linear-gradient(160deg, rgba(16,185,129,0.22) 0%, transparent 55%)',
        }}
      />

      {/* Hover ring */}
      <div
        className={`absolute inset-0 rounded-2xl border-2 border-transparent transition-all duration-300 ${
          badge === 'vip'
            ? 'group-hover:border-[rgba(73,124,255,0.55)]'
            : 'group-hover:border-[rgba(16,185,129,0.55)]'
        }`}
      />

      {/* Badge — top left */}
      <div className="absolute top-2.5 left-2.5">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{
            background: cfg.bg,
            color: cfg.color,
            boxShadow: cfg.shadow,
            letterSpacing: '0.04em',
          }}
        >
          {cfg.icon} {cfg.label}
        </span>
      </div>

      {/* Heart — top right */}
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setLiked(l => !l); }}
        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-xl flex items-center justify-center"
        style={{
          background: liked ? '#ef4444' : 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(10px)',
          border: liked ? 'none' : '1px solid rgba(255,255,255,0.22)',
          transition: 'background 0.18s ease',
        }}
      >
        <Heart size={13} strokeWidth={2} style={{ color: liked ? '#fff' : '#fff', fill: liked ? '#fff' : 'none' }} />
      </button>

      {/* Status — below badge */}
      <div className="absolute top-11 left-2.5">
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.20)',
          }}
        >
          {property.status === 'sale' ? 'იყიდება' : 'ქირავდება'}
        </span>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p
          className="text-white font-bold text-sm leading-tight line-clamp-1"
          style={{ marginBottom: 4 }}
        >
          {property.title}
        </p>
        <div className="flex items-center gap-1 mb-2">
          <MapPin size={10} strokeWidth={2} style={{ color: 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
          <span className="truncate text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {property.district}, {property.city}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-2 mb-2">
          {property.bedrooms > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.70)' }}>
              <Bed size={10} /> {property.bedrooms}
            </span>
          )}
          <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.70)' }}>
            <Square size={10} /> {property.area} მ²
          </span>
          {property.floor && (
            <span className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.50)' }}>
              {property.floor}/{property.totalFloors}სთ
            </span>
          )}
        </div>

        {/* Price */}
        <p className="text-white font-bold" style={{ fontSize: 15, lineHeight: 1, letterSpacing: '-0.01em' }}>
          {priceLabel}
        </p>

        {/* Hover CTA */}
        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="text-[11px] font-bold" style={{ color: badge === 'vip' ? '#7aabff' : '#34d399' }}>
            ნახვა
          </span>
          <ArrowRight size={11} style={{ color: badge === 'vip' ? '#7aabff' : '#34d399' }} />
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
  const [form, setForm] = useState({ city: '', type: '', bedrooms: '', priceMax: '' });
  const [openField, setOpenField] = useState<string | null>(null);
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
    const p = new URLSearchParams({ status: tab, ...form });
    Object.keys(form).forEach(k => { if (!form[k as keyof typeof form]) p.delete(k); });
    navigate(`/listings?${p}`);
  };

  return (
    <div className="min-h-screen" style={{ background: '#f7f9fb' }}>

      {/* ══════════════════════════════════════════════════════
          HERO — contained, border-radius background
      ══════════════════════════════════════════════════════ */}
      <section className="pt-[84px] md:pt-[96px]" style={{ background: '#f7f9fb' }}>
        <div className="container-xl">
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

          {/* ── PREMIUM SEARCH PANEL ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 mt-3 md:-mt-10 mx-3 sm:mx-6 lg:mx-12"
          >
            <div
              ref={searchPanelRef}
              className="rounded-3xl overflow-visible"
              style={{
                background: '#fff',
                border: '1px solid #eceef0',
              }}
            >
              {/* ── Top bar: tabs + type chips + badge ── */}
              <div className="flex items-center justify-between px-5 pt-4 pb-0 gap-3 flex-wrap">
                {/* Sale / Rent pills */}
                <div className="flex rounded-xl p-1 gap-1" style={{ background: '#f2f4f6' }}>
                  {([{ v: 'sale', l: 'იყიდება' }, { v: 'rent', l: 'ქირავდება' }] as const).map(({ v, l }) => (
                    <button
                      key={v}
                      onClick={() => setTab(v)}
                      className="px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-200"
                      style={{
                        background: tab === v ? '#191c1e' : 'transparent',
                        color: tab === v ? '#fff' : '#76777d',
                        boxShadow: tab === v ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                      }}
                    >{l}</button>
                  ))}
                </div>

                {/* Type chips */}
                <div className="hidden md:flex items-center gap-1.5">
                  {([
                    { v: '', l: 'ყველა' }, { v: 'apartment', l: 'ბინა' },
                    { v: 'house', l: 'სახლი' }, { v: 'villa', l: 'ვილა' },
                    { v: 'commercial', l: 'კომერც.' },
                  ] as const).map(c => (
                    <button
                      key={c.v}
                      onClick={() => setForm(f => ({ ...f, type: c.v }))}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150"
                      style={{
                        background: form.type === c.v ? '#497cff' : 'transparent',
                        color: form.type === c.v ? '#fff' : '#76777d',
                        border: `1.5px solid ${form.type === c.v ? '#497cff' : '#e0e3e5'}`,
                      }}
                    >{c.l}</button>
                  ))}
                </div>

                {/* Live count */}
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.20)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  <span className="text-xs font-bold" style={{ color: '#10B981' }}>12,400+ განცხადება</span>
                </div>
              </div>

              {/* ── Fields row ── */}
              <div className="flex flex-col lg:flex-row items-stretch gap-2.5 lg:gap-0 px-4 py-4">

                {/* ① District / keyword dropdown */}
                <div className="relative flex-[2] lg:mr-1.5">
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-200 h-full"
                    style={{
                      border: `1.5px solid ${openField === 'keyword' ? '#497cff' : '#eceef0'}`,
                      background: openField === 'keyword' ? 'rgba(73,124,255,0.03)' : '#fafbfc',
                      boxShadow: openField === 'keyword' ? '0 0 0 4px rgba(73,124,255,0.10)' : '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                    onClick={() => setOpenField(openField === 'keyword' ? null : 'keyword')}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: openField === 'keyword' ? 'rgba(73,124,255,0.12)' : '#f0f2f5' }}>
                      <Search size={16} strokeWidth={2.2} style={{ color: openField === 'keyword' ? '#497cff' : '#76777d' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: openField === 'keyword' ? '#497cff' : '#9ea0a7', marginBottom: 2 }}>
                        მისამართი / რაიონი
                      </p>
                      <p className="text-sm font-semibold truncate" style={{ color: form.type ? '#191c1e' : '#c0c2ca' }}>
                        სად გსურთ ცხოვრება?
                      </p>
                    </div>
                    <ChevronDown size={14} strokeWidth={2.5} style={{ color: '#9ea0a7', flexShrink: 0, transform: openField === 'keyword' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                  </div>
                  <AnimatePresence>
                    {openField === 'keyword' && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.18 }}
                        className="absolute top-full left-0 mt-2 rounded-2xl overflow-hidden z-50 w-[calc(100vw-3.5rem)] sm:w-auto sm:min-w-[280px]"
                        style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)', maxWidth: 320 }}
                      >
                        {/* Search input at top */}
                        <div className="px-4 pt-3 pb-2" style={{ borderBottom: '1px solid #f0f2f5' }}>
                          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#f7f9fb', border: '1.5px solid #eceef0' }}>
                            <Search size={13} style={{ color: '#9ea0a7', flexShrink: 0 }} />
                            <input
                              autoFocus
                              type="text"
                              placeholder="ძებნა..."
                              onClick={e => e.stopPropagation()}
                              className="flex-1 text-sm font-medium text-[#191c1e] bg-transparent border-none p-0 placeholder-[#c0c2ca] outline-none"
                            />
                          </div>
                        </div>
                        {/* Popular districts */}
                        <div className="px-3 py-2">
                          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#9ea0a7', padding: '4px 8px 6px' }}>
                            პოპულარული რაიონები
                          </p>
                          {[
                            { v: 'ვაკე',        city: 'თბილისი', count: 842 },
                            { v: 'საბურთალო',   city: 'თბილისი', count: 614 },
                            { v: 'ისანი',       city: 'თბილისი', count: 398 },
                            { v: 'ნაძალადევი',  city: 'თბილისი', count: 271 },
                            { v: 'ბულვარი',     city: 'ბათუმი',  count: 503 },
                            { v: 'ცენტრი',      city: 'ბათუმი',  count: 389 },
                            { v: 'გლდანი',      city: 'თბილისი', count: 203 },
                          ].map((opt, i) => (
                            <div
                              key={opt.v}
                              className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors duration-100"
                              style={{ background: 'transparent' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f7f9fb'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                              onClick={() => { setForm(f => ({ ...f, city: opt.city })); setOpenField(null); }}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ background: i % 2 === 0 ? 'rgba(73,124,255,0.08)' : '#f0f2f5' }}>
                                  <MapPin size={12} style={{ color: i % 2 === 0 ? '#497cff' : '#9ea0a7' }} />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold" style={{ color: '#191c1e', lineHeight: 1.2 }}>{opt.v}</p>
                                  <p style={{ fontSize: 11, color: '#9ea0a7' }}>{opt.city}</p>
                                </div>
                              </div>
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: '#f0f2f5', color: '#76777d' }}>
                                {opt.count.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ② City custom dropdown */}
                <div className="relative flex-1 lg:mr-1.5">
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-200 h-full"
                    style={{
                      border: `1.5px solid ${openField === 'city' ? '#497cff' : '#eceef0'}`,
                      background: openField === 'city' ? 'rgba(73,124,255,0.03)' : '#fafbfc',
                      boxShadow: openField === 'city' ? '0 0 0 4px rgba(73,124,255,0.10)' : '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                    onClick={() => setOpenField(openField === 'city' ? null : 'city')}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: openField === 'city' ? 'rgba(73,124,255,0.12)' : '#f0f2f5' }}>
                      <MapPin size={16} strokeWidth={2.2} style={{ color: openField === 'city' ? '#497cff' : '#76777d' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: openField === 'city' ? '#497cff' : '#9ea0a7', marginBottom: 2 }}>
                        ქალაქი
                      </p>
                      <p className="text-sm font-semibold truncate" style={{ color: form.city ? '#191c1e' : '#c0c2ca' }}>
                        {form.city || 'ყველა ქ.'}
                      </p>
                    </div>
                    <ChevronDown size={14} strokeWidth={2.5} style={{ color: '#9ea0a7', flexShrink: 0, transform: openField === 'city' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                  </div>
                  <AnimatePresence>
                    {openField === 'city' && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.18 }}
                        className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50 sm:min-w-[200px]"
                        style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)' }}
                      >
                        {[
                          { v: '', l: 'ყველა ქ.', count: 5103 },
                          { v: 'თბილისი', l: 'თბილისი', count: 2847 },
                          { v: 'ბათუმი', l: 'ბათუმი', count: 1234 },
                          { v: 'ქუთაისი', l: 'ქუთაისი', count: 567 },
                          { v: 'მცხეთა', l: 'მცხეთა', count: 234 },
                          { v: 'სიღნაღი', l: 'სიღნაღი', count: 123 },
                          { v: 'გორი', l: 'გორი', count: 98 },
                        ].map((opt, i) => (
                          <div
                            key={opt.v}
                            className="flex items-center justify-between px-4 py-3 cursor-pointer transition-colors duration-100"
                            style={{
                              background: form.city === opt.v ? 'rgba(73,124,255,0.08)' : 'transparent',
                              borderTop: i > 0 ? '1px solid #f0f2f5' : 'none',
                            }}
                            onMouseEnter={e => { if (form.city !== opt.v) (e.currentTarget as HTMLElement).style.background = '#f7f9fb'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = form.city === opt.v ? 'rgba(73,124,255,0.08)' : 'transparent'; }}
                            onClick={() => { setForm(f => ({ ...f, city: opt.v })); setOpenField(null); }}
                          >
                            <div className="flex items-center gap-2.5">
                              <MapPin size={13} style={{ color: form.city === opt.v ? '#497cff' : '#b0b2ba' }} />
                              <span className="text-sm font-semibold" style={{ color: form.city === opt.v ? '#497cff' : '#191c1e' }}>{opt.l}</span>
                            </div>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: '#f0f2f5', color: '#76777d' }}>
                              {opt.count.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ③ Bedrooms dropdown */}
                <div className="relative flex-1 lg:mr-1.5">
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-200 h-full"
                    style={{
                      border: `1.5px solid ${openField === 'beds' ? '#497cff' : '#eceef0'}`,
                      background: openField === 'beds' ? 'rgba(73,124,255,0.03)' : '#fafbfc',
                      boxShadow: openField === 'beds' ? '0 0 0 4px rgba(73,124,255,0.10)' : '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                    onClick={() => setOpenField(openField === 'beds' ? null : 'beds')}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: openField === 'beds' ? 'rgba(73,124,255,0.12)' : '#f0f2f5' }}>
                      <Bed size={16} strokeWidth={2.2} style={{ color: openField === 'beds' ? '#497cff' : '#76777d' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: openField === 'beds' ? '#497cff' : '#9ea0a7', marginBottom: 2 }}>
                        საძინებელი
                      </p>
                      <p className="text-sm font-semibold" style={{ color: form.bedrooms ? '#191c1e' : '#c0c2ca' }}>
                        {form.bedrooms ? `${form.bedrooms}+ ოთახი` : 'ნებისმიერი'}
                      </p>
                    </div>
                    <ChevronDown size={14} strokeWidth={2.5} style={{ color: '#9ea0a7', flexShrink: 0, transform: openField === 'beds' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                  </div>
                  <AnimatePresence>
                    {openField === 'beds' && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.18 }}
                        className="absolute top-full left-0 right-0 mt-2 rounded-2xl p-4 z-50 sm:min-w-[220px]"
                        style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)' }}
                      >
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#9ea0a7', marginBottom: 10 }}>
                          საძინებლების რაოდენობა
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { v: '', l: 'ნებ.' },
                            { v: '1', l: '1+' },
                            { v: '2', l: '2+' },
                            { v: '3', l: '3+' },
                            { v: '4', l: '4+' },
                            { v: '5', l: '5+' },
                          ].map(opt => (
                            <button
                              key={opt.v}
                              onClick={() => { setForm(f => ({ ...f, bedrooms: opt.v })); setOpenField(null); }}
                              className="py-2.5 rounded-xl text-sm font-bold transition-all duration-150"
                              style={{
                                background: form.bedrooms === opt.v ? '#191c1e' : '#f0f2f5',
                                color: form.bedrooms === opt.v ? '#fff' : '#45464d',
                                border: '1.5px solid transparent',
                              }}
                            >{opt.l}</button>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-[#f0f2f5] flex items-center gap-2">
                          <Bath size={13} style={{ color: '#9ea0a7' }} />
                          <span style={{ fontSize: 11, color: '#9ea0a7' }}>სველი წ. ცალკე ფილტრში</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ④ Price dropdown */}
                <div className="relative flex-1 lg:mr-2">
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-200 h-full"
                    style={{
                      border: `1.5px solid ${openField === 'price' ? '#497cff' : '#eceef0'}`,
                      background: openField === 'price' ? 'rgba(73,124,255,0.03)' : '#fafbfc',
                      boxShadow: openField === 'price' ? '0 0 0 4px rgba(73,124,255,0.10)' : '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                    onClick={() => setOpenField(openField === 'price' ? null : 'price')}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: openField === 'price' ? 'rgba(73,124,255,0.12)' : '#f0f2f5' }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: openField === 'price' ? '#497cff' : '#76777d', lineHeight: 1 }}>₾</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: openField === 'price' ? '#497cff' : '#9ea0a7', marginBottom: 2 }}>
                        ბიუჯეტი
                      </p>
                      <p className="text-sm font-semibold truncate" style={{ color: form.priceMax ? '#191c1e' : '#c0c2ca' }}>
                        {form.priceMax ? `მდე ₾${Number(form.priceMax).toLocaleString()}` : 'შეუზღუდავი'}
                      </p>
                    </div>
                    <ChevronDown size={14} strokeWidth={2.5} style={{ color: '#9ea0a7', flexShrink: 0, transform: openField === 'price' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                  </div>
                  <AnimatePresence>
                    {openField === 'price' && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.18 }}
                        className="absolute top-full left-0 right-0 mt-2 rounded-2xl p-4 z-50 sm:min-w-[240px]"
                        style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)' }}
                      >
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#9ea0a7', marginBottom: 10 }}>
                          მაქს. ბიუჯეტი
                        </p>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          {[
                            { v: '50000', l: '₾50K' },
                            { v: '100000', l: '₾100K' },
                            { v: '200000', l: '₾200K' },
                            { v: '350000', l: '₾350K' },
                            { v: '500000', l: '₾500K' },
                            { v: '1000000', l: '₾1M+' },
                          ].map(opt => (
                            <button
                              key={opt.v}
                              onClick={() => { setForm(f => ({ ...f, priceMax: opt.v })); setOpenField(null); }}
                              className="py-2 rounded-xl text-xs font-bold transition-all duration-150"
                              style={{
                                background: form.priceMax === opt.v ? '#497cff' : '#f0f2f5',
                                color: form.priceMax === opt.v ? '#fff' : '#45464d',
                              }}
                            >{opt.l}</button>
                          ))}
                        </div>
                        <div className="border-t border-[#f0f2f5] pt-3">
                          <p style={{ fontSize: 10, fontWeight: 600, color: '#9ea0a7', marginBottom: 6 }}>ან შეიყვანეთ ხელით</p>
                          <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                            style={{ border: '1.5px solid #eceef0', background: '#fafbfc' }}>
                            <span style={{ color: '#497cff', fontWeight: 800, fontSize: 14 }}>₾</span>
                            <input
                              type="number"
                              placeholder="მაქს. ფასი"
                              value={form.priceMax}
                              onChange={e => setForm(f => ({ ...f, priceMax: e.target.value }))}
                              onClick={e => e.stopPropagation()}
                              className="flex-1 text-sm font-semibold text-[#191c1e] bg-transparent border-none p-0 placeholder-[#c0c2ca] outline-none"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ⑤ Search button */}
                <button
                  onClick={handleSearch}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 lg:py-3 rounded-2xl font-bold text-white text-sm w-full lg:w-auto lg:flex-shrink-0 lg:min-w-[140px] transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #191c1e 0%, #2d3133 100%)',
                    boxShadow: '0 4px 18px rgba(0,0,0,0.22)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #497cff 0%, #3567f5 100%)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(73,124,255,0.42)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #191c1e 0%, #2d3133 100%)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 18px rgba(0,0,0,0.22)';
                  }}
                >
                  <Search size={16} strokeWidth={2.5} />
                  ძებნა
                </button>
              </div>

              {/* ── Bottom: popular tags ── */}
              <div
                className="flex items-center gap-2 flex-wrap px-5 pb-4 pt-0"
              >
                <SlidersHorizontal size={12} style={{ color: '#b0b2ba', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: '#b0b2ba', fontWeight: 600 }}>პოპულარული:</span>
                {[
                  { l: 'ვაკე, თბილისი', q: '?city=თბილისი&district=ვაკე' },
                  { l: 'ბათუმის ცენტრი', q: '?city=ბათუმი' },
                  { l: 'ახალი კომპლექსი', q: '?new=true' },
                  { l: 'პრემიუმ', q: '?premium=true' },
                  { l: '3-ოთახიანი', q: '?bedrooms=3' },
                ].map(tag => (
                  <button
                    key={tag.l}
                    onClick={() => navigate(`/listings${tag.q}`)}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-150"
                    style={{ background: '#f0f2f5', color: '#45464d' }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(73,124,255,0.10)';
                      (e.currentTarget as HTMLElement).style.color = '#497cff';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = '#f0f2f5';
                      (e.currentTarget as HTMLElement).style.color = '#45464d';
                    }}
                  >{tag.l}</button>
                ))}
              </div>
            </div>
          </motion.div>
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
