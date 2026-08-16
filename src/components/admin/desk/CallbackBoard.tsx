/**
 * Call-back desk — one board for parked rentals, expired terms and any listing
 * whose follow-up date has come due. Shows the owner's number, the last note and
 * who made the last call, and records the next one.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlarmClock,
  CalendarClock,
  Phone,
  PhoneCall,
  PhoneOff,
  Search,
  User,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  CALL_OUTCOME_COLOR,
  CALL_OUTCOME_LABEL,
  LIFECYCLE_LABEL,
} from '../../../lib/permissions';
import { formatGeorgianDateTime, formatGeorgianShortDate } from '../../../lib/dateFormat';
import type { CallLog, CallbackBuckets, CallbackListing, DeskBoardProps } from './types';
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
import { relativeDays } from './format';

type Filter = 'all' | 'expired' | 'followUpDue' | 'expiringSoon' | 'neverCalled';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'ყველა' },
  { id: 'expired', label: 'ვადა ამოიწურა' },
  { id: 'followUpDue', label: 'დღეს დასარეკია' },
  { id: 'expiringSoon', label: 'ვადა იწურება (30 დღე)' },
  { id: 'neverCalled', label: 'არასდროს დაურეკეს' },
];

function matches(row: CallbackListing, filter: Filter): boolean {
  switch (filter) {
    case 'expired':
      return row.lifecycleState === 'new_r';
    case 'followUpDue':
      return row.daysUntilFollowUp !== null && row.daysUntilFollowUp <= 0;
    case 'expiringSoon':
      return row.lifecycleState === 'old'
        && row.daysUntilExpiry !== null
        && row.daysUntilExpiry >= 0
        && row.daysUntilExpiry <= 30;
    case 'neverCalled':
      return row.lastCallAt === null;
    default:
      return true;
  }
}

export default function CallbackBoard({ api, showToast, onCountsChanged }: DeskBoardProps) {
  const [rows, setRows] = useState<CallbackListing[]>([]);
  const [buckets, setBuckets] = useState<CallbackBuckets>({
    expired: 0, followUpDue: 0, expiringSoon: 0, neverCalled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<CallbackListing | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/desk/callbacks') as { data: CallbackListing[]; buckets: CallbackBuckets };
      setRows(data.data ?? []);
      setBuckets(data.buckets);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, showToast]);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows
      .filter(row => matches(row, filter))
      .filter(row => !term
        || row.id.toLowerCase().includes(term)
        || row.title.toLowerCase().includes(term)
        || (row.district ?? '').toLowerCase().includes(term)
        || (row.owner?.name ?? '').toLowerCase().includes(term)
        || (row.owner?.phone ?? '').includes(term));
  }, [rows, filter, search]);

  /** Applies the listing changes a logged call caused, without a full reload. */
  const applyCall = useCallback((propertyId: string, patch: Partial<CallbackListing>) => {
    setRows(prev => prev.map(row => (row.id === propertyId ? { ...row, ...patch } : row)));
    setActive(prev => (prev && prev.id === propertyId ? { ...prev, ...patch } : prev));
    onCountsChanged();
  }, [onCountsChanged]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="ვადა ამოიწურა" value={buckets.expired} tone="red" icon={<AlarmClock size={14} />}
          hint="დასარეკია ახლა" onClick={() => setFilter('expired')} active={filter === 'expired'} />
        <StatTile label="დღეს დასარეკია" value={buckets.followUpDue} tone="amber" icon={<PhoneCall size={14} />}
          hint="დაგეგმილი ზარი" onClick={() => setFilter('followUpDue')} active={filter === 'followUpDue'} />
        <StatTile label="ვადა იწურება" value={buckets.expiringSoon} tone="blue" icon={<CalendarClock size={14} />}
          hint="30 დღეში" onClick={() => setFilter('expiringSoon')} active={filter === 'expiringSoon'} />
        <StatTile label="არასდროს დაურეკეს" value={buckets.neverCalled} tone="slate" icon={<PhoneOff size={14} />}
          onClick={() => setFilter('neverCalled')} active={filter === 'neverCalled'} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(item => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              filter === item.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {item.label}
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="ID, სათაური, მესაკუთრე, ნომერი…"
            className={`${inputCls} pl-9`}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={<PhoneCall size={22} />} title="დასარეკი არაფერია"
          hint="ყველა ქირავნობის ვადა ძალაშია და დაგეგმილი ზარები შესრულებულია" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">განცხადება</th>
                  <th className="px-3 py-2.5">მესაკუთრე</th>
                  <th className="px-3 py-2.5">ვადა</th>
                  <th className="px-3 py-2.5">ბოლო ზარი</th>
                  <th className="px-3 py-2.5">შემდეგი</th>
                  <th className="px-3 py-2.5">ბროკერი</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {visible.map(row => {
                  const followUp = relativeDays(row.daysUntilFollowUp);
                  const expiry = relativeDays(row.daysUntilExpiry);
                  const outcomeTone = row.lastCall
                    ? CALL_OUTCOME_COLOR[row.lastCall.outcome] ?? { bg: '#f1f5f9', text: '#475569' }
                    : null;

                  return (
                    <tr
                      key={row.id}
                      onClick={() => setActive(row)}
                      className="cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Thumb src={row.images?.[0]} size={40} />
                          <div className="min-w-0">
                            <p className="max-w-[240px] truncate text-xs font-bold text-slate-800">{row.title}</p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              <span className="font-mono">{row.id}</span> · {row.district || row.city || '—'}
                            </p>
                            <div className="mt-1 flex gap-1">
                              <Chip label={GEL(row.rentPrice ?? row.price)} bg="#eff6ff" text="#1d4ed8" />
                              <Chip
                                label={LIFECYCLE_LABEL[row.lifecycleState] ?? row.lifecycleState}
                                bg={row.lifecycleState === 'new_r' ? '#fee2e2' : '#e2e8f0'}
                                text={row.lifecycleState === 'new_r' ? '#991b1b' : '#475569'}
                              />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {row.owner?.phone ? (
                          <>
                            <p className="text-xs font-semibold text-slate-700">{row.owner.name || 'მესაკუთრე'}</p>
                            <a
                              href={`tel:${row.owner.phone}`}
                              onClick={event => event.stopPropagation()}
                              className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                            >
                              <Phone size={11} />{row.owner.phone}
                            </a>
                          </>
                        ) : (
                          <p className="text-[11px] text-slate-400">
                            {row.owner ? 'ნომერი არ არის' : 'დამალულია'}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {row.rentExpiresAt ? (
                          <>
                            <p className="text-xs text-slate-600">{formatGeorgianShortDate(row.rentExpiresAt)}</p>
                            <p className={`text-[11px] font-bold ${expiry.overdue ? 'text-red-600' : 'text-slate-400'}`}>
                              {expiry.text}
                            </p>
                          </>
                        ) : <span className="text-[11px] text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-3 max-w-[220px]">
                        {row.lastCall && outcomeTone ? (
                          <>
                            <Chip
                              label={CALL_OUTCOME_LABEL[row.lastCall.outcome] ?? row.lastCall.outcome}
                              bg={outcomeTone.bg}
                              text={outcomeTone.text}
                            />
                            {row.lastCall.note && (
                              <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">{row.lastCall.note}</p>
                            )}
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {row.lastCall.actorName} · {row.lastCall.createdAt ? formatGeorgianDateTime(row.lastCall.createdAt) : ''}
                            </p>
                          </>
                        ) : (
                          <span className="text-[11px] font-bold text-amber-600">არასდროს დაურეკეს</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {row.nextFollowUpAt ? (
                          <>
                            <p className="text-xs text-slate-600">{formatGeorgianShortDate(row.nextFollowUpAt)}</p>
                            <p className={`text-[11px] font-bold ${followUp.overdue ? 'text-red-600' : 'text-slate-400'}`}>
                              {followUp.text}
                            </p>
                          </>
                        ) : <span className="text-[11px] text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-3">
                        {row.assigneeName ? (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                            <User size={11} className="text-slate-400" />{row.assigneeName}
                          </span>
                        ) : <Chip label="გაუნაწილებელი" bg="#fef3c7" text="#92400e" />}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={event => { event.stopPropagation(); setActive(row); }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-slate-700"
                        >
                          <PhoneCall size={12} />ზარი
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {active && (
        <CallModal
          listing={active}
          api={api}
          showToast={showToast}
          onClose={() => setActive(null)}
          onLogged={applyCall}
        />
      )}
    </div>
  );
}

const NEXT_STATE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'სტატუსი უცვლელი' },
  { value: 'current', label: 'აქტიური — ხელახლა გამოქვეყნება' },
  { value: 'old', label: 'გაქირავებული — ვადის დაფიქსირება' },
  { value: 'new_r', label: 'დასარეკია — გადავდოთ' },
  { value: 'new', label: 'ახალი — თავიდან დამუშავება' },
];

function CallModal({
  listing,
  api,
  showToast,
  onClose,
  onLogged,
}: {
  listing: CallbackListing;
  api: DeskBoardProps['api'];
  showToast: DeskBoardProps['showToast'];
  onClose: () => void;
  onLogged: (propertyId: string, patch: Partial<CallbackListing>) => void;
}) {
  const [journal, setJournal] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [outcome, setOutcome] = useState('reached');
  const [note, setNote] = useState('');
  const [followUpAt, setFollowUpAt] = useState('');
  const [lifecycleState, setLifecycleState] = useState('');
  const [rentTermMonths, setRentTermMonths] = useState('');
  const [rentStartedAt, setRentStartedAt] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api(`/desk/listings/${listing.id}/calls`)
      .then(data => {
        if (!cancelled) setJournal((data as { data: CallLog[] }).data ?? []);
      })
      .catch(() => { if (!cancelled) setJournal([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [api, listing.id]);

  async function submit() {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { outcome, note, followUpAt: followUpAt || null };
      if (lifecycleState) {
        payload.lifecycleState = lifecycleState;
        if (rentTermMonths) payload.rentTermMonths = Number(rentTermMonths);
        if (rentStartedAt) payload.rentStartedAt = rentStartedAt;
      }

      const result = await api(`/desk/listings/${listing.id}/calls`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }) as { call: CallLog; listing: Partial<CallbackListing> };

      setJournal(prev => [result.call, ...prev]);
      onLogged(listing.id, {
        lastCallAt: result.call.createdAt,
        lastCallOutcome: result.call.outcome,
        nextFollowUpAt: result.call.followUpAt,
        lifecycleState: result.listing.lifecycleState ?? listing.lifecycleState,
        rentExpiresAt: result.listing.rentExpiresAt ?? listing.rentExpiresAt,
        daysUntilFollowUp: null,
        lastCall: {
          outcome: result.call.outcome,
          note: result.call.note,
          actorName: result.call.actorName,
          createdAt: result.call.createdAt,
          followUpAt: result.call.followUpAt,
        },
      });

      setNote('');
      setFollowUpAt('');
      setLifecycleState('');
      showToast('ზარი დაფიქსირდა');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    } finally {
      setSaving(false);
    }
  }

  const parked = lifecycleState === 'old' || lifecycleState === 'new_r';

  return (
    <DeskModal
      title={listing.title}
      subtitle={`${listing.id} · ${listing.district || listing.city || ''}`}
      onClose={onClose}
      width="max-w-2xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <Link
            to={`/admin/listings/${listing.id}`}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:underline"
          >
            განცხადების რედაქტირება →
          </Link>
          <button
            disabled={saving}
            onClick={() => void submit()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-green-700 disabled:opacity-40"
          >
            <PhoneCall size={14} />ზარის დაფიქსირება
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {listing.owner && (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">მესაკუთრე</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5">
              <p className="text-sm font-bold text-slate-800">{listing.owner.name || '—'}</p>
              {listing.owner.phone && (
                <a href={`tel:${listing.owner.phone}`} className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:underline">
                  <Phone size={13} />{listing.owner.phone}
                </a>
              )}
              {listing.owner.email && (
                <span className="text-xs text-slate-500">{listing.owner.email}</span>
              )}
            </div>
            {listing.owner.note && <p className="mt-2 text-xs text-slate-500">{listing.owner.note}</p>}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ზარის შედეგი">
            <select value={outcome} onChange={event => setOutcome(event.target.value)} className={selectCls}>
              {Object.entries(CALL_OUTCOME_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="შემდეგი ზარი" hint="ცარიელი = დაგეგმილი ზარი არ არის">
            <input type="date" value={followUpAt} onChange={event => setFollowUpAt(event.target.value)} className={inputCls} />
          </Field>
        </div>

        <Field label="შენიშვნა">
          <textarea
            value={note}
            onChange={event => setNote(event.target.value)}
            rows={3}
            placeholder="რა თქვა მესაკუთრემ…"
            className={inputCls}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="სტატუსის შეცვლა">
            <select value={lifecycleState} onChange={event => setLifecycleState(event.target.value)} className={selectCls}>
              {NEXT_STATE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>
          {parked && (
            <div className="grid grid-cols-2 gap-2">
              <Field label="ვადა (თვე)">
                <input
                  type="number"
                  min={1}
                  value={rentTermMonths}
                  onChange={event => setRentTermMonths(event.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="დაიწყო">
                <input
                  type="date"
                  value={rentStartedAt}
                  onChange={event => setRentStartedAt(event.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            ზარების ისტორია {journal.length > 0 && `(${journal.length})`}
          </p>
          {loading ? (
            <p className="py-4 text-center text-xs text-slate-400">იტვირთება…</p>
          ) : journal.length === 0 ? (
            <p className="rounded-xl bg-slate-50 py-4 text-center text-xs text-slate-400">
              ჯერ არავის დაურეკავს
            </p>
          ) : (
            <ol className="space-y-2">
              {journal.map(entry => {
                const tone = CALL_OUTCOME_COLOR[entry.outcome] ?? { bg: '#f1f5f9', text: '#475569' };
                return (
                  <li key={entry.id} className="rounded-xl border border-slate-100 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip label={CALL_OUTCOME_LABEL[entry.outcome] ?? entry.outcome} bg={tone.bg} text={tone.text} />
                      <span className="text-[11px] font-semibold text-slate-600">{entry.actorName || '—'}</span>
                      <span className="text-[11px] text-slate-400">
                        {entry.createdAt ? formatGeorgianDateTime(entry.createdAt) : ''}
                      </span>
                      {entry.followUpAt && (
                        <span className="ml-auto text-[11px] font-bold text-blue-600">
                          → {formatGeorgianShortDate(entry.followUpAt)}
                        </span>
                      )}
                    </div>
                    {entry.note && <p className="mt-1.5 text-xs text-slate-600">{entry.note}</p>}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </DeskModal>
  );
}
