/**
 * Tasks board — everything the team owes, bucketed by how late it is. Managers see
 * the whole desk; brokers see what is theirs or what they were mentioned in.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AtSign,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Flame,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  User,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  TASK_KIND_LABEL,
  TASK_PRIORITY_COLOR,
  TASK_PRIORITY_LABEL,
  roleLabel,
} from '../../../lib/permissions';
import { formatGeorgianShortDate } from '../../../lib/dateFormat';
import type { DeskBoardProps, DeskTask, StaffOption } from './types';
import TaskComposer from './TaskComposer';
import {
  Chip,
  DeskModal,
  EmptyState,
  Spinner,
  StatTile,
  Thumb,
  inputCls,
  selectCls,
} from './ui';
import { relativeDays } from './format';

type Bucket = 'overdue' | 'today' | 'week' | 'later' | 'noDate' | 'done';

const BUCKET_META: Record<Bucket, { label: string; tone: string }> = {
  overdue: { label: 'ვადაგადაცილებული', tone: 'text-red-600' },
  today: { label: 'დღეს', tone: 'text-amber-600' },
  week: { label: 'ამ კვირაში', tone: 'text-blue-600' },
  later: { label: 'მოგვიანებით', tone: 'text-slate-600' },
  noDate: { label: 'ვადის გარეშე', tone: 'text-slate-400' },
  done: { label: 'დასრულებული', tone: 'text-green-600' },
};

const BUCKET_ORDER: Bucket[] = ['overdue', 'today', 'week', 'later', 'noDate', 'done'];

function bucketOf(task: DeskTask): Bucket {
  if (task.status !== 'open') return 'done';
  if (task.daysUntilDue === null) return 'noDate';
  if (task.daysUntilDue < 0) return 'overdue';
  if (task.daysUntilDue === 0) return 'today';
  if (task.daysUntilDue <= 7) return 'week';
  return 'later';
}

export default function TasksBoard({
  api,
  showToast,
  onCountsChanged,
  currentUserId,
  canAssignOthers,
}: DeskBoardProps & { currentUserId: number; canAssignOthers: boolean }) {
  const [tasks, setTasks] = useState<DeskTask[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [seesTeam, setSeesTeam] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [statusFilter, setStatusFilter] = useState<'open' | 'done' | 'all'>('open');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [search, setSearch] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: statusFilter });
      if (assigneeFilter) params.set('assignee', assigneeFilter);
      if (onlyOverdue) params.set('overdue', '1');

      const data = await api(`/desk/tasks?${params}`) as { data: DeskTask[]; seesTeam: boolean };
      setTasks(data.data ?? []);
      setSeesTeam(Boolean(data.seesTeam));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    } finally {
      setLoading(false);
    }
  }, [api, showToast, statusFilter, assigneeFilter, onlyOverdue]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    let cancelled = false;
    api('/desk/staff-options')
      .then(data => {
        if (!cancelled) setStaff((data as { data: StaffOption[] }).data ?? []);
      })
      .catch(() => { /* the composer degrades to self-assignment */ });
    return () => { cancelled = true; };
  }, [api]);

  const patchTask = useCallback(async (id: number, patch: Record<string, unknown>, message: string) => {
    setBusy(true);
    try {
      const updated = await api(`/desk/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }) as DeskTask;
      setTasks(prev => prev.map(task => (task.id === id ? { ...task, ...updated } : task)));
      onCountsChanged();
      showToast(message);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    } finally {
      setBusy(false);
    }
  }, [api, showToast, onCountsChanged]);

  const removeTask = useCallback(async (id: number) => {
    setBusy(true);
    try {
      await api(`/desk/tasks/${id}`, { method: 'DELETE' });
      setTasks(prev => prev.filter(task => task.id !== id));
      onCountsChanged();
      showToast('დავალება წაიშალა');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'შეცდომა', 'error');
    } finally {
      setBusy(false);
    }
  }, [api, showToast, onCountsChanged]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tasks;
    return tasks.filter(task =>
      task.title.toLowerCase().includes(term)
      || (task.note ?? '').toLowerCase().includes(term)
      || (task.propertyTitle ?? '').toLowerCase().includes(term)
      || task.propertyId.toLowerCase().includes(term)
      || (task.assigneeName ?? '').toLowerCase().includes(term));
  }, [tasks, search]);

  const grouped = useMemo(() => {
    const map = new Map<Bucket, DeskTask[]>();
    for (const task of visible) {
      const bucket = bucketOf(task);
      const list = map.get(bucket);
      if (list) list.push(task);
      else map.set(bucket, [task]);
    }
    return map;
  }, [visible]);

  const openTasks = tasks.filter(task => task.status === 'open');
  const overdue = openTasks.filter(task => task.daysUntilDue !== null && task.daysUntilDue < 0);
  const mine = openTasks.filter(task => task.assignedToUserId === currentUserId);
  const dueToday = openTasks.filter(task => task.daysUntilDue === 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="ღია დავალება" value={openTasks.length} tone="blue" icon={<ClipboardList size={14} />}
          hint={seesTeam ? 'მთელი გუნდი' : 'ჩემი და ჩემი განცხადებები'} />
        <StatTile label="ვადაგადაცილებული" value={overdue.length} tone={overdue.length ? 'red' : 'green'}
          icon={<Flame size={14} />} onClick={() => setOnlyOverdue(value => !value)} active={onlyOverdue} />
        <StatTile label="დღეს" value={dueToday.length} tone="amber" icon={<CalendarDays size={14} />} />
        <StatTile label="ჩემზეა" value={mine.length} tone="slate" icon={<User size={14} />}
          onClick={() => setAssigneeFilter(assigneeFilter ? '' : String(currentUserId))}
          active={assigneeFilter === String(currentUserId)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(['open', 'done', 'all'] as const).map(value => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              statusFilter === value ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {value === 'open' ? 'ღია' : value === 'done' ? 'დასრულებული' : 'ყველა'}
          </button>
        ))}

        {seesTeam && (
          <select
            value={assigneeFilter}
            onChange={event => setAssigneeFilter(event.target.value)}
            className={`${selectCls} max-w-52`}
          >
            <option value="">ყველა შემსრულებელი</option>
            {staff.map(member => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
        )}

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="დავალება, განცხადება…"
            className={`${inputCls} pl-9`}
          />
        </div>

        <button
          onClick={() => setComposerOpen(true)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-700"
        >
          <Plus size={14} />ახალი დავალება
        </button>
      </div>

      {loading ? <Spinner /> : visible.length === 0 ? (
        <EmptyState icon={<CheckCircle2 size={22} />} title="დავალება არ არის"
          hint="შექმენით პირველი დავალება — მაგალითად „დაურეკე მესაკუთრეს პარასკევს“" />
      ) : (
        <div className="space-y-5">
          {BUCKET_ORDER.map(bucket => {
            const list = grouped.get(bucket);
            if (!list?.length) return null;
            const meta = BUCKET_META[bucket];
            return (
              <div key={bucket}>
                <p className={`mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide ${meta.tone}`}>
                  {meta.label}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{list.length}</span>
                </p>
                <div className="space-y-2">
                  {list.map(task => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      staff={staff}
                      busy={busy}
                      canAssignOthers={canAssignOthers}
                      onComplete={() => void patchTask(task.id, { status: 'done' }, 'დავალება დასრულდა')}
                      onReopen={() => void patchTask(task.id, { status: 'open' }, 'დავალება ხელახლა გაიხსნა')}
                      onReassign={id => void patchTask(task.id, { assignedToUserId: id }, 'შემსრულებელი შეიცვალა')}
                      onDueChange={value => void patchTask(task.id, { dueAt: value || null }, 'ვადა განახლდა')}
                      onDelete={() => void removeTask(task.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {composerOpen && (
        <DeskModal title="ახალი დავალება" onClose={() => setComposerOpen(false)} width="max-w-xl">
          <TaskComposer
            api={api}
            staff={staff.length ? staff : []}
            canAssignOthers={canAssignOthers}
            currentUserId={currentUserId}
            onCreated={task => {
              setTasks(prev => [task, ...prev]);
              setComposerOpen(false);
              onCountsChanged();
              showToast('დავალება შეიქმნა');
            }}
            onError={message => showToast(message, 'error')}
          />
        </DeskModal>
      )}
    </div>
  );
}

function TaskRow({
  task,
  staff,
  busy,
  canAssignOthers,
  onComplete,
  onReopen,
  onReassign,
  onDueChange,
  onDelete,
}: {
  task: DeskTask;
  staff: StaffOption[];
  busy: boolean;
  canAssignOthers: boolean;
  onComplete: () => void;
  onReopen: () => void;
  onReassign: (id: number) => void;
  onDueChange: (value: string) => void;
  onDelete: () => void;
}) {
  const done = task.status !== 'open';
  const due = relativeDays(task.daysUntilDue);
  const priority = TASK_PRIORITY_COLOR[task.priority] ?? TASK_PRIORITY_COLOR.normal;
  const mentioned = (task.mentionedUserIds ?? [])
    .map(id => staff.find(member => member.id === id)?.name)
    .filter(Boolean);

  return (
    <div
      className={`rounded-2xl border bg-white p-3.5 shadow-sm transition-colors ${
        done ? 'border-slate-100 opacity-70' : due.overdue ? 'border-red-200' : 'border-slate-100'
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          disabled={busy}
          onClick={done ? onReopen : onComplete}
          title={done ? 'ხელახლა გახსნა' : 'დასრულება'}
          className={`mt-0.5 rounded-lg p-1.5 transition-colors ${
            done ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-400 hover:bg-green-100 hover:text-green-700'
          }`}
        >
          {done ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />}
        </button>

        <Thumb src={task.propertyImage} size={44} />

        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
            {task.title}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
            <Link
              to={`/admin/listings/${task.propertyId}`}
              className="font-mono font-bold text-slate-500 hover:text-blue-600 hover:underline"
            >
              {task.propertyId}
            </Link>
            <span className="max-w-[220px] truncate">{task.propertyTitle}</span>
            {task.propertyDistrict && <span>{task.propertyDistrict}</span>}
          </div>

          {task.note && <p className="mt-1.5 whitespace-pre-line text-xs text-slate-600">{task.note}</p>}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
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
            {done && task.completedByName && (
              <Chip label={`დაასრულა ${task.completedByName}`} bg="#dcfce7" text="#166534" />
            )}
            {task.createdByName && (
              <span className="text-[10px] text-slate-400">დაავალა {task.createdByName}</span>
            )}
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
          {!done && canAssignOthers && staff.length > 0 && (
            <select
              value={task.assignedToUserId ?? ''}
              onChange={event => onReassign(Number(event.target.value))}
              className="max-w-36 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 focus:outline-none"
            >
              {staff.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name} — {roleLabel(member.role)}
                </option>
              ))}
            </select>
          )}
          {!done && (
            <input
              type="date"
              value={task.dueAt ?? ''}
              onChange={event => onDueChange(event.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-600 focus:outline-none"
            />
          )}
          <button
            disabled={busy}
            onClick={onDelete}
            title="წაშლა"
            className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
