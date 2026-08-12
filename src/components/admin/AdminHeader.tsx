import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, Settings, LogOut, Plus,
  BookOpen, Shield, Sparkles, ExternalLink,
  type LucideIcon,
} from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

export type AdminNavSection = 'dashboard' | 'properties' | 'agents' | 'blog' | 'users' | 'settings';

const NAV_ITEMS: { id: AdminNavSection; label: string; icon: LucideIcon }[] = [
  { id: 'dashboard', label: 'მთავარი', icon: LayoutDashboard },
  { id: 'properties', label: 'განცხადებები', icon: Building2 },
  { id: 'agents', label: 'აგენტები', icon: Users },
  { id: 'blog', label: 'ბლოგი', icon: BookOpen },
  { id: 'users', label: 'ადმინ მომხ.', icon: Shield },
  { id: 'settings', label: 'პარამეტრები', icon: Settings },
];

interface AdminHeaderProps {
  subtitle: string;
  activeSection?: AdminNavSection;
  hideAddButton?: boolean;
}

export default function AdminHeader({ subtitle, activeSection = 'dashboard', hideAddButton = false }: AdminHeaderProps) {
  const navigate = useNavigate();
  const { user, logout } = useAdminAuth();

  if (!user) return null;

  function goToSection(id: AdminNavSection) {
    navigate(id === 'dashboard' ? '/admin' : `/admin?section=${id}`);
  }

  return (
    <header
      className="sticky top-0 z-40"
      style={{
        background: '#111827',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      }}
    >
      <div className="container-xl">
        <div className="flex items-center justify-between gap-4 py-3.5 min-h-[68px]">
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="flex items-center gap-3 min-w-0 flex-shrink-0 text-left"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div className="relative flex-shrink-0">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: '#497cff', boxShadow: '0 4px 14px rgba(73,124,255,0.35)' }}
              >
                <Building2 size={20} color="#fff" strokeWidth={2.2} />
              </div>
              <div
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
                style={{ background: '#10b981', borderColor: '#111827' }}
              />
            </div>
            <div className="min-w-0 hidden sm:block">
              <div className="flex items-center gap-2">
                <p className="font-extrabold text-white text-[15px] leading-none tracking-tight">
                  TbilisiRealtors<span style={{ color: '#93c5fd' }}>.ge</span>
                </p>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest"
                  style={{
                    background: 'rgba(73,124,255,0.2)',
                    color: '#c7d2fe',
                    border: '1px solid rgba(73,124,255,0.35)',
                  }}
                >
                  <Sparkles size={9} />
                  Admin
                </span>
              </div>
              <p className="text-slate-500 text-[11px] mt-1 font-medium truncate">{subtitle}</p>
            </div>
          </button>

          <nav
            className="hidden lg:flex items-center p-1 rounded-2xl flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {NAV_ITEMS.map(item => {
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
                      style={{ background: '#497cff' }}
                    />
                  )}
                  <item.icon size={14} strokeWidth={active ? 2.3 : 2} className={active ? undefined : 'opacity-75'} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0">
            {!hideAddButton && (
              <button
                type="button"
                onClick={() => navigate('/admin/listings/new')}
                className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: '#10b981', boxShadow: '0 4px 14px rgba(16,185,129,0.35)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#059669'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#10b981'; }}
              >
                <Plus size={15} strokeWidth={2.5} />
                <span className="hidden sm:inline">განც. დამატება</span>
              </button>
            )}

            <div
              className="hidden md:flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl ml-1"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ background: '#4f46e5' }}
              >
                {user.name.charAt(0)}
              </div>
              <div className="hidden lg:block min-w-0 max-w-[110px]">
                <p className="text-white text-xs font-bold truncate leading-tight">{user.name.split(' ')[0]}</p>
                <p className="text-slate-500 text-[10px] truncate">
                  {user.role === 'super_admin' ? 'სუპ. ადმინი' : 'ადმინი'}
                </p>
              </div>
            </div>

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
          {NAV_ITEMS.map(item => {
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
                        background: 'rgba(73,124,255,0.25)',
                        color: '#fff',
                        border: '1px solid rgba(73,124,255,0.4)',
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
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
