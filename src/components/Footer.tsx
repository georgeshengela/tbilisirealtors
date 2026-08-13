import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone, Mail, MapPin, Send,
  Building, Home, Star, Key, Layers, Tag,
  Users, BookOpen, Info, MessageSquare, Briefcase,
  ArrowUpRight, CheckCircle, Globe,
  Shield, type LucideIcon,
} from 'lucide-react';
import { CONTACT } from '../data/contactInfo';
import BusinessHours from './BusinessHours';
import ContactAddress from './ContactAddress';
import BrandLogo from './BrandLogo';
import { useTranslation } from '../i18n/LocaleContext';

const SocialIcon = ({ label }: { label: string }) => {
  if (label === 'Facebook') return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  );
  if (label === 'Instagram') return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  );
  if (label === 'Youtube') return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.97C5.12 20 12 20 12 20s6.88 0 8.59-.45a2.78 2.78 0 0 0 1.95-1.97A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#070b14"/>
    </svg>
  );
  if (label === 'LinkedIn') return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
      <rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
    </svg>
  );
  return <Globe size={16} strokeWidth={1.8} />;
};

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
  </svg>
);

function SectionTitle({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <h4 className="font-bold text-white text-sm mb-5 flex items-center gap-2.5">
      <span
        className="w-7 h-7 rounded-lg flex items-center justify-center"
        style={{ background: 'rgba(37, 99, 235,0.15)', border: '1px solid rgba(37, 99, 235,0.25)' }}
      >
        <Icon size={13} color="#2563eb" strokeWidth={2.2} />
      </span>
      {children}
    </h4>
  );
}

export default function Footer() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const PROPERTY_LINKS = useMemo(() => [
    { label: t('footer.apartments'), href: '/listings?type=apartment', icon: Building, color: '#2563eb' },
    { label: t('footer.houses'), href: '/listings?type=house', icon: Home, color: '#10b981' },
    { label: t('footer.villas'), href: '/listings?type=villa', icon: Star, color: '#ec4899' },
    { label: t('footer.commercial'), href: '/listings?type=commercial', icon: Layers, color: '#f59e0b' },
    { label: t('footer.forRent'), href: '/listings?status=rent', icon: Key, color: '#2563eb' },
    { label: t('footer.premium'), href: '/listings?premium=true', icon: Tag, color: '#06b6d4' },
  ], [t]);

  const COMPANY_LINKS = useMemo(() => [
    { label: t('footer.about'), href: '/about', icon: Info },
    { label: t('footer.agents'), href: '/agents', icon: Users },
    { label: t('footer.blog'), href: '/blog', icon: BookOpen },
    { label: t('footer.contact'), href: '/contact', icon: MessageSquare },
    { label: t('footer.careers'), href: '#', icon: Briefcase },
  ], [t]);

  const CITY_LINKS = useMemo(() => [
    { label: t('listings.cities.tbilisi'), href: '/listings?city=თბილისი', count: '2,847' },
    { label: t('listings.cities.batumi'), href: '/listings?city=ბათუმი', count: '1,234' },
    { label: t('listings.cities.kutaisi'), href: '/listings?city=ქუთაისი', count: '567' },
    { label: t('listings.cities.mtskheta'), href: '/listings?city=მცხეთა', count: '312' },
    { label: t('listings.cities.sighnaghi'), href: '/listings?city=სიღნაღი', count: '198' },
    { label: t('listings.cities.gori'), href: '/listings?city=გორი', count: '143' },
  ], [t]);

  const handleSubscribe = () => {
    if (email) { setSent(true); setEmail(''); }
  };

  const SOCIAL = [
    { label: 'Facebook',  href: '#', color: '#1877f2' },
    { label: 'Instagram', href: '#', color: '#e1306c' },
    { label: 'Youtube',   href: '#', color: '#ff0000' },
    { label: 'LinkedIn',  href: '#', color: '#0a66c2' },
  ];

  return (
    <footer className="relative overflow-hidden" style={{ background: '#070b14', color: '#eff1f3' }}>
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, #070b14 0%, #0c1222 40%, #0a0f1a 100%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            radial-gradient(ellipse 70% 50% at 15% 0%, rgba(37, 99, 235,0.22) 0%, transparent 55%),
            radial-gradient(ellipse 50% 40% at 85% 10%, rgba(16,185,129,0.12) 0%, transparent 50%),
            radial-gradient(circle at 50% 100%, rgba(37, 99, 235,0.08) 0%, transparent 45%)
          `,
        }} />
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.25,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div className="relative">
        {/* ── Newsletter ── */}
        <div className="container-xl pt-12 pb-10">
          <div
            className="rounded-2xl p-6 md:p-8"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, rgba(37, 99, 235,0.25), rgba(37, 99, 235,0.12))',
                    border: '1px solid rgba(129,140,248,0.3)',
                  }}
                >
                  <Send size={20} style={{ color: '#2563eb' }} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg mb-1">{t('footer.newsletterTitle')}</h3>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)', maxWidth: 400, lineHeight: 1.65 }}>
                    {t('footer.newsletterDesc')}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto lg:min-w-[420px]">
                {sent ? (
                  <div
                    className="flex items-center gap-3 px-6 py-4 rounded-xl w-full"
                    style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.28)' }}
                  >
                    <CheckCircle size={18} style={{ color: '#34d399' }} />
                    <span className="text-sm font-semibold" style={{ color: '#34d399' }}>მადლობა! სიახლეები მიიღებთ.</span>
                  </div>
                ) : (
                  <>
                    <div className="relative flex-1">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#2563eb' }} />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSubscribe()}
                        placeholder={t('footer.emailPlaceholder')}
                        className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm"
                        style={{
                          background: 'rgba(0,0,0,0.25)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          color: '#fff',
                          outline: 'none',
                        }}
                        onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(37, 99, 235,0.5)'}
                        onBlur={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)'}
                      />
                    </div>
                    <button
                      onClick={handleSubscribe}
                      className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white flex-shrink-0 transition-all"
                      style={{
                        background: 'linear-gradient(135deg, #2563eb 0%, #2563eb 100%)',
                      }}
                    >
                      <Send size={15} strokeWidth={2} />
                      გამოწერა
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="container-xl pb-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">

            {/* Contact column */}
            <div className="lg:col-span-4">
              <BrandLogo variant="dark" size="lg" tagline={t('header.tagline')} className="mb-6" />

              {/* Contact card */}
              <div
                className="rounded-2xl p-5 mb-6 space-y-4"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>კონტაქტი</p>

                <a href={`tel:${CONTACT.phone.tel}`} className="flex items-center gap-3 group" style={{ textDecoration: 'none' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(37, 99, 235,0.12)', border: '1px solid rgba(37, 99, 235,0.2)' }}>
                    <Phone size={15} style={{ color: '#2563eb' }} />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>{CONTACT.phone.label}</p>
                    <p className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">{CONTACT.phone.display}</p>
                  </div>
                </a>

                <div className="flex items-center gap-3">
                  <a href={`tel:${CONTACT.mobile.tel}`} className="flex items-center gap-3 flex-1 group" style={{ textDecoration: 'none' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)' }}>
                      <Phone size={15} style={{ color: '#34d399' }} />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>{CONTACT.mobile.label}</p>
                      <p className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">{CONTACT.mobile.display}</p>
                    </div>
                  </a>
                  <a
                    href={CONTACT.mobile.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0"
                    style={{ background: 'rgba(37,211,102,0.12)', color: '#4ade80', border: '1px solid rgba(37,211,102,0.25)', textDecoration: 'none' }}
                  >
                    <WhatsAppIcon />
                    WA
                  </a>
                </div>

                <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-3 group" style={{ textDecoration: 'none' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Mail size={15} style={{ color: '#94a3b8' }} />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>ელ-ფოსტა</p>
                    <p className="text-sm font-semibold group-hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.65)' }}>{CONTACT.email}</p>
                  </div>
                </a>

                <div className="pt-3 border-t border-white/6">
                  <BusinessHours variant="dark" compact showHeader />
                </div>
              </div>

              {/* Social */}
              <div className="flex gap-2">
                {SOCIAL.map(s => (
                  <a
                    key={s.label}
                    href={s.href}
                    title={s.label}
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = `${s.color}22`;
                      (e.currentTarget as HTMLElement).style.borderColor = `${s.color}55`;
                      (e.currentTarget as HTMLElement).style.color = s.color;
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                      (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)';
                      (e.currentTarget as HTMLElement).style.transform = 'none';
                    }}
                  >
                    <SocialIcon label={s.label} />
                  </a>
                ))}
              </div>
            </div>

            {/* Property links */}
            <div className="lg:col-span-2">
              <SectionTitle icon={Building}>{t('footer.properties')}</SectionTitle>
              <ul className="space-y-1">
                {PROPERTY_LINKS.map(link => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="flex items-center gap-2.5 py-2 px-2.5 rounded-xl text-sm transition-all duration-150"
                      style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.color = '#fff';
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)';
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                    >
                      <link.icon size={14} strokeWidth={2} style={{ color: link.color, flexShrink: 0 }} />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company links */}
            <div className="lg:col-span-2">
              <SectionTitle icon={Info}>{t('footer.company')}</SectionTitle>
              <ul className="space-y-1">
                {COMPANY_LINKS.map(link => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="flex items-center gap-2.5 py-2 px-2.5 rounded-xl text-sm transition-all duration-150"
                      style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.color = '#fff';
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)';
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                    >
                      <link.icon size={14} strokeWidth={2} style={{ color: '#64748b', flexShrink: 0 }} />
                      {link.label}
                      <ArrowUpRight size={11} className="ml-auto opacity-0 group-hover:opacity-100" style={{ opacity: 0.3 }} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cities */}
            <div className="lg:col-span-4">
              <SectionTitle icon={MapPin}>{t('footer.cities')}</SectionTitle>
              <div className="grid grid-cols-2 gap-2.5">
                {CITY_LINKS.map(city => (
                  <Link
                    key={city.label}
                    to={city.href}
                    className="group flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-200"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(37, 99, 235,0.12)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(37, 99, 235,0.28)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
                      (e.currentTarget as HTMLElement).style.transform = 'none';
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin size={12} style={{ color: '#2563eb', flexShrink: 0 }} />
                      <span className="text-sm font-semibold truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>{city.label}</span>
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0 ml-2"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}
                    >
                      {city.count}
                    </span>
                  </Link>
                ))}
              </div>

              {/* Address */}
              <div
                className="mt-5 rounded-2xl p-4 flex items-start gap-3"
                style={{
                  background: 'linear-gradient(135deg, rgba(19,27,46,0.8), rgba(15,23,42,0.6))',
                  border: '1px solid rgba(37, 99, 235,0.15)',
                }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(37, 99, 235,0.15)' }}>
                  <MapPin size={15} style={{ color: '#2563eb' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white mb-1.5">ოფისი</p>
                  <ContactAddress variant="dark" showMapsHint />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div
            className="h-px w-full"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(37, 99, 235,0.4) 30%, rgba(16,185,129,0.35) 70%, transparent)' }}
          />
          <div className="container-xl py-6">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-5">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.28)' }}>
                  {t('footer.rights', { year: new Date().getFullYear() })}
                </p>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {[
                    { icon: CheckCircle, label: 'SSL დაცული', color: '#34d399', bg: 'rgba(16,185,129,0.1)' },
                    { icon: Shield,      label: 'ლიც. პლატფ.', color: '#2563eb', bg: 'rgba(37, 99, 235,0.1)' },
                    { icon: Globe,       label: 'GE · EN · RU', color: '#c4b5fd', bg: 'rgba(139,92,246,0.1)' },
                  ].map(b => (
                    <div
                      key={b.label}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                      style={{ background: b.bg, border: `1px solid ${b.color}33` }}
                    >
                      <b.icon size={11} style={{ color: b.color }} />
                      <span className="text-[11px] font-semibold" style={{ color: b.color }}>{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2">
                {[
                  { l: 'კონფ. პოლიტიკა', href: '#' },
                  { l: 'გამოყ. წესები',   href: '#' },
                  { l: 'Cookies',          href: '#' },
                  { l: 'რუქა',             href: '#' },
                ].map((item, i) => (
                  <span key={item.l} className="flex items-center">
                    {i > 0 && <span className="mx-2" style={{ color: 'rgba(255,255,255,0.12)' }}>·</span>}
                    <Link
                      to={item.href}
                      className="text-xs font-medium transition-colors hover:text-white"
                      style={{ color: 'rgba(255,255,255,0.28)', textDecoration: 'none' }}
                    >
                      {item.l}
                    </Link>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
