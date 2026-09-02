import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, Star, CheckCircle, Phone, Mail, Building2, Users, ArrowRight, X,
} from 'lucide-react';
import { useTranslation } from '../i18n/LocaleContext';
import { useAgents, useTeam } from '../hooks/usePublicData';
import { CONTACT } from '../data/contactInfo';
import type { Agent, TeamMember } from '../types/listing';

const PAGE_BG = '#f7f9fb';
const CARD_BORDER = '#e6e8ea';
const CARD_SHADOW = '0 4px 20px rgba(15,23,42,0.04)';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('') || '—';
}

function matchesQuery(hay: string, q: string) {
  return !q || hay.toLowerCase().includes(q);
}

const AVATAR_COLORS = ['#2563eb', '#0f766e', '#b45309', '#7c3aed', '#0369a1', '#be185d'];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i) * (i + 1)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, '');
  const local = digits.startsWith('995') ? digits.slice(3) : digits;
  if (local.length === 9) {
    return `+995 ${local.slice(0, 3)} ${local.slice(3, 5)} ${local.slice(5, 7)} ${local.slice(7)}`;
  }
  return raw;
}

export default function AgentsPage() {
  const { t } = useTranslation();
  const { data: agents, loading } = useAgents();
  const { data: team } = useTeam();
  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const query = search.trim().toLowerCase();

  const allSpecializations = useMemo(
    () => [...new Set(agents.flatMap(agent => agent.specialization))].sort((a, b) => a.localeCompare(b, 'ka')),
    [agents],
  );

  const filteredTeam = useMemo(
    () => team.filter(member => matchesQuery(
      [member.name, member.jobTitle, member.bio, member.phone].filter(Boolean).join(' '),
      query,
    )),
    [team, query],
  );

  const filtered = useMemo(() => agents.filter(agent => {
    if (verifiedOnly && !agent.verified) return false;
    if (specialization && !agent.specialization.includes(specialization)) return false;
    return matchesQuery(
      [agent.name, agent.company, agent.bio, agent.phone, agent.email, ...agent.specialization, ...agent.languages].join(' '),
      query,
    );
  }), [agents, query, specialization, verifiedOnly]);

  const brokerCount = filtered.length + filteredTeam.length;
  const totalBrokers = agents.length + team.length;
  const withPhone = team.filter(member => member.phone).length + agents.filter(agent => agent.phone).length;

  const hasFilters = Boolean(query || specialization || verifiedOnly);
  const empty = !loading && brokerCount === 0;

  return (
    <div className="min-h-screen page-under-header" style={{ background: PAGE_BG }}>
      <section
        className="relative overflow-hidden border-b"
        style={{ background: '#ffffff', borderColor: '#eceef0' }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 12% -10%, rgba(37,99,235,0.08) 0%, transparent 62%), radial-gradient(ellipse 50% 40% at 92% 0%, rgba(16,185,129,0.06) 0%, transparent 55%)',
          }}
        />
        <div className="container-xl relative py-12 lg:py-16">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.18em] mb-3" style={{ color: '#2563eb' }}>
              {t('agents.badge')}
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
              {t('agents.title')}
            </h1>
            <p className="text-slate-500 text-base lg:text-lg leading-relaxed">
              {t('agents.subtitle')}
            </p>
          </motion.div>

          <div className="mt-8 grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { icon: Users, label: t('agents.brokers'), value: String(totalBrokers) },
              { icon: Building2, label: t('common.address'), value: CONTACT.city },
              { icon: Phone, label: t('agents.call'), value: String(withPhone) },
            ].map(stat => (
              <div
                key={stat.label}
                className="rounded-2xl border bg-white px-4 py-3.5 flex items-center gap-3"
                style={{ borderColor: CARD_BORDER, boxShadow: CARD_SHADOW }}
              >
                <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(37,99,235,0.08)' }}>
                  <stat.icon size={18} className="text-blue-600" />
                </span>
                <div>
                  <p className="text-xl font-extrabold text-slate-900 leading-none">{stat.value}</p>
                  <p className="text-[11px] font-semibold text-slate-400 mt-1">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container-xl py-10 lg:py-14">
        <div
          className="rounded-2xl border bg-white p-4 sm:p-5 mb-10"
          style={{ borderColor: CARD_BORDER, boxShadow: CARD_SHADOW }}
        >
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('agents.searchPlaceholder')}
                className="w-full rounded-xl border pl-11 pr-10 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:outline-none"
                style={{ background: PAGE_BG, borderColor: '#e0e3e5' }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {agents.length > 0 && (
              <button
                type="button"
                onClick={() => setVerifiedOnly(v => !v)}
                className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border transition-colors ${
                  verifiedOnly
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                }`}
              >
                <CheckCircle size={15} />
                {t('agents.verifiedOnly')}
              </button>
            )}
          </div>

          {allSpecializations.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              <SpecChip
                active={!specialization}
                onClick={() => setSpecialization('')}
                label={t('agents.allSpecs')}
              />
              {allSpecializations.map(spec => (
                <SpecChip
                  key={spec}
                  active={specialization === spec}
                  onClick={() => setSpecialization(specialization === spec ? '' : spec)}
                  label={spec}
                />
              ))}
            </div>
          )}

          <p className="text-xs font-medium text-slate-400 mt-4">
            {t('agents.results', { count: brokerCount })}
          </p>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[460px] rounded-2xl bg-white border animate-pulse" style={{ borderColor: CARD_BORDER }} />
            ))}
          </div>
        ) : empty ? (
          <div className="rounded-3xl border bg-white py-20 text-center px-6" style={{ borderColor: CARD_BORDER }}>
            <Users size={36} className="mx-auto text-slate-300 mb-4" />
            <p className="text-lg font-extrabold text-slate-800">{t('agents.empty')}</p>
            <p className="text-sm text-slate-500 mt-1">{t('agents.emptyHint')}</p>
            {hasFilters && (
              <button
                type="button"
                onClick={() => { setSearch(''); setSpecialization(''); setVerifiedOnly(false); }}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold"
              >
                {t('common.clear')}
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredTeam.map((member, index) => (
              <TeamCard key={member.id} member={member} index={index} t={t} />
            ))}
            {filtered.map((agent, index) => (
              <AgentCard key={agent.id} agent={agent} index={filteredTeam.length + index} t={t} />
            ))}
          </div>
        )}

        <div
          className="mt-12 rounded-3xl border bg-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5"
          style={{ borderColor: CARD_BORDER, boxShadow: CARD_SHADOW }}
        >
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-extrabold text-slate-900">{t('agents.ctaTitle')}</h2>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">{t('agents.ctaNote')}</p>
          </div>
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
            >
              {t('agents.ctaButton')}
              <ArrowRight size={15} />
            </Link>
            <a
              href={`tel:${CONTACT.mobile.tel}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:border-blue-300 hover:text-blue-700 transition-colors"
            >
              <Phone size={15} />
              {CONTACT.mobile.display}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
        active
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
      }`}
    >
      {label}
    </button>
  );
}

function TeamCard({
  member, index, t,
}: {
  member: TeamMember;
  index: number;
  t: (key: string) => string;
}) {
  const color = avatarColor(member.name);
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.24), duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border bg-white overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col"
      style={{ borderColor: CARD_BORDER, boxShadow: CARD_SHADOW }}
    >
      <div className="h-28 relative" style={{ background: `linear-gradient(135deg, ${color}14 0%, #ffffff 70%)` }}>
        <div className="absolute -bottom-8 left-5">
          <div
            className="w-16 h-16 rounded-2xl overflow-hidden border-[3px] border-white shadow-md flex items-center justify-center text-lg font-extrabold text-white"
            style={{ background: color }}
          >
            {member.photo
              ? <img src={member.photo} alt="" className="w-full h-full object-cover" />
              : initials(member.name)}
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col px-5 pt-11 pb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">{t('agents.badge')}</p>
        <h3 className="text-[17px] font-extrabold text-slate-900 leading-snug mt-0.5">{member.name}</h3>
        {member.jobTitle && (
          <p className="text-sm font-semibold text-slate-500 mt-0.5">{member.jobTitle}</p>
        )}
        {member.bio && (
          <p className="text-sm text-slate-500 leading-relaxed mt-3 line-clamp-3">{member.bio}</p>
        )}
        <div className="mt-auto pt-4">
          {member.phone ? (
            <a
              href={`tel:${member.phone}`}
              className="inline-flex items-center gap-2 w-full justify-center px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50/40 transition-colors"
            >
              <Phone size={14} />
              {formatPhone(member.phone)}
            </a>
          ) : (
            <p className="text-xs font-semibold text-slate-400">{t('agents.write')}</p>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function AgentCard({
  agent, index, t,
}: {
  agent: Agent;
  index: number;
  t: (key: string) => string;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.24), duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="group rounded-2xl border bg-white overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
      style={{ borderColor: CARD_BORDER, boxShadow: CARD_SHADOW }}
    >
      <Link to={`/agent/${agent.id}`} className="relative block h-56 overflow-hidden bg-slate-100">
        <img
          src={agent.photo}
          alt=""
          className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent" />
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          {agent.verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-extrabold text-blue-700 shadow-sm">
              <CheckCircle size={11} />
              {t('common.verified')}
            </span>
          ) : <span />}
          <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-extrabold text-amber-700 shadow-sm">
            <Star size={11} className="fill-amber-400 text-amber-400" />
            {agent.rating.toFixed(1)}
          </span>
        </div>
      </Link>

      <div className="flex-1 flex flex-col p-5">
        <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
          <Link to={`/agent/${agent.id}`} className="hover:text-blue-700 transition-colors">
            {agent.name}
          </Link>
        </h3>
        <p className="text-sm font-semibold text-blue-600 mt-0.5">{agent.company}</p>

        {agent.bio && (
          <p className="text-sm text-slate-500 leading-relaxed mt-2.5 line-clamp-2">{agent.bio}</p>
        )}

        {agent.languages.length > 0 && (
          <p className="text-[11px] text-slate-400 mt-2">
            <span className="font-bold text-slate-500">{t('agents.languages')}: </span>
            {agent.languages.join(' · ')}
          </p>
        )}

        {agent.specialization.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {agent.specialization.slice(0, 4).map(spec => (
              <span key={spec} className="rounded-full bg-slate-50 border border-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                {spec}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mt-4 py-3 border-y border-slate-100">
          <Stat value={agent.propertyCount} label={t('agents.listings')} />
          <Stat value={agent.reviewCount} label={t('agents.reviews')} />
          <Stat value={agent.yearsExperience} label={t('agents.experience')} />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Link
            to={`/agent/${agent.id}`}
            className="flex-1 text-center py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors"
          >
            {t('agents.profile')}
          </Link>
          {agent.phone && (
            <a
              href={`tel:${agent.phone}`}
              title={`${t('agents.call')} ${agent.phone}`}
              className="h-10 px-3 inline-flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700 transition-colors"
            >
              <Phone size={15} />
            </a>
          )}
          {agent.email && (
            <a
              href={`mailto:${agent.email}`}
              title={agent.email}
              className="h-10 px-3 inline-flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700 transition-colors"
            >
              <Mail size={15} />
            </a>
          )}
        </div>
          {agent.phone && (
            <p className="mt-2.5 text-[12px] font-semibold text-slate-500 truncate">{formatPhone(agent.phone)}</p>
          )}
      </div>
    </motion.article>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-lg font-extrabold text-slate-900 leading-none">{value || '—'}</p>
      <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wide">{label}</p>
    </div>
  );
}
