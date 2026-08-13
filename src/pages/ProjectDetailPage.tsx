import { useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import {
  MapPin, Home, Phone, Building2, Car, Layers, TreePine,
  Calendar, HardHat, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { getProjectBySlug } from '../data/mockData';
import { useCurrency } from '../contexts/CurrencyContext';
import { useTranslation } from '../i18n/LocaleContext';
import { projectStatusLabels } from '../i18n/labels';
import BuildingUnitPicker from '../components/BuildingUnitPicker';
import PropertyMap from '../components/PropertyMap';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: '1px solid #f0f2f5' }}>
      <span className="text-[13px]" style={{ color: '#9ea0a7' }}>{label}</span>
      <span className="text-[13px] font-bold text-right" style={{ color: '#191c1e' }}>{value}</span>
    </div>
  );
}

function ChipGrid({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(item => (
        <span
          key={item}
          className="px-2.5 py-1.5 rounded-lg text-[12px] font-semibold"
          style={{ background: '#f8f9fb', color: '#45464d', border: '1px solid #eceef0' }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export default function ProjectDetailPage() {
  const { slug } = useParams();
  const project = slug ? getProjectBySlug(slug) : undefined;
  const { t } = useTranslation();
  const { formatMoney } = useCurrency();
  const [showPhone, setShowPhone] = useState(false);
  const [renderIndex, setRenderIndex] = useState(0);

  if (!project) return <Navigate to="/projects" replace />;

  const statusLabels = projectStatusLabels(t);
  const paymentLabels: Record<string, string> = {
    installment: t('home.projectDetail.installment'),
    mortgage: t('home.projectDetail.mortgage'),
    cash: t('home.projectDetail.cash'),
  };

  const statItems = [
    { icon: Calendar, label: t('home.projectDetail.delivery'), value: project.deliveryDate },
    { icon: Building2, label: t('home.projectDetail.buildings'), value: String(project.buildings) },
    { icon: Car, label: t('home.projectDetail.parking'), value: String(project.parking) },
    { icon: Layers, label: t('home.projectDetail.apartments'), value: String(project.units) },
    { icon: HardHat, label: t('home.projectDetail.rooms'), value: project.bedroomOptions.join(', ') },
    { icon: TreePine, label: t('home.projectDetail.greenArea'), value: `${project.greenArea} მ²` },
  ];

  return (
    <div className="min-h-screen pt-[56px] lg:pt-[106px]" style={{ background: '#f7f9fb' }}>
      <div className="bg-white" style={{ borderBottom: '1px solid #eceef0' }}>
        <div className="container-xl py-3">
          <div className="flex items-center gap-2 text-sm flex-wrap" style={{ color: '#76777d' }}>
            <Link to="/" className="hover:text-[#2563eb] transition-colors inline-flex items-center gap-1">
              <Home size={14} />{t('property.home')}
            </Link>
            <span style={{ color: '#c6c6cd' }}>/</span>
            <Link to="/projects" className="hover:text-[#2563eb] transition-colors">{t('home.sections.projects')}</Link>
            <span style={{ color: '#c6c6cd' }}>/</span>
            <span className="font-semibold truncate" style={{ color: '#191c1e' }}>{project.name}</span>
          </div>
        </div>
      </div>

      <div className="container-xl py-6 lg:py-8">
        <div className="grid lg:grid-cols-3 gap-5 lg:gap-6">

          <div className="lg:col-span-2 space-y-4">
            {/* Hero card */}
            <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1.5px solid #eceef0' }}>
              <div className="relative aspect-[16/9] sm:aspect-[2/1]">
                <img src={project.images[renderIndex] ?? project.image} alt={project.name} className="absolute inset-0 w-full h-full object-cover" />
                <span
                  className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                  style={{
                    background: project.status === 'completed' ? '#ecfdf5' : project.status === 'presale' ? '#eff6ff' : '#fff7ed',
                    color: project.status === 'completed' ? '#059669' : project.status === 'presale' ? '#2563eb' : '#c2410c',
                  }}
                >
                  {statusLabels[project.status]}
                </span>
                {project.images.length > 1 && (
                  <>
                    <button type="button" onClick={() => setRenderIndex(i => (i - 1 + project.images.length) % project.images.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.9)' }}>
                      <ChevronLeft size={16} />
                    </button>
                    <button type="button" onClick={() => setRenderIndex(i => (i + 1) % project.images.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.9)' }}>
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}
              </div>
              <div className="p-4 sm:p-5">
                <h1 className="font-extrabold text-xl sm:text-2xl mb-1" style={{ color: '#191c1e', letterSpacing: '-0.02em' }}>
                  {project.name}
                </h1>
                <p className="flex items-center gap-1.5 text-[13px] mb-3" style={{ color: '#9ea0a7' }}>
                  <MapPin size={14} style={{ color: '#2563eb' }} />
                  {project.address}, {project.district}, {project.city}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {statItems.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="rounded-xl px-2 py-2 text-center" style={{ background: '#f8f9fb' }}>
                      <Icon size={14} className="mx-auto mb-1" style={{ color: '#2563eb' }} />
                      <p className="text-[11px] font-bold leading-tight truncate" style={{ color: '#191c1e' }}>{value}</p>
                      <p className="text-[8px] font-semibold uppercase mt-0.5 truncate" style={{ color: '#9ea0a7' }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Construction status */}
            <div className="bg-white rounded-2xl p-4 sm:p-5" style={{ border: '1.5px solid #eceef0' }}>
              <h2 className="font-extrabold text-[15px] mb-3" style={{ color: '#191c1e' }}>{t('home.projectDetail.constructionStatus')}</h2>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold" style={{ background: '#eff6ff', color: '#2563eb' }}>
                  {statusLabels[project.status]}
                </span>
                <span className="text-[13px] font-medium" style={{ color: '#6b7280' }}>{project.constructionNote}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: '#f0f2f5' }}>
                <div className="h-full rounded-full" style={{ width: `${project.constructionProgress}%`, background: '#2563eb' }} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl p-3 text-center" style={{ background: '#f8f9fb' }}>
                  <p className="text-lg font-extrabold" style={{ color: '#191c1e' }}>{project.floors}</p>
                  <p className="text-[10px] font-semibold uppercase mt-0.5" style={{ color: '#9ea0a7' }}>{t('home.projectDetail.floors')}</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: '#f8f9fb' }}>
                  <p className="text-sm font-extrabold leading-tight" style={{ color: '#191c1e' }}>{project.deliveryCondition}</p>
                  <p className="text-[10px] font-semibold uppercase mt-0.5" style={{ color: '#9ea0a7' }}>{t('home.projectDetail.deliveryCondition')}</p>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background: '#f8f9fb' }}>
                  <p className="text-lg font-extrabold" style={{ color: '#191c1e' }}>{project.units}</p>
                  <p className="text-[10px] font-semibold uppercase mt-0.5" style={{ color: '#9ea0a7' }}>{t('home.projectDetail.apartments')}</p>
                </div>
              </div>
            </div>

            {/* Unit picker */}
            <div className="bg-white rounded-2xl p-4 sm:p-5" style={{ border: '1.5px solid #eceef0' }}>
              <h2 className="font-extrabold text-[15px] mb-4" style={{ color: '#191c1e' }}>{t('home.projectDetail.unitPicker')}</h2>
              <BuildingUnitPicker units={project.projectUnits} />
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl p-4 sm:p-5" style={{ border: '1.5px solid #eceef0' }}>
              <h2 className="font-extrabold text-[15px] mb-3" style={{ color: '#191c1e' }}>{t('home.projectDetail.description')}</h2>
              <p className="text-[14px] leading-relaxed" style={{ color: '#45464d' }}>{project.description}</p>
            </div>

            {/* Renders gallery */}
            <div className="bg-white rounded-2xl p-4 sm:p-5" style={{ border: '1.5px solid #eceef0' }}>
              <h2 className="font-extrabold text-[15px] mb-1" style={{ color: '#191c1e' }}>{t('home.projectDetail.renders')}</h2>
              <p className="text-[12px] mb-3" style={{ color: '#9ea0a7' }}>{t('home.projectDetail.rendersHint')}</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {project.images.map((img, i) => (
                  <button key={img} type="button" onClick={() => setRenderIndex(i)} className="flex-shrink-0 rounded-xl overflow-hidden"
                    style={{ border: renderIndex === i ? '2px solid #2563eb' : '2px solid transparent' }}>
                    <img src={img} alt="" className="w-40 h-24 object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Territory + services + security */}
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { title: t('home.projectDetail.territory'), keys: project.territoryAmenities, prefix: 'home.projectDetail.amenities' },
                { title: t('home.projectDetail.postDelivery'), keys: project.postDeliveryServices, prefix: 'home.projectDetail.services' },
                { title: t('home.projectDetail.security'), keys: project.securityFeatures, prefix: 'home.projectDetail.securityItems' },
              ].map(({ title, keys, prefix }) => (
                <div key={title} className="bg-white rounded-2xl p-4" style={{ border: '1.5px solid #eceef0' }}>
                  <h3 className="font-extrabold text-[13px] mb-2.5" style={{ color: '#191c1e' }}>{title}</h3>
                  <ChipGrid items={keys.map(k => (t as (key: string) => string)(`${prefix}.${k}`))} />
                </div>
              ))}
            </div>

            {/* Map */}
            <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1.5px solid #eceef0' }}>
              <PropertyMap lat={project.coordinates.lat} lng={project.coordinates.lng} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 sm:p-5 lg:sticky lg:top-[118px]" style={{ border: '1.5px solid #eceef0' }}>
              <h2 className="font-extrabold text-[15px] mb-3" style={{ color: '#191c1e' }}>{t('home.projectDetail.details')}</h2>
              <DetailRow label={t('home.projectDetail.area')} value={`${project.areaFrom} – ${project.areaTo} მ²`} />
              <DetailRow
                label={t('home.projectDetail.pricePerSqm')}
                value={`${formatMoney(project.pricePerSqmFrom)} – ${formatMoney(project.pricePerSqmTo)}`}
              />
              <DetailRow
                label={t('home.projectDetail.price')}
                value={`${formatMoney(project.priceFrom)} – ${formatMoney(project.priceTo)}`}
              />
              <DetailRow label={t('home.projectDetail.deliveryDate')} value={project.deliveryDate} />
              <div className="py-2.5" style={{ borderBottom: '1px solid #f0f2f5' }}>
                <p className="text-[13px] mb-2" style={{ color: '#9ea0a7' }}>{t('home.projectDetail.paymentOptions')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {project.paymentOptions.map(opt => (
                    <span key={opt} className="px-2 py-1 rounded-md text-[11px] font-bold" style={{ background: '#eff6ff', color: '#2563eb' }}>
                      {paymentLabels[opt]}
                    </span>
                  ))}
                </div>
              </div>
              <DetailRow label={t('home.projectDetail.developer')} value={project.developer} />
              {project.managementCompany && (
                <DetailRow label={t('home.projectDetail.management')} value={project.managementCompany} />
              )}

              <button
                type="button"
                onClick={() => setShowPhone(true)}
                className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-[14px]"
                style={{ background: '#2563eb' }}
              >
                <Phone size={16} />
                {showPhone ? project.phone : t('home.projectDetail.showPhone')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
