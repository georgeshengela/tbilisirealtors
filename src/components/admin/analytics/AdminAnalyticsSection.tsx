/**
 * Analytics section — the reports a manager opens on purpose, rather than the
 * operational queues that live on the desk. Tabs appear only for the permissions
 * the actor actually holds.
 */
import { useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Download, MapPin, Trophy } from 'lucide-react';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';
import ImportQualityBoard from './ImportQualityBoard';
import InventoryFunnelBoard from './InventoryFunnelBoard';
import LeaderboardBoard from './LeaderboardBoard';

export type AnalyticsTab = 'inventory' | 'leaderboard' | 'imports';

interface TabDef {
  id: AnalyticsTab;
  label: string;
  hint: string;
  icon: LucideIcon;
  permission: string;
}

const TABS: TabDef[] = [
  {
    id: 'inventory',
    label: 'რაიონები და ძაბრი',
    hint: 'მარაგი რაიონების მიხედვით, გაყიდვა/ქირა და განცხადების ასაკი',
    icon: MapPin,
    permission: 'analytics.full',
  },
  {
    id: 'leaderboard',
    label: 'ბროკერების რეიტინგი',
    hint: 'ნახვები, ახალი განცხადებები და დახურული საქმეები პერიოდში',
    icon: Trophy,
    permission: 'analytics.full',
  },
  {
    id: 'imports',
    label: 'იმპორტის ხარისხი',
    hint: 'myhome.ge და ss.ge — რა ჩავარდა და რა ჩამოვიდა ნაწილობრივ',
    icon: Download,
    permission: 'analytics.imports',
  },
];

export default function AdminAnalyticsSection({
  api,
  showToast,
  initialTab,
}: {
  api: (path: string, options?: RequestInit) => Promise<unknown>;
  showToast: (message: string, type?: 'success' | 'error') => void;
  initialTab?: AnalyticsTab;
}) {
  const { can } = useAdminAuth();
  const tabs = useMemo(() => TABS.filter(tab => can(tab.permission)), [can]);
  const [tab, setTab] = useState<AnalyticsTab>(initialTab ?? 'inventory');

  useEffect(() => {
    if (tabs.length > 0 && !tabs.some(item => item.id === tab)) {
      setTab(tabs[0].id);
    }
  }, [tabs, tab]);

  const boardProps = { api, showToast };
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
        <h2 className="text-lg font-extrabold text-slate-800">ანალიტიკა</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {active?.hint ?? 'ციფრები, რომლებზეც გადაწყვეტილება მიიღება'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(item => {
          const Icon = item.icon;
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
            </button>
          );
        })}
      </div>

      {tab === 'inventory' && <InventoryFunnelBoard {...boardProps} />}
      {tab === 'leaderboard' && <LeaderboardBoard {...boardProps} />}
      {tab === 'imports' && <ImportQualityBoard {...boardProps} />}
    </div>
  );
}
