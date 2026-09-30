/** Building blocks shared by the home showcase and the projects page. */

import { Link } from 'react-router-dom';
import { ArrowUpRight, BedDouble, Building2, CalendarClock, Layers, MapPin, Maximize2, Wallet } from 'lucide-react';
import type { ConstructionProject } from '../../types/project';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useTranslation } from '../../i18n/LocaleContext';
import { projectStatusLabels } from '../../i18n/labels';
import { projectDeliveryLabel } from '../../lib/projects';

export function ProjectProgress({ project, compact = false }: { project: ConstructionProject; compact?: boolean }) {
  const { t } = useTranslation();
  const done = project.status === 'completed';
  const pct = done ? 100 : Math.min(Math.max(Math.round(project.constructionProgress || 0), 0), 100);
  const delivery = projectDeliveryLabel(project);
  return (
    <div className={`pc-progress ${compact ? 'is-compact' : ''} ${done ? 'is-done' : ''}`}>
      <div className="pc-progress__row">
        <span>{done ? t('home.showcase.delivered') : t('home.showcase.progress', { pct })}</span>
        {delivery && <span className="pc-progress__date"><CalendarClock size={12} strokeWidth={2.4} />{delivery}</span>}
      </div>
      <div className="pc-progress__track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t('home.showcase.progress', { pct })}>
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ProjectStatusPills({ project }: { project: ConstructionProject }) {
  const { t } = useTranslation();
  const labels = projectStatusLabels(t);
  return (
    <div className="pc-pills">
      <span className={`pc-pill pc-pill--${project.status}`}>{labels[project.status]}</span>
      {project.paymentOptions?.includes('installment') && (
        <span className="pc-pill pc-pill--glass"><Wallet size={11} strokeWidth={2.4} />{t('home.showcase.installment')}</span>
      )}
    </div>
  );
}

/** Full project card for the projects page grid. */
export function ProjectCard({ project }: { project: ConstructionProject }) {
  const { t } = useTranslation();
  const { formatMoney } = useCurrency();
  const unit = t('home.areaUnit');

  return (
    <Link to={`/project/${project.slug}`} className="pcard">
      <div className="pcard__media">
        <img src={project.image} alt={project.name} loading="lazy" decoding="async" />
        <span className="pcard__shade" aria-hidden />
        <div className="pcard__top">
          <ProjectStatusPills project={project} />
          <span className="pc-dev"><Building2 size={12} strokeWidth={2.4} />{project.developer}</span>
        </div>
        {(project.priceFrom > 0 || project.pricePerSqmFrom > 0) && (
          <div className="pcard__price">
            <span>{t('home.showcase.priceFrom')}</span>
            <strong>
              {project.priceFrom > 0
                ? formatMoney(project.priceFrom, { compact: project.priceFrom >= 1_000_000, from: project.priceCurrency })
                : formatMoney(project.pricePerSqmFrom, { perSqm: true, from: project.priceCurrency })}
            </strong>
            {project.priceFrom > 0 && project.pricePerSqmFrom > 0 && (
              <em>{formatMoney(project.pricePerSqmFrom, { perSqm: true, from: project.priceCurrency })}</em>
            )}
          </div>
        )}
      </div>

      <div className="pcard__body">
        <h3 className="pcard__name">{project.name}</h3>
        <p className="pcard__loc">
          <MapPin size={13} strokeWidth={2.4} />
          <span>{[project.address, project.district, project.city].filter(Boolean).join(', ')}</span>
        </p>

        <ul className="pcard__facts">
          {project.units > 0 && <li><Building2 size={14} strokeWidth={2} /><strong>{project.units}</strong> {t('home.showcase.units')}</li>}
          {project.floors > 0 && <li><Layers size={14} strokeWidth={2} /><strong>{project.floors}</strong> {t('home.projectCard.floors')}</li>}
          {project.areaFrom > 0 && (
            <li><Maximize2 size={13} strokeWidth={2} /><strong>{project.areaFrom}–{project.areaTo}</strong> {unit}</li>
          )}
          {project.bedroomOptions?.length > 0 && (
            <li><BedDouble size={14} strokeWidth={2} /><strong>{project.bedroomOptions.join(', ')}</strong> {t('home.projectCard.rooms')}</li>
          )}
        </ul>

        <div className="pcard__foot">
          <ProjectProgress project={project} compact />
          <span className="pcard__cta" aria-hidden><ArrowUpRight size={17} strokeWidth={2.4} /></span>
        </div>
      </div>
    </Link>
  );
}
