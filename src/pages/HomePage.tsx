import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Search, MapPin, Building2, ChevronDown, Star, ArrowRight,
  Shield, Award, TrendingUp, Users, CheckCircle, Sparkles,
  Key, Tag, Home, Layers, Phone, Bed, Bath, SlidersHorizontal,
  Crown, Square, Heart,
} from 'lucide-react';
import { properties, agents } from '../data/mockData';
import type { Property } from '../data/mockData';

/* ────────────────────────────────────────────────────────────────────────── */

const CATEGORY_TILES = [
  {
    label: 'ბინები',
    sublabel: 'ქალაქური ცხოვრება',
    icon: Building2,
    href: '/listings?type=apartment',
    count: '4,218',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=85',
  },
  {
    label: 'სახლები',
    sublabel: 'კერძო სახლები',
    icon: Home,
    href: '/listings?type=house',
    count: '1,847',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=85',
  },
  {
    label: 'ვილები',
    sublabel: 'ელიტური ვილები',
    icon: Sparkles,
    href: '/listings?type=villa',
    count: '523',
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=85',
  },
  {
    label: 'გაქირავება',
    sublabel: 'ყოველთვიური',
    icon: Key,
    href: '/listings?status=rent',
    count: '2,931',
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=85',
  },
  {
    label: 'კომერციული',
    sublabel: 'ოფისი & მაღაზია',
    icon: Layers,
    href: '/listings?type=commercial',
    count: '892',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=85',
  },
  {
    label: 'პრემიუმ',
    sublabel: 'ელიტური კოლექცია',
    icon: Tag,
    href: '/listings?premium=true',
    count: '318',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=85',
  },
];

const WHYUS = [
  { icon: Shield, title: 'ვერიფ. ქონება', desc: 'ყველა განცხ. გადამოწმ. ჩვენი ექსპ. გუნდის მიერ პირადად.', color: '#131b2e', iconBg: 'rgba(73,124,255,0.12)', iconColor: '#497cff' },
  { icon: Award, title: 'ლიც. სპეც.', desc: '350+ ლიცენზ. აგენტი საშ. 7 წ. გამ. ბაზარზე.', color: '#131b2e', iconBg: 'rgba(217,119,6,0.12)', iconColor: '#d97706' },
  { icon: TrendingUp, title: 'ბაზ. ანალ.', desc: 'რეალ. დროის ფასების ანალ., ტენდ. & ინვ. ROI.', color: '#131b2e', iconBg: 'rgba(22,163,74,0.12)', iconColor: '#16a34a' },
  { icon: Users, title: '96% კმაყ.', desc: '8,200+ კლ. ნდობს ჩვენს სერვ. ქონ. შეძ.-გაყ.ში.', color: '#131b2e', iconBg: 'rgba(124,58,237,0.12)', iconColor: '#7c3aed' },
];

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

/* ─────────────── Compact card (6-per-row) — VIP & New ─────────────────── */
type CardBadge = 'vip' | 'new';

const BADGE_CONFIG: Record<CardBadge, {
  bg: string; color: string; shadow: string;
  icon: React.ReactNode; label: string;
  hoverRing: string;
}> = {
  vip: {
    bg: 'linear-gradient(135deg, #f5c142 0%, #e8960e 100%)',
    color: '#000',
    shadow: '0 2px 8px rgba(245,193,66,0.50)',
    icon: <Crown size={8} strokeWidth={3} />,
    label: 'VIP',
    hoverRing: '0 0 0 2px rgba(245,193,66,0.70), 0 16px 40px rgba(0,0,0,0.28)',
  },
  new: {
    bg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    color: '#fff',
    shadow: '0 2px 8px rgba(16,185,129,0.45)',
    icon: <Sparkles size={8} strokeWidth={3} />,
    label: 'ახალი',
    hoverRing: '0 0 0 2px rgba(16,185,129,0.65), 0 16px 40px rgba(0,0,0,0.28)',
  },
};

function VipListingCard({ property, badge = 'vip' }: { property: Property; badge?: CardBadge }) {
  const [liked, setLiked] = useState(false);
  const [hovered, setHovered] = useState(false);
  const cfg = BADGE_CONFIG[badge];

  const priceLabel = property.status === 'rent'
    ? `₾${property.price.toLocaleString()}/თვ.`
    : `₾${property.price.toLocaleString()}`;

  return (
    <div
      className="relative flex flex-col bg-white rounded-[16px] overflow-hidden"
      style={{
        boxShadow: hovered
          ? cfg.hoverRing
          : '0 2px 16px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.06)',
        transition: 'box-shadow 0.22s ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Image ── */}
      <Link to={`/property/${property.id}`} className="relative block" style={{ aspectRatio: '4/3' }}>
        <img
          src={property.images[0]}
          alt={property.title}
          className="w-full h-full object-cover"
        />
        {/* gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(5,7,14,0.75) 0%, rgba(5,7,14,0.12) 48%, transparent 100%)' }}
        />
        {/* Badge */}
        <div className="absolute top-2 left-2">
          <span
            className="inline-flex items-center gap-1"
            style={{
              background: cfg.bg,
              color: cfg.color,
              fontSize: 9,
              fontWeight: 900,
              padding: '3px 7px',
              borderRadius: 999,
              letterSpacing: '0.05em',
              boxShadow: cfg.shadow,
            }}
          >
            {cfg.icon} {cfg.label}
          </span>
        </div>
        {/* Heart */}
        <button
          onClick={e => { e.preventDefault(); setLiked(l => !l); }}
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-200"
          style={{ background: liked ? '#ef4444' : 'rgba(255,255,255,0.88)', boxShadow: '0 1px 6px rgba(0,0,0,0.22)' }}
        >
          <Heart size={11} strokeWidth={2} style={{ color: liked ? '#fff' : '#45464d', fill: liked ? '#fff' : 'none' }} />
        </button>
        {/* Price + status */}
        <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 flex items-end justify-between">
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 800, letterSpacing: '-0.01em', textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>
            {priceLabel}
          </span>
          <span
            style={{
              fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
              background: property.status === 'sale' ? 'rgba(20,24,36,0.88)' : 'rgba(73,124,255,0.90)',
              color: '#fff', letterSpacing: '0.02em',
            }}
          >
            {property.status === 'sale' ? 'იყიდება' : 'ქირავდება'}
          </span>
        </div>
      </Link>

      {/* ── Content ── */}
      <Link to={`/property/${property.id}`} className="flex-1 flex flex-col px-3 pt-2.5 pb-3">
        <p
          className="font-bold line-clamp-1 leading-snug mb-1.5 transition-colors duration-200"
          style={{ fontSize: 12, color: hovered ? '#497cff' : '#191c1e' }}
        >
          {property.title}
        </p>
        <div className="flex items-center gap-1 mb-2.5">
          <MapPin size={10} strokeWidth={2} style={{ color: '#497cff', flexShrink: 0 }} />
          <span className="truncate" style={{ fontSize: 10.5, color: '#9ea0a7', fontWeight: 500 }}>
            {property.district}, {property.city}
          </span>
        </div>
        <div
          className="mt-auto flex items-center gap-3 pt-2"
          style={{ borderTop: '1px solid #f0f2f5', fontSize: 11, color: '#45464d' }}
        >
          {property.bedrooms > 0 && (
            <span className="flex items-center gap-1">
              <Bed size={10} strokeWidth={2} style={{ color: '#b0b2ba' }} />
              <strong style={{ color: '#191c1e', fontWeight: 700 }}>{property.bedrooms}</strong>
            </span>
          )}
          <span className="flex items-center gap-1">
            <Square size={10} strokeWidth={2} style={{ color: '#b0b2ba' }} />
            <strong style={{ color: '#191c1e', fontWeight: 700 }}>{property.area}</strong>
            <span style={{ color: '#9ea0a7' }}>მ²</span>
          </span>
          {property.floor && (
            <span style={{ marginLeft: 'auto', color: '#b0b2ba', fontSize: 10 }}>
              {property.floor}/{property.totalFloors}სთ
            </span>
          )}
        </div>
      </Link>
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
      <section className="pt-[96px]" style={{ background: '#f7f9fb' }}>
        <div className="container-xl">
          {/* Contained hero card */}
          <div
            className="relative overflow-hidden"
            style={{
              borderRadius: '2rem',
              height: 'clamp(420px, 52vh, 560px)',
            }}
          >
            {/* BG Image */}
            <img
              src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=90"
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
                    საქართველოს #1 უძრავი ქონების პლატფორმა
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
                  className="inline-flex items-stretch rounded-2xl overflow-hidden mb-7"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  {[
                    { v: '12,400+', l: 'ქონება' },
                    { v: '350+',    l: 'აგენტი' },
                    { v: '96%',     l: 'კმაყოფ.' },
                  ].map((s, i) => (
                    <div
                      key={s.l}
                      className="flex flex-col items-center px-5 py-3"
                      style={{ borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.10)' : 'none' }}
                    >
                      <span className="text-white font-bold text-base leading-none">{s.v}</span>
                      <span className="text-white/45 text-[11px] font-medium mt-1">{s.l}</span>
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
            className="relative z-10 -mt-10 mx-3 sm:mx-6 lg:mx-12"
          >
            <div
              ref={searchPanelRef}
              className="rounded-3xl overflow-visible"
              style={{
                background: '#fff',
                boxShadow: '0 32px 80px rgba(15,23,42,0.22), 0 0 0 1px rgba(0,0,0,0.06)',
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
                  <span className="text-xs font-bold" style={{ color: '#10B981' }}>12,400+ ქონება</span>
                </div>
              </div>

              {/* ── Fields row ── */}
              <div className="flex flex-col lg:flex-row items-stretch gap-0 px-4 py-4">

                {/* ① District / keyword dropdown */}
                <div className="relative flex-[2]" style={{ marginRight: 6 }}>
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
                        className="absolute top-full left-0 mt-2 rounded-2xl overflow-hidden z-50"
                        style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)', minWidth: 280 }}
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
                <div className="relative flex-1" style={{ marginRight: 6 }}>
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
                        className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50"
                        style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)', minWidth: 200 }}
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
                <div className="relative flex-1" style={{ marginRight: 6 }}>
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
                        className="absolute top-full left-0 right-0 mt-2 rounded-2xl p-4 z-50"
                        style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)', minWidth: 220 }}
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
                <div className="relative flex-1" style={{ marginRight: 8 }}>
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
                        className="absolute top-full left-0 right-0 mt-2 rounded-2xl p-4 z-50"
                        style={{ background: '#fff', boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)', minWidth: 240 }}
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
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-white text-sm flex-shrink-0 transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #191c1e 0%, #2d3133 100%)',
                    boxShadow: '0 4px 18px rgba(0,0,0,0.22)',
                    minWidth: 140,
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
          CATEGORY TILES — compact photo grid
      ══════════════════════════════════════════════════════ */}
      <section className="py-14 bg-white">
        <div className="container-xl">

          {/* Header */}
          <InViewFade>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest mb-3"
                  style={{ background: 'rgba(73,124,255,0.10)', color: '#497cff', border: '1px solid rgba(73,124,255,0.20)' }}
                >
                  <Layers size={10} />
                  კატეგორიები
                </span>
                <h2 className="headline-lg text-[#191c1e]">სად გსურთ ძებნა?</h2>
                <p className="body-md mt-1" style={{ color: '#76777d' }}>
                  6 კატეგორია · 10,729+ განცხადება
                </p>
              </div>
              <Link
                to="/listings"
                className="hidden sm:flex items-center gap-1.5 text-sm font-semibold flex-shrink-0"
                style={{ color: '#497cff' }}
              >
                ყველა კატეგორია <ArrowRight size={15} />
              </Link>
            </div>
          </InViewFade>

          {/* Compact 6-col photo strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {CATEGORY_TILES.map((cat, i) => (
              <InViewFade key={cat.label} delay={i * 0.04}>
                <Link
                  to={cat.href}
                  className="group relative block overflow-hidden rounded-2xl"
                  style={{
                    aspectRatio: '3/4',
                    boxShadow: '0 2px 10px rgba(15,23,42,0.08)',
                    transition: 'box-shadow 0.25s ease',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px rgba(15,23,42,0.16)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(15,23,42,0.08)';
                  }}
                >
                  {/* Photo */}
                  <img
                    src={cat.image}
                    alt={cat.label}
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  {/* Gradient */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(to top, rgba(10,13,20,0.88) 0%, rgba(10,13,20,0.35) 45%, rgba(10,13,20,0.08) 100%)',
                    }}
                  />

                  {/* Hover blue tint */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: 'linear-gradient(160deg, rgba(73,124,255,0.20) 0%, transparent 55%)' }}
                  />

                  {/* Hover ring */}
                  <div
                    className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-[rgba(73,124,255,0.55)] transition-all duration-300"
                  />

                  {/* Count badge — top right */}
                  <div className="absolute top-2.5 right-2.5">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{
                        background: 'rgba(255,255,255,0.18)',
                        color: '#fff',
                        backdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.22)',
                      }}
                    >
                      {cat.count}
                    </span>
                  </div>

                  {/* Icon pill — top left */}
                  <div className="absolute top-2.5 left-2.5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.22)',
                      }}
                    >
                      <cat.icon size={15} strokeWidth={2} style={{ color: '#fff' }} />
                    </div>
                  </div>

                  {/* Bottom info */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-bold text-sm leading-tight">{cat.label}</p>
                    <p className="text-white/55 text-[10px] font-medium mt-0.5 truncate">{cat.sublabel}</p>
                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <span className="text-[11px] font-bold" style={{ color: '#7aabff' }}>ნახვა</span>
                      <ArrowRight size={11} style={{ color: '#7aabff' }} />
                    </div>
                  </div>
                </Link>
              </InViewFade>
            ))}
          </div>

          {/* Compact quick-links row */}
          <InViewFade delay={0.15}>
            <div
              className="flex items-center gap-2 flex-wrap mt-5 px-4 py-3 rounded-2xl"
              style={{ background: '#f7f9fb', border: '1px solid #eceef0' }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: '#9ea0a7', flexShrink: 0 }}>სწრაფი:</span>
              {[
                { l: 'ახალი ბინები', href: '/listings?type=apartment&new=true' },
                { l: 'ვაკე', href: '/listings?city=თბილისი&district=ვაკე' },
                { l: 'ბათუმი', href: '/listings?city=ბათუმი' },
                { l: 'ქირავდება', href: '/listings?status=rent' },
                { l: 'პრემიუმ', href: '/listings?premium=true' },
              ].map(link => (
                <Link
                  key={link.l}
                  to={link.href}
                  className="px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150"
                  style={{ background: '#fff', color: '#45464d', border: '1px solid #e0e3e5' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = '#497cff';
                    (e.currentTarget as HTMLElement).style.color = '#fff';
                    (e.currentTarget as HTMLElement).style.borderColor = '#497cff';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = '#fff';
                    (e.currentTarget as HTMLElement).style.color = '#45464d';
                    (e.currentTarget as HTMLElement).style.borderColor = '#e0e3e5';
                  }}
                >
                  {link.l}
                </Link>
              ))}
            </div>
          </InViewFade>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          VIP LISTINGS — paid premium placements
      ══════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #06080f 0%, #0b0f1e 55%, #060810 100%)', paddingTop: 80, paddingBottom: 80 }}
      >
        {/* Ambient gold glow — top-left */}
        <div
          className="absolute pointer-events-none"
          style={{ top: '-20%', left: '-8%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,193,66,0.055) 0%, transparent 65%)' }}
        />
        {/* Ambient blue glow — bottom-right */}
        <div
          className="absolute pointer-events-none"
          style={{ bottom: '-15%', right: '-8%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(73,124,255,0.07) 0%, transparent 65%)' }}
        />
        {/* Subtle grid lines */}
        <div
          className="absolute inset-0 opacity-[0.022]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '56px 56px' }}
        />

        <div className="container-xl relative">

          {/* ── Section header ── */}
          <InViewFade>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10">

              {/* Left */}
              <div>
                {/* VIP pill */}
                <div
                  className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-5"
                  style={{ background: 'linear-gradient(135deg, rgba(245,193,66,0.14), rgba(240,168,32,0.07))', border: '1px solid rgba(245,193,66,0.32)' }}
                >
                  <Crown size={13} style={{ color: '#f5c142' }} />
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#f5c142' }}>
                    VIP განცხადებები
                  </span>
                  <span style={{ width: 1, height: 12, background: 'rgba(245,193,66,0.30)' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(245,193,66,0.60)' }}>პლატინიუმ პაკეტი</span>
                </div>

                <h2
                  className="font-bold mb-3"
                  style={{ fontSize: 'clamp(26px, 3.2vw, 40px)', color: '#fff', lineHeight: 1.12, letterSpacing: '-0.015em' }}
                >
                  პრიორიტეტული{' '}
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #f5c142 0%, #f0a820 55%, #e8960e 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    განცხადებები
                  </span>
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: 14, lineHeight: 1.65, maxWidth: 460 }}>
                  ეს ქონებები VIP ხილვადობის პაკეტით სარგებლობს — სამჯერ მეტი ვიზიტი,
                  პირველი სტრიქონი, ოქროს ბეჯი
                </p>
              </div>

              {/* Right: metrics + link */}
              <div className="flex items-center gap-0 flex-shrink-0">
                {[
                  { v: `${featured.length}`, l: 'VIP ახლა' },
                  { v: '3×', l: 'მეტი ხედვა' },
                  { v: '₾99/თვ', l: 'პაკეტი' },
                ].map((s, i) => (
                  <div
                    key={s.l}
                    className="text-center px-6"
                    style={{ borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}
                  >
                    <p style={{ fontSize: 24, fontWeight: 800, color: '#f5c142', lineHeight: 1, letterSpacing: '-0.01em' }}>{s.v}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 5, fontWeight: 600, letterSpacing: '0.03em' }}>{s.l}</p>
                  </div>
                ))}
                <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.08)', marginLeft: 8, marginRight: 16 }} />
                <Link
                  to="/listings?vip=true"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold flex-shrink-0"
                  style={{ background: 'rgba(245,193,66,0.10)', color: '#f5c142', border: '1px solid rgba(245,193,66,0.28)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(245,193,66,0.18)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(245,193,66,0.10)'; }}
                >
                  ყველა VIP <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </InViewFade>

          {/* ── Filter chips ── */}
          <InViewFade delay={0.06}>
            <div className="flex items-center gap-2 flex-wrap mb-8">
              {([
                { v: 'all',        l: 'ყველა'    },
                { v: 'apartment',  l: 'ბინა'     },
                { v: 'house',      l: 'სახლი'    },
                { v: 'villa',      l: 'ვილა'     },
                { v: 'commercial', l: 'კომერც.'  },
              ] as const).map(chip => (
                <button
                  key={chip.v}
                  onClick={() => setFeaturedFilter(chip.v)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
                  style={{
                    background: featuredFilter === chip.v ? '#f5c142' : 'rgba(255,255,255,0.06)',
                    color: featuredFilter === chip.v ? '#0a0c14' : 'rgba(255,255,255,0.55)',
                    border: `1px solid ${featuredFilter === chip.v ? '#f5c142' : 'rgba(255,255,255,0.12)'}`,
                  }}
                >
                  {chip.l}
                </button>
              ))}
              {/* Live badge */}
              <div
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981' }}>{featured.length} VIP ახლა</span>
              </div>
            </div>
          </InViewFade>

          {/* ── 6-column VIP grid ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {featured.slice(0, 12).map((p, i) => (
              <InViewFade key={p.id} delay={i * 0.035}>
                <VipListingCard property={p} />
              </InViewFade>
            ))}
          </div>

          {/* ── Promote-your-listing CTA ── */}
          <InViewFade delay={0.18}>
            <div
              className="mt-10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 px-8 py-6"
              style={{ background: 'rgba(245,193,66,0.055)', border: '1px solid rgba(245,193,66,0.18)' }}
            >
              <div className="flex items-center gap-5">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(245,193,66,0.12)', border: '1px solid rgba(245,193,66,0.22)' }}
                >
                  <Crown size={22} style={{ color: '#f5c142' }} />
                </div>
                <div>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 3 }}>
                    გამოაქვეყნეთ VIP-ად
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: 13 }}>
                    3× მეტი ხილვადობა · ოქროს VIP ბეჯი · პირველი სტრიქონი ძებნაში
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right hidden sm:block">
                  <p style={{ color: '#f5c142', fontWeight: 800, fontSize: 20, lineHeight: 1 }}>
                    ₾99
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(245,193,66,0.60)' }}>/თვ.</span>
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', marginTop: 3 }}>VIP პაკეტი</p>
                </div>
                <Link
                  to="/contact"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm flex-shrink-0 transition-opacity duration-200"
                  style={{ background: 'linear-gradient(135deg, #f5c142 0%, #e8960e 100%)', color: '#07090e' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.88'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                >
                  <Crown size={14} /> VIP-ში გადასვლა
                </Link>
              </div>
            </div>
          </InViewFade>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          NEW LISTINGS — 6-col × 2-row, dark premium
      ══════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #060a10 0%, #0a1018 55%, #060a10 100%)', paddingTop: 80, paddingBottom: 80 }}
      >
        {/* Ambient emerald glow — top-right */}
        <div
          className="absolute pointer-events-none"
          style={{ top: '-18%', right: '-6%', width: 650, height: 650, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 65%)' }}
        />
        {/* Ambient blue glow — bottom-left */}
        <div
          className="absolute pointer-events-none"
          style={{ bottom: '-14%', left: '-6%', width: 580, height: 580, borderRadius: '50%', background: 'radial-gradient(circle, rgba(73,124,255,0.07) 0%, transparent 65%)' }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.022]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '56px 56px' }}
        />

        <div className="container-xl relative">

          {/* ── Section header ── */}
          <InViewFade>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-10">

              {/* Left */}
              <div>
                {/* New pill */}
                <div
                  className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full mb-5"
                  style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(5,150,105,0.07))', border: '1px solid rgba(16,185,129,0.30)' }}
                >
                  <Sparkles size={13} style={{ color: '#10B981' }} />
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#10B981' }}>
                    ახალი განცხადებები
                  </span>
                  <span style={{ width: 1, height: 12, background: 'rgba(16,185,129,0.30)' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(16,185,129,0.60)' }}>ბოლო 7 დღე</span>
                </div>

                <h2
                  className="font-bold mb-3"
                  style={{ fontSize: 'clamp(26px, 3.2vw, 40px)', color: '#fff', lineHeight: 1.12, letterSpacing: '-0.015em' }}
                >
                  ახლახანს{' '}
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #34d399 0%, #10B981 55%, #059669 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    დამატებული
                  </span>
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: 14, lineHeight: 1.65, maxWidth: 460 }}>
                  ყოველდღიურად ემატება ასობით ახალი განცხადება — ყველაზე სწრაფი
                  გზა სასურველი ქონების საპოვნელად
                </p>
              </div>

              {/* Right: metrics + link */}
              <div className="flex items-center gap-0 flex-shrink-0">
                {[
                  { v: `${newest.length}`, l: 'ახალი ახლა' },
                  { v: '47+', l: 'დღეში ემ.' },
                  { v: '7 დღე', l: 'სიახლე' },
                ].map((s, i) => (
                  <div
                    key={s.l}
                    className="text-center px-6"
                    style={{ borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}
                  >
                    <p style={{ fontSize: 24, fontWeight: 800, color: '#10B981', lineHeight: 1, letterSpacing: '-0.01em' }}>{s.v}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 5, fontWeight: 600, letterSpacing: '0.03em' }}>{s.l}</p>
                  </div>
                ))}
                <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.08)', marginLeft: 8, marginRight: 16 }} />
                <Link
                  to="/listings?new=true"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold flex-shrink-0"
                  style={{ background: 'rgba(16,185,129,0.10)', color: '#10B981', border: '1px solid rgba(16,185,129,0.28)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.18)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(16,185,129,0.10)'; }}
                >
                  ყველა ახალი <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </InViewFade>

          {/* ── Live badge row ── */}
          <InViewFade delay={0.06}>
            <div className="flex items-center gap-3 mb-8">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981' }}>ახლახან დამატებული</span>
              </div>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', fontWeight: 500 }}>
                განახლება ყოველ 15 წუთში
              </span>
            </div>
          </InViewFade>

          {/* ── 6-column grid ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {newest.slice(0, 12).map((p, i) => (
              <InViewFade key={p.id} delay={i * 0.035}>
                <VipListingCard property={p} badge="new" />
              </InViewFade>
            ))}
          </div>

          {/* ── Bottom CTA strip ── */}
          <InViewFade delay={0.18}>
            <div
              className="mt-10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 px-8 py-6"
              style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.16)' }}
            >
              <div className="flex items-center gap-5">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)' }}
                >
                  <TrendingUp size={22} style={{ color: '#10B981' }} />
                </div>
                <div>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 3 }}>
                    გამოაქვეყნეთ ახალი განცხადება
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.40)', fontSize: 13 }}>
                    უფასოდ · ტოპ ძებნაში · 24 საათში ვერიფიკაცია
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <Link
                  to="/listings?new=true"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.70)', border: '1px solid rgba(255,255,255,0.12)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                >
                  ყველა ახალი <ArrowRight size={14} />
                </Link>
                <Link
                  to="/contact"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm flex-shrink-0 transition-opacity duration-200"
                  style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#fff' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.88'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                >
                  <Sparkles size={14} /> განცხ. დამატება
                </Link>
              </div>
            </div>
          </InViewFade>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          WHY CHOOSE US
      ══════════════════════════════════════════════════════ */}
      <section className="py-20" style={{ background: '#131b2e' }}>
        <div className="container-xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left text */}
            <InViewFade>
              <p className="section-label mb-3" style={{ color: '#497cff' }}>ჩვენი უპირატ.</p>
              <h2 className="headline-lg text-white mb-4">
                რატომ TbilisiRealtors.ge?
              </h2>
              <p className="body-lg text-white/60 mb-10 max-w-lg">
                2018 წლიდან ვეხმარებით ქართელ ოჯახებს სახლის პოვნაში.
                პრემიუმ სერვისი, გამჭვირვალე პროცესი, სანდო გუნდი.
              </p>

              <div className="space-y-5">
                {WHYUS.map((w, i) => (
                  <InViewFade key={w.title} delay={0.1 + i * 0.09}>
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: w.iconBg }}>
                        <w.icon size={21} strokeWidth={1.8} style={{ color: w.iconColor }} />
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm mb-1">{w.title}</p>
                        <p className="text-white/55 text-[13px] leading-relaxed">{w.desc}</p>
                      </div>
                    </div>
                  </InViewFade>
                ))}
              </div>

              <InViewFade delay={0.5} className="mt-10 flex gap-3">
                <Link to="/about" className="btn-accent px-6 py-3 rounded-xl text-sm">
                  გაიგეთ მეტი <ArrowRight size={15} />
                </Link>
                <Link to="/contact" className="btn-ghost px-6 py-3 rounded-xl text-sm text-white border-white/20 hover:bg-white/10">
                  დაგვიკავ. <Phone size={14} />
                </Link>
              </InViewFade>
            </InViewFade>

            {/* Right — stats grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { v: '12,400+', l: 'ქონება', sub: 'ვერიფ. განცხ.', icon: Building2, color: '#497cff' },
                { v: '8,200+', l: 'კლიენტი', sub: 'კმაყ. მომხ.', icon: Users, color: '#10B981' },
                { v: '350+', l: 'აგენტი', sub: 'ლიც. სპეც.', icon: Award, color: '#d97706' },
                { v: '96%', l: 'კმაყ.', sub: 'კლიენტ. შეფ.', icon: CheckCircle, color: '#7c3aed' },
              ].map((s, i) => (
                <InViewFade key={s.l} delay={i * 0.1}>
                  <div
                    className="rounded-2xl p-6"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                      style={{ background: `${s.color}20` }}>
                      <s.icon size={20} strokeWidth={1.8} style={{ color: s.color }} />
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{s.v}</p>
                    <p className="text-sm font-semibold text-white/80">{s.l}</p>
                    <p className="text-[12px] text-white/40 mt-0.5">{s.sub}</p>
                  </div>
                </InViewFade>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          MAKLERS — infinite auto-scroll slider
      ══════════════════════════════════════════════════════ */}
      <section className="py-20 overflow-hidden" style={{ background: '#f7f9fb' }}>

        {/* ── Header (contained) ── */}
        <div className="container-xl mb-10">
          <InViewFade className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
                style={{ background: 'rgba(73,124,255,0.09)', border: '1px solid rgba(73,124,255,0.22)' }}
              >
                <Users size={12} style={{ color: '#497cff' }} />
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.13em', textTransform: 'uppercase', color: '#497cff' }}>
                  ჩვენი გუნდი
                </span>
              </div>
              <h2
                className="font-bold mb-2"
                style={{ fontSize: 'clamp(24px, 3vw, 38px)', color: '#191c1e', letterSpacing: '-0.015em', lineHeight: 1.12 }}
              >
                Maklers
              </h2>
              <p style={{ color: '#76777d', fontSize: 14 }}>
                350+ ლიცენზირებული სპეციალისტი — საშუალოდ 7 წლიანი გამოცდილებით
              </p>
            </div>
            <Link
              to="/agents"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold flex-shrink-0"
              style={{ background: '#fff', color: '#191c1e', border: '1.5px solid #e0e3e5' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#497cff'; (e.currentTarget as HTMLElement).style.color = '#497cff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e0e3e5'; (e.currentTarget as HTMLElement).style.color = '#191c1e'; }}
            >
              ყველა Makler <ArrowRight size={15} />
            </Link>
          </InViewFade>
        </div>

        {/* ── Infinite marquee track (full-bleed) ── */}
        {/* Fade masks on left/right edges */}
        <div className="relative">
          <div
            className="absolute left-0 top-0 bottom-0 w-24 pointer-events-none z-10"
            style={{ background: 'linear-gradient(to right, #f7f9fb 0%, transparent 100%)' }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-24 pointer-events-none z-10"
            style={{ background: 'linear-gradient(to left, #f7f9fb 0%, transparent 100%)' }}
          />

          {/* Scrolling track — duplicated for seamless loop */}
          <div className="marquee-track" style={{ gap: 20, paddingLeft: 20, paddingRight: 20 }}>
            {[...agents, ...agents].map((agent, i) => (
              <Link
                key={`${agent.id}-${i}`}
                to={`/agent/${agent.id}`}
                className="group flex-shrink-0 flex flex-col bg-white rounded-2xl overflow-hidden"
                style={{
                  width: 200,
                  textDecoration: 'none',
                  border: '1px solid #eceef0',
                  boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
                  transition: 'box-shadow 0.22s ease, border-color 0.22s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(73,124,255,0.16)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(73,124,255,0.40)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(15,23,42,0.06)';
                  (e.currentTarget as HTMLElement).style.borderColor = '#eceef0';
                }}
              >
                {/* Coloured banner */}
                <div
                  className="relative flex-shrink-0"
                  style={{
                    height: 72,
                    background: i % 3 === 0
                      ? 'linear-gradient(135deg, #131b2e 0%, #1a2d5a 100%)'
                      : i % 3 === 1
                      ? 'linear-gradient(135deg, #1a1208 0%, #3a2e10 100%)'
                      : 'linear-gradient(135deg, #0c1910 0%, #0e2a1a 100%)',
                  }}
                >
                  {/* Grid texture */}
                  <div
                    className="absolute inset-0 opacity-[0.10]"
                    style={{
                      backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)',
                      backgroundSize: '20px 20px',
                    }}
                  />
                  {/* Rating pill — top right */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.20)' }}>
                    <Star size={9} fill="#d97706" style={{ color: '#d97706' }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{agent.rating}</span>
                  </div>
                </div>

                {/* Avatar — overlapping the banner */}
                <div className="relative px-4" style={{ marginTop: -28 }}>
                  <div
                    className="relative rounded-xl overflow-hidden"
                    style={{ width: 56, height: 56, border: '2.5px solid #fff', boxShadow: '0 3px 10px rgba(0,0,0,0.16)' }}
                  >
                    <img src={agent.photo} alt={agent.name} className="w-full h-full object-cover" />
                  </div>
                  {agent.verified && (
                    <div
                      className="absolute flex items-center justify-center rounded-full border-2 border-white"
                      style={{ width: 18, height: 18, background: '#497cff', bottom: 0, left: 44 }}
                    >
                      <CheckCircle size={9} color="#fff" fill="#fff" strokeWidth={0} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="px-4 pt-2 pb-4 flex flex-col flex-1">
                  <p
                    className="font-bold leading-tight mb-0.5 group-hover:text-[#497cff] transition-colors"
                    style={{ fontSize: 13, color: '#191c1e' }}
                  >
                    {agent.name}
                  </p>
                  <p style={{ fontSize: 11, color: '#9ea0a7', marginBottom: 8 }}>{agent.company}</p>

                  {/* Specialization tag */}
                  <div className="mb-3">
                    <span
                      className="inline-block px-2 py-0.5 rounded-full"
                      style={{ fontSize: 10, fontWeight: 600, background: '#f0f2f5', color: '#45464d' }}
                    >
                      {agent.specialization[0]}
                    </span>
                  </div>

                  {/* Mini stats */}
                  <div
                    className="flex items-center justify-between rounded-lg px-3 py-2 mt-auto mb-3"
                    style={{ background: '#f7f9fb', border: '1px solid #eceef0' }}
                  >
                    <div className="text-center">
                      <p style={{ fontSize: 13, fontWeight: 800, color: '#191c1e', lineHeight: 1 }}>{agent.propertyCount}</p>
                      <p style={{ fontSize: 9, color: '#9ea0a7', marginTop: 2, fontWeight: 600 }}>ქონება</p>
                    </div>
                    <div style={{ width: 1, height: 24, background: '#eceef0' }} />
                    <div className="text-center">
                      <p style={{ fontSize: 13, fontWeight: 800, color: '#191c1e', lineHeight: 1 }}>{agent.yearsExperience}წ</p>
                      <p style={{ fontSize: 9, color: '#9ea0a7', marginTop: 2, fontWeight: 600 }}>გამოც.</p>
                    </div>
                    <div style={{ width: 1, height: 24, background: '#eceef0' }} />
                    <div className="text-center">
                      <p style={{ fontSize: 13, fontWeight: 800, color: '#191c1e', lineHeight: 1 }}>{agent.reviewCount}</p>
                      <p style={{ fontSize: 9, color: '#9ea0a7', marginTop: 2, fontWeight: 600 }}>შეფ.</p>
                    </div>
                  </div>

                  {/* Call button */}
                  <button
                    type="button"
                    onClick={e => { e.preventDefault(); e.stopPropagation(); window.location.href = `tel:${agent.phone}`; }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold text-white cursor-pointer"
                    style={{ background: '#191c1e', border: 'none', transition: 'background 0.2s ease' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#497cff'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#191c1e'; }}
                  >
                    <Phone size={10} strokeWidth={2} /> დარეკვა
                  </button>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <div className="container-xl mt-10">
          <InViewFade>
            <div
              className="rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-5 px-8 py-6"
              style={{ background: '#fff', border: '1px solid #e0e3e5' }}
            >
              <div>
                <p className="font-bold text-[#191c1e] text-base">გსურთ პროფ. Makler-თან გასაუბრება?</p>
                <p className="text-sm text-[#76777d] mt-0.5">უფასო 30-წუთიანი კონსულტაცია ნებისმიერ სამუშაო დღეს</p>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <Link to="/agents" className="btn-primary px-6 py-3 rounded-xl text-sm">
                  Makler-ის არჩევა <Users size={15} />
                </Link>
                <Link to="/contact" className="btn-ghost px-6 py-3 rounded-xl text-sm">
                  კონსულტაცია <Phone size={14} />
                </Link>
              </div>
            </div>
          </InViewFade>
        </div>

      </section>


    </div>
  );
}
