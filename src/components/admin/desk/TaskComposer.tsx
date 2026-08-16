/**
 * Task composer — "call the owner Friday", pointed at a listing, at a person, with
 * a due date. Typing "@" in the note pulls a colleague into the task.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { AtSign, Loader2, MapPin, Search, X } from 'lucide-react';
import { TASK_KIND_LABEL, TASK_PRIORITY_LABEL, roleLabel } from '../../../lib/permissions';
import type { DeskTask, StaffOption } from './types';
import { Avatar, Chip, Field, Thumb, inputCls, selectCls } from './ui';

interface ListingHit {
  id: string;
  title: string;
  city: string | null;
  district: string | null;
  image: string | null;
  lifecycleState: string;
}

/** Shortcuts for the dates a manager actually picks. */
function dateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function nextFriday(): string {
  const date = new Date();
  const delta = (5 - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + delta);
  return date.toISOString().slice(0, 10);
}

const DUE_PRESETS: { label: string; value: () => string }[] = [
  { label: 'დღეს', value: () => dateOffset(0) },
  { label: 'ხვალ', value: () => dateOffset(1) },
  { label: 'პარასკევს', value: nextFriday },
  { label: '1 კვირაში', value: () => dateOffset(7) },
];

export default function TaskComposer({
  api,
  staff,
  canAssignOthers,
  currentUserId,
  lockedProperty,
  onCreated,
  onError,
}: {
  api: (path: string, options?: RequestInit) => Promise<unknown>;
  staff: StaffOption[];
  canAssignOthers: boolean;
  currentUserId: number;
  /** When set, the task is bound to this listing and the picker is hidden. */
  lockedProperty?: { id: string; title: string };
  onCreated: (task: DeskTask) => void;
  onError: (message: string) => void;
}) {
  const [propertyId, setPropertyId] = useState(lockedProperty?.id ?? '');
  const [propertyLabel, setPropertyLabel] = useState(lockedProperty?.title ?? '');
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<ListingHit[]>([]);
  const [searching, setSearching] = useState(false);

  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('call');
  const [priority, setPriority] = useState('normal');
  const [assignee, setAssignee] = useState(String(currentUserId));
  const [dueAt, setDueAt] = useState(nextFriday());
  const [note, setNote] = useState('');
  const [mentions, setMentions] = useState<number[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (lockedProperty || query.trim().length < 2) {
      setHits([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      api(`/desk/listing-search?q=${encodeURIComponent(query.trim())}`)
        .then(data => setHits((data as { data: ListingHit[] }).data ?? []))
        .catch(() => setHits([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => { clearTimeout(timer); setSearching(false); };
  }, [api, query, lockedProperty]);

  const mentionMatches = useMemo(() => {
    if (mentionQuery === null) return [];
    const term = mentionQuery.toLowerCase();
    return staff
      .filter(member => member.id !== Number(assignee))
      .filter(member => !term || member.name.toLowerCase().includes(term))
      .slice(0, 6);
  }, [mentionQuery, staff, assignee]);

  /** Tracks the "@word" the caret currently sits in, if any. */
  function handleNote(value: string) {
    setNote(value);
    const caret = noteRef.current?.selectionStart ?? value.length;
    const token = value.slice(0, caret).split(/\s/).pop() ?? '';
    setMentionQuery(token.startsWith('@') ? token.slice(1) : null);
  }

  function insertMention(member: StaffOption) {
    const caret = noteRef.current?.selectionStart ?? note.length;
    const before = note.slice(0, caret);
    const after = note.slice(caret);
    const replaced = before.replace(/@\S*$/, `@${member.name} `);
    setNote(replaced + after);
    setMentions(prev => (prev.includes(member.id) ? prev : [...prev, member.id]));
    setMentionQuery(null);
    requestAnimationFrame(() => noteRef.current?.focus());
  }

  async function submit() {
    if (!propertyId) {
      onError('აირჩიეთ განცხადება');
      return;
    }
    if (!title.trim()) {
      onError('დავალების სათაური სავალდებულოა');
      return;
    }

    setSaving(true);
    try {
      const created = await api('/desk/tasks', {
        method: 'POST',
        body: JSON.stringify({
          propertyId,
          title: title.trim(),
          kind,
          priority,
          assignedToUserId: Number(assignee),
          dueAt: dueAt || null,
          note: note.trim() || null,
          mentionedUserIds: mentions,
        }),
      }) as DeskTask;

      onCreated(created);
      setTitle('');
      setNote('');
      setMentions([]);
      if (!lockedProperty) {
        setPropertyId('');
        setPropertyLabel('');
        setQuery('');
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'შეცდომა');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {!lockedProperty && (
        <Field label="განცხადება">
          {propertyId ? (
            <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
              <span className="font-mono text-[11px] font-bold text-blue-800">{propertyId}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-slate-700">{propertyLabel}</span>
              <button
                onClick={() => { setPropertyId(''); setPropertyLabel(''); setQuery(''); }}
                className="rounded-lg p-1 text-slate-400 hover:bg-white"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="მოძებნეთ ID-ით, სათაურით ან რაიონით…"
                className={`${inputCls} pl-9`}
              />
              {searching && <Loader2 size={14} className="absolute right-3 top-3 animate-spin text-slate-400" />}
              {hits.length > 0 && (
                <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                  {hits.map(hit => (
                    <li key={hit.id}>
                      <button
                        onClick={() => { setPropertyId(hit.id); setPropertyLabel(hit.title); setHits([]); }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-50"
                      >
                        <Thumb src={hit.image} size={32} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-bold text-slate-800">{hit.title}</span>
                          <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <span className="font-mono">{hit.id}</span>
                            <MapPin size={9} />{hit.district || hit.city || '—'}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Field>
      )}

      <Field label="დავალება">
        <input
          value={title}
          onChange={event => setTitle(event.target.value)}
          placeholder="დაურეკე მესაკუთრეს პარასკევს"
          className={inputCls}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="ტიპი">
          <select value={kind} onChange={event => setKind(event.target.value)} className={selectCls}>
            {Object.entries(TASK_KIND_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>
        <Field label="პრიორიტეტი">
          <select value={priority} onChange={event => setPriority(event.target.value)} className={selectCls}>
            {Object.entries(TASK_PRIORITY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>
        <Field label="შემსრულებელი">
          <select
            value={assignee}
            onChange={event => setAssignee(event.target.value)}
            disabled={!canAssignOthers}
            className={`${selectCls} disabled:bg-slate-50 disabled:text-slate-400`}
          >
            {staff.map(member => (
              <option key={member.id} value={member.id}>
                {member.name} — {roleLabel(member.role)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="ვადა">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={dueAt}
            onChange={event => setDueAt(event.target.value)}
            className={`${inputCls} max-w-44`}
          />
          {DUE_PRESETS.map(preset => (
            <button
              key={preset.label}
              onClick={() => setDueAt(preset.value())}
              className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
            >
              {preset.label}
            </button>
          ))}
          {dueAt && (
            <button onClick={() => setDueAt('')} className="text-[11px] font-bold text-slate-400 hover:underline">
              ვადის გარეშე
            </button>
          )}
        </div>
      </Field>

      <Field label="შენიშვნა" hint="დაწერეთ @ და აირჩიეთ კოლეგა, რომ დავალებაში ჩართოთ">
        <div className="relative">
          <textarea
            ref={noteRef}
            value={note}
            onChange={event => handleNote(event.target.value)}
            rows={3}
            placeholder="დეტალები… @"
            className={inputCls}
          />
          {mentionMatches.length > 0 && (
            <ul className="absolute z-20 mt-1 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              {mentionMatches.map(member => (
                <li key={member.id}>
                  <button
                    onClick={() => insertMention(member)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-50"
                  >
                    <Avatar name={member.name} photo={member.avatarUrl} size={26} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-slate-800">{member.name}</span>
                      <span className="text-[11px] text-slate-400">{roleLabel(member.role)}</span>
                    </span>
                    <AtSign size={12} className="text-slate-300" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Field>

      {mentions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400">ჩართულები:</span>
          {mentions.map(id => {
            const member = staff.find(item => item.id === id);
            return (
              <button
                key={id}
                onClick={() => setMentions(prev => prev.filter(item => item !== id))}
                className="inline-flex items-center gap-1"
              >
                <Chip label={member?.name ?? String(id)} bg="#e0e7ff" text="#3730a3" icon={<X size={9} />} />
              </button>
            );
          })}
        </div>
      )}

      <button
        disabled={saving}
        onClick={() => void submit()}
        className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-700 disabled:opacity-40"
      >
        {saving ? 'ინახება…' : 'დავალების შექმნა'}
      </button>
    </div>
  );
}
