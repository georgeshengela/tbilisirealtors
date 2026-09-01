/**
 * Assignment desk — drag a listing onto a broker, or tick several and reassign in
 * one go. The left rail is the intake queue of listings nobody owns yet.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  Inbox,
  Layers,
  MapPin,
  Pencil,
  Search,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { LIFECYCLE_LABEL } from '../../../lib/permissions';
import type { AssignListing, AssignStaff, DeskBoardProps } from './types';
import { Avatar, Chip, EmptyState, GEL, RoleChip, Spinner, StatTile, Thumb, inputCls, selectCls } from './ui';

const LIFECYCLE_TONE: Record<string, { bg: string; text: string }> = {
  new: { bg: '#dbeafe', text: '#1e40af' },
  current: { bg: '#dcfce7', text: '#166534' },
  old: { bg: '#e2e8f0', text: '#475569' },
  new_r: { bg: '#fee2e2', text: '#991b1b' },
};

/** Native HTML5 drag payload key. */
const DRAG_MIME = 'application/x-listing-ids';

export default function AssignBoard({ api, showToast, onCountsChanged }: DeskBoardProps) {
  const [staff, setStaff] = useState<AssignStaff[]>([]);
  const [listings, setListings] = useState<AssignListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | 'none' | null>(null);
  const [bulkTarget, setBulkTarget] = useState<string>('');

  // Ids currently being dragged; a ref because dataTransfer is unreadable on dragover.
  const dragging = useRef<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/desk/assignment') as { staff: AssignStaff[]; listings: AssignListing[] };
      setStaff(data.staff ?? []);
      setListings(data.listings ?? []);
      setSelected(new Set());
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, showToast]);

  useEffect(() => { void load(); }, [load]);

  const unassigned = useMemo(() => {
    const term = search.trim().toLowerCase();
    return listings
      .filter(row => row.assignedToUserId === null)
      .filter(row => !term
        || row.id.toLowerCase().includes(term)
        || row.title.toLowerCase().includes(term)
        || (row.district ?? '').toLowerCase().includes(term)
        || (row.city ?? '').toLowerCase().includes(term));
  }, [listings, search]);

  const byBroker = useMemo(() => {
    const map = new Map<number, AssignListing[]>();
    for (const row of listings) {
      if (row.assignedToUserId === null) continue;
      const list = map.get(row.assignedToUserId);
      if (list) list.push(row);
      else map.set(row.assignedToUserId, [row]);
    }
    return map;
  }, [listings]);

  const assign = useCallback(async (ids: string[], assignedToUserId: number | null) => {
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const result = await api('/desk/assign', {
        method: 'POST',
        body: JSON.stringify({ propertyIds: ids, assignedToUserId }),
      }) as { updated: number };

      const target = assignedToUserId === null ? null : staff.find(item => item.id === assignedToUserId) ?? null;

      setListings(prev => prev.map(row => ids.includes(row.id)
        ? { ...row, assignedToUserId, assigneeName: target?.name ?? null, assignedAt: new Date().toISOString() }
        : row));

      setStaff(prev => prev.map(member => {
        const gained = member.id === assignedToUserId ? ids.length : 0;
        const lost = ids.filter(id => listings.find(row => row.id === id)?.assignedToUserId === member.id).length;
        return gained || lost
          ? { ...member, assignedCount: Math.max(0, member.assignedCount + gained - lost) }
          : member;
      }));

      setSelected(new Set());
      onCountsChanged();
      showToast(assignedToUserId === null
        ? `${result.updated} განცხადება მოშორდა ბროკერს`
        : `${result.updated} განცხადება გადაება ${target?.name ?? ''}-ს`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
      void load();
    } finally {
      setBusy(false);
    }
  }, [api, listings, staff, showToast, onCountsChanged, load]);

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startDrag(event: React.DragEvent, id: string) {
    // Dragging a ticked card carries the whole selection with it.
    const ids = selected.has(id) ? [...selected] : [id];
    dragging.current = ids;
    event.dataTransfer.setData(DRAG_MIME, ids.join(','));
    event.dataTransfer.effectAllowed = 'move';
  }

  function handleDrop(event: React.DragEvent, target: number | null) {
    event.preventDefault();
    setDropTarget(null);
    const raw = event.dataTransfer.getData(DRAG_MIME);
    const ids = (raw ? raw.split(',') : dragging.current).filter(Boolean);
    dragging.current = [];
    void assign(ids.filter(id => listings.find(row => row.id === id)?.assignedToUserId !== target), target);
  }

  if (loading) return <Spinner />;

  const totalAssigned = listings.length - unassigned.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="გაუნაწილებელი" value={unassigned.length} tone={unassigned.length > 0 ? 'amber' : 'green'}
          icon={<Inbox size={14} />} hint="ელოდება ბროკერს" />
        <StatTile label="განაწილებული" value={totalAssigned} tone="blue" icon={<Users size={14} />} />
        <StatTile label="ბროკერები" value={staff.filter(member => member.isActive).length} tone="slate"
          icon={<UserPlus size={14} />} hint="აქტიური" />
        <StatTile label="მონიშნული" value={selected.size} tone={selected.size ? 'green' : 'slate'}
          icon={<Layers size={14} />} hint="ჯგუფური მოქმედებისთვის" />
      </div>

      {selected.size > 0 && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50/95 backdrop-blur px-4 py-3 shadow-sm">
          <p className="text-sm font-bold text-blue-900">
            {selected.size} მონიშნული
          </p>
          <select
            value={bulkTarget}
            onChange={event => setBulkTarget(event.target.value)}
            className={`${selectCls} max-w-56`}
          >
            <option value="">აირჩიეთ ბროკერი…</option>
            {staff.filter(member => member.isActive).map(member => (
              <option key={member.id} value={member.id}>
                {member.name} ({member.assignedCount})
              </option>
            ))}
          </select>
          <button
            disabled={!bulkTarget || busy}
            onClick={() => void assign([...selected], Number(bulkTarget))}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
          >
            <UserPlus size={14} />გადაბმა
          </button>
          <button
            disabled={busy}
            onClick={() => void assign([...selected], null)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
          >
            <UserMinus size={14} />მოშორება
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 hover:bg-white"
          >
            <X size={14} />გასუფთავება
          </button>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* ── Intake queue ── */}
        <div
          onDragOver={event => { event.preventDefault(); setDropTarget('none'); }}
          onDragLeave={() => setDropTarget(current => (current === 'none' ? null : current))}
          onDrop={event => handleDrop(event, null)}
          className={`rounded-2xl border bg-white shadow-sm transition-colors ${
            dropTarget === 'none' ? 'border-blue-400 ring-2 ring-blue-200' : 'border-slate-100'
          }`}
        >
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                <Inbox size={15} className="text-amber-500" />
                გაუნაწილებელი რიგი
              </h3>
              <Chip label={String(unassigned.length)} bg="#fef3c7" text="#92400e" />
            </div>
            <div className="relative mt-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="ID, სათაური, რაიონი…"
                className={`${inputCls} pl-9`}
              />
            </div>
            {unassigned.length > 0 && (
              <button
                onClick={() => setSelected(new Set(unassigned.map(row => row.id)))}
                className="mt-2 text-[11px] font-bold text-blue-600 hover:underline"
              >
                ყველას მონიშვნა ({unassigned.length})
              </button>
            )}
          </div>

          <div className="max-h-[calc(100vh-330px)] min-h-40 space-y-2 overflow-y-auto p-3">
            {unassigned.length === 0 && (
              <p className="py-10 text-center text-xs text-slate-400">
                რიგი ცარიელია — ყველა განცხადებას აქვს ბროკერი
              </p>
            )}
            {unassigned.map(row => (
              <ListingChip
                key={row.id}
                row={row}
                selected={selected.has(row.id)}
                onToggle={() => toggle(row.id)}
                onDragStart={event => startDrag(event, row.id)}
              />
            ))}
          </div>
        </div>

        {/* ── Broker drop zones ── */}
        <div className="grid gap-3 sm:grid-cols-2">
          {staff.map(member => {
            const mine = byBroker.get(member.id) ?? [];
            const isOpen = expanded === member.id;
            return (
              <div
                key={member.id}
                onDragOver={event => { event.preventDefault(); setDropTarget(member.id); }}
                onDragLeave={() => setDropTarget(current => (current === member.id ? null : current))}
                onDrop={event => handleDrop(event, member.id)}
                className={`rounded-2xl border bg-white shadow-sm transition-all ${
                  dropTarget === member.id
                    ? 'border-blue-400 ring-2 ring-blue-200 scale-[1.01]'
                    : 'border-slate-100'
                } ${member.isActive ? '' : 'opacity-60'}`}
              >
                <div className="flex items-start gap-3 p-4">
                  <Avatar name={member.name} photo={member.avatarUrl} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-slate-800">{member.name}</p>
                      <RoleChip role={member.role} />
                    </div>
                    <p className="truncate text-[11px] text-slate-400">{member.jobTitle || member.email}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Chip label={`${mine.length} განცხადება`} bg="#dbeafe" text="#1e40af" />
                      {member.attentionCount > 0 && (
                        <Chip label={`${member.attentionCount} დასარეკი`} bg="#fee2e2" text="#991b1b" />
                      )}
                      {member.openTasks > 0 && (
                        <Chip label={`${member.openTasks} დავალება`} bg="#fef3c7" text="#92400e" />
                      )}
                      {member.scope === 'own' && (
                        <Chip label="კონტაქტი საკუთარზე" bg="#f1f5f9" text="#475569" />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {selected.size > 0 && (
                      <button
                        disabled={busy}
                        onClick={() => void assign([...selected], member.id)}
                        title={`${selected.size} მონიშნულის გადაბმა`}
                        className="rounded-lg bg-blue-600 p-1.5 text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    {mine.length > 0 && (
                      <button
                        onClick={() => setExpanded(isOpen ? null : member.id)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100"
                      >
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="max-h-72 space-y-2 overflow-y-auto border-t border-slate-100 p-3">
                    {mine.map(row => (
                      <ListingChip
                        key={row.id}
                        row={row}
                        selected={selected.has(row.id)}
                        onToggle={() => toggle(row.id)}
                        onDragStart={event => startDrag(event, row.id)}
                        onUnassign={() => void assign([row.id], null)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {staff.length === 0 && (
            <div className="sm:col-span-2">
              <EmptyState icon={<Users size={22} />} title="ბროკერები არ არის" hint="დაამატეთ თანამშრომელი, რომ განცხადებები გაანაწილოთ" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ListingChip({
  row,
  selected,
  onToggle,
  onDragStart,
  onUnassign,
}: {
  row: AssignListing;
  selected: boolean;
  onToggle: () => void;
  onDragStart: (event: React.DragEvent) => void;
  onUnassign?: () => void;
}) {
  const tone = LIFECYCLE_TONE[row.lifecycleState] ?? LIFECYCLE_TONE.new;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`group flex cursor-grab items-center gap-2.5 rounded-xl border p-2 transition-colors active:cursor-grabbing ${
        selected ? 'border-blue-300 bg-blue-50' : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        onClick={event => event.stopPropagation()}
        className="h-4 w-4 flex-shrink-0 accent-blue-600"
      />
      <Thumb src={row.images?.[0]} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-slate-800">{row.title}</p>
        <p className="mt-0.5 flex items-center gap-2 truncate text-[11px] text-slate-400">
          <span className="font-mono">{row.id}</span>
          <span className="flex items-center gap-0.5"><MapPin size={9} />{row.district || row.city || '—'}</span>
          <span className="flex items-center gap-0.5"><Eye size={9} />{row.viewCount ?? 0}</span>
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <Chip label={GEL(row.price)} bg="#eff6ff" text="#1d4ed8" />
          <Chip label={LIFECYCLE_LABEL[row.lifecycleState] ?? row.lifecycleState} bg={tone.bg} text={tone.text} />
          {row.moderationStatus === 'pending' && <Chip label="მოდერაციაში" bg="#fef3c7" text="#92400e" />}
        </div>
      </div>
      <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Link
          to={`/admin/listings/${row.id}`}
          title="რედაქტირება"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <Pencil size={13} />
        </Link>
        {onUnassign && (
          <button
            onClick={onUnassign}
            title="ბროკერის მოშორება"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <UserMinus size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
