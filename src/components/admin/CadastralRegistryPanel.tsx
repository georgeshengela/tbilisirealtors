import { ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { formatGeorgianDateTime, formatGeorgianShortDate } from '../../lib/dateFormat';
import type { CadastralApplication, CadastralRegistry } from '../../lib/cadastralCode';
import { normalizeCadastralCode } from '../../lib/cadastralCode';

const NAPR_SEARCH_URL = 'https://www.my.gov.ge/ka-ge/services/10/service/176';

function naprViewUrl(appId: string): string {
  return `https://naprweb.reestri.gov.ge/#/view/${encodeURIComponent(appId)}`;
}

function StatusBadge({ status, color }: { status: string; color: string }) {
  const tone = color || '#64748b';
  return (
    <span
      className="inline-flex shrink-0 max-w-[13.5rem] items-start gap-1.5 rounded-md px-2 py-[5px] text-[10px] font-semibold leading-[1.35] tracking-[0.01em]"
      style={{
        color: tone,
        background: `color-mix(in srgb, ${tone} 11%, #ffffff)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${tone} 26%, transparent)`,
      }}
    >
      <span
        className="mt-[4px] h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: tone, boxShadow: `0 0 0 2px color-mix(in srgb, ${tone} 18%, transparent)` }}
      />
      <span className="min-w-0">{status}</span>
    </span>
  );
}

function ApplicationCard({ app }: { app: CadastralApplication }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 leading-snug">{app.transaction || 'განცხადება'}</p>
          {app.regNumber && (
            <p className="mt-1 text-xs font-semibold text-slate-500">№ {app.regNumber}</p>
          )}
        </div>
        {app.status && (
          <StatusBadge status={app.status} color={app.statusColor} />
        )}
      </div>

      <dl className="mt-3 grid gap-2 text-xs text-slate-600">
        {app.registeredAt && (
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-slate-400">რეგისტრაცია</dt>
            <dd>{formatGeorgianShortDate(app.registeredAt)}</dd>
          </div>
        )}
        {app.lastActAt && (
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-slate-400">ბოლო მოქმედება</dt>
            <dd>{formatGeorgianDateTime(app.lastActAt)}</dd>
          </div>
        )}
        {app.applicants.length > 0 && (
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-slate-400">განმცხადებელი</dt>
            <dd className="font-medium text-slate-700">{app.applicants.join(', ')}</dd>
          </div>
        )}
        {app.address && (
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-slate-400">მისამართი</dt>
            <dd>{app.address}</dd>
          </div>
        )}
      </dl>

      {app.appId && (
        <a
          href={naprViewUrl(app.appId)}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
        >
          ნახვა საჯარო რეესტრში <ExternalLink size={11} />
        </a>
      )}
    </article>
  );
}

interface Props {
  code: string;
  registry: CadastralRegistry | null;
  syncing: boolean;
  error: string;
  onSync: () => void;
}

export default function CadastralRegistryPanel({ code, registry, syncing, error, onSync }: Props) {
  const normalized = normalizeCadastralCode(code);
  const stale = Boolean(registry && normalized && registry.code !== normalized);

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onSync}
          disabled={syncing || !normalized}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {syncing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          {syncing ? 'სინქრონიზაცია...' : 'სინქრონიზაცია'}
        </button>
        <a
          href={NAPR_SEARCH_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700"
        >
          my.gov.ge რეესტრი <ExternalLink size={11} />
        </a>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
          {error}
        </p>
      )}

      {registry && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-slate-800">
                {registry.total > 0
                  ? `მოიძებნა ${registry.total} განცხადება. გვერდი 1 / ${registry.lastPage || 1}`
                  : 'განცხადებები არ მოიძებნა'}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                კოდი {registry.code}
                {registry.syncedAt ? ` · ${formatGeorgianDateTime(registry.syncedAt)}` : ''}
              </p>
            </div>
            {stale && (
              <p className="text-[11px] font-semibold text-amber-600">
                კოდი შეიცვალა — დააჭირეთ სინქს განახლებისთვის
              </p>
            )}
          </div>

          {registry.applications.length > 0 && (
            <div className="space-y-3">
              {registry.applications.map(app => (
                <ApplicationCard key={app.appId || app.regNumber} app={app} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
