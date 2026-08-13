import { HardHat } from 'lucide-react';
import { constructionProjects } from '../data/mockData';
import { useTranslation } from '../i18n/LocaleContext';
import ConstructionProjectCard from '../components/ConstructionProjectCard';

function SectionTitle({ title, linkLabel }: { title: string; linkLabel?: string }) {
  return (
    <header className="mb-5 sm:mb-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-[9px] flex items-center justify-center" style={{ border: '2px solid #2563eb' }}>
          <HardHat size={16} strokeWidth={2.5} style={{ color: '#2563eb' }} />
        </div>
        <h1 className="font-extrabold text-xl sm:text-2xl" style={{ color: '#14161a', letterSpacing: '-0.02em' }}>{title}</h1>
      </div>
      {linkLabel && <span className="text-[13px] font-semibold" style={{ color: '#9ea0a7' }}>{linkLabel}</span>}
    </header>
  );
}

export default function ProjectsPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen pt-[56px] lg:pt-[106px] bg-white">
      <div className="container-xl py-8 sm:py-10">
        <SectionTitle title={t('home.sections.projects')} linkLabel={`${constructionProjects.length} ${t('home.projectDetail.allProjects').toLowerCase()}`} />
        <p className="text-[14px] mb-6 -mt-2" style={{ color: '#6b7280' }}>{t('home.sections.projectsSubtitle')}</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {constructionProjects.map(project => (
            <ConstructionProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </div>
  );
}
