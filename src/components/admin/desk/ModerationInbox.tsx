/**
 * Moderation inbox — member submissions with a waiting clock, a photo checklist,
 * reusable wording, and three ways out: publish, send back for changes, or reject.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CheckCircle,
  Clock,
  Image as ImageIcon,
  Mail,
  MapPin,
  Phone,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Timer,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  MODERATION_CHECKS,
  MODERATION_COLOR,
  MODERATION_LABEL,
} from '../../../lib/permissions';
import { formatGeorgianDateTime, formatGeorgianShortDate } from '../../../lib/dateFormat';
import type { DeskBoardProps, ModerationListing, ModerationTemplate } from './types';
import {
  Chip,
  DeskModal,
  EmptyState,
  Field,
  GEL,
  Spinner,
  StatTile,
  Thumb,
  inputCls,
  selectCls,
} from './ui';

type Decision = 'approve' | 'changes' | 'reject';

const STATUS_TABS: { id: string; label: string }[] = [
  { id: 'pending', label: 'განხილვაში' },
  { id: 'changes_requested', label: 'დასაზუსტებელი' },
  { id: 'rejected', label: 'უარყოფილი' },
  { id: 'approved', label: 'გამოქვეყნებული' },
];

const TYPE_LABELS: Record<string, string> = {
  apartment: 'ბინა', house: 'სახლი', commercial: 'კომერციული', land: 'მიწა', villa: 'ვილა',
};

function waitLabel(hours: number): string {
  if (hours < 1) return 'ახლახან';
  if (hours < 24) return `${Math.round(hours)} სთ`;
  const days = Math.floor(hours / 24);
  return `${days} დღე ${Math.round(hours - days * 24)} სთ`;
}

export default function ModerationInbox({ api, showToast, onCountsChanged }: DeskBoardProps) {
  const [status, setStatus] = useState('pending');
  const [rows, setRows] = useState<ModerationListing[]>([]);
  const [templates, setTemplates] = useState<ModerationTemplate[]>([]);
  const [slaHours, setSlaHours] = useState(24);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<ModerationListing | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (nextStatus: string) => {
    setLoading(true);
    try {
      const data = await api(`/desk/moderation?status=${nextStatus}`) as {
        data: ModerationListing[];
        slaHours: number;
      };
      setRows(data.data ?? []);
      setSlaHours(data.slaHours ?? 24);
      setSelected(new Set());
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, showToast]);

  useEffect(() => { void load(status); }, [load, status]);

  useEffect(() => {
    let cancelled = false;
    api('/desk/moderation/templates')
      .then(data => {
        if (!cancelled) setTemplates((data as { data: ModerationTemplate[] }).data ?? []);
      })
      .catch(() => { /* templates are a convenience, not a blocker */ });
    return () => { cancelled = true; };
  }, [api]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(row =>
      row.id.toLowerCase().includes(term)
      || row.title.toLowerCase().includes(term)
      || (row.district ?? '').toLowerCase().includes(term)
      || (row.submitter?.name ?? '').toLowerCase().includes(term)
      || (row.submitter?.email ?? '').toLowerCase().includes(term));
  }, [rows, search]);

  const breached = rows.filter(row => row.slaBreached).length;
  const oldest = rows.reduce((max, row) => Math.max(max, row.waitingHours), 0);

  const decide = useCallback(async (
    id: string,
    decision: Decision,
    note: string,
    checklist: Record<string, boolean>,
  ) => {
    setBusy(true);
    try {
      await api(`/desk/moderation/${id}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision, note, checklist }),
      });
      setRows(prev => prev.filter(row => row.id !== id));
      setActive(null);
      onCountsChanged();
      showToast(decision === 'approve'
        ? 'განცხადება გამოქვეყნდა'
        : decision === 'changes'
          ? 'დაბრუნდა ავტორთან დასაზუსტებლად'
          : 'განცხადება უარყოფილია');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    } finally {
      setBusy(false);
    }
  }, [api, showToast, onCountsChanged]);

  async function bulkApprove() {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const result = await api('/desk/moderation/bulk-approve', {
        method: 'POST',
        body: JSON.stringify({ propertyIds: [...selected] }),
      }) as { updated: number; ids: string[] };
      setRows(prev => prev.filter(row => !result.ids.includes(row.id)));
      setSelected(new Set());
      onCountsChanged();
      showToast(`${result.updated} განცხადება გამოქვეყნდა`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="რიგში" value={rows.length} tone={rows.length ? 'amber' : 'green'} icon={<Clock size={14} />}
          hint={MODERATION_LABEL[status] ?? status} />
        <StatTile label={`SLA გადაცილება`} value={breached} tone={breached ? 'red' : 'green'}
          icon={<ShieldAlert size={14} />} hint={`${slaHours} სთ-ზე მეტი`} />
        <StatTile label="ყველაზე ძველი" value={oldest ? waitLabel(oldest) : '—'} tone={oldest > slaHours ? 'red' : 'slate'}
          icon={<Timer size={14} />} />
        <StatTile label="მონიშნული" value={selected.size} tone={selected.size ? 'blue' : 'slate'}
          icon={<Sparkles size={14} />} hint="ჯგუფური გამოქვეყნება" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setStatus(tab.id)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              status === tab.id ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="ID, სათაური, ავტორი…"
            className={`${inputCls} pl-9`}
          />
        </div>
      </div>

      {selected.size > 0 && status === 'pending' && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm font-bold text-green-900">{selected.size} მონიშნული</p>
          <button
            disabled={busy}
            onClick={() => void bulkApprove()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-green-700 disabled:opacity-40"
          >
            <CheckCircle size={14} />ყველას გამოქვეყნება
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs font-bold text-slate-500 hover:underline"
          >
            გასუფთავება
          </button>
        </div>
      )}

      {loading ? <Spinner /> : visible.length === 0 ? (
        <EmptyState
          icon={<CheckCircle size={22} />}
          title={status === 'pending' ? 'რიგი ცარიელია' : 'ჩანაწერი არ არის'}
          hint={status === 'pending' ? 'ყველა განაცხადი განხილულია' : undefined}
        />
      ) : (
        <div className="grid gap-3">
          {visible.map(row => (
            <QueueCard
              key={row.id}
              row={row}
              slaHours={slaHours}
              selected={selected.has(row.id)}
              onToggle={() => toggle(row.id)}
              onReview={() => setActive(row)}
            />
          ))}
        </div>
      )}

      {active && (
        <ReviewModal
          row={active}
          templates={templates}
          busy={busy}
          onClose={() => setActive(null)}
          onDecide={decide}
        />
      )}
    </div>
  );
}

function QueueCard({
  row,
  slaHours,
  selected,
  onToggle,
  onReview,
}: {
  row: ModerationListing;
  slaHours: number;
  selected: boolean;
  onToggle: () => void;
  onReview: () => void;
}) {
  const tone = MODERATION_COLOR[row.moderationStatus] ?? MODERATION_COLOR.draft;

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-colors ${
        row.slaBreached ? 'border-red-200' : selected ? 'border-blue-300' : 'border-slate-100'
      }`}
    >
      {row.slaBreached && (
        <div className="flex items-center gap-1.5 bg-red-50 px-4 py-1.5 text-[11px] font-bold text-red-700">
          <ShieldAlert size={12} />
          {slaHours} საათზე მეტია რიგში — {waitLabel(row.waitingHours)}
        </div>
      )}
      <div className="flex flex-col sm:flex-row">
        <div className="flex items-start gap-2 p-4 pb-0 sm:pb-4 sm:pr-0">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="mt-1 h-4 w-4 accent-blue-600"
          />
        </div>
        <button onClick={onReview} className="h-32 w-full flex-shrink-0 bg-slate-100 sm:h-auto sm:w-40">
          {row.images?.[0]
            ? <img src={row.images[0]} alt="" className="h-full w-full object-cover" />
            : <div className="flex h-full w-full items-center justify-center text-slate-300"><ImageIcon size={26} /></div>}
        </button>

        <div className="min-w-0 flex-1 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-800">{row.title}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="font-mono">{row.id}</span>
                <MapPin size={10} />{row.district || row.city || '—'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip label={MODERATION_LABEL[row.moderationStatus] ?? row.moderationStatus} bg={tone.bg} text={tone.text} />
              <Chip
                label={waitLabel(row.waitingHours)}
                bg={row.slaBreached ? '#fee2e2' : '#f1f5f9'}
                text={row.slaBreached ? '#991b1b' : '#475569'}
                icon={<Clock size={10} />}
              />
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
            <span className="font-bold text-blue-700">{GEL(row.price)}</span>
            {row.area && <span>{row.area} მ²</span>}
            {Boolean(row.bedrooms) && <span>{row.bedrooms} ოთახი</span>}
            <span>{TYPE_LABELS[row.type ?? ''] ?? row.type}</span>
            <span className={row.photoCount < 5 ? 'font-bold text-amber-600' : ''}>
              {row.photoCount} ფოტო
            </span>
          </div>

          {row.submitter && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
              <span className="font-bold text-slate-700">{row.submitter.name}</span>
              <span className="flex items-center gap-1"><Mail size={10} />{row.submitter.email}</span>
              {row.submitter.phone && <span className="flex items-center gap-1"><Phone size={10} />{row.submitter.phone}</span>}
              {row.submitter.approvedCount > 0 && (
                <Chip label={`${row.submitter.approvedCount} დადასტურებული`} bg="#dcfce7" text="#166534"
                  icon={<BadgeCheck size={10} />} />
              )}
              {row.submitter.rejectedCount > 0 && (
                <Chip label={`${row.submitter.rejectedCount} უარყოფილი`} bg="#fee2e2" text="#991b1b" />
              )}
            </div>
          )}

          {row.moderationNote && (
            <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              <b>ბოლო კომენტარი:</b> {row.moderationNote}
              {row.moderatedAt && <span className="text-amber-600"> · {formatGeorgianDateTime(row.moderatedAt)}</span>}
            </p>
          )}

          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <button
              onClick={onReview}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-700"
            >
              <Sparkles size={14} />განხილვა
            </button>
            <Link
              to={`/admin/listings/${row.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
            >
              რედაქტირება
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewModal({
  row,
  templates,
  busy,
  onClose,
  onDecide,
}: {
  row: ModerationListing;
  templates: ModerationTemplate[];
  busy: boolean;
  onClose: () => void;
  onDecide: (id: string, decision: Decision, note: string, checklist: Record<string, boolean>) => void;
}) {
  const [checklist, setChecklist] = useState<Record<string, boolean>>(row.moderationChecklist ?? {});
  const [note, setNote] = useState('');
  const [template, setTemplate] = useState('');
  const [gallery, setGallery] = useState(0);

  const passed = MODERATION_CHECKS.filter(item => checklist[item.key]).length;
  const allPassed = passed === MODERATION_CHECKS.length;
  const failed = MODERATION_CHECKS.filter(item => checklist[item.key] === false);

  function applyTemplate(id: string) {
    setTemplate(id);
    const found = templates.find(item => String(item.id) === id);
    if (found) setNote(found.body);
  }

  /** Pre-fills the reason from whatever checklist items were ticked as failing. */
  function noteFromChecklist() {
    if (failed.length === 0) return;
    setNote(`გასწორებას საჭიროებს:\n${failed.map(item => `• ${item.label}`).join('\n')}`);
  }

  const approveTemplates = templates.filter(item => item.kind === 'approve');
  const rejectTemplates = templates.filter(item => item.kind === 'reject');

  return (
    <DeskModal
      title={row.title}
      subtitle={`${row.id} · ${row.district || row.city || ''} · ${GEL(row.price)}`}
      onClose={onClose}
      width="max-w-4xl"
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled={busy}
            onClick={() => onDecide(row.id, 'approve', note, checklist)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-green-700 disabled:opacity-40"
          >
            <CheckCircle size={14} />გამოქვეყნება
          </button>
          <button
            disabled={busy || !note.trim()}
            onClick={() => onDecide(row.id, 'changes', note, checklist)}
            title={note.trim() ? undefined : 'მიზეზი სავალდებულოა'}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
          >
            <RotateCcw size={14} />ავტორს დასაზუსტებლად
          </button>
          <button
            disabled={busy || !note.trim()}
            onClick={() => onDecide(row.id, 'reject', note, checklist)}
            title={note.trim() ? undefined : 'მიზეზი სავალდებულოა'}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40"
          >
            <XCircle size={14} />უარყოფა
          </button>
          <p className={`ml-auto text-[11px] font-bold ${allPassed ? 'text-green-600' : 'text-slate-400'}`}>
            ჩეკლისტი {passed}/{MODERATION_CHECKS.length}
          </p>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl bg-slate-100">
            {row.images?.length ? (
              <img src={row.images[gallery]} alt="" className="h-64 w-full object-cover" />
            ) : (
              <div className="flex h-64 items-center justify-center text-slate-300"><ImageIcon size={34} /></div>
            )}
          </div>
          {(row.images?.length ?? 0) > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {row.images!.map((src, index) => (
                <button
                  key={src}
                  onClick={() => setGallery(index)}
                  className={`rounded-lg ring-2 transition-all ${index === gallery ? 'ring-blue-500' : 'ring-transparent'}`}
                >
                  <Thumb src={src} size={52} />
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <Spec label="ფასი" value={GEL(row.price)} />
            <Spec label="ფართი" value={row.area ? `${row.area} მ²` : '—'} />
            <Spec label="ოთახი" value={row.bedrooms ?? '—'} />
            <Spec label="სართული" value={row.floor ? `${row.floor}/${row.totalFloors ?? '?'}` : '—'} />
            <Spec label="ტიპი" value={TYPE_LABELS[row.type ?? ''] ?? row.type ?? '—'} />
            <Spec label="გარიგება" value={row.status === 'rent' ? 'ქირავდება' : row.status === 'both' ? 'ორივე' : 'იყიდება'} />
            <Spec label="ფოტო" value={row.photoCount} warn={row.photoCount < 5} />
            <Spec label="რუკა" value={row.coordinates ? 'დადებულია' : 'არ არის'} warn={!row.coordinates} />
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">მისამართი</p>
            <p className="text-xs text-slate-600">{row.address || row.district || row.city || '—'}</p>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">აღწერა</p>
            <p className="max-h-40 overflow-y-auto whitespace-pre-line rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
              {row.description || 'აღწერა არ არის'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {row.submitter && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">ავტორი</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{row.submitter.name}</p>
              <p className="text-[11px] text-slate-500">{row.submitter.email}</p>
              {row.submitter.phone && (
                <a href={`tel:${row.submitter.phone}`} className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline">
                  <Phone size={11} />{row.submitter.phone}
                </a>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Chip label={`${row.submitter.approvedCount} დადასტ.`} bg="#dcfce7" text="#166534" />
                <Chip label={`${row.submitter.rejectedCount} უარყ.`} bg="#fee2e2" text="#991b1b" />
              </div>
              {row.submitter.memberSince && (
                <p className="mt-2 text-[11px] text-slate-400">
                  რეგისტრაცია: {formatGeorgianShortDate(row.submitter.memberSince)}
                </p>
              )}
            </div>
          )}

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">ჩეკლისტი</p>
            <div className="space-y-1.5">
              {MODERATION_CHECKS.map(item => {
                const state = checklist[item.key];
                return (
                  <div key={item.key} className="flex items-start gap-2 rounded-xl border border-slate-100 p-2">
                    <div className="mt-0.5 flex gap-1">
                      <button
                        onClick={() => setChecklist(prev => ({ ...prev, [item.key]: true }))}
                        title="რიგზეა"
                        className={`rounded-md p-1 transition-colors ${
                          state === true ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-green-100'
                        }`}
                      >
                        <CheckCircle size={12} />
                      </button>
                      <button
                        onClick={() => setChecklist(prev => ({ ...prev, [item.key]: false }))}
                        title="პრობლემაა"
                        className={`rounded-md p-1 transition-colors ${
                          state === false ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-red-100'
                        }`}
                      >
                        <XCircle size={12} />
                      </button>
                    </div>
                    <p className="text-[11px] leading-snug text-slate-600">{item.label}</p>
                  </div>
                );
              })}
            </div>
            {failed.length > 0 && (
              <button
                onClick={noteFromChecklist}
                className="mt-2 text-[11px] font-bold text-blue-600 hover:underline"
              >
                პრობლემებიდან მიზეზის შედგენა ({failed.length})
              </button>
            )}
          </div>

          <Field label="შაბლონი">
            <select value={template} onChange={event => applyTemplate(event.target.value)} className={selectCls}>
              <option value="">აირჩიეთ მზა ტექსტი…</option>
              {approveTemplates.length > 0 && (
                <optgroup label="დადასტურება">
                  {approveTemplates.map(item => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </optgroup>
              )}
              {rejectTemplates.length > 0 && (
                <optgroup label="უარყოფა / დაზუსტება">
                  {rejectTemplates.map(item => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </Field>

          <Field label="კომენტარი ავტორისთვის" hint="უარყოფისა და დაბრუნებისას სავალდებულოა">
            <textarea
              value={note}
              onChange={event => setNote(event.target.value)}
              rows={6}
              placeholder="რა უნდა გამოასწოროს ავტორმა…"
              className={inputCls}
            />
          </Field>
        </div>
      </div>
    </DeskModal>
  );
}

function Spec({ label, value, warn }: { label: string; value: string | number; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-100 p-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 text-xs font-bold ${warn ? 'text-amber-600' : 'text-slate-700'}`}>{value}</p>
    </div>
  );
}
