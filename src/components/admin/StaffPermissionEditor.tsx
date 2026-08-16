/**
 * Permission editor drawer.
 *
 * Two modes, chosen by whether a `target` user is passed in:
 *  - per-user: grants and revokes layered on top of the role template
 *  - role template: the baseline every holder of that role starts from
 *
 * Nothing here decides access. The server recomputes the effective set on every
 * request; this only writes the intent and previews the result.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Lock, ShieldCheck, RotateCcw, AlertTriangle } from 'lucide-react';
import { useApiRequest } from '../../contexts/AdminAuthContext';
import {
  PERMISSION_GROUP_LABEL, ROLE_DESCRIPTION, STAFF_ROLES,
  groupPermissions, roleColor, roleLabel,
  type PermissionDef, type Role,
} from '../../lib/permissions';

interface TargetUser {
  id: number;
  name: string;
  email: string;
  role: string;
  scope?: 'own' | 'all';
  permissions?: Record<string, boolean>;
  effectivePermissions?: string[];
}

interface Catalog {
  catalog: PermissionDef[];
  templates: Record<string, string[]>;
  grantable: string[];
  actorRole: string;
}

interface Props {
  /** null opens the role-template editor instead of a single person's overrides. */
  target: TargetUser | null;
  onClose: () => void;
  onSaveUser: (userId: number, permissions: Record<string, boolean>, scope: 'own' | 'all') => Promise<void>;
  onSaveRole: (role: Role, permissions: string[]) => Promise<void>;
}

type TriState = 'inherit' | 'grant' | 'revoke';

export default function StaffPermissionEditor({ target, onClose, onSaveUser, onSaveRole }: Props) {
  const api = useApiRequest();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [overrides, setOverrides] = useState<Record<string, boolean>>(target?.permissions ?? {});
  const [scope, setScope] = useState<'own' | 'all'>(target?.scope ?? 'all');

  const [templateRole, setTemplateRole] = useState<Role>('manager');
  const [templateKeys, setTemplateKeys] = useState<string[]>([]);

  const isRoleMode = target === null;

  useEffect(() => {
    let cancelled = false;
    api('/permissions/catalog')
      .then((data: Catalog) => {
        if (cancelled) return;
        setCatalog(data);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'ჩატვირთვა ვერ მოხერხდა'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // Fetched once when the drawer opens; role switching reads from the same payload.
  }, [api]);

  useEffect(() => {
    if (catalog) setTemplateKeys(catalog.templates[templateRole] ?? []);
  }, [templateRole, catalog]);

  const grantable = useMemo(() => new Set(catalog?.grantable ?? []), [catalog]);

  const roleBaseline = useMemo(
    () => new Set(catalog?.templates[target?.role ?? ''] ?? []),
    [catalog, target?.role],
  );

  /** What the person ends up with once overrides land on the role template. */
  const effective = useMemo(() => {
    if (isRoleMode) return new Set(templateKeys);
    const set = new Set(roleBaseline);
    for (const [key, granted] of Object.entries(overrides)) {
      if (granted) set.add(key);
      else set.delete(key);
    }
    return set;
  }, [isRoleMode, templateKeys, roleBaseline, overrides]);

  const stateOf = useCallback((key: string): TriState => {
    if (!(key in overrides)) return 'inherit';
    return overrides[key] ? 'grant' : 'revoke';
  }, [overrides]);

  function cycle(key: string) {
    setOverrides(prev => {
      const next = { ...prev };
      const inBaseline = roleBaseline.has(key);
      const current: TriState = key in next ? (next[key] ? 'grant' : 'revoke') : 'inherit';

      // Only offer the override that actually changes something.
      if (current === 'inherit') {
        if (inBaseline) next[key] = false;
        else next[key] = true;
      } else {
        delete next[key];
      }
      return next;
    });
  }

  function toggleTemplate(key: string) {
    setTemplateKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    );
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      if (isRoleMode) await onSaveRole(templateRole, templateKeys);
      else await onSaveUser(target!.id, overrides, scope);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შენახვა ვერ მოხერხდა');
    } finally {
      setSaving(false);
    }
  }

  const groups = groupPermissions(catalog?.catalog ?? []);
  const color = roleColor(isRoleMode ? templateRole : (target?.role ?? 'user'));
  const superAdminLocked = isRoleMode && templateRole === 'super_admin';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isRoleMode ? <ShieldCheck size={16} className="text-slate-500" /> : <Lock size={16} className="text-slate-500" />}
              <h3 className="text-base font-extrabold text-slate-800 truncate">
                {isRoleMode ? 'როლების შაბლონები' : target!.name}
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              {isRoleMode
                ? 'შაბლონი ვრცელდება ყველა თანამშრომელზე ამ როლით'
                : `${target!.email} · ${roleLabel(target!.role)}`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Role picker / scope */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 space-y-3">
          {isRoleMode ? (
            <>
              <div className="flex flex-wrap gap-2">
                {STAFF_ROLES.map(r => {
                  const active = templateRole === r;
                  const c = roleColor(r);
                  return (
                    <button
                      key={r}
                      onClick={() => setTemplateRole(r)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border"
                      style={active
                        ? { background: c.bg, color: c.text, borderColor: c.border }
                        : { background: '#fff', color: '#475569', borderColor: '#e2e8f0' }}
                    >
                      {roleLabel(r)}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500">{ROLE_DESCRIPTION[templateRole]}</p>
              {superAdminLocked && (
                <p className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
                  <AlertTriangle size={13} />
                  სუპერ ადმინს ყოველთვის ყველა უფლება აქვს — ეს შაბლონი არ იცვლება.
                </p>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold"
                style={{ background: color.bg, color: color.text }}
              >
                {roleLabel(target!.role)}
              </span>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                ხედვის არეალი
                <select
                  value={scope}
                  onChange={e => setScope(e.target.value === 'own' ? 'own' : 'all')}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="all">ყველა განცხადება</option>
                  <option value="own">მხოლოდ საკუთარი</option>
                </select>
              </label>
              <span className="text-xs text-slate-500 ml-auto">
                სულ: <b className="text-slate-700">{effective.size}</b> უფლება
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && <p className="text-sm text-slate-400 py-8 text-center">იტვირთება...</p>}

          {!loading && groups.map(([group, items]) => (
            <div key={group} className="mb-6">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                {PERMISSION_GROUP_LABEL[group] ?? group}
              </h4>
              <div className="space-y-1">
                {items.map(item => {
                  const allowed = grantable.has(item.key);
                  const state = stateOf(item.key);
                  const on = effective.has(item.key);
                  const disabled = superAdminLocked || (!allowed && !on);

                  return (
                    <button
                      key={item.key}
                      type="button"
                      disabled={disabled}
                      onClick={() => (isRoleMode ? toggleTemplate(item.key) : cycle(item.key))}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                        disabled
                          ? 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-60'
                          : on
                            ? 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                            : 'border-slate-100 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className="w-9 h-5 rounded-full flex-shrink-0 relative transition-colors"
                        style={{ background: on ? '#2563eb' : '#cbd5e1' }}
                      >
                        <span
                          className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                          style={{ left: on ? '18px' : '2px' }}
                        />
                      </span>

                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-slate-700 truncate">
                          {item.label}
                          {item.sensitive && (
                            <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                              პირადი
                            </span>
                          )}
                        </span>
                        <span className="block text-[11px] text-slate-400 font-mono">{item.key}</span>
                      </span>

                      {!isRoleMode && state !== 'inherit' && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={state === 'grant'
                            ? { background: '#dcfce7', color: '#166534' }
                            : { background: '#fee2e2', color: '#991b1b' }}
                        >
                          {state === 'grant' ? 'დამატებული' : 'ჩამორთმეული'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white">
          {error && (
            <p className="text-xs font-semibold text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-3">{error}</p>
          )}
          <div className="flex items-center gap-3">
            {!isRoleMode && (
              <button
                onClick={() => setOverrides({})}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                <RotateCcw size={13} />როლის ნაგულისხმევზე დაბრუნება
              </button>
            )}
            <div className="flex-1" />
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50">
              დახურვა
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading || superAdminLocked}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? 'ინახება...' : 'შენახვა'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
