import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Menu, X, ChevronDown, Heart, User, Moon, Sun, Search,
  Phone, Home, MapPin, Users, BookOpen, Info, MessageSquare,
  Tag, Key, Star, Layers, TrendingUp, DollarSign, Map,
  ArrowRight, Sparkles, Shield
} from 'lucide-react';

/* ─── Navigation structure with icons ─── */
const navItems = [
  { label: 'მთავარი', href: '/', icon: Home },
  {
    label: 'განცხადება',
    href: '/listings',
    icon: Building2,
    mega: {
      title: 'განცხადების კატეგორიები',
      columns: [
        {
          heading: 'ტიპის მიხედვით',
          items: [
            { label: 'ბინები',     href: '/listings?type=apartment', icon: Building2, desc: 'ქალაქური ბინები' },
            { label: 'სახლები',    href: '/listings?type=house',     icon: Home,      desc: 'კერძო სახლები'  },
            { label: 'ვილები',     href: '/listings?type=villa',     icon: Star,      desc: 'ელიტური ვილები' },
            { label: 'კომერციული', href: '/listings?type=commercial',icon: Layers,    desc: 'ოფისი, მაღაზია' },
          ],
        },
        {
          heading: 'სტატუსი',
          items: [
            { label: 'გაყიდვა',   href: '/listings?status=sale',   icon: Tag,       desc: 'განცხადება გაყიდვაში'  },
            { label: 'გაქირავება', href: '/listings?status=rent',   icon: Key,       desc: 'ქირით ასაღები'     },
            { label: 'პრემიუმ',   href: '/listings?premium=true',  icon: Sparkles,  desc: 'ელიტური ობიექტები' },
            { label: 'ახალი',     href: '/listings?new=true',      icon: TrendingUp,desc: 'ახლახანს დამატ.'   },
          ],
        },
        {
          heading: 'ქალაქები',
          items: [
            { label: 'თბილისი', href: '/listings?city=tbilisi', icon: MapPin, desc: '2,847 განცხ.' },
            { label: 'ბათუმი',  href: '/listings?city=batumi',  icon: MapPin, desc: '1,234 განცხ.' },
            { label: 'ქუთაისი', href: '/listings?city=kutaisi', icon: MapPin, desc: '567 განცხ.'   },
            { label: 'ყველა',   href: '/listings',              icon: Map,    desc: 'სრული სია'    },
          ],
        },
      ],
      featured: {
        image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&q=80',
        title: 'მთაწმინდის ვილა',
        price: '₾1,200,000',
        label: 'თვის გამორჩეული',
        href: '/property/p7',
      },
    },
  },
  {
    label: 'აგენტები',
    href: '/agents',
    icon: Users,
    mega: {
      title: 'ჩვენი სპეციალისტები',
      columns: [
        {
          heading: 'სერვისები',
          items: [
            { label: 'ყველა აგენტი',  href: '/agents',                     icon: Users,      desc: '350+ სპეციალისტი'   },
            { label: 'ვერიფ. აგენტი', href: '/agents?verified=true',        icon: Shield,     desc: 'სანდო პარტნიორები'  },
            { label: 'ბაზ. ანალიზი',  href: '/blog?cat=market',            icon: TrendingUp, desc: 'ექსპ. ანალიზი'      },
            { label: 'ინვ. კონს.',    href: '/contact',                    icon: DollarSign, desc: 'ინვ. კონსულტ.'     },
          ],
        },
      ],
    },
  },
  {
    label: 'ბლოგი',
    href: '/blog',
    icon: BookOpen,
    mega: {
      title: 'სტატიები & გზამკვლევი',
      columns: [
        {
          heading: 'კატეგ.',
          items: [
            { label: 'ბაზ. ანალ.',  href: '/blog?cat=market',  icon: TrendingUp, desc: '2026 ტენდ.'      },
            { label: 'გზამკვ.',    href: '/blog?cat=guide',   icon: BookOpen,   desc: 'ყიდვა-გაყ.'     },
            { label: 'ინვ.',       href: '/blog?cat=invest',  icon: DollarSign, desc: 'ROI ანალ.'       },
            { label: 'ინტ.',       href: '/blog?cat=design',  icon: Sparkles,   desc: 'დიზ. ტენდ.'     },
          ],
        },
      ],
    },
  },
  { label: 'ჩვ. შ.',   href: '/about',   icon: Info        },
  { label: 'კონტ.',    href: '/contact', icon: MessageSquare },
];

interface HeaderProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export default function Header({ darkMode, toggleDarkMode }: HeaderProps) {
  const [scrolled, setScrolled]           = useState(false);
  const [mobileOpen, setMobileOpen]       = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [dropdownTimeout, setDropdownTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', fn, { passive: true });
    fn();
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setActiveDropdown(null);
    setMobileExpanded(null);
  }, [location]);

  const openMenu  = (label: string) => {
    if (dropdownTimeout) clearTimeout(dropdownTimeout);
    setActiveDropdown(label);
  };
  const closeMenu = () => {
    const t = setTimeout(() => setActiveDropdown(null), 100);
    setDropdownTimeout(t);
  };

  return (
    <>
      {/* ══════════════════ HEADER ══════════════════ */}
      <header
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          background: scrolled ? 'rgba(255,255,255,0.97)' : '#fff',
          borderBottom: '1.5px solid #e0e3e5',
          boxShadow: scrolled ? '0 2px 20px rgba(0,0,0,0.08)' : 'none',
          transition: 'box-shadow 0.3s ease, background 0.3s ease',
        }}
      >
        <div className="container-xl">
          <div style={{ display: 'flex', alignItems: 'center', height: 64, gap: 8 }}>

            {/* ── Logo ── */}
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 16, flexShrink: 0, textDecoration: 'none' }}>
              <div style={{
                width: 36, height: 36, background: '#000', borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Building2 size={18} color="#fff" strokeWidth={2} />
              </div>
              <div className="hidden sm:block">
                <div style={{ fontWeight: 800, fontSize: 15, color: '#191c1e', lineHeight: 1.1 }}>TbilisiRealtors</div>
                <div style={{ fontWeight: 700, fontSize: 11, color: '#497cff', lineHeight: 1 }}>.ge — პრემიუმ ბაზარი</div>
              </div>
            </Link>

            {/* ── Desktop Nav ── */}
            <nav style={{ alignItems: 'center', gap: 2, flex: 1 }} className="hidden lg:flex">
              {navItems.map((item) => (
                <div
                  key={item.label}
                  style={{ position: 'relative' }}
                  onMouseEnter={() => item.mega && openMenu(item.label)}
                  onMouseLeave={closeMenu}
                >
                  <Link
                    to={item.href}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '7px 11px', borderRadius: 8,
                      fontSize: 13.5, fontWeight: 600, color: '#45464d',
                      textDecoration: 'none', whiteSpace: 'nowrap',
                      background: location.pathname === item.href ? '#f2f4f6' : 'transparent',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f2f4f6'; (e.currentTarget as HTMLElement).style.color = '#191c1e'; }}
                    onMouseLeave={e => { if (location.pathname !== item.href) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#45464d'; } }}
                  >
                    <item.icon size={14} strokeWidth={2} style={{ opacity: 0.6, flexShrink: 0 }} />
                    {item.label}
                    {item.mega && (
                      <ChevronDown size={11} strokeWidth={2.5} style={{
                        opacity: 0.5, marginLeft: 1,
                        transform: activeDropdown === item.label ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                      }} />
                    )}
                  </Link>

                  {/* ── Mega Menu ── */}
                  <AnimatePresence>
                    {item.mega && activeDropdown === item.label && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.14, ease: 'easeOut' }}
                        onMouseEnter={() => openMenu(item.label)}
                        onMouseLeave={closeMenu}
                        style={{
                          position: 'absolute', top: '100%', left: 0,
                          paddingTop: 10, zIndex: 100,
                          minWidth: item.mega.columns.length > 1 ? 680 : 280,
                        }}
                      >
                        <div style={{
                          background: '#fff', borderRadius: 18, overflow: 'hidden',
                          boxShadow: '0 24px 64px rgba(15,23,42,0.18), 0 0 0 1.5px rgba(0,0,0,0.07)',
                        }}>
                          {/* Top bar */}
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 20px', background: '#f7f9fb',
                            borderBottom: '1px solid #eceef0',
                          }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#497cff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                              {item.mega.title}
                            </span>
                            <Link to={item.href} style={{ fontSize: 12, color: '#76777d', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontWeight: 600 }}>
                              ყველა <ArrowRight size={11} />
                            </Link>
                          </div>

                          <div style={{ display: 'flex' }}>
                            {/* Columns */}
                            <div style={{ display: 'flex', flex: 1 }}>
                              {item.mega.columns.map((col, ci) => (
                                <div key={ci} style={{ flex: 1, padding: '16px 4px 16px 16px', borderLeft: ci > 0 ? '1px solid #eceef0' : 'none' }}>
                                  <p style={{ fontSize: 10, fontWeight: 700, color: '#76777d', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 8 }}>
                                    {col.heading}
                                  </p>
                                  {col.items.map((nav) => (
                                    <Link
                                      key={nav.label}
                                      to={nav.href}
                                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderRadius: 10, textDecoration: 'none', marginBottom: 2 }}
                                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f2f4f6'}
                                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                                    >
                                      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f7f9fb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <nav.icon size={15} strokeWidth={1.8} style={{ color: '#45464d' }} />
                                      </div>
                                      <div>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: '#191c1e', lineHeight: 1.2 }}>{nav.label}</p>
                                        <p style={{ fontSize: 11, color: '#76777d', marginTop: 1 }}>{nav.desc}</p>
                                      </div>
                                    </Link>
                                  ))}
                                </div>
                              ))}
                            </div>

                            {/* Featured card */}
                            {item.mega.featured && (
                              <div style={{ width: 200, flexShrink: 0, padding: 16, background: '#f7f9fb', borderLeft: '1px solid #eceef0' }}>
                                <p style={{ fontSize: 10, fontWeight: 700, color: '#76777d', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
                                  {item.mega.featured.label}
                                </p>
                                <Link to={item.mega.featured.href} style={{ display: 'block', textDecoration: 'none' }}>
                                  <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 10, aspectRatio: '4/3' }}>
                                    <img src={item.mega.featured.image} alt={item.mega.featured.title}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    />
                                  </div>
                                  <p style={{ fontSize: 12, fontWeight: 600, color: '#191c1e', lineHeight: 1.3 }}>{item.mega.featured.title}</p>
                                  <p style={{ fontSize: 14, fontWeight: 700, color: '#191c1e', marginTop: 4 }}>{item.mega.featured.price}</p>
                                </Link>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </nav>

            {/* ── Right actions ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
              {/* Phone */}
              <a href="tel:+995322123456" className="hidden xl:flex"
                style={{ alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#45464d', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f2f4f6'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <Phone size={14} strokeWidth={2} />+995 322 12 34 56
              </a>

              {/* Dark mode */}
              <button onClick={toggleDarkMode}
                style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#45464d' }}
                className="hidden sm:flex"
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f2f4f6'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                {darkMode ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
              </button>

              {/* Favorites */}
              <Link to="/favorites" style={{ position: 'relative', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, color: '#45464d', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f2f4f6'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <Heart size={16} strokeWidth={2} />
                <span style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, background: '#497cff', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
              </Link>

              {/* Search */}
              <Link to="/listings"
                style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, color: '#45464d', textDecoration: 'none' }}
                className="hidden sm:flex"
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f2f4f6'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <Search size={16} strokeWidth={2} />
              </Link>

              {/* Divider */}
              <div className="hidden lg:block" style={{ width: 1, height: 24, background: '#e0e3e5', margin: '0 4px' }} />

              {/* Login */}
              <Link to="/login"
                style={{ alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, color: '#45464d', textDecoration: 'none' }}
                className="hidden lg:flex"
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f2f4f6'; (e.currentTarget as HTMLElement).style.color = '#191c1e'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#45464d'; }}
              >
                <User size={14} strokeWidth={2} /> შესვლა
              </Link>

              {/* Register CTA */}
              <Link to="/register" className="hidden sm:flex"
                style={{ alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 9, background: '#000', color: '#fff', fontSize: 13.5, fontWeight: 700, textDecoration: 'none', transition: 'background 0.2s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#1a1a1a'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#000'}
              >
                დარეგ.
              </Link>

              {/* Burger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#191c1e' }}
                className="flex lg:hidden"
              >
                {mobileOpen ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ══════════════════ MOBILE DRAWER ══════════════════ */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
              className="lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              style={{
                position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 50,
                width: 'min(84vw, 340px)', background: '#fff', flexDirection: 'column',
                boxShadow: '-4px 0 40px rgba(0,0,0,0.18)',
              }}
              className="flex lg:hidden"
            >
              {/* Brand header */}
              <div
                style={{
                  padding: '18px 16px 16px', flexShrink: 0,
                  background: 'linear-gradient(135deg, #131b2e 0%, #1a2d5a 100%)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, background: 'rgba(255,255,255,0.14)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Building2 size={17} color="#fff" strokeWidth={2} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#fff', lineHeight: 1.15 }}>TbilisiRealtors</div>
                      <div style={{ fontWeight: 600, fontSize: 10.5, color: '#7aabff', lineHeight: 1 }}>.ge — პრემიუმ ბაზარი</div>
                    </div>
                  </div>
                  <button onClick={() => setMobileOpen(false)}
                    style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9, border: 'none', background: 'rgba(255,255,255,0.10)', cursor: 'pointer', color: '#fff', flexShrink: 0 }}>
                    <X size={17} strokeWidth={2} />
                  </button>
                </div>

                {/* Search */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'rgba(255,255,255,0.10)', borderRadius: 12, padding: '11px 14px', border: '1px solid rgba(255,255,255,0.16)' }}>
                  <Search size={15} style={{ color: 'rgba(255,255,255,0.55)', flexShrink: 0 }} />
                  <input placeholder="განცხადების ძებნა..." style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 13.5, color: '#fff', flex: 1, boxShadow: 'none' }} />
                </div>
              </div>

              {/* Quick actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid #eceef0', flexShrink: 0 }}>
                <a href="tel:+995322123456"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 8px', borderRadius: 11, background: '#f7f9fb', color: '#191c1e', fontSize: 12.5, fontWeight: 700, textDecoration: 'none', border: '1px solid #eceef0' }}
                >
                  <Phone size={14} strokeWidth={2} style={{ color: '#497cff' }} /> ზარი
                </a>
                <Link to="/favorites" onClick={() => setMobileOpen(false)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 8px', borderRadius: 11, background: '#f7f9fb', color: '#191c1e', fontSize: 12.5, fontWeight: 700, textDecoration: 'none', border: '1px solid #eceef0' }}
                >
                  <Heart size={14} strokeWidth={2} style={{ color: '#ef4444' }} /> ფავორ.
                </Link>
                <button onClick={toggleDarkMode}
                  style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 11, background: '#f7f9fb', border: '1px solid #eceef0', color: '#191c1e', cursor: 'pointer', flexShrink: 0 }}
                >
                  {darkMode ? <Sun size={15} strokeWidth={2} /> : <Moon size={15} strokeWidth={2} />}
                </button>
              </div>

              {/* Nav links */}
              <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
                {navItems.map(item => {
                  const expanded = mobileExpanded === item.label;
                  const isActive = location.pathname === item.href;
                  return (
                    <div key={item.label} style={{ marginBottom: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', borderRadius: 12, background: isActive ? '#f2f4f6' : 'transparent' }}>
                        <Link
                          to={item.href}
                          onClick={() => setMobileOpen(false)}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 11, padding: '10px 10px', fontSize: 14, fontWeight: 600, color: isActive ? '#191c1e' : '#45464d', textDecoration: 'none', minWidth: 0 }}
                        >
                          <div style={{
                            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                            background: isActive ? 'rgba(73,124,255,0.14)' : '#f2f4f6',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <item.icon size={15} strokeWidth={2} style={{ color: isActive ? '#497cff' : '#76777d' }} />
                          </div>
                          {item.label}
                        </Link>
                        {item.mega && (
                          <button
                            onClick={() => setMobileExpanded(expanded ? null : item.label)}
                            style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: '#9ea0a7', cursor: 'pointer', flexShrink: 0, marginRight: 4 }}
                          >
                            <ChevronDown size={15} strokeWidth={2.2} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                          </button>
                        )}
                      </div>

                      <AnimatePresence initial={false}>
                        {item.mega && expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div style={{ padding: '2px 6px 8px 44px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {item.mega.columns.flatMap(col => col.items).map(sub => (
                                <Link
                                  key={sub.label}
                                  to={sub.href}
                                  onClick={() => setMobileOpen(false)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 9, fontSize: 13, fontWeight: 500, color: '#65666d', textDecoration: 'none' }}
                                >
                                  <sub.icon size={13} strokeWidth={1.8} style={{ color: '#b0b2ba', flexShrink: 0 }} />
                                  {sub.label}
                                </Link>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </nav>

              {/* Actions */}
              <div style={{ padding: 14, borderTop: '1px solid #e0e3e5', display: 'flex', flexDirection: 'column', gap: 9, flexShrink: 0 }}>
                <Link to="/login" onClick={() => setMobileOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 700, color: '#191c1e', border: '1.5px solid #c6c6cd', textDecoration: 'none' }}>
                  <User size={16} strokeWidth={2} /> შესვლა
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 700, color: '#fff', background: '#000', textDecoration: 'none' }}>
                  დარეგისტრირება
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
