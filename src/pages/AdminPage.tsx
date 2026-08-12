import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, Settings, LogOut, Plus,
  Pencil, Trash2, X, Eye, TrendingUp, UserCheck,
  BookOpen, Search, CheckCircle, XCircle, Shield, Home,
  Star, Zap, Sparkles, Filter, Image as ImageIcon,
  Phone, Mail, Globe, RefreshCw, ArrowUpRight, MapPin, Clock,
  ExternalLink,
} from 'lucide-react';
import { useAdminAuth, useApiRequest } from '../contexts/AdminAuthContext';

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface Stats {
  properties: number; agents: number; blogPosts: number;
  adminUsers: number; totalViews: number;
  recentProperties: PropertyRow[];
}

interface PropertyRow {
  id: string; title: string; price: string; pricePerSqm: string;
  city: string; district: string; type: string; status: string;
  bedrooms: number; bathrooms: number; area: string; floor: number;
  totalFloors: number; yearBuilt: number;
  images: string[]; amenities: string[]; features: string[];
  isFeatured: boolean; isNew: boolean; isPremium: boolean;
  viewCount: number; listedDate: string; createdAt: string;
  agentId: string; agentName: string; agentPhone: string; agentEmail: string;
  description: string;
}

interface AgentRow {
  id: string; name: string; email: string; phone: string;
  photo: string; company: string; verified: boolean; isActive: boolean;
  propertyCount: number; rating: string; yearsExperience: number;
  bio: string; languages: string[]; specialization: string[];
}

interface BlogRow {
  id: string; title: string; excerpt: string; category: string;
  authorName: string; isPublished: boolean; isFeatured: boolean;
  readTime: number; publishDate: string; image: string; tags: string[];
}

interface AdminUserRow {
  id: number; email: string; name: string; role: string;
  isActive: boolean; createdAt: string;
}

interface Setting { key: string; value: string; label: string; }

type Section = 'dashboard' | 'properties' | 'agents' | 'blog' | 'users' | 'settings';

// ─── HELPERS ────────────────────────────────────────────────────────────────

const GEL = (n: number | string) =>
  Number(n).toLocaleString('ka-GE') + ' ₾';

const TYPE_LABELS: Record<string, string> = {
  apartment: 'ბინა', house: 'სახლი', commercial: 'კომ.', land: 'მიწა', villa: 'ვილა',
};
const TYPE_COLORS: Record<string, string> = {
  apartment: '#497cff', house: '#10B981', commercial: '#f59e0b', land: '#8b5cf6', villa: '#ec4899',
};
const STATUS_LABEL: Record<string, string> = { sale: 'იყიდება', rent: 'ქირავდება' };
const STATUS_COLOR: Record<string, string> = { sale: '#f59e0b', rent: '#10B981' };

// ─── SMALL COMPONENTS ───────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
      {type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
      {message}
    </div>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl ${wide ? 'w-full max-w-3xl' : 'w-full max-w-2xl'} max-h-[92vh] overflow-y-auto`}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white rounded-t-2xl">
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: `${color}18`, color }}>
      {label}
    </span>
  );
}

function Toggle({ on, onToggle, label, color = '#10B981' }: { on: boolean; onToggle: () => void; label: string; color?: string }) {
  return (
    <button
      onClick={onToggle}
      title={label}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all duration-200 ${on ? 'opacity-100' : 'opacity-40'}`}
      style={{ background: on ? color : '#94a3b8' }}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

function ImgThumb({ src }: { src?: string }) {
  if (!src) return (
    <div className="w-12 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
      <ImageIcon size={14} className="text-slate-300" />
    </div>
  );
  return (
    <img src={src} alt="" className="w-12 h-10 rounded-lg object-cover flex-shrink-0 bg-slate-100" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
  );
}

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all';
const selectCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white';

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

// ─── CHART HELPERS ───────────────────────────────────────────────────────────

const MONTHS_GEO = ['იან','თებ','მარ','აპრ','მაი','ივნ','ივლ','აგვ','სექ','ოქტ','ნოე','დეკ'];
const MOCK_LISTINGS = [14, 20, 18, 26, 32, 28, 36, 30, 24, 22, 19, 16];
const MOCK_VIEWS_K  = [9,  13, 11, 17, 21, 18, 23, 19, 15, 13, 11, 10];

function SparkLine({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1), min = Math.min(...data);
  const range = max - min || 1;
  const W = 80, H = 30;
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * W},${H - 4 - ((v - min) / range) * (H - 10)}`
  ).join(' ');
  const areaBottom = H - 1;
  const areaPts = [
    `0,${areaBottom}`,
    ...data.map((v, i) => `${(i / (data.length - 1)) * W},${H - 4 - ((v - min) / range) * (H - 10)}`),
    `${W},${areaBottom}`,
  ].join(' ');
  const uid = color.replace('#', '');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`sg${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.20" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={areaPts} fill={`url(#sg${uid})`} stroke="none" />
      <polyline points={pts} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MonthlyBarChart() {
  const maxV = Math.max(...MOCK_LISTINGS, ...MOCK_VIEWS_K, 1);
  const H = 100, padT = 8, padB = 22, padL = 28, totalW = 620;
  const slotW = (totalW - padL) / 12;
  const bw = 11;
  const curMonth = new Date().getMonth();
  return (
    <svg width="100%" viewBox={`0 0 ${totalW} ${H + padT + padB}`} preserveAspectRatio="xMidYMid meet">
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
        <g key={i}>
          <line x1={padL} y1={padT + (1 - pct) * H} x2={totalW} y2={padT + (1 - pct) * H}
            stroke={pct === 0 ? '#e2e8f0' : '#f8fafc'} strokeWidth="1" />
          <text x={padL - 4} y={padT + (1 - pct) * H + 3.5} textAnchor="end" fontSize="7.5" fill="#cbd5e1">
            {Math.round(pct * maxV)}
          </text>
        </g>
      ))}
      {MONTHS_GEO.map((m, i) => {
        const cx = padL + i * slotW + slotW / 2;
        const lh = (MOCK_LISTINGS[i] / maxV) * H;
        const vh = (MOCK_VIEWS_K[i] / maxV) * H;
        const active = i === curMonth;
        return (
          <g key={m}>
            <rect x={cx - bw - 1.5} y={padT + H - vh} width={bw} height={vh} rx="3.5"
              fill={active ? '#bbf7d0' : '#dcfce7'} />
            <rect x={cx + 1.5} y={padT + H - lh} width={bw} height={lh} rx="3.5"
              fill={active ? '#4f46e5' : '#c7d2fe'} />
            <text x={cx} y={padT + H + padB - 4} textAnchor="middle" fontSize="8.5"
              fill={active ? '#4f46e5' : '#94a3b8'} fontWeight={active ? '700' : '400'}>{m}</text>
          </g>
        );
      })}
    </svg>
  );
}

function DonutSegments({
  segments, total, demo,
}: { segments: { label: string; value: number; color: string }[]; total: number; demo?: boolean }) {
  const r = 46, cx = 62, cy = 62, sw = 14;
  const circ = 2 * Math.PI * r;
  let cum = 0;
  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={124} height={124} viewBox={`0 0 124 124`}>
        {segments.map((seg, i) => {
          const pct = seg.value / (total || 1);
          const dash = pct * circ;
          const rot = cum * 360 - 90;
          cum += pct;
          return (
            <circle key={i} cx={cx} cy={cy} r={r}
              fill="none" stroke={seg.color} strokeWidth={sw}
              strokeDasharray={`${dash} ${circ - dash}`}
              transform={`rotate(${rot} ${cx} ${cy})`} />
          );
        })}
        <circle cx={cx} cy={cy} r={r - sw / 2 - 3} fill="white" />
        <text x={cx} y={cy - 5} textAnchor="middle" fontSize="18" fontWeight="800" fill="#0f172a">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill="#94a3b8">{demo ? 'demo' : 'სულ'}</text>
      </svg>
      <div className="w-full space-y-2">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
              <span className="text-xs text-slate-600">{seg.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">{seg.value}</span>
              <span className="text-xs text-slate-400 w-8 text-right">{Math.round(seg.value / (total || 1) * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PropertyTypeChart({ properties }: { properties: PropertyRow[] }) {
  const counts: Record<string, number> = {};
  properties.forEach(p => { counts[p.type] = (counts[p.type] || 0) + 1; });
  const segs = Object.entries(TYPE_COLORS)
    .map(([t, c]) => ({ label: TYPE_LABELS[t] || t, value: counts[t] || 0, color: c }))
    .filter(s => s.value > 0);
  if (segs.length === 0) {
    const demo = [
      { label: 'ბინა',  value: 60, color: '#4f46e5' },
      { label: 'სახლი', value: 20, color: '#10b981' },
      { label: 'კომ.',  value: 12, color: '#f59e0b' },
      { label: 'ვილა',  value: 8,  color: '#ec4899' },
    ];
    return <DonutSegments segments={demo} total={100} demo />;
  }
  return <DonutSegments segments={segs} total={segs.reduce((s, d) => s + d.value, 0)} />;
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, logout, loading: authLoading } = useAdminAuth();
  const api = useApiRequest();

  const [section, setSection] = useState<Section>('dashboard');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [stats, setStats] = useState<Stats | null>(null);
  const [propList, setPropList] = useState<PropertyRow[]>([]);
  const [agentList, setAgentList] = useState<AgentRow[]>([]);
  const [blogList, setBlogList] = useState<BlogRow[]>([]);
  const [userList, setUserList] = useState<AdminUserRow[]>([]);
  const [settingList, setSettingList] = useState<Setting[]>([]);

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [propFilter, setPropFilter] = useState<'all' | 'sale' | 'rent'>('all');
  const [propTypeFilter, setPropTypeFilter] = useState('all');

  const [modal, setModal] = useState<{ type: 'agent' | 'blog' | 'user'; mode: 'create' | 'edit'; data: Record<string, unknown> } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: Section; id: string | number } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate('/admin/login');
  }, [user, authLoading, navigate]);

  const loadSection = useCallback(async (s: Section) => {
    if (!user) return;
    setLoading(true);
    try {
      if (s === 'dashboard') {
        const [statsData, propsData] = await Promise.all([
          api('/stats'),
          api('/properties?limit=100'),
        ]);
        setStats(statsData);
        setPropList(propsData.data ?? []);
      } else if (s === 'properties') {
        const data = await api('/properties?limit=100');
        setPropList(data.data);
      } else if (s === 'agents') {
        const data = await api('/agents');
        setAgentList(data);
      } else if (s === 'blog') {
        const data = await api('/blog');
        setBlogList(data);
      } else if (s === 'users') {
        const data = await api('/users');
        setUserList(data);
      } else if (s === 'settings') {
        const data = await api('/settings');
        setSettingList(data);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, api, showToast]);

  useEffect(() => {
    if (user) loadSection(section);
  }, [section, user, loadSection]);

  // Quick toggle property flag
  async function patchProp(id: string, field: string, value: boolean) {
    try {
      const updated = await api(`/properties/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: value }),
      });
      setPropList(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
      showToast('განახლდა');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    const { type, id } = confirmDelete;
    setConfirmDelete(null);
    try {
      const pathMap: Record<string, string> = { properties: 'properties', agents: 'agents', blog: 'blog', users: 'users' };
      await api(`/${pathMap[type]}/${id}`, { method: 'DELETE' });
      showToast('წაიშალა');
      loadSection(type);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    }
  }

  async function saveModal(formData: Record<string, unknown>) {
    if (!modal) return;
    const { type, mode, data } = modal;
    const pathMap: Record<string, string> = { property: 'properties', agent: 'agents', blog: 'blog', user: 'users' };
    const base = pathMap[type];
    const path = mode === 'create' ? `/${base}` : `/${base}/${String(data.id)}`;
    await api(path, { method: mode === 'create' ? 'POST' : 'PUT', body: JSON.stringify(formData) });
    showToast(mode === 'create' ? 'დაემატა' : 'განახლდა');
    setModal(null);
    const sMap: Record<string, Section> = { property: 'properties', agent: 'agents', blog: 'blog', user: 'users' };
    if (type) loadSection(sMap[type]);
  }

  async function saveSettings() {
    try {
      await api('/settings', { method: 'PUT', body: JSON.stringify({ settings: settingList }) });
      showToast('პარამეტრები შენახულია');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    }
  }

  const navItems: { id: Section; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { id: 'dashboard', label: 'მთავარი', icon: LayoutDashboard },
    { id: 'properties', label: 'განცხადებები', icon: Building2 },
    { id: 'agents', label: 'აგენტები', icon: Users },
    { id: 'blog', label: 'ბლოგი', icon: BookOpen },
    { id: 'users', label: 'ადმინ მომხ.', icon: Shield },
    { id: 'settings', label: 'პარამეტრები', icon: Settings },
  ];

  const filteredProps = propList
    .filter(p => propFilter === 'all' || p.status === propFilter)
    .filter(p => propTypeFilter === 'all' || p.type === propTypeFilter)
    .filter(p => !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.city?.toLowerCase().includes(search.toLowerCase()) || p.district?.toLowerCase().includes(search.toLowerCase()));

  const filteredAgents = agentList.filter(a =>
    !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.email?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredBlog = blogList.filter(b =>
    !search || b.title?.toLowerCase().includes(search.toLowerCase()) || b.category?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredUsers = userList.filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const premiumCount = propList.filter(p => p.isPremium).length;
  const featuredCount = propList.filter(p => p.isFeatured).length;
  const forSaleCount = propList.filter(p => p.status === 'sale').length;
  const forRentCount = propList.filter(p => p.status === 'rent').length;

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f4f6fa' }}>
      {/* Admin header */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: '#111827',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}
      >
        <div className="container-xl">
          {/* Main bar */}
          <div className="flex items-center justify-between gap-4 py-3.5 min-h-[68px]">
            {/* Brand */}
            <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
              <div className="relative flex-shrink-0">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center"
                  style={{
                    background: '#497cff',
                    boxShadow: '0 4px 14px rgba(73,124,255,0.35)',
                  }}
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
                <p className="text-slate-500 text-[11px] mt-1 font-medium">
                  {navItems.find(n => n.id === section)?.label} · პანელი
                </p>
              </div>
            </div>

            {/* Center nav — desktop */}
            <nav
              className="hidden lg:flex items-center p-1 rounded-2xl flex-shrink-0"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {navItems.map(item => {
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setSection(item.id); setSearch(''); }}
                    className="relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-all duration-200"
                    style={
                      active
                        ? {
                            background: 'rgba(255,255,255,0.12)',
                            color: '#fff',
                          }
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
                    <item.icon size={14} strokeWidth={active ? 2.3 : 2} style={{ opacity: active ? 1 : 0.75 }} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {['properties', 'agents', 'blog', 'users'].includes(section) && (
                <div className="relative hidden xl:block">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(148,163,184,0.7)' }} />
                  <input
                    type="text"
                    placeholder="ძიება..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none w-48 2xl:w-56 transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#f1f5f9',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)',
                    }}
                    onFocus={e => {
                      (e.target as HTMLInputElement).style.borderColor = 'rgba(73,124,255,0.5)';
                      (e.target as HTMLInputElement).style.background = 'rgba(255,255,255,0.09)';
                    }}
                    onBlur={e => {
                      (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)';
                      (e.target as HTMLInputElement).style.background = 'rgba(255,255,255,0.06)';
                    }}
                  />
                </div>
              )}

              <button
                onClick={() => loadSection(section)}
                className="p-2.5 rounded-xl transition-all"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(203,213,225,0.9)',
                }}
                title="განახლება"
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
                  (e.currentTarget as HTMLElement).style.color = '#fff';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                  (e.currentTarget as HTMLElement).style.color = 'rgba(203,213,225,0.9)';
                }}
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>

              <button
                onClick={() => navigate('/admin/listings/new')}
                className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{
                  background: '#10b981',
                  boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = '#059669';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = '#10b981';
                }}
              >
                <Plus size={15} strokeWidth={2.5} />
                <span className="hidden sm:inline">განც. დამატება</span>
              </button>

              {/* User chip */}
              <div
                className="hidden md:flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl ml-1"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
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
                onClick={() => navigate('/')}
                className="p-2.5 rounded-xl transition-all hidden sm:flex"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(203,213,225,0.85)',
                }}
                title="საიტზე გადასვლა"
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(73,124,255,0.15)';
                  (e.currentTarget as HTMLElement).style.color = '#93c5fd';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(73,124,255,0.3)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                  (e.currentTarget as HTMLElement).style.color = 'rgba(203,213,225,0.85)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                }}
              >
                <ExternalLink size={16} />
              </button>

              <button
                onClick={() => { logout(); navigate('/admin/login'); }}
                className="p-2.5 rounded-xl transition-all"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#fca5a5',
                }}
                title="გამოსვლა"
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.18)';
                  (e.currentTarget as HTMLElement).style.color = '#fecaca';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)';
                  (e.currentTarget as HTMLElement).style.color = '#fca5a5';
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>

          {/* Mobile / tablet nav */}
          <nav
            className="lg:hidden flex items-center gap-1.5 pb-3.5 overflow-x-auto"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {navItems.map(item => {
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setSection(item.id); setSearch(''); }}
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

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container-xl py-6">
          {/* Mobile search */}
          {['properties', 'agents', 'blog', 'users'].includes(section) && (
            <div className="relative mb-5 md:hidden">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ძიება..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              />
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center h-40 text-slate-400">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                <p className="text-sm">იტვირთება...</p>
              </div>
            </div>
          )}

          {!loading && <>

          {/* ── DASHBOARD ── */}
          {section === 'dashboard' && (
            <div className="space-y-5">

              {/* ── Hero banner ── */}
              <div className="rounded-2xl p-6 relative overflow-hidden" style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 45%, #1d4ed8 100%)',
              }}>
                <div style={{ position:'absolute', top:-50, right:-50, width:220, height:220, borderRadius:'50%', background:'rgba(99,102,241,0.13)', pointerEvents:'none' }} />
                <div style={{ position:'absolute', bottom:-70, right:120, width:260, height:260, borderRadius:'50%', background:'rgba(16,185,129,0.08)', pointerEvents:'none' }} />
                <div className="relative flex flex-wrap items-center justify-between gap-5">
                  <div>
                    <p style={{ color:'rgba(255,255,255,0.5)', fontSize:12, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:5 }}>
                      <Clock size={10} style={{ display:'inline', marginRight:4, verticalAlign:'middle' }} />
                      {new Date().toLocaleDateString('ka-GE', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
                    </p>
                    <h2 style={{ color:'#fff', fontSize:22, fontWeight:800, lineHeight:1.2, marginBottom:4 }}>
                      გამარჯობა, {user.name.split(' ')[0]} 👋
                    </h2>
                    <p style={{ color:'rgba(255,255,255,0.4)', fontSize:12.5 }}>
                      {user.role === 'super_admin' ? 'სუპერ ადმინი' : 'ადმინი'} · TbilisiRealtors.ge
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-7">
                    {[
                      { label:'განცხ.', value: stats?.properties ?? 0, color:'#a5b4fc' },
                      { label:'ნახვა',  value:(stats?.totalViews ?? 0).toLocaleString(), color:'#6ee7b7' },
                      { label:'აგენტი', value: stats?.agents ?? 0,     color:'#fcd34d' },
                      { label:'ბლოგი',  value: stats?.blogPosts ?? 0,  color:'#f9a8d4' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="text-center">
                        <p style={{ color, fontSize:22, fontWeight:800, lineHeight:1 }}>{value}</p>
                        <p style={{ color:'rgba(255,255,255,0.4)', fontSize:11, fontWeight:600, marginTop:3 }}>{label}</p>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => navigate('/admin/listings/new')}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                    style={{ background:'rgba(255,255,255,0.12)', color:'#fff', border:'1.5px solid rgba(255,255,255,0.18)', backdropFilter:'blur(8px)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.22)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'; }}
                  >
                    <Plus size={15} strokeWidth={2.5} />განცხ. დამატება
                  </button>
                </div>
              </div>

              {/* ── KPI stat cards ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label:'სულ განცხადება', value: stats?.properties ?? 0,                 icon: Building2, color:'#4f46e5', bg:'#eef2ff', trend:'+8%',  spark:[8,10,9,12,14,11,15,13,16,14,18,stats?.properties??0] },
                  { label:'სულ ნახვა',       value:(stats?.totalViews ?? 0).toLocaleString(), icon: Eye,       color:'#059669', bg:'#ecfdf5', trend:'+23%', spark:[400,600,700,900,1100,950,1200,1050,1300,1150,1400,stats?.totalViews??0] },
                  { label:'აქტ. აგენტი',    value: stats?.agents ?? 0,                     icon: UserCheck, color:'#d97706', bg:'#fffbeb', trend:'+3%',  spark:[4,5,5,6,7,6,8,7,9,8,9,stats?.agents??0] },
                  { label:'ბლოგ სტატია',    value: stats?.blogPosts ?? 0,                  icon: BookOpen,  color:'#7c3aed', bg:'#f5f3ff', trend:'+5%',  spark:[2,3,3,4,4,5,5,6,6,7,7,stats?.blogPosts??0] },
                ].map(({ label, value, icon: Icon, color, bg, trend, spark }) => (
                  <div key={label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: bg }}>
                        <Icon size={18} style={{ color }} />
                      </div>
                      <span className="inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background:'#f0fdf4', color:'#16a34a' }}>
                        <ArrowUpRight size={10} />{trend}
                      </span>
                    </div>
                    <p className="text-2xl font-extrabold text-slate-800">{value}</p>
                    <p className="text-xs text-slate-500 mt-0.5 mb-3">{label}</p>
                    <SparkLine data={spark} color={color} />
                  </div>
                ))}
              </div>

              {/* ── Charts row ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Monthly bar chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">ყოველთვიური აქტივობა</p>
                      <p className="text-xs text-slate-400 mt-0.5">2024 — განცხადება vs ნახვა (×100)</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="w-3 h-2.5 rounded-sm inline-block" style={{ background:'#c7d2fe' }} />განცხ.
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="w-3 h-2.5 rounded-sm inline-block" style={{ background:'#bbf7d0' }} />ნახვა
                      </span>
                    </div>
                  </div>
                  <MonthlyBarChart />
                </div>

                {/* Property type donut */}
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                  <p className="font-bold text-slate-800 text-sm mb-5">ქონების ტიპები</p>
                  <PropertyTypeChart properties={propList} />
                </div>
              </div>

              {/* ── Status breakdown row ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label:'იყიდება',        count: forSaleCount,  total: propList.length, color:'#f59e0b', bg:'#fffbeb', icon: TrendingUp },
                  { label:'ქირავდება',       count: forRentCount,  total: propList.length, color:'#10b981', bg:'#ecfdf5', icon: Home       },
                  { label:'VIP / პრემიუმი', count: premiumCount,  total: propList.length, color:'#f59e0b', bg:'#fef9c3', icon: Zap        },
                  { label:'გამორჩეული',      count: featuredCount, total: propList.length, color:'#4f46e5', bg:'#eef2ff', icon: Star       },
                ].map(({ label, count, total, color, bg, icon: Icon }) => {
                  const pct = total ? Math.round(count / total * 100) : 0;
                  return (
                    <div key={label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                          <Icon size={16} style={{ color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-slate-500 truncate">{label}</p>
                          <p className="text-xl font-extrabold text-slate-800 leading-none mt-0.5">{count}</p>
                        </div>
                        <span className="ml-auto text-xs font-bold" style={{ color }}>{pct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="h-1.5 rounded-full transition-all duration-700"
                          style={{ width:`${pct}%`, background: color }} />
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5">სულ {total} განცხ.-დან</p>
                    </div>
                  );
                })}
              </div>

              {/* ── Top-viewed properties ── */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom:'1px solid #f1f5f9' }}>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">ყველაზე ნანახი განცხადებები</p>
                    <p className="text-xs text-slate-400 mt-0.5">ნახვების მიხედვით დალაგებული</p>
                  </div>
                  <button onClick={() => setSection('properties')}
                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    style={{ color:'#4f46e5', background:'#eef2ff' }}>
                    ყველა <ArrowUpRight size={12} />
                  </button>
                </div>
                <div className="divide-y divide-slate-50">
                  {[...(propList.length ? propList : (stats?.recentProperties ?? []))]
                    .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
                    .slice(0, 8)
                    .map((p, idx) => (
                      <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/70 transition-colors group">
                        <span className="text-xs font-bold w-5 text-slate-300 flex-shrink-0">{idx + 1}</span>
                        <ImgThumb src={p.images?.[0]} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-700 truncate">{p.title}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={10} />{p.city}{p.district ? ` · ${p.district}` : ''}
                          </p>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                          <Badge label={TYPE_LABELS[p.type] || p.type} color={TYPE_COLORS[p.type] || '#94a3b8'} />
                          <Badge label={p.status === 'sale' ? 'იყ.' : 'ქირ.'} color={STATUS_COLOR[p.status] || '#94a3b8'} />
                        </div>
                        <div className="text-right flex-shrink-0 min-w-[80px]">
                          <p className="text-sm font-bold text-slate-800">{GEL(p.price)}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1 justify-end mt-0.5">
                            <Eye size={10} />{(p.viewCount ?? 0).toLocaleString()}
                          </p>
                        </div>
                        {p.isPremium && <Zap size={13} className="text-amber-400 flex-shrink-0" />}
                      </div>
                    ))}
                  {propList.length === 0 && !stats?.recentProperties?.length && (
                    <div className="py-10 text-center text-slate-400 text-sm">განცხადება ჯერ არ არის</div>
                  )}
                </div>
              </div>

              {/* ── Quick actions ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label:'+ განცხადება',  color:'#4f46e5', bg:'#eef2ff',  icon: Plus,          action: () => navigate('/admin/listings/new') },
                  { label:'განცხადებები',  color:'#059669', bg:'#ecfdf5',  icon: Building2,     action: () => setSection('properties') },
                  { label:'აგენტები',      color:'#d97706', bg:'#fffbeb',  icon: UserCheck,     action: () => setSection('agents') },
                  { label:'ბლოგი',         color:'#7c3aed', bg:'#f5f3ff',  icon: BookOpen,      action: () => setSection('blog') },
                ].map(({ label, color, bg, icon: Icon, action }) => (
                  <button key={label} onClick={action}
                    className="flex items-center gap-3 p-4 rounded-2xl border transition-all hover:shadow-md text-left"
                    style={{ background: bg, borderColor: `${color}22` }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = color; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${color}22`; }}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white shadow-sm">
                      <Icon size={16} style={{ color }} />
                    </div>
                    <span className="text-sm font-bold" style={{ color }}>{label}</span>
                  </button>
                ))}
              </div>

            </div>
          )}

          {/* ── PROPERTIES ── */}
          {section === 'properties' && (
            <div className="space-y-4">
              {/* Filters + Add button */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Status tabs */}
                <div className="flex items-center bg-white rounded-xl border border-slate-200 overflow-hidden p-1 gap-1">
                  {[['all', 'ყველა'], ['sale', 'იყიდება'], ['rent', 'ქირავდება']] .map(([v, l]) => (
                    <button key={v} onClick={() => setPropFilter(v as typeof propFilter)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${propFilter === v ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                      {l}
                    </button>
                  ))}
                </div>
                {/* Type filter */}
                <div className="flex items-center gap-1.5">
                  <Filter size={13} className="text-slate-400" />
                  <select value={propTypeFilter} onChange={e => setPropTypeFilter(e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="all">ყველა ტიპი</option>
                    <option value="apartment">ბინა</option>
                    <option value="house">სახლი</option>
                    <option value="villa">ვილა</option>
                    <option value="commercial">კომ.</option>
                    <option value="land">მიწა</option>
                  </select>
                </div>
                <span className="text-xs text-slate-400 ml-1">{filteredProps.length} განცხ.</span>
                <div className="flex-1" />
                <button onClick={() => navigate('/admin/listings/new')}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
                  <Plus size={15} />განცხადება
                </button>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60">
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide py-3 pl-5 pr-3">განცხადება</th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide py-3 px-3 hidden md:table-cell">ფასი</th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide py-3 px-3 hidden lg:table-cell">ტიპი</th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide py-3 px-3 hidden lg:table-cell">სტატ.</th>
                        <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide py-3 px-2">
                          <span className="flex items-center justify-center gap-1"><Zap size={11} />VIP</span>
                        </th>
                        <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide py-3 px-2">
                          <span className="flex items-center justify-center gap-1"><Star size={11} />გამ.</span>
                        </th>
                        <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide py-3 px-2">
                          <span className="flex items-center justify-center gap-1"><Sparkles size={11} />ახ.</span>
                        </th>
                        <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide py-3 px-2 hidden sm:table-cell">
                          <span className="flex items-center justify-end gap-1"><Eye size={11} /></span>
                        </th>
                        <th className="py-3 pr-5 pl-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredProps.length === 0 ? (
                        <tr><td colSpan={9} className="py-14 text-center text-slate-400 text-sm">
                          {search || propFilter !== 'all' ? 'ძიების შედეგი ვერ მოიძებნა' : 'განცხადება ჯერ არ არის'}
                        </td></tr>
                      ) : filteredProps.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors group">
                          <td className="py-3 pl-5 pr-3">
                            <div className="flex items-center gap-2.5">
                              <ImgThumb src={p.images?.[0]} />
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-700 text-sm truncate max-w-[160px] lg:max-w-[220px]">{p.title}</p>
                                <p className="text-xs text-slate-400 truncate">{p.city}{p.district ? ` · ${p.district}` : ''}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 hidden md:table-cell">
                            <p className="font-bold text-slate-800 text-sm whitespace-nowrap">{GEL(p.price)}</p>
                            {p.area && <p className="text-xs text-slate-400">{Number(p.area).toFixed(0)} მ²</p>}
                          </td>
                          <td className="py-3 px-3 hidden lg:table-cell">
                            <Badge label={TYPE_LABELS[p.type] || p.type} color={TYPE_COLORS[p.type] || '#94a3b8'} />
                          </td>
                          <td className="py-3 px-3 hidden lg:table-cell">
                            <Badge label={STATUS_LABEL[p.status] || p.status} color={STATUS_COLOR[p.status] || '#94a3b8'} />
                          </td>
                          <td className="py-3 px-2 text-center">
                            <Toggle on={p.isPremium} onToggle={() => patchProp(p.id, 'isPremium', !p.isPremium)} label="VIP/პრემიუმი" color="#f59e0b" />
                          </td>
                          <td className="py-3 px-2 text-center">
                            <Toggle on={p.isFeatured} onToggle={() => patchProp(p.id, 'isFeatured', !p.isFeatured)} label="გამორჩეული" color="#497cff" />
                          </td>
                          <td className="py-3 px-2 text-center">
                            <Toggle on={p.isNew} onToggle={() => patchProp(p.id, 'isNew', !p.isNew)} label="ახალი" color="#10B981" />
                          </td>
                          <td className="py-3 px-2 text-right text-xs text-slate-400 hidden sm:table-cell whitespace-nowrap">
                            <Eye size={10} className="inline mr-1" />{(p.viewCount ?? 0).toLocaleString()}
                          </td>
                          <td className="py-3 pr-5 pl-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => navigate(`/admin/listings/${p.id}/edit`)}
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => setConfirmDelete({ type: 'properties', id: p.id })}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── AGENTS ── */}
          {section === 'agents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">სულ: <b className="text-slate-700">{filteredAgents.length}</b></p>
                <button onClick={() => setModal({ type: 'agent', mode: 'create', data: {} })}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors">
                  <Plus size={15} />აგენტი
                </button>
              </div>
              <div className="grid gap-3">
                {filteredAgents.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 text-center text-slate-400 text-sm border border-slate-100">
                    {search ? 'ვერ მოიძებნა' : 'აგენტი ჯერ არ არის'}
                  </div>
                ) : filteredAgents.map(a => (
                  <div key={a.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4 group">
                    {a.photo ? (
                      <img src={a.photo} alt={a.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0 bg-slate-100" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold flex-shrink-0">{a.name.charAt(0)}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-800 text-sm">{a.name}</p>
                        {a.verified && <Badge label="✓ ვერ." color="#10B981" />}
                        {!a.isActive && <Badge label="დაბლ." color="#ef4444" />}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                        {a.email && <span className="flex items-center gap-1"><Mail size={10} />{a.email}</span>}
                        {a.phone && <span className="flex items-center gap-1"><Phone size={10} />{a.phone}</span>}
                        <span className="flex items-center gap-1"><Building2 size={10} />{a.propertyCount} განცხ.</span>
                        <span>★ {a.rating}</span>
                        {a.yearsExperience > 0 && <span>{a.yearsExperience} წელი</span>}
                      </div>
                      {a.specialization?.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {a.specialization.map(s => <span key={s} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{s}</span>)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => setModal({ type: 'agent', mode: 'edit', data: a as unknown as Record<string, unknown> })}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"><Pencil size={13} /></button>
                      <button onClick={() => setConfirmDelete({ type: 'agents', id: a.id })}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── BLOG ── */}
          {section === 'blog' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">სულ: <b className="text-slate-700">{filteredBlog.length}</b></p>
                <button onClick={() => setModal({ type: 'blog', mode: 'create', data: {} })}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors">
                  <Plus size={15} />სტატია
                </button>
              </div>
              <div className="grid gap-3">
                {filteredBlog.length === 0 ? (
                  <div className="bg-white rounded-2xl p-10 text-center text-slate-400 text-sm border border-slate-100">
                    {search ? 'ვერ მოიძებნა' : 'ბლოგ პოსტი ჯერ არ არის'}
                  </div>
                ) : filteredBlog.map(b => (
                  <div key={b.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-start gap-4 group">
                    {b.image ? (
                      <img src={b.image} alt="" className="w-16 h-14 rounded-xl object-cover flex-shrink-0 bg-slate-100" />
                    ) : (
                      <div className="w-16 h-14 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <BookOpen size={18} className="text-slate-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm leading-snug">{b.title}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge label={b.category || 'კატ.'} color="#8b5cf6" />
                        {b.isFeatured && <Badge label="გამ." color="#497cff" />}
                        <Badge label={b.isPublished ? 'გამოქვ.' : 'პროექტი'} color={b.isPublished ? '#10B981' : '#94a3b8'} />
                        <span className="text-xs text-slate-400">{b.readTime} წთ</span>
                        <span className="text-xs text-slate-400">{b.authorName}</span>
                      </div>
                      {b.excerpt && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{b.excerpt}</p>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => setModal({ type: 'blog', mode: 'edit', data: b as unknown as Record<string, unknown> })}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"><Pencil size={13} /></button>
                      <button onClick={() => setConfirmDelete({ type: 'blog', id: b.id })}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ADMIN USERS ── */}
          {section === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">სულ: <b className="text-slate-700">{filteredUsers.length}</b></p>
                <button onClick={() => setModal({ type: 'user', mode: 'create', data: {} })}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors">
                  <Plus size={15} />ადმინი
                </button>
              </div>
              <div className="grid gap-3">
                {filteredUsers.map(u => (
                  <div key={u.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4 group">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${u.role === 'super_admin' ? 'bg-gradient-to-br from-violet-500 to-violet-700' : 'bg-gradient-to-br from-blue-500 to-blue-700'}`}>
                      {u.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm">{u.name}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge label={u.role === 'super_admin' ? 'სუპ. ადმ.' : 'ადმინი'} color={u.role === 'super_admin' ? '#8b5cf6' : '#497cff'} />
                      <Badge label={u.isActive ? 'აქტ.' : 'დაბლ.'} color={u.isActive ? '#10B981' : '#ef4444'} />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => setModal({ type: 'user', mode: 'edit', data: u as unknown as Record<string, unknown> })}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"><Pencil size={13} /></button>
                      {u.id !== user.id && (
                        <button onClick={() => setConfirmDelete({ type: 'users', id: u.id })}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={13} /></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {section === 'settings' && (
            <div className="max-w-xl space-y-4">
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Globe size={16} className="text-blue-600" />
                  <h3 className="font-bold text-slate-800 text-sm">საიტის პარამეტრები</h3>
                </div>
                {settingList.map((s, i) => (
                  <Field key={s.key} label={s.label || s.key}>
                    <input type="text" value={s.value || ''} onChange={e => {
                      const u = [...settingList]; u[i] = { ...u[i], value: e.target.value }; setSettingList(u);
                    }} className={inputCls} />
                  </Field>
                ))}
                {settingList.length === 0 && <p className="text-slate-400 text-sm text-center py-4">იტვირთება...</p>}
                {settingList.length > 0 && (
                  <button onClick={saveSettings}
                    className="mt-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors">
                    შენახვა
                  </button>
                )}
              </div>
            </div>
          )}

          </>}
        </div>
      </main>

      {/* ── MODALS ── */}
      {modal?.type === 'agent' && (
        <AgentModal mode={modal.mode} data={modal.data} onClose={() => setModal(null)} onSave={saveModal} />
      )}
      {modal?.type === 'blog' && (
        <BlogModal mode={modal.mode} data={modal.data} onClose={() => setModal(null)} onSave={saveModal} />
      )}
      {modal?.type === 'user' && (
        <UserModal mode={modal.mode} data={modal.data} onClose={() => setModal(null)} onSave={saveModal} />
      )}

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800 text-center mb-1">წაშლა?</h3>
            <p className="text-sm text-slate-500 text-center mb-5">ეს მოქმედება შეუქცევადია. დარწმუნებული ხართ?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors">
                გაუქმება
              </button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors">
                წაშლა
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── AGENT MODAL ─────────────────────────────────────────────────────────────

function AgentModal({ mode, data, onClose, onSave }: { mode: 'create' | 'edit'; data: Record<string, unknown>; onClose: () => void; onSave: (d: Record<string, unknown>) => Promise<void> }) {
  const [form, setForm] = useState({
    name: String(data.name || ''),
    email: String(data.email || ''),
    phone: String(data.phone || ''),
    photo: String(data.photo || ''),
    bio: String(data.bio || ''),
    company: String(data.company || 'TbilisiRealtors.ge'),
    yearsExperience: String(data.yearsExperience || ''),
    specialization: Array.isArray(data.specialization) ? (data.specialization as string[]).join(', ') : String(data.specialization || ''),
    languages: Array.isArray(data.languages) ? (data.languages as string[]).join(', ') : String(data.languages || ''),
    verified: Boolean(data.verified),
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.name) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        yearsExperience: parseInt(form.yearsExperience) || 0,
        specialization: form.specialization.split(',').map(s => s.trim()).filter(Boolean),
        languages: form.languages.split(',').map(s => s.trim()).filter(Boolean),
      });
    } finally { setSaving(false); }
  }

  return (
    <Modal title={mode === 'create' ? 'აგენტის დამატება' : 'აგენტის რედაქტირება'} onClose={onClose}>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="სახელი, გვარი *">
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Field label="Email">
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} />
        </Field>
        <Field label="ტელეფონი">
          <input type="text" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} />
        </Field>
        <div className="col-span-2">
          <Field label="ფოტოს URL">
            <div className="flex gap-3">
              <input type="url" value={form.photo} onChange={e => set('photo', e.target.value)} className={`${inputCls} flex-1`} placeholder="https://..." />
              {form.photo && <img src={form.photo} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />}
            </div>
          </Field>
        </div>
        <Field label="კომპანია">
          <input type="text" value={form.company} onChange={e => set('company', e.target.value)} className={inputCls} />
        </Field>
        <Field label="გამოცდ. (წ.)">
          <input type="number" value={form.yearsExperience} onChange={e => set('yearsExperience', e.target.value)} className={inputCls} />
        </Field>
        <Field label="სპეც. (მძ.-ით)" hint="მაგ: საცხოვრებელი, კომ.">
          <input type="text" value={form.specialization} onChange={e => set('specialization', e.target.value)} className={inputCls} />
        </Field>
        <Field label="ენები (მძ.-ით)" hint="მაგ: ქართული, ინგლისური">
          <input type="text" value={form.languages} onChange={e => set('languages', e.target.value)} className={inputCls} />
        </Field>
        <div className="col-span-2">
          <Field label="ბიოგრაფია">
            <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={3} className={`${inputCls} resize-none`} />
          </Field>
        </div>
        <div className="col-span-2 flex gap-6">
          {[{ k: 'verified', l: 'დადასტ.' }, { k: 'isActive', l: 'აქტიური' }].map(opt => (
            <label key={opt.k} className="flex items-center gap-2 cursor-pointer">
              <Toggle on={Boolean(form[opt.k as keyof typeof form])} onToggle={() => set(opt.k, !form[opt.k as keyof typeof form])} label={opt.l} />
              <span className="text-sm font-medium text-slate-700">{opt.l}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
        <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50">გაუქმება</button>
        <button onClick={handleSave} disabled={saving || !form.name} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60">
          {saving ? 'მიმდინ...' : mode === 'create' ? 'დამატება' : 'შენახვა'}
        </button>
      </div>
    </Modal>
  );
}

// ─── BLOG MODAL ──────────────────────────────────────────────────────────────

function BlogModal({ mode, data, onClose, onSave }: { mode: 'create' | 'edit'; data: Record<string, unknown>; onClose: () => void; onSave: (d: Record<string, unknown>) => Promise<void> }) {
  const [form, setForm] = useState({
    title: String(data.title || ''),
    excerpt: String(data.excerpt || ''),
    content: String(data.content || ''),
    category: String(data.category || ''),
    image: String(data.image || ''),
    readTime: String(data.readTime || '5'),
    tags: Array.isArray(data.tags) ? (data.tags as string[]).join(', ') : String(data.tags || ''),
    isFeatured: Boolean(data.isFeatured),
    isPublished: data.isPublished !== undefined ? Boolean(data.isPublished) : true,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.title) return;
    setSaving(true);
    try {
      await onSave({ ...form, readTime: parseInt(form.readTime) || 5, tags: form.tags.split(',').map(s => s.trim()).filter(Boolean) });
    } finally { setSaving(false); }
  }

  return (
    <Modal title={mode === 'create' ? 'სტატიის დამატება' : 'სტატიის რედაქტირება'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="სათაური *">
          <input type="text" value={form.title} onChange={e => set('title', e.target.value)} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="კატეგორია">
            <input type="text" value={form.category} onChange={e => set('category', e.target.value)} className={inputCls} />
          </Field>
          <Field label="კ. დრო (წთ)">
            <input type="number" value={form.readTime} onChange={e => set('readTime', e.target.value)} className={inputCls} />
          </Field>
        </div>
        <Field label="სურათი URL">
          <div className="flex gap-3">
            <input type="url" value={form.image} onChange={e => set('image', e.target.value)} className={`${inputCls} flex-1`} placeholder="https://..." />
            {form.image && <img src={form.image} alt="" className="w-16 h-14 rounded-xl object-cover flex-shrink-0" />}
          </div>
        </Field>
        <Field label="თეგები (მძ.-ით)">
          <input type="text" value={form.tags} onChange={e => set('tags', e.target.value)} className={inputCls} placeholder="ინვ., ბაზარი" />
        </Field>
        <Field label="მოკლე აღწ.">
          <textarea value={form.excerpt} onChange={e => set('excerpt', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
        </Field>
        <Field label="ტექსტი">
          <textarea value={form.content} onChange={e => set('content', e.target.value)} rows={5} className={`${inputCls} resize-none`} />
        </Field>
        <div className="flex gap-6">
          {[{ k: 'isFeatured', l: 'გამ.' }, { k: 'isPublished', l: 'გამოქვ.' }].map(opt => (
            <label key={opt.k} className="flex items-center gap-2 cursor-pointer">
              <Toggle on={Boolean(form[opt.k as keyof typeof form])} onToggle={() => set(opt.k, !form[opt.k as keyof typeof form])} label={opt.l} />
              <span className="text-sm font-medium text-slate-700">{opt.l}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
        <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50">გაუქმება</button>
        <button onClick={handleSave} disabled={saving || !form.title} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60">
          {saving ? 'მიმდინ...' : mode === 'create' ? 'დამატება' : 'შენახვა'}
        </button>
      </div>
    </Modal>
  );
}

// ─── USER MODAL ──────────────────────────────────────────────────────────────

function UserModal({ mode, data, onClose, onSave }: { mode: 'create' | 'edit'; data: Record<string, unknown>; onClose: () => void; onSave: (d: Record<string, unknown>) => Promise<void> }) {
  const [form, setForm] = useState({
    email: String(data.email || ''),
    name: String(data.name || ''),
    password: '',
    role: String(data.role || 'admin'),
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.name || (mode === 'create' && !form.password)) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }

  return (
    <Modal title={mode === 'create' ? 'ადმინის დამატება' : 'ადმინის რედ.'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="სახელი *">
          <input type="text" value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} />
        </Field>
        {mode === 'create' && (
          <Field label="Email *">
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} />
          </Field>
        )}
        <Field label={mode === 'create' ? 'პაროლი *' : 'ახალი პაროლი (სურ.)'}
          hint={mode === 'edit' ? 'დატოვეთ ცარიელი, თუ არ ცვლით' : undefined}>
          <input type="password" value={form.password} onChange={e => set('password', e.target.value)} className={inputCls} />
        </Field>
        <Field label="როლი">
          <select value={form.role} onChange={e => set('role', e.target.value)} className={selectCls}>
            <option value="admin">ადმინი</option>
            <option value="super_admin">სუპ. ადმინი</option>
          </select>
        </Field>
        <label className="flex items-center gap-2 cursor-pointer">
          <Toggle on={form.isActive} onToggle={() => set('isActive', !form.isActive)} label="აქტ." />
          <span className="text-sm font-medium text-slate-700">აქტიური</span>
        </label>
      </div>
      <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
        <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50">გაუქმება</button>
        <button onClick={handleSave} disabled={saving || !form.name || (mode === 'create' && !form.password)}
          className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60">
          {saving ? 'მიმდინ...' : mode === 'create' ? 'დამატება' : 'შენახვა'}
        </button>
      </div>
    </Modal>
  );
}
