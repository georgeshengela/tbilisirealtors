import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Phone, Mail, MapPin, Send,
  Building, Home, Star, Key, Layers, Tag,
  Users, BookOpen, Info, MessageSquare, Briefcase,
  ArrowUpRight, CheckCircle, Clock, Globe,
  ChevronRight
} from 'lucide-react';

/* ─── SVG social icons (lucide-react doesn't include these brand icons) ─── */
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
      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#080b12"/>
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

const PROPERTY_LINKS = [
  { label: 'ბინები',        href: '/listings?type=apartment', icon: Building  },
  { label: 'სახლები',       href: '/listings?type=house',     icon: Home      },
  { label: 'ვილები',        href: '/listings?type=villa',     icon: Star      },
  { label: 'კომერციული',    href: '/listings?type=commercial',icon: Layers    },
  { label: 'გაქირავება',    href: '/listings?status=rent',    icon: Key       },
  { label: 'პრემიუმ',      href: '/listings?premium=true',   icon: Tag       },
];

const COMPANY_LINKS = [
  { label: 'ჩვენს შესახებ', href: '/about',   icon: Info         },
  { label: 'აგენტები',      href: '/agents',  icon: Users        },
  { label: 'ბლოგი',         href: '/blog',    icon: BookOpen     },
  { label: 'კონტაქტი',      href: '/contact', icon: MessageSquare},
  { label: 'კარიერა',       href: '#',        icon: Briefcase    },
];

const CITY_LINKS = [
  { label: 'თბილისი', href: '/listings?city=თბილისი', count: '2,847' },
  { label: 'ბათუმი',  href: '/listings?city=ბათუმი',  count: '1,234' },
  { label: 'ქუთაისი', href: '/listings?city=ქუთაისი', count: '567'   },
  { label: 'მცხეთა',  href: '/listings?city=მცხეთა',  count: '312'   },
  { label: 'სიღნაღი', href: '/listings?city=სიღნაღი',  count: '198'   },
  { label: 'გორი',    href: '/listings?city=გორი',    count: '143'   },
];

const SOCIAL = [
  { label: 'Facebook',  href: '#', color: '#1877f2' },
  { label: 'Instagram', href: '#', color: '#e1306c' },
  { label: 'Youtube',   href: '#', color: '#ff0000' },
  { label: 'LinkedIn',  href: '#', color: '#0a66c2' },
];

const STATS = [
  { v: '12,400+', l: 'ქონება'  },
  { v: '350+',    l: 'აგენტი'  },
  { v: '8,200+',  l: 'კლიენტი' },
  { v: '8+',      l: 'წელი'    },
];

export default function Footer() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubscribe = () => {
    if (email) { setSent(true); setEmail(''); }
  };

  return (
    <footer style={{ background: '#080b12', color: '#eff1f3' }}>

      {/* ══════════ STATS BAR ══════════ */}
      <div style={{ background: '#131b2e', borderBottom: '1px solid rgba(73,124,255,0.15)' }}>
        <div className="container-xl">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {STATS.map((s, i) => (
              <div
                key={s.l}
                className="flex flex-col items-center py-6"
                style={{ borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
              >
                <span className="font-bold text-white" style={{ fontSize: 28, lineHeight: 1, letterSpacing: '-0.02em' }}>{s.v}</span>
                <span className="text-xs font-semibold mt-1.5" style={{ color: 'rgba(255,255,255,0.40)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════ NEWSLETTER ══════════ */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="container-xl py-12">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(73,124,255,0.15)', border: '1px solid rgba(73,124,255,0.25)' }}>
                <Send size={20} style={{ color: '#497cff' }} strokeWidth={1.8} />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg mb-1">გამოიწერეთ სიახლეები</h3>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)', maxWidth: 380, lineHeight: 1.6 }}>
                  ახალი ქონება, ბაზრის ანალიზი, სპეციალური შეთავაზებები — პირდაპირ თქვენს ელ-ფოსტაზე.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto lg:min-w-[440px]">
              {sent ? (
                <div className="flex items-center gap-3 px-6 py-4 rounded-xl w-full"
                  style={{ background: 'rgba(16,185,129,0.12)', border: '1.5px solid rgba(16,185,129,0.30)' }}>
                  <CheckCircle size={18} style={{ color: '#10B981' }} />
                  <span className="text-sm font-semibold" style={{ color: '#10B981' }}>მადლობა! სიახლეები მიიღებთ.</span>
                </div>
              ) : (
                <>
                  <div className="relative flex-1">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#497cff' }} strokeWidth={1.8} />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSubscribe()}
                      placeholder="თქვენი ელ-ფოსტა"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1.5px solid rgba(255,255,255,0.10)',
                        color: '#fff',
                        outline: 'none',
                        boxShadow: 'none',
                      }}
                      onFocus={e => (e.target as HTMLInputElement).style.borderColor = '#497cff'}
                      onBlur={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.10)'}
                    />
                  </div>
                  <button
                    onClick={handleSubscribe}
                    className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white flex-shrink-0 transition-all"
                    style={{ background: '#497cff' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#3567f5'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#497cff'}
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

      {/* ══════════ MAIN GRID ══════════ */}
      <div className="container-xl py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-x-8 gap-y-12">

          {/* Brand column (4/12) */}
          <div className="lg:col-span-4">
            <Link to="/" className="inline-flex items-center gap-3 mb-6" style={{ textDecoration: 'none' }}>
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: '#fff' }}>
                  <Building2 size={20} style={{ color: '#131b2e' }} strokeWidth={2} />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                  style={{ background: '#497cff', border: '2px solid #080b12' }} />
              </div>
              <div>
                <div className="font-bold text-white" style={{ fontSize: 16, lineHeight: 1.1 }}>TbilisiRealtors</div>
                <div className="font-bold" style={{ fontSize: 11, color: '#497cff' }}>.ge — პრემიუმ ბაზარი</div>
              </div>
            </Link>

            <p className="text-sm leading-relaxed mb-7" style={{ color: 'rgba(255,255,255,0.45)', maxWidth: 280, lineHeight: 1.7 }}>
              საქართველოს პრემიუმ უძრავი ქონების პლატფორმა. 2018 წლიდან ვეხმარებით 8,200+ კლიენტს სოციუმის პოვნაში.
            </p>

            {/* Contact details */}
            <div className="space-y-3 mb-8">
              {[
                { icon: Phone,  label: '+995 322 12 34 56', href: 'tel:+995322123456'           },
                { icon: Mail,   label: 'info@tbilisirealtors.ge', href: 'mailto:info@tbilisirealtors.ge' },
                { icon: MapPin, label: 'ჭავჭავაძის გამზ. 14, თბილისი', href: '#'              },
                { icon: Clock,  label: 'ორ–შაბ: 09:00–20:00', href: '#'                         },
              ].map(item => (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex items-start gap-3 text-sm group"
                  style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#fff'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: 'rgba(73,124,255,0.10)', border: '1px solid rgba(73,124,255,0.18)' }}>
                    <item.icon size={14} style={{ color: '#497cff' }} strokeWidth={1.8} />
                  </div>
                  <span style={{ lineHeight: 1.5, paddingTop: 4 }}>{item.label}</span>
                </a>
              ))}
            </div>

            {/* Social icons */}
            <div>
              <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.30)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                სოციალური ქსელები
              </p>
              <div className="flex gap-2">
                {SOCIAL.map(s => (
                  <a
                    key={s.label}
                    href={s.href}
                    title={s.label}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)' }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = `${s.color}22`;
                      (e.currentTarget as HTMLElement).style.borderColor = `${s.color}55`;
                      (e.currentTarget as HTMLElement).style.color = s.color;
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                      (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)';
                      (e.currentTarget as HTMLElement).style.transform = 'none';
                    }}
                  >
                    <SocialIcon label={s.label} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Property links (2/12) */}
          <div className="lg:col-span-2">
            <h4 className="font-bold text-white text-sm mb-5 flex items-center gap-2">
              <Building size={14} style={{ color: '#497cff' }} strokeWidth={2} />
              ქონება
            </h4>
            <ul className="space-y-1.5">
              {PROPERTY_LINKS.map(link => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="flex items-center gap-2.5 py-1.5 text-sm rounded-lg px-2 transition-all duration-150 group"
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
                    <link.icon size={13} strokeWidth={1.8} style={{ color: '#497cff', flexShrink: 0 }} />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links (2/12) */}
          <div className="lg:col-span-2">
            <h4 className="font-bold text-white text-sm mb-5 flex items-center gap-2">
              <Info size={14} style={{ color: '#497cff' }} strokeWidth={2} />
              კომპანია
            </h4>
            <ul className="space-y-1.5">
              {COMPANY_LINKS.map(link => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="flex items-center gap-2.5 py-1.5 text-sm rounded-lg px-2 transition-all duration-150"
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
                    <link.icon size={13} strokeWidth={1.8} style={{ color: '#497cff', flexShrink: 0 }} />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Cities (4/12) */}
          <div className="lg:col-span-4">
            <h4 className="font-bold text-white text-sm mb-5 flex items-center gap-2">
              <MapPin size={14} style={{ color: '#497cff' }} strokeWidth={2} />
              ქალაქები
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {CITY_LINKS.map(city => (
                <Link
                  key={city.label}
                  to={city.href}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(73,124,255,0.10)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(73,124,255,0.25)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)';
                  }}
                >
                  <div className="flex items-center gap-2">
                    <MapPin size={12} style={{ color: '#497cff' }} strokeWidth={2} />
                    <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>{city.label}</span>
                  </div>
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.30)' }}>{city.count}</span>
                </Link>
              ))}
            </div>

            {/* App download CTA */}
            <div
              className="mt-5 rounded-2xl p-4"
              style={{ background: 'linear-gradient(135deg, rgba(19,27,46,0.95) 0%, rgba(0,23,75,0.90) 100%)', border: '1px solid rgba(73,124,255,0.20)' }}
            >
              <p className="font-bold text-white text-sm mb-1">მობილური აპლიკაცია</p>
              <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                იპოვეთ ქონება სადმეც გინდათ. iOS & Android.
              </p>
              <div className="flex gap-2">
                {['App Store', 'Google Play'].map(store => (
                  <a
                    key={store}
                    href="#"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.12)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.14)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'}
                  >
                    <ChevronRight size={11} /> {store}
                  </a>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ══════════ BOTTOM BAR ══════════ */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="container-xl py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

            {/* Left: copyright + trust badges */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.30)' }}>
                © 2026 TbilisiRealtors.ge — ყველა უფლება დაცულია.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.20)' }}>
                  <CheckCircle size={11} style={{ color: '#10B981' }} />
                  <span className="text-xs font-semibold" style={{ color: '#10B981' }}>SSL დაცული</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(73,124,255,0.10)', border: '1px solid rgba(73,124,255,0.20)' }}>
                  <Globe size={11} style={{ color: '#497cff' }} />
                  <span className="text-xs font-semibold" style={{ color: '#497cff' }}>ლიც. პლ.</span>
                </div>
              </div>
            </div>

            {/* Right: legal links + external arrow */}
            <div className="flex items-center gap-1">
              {[
                { l: 'კონფ. პოლიტიკა', href: '#' },
                { l: 'გამოყ. წესები',   href: '#' },
                { l: 'Cookies',          href: '#' },
                { l: 'რუქა',             href: '#' },
              ].map((item, i) => (
                <span key={item.l} className="flex items-center">
                  {i > 0 && <span className="mx-2" style={{ color: 'rgba(255,255,255,0.12)', fontSize: 14 }}>·</span>}
                  <Link
                    to={item.href}
                    className="flex items-center gap-0.5 text-xs transition-colors"
                    style={{ color: 'rgba(255,255,255,0.30)', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.30)'}
                  >
                    {item.l}
                    <ArrowUpRight size={10} style={{ marginLeft: 1 }} />
                  </Link>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

    </footer>
  );
}
