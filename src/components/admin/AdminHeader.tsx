import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, Settings, LogOut, Plus,
  BookOpen, Shield, Sparkles, ExternalLink, Headphones, UserCog, BarChart3, LineChart,
  type LucideIcon,
} from 'lucide-react';
import { useAdminAuth, useApiRequest } from '../../contexts/AdminAuthContext';
import { roleLabel } from '../../lib/permissions';
import BrandLogo from '../BrandLogo';

export type AdminNavSection =
  | 'dashboard' | 'properties' | 'desk' | 'analytics' | 'prices' | 'agents'
  | 'blog' | 'staff' | 'members' | 'settings';

/** A section unlocks as soon as the actor holds any one of its permissions. */
const NAV_ITEMS: { id: AdminNavSection; label: string; icon: LucideIcon; permissions: string[] }[] = [
  { id: 'dashboard', label: 'მთავარი', icon: LayoutDashboard, permissions: ['dashboard.view'] },
  { id: 'properties', label: 'განცხადებები', icon: Building2, permissions: ['listings.view'] },
  {
    id: 'desk',
    label: 'დესკი',
    icon: Headphones,
    permissions: ['listings.tasks', 'listings.moderate', 'listings.assign', 'analytics.full', 'leads.view'],
  },
  {
    id: 'analytics',
    label: 'ანალიტიკა',
    icon: BarChart3,
    permissions: ['analytics.full', 'analytics.imports'],
  },
  {
    id: 'prices',
    label: 'ფასები',
    icon: LineChart,
    permissions: ['analytics.full'],
  },
  { id: 'agents', label: 'ბროკერები', icon: Users, permissions: ['agents.view'] },
  { id: 'blog', label: 'ბლოგი', icon: BookOpen, permissions: ['blog.view'] },
  { id: 'staff', label: 'თანამშრომლები', icon: Shield, permissions: ['staff.view'] },
  { id: 'members', label: 'მომხმარებლები', icon: UserCog, permissions: ['members.view'] },
  { id: 'settings', label: 'პარამეტრები', icon: Settings, permissions: ['settings.view'] },
];

interface AdminHeaderProps {
  subtitle: string;
  activeSection?: AdminNavSection;
  hideAddButton?: boolean;
}

export default function AdminHeader({ subtitle, activeSection = 'dashboard', hideAddButton = false }: AdminHeaderProps) {
  const navigate = useNavigate();
  const { user, logout, can } = useAdminAuth();
  const api = useApiRequest();
  const [deskAlerts, setDeskAlerts] = useState(0);

  const watchesDesk = Boolean(user) && (can('listings.tasks') || can('leads.view'));

  // A single count of "somebody is waiting on us", so the desk tab nags visibly.
  useEffect(() => {
    if (!watchesDesk) return;
    let cancelled = false;
    api('/desk/summary')
      .then((data: {
        overdueTasks?: number;
        slaBreached?: number;
        callbacksDue?: number;
        leadsBreached?: number;
      }) => {
        if (cancelled) return;
        setDeskAlerts(
          (data.overdueTasks ?? 0) + (data.slaBreached ?? 0)
          + (data.callbacksDue ?? 0) + (data.leadsBreached ?? 0),
        );
      })
      .catch(() => { /* the badge is optional */ });
    return () => { cancelled = true; };
  }, [api, watchesDesk]);

  if (!user) return null;

  const navItems = NAV_ITEMS.filter(item => item.permissions.some(permission => can(permission)));

  function goToSection(id: AdminNavSection) {
    navigate(id === 'dashboard' ? '/admin' : `/admin?section=${id}`);
  }

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: '#111827',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 1px 0 rgba(0,0,0,0.2)',
      }}
    >
      <div className="container-xl">
        <div className="flex items-center justify-between gap-4 py-3.5 min-h-[68px]">
          <BrandLogo
            variant="dark"
            size="md"
            tagline={subtitle}
            responsiveText
            href="/admin"
            className="min-w-0"
            badge={(
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest"
                style={{
                  background: 'rgba(37,99,235,0.18)',
                  color: '#BFDBFE',
                  border: '1px solid rgba(37,99,235,0.35)',
                }}
              >
                <Sparkles size={9} />
                Admin
              </span>
            )}
          />

          <nav
            className="hidden lg:flex items-center p-1 rounded-2xl flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {navItems.map(item => {
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goToSection(item.id)}
                  className="relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-all duration-200"
                  style={
                    active
                      ? { background: 'rgba(255,255,255,0.12)', color: '#fff' }
                      : { color: 'rgba(148,163,184,0.9)' }
                  }
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = '#e2e8f0'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(148,163,184,0.9)'; }}
                >
                  {active && (
                    <span
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
                      style={{ background: '#2563eb' }}
                    />
                  )}
                  <item.icon size={14} strokeWidth={active ? 2.3 : 2} className={active ? undefined : 'opacity-75'} />
                  {item.label}
                  {item.id === 'desk' && deskAlerts > 0 && (
                    <span
                      className="inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-extrabold text-white"
                      style={{ background: '#ef4444' }}
                    >
                      {deskAlerts > 99 ? '99+' : deskAlerts}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0">
            {!hideAddButton && can('listings.create') && (
              <button
                type="button"
                onClick={() => navigate('/admin/listings/new')}
                className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: '#10b981' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#059669'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#10b981'; }}
              >
                <Plus size={15} strokeWidth={2.5} />
                <span className="hidden sm:inline">განც. დამატება</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('/admin/profile')}
              className="hidden md:flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl ml-1 transition-all hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              title="ჩემი პროფილი"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold overflow-hidden"
                style={{ background: '#2563eb' }}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  (user.firstName || user.name).charAt(0).toUpperCase()
                )}
              </div>
              <div className="hidden lg:block min-w-0 max-w-[140px] text-left">
                <p className="text-white text-xs font-bold truncate leading-tight">{user.name}</p>
                <p className="text-slate-500 text-[10px] truncate">
                  {roleLabel(user.role)}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="p-2.5 rounded-xl transition-all hidden sm:flex"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(203,213,225,0.85)',
              }}
              title="საიტზე გადასვლა"
            >
              <ExternalLink size={16} />
            </button>

            <button
              type="button"
              onClick={() => { logout(); navigate('/admin/login'); }}
              className="p-2.5 rounded-xl transition-all"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#fca5a5',
              }}
              title="გამოსვლა"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        <nav
          className="lg:hidden flex items-center gap-1.5 pb-3.5 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {navItems.map(item => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => goToSection(item.id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all"
                style={
                  active
                    ? {
                        background: 'rgba(37, 99, 235,0.25)',
                        color: '#fff',
                        border: '1px solid rgba(37, 99, 235,0.4)',
                      }
                    : {
                        background: 'rgba(255,255,255,0.04)',
                        color: 'rgba(148,163,184,0.95)',
                        border: '1px solid rgba(255,255,255,0.07)',
                      }
                }
              >
                <item.icon size={13} strokeWidth={active ? 2.2 : 2} />
                {item.label}
                {item.id === 'desk' && deskAlerts > 0 && (
                  <span
                    className="inline-flex min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-extrabold text-white"
                    style={{ background: '#ef4444' }}
                  >
                    {deskAlerts > 99 ? '99+' : deskAlerts}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
