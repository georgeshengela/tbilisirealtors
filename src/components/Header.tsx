import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Menu, X, ChevronDown, Heart, User, Moon, Sun, Search,
  Phone, Home, MapPin, Users, BookOpen, Info, MessageSquare,
  Tag, Key, Star, Layers, TrendingUp, DollarSign, Map,
  ArrowRight, Sparkles, Shield, Plus, Globe, Newspaper,
  HardHat, Calculator, UserCheck, BarChart3,
} from 'lucide-react';

/* ─── height constants (exported so pages can use) ─── */
export const HEADER_ROW1 = 56;
export const HEADER_ROW2 = 46;
export const HEADER_H    = HEADER_ROW1 + HEADER_ROW2; // 102 px

/* ══════════════════════════════════════════════════
   NAV STRUCTURE
══════════════════════════════════════════════════ */
const navItems = [
  {
    label: 'განცხადებები',
    href:  '/listings',
    icon:  Building2,
    mega: {
      title: 'განცხადებების კატეგორიები',
      columns: [
        {
          heading: 'ქონების ტიპი',
          color:   '#497cff',
          items: [
            { label: 'ბინები',       href: '/listings?type=apartment', icon: Building2, color: '#497cff', desc: 'ქალაქური ბინები'   },
            { label: 'კერძო სახლი',  href: '/listings?type=house',     icon: Home,      color: '#10b981', desc: 'კოტეჯი, ვილა'     },
            { label: 'კომერციული',   href: '/listings?type=commercial', icon: Layers,    color: '#f59e0b', desc: 'ოფისი, მაღაზია'   },
            { label: 'მიწის ნაკვ.',  href: '/listings?type=land',      icon: MapPin,    color: '#8b5cf6', desc: 'სასოფლო, ქ. მიწა' },
          ],
        },
        {
          heading: 'გარიგების ტიპი',
          color:   '#10b981',
          items: [
            { label: 'იყიდება',    href: '/listings?status=sale',   icon: Tag,        color: '#f59e0b', desc: 'შესაძენი ობიექტები'  },
            { label: 'ქირავდება',  href: '/listings?status=rent',   icon: Key,        color: '#10b981', desc: 'ქირით ასაღები'        },
            { label: 'VIP / პრემ.', href: '/listings?premium=true', icon: Sparkles,   color: '#ec4899', desc: 'ელიტური ობიექტები'   },
            { label: 'ახლახ. დამ.', href: '/listings?new=true',    icon: TrendingUp,  color: '#22c55e', desc: 'ბოლო 7 დღე'         },
          ],
        },
        {
          heading: 'ქალაქის მიხ.',
          color:   '#ef4444',
          items: [
            { label: 'თბილისი', href: '/listings?city=tbilisi', icon: MapPin, color: '#ef4444', desc: '2,847 განცხ.' },
            { label: 'ბათუმი',  href: '/listings?city=batumi',  icon: MapPin, color: '#0ea5e9', desc: '1,234 განცხ.' },
            { label: 'ქუთაისი', href: '/listings?city=kutaisi', icon: MapPin, color: '#8b5cf6', desc: '567 განცხ.'   },
            { label: 'ყველა ქ.', href: '/listings',             icon: Map,    color: '#64748b', desc: 'სრული სია'    },
          ],
        },
      ],
      featured: {
        image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&q=80',
        title: 'მთაწმინდის ვილა',
        price: '₾1,200,000',
        label: 'თვის გამორჩეული',
        href:  '/property/p7',
      },
    },
  },
  {
    label: 'ახალი პროექტები',
    href:  '/listings?new=true',
    icon:  HardHat,
    badge: 'NEW',
  },
  {
    label: 'სააგენტოები',
    href:  '/agents',
    icon:  Users,
    mega: {
      title: 'სპეციალისტები & სერვისები',
      columns: [
        {
          heading: 'სააგენტოები',
          color:   '#497cff',
          items: [
            { label: 'ყველა აგენტი',      href: '/agents',               icon: Users,     color: '#497cff', desc: '350+ სპეციალ.'    },
            { label: 'ვერიფიც. აგენტი',   href: '/agents?verified=true', icon: UserCheck, color: '#10b981', desc: 'სანდო პარტნ.'      },
            { label: 'ბაზრის ანალიზი',    href: '/blog?cat=market',      icon: BarChart3, color: '#f59e0b', desc: 'ექსპ. ანალიზი'     },
            { label: 'ინვ. კონსულტ.',     href: '/contact',              icon: DollarSign, color: '#8b5cf6', desc: 'ინვ. კონსულტ.'    },
          ],
        },
      ],
    },
  },
  {
    label: 'ბინის შეფასება',
    href:  '/contact',
    icon:  Calculator,
  },
  {
    label: 'ბლოგი',
    href:  '/blog',
    icon:  Newspaper,
    mega: {
      title: 'სტატიები & გზამკვლევი',
      columns: [
        {
          heading: 'კატეგორია',
          color:   '#0ea5e9',
          items: [
            { label: 'ბაზრის ანალიზი',  href: '/blog?cat=market',  icon: BarChart3, color: '#0ea5e9', desc: '2026 ტენდ.'   },
            { label: 'ყიდვა-გაყიდვა',   href: '/blog?cat=guide',   icon: BookOpen,  color: '#497cff', desc: 'გზამკვლევი'   },
            { label: 'ინვესტიციები',    href: '/blog?cat=invest',  icon: TrendingUp, color: '#22c55e', desc: 'ROI ანალიზი'  },
            { label: 'ინტ. დიზაინი',    href: '/blog?cat=design',  icon: Sparkles,  color: '#ec4899', desc: 'ტენდ. 2026'   },
          ],
        },
      ],
    },
  },
  { label: 'ჩვენ შესახებ', href: '/about',   icon: Info        },
  { label: 'კონტაქტი',    href: '/contact', icon: MessageSquare },
];

interface HeaderProps { darkMode: boolean; toggleDarkMode: () => void; }

export default function Header({ darkMode, toggleDarkMode }: HeaderProps) {
  const [scrolled, setScrolled]             = useState(false);
  const [mobileOpen, setMobileOpen]         = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [dropTimeout, setDropTimeout]       = useState<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', fn, { passive: true });
    fn();
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setActiveDropdown(null);
    setMobileExpanded(null);
  }, [location]);

  const openDrop  = (lbl: string) => { if (dropTimeout) clearTimeout(dropTimeout); setActiveDropdown(lbl); };
  const closeDrop = () => { const t = setTimeout(() => setActiveDropdown(null), 130); setDropTimeout(t); };

  return (
    <>
      {/* ══════════════════════════════════════════════
          FIXED TWO-ROW HEADER
      ══════════════════════════════════════════════ */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: '#ffffff',
        borderBottom: scrolled ? 'none' : '1px solid #edf0f3',
        boxShadow: scrolled ? '0 4px 32px rgba(0,0,0,0.10)' : 'none',
        transition: 'box-shadow 0.3s',
      }}>

        {/* ─────────── ROW 1 : Brand + Utility ─────────── */}
        <div style={{ borderBottom: '1px solid #edf0f3' }}>
          <div className="container-xl">
            <div style={{ display: 'flex', alignItems: 'center', height: HEADER_ROW1, gap: 10 }}>

              {/* Logo */}
              <Link to="/"
                style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 8, flexShrink: 0, textDecoration: 'none' }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: 'linear-gradient(135deg, #1a1f2e 0%, #2a3a6e 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(73,124,255,0.3)',
                }}>
                  <Building2 size={18} color="#fff" strokeWidth={2} />
                </div>
                <div className="hidden sm:block">
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#111827', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                    TbilisiRealtors<span style={{ color: '#497cff' }}>.ge</span>
                  </div>
                  <div style={{ fontWeight: 500, fontSize: 10.5, color: '#9ca3af', lineHeight: 1, marginTop: 1, letterSpacing: '0.02em' }}>
                    პრემიუმ უძრავი ქონება
                  </div>
                </div>
              </Link>

              {/* ── Right utility strip ── */}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>

                {/* + განცხადების დამატება */}
                <Link to="/admin/listings/new" className="hidden sm:flex"
                  style={{
                    alignItems: 'center', gap: 7, padding: '8px 16px',
                    borderRadius: 9, textDecoration: 'none',
                    background: '#059669', color: '#fff',
                    fontSize: 13, fontWeight: 700, flexShrink: 0,
                    transition: 'background 0.15s',
                    border: '1.5px solid #059669',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#047857'; (e.currentTarget as HTMLElement).style.borderColor = '#047857'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#059669'; (e.currentTarget as HTMLElement).style.borderColor = '#059669'; }}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>განც. დამატება</span>
                </Link>

                {/* Language/Currency */}
                <button className="hidden xl:flex"
                  style={{
                    alignItems: 'center', gap: 5, padding: '7px 11px',
                    borderRadius: 9, border: '1.5px solid #e8eaed',
                    background: 'transparent', cursor: 'pointer',
                    fontSize: 12.5, fontWeight: 600, color: '#374151',
                    transition: 'all 0.15s', flexShrink: 0,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#c7d2fe';
                    (e.currentTarget as HTMLElement).style.background = '#f0f4ff';
                    (e.currentTarget as HTMLElement).style.color = '#4f46e5';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#e8eaed';
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = '#374151';
                  }}
                >
                  <Globe size={14} strokeWidth={2} />
                  <span>ქართ. — ₾</span>
                  <ChevronDown size={11} strokeWidth={2.5} style={{ color: '#9ca3af' }} />
                </button>

                {/* Favorites */}
                <Link to="/favorites"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', width: 38, height: 38, borderRadius: 10,
                    border: '1.5px solid #e8eaed', background: 'transparent',
                    color: '#374151', textDecoration: 'none', transition: 'all 0.15s', flexShrink: 0,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#fecdd3';
                    (e.currentTarget as HTMLElement).style.background = '#fff1f2';
                    (e.currentTarget as HTMLElement).style.color = '#ef4444';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#e8eaed';
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = '#374151';
                  }}
                >
                  <Heart size={16} strokeWidth={2} />
                  <span style={{
                    position: 'absolute', top: -4, right: -4,
                    width: 17, height: 17, borderRadius: '50%',
                    background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid #fff', boxShadow: '0 1px 4px rgba(239,68,68,0.4)',
                  }}>3</span>
                </Link>

                {/* ─ Divider ─ */}
                <div className="hidden lg:block" style={{ width: 1, height: 24, background: '#e8eaed', margin: '0 2px', flexShrink: 0 }} />

                {/* შესვლა */}
                <Link to="/login" className="hidden lg:flex"
                  style={{
                    alignItems: 'center', gap: 7, padding: '8px 15px',
                    borderRadius: 9, border: '1.5px solid #d1d5db',
                    fontSize: 13.5, fontWeight: 600, color: '#374151',
                    textDecoration: 'none', background: '#fff',
                    transition: 'border-color 0.15s, color 0.15s', flexShrink: 0,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#6b7280'; (e.currentTarget as HTMLElement).style.color = '#111827'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#d1d5db'; (e.currentTarget as HTMLElement).style.color = '#374151'; }}
                >
                  <User size={15} strokeWidth={2} />
                  შესვლა
                </Link>

                {/* დარეგისტრირება — solid dark */}
                <Link to="/register" className="hidden sm:flex"
                  style={{
                    alignItems: 'center', gap: 7, padding: '8px 17px',
                    borderRadius: 9, textDecoration: 'none', flexShrink: 0,
                    background: '#111827', color: '#fff',
                    fontSize: 13.5, fontWeight: 700,
                    border: '1.5px solid #111827',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1f2937'; (e.currentTarget as HTMLElement).style.borderColor = '#1f2937'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#111827'; (e.currentTarget as HTMLElement).style.borderColor = '#111827'; }}
                >
                  დარეგ.
                </Link>

                {/* Burger — mobile only */}
                <button
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="flex lg:hidden"
                  style={{
                    width: 38, height: 38, borderRadius: 10,
                    border: '1.5px solid #e8eaed', background: 'transparent',
                    alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#111827', flexShrink: 0, transition: 'all 0.15s',
                  }}
                >
                  {mobileOpen ? <X size={19} strokeWidth={2} /> : <Menu size={19} strokeWidth={2} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─────────── ROW 2 : Navigation + Phone (desktop) ─────────── */}
        <div className="hidden lg:block" style={{ background: '#fff' }}>
          <div className="container-xl">
            <div style={{ display: 'flex', alignItems: 'center', height: HEADER_ROW2 }}>

              {/* Nav */}
              <nav style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 2 }}>
                {navItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  const hasMega  = 'mega' in item && !!item.mega;
                  const isOpen   = activeDropdown === item.label;

                  return (
                    <div key={item.label} style={{ position: 'relative' }}
                      onMouseEnter={() => hasMega && openDrop(item.label)}
                      onMouseLeave={closeDrop}
                    >
                      <Link to={item.href}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '5px 11px', borderRadius: 8,
                          fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap',
                          textDecoration: 'none', transition: 'all 0.15s',
                          color: isActive ? '#4f46e5' : '#374151',
                          background: isActive ? '#f0f4ff' : 'transparent',
                          position: 'relative',
                        }}
                        onMouseEnter={e => {
                          if (!isActive) {
                            (e.currentTarget as HTMLElement).style.color = '#111827';
                            (e.currentTarget as HTMLElement).style.background = '#f3f4f6';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isActive) {
                            (e.currentTarget as HTMLElement).style.color = '#374151';
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                          }
                        }}
                      >
                        <item.icon size={13.5} strokeWidth={2}
                          style={{ color: isActive ? '#4f46e5' : '#9ca3af', flexShrink: 0 }} />
                        {item.label}
                        {'badge' in item && item.badge && (
                          <span style={{
                            fontSize: 9, fontWeight: 800, padding: '2px 5px',
                            borderRadius: 4, background: '#ef4444', color: '#fff',
                            letterSpacing: '0.04em',
                          }}>{item.badge}</span>
                        )}
                        {hasMega && (
                          <ChevronDown size={11} strokeWidth={2.5}
                            style={{
                              color: '#9ca3af', flexShrink: 0,
                              transform: isOpen ? 'rotate(180deg)' : 'none',
                              transition: 'transform 0.2s',
                            }}
                          />
                        )}
                        {/* Active underline dot */}
                        {isActive && (
                          <span style={{
                            position: 'absolute', bottom: -1, left: '50%',
                            transform: 'translateX(-50%)',
                            width: 18, height: 2.5, borderRadius: 99,
                            background: '#4f46e5',
                          }} />
                        )}
                      </Link>

                    </div>
                  );
                })}
              </nav>

              {/* Phone number — right */}
              <a href="tel:+995322123456"
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '6px 12px', borderRadius: 9, flexShrink: 0,
                  fontSize: 13, fontWeight: 700, color: '#374151',
                  textDecoration: 'none', transition: 'all 0.15s',
                  border: '1.5px solid transparent',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = '#f0f4ff';
                  (e.currentTarget as HTMLElement).style.borderColor = '#c7d2fe';
                  (e.currentTarget as HTMLElement).style.color = '#4f46e5';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = '#374151';
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: 'linear-gradient(135deg, #497cff, #6366f1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Phone size={12} color="#fff" strokeWidth={2.2} />
                </div>
                0 32 280 00 15
              </a>
            </div>
          </div>
        </div>
        {/* ── Full-width mega menu panel ── */}
        <AnimatePresence>
          {navItems.filter(n => n.label === activeDropdown && 'mega' in n && !!(n as any).mega).map(activeItem => {
            const mega = (activeItem as any).mega;
            return (
              <motion.div
                key={activeItem.label}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: [0.2, 0.8, 0.4, 1] }}
                onMouseEnter={() => openDrop(activeItem.label)}
                onMouseLeave={closeDrop}
                style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 99,
                  background: '#fff',
                  borderTop: '2px solid #edf0f3',
                  boxShadow: '0 24px 64px rgba(15,23,42,0.14), 0 0 0 1px rgba(0,0,0,0.04)',
                }}
              >
                <div className="container-xl">
                  {/* Accent header bar */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 0 13px',
                    borderBottom: '1px solid #f0f2f5',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 8,
                        background: 'linear-gradient(135deg, #497cff, #6366f1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <activeItem.icon size={13} color="#fff" strokeWidth={2.5} />
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#6366f1', letterSpacing: '0.09em', textTransform: 'uppercase' }}>
                        {mega.title}
                      </span>
                    </div>
                    <Link to={activeItem.href}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: '#6366f1', textDecoration: 'none' }}
                    >
                      ყველა <ArrowRight size={13} />
                    </Link>
                  </div>

                  {/* Columns + featured */}
                  <div style={{ display: 'flex', padding: '16px 0 20px' }}>
                    <div style={{ display: 'flex', flex: 1, gap: 0 }}>
                      {mega.columns.map((col: any, ci: number) => (
                        <div key={ci} style={{
                          flex: 1,
                          paddingRight: ci < mega.columns.length - 1 ? 24 : 0,
                          marginRight: ci < mega.columns.length - 1 ? 24 : 0,
                          borderRight: ci < mega.columns.length - 1 ? '1px solid #f0f2f5' : 'none',
                        }}>
                          <p style={{
                            fontSize: 10, fontWeight: 700, color: col.color ?? '#9ca3af',
                            letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 9,
                          }}>{col.heading}</p>
                          {col.items.map((nav: any) => (
                            <Link key={nav.label} to={nav.href}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '9px 10px', borderRadius: 12,
                                textDecoration: 'none', marginBottom: 2,
                                transition: 'background 0.12s',
                              }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f7f8fb'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                            >
                              <div style={{
                                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                                background: `${nav.color}16`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <nav.icon size={17} strokeWidth={1.8} style={{ color: nav.color }} />
                              </div>
                              <div>
                                <p style={{ fontSize: 13.5, fontWeight: 600, color: '#111827', lineHeight: 1.2 }}>{nav.label}</p>
                                <p style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 2 }}>{nav.desc}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>

                    {/* Featured card */}
                    {'featured' in mega && mega.featured && (
                      <div style={{
                        width: 228, flexShrink: 0, paddingLeft: 28,
                        borderLeft: '1px solid #f0f2f5',
                      }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 13 }}>
                          {mega.featured.label}
                        </p>
                        <Link to={mega.featured.href} style={{ display: 'block', textDecoration: 'none' }}>
                          <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 12, aspectRatio: '4/3', boxShadow: '0 6px 20px rgba(0,0,0,0.10)' }}>
                            <img src={mega.featured.image} alt={mega.featured.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.35s' }}
                              onMouseEnter={e => (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.06)'}
                              onMouseLeave={e => (e.currentTarget as HTMLImageElement).style.transform = 'none'}
                            />
                          </div>
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 10px', borderRadius: 20, marginBottom: 8,
                            background: 'linear-gradient(135deg,#497cff,#6366f1)',
                          }}>
                            <Star size={9} color="#fff" strokeWidth={2.5} />
                            <span style={{ fontSize: 9.5, fontWeight: 800, color: '#fff', letterSpacing: '0.06em' }}>FEATURED</span>
                          </div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>{mega.featured.title}</p>
                          <p style={{ fontSize: 16, fontWeight: 800, color: '#4f46e5', marginTop: 5 }}>{mega.featured.price}</p>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </header>

      {/* ══════════════════════════════════════════════
          MOBILE DRAWER
      ══════════════════════════════════════════════ */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
              className="lg:hidden"
              onClick={() => setMobileOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              style={{
                position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 50,
                width: 'min(84vw, 340px)', background: '#fff',
                flexDirection: 'column', boxShadow: '-6px 0 40px rgba(0,0,0,0.18)',
              }}
              className="flex lg:hidden"
            >
              {/* Header */}
              <div style={{
                padding: '20px 16px 18px', flexShrink: 0,
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: 'rgba(255,255,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Building2 size={18} color="#fff" strokeWidth={2} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14.5, color: '#fff', lineHeight: 1.2 }}>TbilisiRealtors<span style={{ color: '#93c5fd' }}>.ge</span></div>
                      <div style={{ fontWeight: 500, fontSize: 10.5, color: 'rgba(147,197,253,0.75)', lineHeight: 1, marginTop: 1 }}>პრემიუმ უძრავი ქონება</div>
                    </div>
                  </div>
                  <button onClick={() => setMobileOpen(false)}
                    style={{
                      width: 34, height: 34, borderRadius: 9, border: 'none',
                      background: 'rgba(255,255,255,0.12)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0,
                    }}>
                    <X size={18} strokeWidth={2} />
                  </button>
                </div>
                {/* Search */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(255,255,255,0.12)', borderRadius: 12,
                  padding: '11px 14px', border: '1px solid rgba(255,255,255,0.18)',
                }}>
                  <Search size={14} style={{ color: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
                  <input placeholder="განცხადების ძებნა..."
                    style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#fff', flex: 1, boxShadow: 'none' }} />
                </div>
              </div>

              {/* Quick actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
                <a href="tel:+995322123456"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 8px', borderRadius: 10, background: '#f8faff', color: '#4f46e5', fontSize: 12.5, fontWeight: 700, textDecoration: 'none', border: '1.5px solid #e0e7ff' }}>
                  <Phone size={14} strokeWidth={2} /> ზარი
                </a>
                <Link to="/favorites" onClick={() => setMobileOpen(false)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 8px', borderRadius: 10, background: '#fff1f2', color: '#ef4444', fontSize: 12.5, fontWeight: 700, textDecoration: 'none', border: '1.5px solid #fecdd3' }}>
                  <Heart size={14} strokeWidth={2} /> ფავ.
                </Link>
                <Link to="/admin/listings/new" onClick={() => setMobileOpen(false)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 8px', borderRadius: 10, background: '#f0fdf4', color: '#16a34a', fontSize: 12.5, fontWeight: 700, textDecoration: 'none', border: '1.5px solid #bbf7d0' }}>
                  <Plus size={14} strokeWidth={2.5} /> დამ.
                </Link>
                <button onClick={toggleDarkMode}
                  style={{ width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: '#f8f9fa', border: '1.5px solid #e8eaed', color: '#374151', cursor: 'pointer', flexShrink: 0 }}>
                  {darkMode ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
                </button>
              </div>

              {/* Nav list */}
              <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
                {navItems.map(item => {
                  const expanded = mobileExpanded === item.label;
                  const isActive = location.pathname === item.href;
                  const hasMega  = 'mega' in item && !!item.mega;
                  return (
                    <div key={item.label} style={{ marginBottom: 2 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', borderRadius: 12,
                        background: isActive ? '#f0f4ff' : 'transparent',
                      }}>
                        <Link to={item.href} onClick={() => setMobileOpen(false)}
                          style={{
                            flex: 1, display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 10px', fontSize: 14, fontWeight: 600,
                            color: isActive ? '#4f46e5' : '#374151', textDecoration: 'none',
                          }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                            background: isActive ? 'rgba(79,70,229,0.14)' : '#f3f4f6',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <item.icon size={15} strokeWidth={2}
                              style={{ color: isActive ? '#4f46e5' : '#9ca3af' }} />
                          </div>
                          {item.label}
                          {'badge' in item && item.badge && (
                            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 5px', borderRadius: 4, background: '#ef4444', color: '#fff' }}>{item.badge}</span>
                          )}
                        </Link>
                        {hasMega && (
                          <button onClick={() => setMobileExpanded(expanded ? null : item.label)}
                            style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: '#9ca3af', cursor: 'pointer', flexShrink: 0, marginRight: 4 }}>
                            <ChevronDown size={15} strokeWidth={2.2}
                              style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                          </button>
                        )}
                      </div>

                      <AnimatePresence initial={false}>
                        {hasMega && expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div style={{ padding: '4px 6px 8px 50px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {item.mega!.columns.flatMap(col => col.items).map(sub => (
                                <Link key={sub.label} to={sub.href} onClick={() => setMobileOpen(false)}
                                  style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 9, fontSize: 13, fontWeight: 500, color: '#6b7280', textDecoration: 'none' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8f9fa'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                                >
                                  <div style={{ width: 24, height: 24, borderRadius: 6, background: `${sub.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <sub.icon size={12} strokeWidth={1.8} style={{ color: sub.color }} />
                                  </div>
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

              {/* Footer CTA */}
              <div style={{ padding: '14px 14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
                <Link to="/login" onClick={() => setMobileOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 12, fontSize: 14, fontWeight: 700, color: '#374151', border: '1.5px solid #e8eaed', textDecoration: 'none', background: '#fff', transition: 'all 0.15s' }}>
                  <User size={16} strokeWidth={2} /> შესვლა
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 12, fontSize: 14, fontWeight: 700, color: '#fff', textDecoration: 'none', background: '#111827', border: '1.5px solid #111827' }}>
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
