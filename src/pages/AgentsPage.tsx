import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Star, CheckCircle, Phone, Mail, Filter } from 'lucide-react';
import { agents } from '../data/mockData';

export default function AgentsPage() {
  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState('');

  const filtered = agents.filter(agent => {
    const matchSearch = !search || agent.name.toLowerCase().includes(search.toLowerCase());
    const matchSpec = !specialization || agent.specialization.includes(specialization);
    return matchSearch && matchSpec;
  });

  const allSpecializations = [...new Set(agents.flatMap(a => a.specialization))];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-14 lg:pt-[102px]">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-blue-900 py-20">
        <div className="container-xl text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-blue-400 text-sm font-semibold uppercase tracking-widest">გუნდი</span>
            <h1 className="text-4xl lg:text-5xl font-bold text-white mt-3 mb-4">ჩვენი გამოცდილი<br />სპეციალისტები</h1>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              350+ ლიცენზირებული აგენტი მზადაა დაგეხმაროთ ოცნების განცხადების პოვნაში
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container-xl py-12">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-10">
          <div className="relative flex-1 min-w-64">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="აგენტის სახელი..."
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm focus:border-blue-500 focus:outline-none text-slate-800 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
            <Filter size={16} className="text-slate-400" />
            <select
              value={specialization}
              onChange={e => setSpecialization(e.target.value)}
              className="text-sm bg-transparent text-slate-700 dark:text-white outline-none"
            >
              <option value="">სპეციალიზაცია</option>
              {allSpecializations.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{filtered.length} სპეციალისტი</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300">
                {/* Cover */}
                <div className="h-24 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 relative">
                  <div className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,.2) 1px, transparent 1px)',
                      backgroundSize: '20px 20px',
                    }}
                  />
                </div>

                <div className="px-6 pb-6">
                  {/* Avatar */}
                  <div className="flex items-end justify-between -mt-10 mb-4">
                    <div className="relative">
                      <img
                        src={agent.photo}
                        alt={agent.name}
                        className="w-20 h-20 rounded-2xl object-cover border-4 border-white dark:border-slate-800 shadow-lg"
                      />
                      {agent.verified && (
                        <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                          <CheckCircle size={14} className="text-white" fill="white" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full">
                      <Star size={14} className="text-amber-500" fill="currentColor" />
                      <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{agent.rating}</span>
                    </div>
                  </div>

                  {/* Info */}
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{agent.name}</h3>
                  <p className="text-blue-600 text-sm font-medium mb-3">{agent.company}</p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {agent.specialization.map(s => (
                      <span key={s} className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2.5 py-1 rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 py-4 border-y border-slate-100 dark:border-slate-700 mb-4">
                    <div className="text-center">
                      <p className="text-xl font-bold text-slate-900 dark:text-white">{agent.propertyCount}</p>
                      <p className="text-xs text-slate-500">განცხადება</p>
                    </div>
                    <div className="text-center border-x border-slate-100 dark:border-slate-700">
                      <p className="text-xl font-bold text-slate-900 dark:text-white">{agent.reviewCount}</p>
                      <p className="text-xs text-slate-500">შეფასება</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-slate-900 dark:text-white">{agent.yearsExperience}</p>
                      <p className="text-xs text-slate-500">წელი</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      to={`/agent/${agent.id}`}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-center py-2.5 rounded-xl text-sm font-semibold transition-all"
                    >
                      პროფილი
                    </Link>
                    <a
                      href={`tel:${agent.phone}`}
                      className="w-10 h-10 flex items-center justify-center border border-slate-200 dark:border-slate-600 rounded-xl hover:border-blue-300 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                      <Phone size={16} />
                    </a>
                    <a
                      href={`mailto:${agent.email}`}
                      className="w-10 h-10 flex items-center justify-center border border-slate-200 dark:border-slate-600 rounded-xl hover:border-blue-300 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                      <Mail size={16} />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
