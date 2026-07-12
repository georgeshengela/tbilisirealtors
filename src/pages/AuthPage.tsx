import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Mail, Lock, User, Phone, Eye, EyeOff, CheckCircle, ArrowRight } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'forgot';

interface AuthPageProps {
  mode?: AuthMode;
}

export default function AuthPage({ mode: initialMode = 'login' }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: ''
  });

  const benefits = [
    'განცხადების შენახვა ფავორიტებში',
    'პირდაპირი კომუნიკაცია აგენტებთან',
    'ბაზრის ანალიტიკაზე წვდომა',
    'განახლებები ახალ განცხადებებზე',
    'პირადი განცხადების პანელი',
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
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Building2 size={22} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-xl text-slate-900 dark:text-white">TbilisiRealtors</span>
              <span className="text-blue-600 font-bold text-xl">.ge</span>
            </div>
          </Link>

          {/* Mode tabs */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-8">
            {[
              { value: 'login' as AuthMode, label: 'შესვლა' },
              { value: 'register' as AuthMode, label: 'რეგისტრაცია' },
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
                  {mode === 'login' && 'მოგესალმებით!'}
                  {mode === 'register' && 'ანგარიშის შექმნა'}
                  {mode === 'forgot' && 'პაროლის აღდგენა'}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                  {mode === 'login' && 'შედით თქვენს ანგარიშზე'}
                  {mode === 'register' && 'შეუერთდით TbilisiRealtors.ge-ს'}
                  {mode === 'forgot' && 'გამოგვიგზავნეთ ელ-ფოსტა'}
                </p>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {mode === 'register' && (
                  <div className="relative">
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="სახელი და გვარი"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl pl-12 pr-4 py-4 text-sm focus:border-blue-500 focus:outline-none text-slate-800 dark:text-white placeholder-slate-400 transition-all"
                    />
                  </div>
                )}

                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    type="email"
                    placeholder="ელ-ფოსტა"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl pl-12 pr-4 py-4 text-sm focus:border-blue-500 focus:outline-none text-slate-800 dark:text-white placeholder-slate-400 transition-all"
                  />
                </div>

                {mode === 'register' && (
                  <div className="relative">
                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="ტელეფონი"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl pl-12 pr-4 py-4 text-sm focus:border-blue-500 focus:outline-none text-slate-800 dark:text-white placeholder-slate-400 transition-all"
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
                      placeholder="პაროლი"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl pl-12 pr-12 py-4 text-sm focus:border-blue-500 focus:outline-none text-slate-800 dark:text-white placeholder-slate-400 transition-all"
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
                      placeholder="პაროლის დადასტურება"
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl pl-12 pr-4 py-4 text-sm focus:border-blue-500 focus:outline-none text-slate-800 dark:text-white placeholder-slate-400 transition-all"
                    />
                  </div>
                )}

                {mode === 'login' && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setMode('forgot')}
                      className="text-sm text-blue-600 hover:underline font-medium"
                    >
                      პაროლი დაგავიწყდათ?
                    </button>
                  </div>
                )}

                <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-semibold text-lg transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-2">
                  {mode === 'login' && 'შესვლა'}
                  {mode === 'register' && 'ანგარიშის შექმნა'}
                  {mode === 'forgot' && 'გაგზავნა'}
                  <ArrowRight size={20} />
                </button>

                {/* Divider */}
                {mode !== 'forgot' && (
                  <>
                    <div className="flex items-center gap-4 my-2">
                      <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
                      <span className="text-sm text-slate-400">ან</span>
                      <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
                    </div>

                    {/* Social */}
                    <div className="grid grid-cols-2 gap-3">
                      <button className="flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-600 rounded-xl py-3 text-sm font-medium text-slate-700 dark:text-white hover:border-blue-300 transition-colors">
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Google
                      </button>
                      <button className="flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-600 rounded-xl py-3 text-sm font-medium text-slate-700 dark:text-white hover:border-blue-300 transition-colors">
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1877F2">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        Facebook
                      </button>
                    </div>
                  </>
                )}

                {mode === 'forgot' && (
                  <button
                    onClick={() => setMode('login')}
                    className="w-full text-center text-sm text-blue-600 font-medium hover:underline"
                  >
                    შესვლაზე დაბრუნება
                  </button>
                )}
              </div>
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
            <span className="text-blue-400 text-sm font-semibold uppercase tracking-widest">TbilisiRealtors.ge</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mt-2 mb-4">
              პრემიუმ სერვისი<br />ყველასთვის
            </h2>
            <p className="text-slate-400 text-lg">
              შეუერთდით 8,200+ კლიენტს, ვინც ჩვენი პლატფორმა ირჩევს ყოველდღე.
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
              "TbilisiRealtors.ge-ს დახმარებით ვიპოვე ჩემი სოციუმი ვაკეში. სერვისი ძალიან მარტივი და სწრაფია."
            </p>
            <div className="flex items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80"
                alt="User"
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <p className="text-white font-semibold text-sm">ეკა ჯაფარიძე</p>
                <p className="text-slate-400 text-xs">ბინის მყიდველი, ვაკე</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
