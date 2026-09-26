import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, ClipboardList, Users, Settings, LogOut, Plus,
  BookOpen, Shield, Sparkles, ExternalLink, Headphones, UserCog, BarChart3, LineChart, HardHat,
  type LucideIcon,
} from 'lucide-react';
import { useAdminAuth, useApiRequest } from '../../contexts/AdminAuthContext';
import { roleLabel } from '../../lib/permissions';
import BrandLogo from '../BrandLogo';
import AdminNavBar from './AdminNavBar';

export type AdminNavSection =
  | 'dashboard' | 'projects' | 'orders' | 'properties' | 'desk' | 'analytics' | 'prices' | 'agents'
  | 'blog' | 'staff' | 'members' | 'settings';

/** A section unlocks as soon as the actor holds any one of its permissions. */
const NAV_ITEMS: { id: AdminNavSection; label: string; icon: LucideIcon; permissions: string[]; badge?: number }[] = [
  { id: 'dashboard', label: 'მთავარი', icon: LayoutDashboard, permissions: ['dashboard.view'] },
  { id: 'projects', label: 'პროექტები', icon: HardHat, permissions: ['projects.view'] },
  { id: 'orders', label: 'შეკვეთები', icon: ClipboardList, permissions: ['orders.view'] },
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
}

export default function AdminHeader({ subtitle, activeSection = 'properties' }: AdminHeaderProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout, can } = useAdminAuth();
  const onProjectForm = pathname.startsWith('/admin/projects/');
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

  const navItems = NAV_ITEMS
    .filter(item => item.permissions.some(permission => can(permission)))
    .map(item => item.id === 'desk' && deskAlerts > 0 ? { ...item, badge: deskAlerts } : item);

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
            <AdminNavBar
              items={navItems}
              activeId={activeSection}
              onSelect={id => goToSection(id as AdminNavSection)}
              variant="desktop"
            />
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0">
            {activeSection === 'projects' && can('projects.create') && !onProjectForm ? (
              <button
                type="button"
                onClick={() => navigate('/admin/projects/new')}
                className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: '#10b981' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#059669'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#10b981'; }}
              >
                <Plus size={15} strokeWidth={2.5} />
                <span className="hidden sm:inline">ახალი პროექტი</span>
              </button>
            ) : can('listings.create') ? (
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
            ) : null}

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
          <AdminNavBar
            items={navItems}
            activeId={activeSection}
            onSelect={id => goToSection(id as AdminNavSection)}
            variant="mobile"
          />
        </nav>
      </div>
    </header>
  );
}
