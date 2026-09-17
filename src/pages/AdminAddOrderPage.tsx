import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle, Loader2, MessageSquare, Phone, Plus, X,
} from 'lucide-react';
import AdminLayout from '../components/admin/AdminLayout';
import { useAdminAuth, useApiRequest } from '../contexts/AdminAuthContext';
import {
  ORDER_DEAL_META,
  ORDER_ORIGINS,
  ORDER_STATUS_META,
  ORDER_STATUSES,
  phoneReady,
  type OrderComment,
  type OrderRow,
  type OrderStatus,
  type OrderViewing,
} from '../lib/orders';

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 bg-white';

export default function AdminAddOrderPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user, can, loading: authLoading } = useAdminAuth();
  const api = useApiRequest();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('+995');
  const [dealType, setDealType] = useState<'sale' | 'rent' | ''>('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetCurrency, setBudgetCurrency] = useState<'USD' | 'GEL'>('USD');
  const [origin, setOrigin] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<OrderComment[]>([]);
  const [viewings, setViewings] = useState<OrderViewing[]>([]);
  const [status, setStatus] = useState<OrderStatus>('new');
  const [author, setAuthor] = useState('');
  const [showId, setShowId] = useState(id || '');
  const [viewDate, setViewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [viewIds, setViewIds] = useState('');
  const [viewNote, setViewNote] = useState('');

  const canStatus = can('orders.status');
  const unlocked = phoneReady(clientPhone);

  useEffect(() => {
    if (!authLoading && !user) navigate('/admin/login');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    api(`/orders/${id}`)
      .then((data: OrderRow) => {
        if (cancelled) return;
        setClientName(data.clientName);
        setClientPhone(data.clientPhone);
        setDealType(data.dealType);
        setBudgetAmount(String(Math.round(Number(data.budgetAmount) || 0)));
        setBudgetCurrency(data.budgetCurrency === 'GEL' ? 'GEL' : 'USD');
        setOrigin(data.origin ?? []);
        setComments(data.comments ?? []);
        setComment('');
        setViewings(data.viewings ?? []);
        setStatus(data.status);
        setAuthor(data.createdByName || '');
        setShowId(data.id);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'შეკვეთა ვერ ჩაიტვირთა'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [api, id, isEdit]);

  function toggleOrigin(key: string) {
    setOrigin(prev => prev.includes(key) ? prev.filter(item => item !== key) : [...prev, key]);
  }

  function addViewing() {
    const listingIds = viewIds.split(/[,\s]+/).map(item => item.replace(/\D/g, '')).filter(item => item.length >= 4);
    if (!viewDate && listingIds.length === 0) return;
    setViewings(prev => [{
      id: `v${Date.now()}`,
      shownAt: viewDate || new Date().toISOString().slice(0, 10),
      listingIds,
      note: viewNote.trim() || undefined,
      author: user?.name,
      createdAt: new Date().toISOString(),
    }, ...prev]);
    setViewIds('');
    setViewNote('');
  }

  const canSave = unlocked
    && clientName.trim()
    && dealType
    && Number(budgetAmount) > 0
    && (isEdit || comment.trim());

  async function save() {
    if (!canSave) {
      setError('შეავსე ნომერი, სახელი, გარიგება, ბიუჯეტი და კომენტარი');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isEdit && id) {
        await api(`/orders/${id}`, {
          method: 'PUT',
          body: JSON.stringify({
            clientName,
            clientPhone,
            dealType,
            budgetAmount: Number(budgetAmount),
            budgetCurrency,
            origin,
            comments,
            viewings,
            comment: comment.trim() || undefined,
            ...(canStatus ? { status } : {}),
          }),
        });
      } else {
        const created = await api('/orders', {
          method: 'POST',
          body: JSON.stringify({
            clientName,
            clientPhone,
            dealType,
            budgetAmount: Number(budgetAmount),
            budgetCurrency,
            origin,
            comment,
          }),
        }) as OrderRow;
        navigate(`/admin/orders/${created.id}`, { replace: true });
        return;
      }
      navigate('/admin?section=orders');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შეკვეთა ვერ შეინახა');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user) return null;

  return (
    <AdminLayout subtitle={isEdit ? 'შეკვეთის რედაქტირება' : 'ახალი შეკვეთა'} activeSection="orders">
      <div className="container-xl py-6 sm:py-8 pb-28 lg:pb-10">
        <button
          type="button"
          onClick={() => navigate('/admin?section=orders')}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-xs font-semibold mb-3"
        >
          <ArrowLeft size={13} />
          შეკვეთები
        </button>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">შეკვეთა</p>
            <h1 className="text-2xl font-extrabold text-slate-900">
              {isEdit ? `#${showId}` : 'ახალი შეკვეთა'}
            </h1>
            {author && <p className="text-xs text-slate-500 mt-1">ავტორი · {author}</p>}
          </div>
          {isEdit && (
            <span
              className="rounded-full px-3 py-1 text-[11px] font-extrabold"
              style={{ background: ORDER_STATUS_META[status].bg, color: ORDER_STATUS_META[status].color }}
            >
              {ORDER_STATUS_META[status].label}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>
        ) : (
          <div className="max-w-2xl space-y-5">
            <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Phone size={16} className="text-blue-600" />
                <h2 className="text-sm font-extrabold text-slate-800">კლიენტის ნომერი</h2>
              </div>
              <p className="text-xs text-slate-400 mb-3">ნომრის გარეშე შეკვეთა არ იწყება.</p>
              <input
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                placeholder="+995 5XX XXX XXX"
                className={inputCls}
                inputMode="tel"
              />
            </section>

            {unlocked && (
              <>
                <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                  <label className="block">
                    <span className="block text-xs font-bold text-slate-600 mb-1.5">კლიენტის სახელი</span>
                    <input value={clientName} onChange={e => setClientName(e.target.value)} className={inputCls} placeholder="ნინო ბერიძე" />
                  </label>

                  <div>
                    <p className="text-xs font-bold text-slate-600 mb-2">ყიდვა თუ ქირაობა</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(['sale', 'rent'] as const).map(key => {
                        const on = dealType === key;
                        const meta = ORDER_DEAL_META[key];
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setDealType(key);
                              setBudgetCurrency(key === 'rent' ? 'GEL' : 'USD');
                            }}
                            className="rounded-xl border-2 px-3 py-3 text-left"
                            style={on ? { borderColor: meta.color, background: `${meta.color}10` } : { borderColor: '#e2e8f0' }}
                          >
                            <span className="block text-sm font-extrabold" style={{ color: on ? meta.color : '#334155' }}>{meta.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-600 mb-2">ბიუჯეტი</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        value={budgetAmount}
                        onChange={e => setBudgetAmount(e.target.value)}
                        className={`${inputCls} flex-1`}
                        placeholder={budgetCurrency === 'USD' ? '150000' : '2500'}
                      />
                      <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                        {(['USD', 'GEL'] as const).map(cur => (
                          <button
                            key={cur}
                            type="button"
                            onClick={() => setBudgetCurrency(cur)}
                            className="px-3 text-xs font-extrabold"
                            style={budgetCurrency === cur ? { background: '#0f172a', color: '#fff' } : { color: '#64748b' }}
                          >
                            {cur === 'USD' ? '$' : '₾'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-600 mb-2">შეკვეთის წარმომავლობა</p>
                    <div className="flex flex-wrap gap-2">
                      {ORDER_ORIGINS.map(item => {
                        const on = origin.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleOrigin(item.id)}
                            className="rounded-lg border px-3 py-1.5 text-[12px] font-extrabold"
                            style={on ? { background: '#0f172a', borderColor: '#0f172a', color: '#fff' } : { background: '#fff', borderColor: '#e2e8f0', color: '#475569' }}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>

                {isEdit && canStatus && (
                  <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h2 className="text-sm font-extrabold text-slate-800 mb-3">სტატუსი · მხოლოდ მენეჯერი</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {ORDER_STATUSES.map(key => {
                        const meta = ORDER_STATUS_META[key];
                        const blocked = key === 'current' && status === 'new' && viewings.length === 0;
                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={blocked}
                            onClick={() => setStatus(key)}
                            title={blocked ? 'Add a shown listing first' : meta.label}
                            className="rounded-xl border px-2 py-2 text-[11px] font-extrabold disabled:opacity-40"
                            style={status === key
                              ? { background: meta.bg, borderColor: meta.color, color: meta.color }
                              : { background: '#fff', borderColor: '#e2e8f0', color: '#64748b' }}
                          >
                            {meta.label}
                          </button>
                        );
                      })}
                    </div>
                    {status === 'new' && viewings.length === 0 && (
                      <p className="mt-2 text-[11px] text-slate-400">CURRENT მხოლოდ მას შემდეგ, რაც ბროკერი წაიყვანს კლიენტს და აჩვენებს ობიექტს.</p>
                    )}
                  </section>
                )}

                {isEdit && (
                  <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h2 className="text-sm font-extrabold text-slate-800 mb-1">ნაჩვენები ობიექტები</h2>
                    <p className="text-xs text-slate-400 mb-3">შეხვედრა + განცხადების ID. ამის გარეშე NEW → CURRENT არ გადავა.</p>
                    <div className="grid sm:grid-cols-2 gap-2 mb-2">
                      <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)} className={inputCls} />
                      <input value={viewIds} onChange={e => setViewIds(e.target.value)} placeholder="ID 20000001, 10000067" className={inputCls} />
                    </div>
                    <input value={viewNote} onChange={e => setViewNote(e.target.value)} placeholder="რა აჩვენე / რა თქვა" className={`${inputCls} mb-2`} />
                    <button type="button" onClick={addViewing} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white">
                      <Plus size={13} /> დამატება
                    </button>
                    <div className="mt-3 space-y-2">
                      {viewings.map(item => (
                        <div key={item.id} className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-700">{item.shownAt}{item.listingIds.length ? ` · ${item.listingIds.join(', ')}` : ''}</p>
                            {item.note && <p className="text-[11px] text-slate-500">{item.note}</p>}
                          </div>
                          <button type="button" onClick={() => setViewings(prev => prev.filter(row => row.id !== item.id))} className="text-slate-300 hover:text-red-500"><X size={14} /></button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare size={16} className="text-blue-600" />
                    <h2 className="text-sm font-extrabold text-slate-800">შიდა კომენტარები</h2>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    {isEdit ? 'თითო კომენტარი ინახება ცალკე — ჩანს მხოლოდ ადმინში.' : 'სავალდებულოა. ამის გარეშე შეკვეთა არ შეინახება.'}
                  </p>
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    rows={3}
                    placeholder={isEdit ? 'ახალი კომენტარი...' : 'რა უნდა კლიენტს, რა ვადაში, რა უთქვამს...'}
                    className={`${inputCls} resize-none`}
                  />
                  {comments.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {comments.map(item => (
                        <div key={item.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <p className="text-xs text-slate-700 whitespace-pre-wrap">{item.text}</p>
                          <p className="text-[10px] text-slate-400 mt-1.5">
                            {new Date(item.createdAt).toLocaleString('ka-GE')}{item.author ? ` · ${item.author}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}

            {error && <p className="text-sm font-semibold text-red-500">{error}</p>}

            <div className="flex gap-2">
              <button type="button" onClick={() => navigate('/admin?section=orders')} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">
                გაუქმება
              </button>
              <button
                type="button"
                onClick={() => { void save(); }}
                disabled={saving || !canSave}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-40"
                style={{ background: '#2563eb' }}
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                შენახვა
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
