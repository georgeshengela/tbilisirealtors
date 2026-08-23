import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Phone, Eye, EyeOff, CheckCircle, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from '../i18n/LocaleContext';
import { useUserAuth } from '../contexts/UserAuthContext';
import BrandLogo from '../components/BrandLogo';

type AuthMode = 'login' | 'register' | 'forgot';

interface AuthPageProps {
  mode?: AuthMode;
}

const STAFF_ROLES = ['super_admin', 'admin', 'manager', 'broker'];

export default function AuthPage({ mode: initialMode = 'login' }: AuthPageProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, login, register, requestPasswordReset } = useUserAuth();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: ''
  });

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Clear the previous attempt's feedback when switching tabs.
  useEffect(() => {
    setError('');
    setNotice('');
  }, [mode]);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  if (!authLoading && user) {
    return <Navigate to={STAFF_ROLES.includes(user.role) ? '/admin' : redirectTo} replace />;
  }

  /** Staff land in the back office; the hard navigation lets the admin context adopt the session. */
  function goHome(role: string, fallback: string) {
    if (STAFF_ROLES.includes(role)) {
      window.location.assign('/admin');
      return;
    }
    navigate(fallback, { replace: true });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    setError('');
    setNotice('');

    try {
      if (mode === 'forgot') {
        setBusy(true);
        const message = await requestPasswordReset(form.email.trim());
        setNotice(message || t('auth.resetSent'));
        return;
      }

      if (mode === 'register') {
        if (form.password !== form.confirmPassword) {
          setError(t('auth.passwordMismatch'));
          return;
        }
        if (form.password.length < 6) {
          setError(t('auth.passwordTooShort'));
          return;
        }
        setBusy(true);
        const next = await register({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          password: form.password,
        });
        goHome(next.role, '/dashboard');
        return;
      }

      setBusy(true);
      const next = await login(form.email.trim(), form.password);
      goHome(next.role, redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  const benefits = [
    t('auth.benefit1'),
    t('auth.benefit2'),
    t('auth.benefit3'),
    t('favorites.title'),
    t('nav.listings'),
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Left: Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="inline-flex mb-10">
            <BrandLogo size="lg" href={null} />
          </Link>

          {/* Mode tabs */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-8">
            {[
              { value: 'login' as AuthMode, label: t('auth.login') },
              { value: 'register' as AuthMode, label: t('auth.register') },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setMode(tab.value)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  mode === tab.value
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  {mode === 'login' && t('auth.loginTitle')}
                  {mode === 'register' && t('auth.registerTitle')}
                  {mode === 'forgot' && t('auth.forgotTitle')}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                  {mode === 'login' && t('auth.loginSubtitle')}
                  {mode === 'register' && t('auth.registerSubtitle')}
                  {mode === 'forgot' && t('auth.forgotSubtitle')}
                </p>
              </div>

              {/* Form */}
              <form className="space-y-4" onSubmit={submit} noValidate>
                {error && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {notice && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">
                    <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                    {notice}
                  </div>
                )}

                {mode === 'register' && (
                  <div className="relative">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      autoComplete="name"
                      required
                      placeholder={t('contact.name')}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl pl-12 pr-4 py-4 text-sm focus:border-blue-600 focus:outline-none text-slate-800 dark:text-white placeholder-slate-400 transition-all"
                    />
                  </div>
                )}

                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    type="email"
                    autoComplete="email"
                    required
                    placeholder={t('auth.email')}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl pl-12 pr-4 py-4 text-sm focus:border-blue-600 focus:outline-none text-slate-800 dark:text-white placeholder-slate-400 transition-all"
                  />
                </div>

                {mode === 'register' && (
                  <div className="relative">
                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      autoComplete="tel"
                      placeholder={t('common.phone')}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl pl-12 pr-4 py-4 text-sm focus:border-blue-600 focus:outline-none text-slate-800 dark:text-white placeholder-slate-400 transition-all"
                    />
                  </div>
                )}

                {mode !== 'forgot' && (
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      required
                      placeholder={t('auth.password')}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl pl-12 pr-12 py-4 text-sm focus:border-blue-600 focus:outline-none text-slate-800 dark:text-white placeholder-slate-400 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                )}

                {mode === 'register' && (
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={form.confirmPassword}
                      onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                      type="password"
                      autoComplete="new-password"
                      required
                      placeholder={t('auth.confirmPassword')}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl pl-12 pr-4 py-4 text-sm focus:border-blue-600 focus:outline-none text-slate-800 dark:text-white placeholder-slate-400 transition-all"
                    />
                  </div>
                )}

                {mode === 'login' && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-sm text-blue-600 hover:underline font-medium"
                    >
                      {t('auth.forgot')}
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-semibold text-lg transition-all duration-200 hover:shadow-lg hover:shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {mode === 'login' && t('auth.submitLogin')}
                  {mode === 'register' && t('auth.submitRegister')}
                  {mode === 'forgot' && t('auth.submitForgot')}
                  {busy ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
                </button>

                {mode !== 'forgot' && (
                  <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                    {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
                    <button
                      type="button"
                      onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                      className="text-blue-600 font-semibold hover:underline"
                    >
                      {mode === 'login' ? t('auth.register') : t('auth.login')}
                    </button>
                  </p>
                )}

                {mode === 'forgot' && (
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="w-full text-center text-sm text-blue-600 font-medium hover:underline"
                  >
                    {t('auth.login')}
                  </button>
                )}
              </form>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Right: Benefits */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80"
            alt=""
            className="w-full h-full object-cover opacity-20"
          />
        </div>
        <div className="relative z-10 max-w-md">
          <div className="mb-8">
            <span className="text-blue-400 text-sm font-semibold uppercase tracking-widest">TBILISIREALTOR.GE</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mt-2 mb-4">
              {t('auth.benefitsTitle')}
            </h2>
            <p className="text-slate-400 text-lg">
              {t('auth.benefitsSubtitle')}
            </p>
          </div>

          <div className="space-y-4 mb-8">
            {benefits.map((benefit, i) => (
              <motion.div
                key={benefit}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={14} className="text-emerald-400" />
                </div>
                <span className="text-slate-200">{benefit}</span>
              </motion.div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="glass rounded-2xl p-5">
            <p className="text-white/90 italic mb-4">
              "{t('auth.testimonial')}"
            </p>
            <div className="flex items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80"
                alt="User"
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <p className="text-white font-semibold text-sm">{t('auth.testimonialAuthor')}</p>
                <p className="text-slate-400 text-xs">{t('auth.testimonialRole')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
