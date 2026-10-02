/**
 * Sign in, sign up, forgotten password and the reset link — one page, four modes.
 * Staff who sign in here are sent on to the back office; members land in their account.
 */

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft, Heart, Loader2, Lock, Mail, MapPin, Phone, PlusSquare, Search, User,
} from 'lucide-react';
import { useTranslation } from '../i18n/LocaleContext';
import { AuthError, useUserAuth } from '../contexts/UserAuthContext';
import BrandLogo, { BrandMark } from '../components/BrandLogo';
import { CONTACT } from '../data/contactInfo';
import {
  Alert, Field, PasswordField, PasswordStrength, btnPrimary,
} from '../components/account/ui';

export type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

const STAFF_ROLES = ['super_admin', 'admin', 'manager', 'broker'];
const MIN_PASSWORD = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = Partial<Record<'firstName' | 'email' | 'password' | 'confirmPassword' | 'agree', string>>;

const PATHS: Record<AuthMode, string> = {
  login: '/login',
  register: '/register',
  forgot: '/forgot-password',
  reset: '/reset-password',
};

export default function AuthPage({ mode }: { mode: AuthMode }) {
  const { t } = useTranslation();
  const tx = (key: string, vars?: Record<string, string | number>) => t(`account.auth.${key}`, vars);
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { user, loading, login, register, requestPasswordReset, resetPassword } = useUserAuth();

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '', agree: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState('');
  const [blocked, setBlocked] = useState<{ reason: string | null } | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const resetToken = params.get('token') ?? '';
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';
  // A notice set on the previous screen (e.g. "password changed") survives the switch to login.
  const carried = (location.state as { notice?: string } | null)?.notice ?? '';

  useEffect(() => {
    setErrors({});
    setFormError('');
    setBlocked(null);
    setNotice(carried);
  }, [mode, carried]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(current => ({ ...current, [key]: value }));
    if (key in errors) setErrors(current => ({ ...current, [key]: undefined }));
  };

  const strengthLabels = useMemo(() => [0, 1, 2, 3, 4].map(i => t(`account.auth.strength.${i}`)), [t]);

  const go = (next: AuthMode, state?: object) => navigate(PATHS[next], { state: { ...(location.state as object), ...state } });

  if (!loading && user && mode !== 'reset') {
    return <Navigate to={STAFF_ROLES.includes(user.role) ? '/admin' : from} replace />;
  }

  function validate(): Errors {
    const next: Errors = {};
    if (mode === 'register' && !form.firstName.trim()) next.firstName = tx('firstNameRequired');
    if (mode !== 'reset' && !EMAIL_RE.test(form.email.trim())) next.email = tx('emailInvalid');
    if (mode === 'login' && !form.password) next.password = t('account.submit.required');
    if (mode === 'register' || mode === 'reset') {
      if (form.password.length < MIN_PASSWORD) next.password = tx('passwordTooShort', { min: MIN_PASSWORD });
      else if (form.password !== form.confirmPassword) next.confirmPassword = tx('passwordMismatch');
    }
    if (mode === 'register' && !form.agree) next.agree = tx('agreeRequired');
    return next;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setFormError('');
    setBlocked(null);
    setNotice('');

    const found = validate();
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    setBusy(true);
    try {
      if (mode === 'forgot') {
        await requestPasswordReset(form.email.trim());
        setNotice(tx('resetSent', { phone: CONTACT.phone.display }));
        return;
      }
      if (mode === 'reset') {
        await resetPassword(resetToken, form.password);
        navigate(PATHS.login, { replace: true, state: { notice: tx('resetDone') } });
        return;
      }
      const next = mode === 'register'
        ? await register({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          password: form.password,
        })
        : await login(form.email.trim(), form.password);

      if (STAFF_ROLES.includes(next.role)) {
        // Hard navigation so the admin context picks up the mirrored session.
        window.location.assign('/admin');
        return;
      }
      navigate(mode === 'register' ? '/dashboard' : from, { replace: true });
    } catch (err) {
      if (err instanceof AuthError && err.blocked) {
        setBlocked({ reason: err.reason ?? null });
      } else if (err instanceof AuthError && err.field && err.field in form) {
        setErrors({ [err.field]: err.message });
      } else {
        setFormError(err instanceof Error ? err.message : t('account.common.error'));
      }
    } finally {
      setBusy(false);
    }
  }

  const heading = {
    login: [tx('loginTitle'), tx('loginSubtitle')],
    register: [tx('registerTitle'), tx('registerSubtitle')],
    forgot: [tx('forgotTitle'), tx('forgotSubtitle')],
    reset: [tx('resetTitle'), tx('resetSubtitle')],
  }[mode];

  const submitLabel = {
    login: tx('submitLogin'),
    register: tx('submitRegister'),
    forgot: tx('submitForgot'),
    reset: tx('submitReset'),
  }[mode];

  const passwordLabels = { showLabel: tx('showPassword'), hideLabel: tx('hidePassword') };

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      {/* ── Form side ── */}
      <div className="flex flex-col min-h-screen px-4 sm:px-10 py-6 sm:py-8">
        <div className="flex items-center justify-between gap-3">
          <BrandLogo size="md" />
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">{t('account.nav.toSite')}</span>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-[420px]">
            {(mode === 'login' || mode === 'register') && (
              <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 mb-8" role="tablist">
                {(['login', 'register'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={mode === tab}
                    onClick={() => go(tab)}
                    className={`relative h-10 rounded-lg text-sm font-bold transition-colors ${
                      mode === tab ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {mode === tab && (
                      <motion.span layoutId="auth-tab" className="absolute inset-0 rounded-lg bg-white shadow-sm" transition={{ type: 'spring', damping: 30, stiffness: 400 }} />
                    )}
                    <span className="relative">{tx(tab === 'login' ? 'loginTab' : 'registerTab')}</span>
                  </button>
                ))}
              </div>
            )}

            {(mode === 'forgot' || mode === 'reset') && (
              <button
                type="button"
                onClick={() => go('login')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 mb-6"
              >
                <ArrowLeft size={16} /> {tx('backToLogin')}
              </button>
            )}

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <h1 className="text-[28px] sm:text-[32px] font-bold text-slate-900 leading-tight">{heading[0]}</h1>
                <p className="text-[15px] text-slate-500 mt-2 mb-7 leading-relaxed">{heading[1]}</p>

                <form onSubmit={submit} noValidate className="space-y-4">
                  {blocked && (
                    <Alert tone="error" title={tx('blockedTitle')}>
                      {blocked.reason && <p>{tx('blockedReason', { reason: blocked.reason })}</p>}
                      <p>{tx('blockedHint', { phone: CONTACT.phone.display })}</p>
                    </Alert>
                  )}
                  {formError && <Alert tone="error">{formError}</Alert>}
                  {notice && <Alert tone="success">{notice}</Alert>}
                  {mode === 'reset' && !resetToken && <Alert tone="warning">{tx('resetMissing')}</Alert>}

                  {mode === 'register' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field
                        label={tx('firstName')}
                        icon={User}
                        value={form.firstName}
                        onChange={e => set('firstName', e.target.value)}
                        autoComplete="given-name"
                        error={errors.firstName}
                        maxLength={120}
                        autoFocus
                      />
                      <Field
                        label={tx('lastName')}
                        value={form.lastName}
                        onChange={e => set('lastName', e.target.value)}
                        autoComplete="family-name"
                        maxLength={120}
                      />
                    </div>
                  )}

                  {mode !== 'reset' && (
                    <Field
                      label={tx('email')}
                      icon={Mail}
                      type="email"
                      inputMode="email"
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                      autoComplete={mode === 'register' ? 'email' : 'username'}
                      placeholder="name@example.com"
                      error={errors.email}
                      autoFocus={mode !== 'register'}
                    />
                  )}

                  {mode === 'register' && (
                    <Field
                      label={tx('phoneOptional')}
                      icon={Phone}
                      type="tel"
                      inputMode="tel"
                      value={form.phone}
                      onChange={e => set('phone', e.target.value)}
                      autoComplete="tel"
                      placeholder="5XX XX XX XX"
                      maxLength={50}
                    />
                  )}

                  {mode !== 'forgot' && (
                    <div>
                      <PasswordField
                        {...passwordLabels}
                        label={mode === 'reset' ? tx('newPassword') : tx('password')}
                        icon={Lock}
                        value={form.password}
                        onChange={e => set('password', e.target.value)}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        error={errors.password}
                        autoFocus={mode === 'reset'}
                      />
                      {mode !== 'login' && <PasswordStrength password={form.password} labels={strengthLabels} />}
                    </div>
                  )}

                  {(mode === 'register' || mode === 'reset') && (
                    <PasswordField
                      {...passwordLabels}
                      label={tx('confirmPassword')}
                      icon={Lock}
                      value={form.confirmPassword}
                      onChange={e => set('confirmPassword', e.target.value)}
                      autoComplete="new-password"
                      error={errors.confirmPassword}
                    />
                  )}

                  {mode === 'login' && (
                    <div className="flex justify-end -mt-1">
                      <button type="button" onClick={() => go('forgot')} className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                        {tx('forgot')}
                      </button>
                    </div>
                  )}

                  {mode === 'register' && (
                    <div>
                      <label className="flex items-start gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={form.agree}
                          onChange={e => set('agree', e.target.checked)}
                          className="mt-0.5 w-[18px] h-[18px] rounded-[5px] accent-blue-600 flex-shrink-0"
                        />
                        <span className="text-[13px] text-slate-600 leading-relaxed">{tx('agree')}</span>
                      </label>
                      {errors.agree && <p className="mt-1.5 text-xs font-semibold text-red-600">{errors.agree}</p>}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={busy || (mode === 'reset' && !resetToken)}
                    className={`${btnPrimary} w-full h-12 text-[15px] mt-2`}
                  >
                    {submitLabel}
                    {busy && <Loader2 size={18} className="animate-spin" />}
                  </button>

                  {(mode === 'login' || mode === 'register') && (
                    <p className="text-center text-sm text-slate-500 pt-2">
                      {mode === 'login' ? tx('noAccount') : tx('hasAccount')}{' '}
                      <button
                        type="button"
                        onClick={() => go(mode === 'login' ? 'register' : 'login')}
                        className="font-bold text-blue-600 hover:text-blue-700"
                      >
                        {mode === 'login' ? tx('createOne') : tx('signIn')}
                      </button>
                    </p>
                  )}
                </form>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <p className="text-xs text-slate-400 text-center">© {new Date().getFullYear()} TBILISIREALTOR.GE</p>
      </div>

      {/* ── Brand side ── */}
      <aside className="hidden lg:block sticky top-0 h-screen overflow-hidden bg-slate-950">
        <img src="/5e6a55c3201bd.jpg" alt="" className="absolute inset-0 w-full h-full object-cover scale-105" decoding="async" />
        <div className="absolute inset-0 bg-slate-950/75" />
        <div className="absolute inset-0 bg-blue-950/20 mix-blend-multiply" />

        <div className="relative h-full flex flex-col items-center text-center px-10 xl:px-16 py-12">
          {/* Top: brand */}
          <span className="inline-flex items-center gap-2.5 h-10 pl-1.5 pr-4 rounded-full bg-white/10 border border-white/15 backdrop-blur-md">
            <BrandMark size={28} />
            <span className="text-white/90 text-[13px] font-semibold">{tx('trust')}</span>
          </span>

          {/* Middle: message and the three perks, centred as one block */}
          <div className="flex-1 w-full flex flex-col items-center justify-center">
            <h2 className="text-white text-[38px] xl:text-[46px] font-bold leading-[1.12] max-w-[520px] text-balance">
              {tx('sideTitle')}
            </h2>
            <span className="block w-14 h-1 rounded-full bg-blue-500 mt-6" aria-hidden />
            <p className="text-white/70 text-base xl:text-[17px] mt-6 leading-relaxed max-w-[440px] text-balance">
              {tx('sideText')}
            </p>

            <ul className="mt-12 grid grid-cols-3 gap-3 xl:gap-4 w-full max-w-[620px]">
              {([
                [PlusSquare, 'perk1'],
                [Heart, 'perk2'],
                [Search, 'perk3'],
              ] as const).map(([Icon, key]) => (
                <li
                  key={key}
                  className="flex flex-col items-center gap-3 px-2 py-6 rounded-2xl bg-white/[0.06] border border-white/10 backdrop-blur-md"
                >
                  <span className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/40">
                    <Icon size={21} className="text-white" />
                  </span>
                  <span className="text-white font-bold text-[15px] leading-tight">{tx(`${key}Title`)}</span>
                  <span className="text-white/55 text-xs leading-snug -mt-1 whitespace-nowrap">{tx(`${key}Text`)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom: the office, mirrored under the brand chip */}
          <div className="flex items-center justify-center gap-x-6 gap-y-2 flex-wrap text-[13px] text-white/60">
            <span className="inline-flex items-center gap-2"><MapPin size={15} className="text-blue-400" />{CONTACT.street}</span>
            <span className="w-1 h-1 rounded-full bg-white/30" aria-hidden />
            <a href={`tel:${CONTACT.phone.tel}`} className="inline-flex items-center gap-2 hover:text-white transition">
              <Phone size={15} className="text-blue-400" />{CONTACT.phone.display}
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}
