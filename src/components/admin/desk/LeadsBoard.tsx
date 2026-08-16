/**
 * Lead inbox — every enquiry from the public site, the queue that works them and
 * the timeline of what was said.
 *
 * The organising idea is the response clock: a lead nobody has answered is the most
 * expensive thing on the desk, so unanswered-and-late sorts to the top and is red
 * everywhere it appears.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  Check,
  Clock,
  Inbox,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Send,
  Shuffle,
  Sparkles,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';
import { Avatar, Chip, DeskModal, EmptyState, Field, Spinner, StatTile, inputCls, selectCls } from './ui';
import type {
  DeskBoardProps,
  Lead,
  LeadBrokerLoad,
  LeadEvent,
  LeadEventKind,
  LeadKind,
  LeadListResponse,
  LeadStage,
  LeadStats,
} from './types';

const STAGE_META: Record<LeadStage, { label: string; bg: string; text: string }> = {
  new: { label: 'ახალი', bg: '#dbeafe', text: '#1d4ed8' },
  contacted: { label: 'დაკავშირებული', bg: '#e0e7ff', text: '#4338ca' },
  viewing: { label: 'დათვალიერება', bg: '#fef3c7', text: '#b45309' },
  offer: { label: 'შეთავაზება', bg: '#fae8ff', text: '#a21caf' },
  won: { label: 'მოგებული', bg: '#dcfce7', text: '#15803d' },
  lost: { label: 'დაკარგული', bg: '#f1f5f9', text: '#64748b' },
};

/** The order a healthy lead travels in. */
const PIPELINE: LeadStage[] = ['new', 'contacted', 'viewing', 'offer', 'won'];

const KIND_META: Record<LeadKind, { label: string; icon: typeof Phone; bg: string; text: string }> = {
  contact: { label: 'კონტაქტი', icon: MessageSquare, bg: '#f1f5f9', text: '#475569' },
  property: { label: 'განცხადება', icon: Building2, bg: '#dbeafe', text: '#1d4ed8' },
  viewing: { label: 'დათვალიერება', icon: CalendarClock, bg: '#fef3c7', text: '#b45309' },
  newsletter: { label: 'გამოწერა', icon: Mail, bg: '#ecfdf5', text: '#047857' },
};

const EVENT_META: Record<LeadEventKind, { label: string; icon: typeof Phone; color: string }> = {
  created: { label: 'მიღებული', icon: Sparkles, color: '#2563eb' },
  note: { label: 'კომენტარი', icon: MessageSquare, color: '#64748b' },
  call: { label: 'ზარი', icon: Phone, color: '#059669' },
  email: { label: 'ელფოსტა', icon: Mail, color: '#7c3aed' },
  meeting: { label: 'შეხვედრა', icon: Users, color: '#b45309' },
  stage: { label: 'სტატუსი', icon: ArrowRight, color: '#0891b2' },
  assign: { label: 'მინიჭება', icon: UserPlus, color: '#db2777' },
};

/** Compact "2სთ 15წთ" from a minute count. */
function duration(minutes: number): string {
  if (minutes < 1) return 'ახლახან';
  if (minutes < 60) return `${minutes}წთ`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `${hours}სთ ${rest}წთ` : `${hours}სთ`;
  }
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days} დღე` : `${Math.floor(days / 30)} თვე`;
}

function when(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('ka-GE', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function StageChip({ stage }: { stage: LeadStage }) {
  const meta = STAGE_META[stage];
  return <Chip label={meta.label} bg={meta.bg} text={meta.text} />;
}

/** Horizontal funnel: how many leads sit at each step, and how wide that step is. */
function Funnel({ stats }: { stats: LeadStats }) {
  const counts = new Map(stats.byStage.map(row => [row.stage, row.count]));
  const peak = Math.max(1, ...PIPELINE.map(stage => counts.get(stage) ?? 0));

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">ძაბრი</p>
        <p className="text-[11px] font-bold text-slate-500">
          კონვერსია <span className="text-emerald-600">{stats.conversionRate}%</span>
        </p>
      </div>
      <div className="flex items-end gap-1.5">
        {PIPELINE.map(stage => {
          const count = counts.get(stage) ?? 0;
          const meta = STAGE_META[stage];
          return (
            <div key={stage} className="flex-1 text-center">
              <div className="flex h-24 items-end justify-center">
                <div
                  className="w-full rounded-t-lg transition-all"
                  style={{
                    height: `${Math.max(6, (count / peak) * 100)}%`,
                    background: meta.text,
                    opacity: count === 0 ? 0.15 : 0.85,
                  }}
                />
              </div>
              <p className="mt-1.5 text-sm font-extrabold text-slate-700">{count}</p>
              <p className="text-[10px] font-semibold text-slate-400">{meta.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LeadsBoard({
  api,
  showToast,
  onCountsChanged,
  currentUserId,
}: DeskBoardProps & { currentUserId: number }) {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<LeadListResponse | null>(null);
  const [stage, setStage] = useState<LeadStage | 'open' | 'all'>('open');
  const [kind, setKind] = useState<LeadKind | ''>('');
  const [owner, setOwner] = useState<'' | 'me' | 'unassigned'>('');
  const [breachedOnly, setBreachedOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [openLead, setOpenLead] = useState<Lead | null>(null);
  const [events, setEvents] = useState<LeadEvent[]>([]);
  const [distributing, setDistributing] = useState(false);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    params.set('stage', stage);
    if (kind) params.set('kind', kind);
    if (owner) params.set('assignedTo', owner);
    if (breachedOnly) params.set('breached', '1');
    if (search.trim()) params.set('q', search.trim());

    setLoading(true);
    api(`/desk/leads?${params.toString()}`)
      .then(data => setPayload(data as LeadListResponse))
      .catch(() => showToast('ლიდები ვერ ჩაიტვირთა', 'error'))
      .finally(() => setLoading(false));
  }, [api, stage, kind, owner, breachedOnly, search, showToast]);

  // Debounced so typing in the search box does not hammer the endpoint.
  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const leads = payload?.data ?? [];
  const stats = payload?.stats;
  const brokers = payload?.brokers ?? [];
  const rights = payload?.can ?? { assign: false, manage: false, contact: false, viewAll: false };

  const openDetail = useCallback(
    async (lead: Lead) => {
      setOpenLead(lead);
      setEvents([]);
      try {
        const detail = (await api(`/desk/leads/${lead.id}`)) as { data: Lead; events: LeadEvent[] };
        setOpenLead(detail.data);
        setEvents(detail.events);
      } catch {
        showToast('ლიდი ვერ გაიხსნა', 'error');
      }
    },
    [api, showToast],
  );

  /** Every mutation returns the fresh lead, so the drawer and list stay in step. */
  const applyResult = useCallback(
    (result: { data: Lead; events?: LeadEvent[] }) => {
      setOpenLead(result.data);
      if (result.events) setEvents(result.events);
      load();
      onCountsChanged();
    },
    [load, onCountsChanged],
  );

  const claim = async (lead: Lead) => {
    try {
      const result = (await api(`/desk/leads/${lead.id}/claim`, { method: 'POST' })) as { data: Lead };
      applyResult(result);
      showToast('ლიდი აღებულია');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ვერ მოხერხდა', 'error');
    }
  };

  const distribute = async () => {
    if (brokers.length === 0) return;
    setDistributing(true);
    try {
      const result = (await api('/desk/leads/auto-assign', {
        method: 'POST',
        body: JSON.stringify({ brokerIds: brokers.map(b => b.userId) }),
      })) as { assigned: number };
      showToast(`განაწილდა ${result.assigned} ლიდი`);
      load();
      onCountsChanged();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ვერ მოხერხდა', 'error');
    } finally {
      setDistributing(false);
    }
  };

  const filtersActive = stage !== 'open' || kind !== '' || owner !== '' || breachedOnly || search !== '';

  return (
    <div className="space-y-4">
      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatTile
              label="ღია ლიდი"
              value={stats.open}
              hint={`დღეს ${stats.newToday} ახალი`}
              tone="blue"
              icon={<Inbox size={15} />}
              onClick={() => { setStage('open'); setOwner(''); setBreachedOnly(false); }}
              active={stage === 'open' && !owner && !breachedOnly}
            />
            <StatTile
              label="დაურეკავი"
              value={stats.breached}
              hint={`SLA ${duration(stats.slaMinutes)}`}
              tone="red"
              icon={<AlertTriangle size={15} />}
              onClick={() => { setBreachedOnly(true); setStage('open'); }}
              active={breachedOnly}
            />
            <StatTile
              label="უპატრონო"
              value={stats.unassigned}
              hint="ჯერ არავის აქვს აღებული"
              tone="amber"
              icon={<Users size={15} />}
              onClick={() => { setOwner('unassigned'); setStage('open'); }}
              active={owner === 'unassigned'}
            />
            <StatTile
              label="საშ. პასუხი"
              value={stats.medianResponseMinutes ? duration(stats.medianResponseMinutes) : '—'}
              hint="მედიანა, 30 დღე"
              tone={stats.medianResponseMinutes > stats.slaMinutes ? 'red' : 'green'}
              icon={<Clock size={15} />}
            />
            <StatTile
              label="მოგებული"
              value={stats.won30d}
              hint={`30 დღე · ${stats.lost30d} დაკარგული`}
              tone="green"
              icon={<Trophy size={15} />}
              onClick={() => setStage('won')}
              active={stage === 'won'}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-[2fr_3fr]">
            <Funnel stats={stats} />
            <BrokerLoadPanel
              brokers={brokers}
              unassigned={stats.unassigned}
              canAssign={rights.assign}
              distributing={distributing}
              onDistribute={distribute}
            />
          </div>
        </>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <div className="relative min-w-[200px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="სახელი, ტელეფონი, ID…"
            className={`${inputCls} pl-9`}
          />
        </div>

        <select value={stage} onChange={e => setStage(e.target.value as LeadStage | 'open' | 'all')} className={`${selectCls} w-auto`}>
          <option value="open">ღია</option>
          <option value="all">ყველა</option>
          {PIPELINE.map(s => <option key={s} value={s}>{STAGE_META[s].label}</option>)}
          <option value="lost">დაკარგული</option>
        </select>

        <select value={kind} onChange={e => setKind(e.target.value as LeadKind | '')} className={`${selectCls} w-auto`}>
          <option value="">ყველა წყარო</option>
          {(Object.keys(KIND_META) as LeadKind[]).map(k => (
            <option key={k} value={k}>{KIND_META[k].label}</option>
          ))}
        </select>

        <select value={owner} onChange={e => setOwner(e.target.value as '' | 'me' | 'unassigned')} className={`${selectCls} w-auto`}>
          <option value="">ყველა ბროკერი</option>
          <option value="me">ჩემი</option>
          <option value="unassigned">უპატრონო</option>
        </select>

        <button
          onClick={() => setBreachedOnly(v => !v)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
            breachedOnly ? 'bg-red-500 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle size={14} />
          დაგვიანებული
        </button>

        {filtersActive && (
          <button
            onClick={() => { setStage('open'); setKind(''); setOwner(''); setBreachedOnly(false); setSearch(''); }}
            className="rounded-xl px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50"
          >
            გასუფთავება
          </button>
        )}

        <button
          onClick={load}
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          განახლება
        </button>
      </div>

      {/* ── Inbox ── */}
      {loading && !payload ? (
        <Spinner label="ლიდები იტვირთება…" />
      ) : leads.length === 0 ? (
        <EmptyState
          icon={<Inbox size={22} />}
          title={filtersActive ? 'ამ ფილტრით ლიდი არ მოიძებნა' : 'ჯერ ლიდები არ მოსულა'}
          hint={filtersActive ? 'შეცვალეთ ფილტრი' : 'საიტიდან გამოგზავნილი ყველა შეტყობინება აქ მოხვდება'}
        />
      ) : (
        <div className="space-y-2">
          {leads.map(lead => (
            <LeadRow
              key={lead.id}
              lead={lead}
              currentUserId={currentUserId}
              canClaim={rights.manage}
              onOpen={() => openDetail(lead)}
              onClaim={() => claim(lead)}
            />
          ))}
        </div>
      )}

      {openLead && (
        <LeadDrawer
          api={api}
          showToast={showToast}
          lead={openLead}
          events={events}
          brokers={brokers}
          rights={rights}
          currentUserId={currentUserId}
          onClose={() => setOpenLead(null)}
          onChanged={applyResult}
        />
      )}
    </div>
  );
}

/* ── Broker load ─────────────────────────────────────────────────────────── */

function BrokerLoadPanel({
  brokers,
  unassigned,
  canAssign,
  distributing,
  onDistribute,
}: {
  brokers: LeadBrokerLoad[];
  unassigned: number;
  canAssign: boolean;
  distributing: boolean;
  onDistribute: () => void;
}) {
  if (!canAssign) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">თქვენი რიგი</p>
        <p className="mt-3 text-sm text-slate-500">
          თქვენზე მინიჭებული ლიდები ჩამონათვალშია. აიღეთ უპატრონო ლიდი, რომ სიაში გამოჩნდეს.
        </p>
      </div>
    );
  }

  const peak = Math.max(1, ...brokers.map(b => b.openLeads));

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">ბროკერების დატვირთვა</p>
        <button
          onClick={onDistribute}
          disabled={distributing || unassigned === 0 || brokers.length === 0}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white transition-opacity disabled:opacity-40"
          title={unassigned === 0 ? 'უპატრონო ლიდი არ არის' : 'თანაბრად გაანაწილე უპატრონო ლიდები'}
        >
          <Shuffle size={13} />
          {distributing ? 'ნაწილდება…' : `განაწილება (${unassigned})`}
        </button>
      </div>

      <div className="max-h-[168px] space-y-1.5 overflow-y-auto pr-1">
        {brokers.map(broker => (
          <div key={broker.userId} className="flex items-center gap-2.5">
            <Avatar name={broker.name} size={26} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-bold text-slate-700">{broker.name}</p>
                <div className="flex items-center gap-1.5 text-[10px] font-bold">
                  {broker.breached > 0 && <span className="text-red-500">{broker.breached} დაგვ.</span>}
                  <span className="text-slate-400">{broker.conversionRate}%</span>
                  <span className="w-6 text-right text-slate-700">{broker.openLeads}</span>
                </div>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(broker.openLeads / peak) * 100}%`,
                    background: broker.breached > 0 ? '#ef4444' : '#2563eb',
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Inbox row ───────────────────────────────────────────────────────────── */

function LeadRow({
  lead,
  currentUserId,
  canClaim,
  onOpen,
  onClaim,
}: {
  lead: Lead;
  currentUserId: number;
  canClaim: boolean;
  onOpen: () => void;
  onClaim: () => void;
}) {
  const kindMeta = KIND_META[lead.kind];
  const KindIcon = kindMeta.icon;
  const mine = lead.assignedToUserId === currentUserId;

  return (
    <div
      onClick={onOpen}
      className={`group flex cursor-pointer items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        lead.slaBreached ? 'border-red-200' : 'border-slate-100'
      }`}
    >
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
        style={{ background: kindMeta.bg, color: kindMeta.text }}
      >
        <KindIcon size={17} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-sm font-bold text-slate-800">
            {lead.name || lead.phone || lead.email || `#${lead.id}`}
          </p>
          <StageChip stage={lead.stage} />
          {lead.slaBreached && (
            <Chip label={`დაგვიანება ${duration(lead.responseMinutes)}`} bg="#fee2e2" text="#b91c1c" icon={<AlertTriangle size={10} />} />
          )}
          {lead.preferredAt && (
            <Chip label={when(lead.preferredAt)} bg="#fef3c7" text="#b45309" icon={<CalendarClock size={10} />} />
          )}
        </div>

        <p className="mt-0.5 truncate text-xs text-slate-500">
          {lead.propertyTitle ? `${lead.propertyId} · ${lead.propertyTitle}` : lead.subject || lead.message || kindMeta.label}
        </p>
      </div>

      <div className="hidden flex-shrink-0 text-right sm:block">
        <p className="text-[11px] font-bold text-slate-600">
          {lead.assignedToName ?? <span className="text-amber-600">უპატრონო</span>}
        </p>
        <p className="text-[10px] text-slate-400">{when(lead.createdAt)}</p>
      </div>

      {canClaim && !mine && !lead.assignedToUserId && (
        <button
          onClick={e => { e.stopPropagation(); onClaim(); }}
          className="flex-shrink-0 rounded-xl bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-700 transition-colors hover:bg-blue-100"
        >
          აღება
        </button>
      )}
    </div>
  );
}

/* ── Detail drawer ───────────────────────────────────────────────────────── */

function LeadDrawer({
  api,
  showToast,
  lead,
  events,
  brokers,
  rights,
  currentUserId,
  onClose,
  onChanged,
}: {
  api: (path: string, options?: RequestInit) => Promise<unknown>;
  showToast: (message: string, type?: 'success' | 'error') => void;
  lead: Lead;
  events: LeadEvent[];
  brokers: LeadBrokerLoad[];
  rights: { assign: boolean; manage: boolean; contact: boolean; viewAll: boolean };
  currentUserId: number;
  onClose: () => void;
  onChanged: (result: { data: Lead; events?: LeadEvent[] }) => void;
}) {
  const [note, setNote] = useState('');
  const [noteKind, setNoteKind] = useState<LeadEventKind>('call');
  const [busy, setBusy] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [askingLost, setAskingLost] = useState(false);

  const kindMeta = KIND_META[lead.kind];
  const nextStage = useMemo(() => {
    const index = PIPELINE.indexOf(lead.stage);
    return index >= 0 && index < PIPELINE.length - 1 ? PIPELINE[index + 1] : null;
  }, [lead.stage]);

  const call = async (path: string, options: RequestInit) => {
    setBusy(true);
    try {
      const result = (await api(path, options)) as { data: Lead; events?: LeadEvent[] };
      onChanged(result);
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ვერ მოხერხდა', 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const logEvent = async () => {
    if (!note.trim()) return;
    const ok = await call(`/desk/leads/${lead.id}/events`, {
      method: 'POST',
      body: JSON.stringify({ kind: noteKind, body: note.trim() }),
    });
    if (ok) { setNote(''); showToast('ჩანაწერი დაემატა'); }
  };

  const moveTo = async (stage: LeadStage, reason?: string) => {
    const ok = await call(`/desk/leads/${lead.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ stage, lostReason: reason }),
    });
    if (ok) { setAskingLost(false); setLostReason(''); showToast(`სტატუსი: ${STAGE_META[stage].label}`); }
  };

  const assignTo = async (userId: number | null) => {
    const ok = await call(`/desk/leads/${lead.id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    if (ok) showToast(userId ? 'ლიდი გადაეცა' : 'მინიჭება მოიხსნა');
  };

  return (
    <DeskModal
      title={lead.name || lead.phone || lead.email || `ლიდი #${lead.id}`}
      subtitle={`${kindMeta.label} · ${when(lead.createdAt)}`}
      onClose={onClose}
      width="max-w-4xl"
      footer={
        <div className="flex flex-wrap items-center gap-2">
          {rights.manage && nextStage && (
            <button
              onClick={() => moveTo(nextStage)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {STAGE_META[nextStage].label}-ზე გადატანა
              <ArrowRight size={14} />
            </button>
          )}
          {rights.manage && lead.stage !== 'lost' && lead.stage !== 'won' && (
            <button
              onClick={() => setAskingLost(v => !v)}
              disabled={busy}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              დაკარგულად მონიშვნა
            </button>
          )}
          <button onClick={onClose} className="ml-auto rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">
            დახურვა
          </button>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        {/* Left: who and what */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <StageChip stage={lead.stage} />
              <Chip label={kindMeta.label} bg={kindMeta.bg} text={kindMeta.text} />
              {lead.slaBreached && (
                <Chip label={`დაგვიანება ${duration(lead.responseMinutes)}`} bg="#fee2e2" text="#b91c1c" />
              )}
              {lead.firstResponseAt && (
                <Chip label={`პასუხი ${duration(lead.responseMinutes)}-ში`} bg="#dcfce7" text="#15803d" />
              )}
            </div>

            <dl className="space-y-2 text-sm">
              {rights.contact && lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-400" />
                  <a href={`tel:${lead.phone}`} className="font-bold text-slate-800 hover:text-blue-600">{lead.phone}</a>
                </div>
              )}
              {rights.contact && lead.email && (
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-slate-400" />
                  <a href={`mailto:${lead.email}`} className="font-bold text-slate-800 hover:text-blue-600">{lead.email}</a>
                </div>
              )}
              {!rights.contact && (
                <p className="text-xs text-slate-400">საკონტაქტო მონაცემების ნახვის უფლება არ გაქვთ</p>
              )}
              {lead.preferredAt && (
                <div className="flex items-center gap-2">
                  <CalendarClock size={14} className="text-amber-500" />
                  <span className="font-bold text-slate-800">სასურველი დრო: {when(lead.preferredAt)}</span>
                </div>
              )}
            </dl>

            {lead.message && (
              <p className="mt-3 whitespace-pre-wrap rounded-xl bg-white p-3 text-sm leading-relaxed text-slate-700">
                {lead.message}
              </p>
            )}

            {lead.propertyId && (
              <a
                href={`/property/${lead.propertyId}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-blue-300"
              >
                <Building2 size={16} className="text-blue-600" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-800">{lead.propertyTitle ?? lead.propertyId}</p>
                  <p className="text-[11px] text-slate-400">{lead.propertyId}</p>
                </div>
              </a>
            )}

            {lead.sourceUrl && (
              <p className="mt-2 truncate text-[11px] text-slate-400" title={lead.sourceUrl}>
                წყარო: {lead.sourceUrl}
              </p>
            )}
          </div>

          {rights.assign && (
            <Field label="პასუხისმგებელი ბროკერი">
              <select
                value={lead.assignedToUserId ?? ''}
                onChange={e => assignTo(e.target.value ? Number(e.target.value) : null)}
                disabled={busy}
                className={selectCls}
              >
                <option value="">— უპატრონო —</option>
                {brokers.map(broker => (
                  <option key={broker.userId} value={broker.userId}>
                    {broker.name} ({broker.openLeads} ღია)
                  </option>
                ))}
              </select>
            </Field>
          )}

          {!rights.assign && rights.manage && !lead.assignedToUserId && (
            <button
              onClick={() => assignTo(currentUserId)}
              disabled={busy}
              className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white disabled:opacity-50"
            >
              ლიდის აღება
            </button>
          )}

          {askingLost && (
            <div className="rounded-2xl border border-red-100 bg-red-50/60 p-3">
              <Field label="რატომ დაიკარგა?">
                <input
                  value={lostReason}
                  onChange={e => setLostReason(e.target.value)}
                  placeholder="მაგ. იაფი ვარიანტი იპოვა"
                  className={inputCls}
                />
              </Field>
              <button
                onClick={() => moveTo('lost', lostReason)}
                disabled={busy || !lostReason.trim()}
                className="mt-2 w-full rounded-xl bg-red-500 py-2 text-xs font-bold text-white disabled:opacity-40"
              >
                დადასტურება
              </button>
            </div>
          )}
        </div>

        {/* Right: timeline */}
        <div className="space-y-3">
          {rights.manage && (
            <div className="rounded-2xl border border-slate-100 p-3">
              <div className="mb-2 flex gap-1.5">
                {(['call', 'email', 'meeting', 'note'] as LeadEventKind[]).map(k => {
                  const meta = EVENT_META[k];
                  const Icon = meta.icon;
                  const active = noteKind === k;
                  return (
                    <button
                      key={k}
                      onClick={() => setNoteKind(k)}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                        active ? 'text-white' : 'text-slate-500 hover:bg-slate-50'
                      }`}
                      style={active ? { background: meta.color } : undefined}
                    >
                      <Icon size={12} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                placeholder={noteKind === 'note' ? 'შიდა კომენტარი…' : 'რა შედგა საუბარში?'}
                className={`${inputCls} resize-none`}
              />
              <button
                onClick={logEvent}
                disabled={busy || !note.trim()}
                className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 text-xs font-bold text-white disabled:opacity-40"
              >
                <Send size={13} />
                დამატება
              </button>
              {noteKind !== 'note' && lead.stage === 'new' && (
                <p className="mt-1.5 text-[11px] text-slate-400">
                  პირველი კონტაქტი ავტომატურად გადაიტანს სტატუსს „დაკავშირებულში“
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            {events.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">ისტორია ცარიელია</p>
            ) : (
              events.map(event => {
                const meta = EVENT_META[event.kind] ?? EVENT_META.note;
                const Icon = meta.icon;
                return (
                  <div key={event.id} className="flex gap-2.5">
                    <div
                      className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                      style={{ background: `${meta.color}14`, color: meta.color }}
                    >
                      <Icon size={13} />
                    </div>
                    <div className="min-w-0 flex-1 rounded-xl bg-slate-50 px-3 py-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[11px] font-bold text-slate-600">
                          {event.actorName ?? 'სისტემა'}
                        </p>
                        <p className="flex-shrink-0 text-[10px] text-slate-400">{when(event.createdAt)}</p>
                      </div>
                      {event.body && <p className="mt-0.5 whitespace-pre-wrap text-xs text-slate-700">{event.body}</p>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {lead.stage === 'won' && (
        <p className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-2.5 text-xs font-bold text-emerald-700">
          <Check size={14} />
          ეს ლიდი დაიხურა როგორც მოგებული
        </p>
      )}
    </DeskModal>
  );
}
