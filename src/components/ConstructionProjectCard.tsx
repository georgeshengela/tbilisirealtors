import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import type { ConstructionProject } from '../data/mockData';
import { useCurrency } from '../contexts/CurrencyContext';
import { useTranslation } from '../i18n/LocaleContext';
import { projectStatusLabels } from '../i18n/labels';

export default function ConstructionProjectCard({ project }: { project: ConstructionProject }) {
  const { t } = useTranslation();
  const statusLabels = projectStatusLabels(t);
  const statusStyle: Record<ConstructionProject['status'], { bg: string; color: string }> = {
    building: { bg: '#fff7ed', color: '#c2410c' },
    presale: { bg: '#eff6ff', color: '#2563eb' },
    completed: { bg: '#ecfdf5', color: '#059669' },
  };
  const status = { label: statusLabels[project.status], ...statusStyle[project.status] };
  const { formatMoney } = useCurrency();

  return (
    <Link
      to={`/project/${project.slug}`}
      className="group block rounded-xl overflow-hidden transition-colors duration-200"
      style={{ border: '1.5px solid #e8eaed', background: '#fff' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(37,99,235,0.35)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#e8eaed'; }}
    >
      <div className="relative h-[168px] sm:h-[180px]">
        <img
          src={project.image}
          alt={project.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(8,11,18,0.92) 0%, rgba(8,11,18,0.35) 55%, rgba(8,11,18,0.08) 100%)' }}
        />
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1.5">
          <span
            className="px-1.5 py-0.5 rounded-md text-[8px] sm:text-[9px] font-bold"
            style={{ background: status.bg, color: status.color }}
          >
            {status.label}
          </span>
          <span
            className="px-1.5 py-0.5 rounded-md text-[8px] sm:text-[9px] font-semibold truncate max-w-[46%]"
            style={{ background: 'rgba(255,255,255,0.9)', color: '#45464d' }}
          >
            {project.developer}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3">
          <p className="text-white font-extrabold text-[12px] sm:text-[13px] leading-tight truncate">{project.name}</p>
          <p className="flex items-center gap-1 text-[9px] sm:text-[10px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>
            <MapPin size={9} strokeWidth={2.5} className="flex-shrink-0" />
            {project.district}, {project.city}
          </p>
          <p className="font-extrabold text-[14px] sm:text-[15px] mt-1.5 leading-none" style={{ color: '#60a5fa' }}>
            {formatMoney(project.priceFrom)}+
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 divide-x" style={{ borderTop: '1px solid #f0f2f5' }}>
        <div className="px-1.5 py-2 text-center min-w-0">
          <p className="text-[10px] font-bold leading-none truncate" style={{ color: '#191c1e' }}>{project.areaFrom}–{project.areaTo}</p>
          <p className="text-[7px] font-semibold mt-0.5 uppercase" style={{ color: '#9ea0a7' }}>{t('home.projectCard.area')}</p>
        </div>
        <div className="px-1.5 py-2 text-center min-w-0">
          <p className="text-[10px] font-bold leading-none truncate" style={{ color: '#191c1e' }}>{project.floors}</p>
          <p className="text-[7px] font-semibold mt-0.5 uppercase" style={{ color: '#9ea0a7' }}>{t('home.projectCard.floors')}</p>
        </div>
        <div className="px-1.5 py-2 text-center min-w-0">
          <p className="text-[10px] font-bold leading-none truncate" style={{ color: '#191c1e' }}>{project.bedroomOptions.join(',')}</p>
          <p className="text-[7px] font-semibold mt-0.5 uppercase" style={{ color: '#9ea0a7' }}>{t('home.projectCard.rooms')}</p>
        </div>
        <div className="px-1.5 py-2 text-center min-w-0">
          <p className="text-[10px] font-bold leading-none truncate" style={{ color: '#191c1e' }}>{project.completion}</p>
          <p className="text-[7px] font-semibold mt-0.5 uppercase" style={{ color: '#9ea0a7' }}>{t('home.projectCard.completion')}</p>
        </div>
      </div>
    </Link>
  );
}
