import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, Settings, LogOut, Plus,
  Pencil, Trash2, X, ChevronRight, Eye, TrendingUp, UserCheck,
  BookOpen, Search, CheckCircle, XCircle, Shield, Home, Menu,
  Star, Zap, Sparkles, Filter, Image as ImageIcon,
  Phone, Mail, Globe, RefreshCw,
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

function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: number | string; icon: React.ComponentType<{ size?: number; color?: string }>; color: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={20} color={color} />
        </div>
      </div>
      <p className="text-2xl font-extrabold text-slate-800">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
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

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, logout, loading: authLoading } = useAdminAuth();
  const api = useApiRequest();

  const [section, setSection] = useState<Section>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const [modal, setModal] = useState<{ type: 'property' | 'agent' | 'blog' | 'user'; mode: 'create' | 'edit'; data: Record<string, unknown> } | null>(null);
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
        const data = await api('/stats');
        setStats(data);
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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:relative inset-y-0 left-0 z-30 flex flex-col w-60 bg-slate-900 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Building2 size={16} color="white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">TbilisiRealtors</p>
            <p className="text-slate-500 text-xs">ადმინ პანელი</p>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const active = section === item.id;
            return (
              <button key={item.id} onClick={() => { setSection(item.id); setSearch(''); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <item.icon size={16} />
                {item.label}
                {active && <ChevronRight size={12} className="ml-auto" />}
              </button>
            );
          })}
        </nav>

        <div className="px-2 pb-3 pt-2 border-t border-slate-800 space-y-0.5">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-800 mb-1">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{user.name.charAt(0)}</div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user.name}</p>
              <p className="text-slate-500 text-xs truncate">{user.role === 'super_admin' ? 'სუპ. ადმინი' : 'ადმინი'}</p>
            </div>
          </div>
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white text-sm transition-all">
            <Home size={15} />საიტი
          </button>
          <button onClick={() => { logout(); navigate('/admin/login'); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-red-400 text-sm transition-all">
            <LogOut size={15} />გამოსვლა
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-slate-100 px-5 py-3.5 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-500"><Menu size={18} /></button>
          <h1 className="font-extrabold text-slate-800 text-base">{navItems.find(n => n.id === section)?.label}</h1>
          <div className="flex-1" />
          {['properties', 'agents', 'blog', 'users'].includes(section) && (
            <div className="relative hidden sm:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="ძიება..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-4 py-2 rounded-xl border border-slate-200 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48" />
            </div>
          )}
          <button onClick={() => loadSection(section)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors" title="განახლება">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-5">

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
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="სულ განცხადება" value={stats?.properties ?? 0} icon={Building2} color="#497cff" sub={`${premiumCount} VIP · ${featuredCount} გამ.`} />
                <StatCard label="სულ ნახვა" value={stats?.totalViews ?? 0} icon={Eye} color="#10B981" />
                <StatCard label="აგენტები" value={stats?.agents ?? 0} icon={UserCheck} color="#f59e0b" />
                <StatCard label="ბლოგ სტატია" value={stats?.blogPosts ?? 0} icon={TrendingUp} color="#8b5cf6" />
              </div>

              {/* Sale vs Rent breakdown */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-3">სტატუსი</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">იყიდება</span>
                      <span className="font-bold text-amber-600">{forSaleCount}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="bg-amber-400 h-1.5 rounded-full transition-all" style={{ width: propList.length ? `${(forSaleCount / propList.length) * 100}%` : '0%' }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">ქირავდება</span>
                      <span className="font-bold text-green-600">{forRentCount}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="bg-green-400 h-1.5 rounded-full transition-all" style={{ width: propList.length ? `${(forRentCount / propList.length) * 100}%` : '0%' }} />
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-3">VIP სტატუსი</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 flex items-center gap-1"><Zap size={12} className="text-amber-500" />VIP / პრემიუმი</span>
                      <span className="font-bold text-amber-600">{premiumCount}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="bg-amber-400 h-1.5 rounded-full transition-all" style={{ width: propList.length ? `${(premiumCount / propList.length) * 100}%` : '0%' }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 flex items-center gap-1"><Star size={12} className="text-blue-500" />გამორჩეული</span>
                      <span className="font-bold text-blue-600">{featuredCount}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="bg-blue-400 h-1.5 rounded-full transition-all" style={{ width: propList.length ? `${(featuredCount / propList.length) * 100}%` : '0%' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Top by views */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-bold text-slate-800 text-sm">ყველაზე ნანახი განცხადებები</p>
                  <button onClick={() => setSection('properties')} className="text-xs text-blue-600 font-semibold hover:underline">ყველა →</button>
                </div>
                <div className="space-y-2">
                  {[...propList].sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0)).slice(0, 8).map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
                      <ImgThumb src={p.images?.[0]} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">{p.title}</p>
                        <p className="text-xs text-slate-400">{p.city} · {TYPE_LABELS[p.type] || p.type}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-slate-600">{GEL(p.price)}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 justify-end"><Eye size={10} />{(p.viewCount ?? 0).toLocaleString()}</p>
                      </div>
                      {p.isPremium && <Zap size={14} className="text-amber-500 flex-shrink-0" />}
                    </div>
                  ))}
                  {propList.length === 0 && <p className="text-slate-400 text-sm text-center py-6">განცხადება ჯერ არ არის</p>}
                </div>
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
                <button onClick={() => setModal({ type: 'property', mode: 'create', data: {} })}
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
                              <button onClick={() => setModal({ type: 'property', mode: 'edit', data: p as unknown as Record<string, unknown> })}
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
        </main>
      </div>

      {/* ── MODALS ── */}
      {modal?.type === 'property' && (
        <PropertyModal mode={modal.mode} data={modal.data} onClose={() => setModal(null)} onSave={saveModal} />
      )}
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

// ─── PROPERTY MODAL ──────────────────────────────────────────────────────────

function PropertyModal({ mode, data, onClose, onSave }: { mode: 'create' | 'edit'; data: Record<string, unknown>; onClose: () => void; onSave: (d: Record<string, unknown>) => Promise<void> }) {
  const imgArr = Array.isArray(data.images) ? (data.images as string[]) : [];
  const [form, setForm] = useState({
    title: String(data.title || ''),
    description: String(data.description || ''),
    price: String(data.price || ''),
    pricePerSqm: String(data.pricePerSqm || ''),
    area: String(data.area || ''),
    city: String(data.city || 'თბილისი'),
    district: String(data.district || ''),
    address: String(data.address || ''),
    type: String(data.type || 'apartment'),
    status: String(data.status || 'sale'),
    bedrooms: String(data.bedrooms || ''),
    bathrooms: String(data.bathrooms || ''),
    floor: String(data.floor || ''),
    totalFloors: String(data.totalFloors || ''),
    yearBuilt: String(data.yearBuilt || ''),
    agentName: String(data.agentName || ''),
    agentPhone: String(data.agentPhone || ''),
    agentEmail: String(data.agentEmail || ''),
    isFeatured: Boolean(data.isFeatured),
    isNew: data.isNew !== undefined ? Boolean(data.isNew) : true,
    isPremium: Boolean(data.isPremium),
    images: imgArr.join('\n'),
    amenities: Array.isArray(data.amenities) ? (data.amenities as string[]).join(', ') : String(data.amenities || ''),
    features: Array.isArray(data.features) ? (data.features as string[]).join(', ') : String(data.features || ''),
  });
  const [saving, setSaving] = useState(false);

  const firstImg = form.images.split('\n').find(l => l.trim().startsWith('http'));

  async function handleSave() {
    if (!form.title || !form.price) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        price: parseFloat(form.price) || 0,
        pricePerSqm: parseFloat(form.pricePerSqm) || null,
        area: parseFloat(form.area) || null,
        bedrooms: parseInt(form.bedrooms) || 0,
        bathrooms: parseInt(form.bathrooms) || 0,
        floor: parseInt(form.floor) || null,
        totalFloors: parseInt(form.totalFloors) || null,
        yearBuilt: parseInt(form.yearBuilt) || null,
        images: form.images.split('\n').map(s => s.trim()).filter(Boolean),
        amenities: form.amenities.split(',').map(s => s.trim()).filter(Boolean),
        features: form.features.split(',').map(s => s.trim()).filter(Boolean),
      });
    } finally { setSaving(false); }
  }

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal title={mode === 'create' ? 'განცხადების დამატება' : 'განცხადების რედაქტირება'} onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="სათაური *">
            <input type="text" value={form.title} onChange={e => set('title', e.target.value)} className={inputCls} placeholder="მაგ: 3-ოთახიანი ბინა ვაკეში" />
          </Field>
        </div>

        <Field label="ფასი (₾) *">
          <input type="number" value={form.price} onChange={e => set('price', e.target.value)} className={inputCls} />
        </Field>
        <Field label="ფასი/მ² (₾)">
          <input type="number" value={form.pricePerSqm} onChange={e => set('pricePerSqm', e.target.value)} className={inputCls} />
        </Field>

        <Field label="ტიპი">
          <select value={form.type} onChange={e => set('type', e.target.value)} className={selectCls}>
            <option value="apartment">ბინა</option>
            <option value="house">სახლი</option>
            <option value="villa">ვილა</option>
            <option value="commercial">კომერციული</option>
            <option value="land">მიწა</option>
          </select>
        </Field>
        <Field label="სტატუსი">
          <select value={form.status} onChange={e => set('status', e.target.value)} className={selectCls}>
            <option value="sale">იყიდება</option>
            <option value="rent">ქირავდება</option>
          </select>
        </Field>

        <Field label="ფართი (მ²)">
          <input type="number" value={form.area} onChange={e => set('area', e.target.value)} className={inputCls} />
        </Field>
        <Field label="საძინებელი">
          <input type="number" value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} className={inputCls} />
        </Field>
        <Field label="სააბაზანო">
          <input type="number" value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} className={inputCls} />
        </Field>
        <Field label="სართული">
          <input type="number" value={form.floor} onChange={e => set('floor', e.target.value)} className={inputCls} />
        </Field>
        <Field label="სართ. ჯამი">
          <input type="number" value={form.totalFloors} onChange={e => set('totalFloors', e.target.value)} className={inputCls} />
        </Field>
        <Field label="აშ. წელი">
          <input type="number" value={form.yearBuilt} onChange={e => set('yearBuilt', e.target.value)} className={inputCls} placeholder="2024" />
        </Field>

        <Field label="ქალაქი">
          <input type="text" value={form.city} onChange={e => set('city', e.target.value)} className={inputCls} />
        </Field>
        <Field label="რაიონი">
          <input type="text" value={form.district} onChange={e => set('district', e.target.value)} className={inputCls} />
        </Field>
        <div className="col-span-2">
          <Field label="მისამართი">
            <input type="text" value={form.address} onChange={e => set('address', e.target.value)} className={inputCls} />
          </Field>
        </div>

        {/* Images */}
        <div className="col-span-2">
          <Field label="სურათების URL (თითო ხაზზე)" hint="ჩაწერეთ სურათების URL-ები, თითოეული ახალ ხაზზე">
            <div className="flex gap-3">
              <textarea value={form.images} onChange={e => set('images', e.target.value)} rows={4}
                className={`${inputCls} resize-none flex-1`} placeholder="https://images.unsplash.com/..." />
              {firstImg && (
                <img src={firstImg} alt="" className="w-24 h-24 rounded-xl object-cover flex-shrink-0 bg-slate-100" />
              )}
            </div>
          </Field>
        </div>

        <Field label="კომფ. სია (მძ.-ით)" hint="მაგ: ლიფტი, პარკინგი, ბასეინი">
          <input type="text" value={form.amenities} onChange={e => set('amenities', e.target.value)} className={inputCls} />
        </Field>
        <Field label="მახასიათებლები (მძ.-ით)" hint="მაგ: სმარტ-ჰოუს, პანორამა">
          <input type="text" value={form.features} onChange={e => set('features', e.target.value)} className={inputCls} />
        </Field>

        {/* Agent */}
        <Field label="აგენტის სახელი">
          <input type="text" value={form.agentName} onChange={e => set('agentName', e.target.value)} className={inputCls} />
        </Field>
        <Field label="აგენტის ტელ.">
          <input type="text" value={form.agentPhone} onChange={e => set('agentPhone', e.target.value)} className={inputCls} />
        </Field>
        <div className="col-span-2">
          <Field label="აგენტის Email">
            <input type="email" value={form.agentEmail} onChange={e => set('agentEmail', e.target.value)} className={inputCls} />
          </Field>
        </div>

        <div className="col-span-2">
          <Field label="აღწერა">
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className={`${inputCls} resize-none`} />
          </Field>
        </div>

        {/* Flags */}
        <div className="col-span-2 flex items-center gap-6 pt-2 pb-1">
          {[
            { k: 'isPremium', l: 'VIP / პრემიუმი', c: '#f59e0b' },
            { k: 'isFeatured', l: 'გამორჩეული', c: '#497cff' },
            { k: 'isNew', l: 'ახალი', c: '#10B981' },
          ].map(opt => (
            <label key={opt.k} className="flex items-center gap-2.5 cursor-pointer group">
              <Toggle on={Boolean(form[opt.k as keyof typeof form])} onToggle={() => set(opt.k, !form[opt.k as keyof typeof form])} label={opt.l} color={opt.c} />
              <span className="text-sm font-medium text-slate-700">{opt.l}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
        <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors">გაუქმება</button>
        <button onClick={handleSave} disabled={saving || !form.title || !form.price}
          className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-60">
          {saving ? 'მიმდინარეობს...' : mode === 'create' ? 'დამატება' : 'შენახვა'}
        </button>
      </div>
    </Modal>
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
