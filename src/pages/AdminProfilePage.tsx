import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, CheckCircle, Eye, EyeOff, Loader2,
  Mail, Phone, Calendar, Briefcase, User, Shield,
} from 'lucide-react';
import AdminLayout from '../components/admin/AdminLayout';
import { useAdminAuth, type AdminUser } from '../contexts/AdminAuthContext';
import { useFileUpload } from '../hooks/useFileUpload';

const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';

export default function AdminProfilePage() {
  const navigate = useNavigate();
  const { user, token, setUserProfile } = useAdminAuth();
  const { upload, uploading } = useFileUpload();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    jobTitle: '',
    bio: '',
    avatarUrl: '',
    showOnFrontend: false,
    password: '',
    password2: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      dateOfBirth: user.dateOfBirth ? String(user.dateOfBirth).slice(0, 10) : '',
      phone: user.phone || '',
      email: user.email || '',
      jobTitle: user.jobTitle || '',
      bio: user.bio || '',
      avatarUrl: user.avatarUrl || '',
      showOnFrontend: user.showOnFrontend,
      password: '',
      password2: '',
    });
  }, [user]);

  if (!user) return null;

  const displayName = [form.firstName, form.lastName].filter(Boolean).join(' ') || user.name;
  const initial = (form.firstName || form.lastName || user.name || '?').charAt(0).toUpperCase();

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function onAvatar(files: FileList | null) {
    if (!files?.length) return;
    const uploaded = await upload(Array.from(files).filter(f => f.type.startsWith('image/')));
    if (uploaded[0]?.url) set('avatarUrl', uploaded[0].url);
  }

  async function handleSave() {
    setError('');
    if (form.password && form.password !== form.password2) {
      setError('პაროლები არ ემთხვევა');
      return;
    }
    if (form.password && form.password.length < 6) {
      setError('პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს');
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        firstName: form.firstName,
        lastName: form.lastName,
        dateOfBirth: form.dateOfBirth || null,
        phone: form.phone,
        avatarUrl: form.avatarUrl,
        jobTitle: form.jobTitle,
        bio: form.bio,
        showOnFrontend: form.showOnFrontend,
      };
      if (form.password) body.password = form.password;

      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'შენახვა ვერ მოხერხდა');

      setUserProfile(data as AdminUser);
      setForm(f => ({ ...f, password: '', password2: '' }));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შენახვა ვერ მოხერხდა');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout subtitle="პროფილი" activeSection="properties" hideAddButton>
      <div className="container-xl py-8">
        <div className="max-w-4xl">
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-blue-600 mb-6"
        >
          <ArrowLeft size={15} />
          უკან ადმინში
        </button>

        {/* Hero card */}
        <div
          className="rounded-3xl overflow-hidden mb-6 shadow-sm"
          style={{ background: '#111827' }}
        >
          <div className="p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <div
                className="w-28 h-28 rounded-3xl overflow-hidden flex items-center justify-center text-white text-4xl font-extrabold border-4 border-white/20"
                style={{ background: form.avatarUrl ? '#0f172a' : 'rgba(255,255,255,0.12)' }}
              >
                {form.avatarUrl ? (
                  <img src={form.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  initial
                )}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-white text-blue-700 flex items-center justify-center shadow-lg hover:bg-blue-50"
                title="ავატარის ატვირთვა"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { void onAvatar(e.target.files); e.target.value = ''; }} />
            </div>

            <div className="text-center sm:text-left text-white min-w-0 flex-1">
              <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-1">
                {user.role === 'super_admin' ? 'სუპერ ადმინი' : 'ადმინი'}
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight truncate">{displayName}</h1>
              <p className="text-blue-100/80 text-sm mt-1 flex items-center justify-center sm:justify-start gap-2">
                <Mail size={14} />
                {form.email}
              </p>
              {form.jobTitle && (
                <p className="text-blue-100/70 text-sm mt-1 flex items-center justify-center sm:justify-start gap-2">
                  <Briefcase size={14} />
                  {form.jobTitle}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          <div className="space-y-5">
            <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-4">
                <User size={16} className="text-blue-600" />
                პირადი მონაცემები
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">სახელი *</span>
                  <input className={`${inputCls} mt-1.5`} value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="თეონა" />
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">გვარი *</span>
                  <input className={`${inputCls} mt-1.5`} value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="ბერიძე" />
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400 inline-flex items-center gap-1">
                    <Calendar size={11} /> დაბადების თარიღი
                  </span>
                  <input type="date" className={`${inputCls} mt-1.5`} value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400 inline-flex items-center gap-1">
                    <Phone size={11} /> ტელეფონი
                  </span>
                  <input className={`${inputCls} mt-1.5`} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+995 5XX XXX XXX" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">თანამდებობა</span>
                  <input className={`${inputCls} mt-1.5`} value={form.jobTitle} onChange={e => set('jobTitle', e.target.value)} placeholder="რეალტორი / მენეჯერი" />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">ბიოგრაფია</span>
                  <textarea
                    rows={4}
                    className={`${inputCls} mt-1.5 resize-none`}
                    value={form.bio}
                    onChange={e => set('bio', e.target.value)}
                    placeholder="მოკლე გაცნობა გუნდის გვერდისთვის..."
                  />
                </label>
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-4">
                <Shield size={16} className="text-blue-600" />
                უსაფრთხოება
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">ახალი პაროლი</span>
                  <input type="password" className={`${inputCls} mt-1.5`} value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" autoComplete="new-password" />
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">გაიმეორეთ პაროლი</span>
                  <input type="password" className={`${inputCls} mt-1.5`} value={form.password2} onChange={e => set('password2', e.target.value)} placeholder="••••••••" autoComplete="new-password" />
                </label>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">დატოვეთ ცარიელი, თუ პაროლს არ ცვლით.</p>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <h2 className="text-sm font-extrabold text-slate-800 mb-3">საიტზე გამოჩენა</h2>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                ნაგულისხმევად სახელი და გვარი <strong>არ ჩანს</strong> საჯარო საიტზე.
                ჩართეთ მხოლოდ თუ გინდათ გამოჩნდეთ „ჩვენი გუნდი“ გვერდზე.
              </p>
              <button
                type="button"
                onClick={() => set('showOnFrontend', !form.showOnFrontend)}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl border transition-all"
                style={
                  form.showOnFrontend
                    ? { background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.35)' }
                    : { background: '#f8fafc', borderColor: '#e2e8f0' }
                }
              >
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: form.showOnFrontend ? '#10b981' : '#cbd5e1' }}
                >
                  {form.showOnFrontend
                    ? <Eye size={18} className="text-white" />
                    : <EyeOff size={18} className="text-white" />}
                </span>
                <span className="text-left min-w-0">
                  <span className="block text-sm font-bold text-slate-800">
                    {form.showOnFrontend ? 'ჩანს საიტზე' : 'დამალულია საიტზე'}
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    {form.showOnFrontend ? 'სახელი / გვარი გამოჩნდება გუნდში' : 'პირადი მონაცემები მხოლოდ ადმინშია'}
                  </span>
                </span>
              </button>
            </section>

            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-3">
              {error && <p className="text-xs font-bold text-red-500">{error}</p>}
              {saved && (
                <p className="text-xs font-bold text-emerald-600 inline-flex items-center gap-1.5">
                  <CheckCircle size={14} /> შენახულია
                </p>
              )}
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || !form.firstName.trim()}
                className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: '#2563eb' }}
              >
                {saving ? (
                  <span className="inline-flex items-center gap-2 justify-center">
                    <Loader2 size={15} className="animate-spin" /> ინახება...
                  </span>
                ) : 'პროფილის შენახვა'}
              </button>
            </div>
          </aside>
        </div>
        </div>
      </div>
    </AdminLayout>
  );
}
