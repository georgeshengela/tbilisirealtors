import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BadgePercent, Building2, CalendarClock, Headset, HardHat, MapPin } from 'lucide-react';
import type { ConstructionProject } from '../types/project';
import { useCurrency } from '../contexts/CurrencyContext';
import { useTranslation } from '../i18n/LocaleContext';
import { ProjectProgress, ProjectStatusPills } from './projects/ProjectParts';

const MAX_SHOWN = 4;

function FeatureCard({ project }: { project: ConstructionProject }) {
  const { t } = useTranslation();
  const { formatMoney } = useCurrency();
  return (
    <Link to={`/project/${project.slug}`} className="pc pc--feature">
      <img className="pc__img" src={project.image} alt={project.name} loading="lazy" decoding="async" />
      <span className="pc__shade" aria-hidden />
      <div className="pc__top">
        <ProjectStatusPills project={project} />
        <span className="pc-dev"><Building2 size={12} strokeWidth={2.4} />{project.developer}</span>
      </div>
      <div className="pc__body">
        <p className="pc__loc"><MapPin size={13} strokeWidth={2.4} />{[project.district, project.city].filter(Boolean).join(', ')}</p>
        <h3 className="pc__name">{project.name}</h3>
        <dl className="pc__stats">
          {project.priceFrom > 0 && (
            <div>
              <dt>{t('home.showcase.priceFrom')}</dt>
              <dd>{formatMoney(project.priceFrom, { compact: project.priceFrom >= 1_000_000, from: project.priceCurrency })}</dd>
            </div>
          )}
          {project.pricePerSqmFrom > 0 && (
            <div>
              <dt>{t('home.showcase.perSqm')}</dt>
              <dd>{formatMoney(project.pricePerSqmFrom, { from: project.priceCurrency })}</dd>
            </div>
          )}
          {project.units > 0 && (
            <div>
              <dt>{t('home.showcase.units')}</dt>
              <dd>{project.units}</dd>
            </div>
          )}
          {project.areaFrom > 0 && (
            <div>
              <dt>{t('home.projectCard.area')}</dt>
              <dd>{project.areaFrom}–{project.areaTo} {t('home.areaUnit')}</dd>
            </div>
          )}
        </dl>
        <div className="pc__foot">
          <ProjectProgress project={project} />
          <span className="pc__cta">{t('home.showcase.view')}<ArrowUpRight size={16} strokeWidth={2.4} /></span>
        </div>
      </div>
    </Link>
  );
}

function CompactCard({ project }: { project: ConstructionProject }) {
  const { t } = useTranslation();
  const { formatMoney } = useCurrency();
  return (
    <Link to={`/project/${project.slug}`} className="pc pc--compact">
      <div className="pc__media">
        <img className="pc__img" src={project.image} alt={project.name} loading="lazy" decoding="async" />
        <span className="pc__shade" aria-hidden />
        <ProjectStatusPills project={project} />
      </div>
      <div className="pc__info">
        <p className="pc__dev-line">{project.developer}</p>
        <h3 className="pc__name">{project.name}</h3>
        <p className="pc__loc"><MapPin size={12} strokeWidth={2.4} />{[project.district, project.city].filter(Boolean).join(', ')}</p>
        <p className="pc__price">
          <span>{t('home.showcase.priceFrom')}</span>
          <strong>
            {project.priceFrom > 0
              ? formatMoney(project.priceFrom, { compact: project.priceFrom >= 1_000_000, from: project.priceCurrency })
              : formatMoney(project.pricePerSqmFrom, { perSqm: true, from: project.priceCurrency })}
          </strong>
          {project.bedroomOptions?.length > 0 && (
            <em>· {t('home.showcase.rooms', { list: project.bedroomOptions.join(', ') })}</em>
          )}
        </p>
        <ProjectProgress project={project} compact />
      </div>
    </Link>
  );
}

/** Home page showcase: one project in the spotlight, the next ones beside it. */
export default function ProjectsShowcase({ projects }: { projects: ConstructionProject[] }) {
  const { t } = useTranslation();
  const shown = projects.slice(0, MAX_SHOWN);
  if (!shown.length) return null;
  const [lead, ...rest] = shown;

  const perks = [
    { icon: CalendarClock, label: t('home.projectChips.presale') },
    { icon: BadgePercent, label: t('home.projectChips.noCommission') },
    { icon: Headset, label: t('home.projectChips.freeConsult') },
  ];

  return (
    <div className="pcs">
      <header className="pcs__head">
        <div className="pcs__intro">
          <span className="pcs__eyebrow"><HardHat size={13} strokeWidth={2.4} />{t('home.showcase.eyebrow')}</span>
          <h2 className="pcs__title">{t('home.sections.projects')}</h2>
          <p className="pcs__sub">{t('home.showcase.subtitle')}</p>
        </div>
        <div className="pcs__side">
          <ul className="pcs__perks">
            {perks.map(perk => (
              <li key={perk.label}><perk.icon size={15} strokeWidth={2.2} />{perk.label}</li>
            ))}
          </ul>
          <Link to="/projects" className="pcs__all">
            {t('home.sections.projectsAll')}
            {projects.length > 0 && <span>{projects.length}</span>}
            <ArrowRight size={15} strokeWidth={2.4} />
          </Link>
        </div>
      </header>

      <div className={`pcs__grid ${rest.length ? '' : 'is-solo'}`}>
        <FeatureCard project={lead} />
        {rest.length > 0 && (
          <div className="pcs__list">
            {rest.map(p => <CompactCard key={p.id} project={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
