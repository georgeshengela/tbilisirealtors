import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CheckCircle, Award, Users, Building2, TrendingUp, ArrowRight, Star } from 'lucide-react';
import { agents } from '../data/mockData';

export default function AboutPage() {
  const values = [
    {
      icon: CheckCircle,
      title: 'სანდოობა',
      desc: 'ყველა განცხადება ვერიფიცირებულია. გამჭვირვალე პროცესი, სანდო ბიზნეს-გარემო.',
      color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
    },
    {
      icon: Award,
      title: 'ხარისხი',
      desc: 'მაღალი სტანდარტები. ჩვენი კლიენტები ღებულობენ ყველაზე ხარისხიან სერვისს.',
      color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600',
    },
    {
      icon: Users,
      title: 'გამოცდილება',
      desc: '2018 წლიდან ვეხმარებით ქართველ ოჯახებს სახლის პოვნაში.',
      color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600',
    },
    {
      icon: TrendingUp,
      title: 'ინოვაცია',
      desc: 'თანამედროვე ტექნოლოგიები, AI ანალიტიკა, ვირტუალური ტურები.',
      color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600',
    },
  ];

  const milestones = [
    { year: '2018', title: 'დასაბამი', desc: 'TbilisiRealtors.ge-ის დაარსება თბილისში.' },
    { year: '2020', title: 'გაფართოება', desc: 'ბათუმი, ქუთაისი და სხვა ქალაქების დამატება.' },
    { year: '2022', title: 'მობაილ აპი', desc: 'iOS და Android აპლიკაციის გამოშვება.' },
    { year: '2024', title: 'AI ანალიტიკა', desc: 'ხელოვნური ინტელექტის ჩართვა ბაზრის ანალიზში.' },
    { year: '2026', title: 'ახლა', desc: '12,400+ განცხადება, 350+ აგენტი, 8,200+ კლიენტი.' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Hero */}
      <div className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1920&q=80"
            alt="About Hero"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 to-blue-900/70" />
        </div>

        <div className="relative z-10 text-center container-xl max-w-4xl px-6 pt-24">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-blue-400 text-sm font-semibold uppercase tracking-widest">ჩვენს შესახებ</span>
            <h1 className="text-4xl lg:text-6xl font-bold text-white mt-3 mb-6">
              საქართველოს #1<br />
              <span className="gradient-text">უძრავი განცხადების</span><br />
              პლატფორმა
            </h1>
            <p className="text-slate-300 text-xl leading-relaxed">
              2018 წლიდან ვეხმარებით ქართველ ოჯახებს და ინვესტორებს ოცნების განცხადების პოვნაში
            </p>
          </motion.div>
        </div>
      </div>

      {/* Mission */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="container-xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-blue-600 text-sm font-semibold uppercase tracking-widest">მისია</span>
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mt-2 mb-6">
                ჩვენი მისიაა<br />სახლის პოვნის<br />გამარტივება
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed mb-6">
                TbilisiRealtors.ge შექმნილია იმისთვის, რომ ყველა ადამიანს ჰქონდეს 
                თანაბარი წვდომა განცხადების ბაზარზე. ჩვენ ვაერთიანებთ ტექნოლოგიებს, 
                გამოცდილ პროფესიონალებს და გამჭვირვალე პროცესებს.
              </p>
              <div className="space-y-3">
                {[
                  'ყველა განცხადება ვერიფიცირებულია ჩვენი გუნდის მიერ',
                  'გამჭვირვალე გარიგებები, დაფარული გადასახადების გარეშე',
                  '24/7 მხარდაჭერა ყველა კლიენტისთვის',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle size={20} className="text-emerald-500 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&q=80"
                  alt="Our Team"
                  className="w-full"
                />
              </div>
              <div className="absolute -bottom-5 -left-5 bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                    <Star size={22} className="text-white" fill="white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">4.9/5</p>
                    <p className="text-sm text-slate-500">კლიენტის შეფასება</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-slate-900">
        <div className="container-xl">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { value: '12,400+', label: 'განცხადება', icon: Building2 },
              { value: '8,200+', label: 'კლიენტი', icon: Users },
              { value: '350+', label: 'გამოცდ. აგენტი', icon: Award },
              { value: '5,800+', label: 'გარიგება', icon: CheckCircle },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-14 h-14 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <stat.icon size={24} className="text-blue-400" />
                </div>
                <p className="text-4xl font-bold text-white mb-2">{stat.value}</p>
                <p className="text-slate-400">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="container-xl">
          <div className="text-center mb-12">
            <span className="text-blue-600 text-sm font-semibold uppercase tracking-widest">ფასეულობები</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mt-2">ჩვენი პრინციპები</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((val, i) => (
              <motion.div
                key={val.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700"
              >
                <div className={`w-14 h-14 rounded-2xl ${val.color} flex items-center justify-center mb-5`}>
                  <val.icon size={26} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{val.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{val.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-slate-50 dark:bg-slate-800">
        <div className="container-xl">
          <div className="text-center mb-12">
            <span className="text-blue-600 text-sm font-semibold uppercase tracking-widest">ისტორია</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mt-2">ჩვენი გზა</h2>
          </div>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-blue-200 dark:bg-blue-800" />
            <div className="space-y-8">
              {milestones.map((m, i) => (
                <motion.div
                  key={m.year}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-6"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 z-10 relative">
                      <span className="text-white font-bold text-sm">{m.year}</span>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 flex-1 border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-2">{m.title}</h3>
                    <p className="text-slate-500 dark:text-slate-400">{m.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="container-xl">
          <div className="text-center mb-12">
            <span className="text-blue-600 text-sm font-semibold uppercase tracking-widest">გუნდი</span>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mt-2">ჩვენი გუნდი</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {agents.map((agent, i) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link to={`/agent/${agent.id}`} className="group text-center block">
                  <div className="relative mb-3 mx-auto w-24 h-24">
                    <img
                      src={agent.photo}
                      alt={agent.name}
                      className="w-full h-full rounded-2xl object-cover shadow-md group-hover:shadow-lg transition-shadow"
                    />
                  </div>
                  <p className="font-semibold text-slate-800 dark:text-white text-sm group-hover:text-blue-600 transition-colors">
                    {agent.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{agent.specialization[0]}</p>
                </Link>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/agents" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-semibold transition-all">
              ყველა სპეციალისტი
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
