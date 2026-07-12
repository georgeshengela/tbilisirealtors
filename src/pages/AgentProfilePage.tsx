import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Star, CheckCircle, Phone, Mail, MapPin, Building2,
  Clock, MessageSquare, Award, ArrowRight
} from 'lucide-react';
import { agents, properties } from '../data/mockData';
import PropertyCard from '../components/PropertyCard';

export default function AgentProfilePage() {
  const { id } = useParams();
  const agent = agents.find(a => a.id === id) || agents[0];
  const agentProperties = properties.filter(p => p.agent.id === agent.id);

  const reviews = [
    { name: 'ეკა ბერიძე', rating: 5, date: '2026-06-01', text: 'გამოცდილი და პროფესიონალი სპეციალისტი. ძალიან კმაყოფილი ვარ.' },
    { name: 'ნიკა სანიკიძე', rating: 5, date: '2026-05-15', text: 'სწრაფად მოიძია ჩვენთვის სასურველი ბინა. გირჩევ ყველას!' },
    { name: 'თამარ ხვედელიძე', rating: 4, date: '2026-04-20', text: 'კარგი სპეციალისტი, ყოველ ნაბიჯზე გვეხმარებოდა.' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-20">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(37,99,235,.5) 0%, transparent 50%)',
          }}
        />
        <div className="container-xl py-16 relative">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
            {/* Photo */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative"
            >
              <img
                src={agent.photo}
                alt={agent.name}
                className="w-36 h-36 rounded-3xl object-cover border-4 border-white/20 shadow-2xl"
              />
              {agent.verified && (
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 rounded-full border-3 border-white flex items-center justify-center shadow-lg">
                  <CheckCircle size={20} className="text-white" fill="white" />
                </div>
              )}
            </motion.div>

            {/* Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1 text-white"
            >
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl lg:text-4xl font-bold">{agent.name}</h1>
                {agent.verified && (
                  <span className="bg-blue-600/30 border border-blue-400/30 text-blue-300 text-xs px-3 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle size={12} />
                    ვერიფიცირებული
                  </span>
                )}
              </div>
              <p className="text-blue-300 text-lg mb-4">{agent.company}</p>

              <div className="flex flex-wrap gap-6 mb-4 text-slate-300">
                <div className="flex items-center gap-2">
                  <Star size={18} className="text-amber-400" fill="currentColor" />
                  <span className="font-bold text-white text-lg">{agent.rating}</span>
                  <span className="text-sm">({agent.reviewCount} შეფასება)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 size={18} className="text-blue-400" />
                  <span>{agent.propertyCount} განცხადება</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award size={18} className="text-amber-400" />
                  <span>{agent.yearsExperience} წლის გამოცდილება</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-emerald-400" />
                  <span>რეაგირება: 1 საათში</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {agent.specialization.map(s => (
                  <span key={s} className="glass text-white text-sm px-3 py-1.5 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col gap-3 min-w-52"
            >
              <a
                href={`tel:${agent.phone}`}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3.5 px-6 rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/30"
              >
                <Phone size={18} />
                {agent.phone}
              </a>
              <a
                href={`mailto:${agent.email}`}
                className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white py-3.5 px-6 rounded-xl font-semibold hover:bg-white/20 transition-all"
              >
                <Mail size={18} />
                ელ-ფოსტა
              </a>
              <button className="flex items-center justify-center gap-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 py-3.5 px-6 rounded-xl font-semibold hover:bg-emerald-600/30 transition-all">
                <MessageSquare size={18} />
                შეტყობინება
              </button>
            </motion.div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-12 pt-8 border-t border-white/10">
            {[
              { label: 'განცხადება', value: agent.propertyCount },
              { label: 'შეფასება', value: agent.reviewCount },
              { label: 'წლის გამოცდ.', value: agent.yearsExperience },
              { label: 'დახურული გარ.', value: Math.round(agent.propertyCount * 0.85) },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-slate-400 text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container-xl py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left */}
          <div className="lg:col-span-2 space-y-10">
            {/* About */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">ჩემს შესახებ</h2>
              <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">{agent.bio}</p>
              <div className="mt-4 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
                  <MapPin size={16} className="text-blue-500" />
                  <span>თბილისი, საქართველო</span>
                </div>
                <div>
                  <span className="text-sm text-slate-500">ენები: </span>
                  {agent.languages.map((l, i) => (
                    <span key={l} className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                      {l}{i < agent.languages.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            {/* Properties */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  ჩემი განცხადებები ({agentProperties.length})
                </h2>
                <Link to="/listings" className="text-blue-600 text-sm font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                  ყველა <ArrowRight size={16} />
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {agentProperties.length > 0
                  ? agentProperties.slice(0, 4).map(p => <PropertyCard key={p.id} property={p} />)
                  : properties.slice(0, 2).map(p => <PropertyCard key={p.id} property={p} />)
                }
              </div>
            </section>

            {/* Reviews */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                კლიენტების შეფასებები
              </h2>
              <div className="space-y-4">
                {reviews.map((review, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                          {review.name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{review.name}</p>
                          <p className="text-xs text-slate-500">{review.date}</p>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {Array.from({ length: review.rating }).map((_, j) => (
                          <Star key={j} size={14} className="text-amber-400" fill="currentColor" />
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{review.text}</p>
                  </motion.div>
                ))}
              </div>
            </section>
          </div>

          {/* Right: Contact card */}
          <div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 sticky top-28">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-5">კონტაქტი</h3>

              <div className="space-y-3 mb-6">
                <a href={`tel:${agent.phone}`} className="flex items-center gap-3 text-slate-700 dark:text-slate-200 hover:text-blue-600 transition-colors">
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                    <Phone size={18} className="text-blue-600" />
                  </div>
                  <span className="font-medium">{agent.phone}</span>
                </a>
                <a href={`mailto:${agent.email}`} className="flex items-center gap-3 text-slate-700 dark:text-slate-200 hover:text-blue-600 transition-colors">
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
                    <Mail size={18} className="text-blue-600" />
                  </div>
                  <span className="font-medium">{agent.email}</span>
                </a>
              </div>

              <form className="space-y-3">
                <input
                  placeholder="სახელი გვარი"
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 focus:outline-none placeholder-slate-400"
                />
                <input
                  placeholder="ტელეფონი"
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 focus:outline-none placeholder-slate-400"
                />
                <textarea
                  placeholder="შეტყობინება..."
                  rows={4}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white focus:border-blue-500 focus:outline-none placeholder-slate-400 resize-none"
                />
                <button className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/30">
                  შეტყობინების გაგზავნა
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
