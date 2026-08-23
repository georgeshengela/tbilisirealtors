import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, X, ChevronDown, Heart, User, Moon, Sun, Search,
  Phone, ArrowRight, Star, LayoutDashboard, LogOut, Shield, Plus, Clock, MapPin,
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import { CONTACT, isBusinessOpenNow } from '../data/contactInfo';
import LocaleCurrencySwitcher from './LocaleCurrencySwitcher';
import { useLocale } from '../i18n/LocaleContext';
import { buildNavItems, type NavItem } from '../i18n/navItems';
import { useUserAuth } from '../contexts/UserAuthContext';
import { useFavorites } from '../lib/favorites';

export const HEADER_UTILITY = 36;
export const HEADER_MAIN = 70;
export const HEADER_H = HEADER_UTILITY + HEADER_MAIN;
export const HEADER_MOBILE_H = 64;

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  );
}

interface HeaderProps { darkMode: boolean; toggleDarkMode: () => void; }

export default function Header({ darkMode, toggleDarkMode }: HeaderProps) {
  const { t } = useLocale();
  const navItems = useMemo(() => buildNavItems(t), [t]);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isStaff, logout } = useUserAuth();
  const { count: favoriteCount } = useFavorites();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const openNow = isBusinessOpenNow();

  const activeMegaItem = navItems.find(
    (item): item is NavItem & { mega: NonNullable<NavItem['mega']> } =>
      item.label === activeDropdown && !!item.mega,
  );

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
    setUserMenuOpen(false);
  }, [location]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const close = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [userMenuOpen]);

  function signOut() {
    logout();
    setUserMenuOpen(false);
    navigate('/');
  }

  return (
    <>
      <header
        className={`site-header ${scrolled ? 'is-scrolled' : ''}`}
        onMouseLeave={() => setActiveDropdown(null)}
      >
        <div className="site-header__utility">
          <div className="container-xl site-header__utility-inner">
            <div className="site-header__meta">
              <span className="site-header__meta-item" style={{ cursor: 'default' }}>
                <MapPin size={13} strokeWidth={2.2} />
                {CONTACT.city}
              </span>
              <span className="site-header__hours">
                <span className={`site-header__dot ${openNow ? 'is-open' : ''}`} />
                <Clock size={12} strokeWidth={2.2} />
                {CONTACT.hoursShort}
              </span>
              <a href={`tel:${CONTACT.phone.tel}`} className="site-header__meta-item">
                <Phone size={13} strokeWidth={2.2} />
                {CONTACT.phone.display}
              </a>
            </div>
            <div className="site-header__utility-tools">
              <LocaleCurrencySwitcher variant="utility" />
            </div>
          </div>
        </div>

        <div className="site-header__main">
          <div className="container-xl site-header__main-inner">
            <BrandLogo size="lg" responsiveText className="flex-shrink-0" />

            <nav className="site-nav" aria-label="Primary">
              {navItems.map(item => {
                const isActive = location.pathname === item.href;
                const hasMega = !!item.mega;
                const isOpen = activeDropdown === item.label;
                const on = isActive || isOpen;
                return (
                  <div
                    key={item.label}
                    className="site-nav__item"
                    onMouseEnter={() => setActiveDropdown(hasMega ? item.label : null)}
                  >
                    <Link
                      to={item.href}
                      className={`site-nav__link ${on ? 'is-on' : ''}`}
                      aria-expanded={hasMega ? isOpen : undefined}
                      aria-haspopup={hasMega ? 'true' : undefined}
                    >
                      <item.icon size={15} strokeWidth={2.1} className="site-nav__icon" />
                      {item.label}
                      {'badge' in item && item.badge && (
                        <span className="site-nav__badge">{item.badge}</span>
                      )}
                      {hasMega && <ChevronDown size={12} strokeWidth={2.5} className="site-nav__chevron" />}
                    </Link>
                  </div>
                );
              })}
            </nav>

            <div className="site-header__tools">
              <a
                href={CONTACT.mobile.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                title={`WhatsApp ${CONTACT.mobile.label}`}
                className="site-icon-btn site-icon-btn--wa"
              >
                <WhatsAppIcon />
              </a>

              <Link to="/favorites" title={t('common.favorites')} className="site-icon-btn">
                <Heart size={18} strokeWidth={2} />
                {favoriteCount > 0 && (
                  <span className="site-count">{favoriteCount > 99 ? '99+' : favoriteCount}</span>
                )}
              </Link>

              {user ? (
                <div ref={userMenuRef} className="site-user">
                  <button
                    type="button"
                    className={`site-user__btn ${userMenuOpen ? 'is-open' : ''}`}
                    onClick={() => setUserMenuOpen(open => !open)}
                    aria-expanded={userMenuOpen}
                  >
                    <span className="site-user__avatar">
                      {user.avatarUrl
                        ? <img src={user.avatarUrl} alt="" />
                        : (user.firstName || user.name).charAt(0).toUpperCase()}
                    </span>
                    <span className="site-user__name">{user.firstName || user.name}</span>
                    <ChevronDown
                      size={12}
                      strokeWidth={2.5}
                      style={{
                        color: '#94a3b8',
                        transform: userMenuOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                      }}
                    />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        className="site-user__menu"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="site-user__who">
                          <p>{user.name}</p>
                          <p>{user.email}</p>
                        </div>
                        <div className="site-user__list">
                          {[
                            { to: '/dashboard', icon: LayoutDashboard, label: t('common.dashboard') },
                            { to: '/favorites', icon: Heart, label: t('common.favorites') },
                            { to: '/dashboard/submit', icon: Plus, label: t('dashboard.submitListing') },
                            ...(isStaff ? [{ to: '/admin', icon: Shield, label: t('common.adminPanel') }] : []),
                          ].map(item => (
                            <Link key={item.to} to={item.to} className="site-user__link">
                              <item.icon size={15} strokeWidth={2} />
                              {item.label}
                            </Link>
                          ))}
                          <button type="button" onClick={signOut} className="site-user__out">
                            <LogOut size={15} strokeWidth={2} />
                            {t('common.logout')}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link to="/login" className="site-login">
                  <User size={15} strokeWidth={2.2} />
                  {t('common.login')}
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="container-xl site-header__mobile">
          <BrandLogo size="md" responsiveText className="flex-shrink-0 min-w-0" />
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Link to="/favorites" title={t('common.favorites')} className="site-icon-btn">
              <Heart size={17} strokeWidth={2} />
              {favoriteCount > 0 && (
                <span className="site-count">{favoriteCount > 99 ? '99+' : favoriteCount}</span>
              )}
            </Link>
            <button type="button" className="site-icon-btn" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {activeMegaItem && (
            <motion.div
              key={activeMegaItem.label}
              className="site-mega"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="container-xl">
                <div className="site-mega__card">
                  <div className="site-mega__head">
                    <div className="site-mega__kicker">
                      <span className="site-mega__mark">
                        <activeMegaItem.icon size={15} color="#fff" strokeWidth={2.5} />
                      </span>
                      {activeMegaItem.mega.title}
                    </div>
                    <Link to={activeMegaItem.href} className="site-mega__all">
                      {t('common.viewAll')} <ArrowRight size={13} />
                    </Link>
                  </div>

                  <div className="site-mega__body">
                    <div className="site-mega__cols">
                      {activeMegaItem.mega.columns.map((col, ci) => (
                        <div key={ci} className="site-mega__col">
                          <p className="site-mega__heading" style={{ color: col.color }}>{col.heading}</p>
                          {col.items.map(nav => (
                            <Link key={nav.label} to={nav.href} className="site-mega__link">
                              <div className="site-mega__icon" style={{ background: `${nav.color}16` }}>
                                <nav.icon size={17} strokeWidth={1.8} style={{ color: nav.color }} />
                              </div>
                              <div>
                                <p>{nav.label}</p>
                                <p>{nav.desc}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>

                    {activeMegaItem.mega.featured && (
                      <div className="site-mega__featured">
                        <p className="site-mega__heading">{activeMegaItem.mega.featured.label}</p>
                        <Link to={activeMegaItem.mega.featured.href} style={{ display: 'block', textDecoration: 'none' }}>
                          <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 12, aspectRatio: '4/3' }}>
                            <img
                              src={activeMegaItem.mega.featured.image}
                              alt={activeMegaItem.mega.featured.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                          </div>
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 10px', borderRadius: 20, marginBottom: 8, background: '#2563eb',
                          }}>
                            <Star size={9} color="#fff" strokeWidth={2.5} />
                            <span style={{ fontSize: 9.5, fontWeight: 800, color: '#fff', letterSpacing: '0.06em' }}>FEATURED</span>
                          </div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>
                            {activeMegaItem.mega.featured.title}
                          </p>
                          <p style={{ fontSize: 16, fontWeight: 800, color: '#2563eb', marginTop: 5 }}>
                            {activeMegaItem.mega.featured.price}
                          </p>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="site-drawer-backdrop lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="site-drawer lg:hidden"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            >
              <div className="site-drawer__head">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <BrandLogo variant="dark" size="md" tagline={t('header.tagline')} href="/" />
                  <button type="button" className="site-icon-btn" style={{ color: '#fff', background: 'rgba(255,255,255,0.08)' }} onClick={() => setMobileOpen(false)}>
                    <X size={18} strokeWidth={2} />
                  </button>
                </div>
                <div className="site-drawer__search">
                  <Search size={14} style={{ color: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
                  <input placeholder={t('header.searchPlaceholder')} />
                </div>
              </div>

              <div className="site-drawer__quick">
                <LocaleCurrencySwitcher className="w-full" compact />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <a href={`tel:${CONTACT.phone.tel}`} className="site-drawer__chip" style={{ background: '#eff6ff', color: '#2563eb', border: '1.5px solid #dbeafe' }}>
                    <Phone size={14} strokeWidth={2} /> {CONTACT.phone.display}
                  </a>
                  <a href={CONTACT.mobile.whatsapp} target="_blank" rel="noopener noreferrer" className="site-drawer__chip" style={{ background: 'rgba(16,185,129,0.08)', color: '#059669', border: '1.5px solid rgba(16,185,129,0.22)' }}>
                    <WhatsAppIcon /> WhatsApp
                  </a>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Link to="/favorites" onClick={() => setMobileOpen(false)} className="site-drawer__chip" style={{ background: '#fff1f2', color: '#ef4444', border: '1.5px solid #fecdd3' }}>
                    <Heart size={14} strokeWidth={2} /> {t('common.favorites')}
                  </Link>
                  <button type="button" onClick={toggleDarkMode} className="site-icon-btn" style={{ border: '1.5px solid #e4e7eb', background: '#f7f9fb' }}>
                    {darkMode ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
                  </button>
                </div>
              </div>

              <nav className="site-drawer__nav">
                {navItems.map(item => {
                  const expanded = mobileExpanded === item.href;
                  const isActive = location.pathname === item.href;
                  const hasMega = !!item.mega;
                  return (
                    <div key={item.label} style={{ marginBottom: 2 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: 12,
                        background: isActive ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                      }}>
                        <Link to={item.href} onClick={() => setMobileOpen(false)} className="site-drawer__link" style={{ color: isActive ? '#2563eb' : '#0f172a' }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                            background: isActive ? 'rgba(37, 99, 235, 0.14)' : '#f7f9fb',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <item.icon size={15} strokeWidth={2} style={{ color: isActive ? '#2563eb' : '#94a3b8' }} />
                          </div>
                          {item.label}
                          {'badge' in item && item.badge && <span className="site-nav__badge">{item.badge}</span>}
                        </Link>
                        {hasMega && (
                          <button
                            type="button"
                            onClick={() => setMobileExpanded(expanded ? null : item.href)}
                            className="site-icon-btn"
                          >
                            <ChevronDown size={15} strokeWidth={2.2} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                          </button>
                        )}
                      </div>
                      <AnimatePresence initial={false}>
                        {hasMega && expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div style={{ padding: '4px 6px 8px 50px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                              {item.mega!.columns.flatMap(col => col.items).map(sub => (
                                <Link
                                  key={sub.label}
                                  to={sub.href}
                                  onClick={() => setMobileOpen(false)}
                                  className="site-mega__link"
                                  style={{ padding: '8px 10px' }}
                                >
                                  <div className="site-mega__icon" style={{ width: 24, height: 24, borderRadius: 6, background: `${sub.color}14` }}>
                                    <sub.icon size={12} strokeWidth={1.8} style={{ color: sub.color }} />
                                  </div>
                                  <p style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>{sub.label}</p>
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

              <div className="site-drawer__foot">
                {user ? (
                  <>
                    <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="site-drawer__cta is-primary">
                      <LayoutDashboard size={16} strokeWidth={2} /> {t('common.dashboard')}
                    </Link>
                    {isStaff && (
                      <Link to="/admin" onClick={() => setMobileOpen(false)} className="site-drawer__cta">
                        <Shield size={16} strokeWidth={2} /> {t('common.adminPanel')}
                      </Link>
                    )}
                    <button type="button" onClick={() => { setMobileOpen(false); signOut(); }} className="site-drawer__cta is-danger">
                      <LogOut size={16} strokeWidth={2} /> {t('common.logout')}
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileOpen(false)} className="site-drawer__cta">
                      <User size={16} strokeWidth={2} /> {t('common.login')}
                    </Link>
                    <Link to="/register" onClick={() => setMobileOpen(false)} className="site-drawer__cta is-ink">
                      {t('common.register')}
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
