/**
 * Manager desk — the operational half of the panel, grouped into one section so
 * the navigation stays short. Tabs appear only for the permissions the actor holds.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  Inbox,
  LayoutGrid,
  PhoneCall,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import AssignBoard from './AssignBoard';
import CallbackBoard from './CallbackBoard';
import LeadsBoard from './LeadsBoard';
import ModerationInbox from './ModerationInbox';
import PerformanceBoard from './PerformanceBoard';
import TasksBoard from './TasksBoard';
import type { DeskSummary } from './types';

export type DeskTab = 'leads' | 'assign' | 'callback' | 'moderation' | 'tasks' | 'performance';

interface TabDef {
  id: DeskTab;
  label: string;
  hint: string;
  icon: LucideIcon;
  permission: string;
  /** Which summary counter to show as a badge. */
  badge?: keyof DeskSummary;
  urgent?: keyof DeskSummary;
}

const TABS: TabDef[] = [
  {
    id: 'leads',
    label: 'ლიდები',
    hint: 'საიტიდან მოსული მოთხოვნები — ვის რა ევალება და ვინ დააგვიანა',
    icon: Inbox,
    permission: 'leads.view',
    badge: 'openLeads',
    urgent: 'leadsBreached',
  },
  {
    id: 'tasks',
    label: 'დავალებები',
    hint: 'რა ევალება გუნდს და რა არის ვადაგადაცილებული',
    icon: ClipboardList,
    permission: 'listings.tasks',
    badge: 'myOpenTasks',
    urgent: 'overdueTasks',
  },
  {
    id: 'callback',
    label: 'დასარეკები',
    hint: 'გაქირავებული და ვადაგასული ობიექტების მესაკუთრეები',
    icon: PhoneCall,
    permission: 'listings.tasks',
    badge: 'callbacksDue',
  },
  {
    id: 'moderation',
    label: 'მოდერაცია',
    hint: 'მომხმარებლების განცხადებები SLA ტაიმერით',
    icon: ShieldCheck,
    permission: 'listings.moderate',
    badge: 'pendingModeration',
    urgent: 'slaBreached',
  },
  {
    id: 'assign',
    label: 'განაწილება',
    hint: 'გადაათრიეთ განცხადება ბროკერზე ან გადააბით ჯგუფურად',
    icon: LayoutGrid,
    permission: 'listings.assign',
    badge: 'unassigned',
  },
  {
    id: 'performance',
    label: 'შედეგები',
    hint: 'ბროკერების მაჩვენებლები და ბოლო აქტივობა',
    icon: TrendingUp,
    permission: 'analytics.full',
  },
];

const EMPTY_SUMMARY: DeskSummary = {
  unassigned: 0,
  pendingModeration: 0,
  slaBreached: 0,
  callbacksDue: 0,
  overdueTasks: 0,
  myOpenTasks: 0,
  openLeads: 0,
  unassignedLeads: 0,
  leadsBreached: 0,
};

export default function AdminDeskSection({
  api,
  showToast,
  initialTab,
}: {
  api: (path: string, options?: RequestInit) => Promise<unknown>;
  showToast: (message: string, type?: 'success' | 'error') => void;
  initialTab?: DeskTab;
}) {
  const { user, can } = useAdminAuth();
  const [summary, setSummary] = useState<DeskSummary>(EMPTY_SUMMARY);

  const tabs = useMemo(() => TABS.filter(tab => can(tab.permission)), [can]);
  const [tab, setTab] = useState<DeskTab>(initialTab ?? 'leads');

  useEffect(() => {
    if (tabs.length > 0 && !tabs.some(item => item.id === tab)) {
      setTab(tabs[0].id);
    }
  }, [tabs, tab]);

  const refreshSummary = useCallback(() => {
    api('/desk/summary')
      .then(data => setSummary({ ...EMPTY_SUMMARY, ...(data as DeskSummary) }))
      .catch(() => { /* badges are decoration; never block the board */ });
  }, [api]);

  useEffect(() => { refreshSummary(); }, [refreshSummary]);

  const boardProps = { api, showToast, onCountsChanged: refreshSummary };
  const canAssignOthers = can('listings.assign');
  const active = tabs.find(item => item.id === tab);

  if (tabs.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
        <p className="text-sm font-bold text-slate-700">ამ სექციაზე წვდომა არ გაქვთ</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-extrabold text-slate-800">მენეჯერის დესკი</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {active?.hint ?? 'ყოველდღიური ოპერაციები ერთ ადგილას'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(item => {
          const Icon = item.icon;
          const count = item.badge ? summary[item.badge] : 0;
          const urgent = item.urgent ? summary[item.urgent] : 0;
          const isActive = tab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon size={15} />
              {item.label}
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              )}
              {urgent > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                  {urgent}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'leads' && <LeadsBoard {...boardProps} currentUserId={user?.id ?? 0} />}
      {tab === 'tasks' && (
        <TasksBoard
          {...boardProps}
          currentUserId={user?.id ?? 0}
          canAssignOthers={canAssignOthers}
        />
      )}
      {tab === 'callback' && <CallbackBoard {...boardProps} />}
      {tab === 'moderation' && <ModerationInbox {...boardProps} />}
      {tab === 'assign' && <AssignBoard {...boardProps} />}
      {tab === 'performance' && <PerformanceBoard {...boardProps} />}
    </div>
  );
}
