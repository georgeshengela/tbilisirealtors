import { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Clock, Send, CheckCircle } from 'lucide-react';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  const contactInfo = [
    {
      icon: Phone,
      label: 'ტელეფონი',
      values: ['+995 322 12 34 56', '+995 322 98 76 54'],
      color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
    },
    {
      icon: Mail,
      label: 'ელ-ფოსტა',
      values: ['info@tbilisirealtors.ge', 'support@tbilisirealtors.ge'],
      color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600',
    },
    {
      icon: MapPin,
      label: 'მისამართი',
      values: ['ჭავჭავაძის გამზ. 14', 'თბილისი, 0179, საქართველო'],
      color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600',
    },
    {
      icon: Clock,
      label: 'სამუშაო საათები',
      values: ['ორ–პარ: 9:00 – 20:00', 'შაბ: 10:00 – 17:00'],
      color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-14 lg:pt-[102px]">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-blue-900 py-20">
        <div className="container-xl text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-blue-400 text-sm font-semibold uppercase tracking-widest">კონტაქტი</span>
            <h1 className="text-4xl lg:text-5xl font-bold text-white mt-3 mb-4">
              კავშირი ჩვენთან
            </h1>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              ჩვენი გუნდი მზადაა გიპასუხოთ ნებისმიერ კითხვაზე.
              საშუალოდ ვუპასუხებთ 1 საათის განმავლობაში.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container-xl py-16">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Info */}
          <div className="space-y-5">
            {contactInfo.map((info, i) => (
              <motion.div
                key={info.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 flex gap-4"
              >
                <div className={`w-12 h-12 rounded-xl ${info.color} flex items-center justify-center flex-shrink-0`}>
                  <info.icon size={22} />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white mb-1">{info.label}</p>
                  {info.values.map(v => (
                    <p key={v} className="text-slate-500 dark:text-slate-400 text-sm">{v}</p>
                  ))}
                </div>
              </motion.div>
            ))}

            {/* Map */}
            <div className="map-placeholder rounded-2xl h-52 flex items-center justify-center border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="text-center text-white relative z-10">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow">
                  <MapPin size={20} />
                </div>
                <p className="font-semibold">ჩვენი ოფისი</p>
                <p className="text-slate-400 text-sm">ჭავჭავაძის გამზ. 14</p>
              </div>
              <div className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
                  backgroundSize: '30px 30px',
                }}
              />
            </div>
          </div>

          {/* Right: Form */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm"
            >
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">შეტყობინების გაგზავნა</h2>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-5">
                    <CheckCircle size={40} className="text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">გაგზავნილია!</h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    მადლობა! ჩვენი გუნდი მალე დაგიკავშირდებათ.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                        სახელი გვარი *
                      </label>
                      <input
                        required
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="თქვენი სახელი"
                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3.5 text-sm text-slate-800 dark:text-white focus:border-blue-500 focus:outline-none placeholder-slate-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                        ელ-ფოსტა *
                      </label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="email@example.com"
                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3.5 text-sm text-slate-800 dark:text-white focus:border-blue-500 focus:outline-none placeholder-slate-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                        ტელეფონი
                      </label>
                      <input
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="+995 5XX XXX XXX"
                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3.5 text-sm text-slate-800 dark:text-white focus:border-blue-500 focus:outline-none placeholder-slate-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                        თემა *
                      </label>
                      <select
                        required
                        value={form.subject}
                        onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3.5 text-sm text-slate-800 dark:text-white focus:border-blue-500 focus:outline-none transition-all appearance-none"
                      >
                        <option value="">თემის არჩევა</option>
                        <option value="buy">განცხადების შეძენა</option>
                        <option value="sell">განცხადების გაყიდვა</option>
                        <option value="rent">გაქირავება</option>
                        <option value="agent">აგენტის კავშირი</option>
                        <option value="other">სხვა</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                      შეტყობინება *
                    </label>
                    <textarea
                      required
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      placeholder="გვიამბეთ თქვენს შესახებ და დასვით კითხვა..."
                      rows={6}
                      className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3.5 text-sm text-slate-800 dark:text-white focus:border-blue-500 focus:outline-none placeholder-slate-400 transition-all resize-none"
                    />
                  </div>

                  <div className="flex items-start gap-3">
                    <input type="checkbox" required className="mt-1 w-4 h-4 text-blue-600 rounded" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      ვეთანხმები{' '}
                      <a href="#" className="text-blue-600 hover:underline">კონფიდენციალურობის პოლიტიკას</a>
                      {' '}და{' '}
                      <a href="#" className="text-blue-600 hover:underline">გამოყენების წესებს</a>
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-semibold text-lg transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/30 flex items-center justify-center gap-2 group"
                  >
                    <Send size={20} />
                    შეტყობინების გაგზავნა
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
