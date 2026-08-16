/**
 * Per-listing work panel — the tasks and the call journal for a single listing,
 * opened straight from the listings table so a broker never has to leave it.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  AtSign,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Phone,
  PhoneCall,
  Plus,
  RotateCcw,
  Trash2,
  User,
} from 'lucide-react';
import {
  CALL_OUTCOME_COLOR,
  CALL_OUTCOME_LABEL,
  TASK_KIND_LABEL,
  TASK_PRIORITY_COLOR,
  TASK_PRIORITY_LABEL,
} from '../../../lib/permissions';
import { formatGeorgianDateTime, formatGeorgianShortDate } from '../../../lib/dateFormat';
import type { CallLog, DeskTask, StaffOption } from './types';
import TaskComposer from './TaskComposer';
import { Chip, DeskModal, Field, inputCls, selectCls } from './ui';
import { relativeDays } from './format';

type Tab = 'tasks' | 'calls';

export default function ListingWorkPanel({
  propertyId,
  propertyTitle,
  ownerPhone,
  api,
  showToast,
  currentUserId,
  canAssignOthers,
  canLogCalls,
  onClose,
}: {
  propertyId: string;
  propertyTitle: string;
  ownerPhone?: string | null;
  api: (path: string, options?: RequestInit) => Promise<unknown>;
  showToast: (message: string, type?: 'success' | 'error') => void;
  currentUserId: number;
  canAssignOthers: boolean;
  canLogCalls: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('tasks');
  const [tasks, setTasks] = useState<DeskTask[]>([]);
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [busy, setBusy] = useState(false);

  const [outcome, setOutcome] = useState('reached');
  const [callNote, setCallNote] = useState('');
  const [followUpAt, setFollowUpAt] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [taskData, callData, staffData] = await Promise.all([
        api(`/desk/tasks?status=all&propertyId=${encodeURIComponent(propertyId)}`),
        canLogCalls ? api(`/desk/listings/${propertyId}/calls`) : Promise.resolve({ data: [] }),
        api('/desk/staff-options'),
      ]);
      setTasks((taskData as { data: DeskTask[] }).data ?? []);
      setCalls((callData as { data: CallLog[] }).data ?? []);
      setStaff((staffData as { data: StaffOption[] }).data ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, propertyId, canLogCalls, showToast]);

  useEffect(() => { void load(); }, [load]);

  async function toggleTask(task: DeskTask) {
    setBusy(true);
    try {
      const updated = await api(`/desk/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: task.status === 'open' ? 'done' : 'open' }),
      }) as DeskTask;
      setTasks(prev => prev.map(item => (item.id === task.id ? { ...item, ...updated } : item)));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function removeTask(id: number) {
    setBusy(true);
    try {
      await api(`/desk/tasks/${id}`, { method: 'DELETE' });
      setTasks(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function logCall() {
    setBusy(true);
    try {
      const result = await api(`/desk/listings/${propertyId}/calls`, {
        method: 'POST',
        body: JSON.stringify({ outcome, note: callNote, followUpAt: followUpAt || null }),
      }) as { call: CallLog };
      setCalls(prev => [result.call, ...prev]);
      setCallNote('');
      setFollowUpAt('');
      showToast('ზარი დაფიქსირდა');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    } finally {
      setBusy(false);
    }
  }

  const openCount = tasks.filter(task => task.status === 'open').length;

  return (
    <DeskModal
      title={propertyTitle}
      subtitle={`${propertyId} · სამუშაო პანელი`}
      onClose={onClose}
      width="max-w-2xl"
    >
      <div className="mb-4 flex items-center gap-2">
        <TabButton active={tab === 'tasks'} onClick={() => setTab('tasks')}
          icon={<ClipboardList size={13} />} label={`დავალებები${openCount ? ` (${openCount})` : ''}`} />
        {canLogCalls && (
          <TabButton active={tab === 'calls'} onClick={() => setTab('calls')}
            icon={<PhoneCall size={13} />} label={`ზარები${calls.length ? ` (${calls.length})` : ''}`} />
        )}
        {ownerPhone && (
          <a
            href={`tel:${ownerPhone}`}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-green-700"
          >
            <Phone size={12} />{ownerPhone}
          </a>
        )}
      </div>

      {loading ? (
        <p className="py-10 text-center text-xs text-slate-400">იტვირთება…</p>
      ) : tab === 'tasks' ? (
        <div className="space-y-3">
          {composing ? (
            <div className="rounded-2xl border border-slate-200 p-4">
              <TaskComposer
                api={api}
                staff={staff}
                canAssignOthers={canAssignOthers}
                currentUserId={currentUserId}
                lockedProperty={{ id: propertyId, title: propertyTitle }}
                onCreated={task => {
                  setTasks(prev => [task, ...prev]);
                  setComposing(false);
                  showToast('დავალება შეიქმნა');
                }}
                onError={message => showToast(message, 'error')}
              />
              <button
                onClick={() => setComposing(false)}
                className="mt-2 w-full text-[11px] font-bold text-slate-400 hover:underline"
              >
                გაუქმება
              </button>
            </div>
          ) : (
            <button
              onClick={() => setComposing(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-3 text-xs font-bold text-slate-500 transition-colors hover:border-blue-400 hover:text-blue-600"
            >
              <Plus size={14} />დავალების დამატება
            </button>
          )}

          {tasks.length === 0 ? (
            <p className="rounded-xl bg-slate-50 py-6 text-center text-xs text-slate-400">
              ამ განცხადებაზე დავალება არ არის
            </p>
          ) : (
            <ul className="space-y-2">
              {tasks.map(task => {
                const done = task.status !== 'open';
                const due = relativeDays(task.daysUntilDue);
                const priority = TASK_PRIORITY_COLOR[task.priority] ?? TASK_PRIORITY_COLOR.normal;
                const mentioned = (task.mentionedUserIds ?? [])
                  .map(id => staff.find(member => member.id === id)?.name)
                  .filter(Boolean);

                return (
                  <li
                    key={task.id}
                    className={`flex items-start gap-2.5 rounded-xl border p-3 ${
                      done ? 'border-slate-100 opacity-70' : due.overdue ? 'border-red-200' : 'border-slate-100'
                    }`}
                  >
                    <button
                      disabled={busy}
                      onClick={() => void toggleTask(task)}
                      className={`mt-0.5 rounded-lg p-1.5 transition-colors ${
                        done ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400 hover:bg-green-100 hover:text-green-700'
                      }`}
                    >
                      {done ? <RotateCcw size={13} /> : <CheckCircle2 size={13} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold ${done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        {task.title}
                      </p>
                      {task.note && <p className="mt-1 whitespace-pre-line text-[11px] text-slate-600">{task.note}</p>}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Chip label={TASK_KIND_LABEL[task.kind] ?? task.kind} bg="#f1f5f9" text="#475569" />
                        <Chip label={TASK_PRIORITY_LABEL[task.priority] ?? task.priority} bg={priority.bg} text={priority.text} />
                        {task.assigneeName && (
                          <Chip label={task.assigneeName} bg="#e0e7ff" text="#3730a3" icon={<User size={9} />} />
                        )}
                        {mentioned.length > 0 && (
                          <Chip label={mentioned.join(', ')} bg="#f5f3ff" text="#5b21b6" icon={<AtSign size={9} />} />
                        )}
                        {!done && task.dueAt && (
                          <Chip
                            label={`${formatGeorgianShortDate(task.dueAt)} · ${due.text}`}
                            bg={due.overdue ? '#fee2e2' : '#f1f5f9'}
                            text={due.overdue ? '#991b1b' : '#475569'}
                            icon={<CalendarDays size={9} />}
                          />
                        )}
                      </div>
                    </div>
                    <button
                      disabled={busy}
                      onClick={() => void removeTask(task.id)}
                      className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="ზარის შედეგი">
                <select value={outcome} onChange={event => setOutcome(event.target.value)} className={selectCls}>
                  {Object.entries(CALL_OUTCOME_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Field>
              <Field label="შემდეგი ზარი">
                <input type="date" value={followUpAt} onChange={event => setFollowUpAt(event.target.value)} className={inputCls} />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="შენიშვნა">
                <textarea value={callNote} onChange={event => setCallNote(event.target.value)} rows={2} className={inputCls} />
              </Field>
            </div>
            <button
              disabled={busy}
              onClick={() => void logCall()}
              className="mt-3 w-full rounded-xl bg-green-600 py-2.5 text-xs font-bold text-white transition-colors hover:bg-green-700 disabled:opacity-40"
            >
              ზარის დაფიქსირება
            </button>
          </div>

          {calls.length === 0 ? (
            <p className="rounded-xl bg-slate-50 py-6 text-center text-xs text-slate-400">ჯერ არავის დაურეკავს</p>
          ) : (
            <ol className="space-y-2">
              {calls.map(entry => {
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
      )}
    </DeskModal>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition-colors ${
        active ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
      }`}
    >
      {icon}{label}
    </button>
  );
}
