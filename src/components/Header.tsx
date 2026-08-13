import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, X, ChevronDown, Heart, User, Moon, Sun, Search,
  Phone, ArrowRight, Star,
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import { CONTACT } from '../data/contactInfo';
import LocaleCurrencySwitcher from './LocaleCurrencySwitcher';
import { useLocale } from '../i18n/LocaleContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { buildNavItems } from '../i18n/navItems';

/* ─── design tokens — match hero / search panel ─── */
const UI = {
  radius: 12,       /* rounded-xl — buttons, icon tiles, nav pills */
  radiusLg: 16,     /* rounded-2xl — mega menu items */
  radiusXl: 20,     /* 1.25rem — mega menu card, matches hero card */
  btnH: 40,
  border: '#e4e6ea',
  borderLight: '#f0f2f5',
  surfaceMuted: '#f2f4f6',
  ink: '#191c1e',
  muted: '#76777d',
  accent: '#2563eb',
} as const;

/* ─── height constants (exported so pages can use) ─── */
export const HEADER_ROW1 = 56;
export const HEADER_ROW2 = 50;
export const HEADER_H    = HEADER_ROW1 + HEADER_ROW2; // 106 px

interface HeaderProps { darkMode: boolean; toggleDarkMode: () => void; }

export default function Header({ darkMode, toggleDarkMode }: HeaderProps) {
  const { t } = useLocale();
  const { formatMoney } = useCurrency();
  const navItems = useMemo(
    () => buildNavItems(t, (amount) => formatMoney(amount)),
    [t, formatMoney],
  );
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
        borderBottom: scrolled ? 'none' : `1px solid ${UI.borderLight}`,
        boxShadow: scrolled
          ? '0 10px 40px rgba(15,20,35,0.08), 0 1px 0 rgba(228,230,234,0.6)'
          : 'none',
        transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
      }}>

        {/* ─────────── ROW 1 : Brand + Utility ─────────── */}
        <div className="container-xl">
          <div style={{ display: 'flex', alignItems: 'center', height: HEADER_ROW1, gap: 16 }}>

            <BrandLogo size="md" responsiveText className="flex-shrink-0" />

            {/* Utility toolbar */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>

              <LocaleCurrencySwitcher className="hidden xl:flex" />

              <Link to="/favorites"
                title={t('common.favorites')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', width: 38, height: 38, borderRadius: UI.radius,
                  border: `1.5px solid ${UI.border}`, background: '#fff',
                  color: '#6b7280', textDecoration: 'none', transition: 'all 0.15s', flexShrink: 0,
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = '#fecaca'; el.style.background = '#fff5f5'; el.style.color = '#ef4444';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = UI.border; el.style.background = '#fff'; el.style.color = '#6b7280';
                }}
              >
                <Heart size={16} strokeWidth={2} />
                <span style={{
                  position: 'absolute', top: -5, right: -5,
                  width: 17, height: 17, borderRadius: '50%',
                  background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid #fff',
                }}>3</span>
              </Link>

              <Link to="/login" className="hidden lg:flex"
                style={{
                  alignItems: 'center', gap: 7,
                  height: 38, padding: '0 14px',
                  borderRadius: UI.radius, border: `1.5px solid ${UI.border}`,
                  fontSize: 13, fontWeight: 600, color: UI.ink,
                  textDecoration: 'none', background: '#fff',
                  transition: 'all 0.15s', flexShrink: 0,
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = 'rgba(37,99,235,0.45)'; el.style.background = '#eff6ff'; el.style.color = UI.accent;
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = UI.border; el.style.background = '#fff'; el.style.color = UI.ink;
                }}
              >
                <User size={15} strokeWidth={2} />
                {t('common.login')}
              </Link>

              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="flex lg:hidden"
                style={{
                  width: 38, height: 38, borderRadius: UI.radius,
                  border: `1.5px solid ${UI.border}`, background: '#fff',
                  alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: UI.ink, flexShrink: 0,
                }}
              >
                {mobileOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
              </button>
            </div>
          </div>
        </div>

        {/* ─────────── ROW 2 : Category navigation (desktop) ─────────── */}
        <div className="hidden lg:block" style={{ background: '#fff' }}>
          <div className="container-xl">
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                height: HEADER_ROW2, gap: 14,
                borderTop: `1px solid ${UI.borderLight}`,
                padding: '7px 0',
              }}
            >
              <nav style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 6, minWidth: 0, overflow: 'hidden' }}>
                {navItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  const hasMega  = 'mega' in item && !!item.mega;
                  const isOpen   = activeDropdown === item.label;
                  const on       = isActive || isOpen;
                  const Icon     = item.icon;

                  return (
                    <div
                      key={item.label}
                      style={{ position: 'relative', flexShrink: 0 }}
                      onMouseEnter={() => hasMega && openDrop(item.label)}
                      onMouseLeave={closeDrop}
                    >
                      <Link
                        to={item.href}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 8,
                          height: 36, padding: '0 12px 0 5px',
                          borderRadius: UI.radius,
                          fontSize: 13, fontWeight: 600,
                          whiteSpace: 'nowrap', textDecoration: 'none',
                          boxSizing: 'border-box',
                          color: on ? UI.accent : UI.ink,
                          background: on ? 'rgba(37,99,235,0.07)' : '#fff',
                          border: `1.5px solid ${on ? UI.accent : UI.border}`,
                          transition: 'color 0.18s ease, background 0.18s ease, border-color 0.18s ease',
                        }}
                        onMouseEnter={e => {
                          if (on) return;
                          const el = e.currentTarget as HTMLElement;
                          el.style.borderColor = 'rgba(37,99,235,0.35)';
                          el.style.background = '#f8faff';
                          el.style.color = UI.accent;
                        }}
                        onMouseLeave={e => {
                          if (on) return;
                          const el = e.currentTarget as HTMLElement;
                          el.style.borderColor = UI.border;
                          el.style.background = '#fff';
                          el.style.color = UI.ink;
                        }}
                      >
                        <span style={{
                          width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                          boxSizing: 'border-box',
                          background: on ? UI.accent : '#f3f4f7',
                          border: `1px solid ${on ? UI.accent : '#eceef0'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background 0.18s ease, border-color 0.18s ease',
                        }}>
                          <Icon size={13} strokeWidth={2.2} style={{ color: on ? '#fff' : '#9ca3af' }} />
                        </span>
                        {item.label}
                        {'badge' in item && item.badge && (
                          <span style={{
                            fontSize: 9, fontWeight: 800, padding: '2px 6px',
                            borderRadius: 6, background: '#ef4444', color: '#fff',
                            letterSpacing: '0.04em',
                          }}>{item.badge}</span>
                        )}
                        {hasMega && (
                          <ChevronDown size={11} strokeWidth={2.5}
                            style={{
                              width: 11, height: 11, flexShrink: 0,
                              color: on ? UI.accent : '#b0b2ba',
                              transform: isOpen ? 'rotate(180deg)' : 'none',
                              transition: 'transform 0.2s, color 0.18s ease',
                            }}
                          />
                        )}
                      </Link>
                    </div>
                  );
                })}
              </nav>

              {/* Contact cluster */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <a
                  href={`tel:${CONTACT.phone.tel}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 9,
                    height: 36, padding: '0 14px 0 5px',
                    borderRadius: UI.radius, textDecoration: 'none',
                    background: 'linear-gradient(135deg, #eff6ff 0%, #fff 100%)',
                    border: '1.5px solid rgba(37,99,235,0.22)',
                    transition: 'all 0.18s ease',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = UI.accent;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(37,99,235,0.22)';
                  }}
                >
                  <span style={{
                    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                    background: UI.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Phone size={12} strokeWidth={2.5} style={{ color: '#fff' }} />
                  </span>
                  <span>
                    <span style={{ display: 'block', fontSize: 10, fontWeight: 600, color: UI.muted, lineHeight: 1.1 }}>
                      {CONTACT.phone.label}
                    </span>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 800, color: UI.ink, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                      {CONTACT.phone.display}
                    </span>
                  </span>
                </a>
                <a
                  href={CONTACT.mobile.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`WhatsApp ${CONTACT.mobile.label}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 36, borderRadius: UI.radius,
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, #fff 100%)',
                    color: '#059669',
                    border: '1.5px solid rgba(16,185,129,0.28)',
                    textDecoration: 'none', transition: 'all 0.18s ease',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = '#10b981';
                    el.style.background = 'rgba(16,185,129,0.12)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = 'rgba(16,185,129,0.28)';
                    el.style.background = 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, #fff 100%)';
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                  </svg>
                </a>
              </div>
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
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.2, 0.8, 0.4, 1] }}
                onMouseEnter={() => openDrop(activeItem.label)}
                onMouseLeave={closeDrop}
                style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 99,
                  padding: '8px 0 0',
                }}
              >
                <div className="container-xl">
                  <div style={{
                    background: '#fff',
                    borderRadius: UI.radiusXl,
                    boxShadow: '0 22px 56px rgba(15,20,35,0.16), 0 0 0 1px rgba(228,230,234,0.9)',
                    overflow: 'hidden',
                    marginBottom: 12,
                  }}>
                  {/* Accent rail — matches search card */}
                  <div
                    className="h-[3px]"
                    style={{ background: 'linear-gradient(90deg, #2563eb 0%, #2563eb 55%, #10b981 100%)' }}
                  />
                  {/* Mega header bar */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 22px 13px',
                    borderBottom: `1px solid ${UI.borderLight}`,
                    background: 'linear-gradient(180deg, #fafbfc 0%, #fff 100%)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: UI.radius,
                        background: UI.accent,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <activeItem.icon size={15} color="#fff" strokeWidth={2.5} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: UI.accent, letterSpacing: '0.09em', textTransform: 'uppercase' }}>
                        {mega.title}
                      </span>
                    </div>
                    <Link to={activeItem.href}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: UI.accent, textDecoration: 'none' }}
                    >
                      {t('common.viewAll')} <ArrowRight size={13} />
                    </Link>
                  </div>

                  {/* Columns + featured */}
                  <div style={{ display: 'flex', padding: '16px 22px 20px' }}>
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
                                padding: '9px 10px', borderRadius: UI.radius,
                                textDecoration: 'none', marginBottom: 2,
                                transition: 'background 0.12s',
                              }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = UI.surfaceMuted}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                            >
                              <div style={{
                                width: 36, height: 36, borderRadius: UI.radius, flexShrink: 0,
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
                            background: 'linear-gradient(135deg,#2563eb,#2563eb)',
                          }}>
                            <Star size={9} color="#fff" strokeWidth={2.5} />
                            <span style={{ fontSize: 9.5, fontWeight: 800, color: '#fff', letterSpacing: '0.06em' }}>FEATURED</span>
                          </div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>{mega.featured.title}</p>
                          <p style={{ fontSize: 16, fontWeight: 800, color: '#2563eb', marginTop: 5 }}>{mega.featured.price}</p>
                        </Link>
                      </div>
                    )}
                  </div>
                  </div>{/* card */}
                </div>{/* container-xl */}
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
                background: '#0f172a',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <BrandLogo
                    variant="dark"
                    size="md"
                    tagline={t('header.tagline')}
                    href="/"
                  />
                  <button onClick={() => setMobileOpen(false)}
                    style={{
                      width: 40, height: 40, borderRadius: 12, border: 'none',
                      background: 'rgba(255,255,255,0.10)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0,
                    }}>
                    <X size={18} strokeWidth={2} />
                  </button>
                </div>
                {/* Search */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(255,255,255,0.08)', borderRadius: 12,
                  padding: '11px 14px', border: '1px solid rgba(255,255,255,0.14)',
                }}>
                  <Search size={14} style={{ color: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
                  <input placeholder={t('header.searchPlaceholder')}
                    style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#fff', flex: 1, boxShadow: 'none' }} />
                </div>
              </div>

              {/* Quick actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 16px', borderBottom: `1px solid ${UI.borderLight}`, flexShrink: 0 }}>
                <LocaleCurrencySwitcher className="w-full" compact />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <a href={`tel:${CONTACT.phone.tel}`}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 8px', borderRadius: UI.radius, background: '#eff6ff', color: UI.accent, fontSize: 12.5, fontWeight: 700, textDecoration: 'none', border: '1.5px solid #dbeafe' }}>
                    <Phone size={14} strokeWidth={2} /> {CONTACT.phone.label}: {CONTACT.phone.display}
                  </a>
                  <a href={CONTACT.mobile.whatsapp} target="_blank" rel="noopener noreferrer"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 8px', borderRadius: UI.radius, background: 'rgba(16,185,129,0.08)', color: '#059669', fontSize: 12.5, fontWeight: 700, textDecoration: 'none', border: '1.5px solid rgba(16,185,129,0.22)' }}>
                    WhatsApp {CONTACT.mobile.label}
                  </a>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link to="/favorites" onClick={() => setMobileOpen(false)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 8px', borderRadius: UI.radius, background: '#fff1f2', color: '#ef4444', fontSize: 12.5, fontWeight: 700, textDecoration: 'none', border: '1.5px solid #fecdd3' }}>
                  <Heart size={14} strokeWidth={2} /> {t('common.favorites')}
                </Link>
                <button onClick={toggleDarkMode}
                  style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: UI.radius, background: UI.surfaceMuted, border: `1.5px solid ${UI.border}`, color: UI.ink, cursor: 'pointer', flexShrink: 0 }}>
                  {darkMode ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
                </button>
                </div>
              </div>

              {/* Nav list */}
              <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
                {navItems.map(item => {
                  const expanded = mobileExpanded === item.href;
                  const isActive = location.pathname === item.href;
                  const hasMega  = 'mega' in item && !!item.mega;
                  return (
                    <div key={item.label} style={{ marginBottom: 2 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', borderRadius: UI.radius,
                        background: isActive ? 'rgba(37, 99, 235,0.08)' : 'transparent',
                      }}>
                        <Link to={item.href} onClick={() => setMobileOpen(false)}
                          style={{
                            flex: 1, display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 10px', fontSize: 14, fontWeight: 600,
                            color: isActive ? UI.accent : UI.ink, textDecoration: 'none',
                          }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: UI.radius, flexShrink: 0,
                            background: isActive ? 'rgba(37, 99, 235,0.14)' : UI.surfaceMuted,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <item.icon size={15} strokeWidth={2}
                              style={{ color: isActive ? '#2563eb' : '#9ca3af' }} />
                          </div>
                          {item.label}
                          {'badge' in item && item.badge && (
                            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 5px', borderRadius: 4, background: '#ef4444', color: '#fff' }}>{item.badge}</span>
                          )}
                        </Link>
                        {hasMega && (
                          <button onClick={() => setMobileExpanded(expanded ? null : item.href)}
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
              <div style={{ padding: '14px 14px 20px', borderTop: `1px solid ${UI.borderLight}`, display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
                <Link to="/login" onClick={() => setMobileOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: UI.radius, fontSize: 14, fontWeight: 700, color: UI.ink, border: `1.5px solid ${UI.border}`, textDecoration: 'none', background: '#fff' }}>
                  <User size={16} strokeWidth={2} /> {t('common.login')}
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: UI.radius, fontSize: 14, fontWeight: 700, color: '#fff', textDecoration: 'none', background: UI.ink, border: `1.5px solid ${UI.ink}` }}>
                  {t('common.register')}
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
