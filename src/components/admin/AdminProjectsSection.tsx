import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, HardHat, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAdminAuth, useApiRequest } from '../../contexts/AdminAuthContext';
import { invalidatePublicCache } from '../../lib/publicApi';
import {
  mapProjectFromApi,
  PROJECT_STATUS_META,
  type ConstructionProject,
  type ProjectStatus,
} from '../../lib/projects';

export default function AdminProjectsSection() {
  const navigate = useNavigate();
  const { can } = useAdminAuth();
  const api = useApiRequest();
  const [rows, setRows] = useState<ConstructionProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [q, setQ] = useState('');

  const canCreate = can('projects.create');
  const canEdit = can('projects.edit');
  const canDelete = can('projects.delete');
  const needle = q.trim().toLowerCase();
  const visible = needle
    ? rows.filter(row => `${row.name} ${row.developer} ${row.city} ${row.district} ${row.slug}`.toLowerCase().includes(needle))
    : rows;

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await api('/projects') as { data?: Record<string, unknown>[] };
      setRows((data.data ?? []).map(row => mapProjectFromApi(row)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'პროექტები ვერ ჩაიტვირთა');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function togglePublished(row: ConstructionProject) {
    if (!canEdit) return;
    setBusyId(row.id);
    try {
      const updated = await api(`/projects/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ published: row.published === false }),
      }) as Record<string, unknown>;
      const mapped = mapProjectFromApi(updated);
      setRows(list => list.map(item => item.id === row.id ? mapped : item));
      invalidatePublicCache();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'სტატუსი ვერ შეიცვალა');
    } finally {
      setBusyId('');
    }
  }

  async function remove(row: ConstructionProject) {
    if (!canDelete) return;
    if (!window.confirm(`წაიშალოს „${row.name}“? საიტიდანაც გაქრება.`)) return;
    setBusyId(row.id);
    try {
      await api(`/projects/${row.id}`, { method: 'DELETE' });
      setRows(list => list.filter(item => item.id !== row.id));
      invalidatePublicCache();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'წაშლა ვერ მოხერხდა');
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">პროექტები</p>
          <h1 className="text-2xl font-extrabold text-slate-900">დეველოპერები და კომპლექსები</h1>
          <p className="mt-1 text-sm text-slate-500">
            აქ რას დაამატებთ ან შეცვლით, მაშინვე გამოჩნდება საჯარო საიტზე — ჰედერი, მთავარი, /projects.
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => navigate('/admin/projects/new')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: '#2563eb' }}
          >
            <Plus size={15} strokeWidth={2.5} /> ახალი პროექტი
          </button>
        )}
      </div>

      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="ძებნა სახელით, დეველოპერით, ქალაქით…"
        className="w-full max-w-md px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 bg-white"
      />

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-medium text-red-600">{error}</div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
              <th className="py-2.5 px-4">პროექტი</th>
              <th className="py-2.5 pr-3">დეველოპერი</th>
              <th className="py-2.5 pr-3">ქალაქი</th>
              <th className="py-2.5 pr-3">სტატუსი</th>
              <th className="py-2.5 pr-3">ბინა</th>
              <th className="py-2.5 pr-3">საიტი</th>
              <th className="py-2.5 pr-4" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-400">
                  <Loader2 size={22} className="inline animate-spin" />
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-400 text-sm">
                  პროექტი ჯერ არ არის — დაამატეთ პირველი.
                </td>
              </tr>
            )}
            {!loading && rows.length > 0 && visible.length === 0 && (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-400 text-sm">
                  ამ ძებნაზე პროექტი ვერ მოიძებნა.
                </td>
              </tr>
            )}
            {visible.map(project => {
              const meta = PROJECT_STATUS_META[project.status as ProjectStatus] ?? PROJECT_STATUS_META.building;
              const live = project.published !== false;
              return (
                <tr key={project.id} className="border-b border-slate-50 hover:bg-blue-50/30">
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-3">
                      {project.image ? (
                        <img src={project.image} alt="" className="h-12 w-16 rounded-lg object-cover bg-slate-100" />
                      ) : (
                        <div className="h-12 w-16 rounded-lg bg-slate-100" />
                      )}
                      <div>
                        <button
                          type="button"
                          onClick={() => canEdit && navigate(`/admin/projects/${project.id}/edit`)}
                          className="font-bold text-slate-800 text-left hover:text-blue-600"
                        >
                          {project.name}
                        </button>
                        <p className="text-[11px] text-slate-400">{project.district || project.city}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 font-semibold text-slate-700">{project.developer}</td>
                  <td className="py-2.5 pr-3 text-slate-600">{project.city}</td>
                  <td className="py-2.5 pr-3">
                    <span
                      className="rounded-lg px-2 py-1 text-[10px] font-extrabold"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums text-slate-600">{project.units}</td>
                  <td className="py-2.5 pr-3">
                    <button
                      type="button"
                      disabled={!canEdit || busyId === project.id}
                      onClick={() => { void togglePublished(project); }}
                      className={`rounded-lg px-2 py-1 text-[10px] font-extrabold ${live ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {live ? 'ჩანს' : 'დრაფტი'}
                    </button>
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-1">
                      {live && (
                        <a
                          href={`/project/${project.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/projects/${project.id}/edit`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          disabled={busyId === project.id}
                          onClick={() => { void remove(project); }}
                          className="p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="inline-flex items-center gap-2 text-[12px] text-slate-400">
        <HardHat size={14} /> {rows.length} პროექტი
      </p>
    </div>
  );
}
