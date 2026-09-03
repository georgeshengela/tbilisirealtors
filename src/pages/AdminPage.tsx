import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, Settings, LogOut, Plus,
  Pencil, Trash2, X, Eye, TrendingUp, UserCheck,
  BookOpen, Search, CheckCircle, XCircle, Shield, Home,
  Star, Zap, Sparkles, Image as ImageIcon,
  Phone, Globe, RefreshCw, ArrowUpRight, MapPin, Clock,
  ExternalLink, Headphones, UserCog, Ban, Lock, BarChart3, LineChart, type LucideIcon,
} from 'lucide-react';
import { useAdminAuth, useApiRequest } from '../contexts/AdminAuthContext';
import AdminPropertiesSection, {
  type AdminPropertyRow, type ListingsSummary, type ListingStaffOption, type PropertyPatch,
} from '../components/admin/AdminPropertiesSection';
import AdminBrokersSection, { type BrokerRow } from '../components/admin/AdminBrokersSection';
import AdminDeskSection, { type DeskTab } from '../components/admin/desk/AdminDeskSection';
import AdminAnalyticsSection, {
  type AnalyticsTab,
} from '../components/admin/analytics/AdminAnalyticsSection';
import AdminPricesSection from '../components/admin/prices/AdminPricesSection';
import StaffPermissionEditor from '../components/admin/StaffPermissionEditor';
import BrandLogo from '../components/BrandLogo';
import AdminFooter from '../components/admin/AdminFooter';
import { formatGeorgianLongDate, formatGeorgianShortDate } from '../lib/dateFormat';
import { propertyHref } from '../lib/seoPropertyUrl';
import {
  ROLE_DESCRIPTION, STAFF_ROLES,
  canManageRole, meetsAdminFloor, roleColor, roleLabel, type Role,
} from '../lib/permissions';

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface Stats {
  properties: number; agents: number; blogPosts: number;
  adminUsers: number; totalViews: number;
  members?: number; pendingModeration?: number;
  scope?: 'own' | 'all';
  recentProperties: PropertyRow[];
  needsCall?: number; freeingSoon?: number;
  lifecycle?: Record<string, number>;
  monthly?: { months: string[]; listings: number[]; views: number[] };
}

interface PropertyRow extends AdminPropertyRow {
  amenities: string[]; features: string[];
  agentId: string;
  description: string;
}

interface BrokerAdminRow extends BrokerRow {}

interface BlogRow {
  id: string; title: string; excerpt: string; category: string;
  authorName: string; isPublished: boolean; isFeatured: boolean;
  readTime: number; publishDate: string; image: string; tags: string[];
}

interface AdminUserRow {
  id: number;
  email: string;
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  jobTitle?: string | null;
  bio?: string | null;
  showOnFrontend?: boolean;
  role: string;
  scope?: 'own' | 'all';
  permissions?: Record<string, boolean>;
  effectivePermissions?: string[];
  isActive: boolean;
  blockedReason?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
}

interface MemberRow {
  id: number;
  email: string;
  name: string;
  phone?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
  blockedReason?: string | null;
  listingCount: number;
  lastLoginAt?: string | null;
  createdAt: string;
}

interface Setting { key: string; value: string; label: string; }

type Section =
  | 'dashboard' | 'properties' | 'desk' | 'analytics' | 'prices' | 'agents'
  | 'blog' | 'staff' | 'members' | 'settings';

const SECTIONS: Section[] = [
  'dashboard', 'properties', 'desk', 'analytics', 'prices', 'agents', 'blog', 'staff', 'members', 'settings',
];

/** A section unlocks as soon as the actor holds any one of these permissions. */
const SECTION_PERMISSIONS: Record<Section, string[]> = {
  dashboard: ['dashboard.view'],
  properties: ['listings.view'],
  desk: ['listings.tasks', 'listings.moderate', 'listings.assign', 'analytics.full', 'leads.view'],
  analytics: ['analytics.full', 'analytics.imports'],
  prices: ['analytics.full'],
  agents: ['agents.view'],
  blog: ['blog.view'],
  staff: ['staff.view'],
  members: ['members.view'],
  settings: ['settings.view'],
};

// ─── HELPERS ────────────────────────────────────────────────────────────────

const GEL = (n: number | string) =>
  Number(n).toLocaleString('ka-GE') + ' ₾';

const TYPE_LABELS: Record<string, string> = {
  apartment: 'ბინა', house: 'სახლი', commercial: 'კომ.', land: 'მიწა', villa: 'ვილა',
};
const TYPE_COLORS: Record<string, string> = {
  apartment: '#2563eb', house: '#10B981', commercial: '#f59e0b', land: '#2563eb', villa: '#ec4899',
};
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

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm placeholder-slate-400 focus:outline-none transition-all';
const selectCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm focus:outline-none transition-all bg-white';

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

const MONTHS_GEO = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ'];

function monthLabel(ym: string): string {
  const [, m] = ym.split('-');
  const idx = Math.max(0, Math.min(11, Number(m) - 1));
  return MONTHS_GEO[idx] ?? ym;
}

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

function MonthlyBarChart({ listings, views, months }: { listings: number[]; views: number[]; months: string[] }) {
  const list = listings ?? [];
  const view = views ?? [];
  const labels = months ?? [];
  if (labels.length === 0) {
    return <div className="py-12 text-center text-sm text-slate-400">ჯერ არ არის საკმარისი მონაცემი</div>;
  }
  const maxV = Math.max(...list, ...view, 1);
  const H = 100, padT = 8, padB = 22, padL = 28, totalW = 620;
  const n = Math.max(labels.length, 1);
  const slotW = (totalW - padL) / n;
  const bw = 11;
  const curKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
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
      {labels.map((ym, i) => {
        const cx = padL + i * slotW + slotW / 2;
        const lh = ((list[i] ?? 0) / maxV) * H;
        const vh = ((view[i] ?? 0) / maxV) * H;
        const active = ym === curKey;
        return (
          <g key={ym}>
            <rect x={cx - bw - 1.5} y={padT + H - vh} width={bw} height={Math.max(vh, 0)} rx="3.5"
              fill={active ? '#86efac' : '#bbf7d0'} />
            <rect x={cx + 1.5} y={padT + H - lh} width={bw} height={Math.max(lh, 0)} rx="3.5"
              fill={active ? '#2563eb' : '#93c5fd'} />
            <text x={cx} y={padT + H + padB - 4} textAnchor="middle" fontSize="8.5"
              fill={active ? '#2563eb' : '#94a3b8'} fontWeight={active ? '700' : '400'}>{monthLabel(ym)}</text>
          </g>
        );
      })}
    </svg>
  );
}

function DonutSegments({
  segments, total,
}: { segments: { label: string; value: number; color: string }[]; total: number }) {
  const r = 46, cx = 62, cy = 62, sw = 14;
  const circ = 2 * Math.PI * r;
  let cum = 0;
  if (total === 0 || segments.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-400">
        ჯერ არ არის საკმარისი მონაცემი
      </div>
    );
  }
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
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill="#94a3b8">სულ</text>
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
  return <DonutSegments segments={segs} total={segs.reduce((s, d) => s + d.value, 0)} />;
}

function monthOverMonthDelta(series: number[]): { label: string; up: boolean } | null {
  if (series.length < 2) return null;
  const prev = series[series.length - 2] ?? 0;
  const cur = series[series.length - 1] ?? 0;
  if (prev === 0 && cur === 0) return { label: '0%', up: true };
  if (prev === 0) return { label: '+100%', up: true };
  const pct = Math.round(((cur - prev) / prev) * 100);
  const sign = pct > 0 ? '+' : '';
  return { label: `${sign}${pct}%`, up: pct >= 0 };
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function AdminPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout, can, loading: authLoading } = useAdminAuth();
  const api = useApiRequest();

  const sectionParam = searchParams.get('section');
  const initialSection: Section =
    sectionParam && SECTIONS.includes(sectionParam as Section)
      ? (sectionParam as Section)
      : 'properties';

  const [section, setSection] = useState<Section>(initialSection);
  // Both sections read ?tab= so a dashboard shortcut can land on an exact board.
  const tabParam = searchParams.get('tab') ?? undefined;
  const deskTab = tabParam as DeskTab | undefined;
  const analyticsTab = tabParam as AnalyticsTab | undefined;
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [stats, setStats] = useState<Stats | null>(null);
  const [propList, setPropList] = useState<PropertyRow[]>([]);
  const [propTotal, setPropTotal] = useState(0);
  const [propLimit, setPropLimit] = useState(20);
  const [propSummary, setPropSummary] = useState<ListingsSummary | null>(null);
  const [listingStaff, setListingStaff] = useState<ListingStaffOption[]>([]);
  const listPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const staffFilter = searchParams.get('staff') || '';
  const memberFilter = searchParams.get('member') || '';
  const listQ = searchParams.get('q') || '';
  const [agentList, setAgentList] = useState<BrokerAdminRow[]>([]);
  const [blogList, setBlogList] = useState<BlogRow[]>([]);
  const [staffList, setStaffList] = useState<AdminUserRow[]>([]);
  const [memberList, setMemberList] = useState<MemberRow[]>([]);
  const [settingList, setSettingList] = useState<Setting[]>([]);

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [modal, setModal] = useState<{ type: 'blog' | 'staff'; mode: 'create' | 'edit'; data: Record<string, unknown> } | null>(null);
  const [permissionTarget, setPermissionTarget] = useState<AdminUserRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: Section; id: string | number } | null>(null);

  useEffect(() => {
    const param = searchParams.get('section');
    if (param && SECTIONS.includes(param as Section)) {
      setSection(param as Section);
    }
  }, [searchParams]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  const canSection = useCallback(
    (id: Section) => SECTION_PERMISSIONS[id].some(permission => can(permission)),
    [can],
  );

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
          can('listings.view') ? api('/properties?limit=200') : Promise.resolve({ data: [] }),
        ]);
        setStats(statsData);
        setPropList(propsData.data ?? []);
      } else if (s === 'properties') {
        const qs = new URLSearchParams({ limit: '20', page: String(listPage) });
        if (staffFilter) qs.set('staffId', staffFilter);
        if (memberFilter) qs.set('member', memberFilter);
        if (listQ) qs.set('q', listQ);
        const [data, staff] = await Promise.all([
          api(`/properties?${qs}`),
          api('/listing-staff').catch(() => []),
        ]);
        setPropList(data.data ?? []);
        setPropTotal(Number(data.total) || 0);
        setPropLimit(Number(data.limit) || 20);
        setPropSummary(data.summary ?? null);
        if (Array.isArray(staff)) setListingStaff(staff);
      } else if (s === 'agents') {
        const data = await api('/agents');
        setAgentList(data);
      } else if (s === 'blog') {
        const data = await api('/blog');
        setBlogList(data);
      } else if (s === 'staff') {
        const data = await api('/staff');
        setStaffList(data);
      } else if (s === 'members') {
        const data = await api('/members');
        setMemberList(data);
      } else if (s === 'settings') {
        const data = await api('/settings');
        setSettingList(data);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, api, can, showToast, listPage, staffFilter, memberFilter, listQ]);

  useEffect(() => {
    if (user) loadSection(section);
  }, [section, user, loadSection]);

  // Inline edits from the properties table: flags, price, lifecycle
  async function patchProp(id: string, patch: PropertyPatch) {
    try {
      const updated = await api(`/properties/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      setPropList(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
      showToast(
        'price' in patch ? 'ფასი განახლდა'
          : 'lifecycleState' in patch ? 'სტატუსი განახლდა'
          : 'განახლდა',
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
      throw err;
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    const { type, id } = confirmDelete;
    setConfirmDelete(null);
    try {
      const pathMap: Partial<Record<Section, string>> = {
        properties: 'properties', agents: 'agents', blog: 'blog',
        staff: 'staff', members: 'members',
      };
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
    const pathMap: Record<string, string> = { blog: 'blog', staff: 'staff' };
    const base = pathMap[type];
    const path = mode === 'create' ? `/${base}` : `/${base}/${String(data.id)}`;
    await api(path, { method: mode === 'create' ? 'POST' : 'PUT', body: JSON.stringify(formData) });
    showToast(mode === 'create' ? 'დაემატა' : 'განახლდა');
    setModal(null);
    const sMap: Record<string, Section> = { blog: 'blog', staff: 'staff' };
    if (type) loadSection(sMap[type]);
  }

  /** Saves the per-user permission overrides from the editor drawer. */
  async function savePermissions(userId: number, permissions: Record<string, boolean>, scope: 'own' | 'all') {
    await api(`/staff/${userId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions, scope }),
    });
    showToast('უფლებები განახლდა');
    setPermissionTarget(null);
    loadSection('staff');
  }

  async function saveRoleTemplate(role: Role, permissions: string[]) {
    await api(`/roles/${role}`, { method: 'PUT', body: JSON.stringify({ permissions }) });
    showToast(`${roleLabel(role)} — შაბლონი განახლდა`);
  }

  async function toggleMember(member: MemberRow) {
    try {
      await api(`/members/${member.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !member.isActive }),
      });
      showToast(member.isActive ? 'მომხმარებელი დაიბლოკა' : 'ბლოკი მოიხსნა');
      loadSection('members');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    }
  }

  async function saveSettings() {
    try {
      await api('/settings', { method: 'PUT', body: JSON.stringify({ settings: settingList }) });
      showToast('პარამეტრები შენახულია');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    }
  }

  const allNavItems: { id: Section; label: string; icon: LucideIcon; badge?: number }[] = [
    { id: 'dashboard', label: 'მთავარი', icon: LayoutDashboard },
    { id: 'properties', label: 'განცხადებები', icon: Building2 },
    { id: 'desk', label: 'დესკი', icon: Headphones, badge: stats?.pendingModeration ?? 0 },
    { id: 'analytics', label: 'ანალიტიკა', icon: BarChart3 },
    { id: 'prices', label: 'ფასები', icon: LineChart },
    { id: 'agents', label: 'ბროკერები', icon: Users },
    { id: 'blog', label: 'ბლოგი', icon: BookOpen },
    { id: 'staff', label: 'თანამშრომლები', icon: Shield },
    { id: 'members', label: 'მომხმარებლები', icon: UserCog },
    { id: 'settings', label: 'პარამეტრები', icon: Settings },
  ];

  // The server enforces the same rules; this only keeps unreachable tabs hidden.
  const navItems = allNavItems.filter(item => canSection(item.id));

  // Settings edits carry a hard admin floor server-side, so mirror it in the form.
  const canEditSettings = can('settings.edit') && meetsAdminFloor(user?.role ?? '');

  const filteredBlog = blogList.filter(b =>
    !search || b.title?.toLowerCase().includes(search.toLowerCase()) || b.category?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredStaff = staffList.filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMembers = memberList.filter(m =>
    !search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase())
  );

  // A broker landing on ?section=settings gets bounced to their first real tab.
  useEffect(() => {
    if (!user || authLoading) return;
    if (canSection(section)) return;
    const fallback = SECTIONS.find(canSection);
    if (fallback && fallback !== section) setSection(fallback);
  }, [section, user, authLoading, canSection]);

  const premiumCount = propList.filter(p => p.isPremium).length;
  const featuredCount = propList.filter(p => p.isFeatured).length;
  const forSaleCount = propList.filter(p => p.status === 'sale').length;
  const forRentCount = propList.filter(p => p.status === 'rent').length;

  if (authLoading || !user) return null;

  return (
    <div className="admin-shell min-h-screen flex flex-col">
      {/* Admin header */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: '#111827',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 1px 0 rgba(0,0,0,0.2)',
        }}
      >
        <div className="container-xl">
          {/* Main bar */}
          <div className="flex items-center justify-between gap-4 py-3.5 min-h-[68px]">
            {/* Brand */}
            <BrandLogo
              variant="dark"
              size="md"
              tagline={`${navItems.find(n => n.id === section)?.label} · პანელი`}
              responsiveText
              href="/admin"
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
                        style={{ background: '#2563eb' }}
                      />
                    )}
                    <item.icon size={14} strokeWidth={active ? 2.3 : 2} className={active ? undefined : 'opacity-75'} />
                    {item.label}
                    {Boolean(item.badge) && (
                      <span
                        className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white"
                        style={{ background: '#f59e0b' }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
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

              {can('listings.create') && (
                <button
                  onClick={() => navigate('/admin/listings/new')}
                  className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                  style={{
                    background: '#10b981',
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
              )}

              {/* User chip → profile */}
              <button
                type="button"
                onClick={() => navigate('/admin/profile')}
                className="hidden md:flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl ml-1 transition-all hover:bg-white/10"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
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
                    {roleLabel(user.role)}{user.scope === 'own' ? ' · კონტაქტი საკუთარზე' : ''}
                  </p>
                </div>
              </button>

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
                  (e.currentTarget as HTMLElement).style.background = 'rgba(37, 99, 235,0.15)';
                  (e.currentTarget as HTMLElement).style.color = '#2563eb';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(37, 99, 235,0.3)';
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
                  {Boolean(item.badge) && (
                    <span
                      className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white"
                      style={{ background: '#f59e0b' }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className={`container-xl ${section === 'dashboard' ? 'py-6 sm:py-7' : 'py-6'}`}>
          {['blog', 'staff', 'members'].includes(section) && (
            <div className="relative mb-5 md:max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ძიება..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm placeholder-slate-400 focus:outline-none bg-white"
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
            <div className="admin-dash">

              {/* Hero */}
              <div className="admin-dash-hero">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                  <div className="min-w-0 max-w-2xl">
                    <div className="admin-dash-kicker mb-4">
                      <Clock size={12} />
                      {formatGeorgianLongDate()}
                    </div>
                    <h2 className="text-white text-[2rem] sm:text-[2.35rem] font-extrabold tracking-tight leading-[1.08] mb-2">
                      გამარჯობა, {user.firstName || user.name.split(' ')[0]}
                    </h2>
                    <p className="text-slate-400 text-sm sm:text-[15px] leading-relaxed max-w-xl">
                      {roleLabel(user.role)} · {user.scope === 'own'
                        ? 'მთელი ბაზა, კონტაქტი საკუთარ პორტფოლიოში'
                        : 'პორტფოლიო, ბროკერები და კონტენტი ერთ ადგილას'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2.5 mt-7">
                      {can('listings.create') && (
                        <button type="button" onClick={() => navigate('/admin/listings/new')} className="admin-dash-cta admin-dash-cta--primary">
                          <Plus size={15} strokeWidth={2.5} />
                          ახალი განცხადება
                        </button>
                      )}
                      {can('listings.view') && (
                        <button type="button" onClick={() => setSection('properties')} className="admin-dash-cta admin-dash-cta--ghost">
                          <Building2 size={15} />
                          განცხადებები
                        </button>
                      )}
                      {can('listings.moderate') && Boolean(stats?.pendingModeration) && (
                        <button type="button" onClick={() => setSection('desk')} className="admin-dash-cta admin-dash-cta--ghost">
                          <Headphones size={15} />
                          მოდერაცია · {stats?.pendingModeration}
                        </button>
                      )}
                      <button type="button" onClick={() => navigate('/')} className="admin-dash-cta admin-dash-cta--link">
                        <ExternalLink size={14} />
                        საიტი
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 w-full lg:w-auto lg:min-w-[360px]">
                    {[
                      { label: 'განცხადება', value: stats?.properties ?? 0 },
                      { label: 'ნახვა', value: (stats?.totalViews ?? 0).toLocaleString('ka-GE') },
                      { label: 'ბროკერი', value: stats?.agents ?? 0 },
                      { label: 'ბლოგი', value: stats?.blogPosts ?? 0 },
                    ].map(item => (
                      <div key={item.label} className="rounded-2xl px-4 py-4 bg-slate-800 border border-slate-700">
                        <p className="text-2xl font-extrabold tabular-nums leading-none text-white">{item.value}</p>
                        <p className="text-[11px] font-semibold text-slate-400 mt-2 tracking-wide uppercase">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {(stats?.needsCall ?? 0) > 0 && (
                <button type="button" onClick={() => setSection('properties')} className="admin-alert">
                  <span className="w-11 h-11 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                    <Phone size={18} className="text-red-600" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold text-slate-900">
                      {stats?.needsCall} განცხადებას სჭირდება განახლება — დასარეკია
                    </span>
                    <span className="block text-[12px] text-slate-500 mt-0.5">
                      {(stats?.freeingSoon ?? 0) > 0
                        ? `კიდევ ${stats?.freeingSoon} თავისუფლდება უახლოეს 30 დღეში`
                        : 'გადაამოწმე ობიექტები და დაუკავშირდი მესაკუთრეებს'}
                    </span>
                  </span>
                  <span className="px-4 py-2.5 rounded-xl text-xs font-bold text-white flex-shrink-0 bg-red-600">
                    სიის ნახვა
                  </span>
                </button>
              )}

              {/* Primary metrics */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                {(() => {
                  const listingDelta = monthOverMonthDelta(stats?.monthly?.listings ?? []);
                  const viewsDelta = monthOverMonthDelta(stats?.monthly?.views ?? []);
                  return [
                    { label: 'სულ განცხადება', value: stats?.properties ?? 0, icon: Building2, accent: '#2563eb', soft: '#eff6ff', delta: listingDelta, spark: stats?.monthly?.listings ?? [] },
                    { label: 'სულ ნახვა', value: (stats?.totalViews ?? 0).toLocaleString('ka-GE'), icon: Eye, accent: '#059669', soft: '#ecfdf5', delta: viewsDelta, spark: stats?.monthly?.views ?? [] },
                    { label: 'აქტიური ბროკერი', value: stats?.agents ?? 0, icon: UserCheck, accent: '#d97706', soft: '#fffbeb', delta: null, spark: [] as number[] },
                    { label: 'ბლოგ სტატია', value: stats?.blogPosts ?? 0, icon: BookOpen, accent: '#7c3aed', soft: '#f5f3ff', delta: null, spark: [] as number[] },
                  ].map(({ label, value, icon: Icon, accent, soft, delta, spark }) => (
                    <div key={label} className="admin-metric" style={{ ['--accent' as string]: accent, ['--accent-soft' as string]: soft }}>
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="admin-metric__icon"><Icon size={18} /></div>
                        {delta ? (
                          <span
                            className="admin-metric__delta"
                            style={{ background: delta.up ? '#ecfdf5' : '#fef2f2', color: delta.up ? '#059669' : '#dc2626' }}
                            title="შედარება წინა თვესთან"
                          >
                            <ArrowUpRight size={11} className={delta.up ? undefined : 'rotate-90'} />
                            {delta.label}
                          </span>
                        ) : null}
                      </div>
                      <p className="admin-metric__value">{value}</p>
                      <p className="admin-metric__label">{label}</p>
                      {spark.length > 1 ? (
                        <div className="mt-3 opacity-90"><SparkLine data={spark} color={accent} /></div>
                      ) : null}
                    </div>
                  ));
                })()}
              </div>

              {/* Lifecycle */}
              <div className="admin-life">
                {[
                  { key: 'new', label: 'ახალი', hint: 'ახლახანს დამატებული', accent: '#2563eb' },
                  { key: 'current', label: 'მიმდინარე', hint: 'აქტიური პორტფოლიო', accent: '#059669' },
                  { key: 'old', label: 'ძველი / ქირა', hint: 'ვადიანი ქირავნობა', accent: '#d97706' },
                  { key: 'new_r', label: 'დასარეკი', hint: 'განახლება 2 დღეში', accent: '#dc2626' },
                ].map(item => (
                  <button
                    key={item.key}
                    type="button"
                    className="admin-life-chip"
                    style={{ ['--accent' as string]: item.accent }}
                    onClick={() => setSection('properties')}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: item.accent }}>
                      {item.label}
                    </span>
                    <span className="text-[1.75rem] font-extrabold tabular-nums tracking-tight text-slate-900 leading-none">
                      {stats?.lifecycle?.[item.key] ?? 0}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">{item.hint}</span>
                  </button>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                <div className="xl:col-span-8 admin-panel">
                  <div className="admin-panel__head">
                    <div>
                      <p className="admin-panel__title">ყოველთვიური აქტივობა</p>
                      <p className="admin-panel__sub">ბოლო 12 თვე · ახალი განცხადებები და რეალური ნახვები</p>
                    </div>
                    <div className="flex items-center gap-4 pt-0.5">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                        <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />განცხ.
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />ნახვა
                      </span>
                    </div>
                  </div>
                  <div className="px-4 sm:px-5 pb-5 pt-2">
                    <MonthlyBarChart
                      months={stats?.monthly?.months ?? []}
                      listings={stats?.monthly?.listings ?? []}
                      views={stats?.monthly?.views ?? []}
                    />
                  </div>
                </div>

                <div className="xl:col-span-4 admin-panel">
                  <div className="admin-panel__head">
                    <div>
                      <p className="admin-panel__title">ქონების ტიპები</p>
                      <p className="admin-panel__sub">პორტფოლიოს შემადგენლობა</p>
                    </div>
                  </div>
                  <div className="px-5 pb-5 pt-2">
                    <PropertyTypeChart properties={propList} />
                  </div>
                </div>
              </div>

              {/* Mix + snapshot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { label: 'იყიდება', count: forSaleCount, total: propList.length, color: '#d97706', soft: '#fffbeb', icon: TrendingUp },
                  { label: 'ქირავდება', count: forRentCount, total: propList.length, color: '#059669', soft: '#ecfdf5', icon: Home },
                  { label: 'VIP / პრემიუმი', count: premiumCount, total: propList.length, color: '#b45309', soft: '#fef3c7', icon: Zap },
                  { label: 'გამორჩეული', count: featuredCount, total: propList.length, color: '#2563eb', soft: '#eff6ff', icon: Star },
                ].map(({ label, count, total, color, soft, icon: Icon }) => {
                  const pct = total ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={label} className="admin-panel p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: soft, color }}>
                          <Icon size={17} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
                          <p className="text-2xl font-extrabold text-slate-900 leading-none mt-1 tabular-nums">{count}</p>
                        </div>
                        <span className="text-sm font-extrabold tabular-nums" style={{ color }}>{pct}%</span>
                      </div>
                      <div className="admin-progress">
                        <span style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2.5 font-medium">სულ {total} განცხადებიდან</p>
                    </div>
                  );
                })}
              </div>

              {/* Top + actions */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                <div className="xl:col-span-8 admin-panel">
                  <div className="admin-panel__head">
                    <div>
                      <p className="admin-panel__title">ტოპ განცხადებები</p>
                      <p className="admin-panel__sub">ნახვების მიხედვით · ID-ით იდენტიფიკაცია</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSection('properties')}
                      className="inline-flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-xl text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      ყველა <ArrowUpRight size={12} />
                    </button>
                  </div>
                  <div>
                    {[...(propList.length ? propList : (stats?.recentProperties ?? []))]
                      .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
                      .slice(0, 8)
                      .map((p, idx) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => navigate(propertyHref(p))}
                          className="admin-listing-row"
                        >
                          <span
                            className="admin-rank"
                            style={{
                              background: idx < 3 ? '#0f172a' : '#f1f5f9',
                              color: idx < 3 ? '#fff' : '#94a3b8',
                            }}
                          >
                            {idx + 1}
                          </span>
                          <ImgThumb src={p.images?.[0]} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[11px] font-extrabold tracking-wide text-blue-600 flex-shrink-0">
                                #{p.id}
                              </span>
                              <p className="text-sm font-semibold text-slate-800 truncate">{p.title}</p>
                            </div>
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin size={10} />{p.city}{p.district ? ` · ${p.district}` : ''}
                            </p>
                          </div>
                          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                            <Badge label={TYPE_LABELS[p.type] || p.type} color={TYPE_COLORS[p.type] || '#94a3b8'} />
                            <Badge
                              label={p.status === 'sale' ? 'იყ.' : p.status === 'rent' ? 'ქირ.' : 'ორივე'}
                              color={STATUS_COLOR[p.status] || '#6366f1'}
                            />
                          </div>
                          <div className="text-right flex-shrink-0 min-w-[88px]">
                            <p className="text-sm font-extrabold text-slate-900 tabular-nums">{GEL(p.price)}</p>
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 justify-end mt-0.5">
                              <Eye size={10} />{(p.viewCount ?? 0).toLocaleString('ka-GE')}
                            </p>
                          </div>
                          {p.isPremium && <Zap size={13} className="text-amber-500 flex-shrink-0" />}
                        </button>
                      ))}
                    {propList.length === 0 && !stats?.recentProperties?.length && (
                      <div className="py-14 text-center text-slate-400 text-sm">განცხადება ჯერ არ არის</div>
                    )}
                  </div>
                </div>

                <div className="xl:col-span-4 space-y-4">
                  <div className="admin-panel p-5">
                    <p className="admin-panel__title mb-1">სწრაფი მოქმედებები</p>
                    <p className="admin-panel__sub mb-4">ხშირად გამოყენებული ბრძანებები</p>
                    <div className="space-y-2">
                      {[
                        { label: 'ახალი განცხადება', sub: 'ფორმა + ფოტოები', color: '#2563eb', soft: '#eff6ff', icon: Plus, action: () => navigate('/admin/listings/new') },
                        { label: 'განცხადებების ცხრილი', sub: 'რედაქტირება / ფასები', color: '#059669', soft: '#ecfdf5', icon: Building2, action: () => setSection('properties') },
                        { label: 'ბროკერების მართვა', sub: 'პროფილები და პორტფოლიო', color: '#d97706', soft: '#fffbeb', icon: UserCheck, action: () => setSection('agents') },
                        { label: 'ბლოგი', sub: 'სტატიები და გიდები', color: '#7c3aed', soft: '#f5f3ff', icon: BookOpen, action: () => setSection('blog') },
                      ].map(({ label, sub, color, soft, icon: Icon, action }) => (
                        <button key={label} type="button" onClick={action} className="admin-quick-tile">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: soft, color }}
                          >
                            <Icon size={16} />
                          </div>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold text-slate-800">{label}</span>
                            <span className="block text-[11px] text-slate-500 mt-0.5">{sub}</span>
                          </span>
                          <ArrowUpRight size={14} className="text-slate-300 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[18px] p-5 text-white border border-slate-800 bg-slate-900">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-3">პორტფოლიო</p>
                    <p className="text-3xl font-extrabold tabular-nums tracking-tight mb-1">{stats?.properties ?? 0}</p>
                    <p className="text-sm text-slate-400 mb-5">აქტიური განცხადება სისტემაში</p>
                    <div className="flex items-center gap-4 text-[12px] font-semibold text-slate-300">
                      <span className="inline-flex items-center gap-1.5"><Star size={13} className="text-amber-400" />{featuredCount} გამორჩ.</span>
                      <span className="inline-flex items-center gap-1.5"><Zap size={13} className="text-amber-400" />{premiumCount} VIP</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ── PROPERTIES ── */}
          {section === 'properties' && (
            <AdminPropertiesSection
              properties={propList}
              total={propTotal}
              page={listPage}
              limit={propLimit}
              summary={propSummary}
              staffOptions={listingStaff}
              onPatch={patchProp}
              onDelete={id => setConfirmDelete({ type: 'properties', id })}
              showToast={showToast}
            />
          )}

          {/* ── BROKERS ── */}
          {section === 'agents' && (
            <AdminBrokersSection
              brokers={agentList}
              search={search}
              onSearchChange={setSearch}
              onReload={() => loadSection('agents')}
              api={api}
              showToast={showToast}
            />
          )}

          {/* ── BLOG ── */}
          {section === 'blog' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">სულ: <b className="text-slate-700">{filteredBlog.length}</b></p>
                <button onClick={() => setModal({ type: 'blog', mode: 'create', data: {} })}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-600 transition-colors">
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
                        <Badge label={b.category || 'კატ.'} color="#2563eb" />
                        {b.isFeatured && <Badge label="გამ." color="#2563eb" />}
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

          {/* ── MANAGER DESK ── */}
          {section === 'desk' && (
            <AdminDeskSection api={api} showToast={showToast} initialTab={deskTab} />
          )}

          {/* ── ANALYTICS ── */}
          {section === 'analytics' && (
            <AdminAnalyticsSection api={api} showToast={showToast} initialTab={analyticsTab} />
          )}

          {section === 'prices' && (
            <AdminPricesSection api={api} showToast={showToast} />
          )}

          {/* ── STAFF ── */}
          {section === 'staff' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800">თანამშრომლები</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    როლი განსაზღვრავს საბაზისო უფლებებს, ინდივიდუალური კორექტირება კი მათ ზემოდან ედება
                  </p>
                </div>
                {can('staff.create') && (
                  <button onClick={() => setModal({ type: 'staff', mode: 'create', data: {} })}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors">
                    <Plus size={15} />თანამშრომელი
                  </button>
                )}
              </div>

              {can('staff.permissions') && (
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3 flex-wrap">
                  <Lock size={16} className="text-slate-400" />
                  <p className="text-xs text-slate-600 flex-1 min-w-[200px]">
                    როლის შაბლონის შეცვლა იმოქმედებს ყველა თანამშრომელზე ამ როლით.
                  </p>
                  <button
                    onClick={() => setPermissionTarget({
                      id: 0, email: '', name: 'როლების შაბლონები', role: 'super_admin',
                      isActive: true, createdAt: '',
                    })}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                  >
                    როლების შაბლონები
                  </button>
                </div>
              )}

              <div className="grid gap-3">
                {filteredStaff.map(u => {
                  const manageable = canManageRole(user.role, u.role) || u.id === user.id;
                  const color = roleColor(u.role);
                  return (
                    <div key={u.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4 flex-wrap group">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden bg-blue-600">
                        {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" /> : u.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-[160px]">
                        <p className="font-bold text-slate-800 text-sm">
                          {u.name}
                          {u.id === user.id && <span className="ml-2 text-[10px] font-semibold text-slate-400">(თქვენ)</span>}
                        </p>
                        <p className="text-xs text-slate-400">{u.email}{u.jobTitle ? ` · ${u.jobTitle}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold"
                          style={{ background: color.bg, color: color.text }}
                        >
                          {roleLabel(u.role)}
                        </span>
                        {u.scope === 'own' && <Badge label="კონტაქტი საკუთარზე" color="#b45309" />}
                        <Badge label={`${u.effectivePermissions?.length ?? 0} უფლება`} color="#64748b" />
                        <Badge label={u.isActive ? 'აქტ.' : 'დაბლ.'} color={u.isActive ? '#10B981' : '#ef4444'} />
                        {u.showOnFrontend && <Badge label="საიტზე ჩანს" color="#0ea5e9" />}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {can('staff.permissions') && u.id !== user.id && manageable && (
                          <button onClick={() => setPermissionTarget(u)} title="უფლებები"
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"><Lock size={13} /></button>
                        )}
                        {can('staff.edit') && manageable && (
                          <button onClick={() => setModal({ type: 'staff', mode: 'edit', data: u as unknown as Record<string, unknown> })}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"><Pencil size={13} /></button>
                        )}
                        {can('staff.delete') && u.id !== user.id && canManageRole(user.role, u.role) && (
                          <button onClick={() => setConfirmDelete({ type: 'staff', id: u.id })}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={13} /></button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── MEMBERS ── */}
          {section === 'members' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800">საიტის მომხმარებლები</h2>
                  <p className="text-xs text-slate-500 mt-0.5">რეგისტრირებული მომხმარებლები — რჩეულები და განაცხადები</p>
                </div>
                <p className="text-xs text-slate-500">სულ: <b className="text-slate-700">{filteredMembers.length}</b></p>
              </div>

              {filteredMembers.length === 0 && (
                <div className="bg-white rounded-2xl p-12 border border-slate-100 shadow-sm text-center">
                  <UserCog size={26} className="text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">ჯერ არავინ დარეგისტრირებულა</p>
                </div>
              )}

              <div className="grid gap-3">
                {filteredMembers.map(m => (
                  <div key={m.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4 flex-wrap">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden bg-slate-400">
                      {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" /> : m.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-[160px]">
                      <p className="font-bold text-slate-800 text-sm">{m.name}</p>
                      <p className="text-xs text-slate-400">
                        {m.email}{m.phone ? ` · ${m.phone}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <Badge label={`${m.listingCount} განცხადება`} color="#2563eb" />
                      <Badge label={m.isActive ? 'აქტ.' : 'დაბლოკილი'} color={m.isActive ? '#10B981' : '#ef4444'} />
                      <span className="text-[11px] text-slate-400">
                        {m.createdAt ? formatGeorgianShortDate(m.createdAt) : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {can('members.block') && (
                        <button onClick={() => toggleMember(m)} title={m.isActive ? 'დაბლოკვა' : 'ბლოკის მოხსნა'}
                          className={`p-1.5 rounded-lg transition-colors ${m.isActive ? 'hover:bg-orange-50 text-slate-400 hover:text-orange-600' : 'hover:bg-green-50 text-slate-400 hover:text-green-600'}`}>
                          {m.isActive ? <Ban size={13} /> : <CheckCircle size={13} />}
                        </button>
                      )}
                      {can('members.delete') && (
                        <button onClick={() => setConfirmDelete({ type: 'members', id: m.id })}
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
                    <input type="text" value={s.value || ''} readOnly={!canEditSettings} onChange={e => {
                      const u = [...settingList]; u[i] = { ...u[i], value: e.target.value }; setSettingList(u);
                    }} className={`${inputCls} ${canEditSettings ? '' : 'bg-slate-50 text-slate-500'}`} />
                  </Field>
                ))}
                {settingList.length === 0 && <p className="text-slate-400 text-sm text-center py-4">იტვირთება...</p>}
                {settingList.length > 0 && (canEditSettings ? (
                  <button onClick={saveSettings}
                    className="mt-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-600 transition-colors">
                    შენახვა
                  </button>
                ) : (
                  <p className="mt-2 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                    <Lock size={13} />
                    პარამეტრებს მხოლოდ ადმინი ან სუპერ ადმინი ცვლის
                  </p>
                ))}
              </div>
            </div>
          )}

          </>}
        </div>
      </main>

      {/* ── MODALS ── */}
      {modal?.type === 'blog' && (
        <BlogModal mode={modal.mode} data={modal.data} onClose={() => setModal(null)} onSave={saveModal} />
      )}
      {modal?.type === 'staff' && (
        <StaffModal
          mode={modal.mode}
          data={modal.data}
          actorRole={user.role}
          isSelf={Number(modal.data.id) === user.id}
          onClose={() => setModal(null)}
          onSave={saveModal}
        />
      )}

      {permissionTarget && (
        <StaffPermissionEditor
          target={permissionTarget.id ? permissionTarget : null}
          onClose={() => setPermissionTarget(null)}
          onSaveUser={savePermissions}
          onSaveRole={saveRoleTemplate}
        />
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
      <AdminFooter />
    </div>
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
        <button onClick={handleSave} disabled={saving || !form.title} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-600 disabled:opacity-60">
          {saving ? 'მიმდინ...' : mode === 'create' ? 'დამატება' : 'შენახვა'}
        </button>
      </div>
    </Modal>
  );
}

// ─── STAFF MODAL ─────────────────────────────────────────────────────────────

function StaffModal({ mode, data, actorRole, isSelf, onClose, onSave }: {
  mode: 'create' | 'edit';
  data: Record<string, unknown>;
  actorRole: string;
  isSelf: boolean;
  onClose: () => void;
  onSave: (d: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    email: String(data.email || ''),
    firstName: String(data.firstName || (typeof data.name === 'string' ? data.name.split(' ')[0] : '') || ''),
    lastName: String(data.lastName || (typeof data.name === 'string' ? data.name.split(' ').slice(1).join(' ') : '') || ''),
    dateOfBirth: data.dateOfBirth ? String(data.dateOfBirth).slice(0, 10) : '',
    phone: String(data.phone || ''),
    jobTitle: String(data.jobTitle || ''),
    password: '',
    role: String(data.role || 'broker'),
    scope: data.scope === 'own' ? 'own' : 'all',
    showOnFrontend: Boolean(data.showOnFrontend),
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  // You can only hand out a role below your own.
  const assignableRoles = STAFF_ROLES.filter(r => canManageRole(actorRole, r));

  async function handleSave() {
    if (!form.firstName || (mode === 'create' && !form.password)) return;
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...form,
        name: [form.firstName, form.lastName].filter(Boolean).join(' '),
        dateOfBirth: form.dateOfBirth || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შენახვა ვერ მოხერხდა');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={mode === 'create' ? 'თანამშრომლის დამატება' : 'თანამშრომლის რედაქტირება'} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="სახელი *">
            <input type="text" value={form.firstName} onChange={e => set('firstName', e.target.value)} className={inputCls} placeholder="თეონა" />
          </Field>
          <Field label="გვარი">
            <input type="text" value={form.lastName} onChange={e => set('lastName', e.target.value)} className={inputCls} placeholder="ბერიძე" />
          </Field>
        </div>
        {mode === 'create' && (
          <Field label="Email *">
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="დაბადების თარიღი">
            <input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} className={inputCls} />
          </Field>
          <Field label="ტელეფონი">
            <input type="text" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} placeholder="+995 ..." />
          </Field>
        </div>
        <Field label="თანამდებობა">
          <input type="text" value={form.jobTitle} onChange={e => set('jobTitle', e.target.value)} className={inputCls} placeholder="რეალტორი" />
        </Field>
        <Field label={mode === 'create' ? 'პაროლი *' : 'ახალი პაროლი (სურ.)'}
          hint={mode === 'edit' ? 'შეცვლისას აქტიური სესიები ითიშება' : 'მინიმუმ 6 სიმბოლო'}>
          <input type="password" value={form.password} onChange={e => set('password', e.target.value)} className={inputCls} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="როლი" hint={isSelf ? 'საკუთარი როლის შეცვლა არ შეიძლება' : ROLE_DESCRIPTION[form.role as Role]}>
            <select
              value={form.role}
              disabled={isSelf}
              onChange={e => set('role', e.target.value)}
              className={`${selectCls} disabled:bg-slate-50 disabled:text-slate-400`}
            >
              {assignableRoles.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
              {!assignableRoles.includes(form.role as Role) && (
                <option value={form.role}>{roleLabel(form.role)}</option>
              )}
            </select>
          </Field>
          <Field label="ხედვის არეალი" hint={form.scope === 'own' ? 'ხედავს მთელ ბაზას. ტელეფონი და მეილი მხოლოდ საკუთარ პორტფოლიოში.' : 'ყველა განცხადება და მესაკუთრის კონტაქტი'}>
            <select value={form.scope} onChange={e => set('scope', e.target.value)} className={selectCls}>
              <option value="all">სრული წვდომა</option>
              <option value="own">ბაზა ღიაა · კონტაქტი საკუთარზე</option>
            </select>
          </Field>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <Toggle on={form.isActive} onToggle={() => set('isActive', !form.isActive)} label="აქტ." />
          <span className="text-sm font-medium text-slate-700">აქტიური</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Toggle on={form.showOnFrontend} onToggle={() => set('showOnFrontend', !form.showOnFrontend)} label="საიტი" />
          <span className="text-sm font-medium text-slate-700">სახელის ჩვენება საიტზე (გუნდი)</span>
        </label>

        {error && (
          <p className="text-xs font-semibold text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
        )}
      </div>
      <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
        <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50">გაუქმება</button>
        <button onClick={handleSave} disabled={saving || !form.firstName || (mode === 'create' && !form.password)}
          className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60">
          {saving ? 'მიმდინ...' : mode === 'create' ? 'დამატება' : 'შენახვა'}
        </button>
      </div>
    </Modal>
  );
}
