import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Bed, Bath, Square, Heart, Share2, Phone, Mail,
  ChevronLeft, ChevronRight, X, CheckCircle, Calendar,
  Building2, Star, Eye, Home, ArrowRight, Maximize2, Sparkles, Layers
} from 'lucide-react';
import { properties } from '../data/mockData';
import PropertyMap from '../components/PropertyMap';
import PropertyCard from '../components/PropertyCard';
import { useCurrency } from '../contexts/CurrencyContext';
import { useTranslation } from '../i18n/LocaleContext';

export default function PropertyDetailPage() {
  const { t } = useTranslation();
  const { formatMoney } = useCurrency();

  const typeLabels: Record<string, string> = {
    apartment: t('propertyTypes.apartment'),
    house: t('propertyTypes.house'),
    villa: t('propertyTypes.villa'),
    commercial: t('propertyTypes.commercial'),
    land: t('propertyTypes.land'),
  };

  const formatPrice = (price: number, status: string) =>
    formatMoney(price, { perMonth: status === 'rent' });
  const { id } = useParams();
  const property = properties.find(p => p.id === id) || properties[0];
  const [activeImage, setActiveImage] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [mortgageYears, setMortgageYears] = useState(20);
  const [mortgageRate, setMortgageRate] = useState(8);
  const [downPayment, setDownPayment] = useState(20);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', message: '' });
  const [activeTab, setActiveTab] = useState<'description' | 'details' | 'amenities'>('description');

  const similar = properties
    .filter(p => p.id !== property.id && (p.city === property.city || p.type === property.type))
    .slice(0, 3);

  const monthlyPayment = () => {
    const principal = property.price * (1 - downPayment / 100);
    const r = mortgageRate / 100 / 12;
    const n = mortgageYears * 12;
    return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  };

  return (
    <div className="min-h-screen pt-[56px] lg:pt-[106px]" style={{ background: '#f7f9fb' }}>

      {/* Breadcrumb */}
      <div className="bg-white" style={{ borderBottom: '1px solid #eceef0' }}>
        <div className="container-xl py-3.5">
          <div className="flex items-center gap-2 text-sm" style={{ color: '#76777d' }}>
            <Link to="/" className="flex items-center gap-1 hover:text-[#2563eb] transition-colors">
              <Home size={14} />{t('property.home')}
            </Link>
            <span style={{ color: '#c6c6cd' }}>/</span>
            <Link to="/listings" className="hover:text-[#2563eb] transition-colors">{t('property.listing')}</Link>
            <span style={{ color: '#c6c6cd' }}>/</span>
            <span className="font-semibold truncate" style={{ color: '#191c1e' }}>{property.title}</span>
          </div>
        </div>
      </div>

      <div className="container-xl py-8">
        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── Main column ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Gallery */}
            <div
              className="bg-white rounded-[20px] overflow-hidden p-3"
              style={{ boxShadow: '0 2px 12px rgba(15,23,42,0.06)', border: '1px solid #eceef0' }}
            >
              <div
                className="relative rounded-2xl overflow-hidden cursor-pointer group"
                style={{ aspectRatio: '16/10' }}
                onClick={() => setShowGallery(true)}
              >
                <img
                  src={property.images[activeImage]}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />

                {/* Nav arrows */}
                <div className="absolute inset-0 flex items-center justify-between px-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); setActiveImage(i => (i - 1 + property.images.length) % property.images.length); }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.92)', boxShadow: '0 2px 10px rgba(0,0,0,0.12)' }}
                  >
                    <ChevronLeft size={18} style={{ color: '#191c1e' }} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setActiveImage(i => (i + 1) % property.images.length); }}
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.92)', boxShadow: '0 2px 10px rgba(0,0,0,0.12)' }}
                  >
                    <ChevronRight size={18} style={{ color: '#191c1e' }} />
                  </button>
                </div>

                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2">
                  {property.isPremium && (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
                      style={{ background: 'rgba(15,13,10,0.80)', color: '#f5c542', backdropFilter: 'blur(8px)' }}
                    >
                      <Sparkles size={9} fill="currentColor" /> {t('common.premium')}
                    </span>
                  )}
                  {property.isNew && (
                    <span
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                      style={{ background: 'rgba(16,185,129,0.88)', color: '#fff', backdropFilter: 'blur(8px)' }}
                    >
                      {t('common.new')}
                    </span>
                  )}
                </div>

                {/* Expand + counter */}
                <div className="absolute top-3 right-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.90)', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}
                  >
                    <Maximize2 size={14} style={{ color: '#45464d' }} />
                  </div>
                </div>
                <div
                  className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
                  style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
                >
                  {activeImage + 1} / {property.images.length}
                </div>
              </div>

              {/* Thumbnails */}
              <div className="flex gap-2 mt-3 overflow-x-auto pb-0.5">
                {property.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className="flex-shrink-0 rounded-xl overflow-hidden transition-all duration-200"
                    style={{
                      width: 72, height: 56,
                      border: i === activeImage ? '2px solid #2563eb' : '2px solid transparent',
                      opacity: i === activeImage ? 1 : 0.65,
                    }}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Header card */}
            <div
              className="bg-white rounded-[20px] p-6"
              style={{ boxShadow: '0 2px 12px rgba(15,23,42,0.06)', border: '1px solid #eceef0' }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                      style={{
                        background: property.status === 'sale' ? '#191c1e' : 'rgba(37, 99, 235,0.10)',
                        color: property.status === 'sale' ? '#fff' : '#2563eb',
                        border: property.status === 'rent' ? '1px solid rgba(37, 99, 235,0.25)' : 'none',
                      }}
                    >
                      {property.status === 'sale' ? t('propertyStatus.sale') : t('propertyStatus.rent')}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                      style={{ background: '#f0f2f5', color: '#45464d' }}
                    >
                      <Building2 size={11} />{typeLabels[property.type]}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                      style={{ background: '#f0f2f5', color: '#45464d' }}
                    >
                      <Eye size={11} />{property.viewCount.toLocaleString()} {t('property.views')}
                    </span>
                  </div>
                  <h1 className="font-bold leading-tight mb-2" style={{ fontSize: 'clamp(20px, 2.5vw, 26px)', color: '#191c1e' }}>
                    {property.title}
                  </h1>
                  <div className="flex items-center gap-1.5" style={{ color: '#76777d' }}>
                    <MapPin size={14} style={{ color: '#2563eb', flexShrink: 0 }} />
                    <span className="text-sm">{property.address}, {property.district}, {property.city}</span>
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setIsFavorited(!isFavorited)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                    style={{
                      background: isFavorited ? '#fef2f2' : '#f7f9fb',
                      border: `1.5px solid ${isFavorited ? '#fecaca' : '#eceef0'}`,
                      color: isFavorited ? '#ef4444' : '#45464d',
                    }}
                  >
                    <Heart size={15} strokeWidth={2} style={{ fill: isFavorited ? '#ef4444' : 'none' }} />
                    <span className="hidden sm:inline">{t('property.save')}</span>
                  </button>
                  <button
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                    style={{ background: '#f7f9fb', border: '1.5px solid #eceef0', color: '#45464d' }}
                  >
                    <Share2 size={15} strokeWidth={2} />
                    <span className="hidden sm:inline">{t('property.share')}</span>
                  </button>
                </div>
              </div>

              {/* Price + stats strip */}
              <div
                className="flex flex-wrap items-center gap-6 pt-5"
                style={{ borderTop: '1px solid #f0f2f5' }}
              >
                <div>
                  <p className="font-bold tracking-tight" style={{ fontSize: 28, color: '#191c1e' }}>
                    {formatPrice(property.price, property.status)}
                  </p>
                  {property.status === 'sale' && (
                    <span
                      className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-md"
                      style={{ background: '#f0f2f5', color: '#76777d' }}
                    >
                      {formatMoney(property.pricePerSqm, { perSqm: true })}
                    </span>
                  )}
                </div>

                <div className="flex gap-4 flex-wrap">
                  {[
                    property.bedrooms > 0 && { icon: Bed, v: property.bedrooms, l: t('property.bedsShort') },
                    { icon: Bath, v: property.bathrooms, l: t('property.bathsShort') },
                    { icon: Square, v: `${property.area}m²`, l: t('property.area') },
                    property.floor && { icon: Layers, v: `${property.floor}/${property.totalFloors}`, l: t('property.floorShort') },
                  ].filter(Boolean).map(item => item && (
                    <div
                      key={item.l}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                      style={{ background: '#f7f9fb', border: '1px solid #eceef0' }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(37, 99, 235,0.08)' }}
                      >
                        <item.icon size={15} strokeWidth={2} style={{ color: '#2563eb' }} />
                      </div>
                      <div>
                        <p className="font-bold text-sm leading-none" style={{ color: '#191c1e' }}>{item.v}</p>
                        <p className="text-[10px] font-medium mt-0.5" style={{ color: '#9ea0a7' }}>{item.l}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tabs card */}
            <div
              className="bg-white rounded-[20px] p-6"
              style={{ boxShadow: '0 2px 12px rgba(15,23,42,0.06)', border: '1px solid #eceef0' }}
            >
              {/* Tab pills */}
              <div
                className="inline-flex rounded-xl p-1 gap-1 mb-6"
                style={{ background: '#f2f4f6' }}
              >
                {([
                  { id: 'description', label: t('property.description') },
                  { id: 'details', label: t('property.details') },
                  { id: 'amenities', label: t('property.amenities') },
                ] as const).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                    style={{
                      background: activeTab === tab.id ? '#fff' : 'transparent',
                      color: activeTab === tab.id ? '#191c1e' : '#76777d',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 'description' && (
                  <motion.div key="desc" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    <p className="leading-relaxed" style={{ fontSize: 15, color: '#45464d', lineHeight: 1.75 }}>
                      {property.description}
                    </p>
                    <div className="mt-6">
                      <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#9ea0a7' }}>
                        {t('property.features')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {property.features.map(f => (
                          <span
                            key={f}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                            style={{ background: 'rgba(37, 99, 235,0.08)', color: '#2563eb', border: '1px solid rgba(37, 99, 235,0.15)' }}
                          >
                            <CheckCircle size={12} />{f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'details' && (
                  <motion.div key="details" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    <div className="grid sm:grid-cols-2 gap-0 rounded-2xl overflow-hidden" style={{ border: '1px solid #eceef0' }}>
                      {([
                        { label: t('property.listingType'), value: typeLabels[property.type] },
                        { label: t('property.status'), value: property.status === 'sale' ? t('property.saleStatus') : t('property.rentStatus') },
                        { label: t('property.cityLabel'), value: property.city },
                        { label: t('property.districtLabel'), value: property.district },
                        { label: t('property.areaFull'), value: `${property.area} m²` },
                        { label: t('property.bedroomsFull'), value: property.bedrooms.toString() },
                        { label: t('property.bathroomFull'), value: property.bathrooms.toString() },
                        property.floor ? { label: t('property.floorFull'), value: `${property.floor}/${property.totalFloors}` } : null,
                        property.yearBuilt ? { label: t('property.yearBuiltFull'), value: property.yearBuilt.toString() } : null,
                        { label: t('property.layout'), value: property.listedDate },
                      ].filter(Boolean) as { label: string; value: string }[]).map((row, i) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between px-4 py-3.5"
                          style={{
                            background: i % 2 === 0 ? '#fafbfc' : '#fff',
                            borderBottom: '1px solid #f0f2f5',
                          }}
                        >
                          <span className="text-sm" style={{ color: '#76777d' }}>{row.label}</span>
                          <span className="text-sm font-semibold" style={{ color: '#191c1e' }}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'amenities' && (
                  <motion.div key="amen" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {property.amenities.map(a => (
                        <div
                          key={a}
                          className="flex items-center gap-2.5 px-3 py-3 rounded-xl"
                          style={{ background: '#f7f9fb', border: '1px solid #eceef0' }}
                        >
                          <CheckCircle size={15} strokeWidth={2} style={{ color: '#10B981', flexShrink: 0 }} />
                          <span className="text-sm font-medium" style={{ color: '#45464d' }}>{a}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Map */}
            <div
              className="bg-white rounded-[20px] p-6"
              style={{ boxShadow: '0 2px 12px rgba(15,23,42,0.06)', border: '1px solid #eceef0' }}
            >
              <p className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: '#9ea0a7' }}>
                {t('property.location')}
              </p>
              <PropertyMap
                lat={property.coordinates.lat}
                lng={property.coordinates.lng}
                address={property.address}
                district={property.district}
                city={property.city}
                height={280}
              />
              <div className="flex items-center gap-2 mt-3">
                <MapPin size={14} style={{ color: '#2563eb' }} />
                <p className="text-sm font-semibold" style={{ color: '#45464d' }}>
                  {property.address}, {property.district}, {property.city}
                </p>
              </div>
            </div>

            {/* Mortgage calculator */}
            <div
              className="bg-white rounded-[20px] p-6"
              style={{ boxShadow: '0 2px 12px rgba(15,23,42,0.06)', border: '1px solid #eceef0' }}
            >
              <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: '#9ea0a7' }}>
                {t('property.mortgageCalc')}
              </p>
              <h2 className="font-bold text-lg mb-6" style={{ color: '#191c1e' }}>{t('property.mortgageCalc')}</h2>

              <div className="grid sm:grid-cols-3 gap-5 mb-6">
                {[
                  { label: t('property.downPaymentLabel', { pct: downPayment }), min: 10, max: 50, step: 5, val: downPayment, set: setDownPayment, lo: '10%', hi: '50%' },
                  { label: t('property.interestRate', { rate: mortgageRate }), min: 5, max: 20, step: 0.5, val: mortgageRate, set: setMortgageRate, lo: '5%', hi: '20%' },
                  { label: t('property.termYears', { years: mortgageYears }), min: 5, max: 30, step: 5, val: mortgageYears, set: setMortgageYears, lo: `5 ${t('property.yearsShort')}`, hi: `30 ${t('property.yearsShort')}` },
                ].map(slider => (
                  <div key={slider.label}>
                    <label className="text-sm font-semibold mb-2 block" style={{ color: '#45464d' }}>
                      {slider.label}
                    </label>
                    <input
                      type="range"
                      min={slider.min} max={slider.max} step={slider.step}
                      value={slider.val}
                      onChange={e => slider.set(slider.step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
                      className="w-full"
                      style={{ accentColor: '#2563eb' }}
                    />
                    <div className="flex justify-between text-[11px] mt-1" style={{ color: '#9ea0a7' }}>
                      <span>{slider.lo}</span><span>{slider.hi}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="rounded-2xl p-5"
                style={{ background: 'linear-gradient(135deg, #191c1e 0%, #2d3133 100%)' }}
              >
                <div className="grid grid-cols-3 gap-4 text-center">
                  {[
                    { v: formatMoney(Math.round(monthlyPayment())), l: t('property.monthlyPayment') },
                    { v: formatMoney(Math.round(property.price * downPayment / 100)), l: t('property.downPayment') },
                    { v: formatMoney(Math.round(property.price * (1 - downPayment / 100))), l: t('property.loanAmount') },
                  ].map(s => (
                    <div key={s.l}>
                      <p className="text-xl font-bold text-white">{s.v}</p>
                      <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.50)' }}>{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Similar */}
            <div>
              <div className="flex items-end justify-between mb-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: '#9ea0a7' }}>{t('property.similarShort')}</p>
                  <h2 className="font-bold text-lg" style={{ color: '#191c1e' }}>{t('property.similarOne')}</h2>
                </div>
                <Link to="/listings" className="text-sm font-semibold flex items-center gap-1" style={{ color: '#2563eb' }}>
                  {t('common.viewAll')} <ArrowRight size={14} />
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {similar.map(p => <PropertyCard key={p.id} property={p} />)}
              </div>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div>
            <div
              className="bg-white rounded-[20px] p-5 sticky top-[88px]"
              style={{ boxShadow: '0 4px 24px rgba(15,23,42,0.10)', border: '1px solid #eceef0' }}
            >
              {/* Price */}
              <div className="mb-5">
                <p className="font-bold tracking-tight" style={{ fontSize: 30, color: '#191c1e' }}>
                  {formatPrice(property.price, property.status)}
                </p>
                {property.status === 'sale' && (
                  <span
                    className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-md"
                    style={{ background: '#f0f2f5', color: '#76777d' }}
                  >
                    ₾{property.pricePerSqm.toLocaleString()}/მ²
                  </span>
                )}
              </div>

              {/* Agent */}
              <div
                className="flex items-center gap-3 py-4 mb-4"
                style={{ borderTop: '1px solid #f0f2f5', borderBottom: '1px solid #f0f2f5' }}
              >
                <img
                  src={property.agent.photo}
                  alt={property.agent.name}
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                  style={{ border: '1.5px solid #eceef0' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate" style={{ color: '#191c1e' }}>{property.agent.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star size={12} fill="#d97706" style={{ color: '#d97706' }} />
                    <span className="text-xs" style={{ color: '#76777d' }}>
                      {property.agent.rating} ({property.agent.reviewCount} {t('property.agentRating')})
                    </span>
                  </div>
                  {property.agent.verified && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <CheckCircle size={11} style={{ color: '#10B981' }} />
                      <span className="text-[11px] font-semibold" style={{ color: '#10B981' }}>{t('common.verified')}</span>
                    </div>
                  )}
                </div>
                <Link
                  to={`/agent/${property.agent.id}`}
                  className="text-xs font-semibold flex-shrink-0"
                  style={{ color: '#2563eb' }}
                >
                  {t('property.profile')}
                </Link>
              </div>

              {/* Contact buttons */}
              <div className="space-y-2.5">
                <a
                  href={`tel:${property.agent.phone}`}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200"
                  style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
                >
                  <Phone size={16} strokeWidth={2} />
                  {property.agent.phone}
                </a>
                <a
                  href={`mailto:${property.agent.email}`}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200"
                  style={{ background: '#f7f9fb', border: '1.5px solid #eceef0', color: '#191c1e' }}
                >
                  <Mail size={16} strokeWidth={2} />
                  {t('common.email')}
                </a>
                <button
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200"
                  style={{ background: 'rgba(37, 99, 235,0.07)', border: '1.5px solid rgba(37, 99, 235,0.22)', color: '#2563eb' }}
                >
                  <Calendar size={16} strokeWidth={2} />
                  {t('property.bookViewing')}
                </button>
              </div>

              {/* Contact form */}
              <div className="mt-5 pt-5" style={{ borderTop: '1px solid #f0f2f5' }}>
                <p className="text-sm font-bold mb-3" style={{ color: '#191c1e' }}>{t('property.sendInquiry')}</p>
                <div className="space-y-2.5">
                  {[
                    { key: 'name', placeholder: t('property.fullName'), type: 'text' },
                    { key: 'phone', placeholder: t('property.phone'), type: 'text' },
                  ].map(f => (
                    <input
                      key={f.key}
                      type={f.type}
                      value={contactForm[f.key as keyof typeof contactForm]}
                      onChange={e => setContactForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all duration-200"
                      style={{
                        background: '#fafbfc',
                        border: '1.5px solid #eceef0',
                        color: '#191c1e',
                      }}
                      onFocus={e => {
                        e.currentTarget.style.borderColor = '#2563eb';
                      }}
                      onBlur={e => {
                        e.currentTarget.style.borderColor = '#eceef0';
                      }}
                    />
                  ))}
                  <textarea
                    value={contactForm.message}
                    onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))}
                    placeholder={t('property.messagePlaceholder')}
                    rows={3}
                    className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none resize-none transition-all duration-200"
                    style={{ background: '#fafbfc', border: '1.5px solid #eceef0', color: '#191c1e' }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = '#2563eb';
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = '#eceef0';
                    }}
                  />
                  <button
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all duration-200"
                    style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #047857 0%, #059669 100%)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #059669 0%, #10b981 100%)'; }}
                  >
                    {t('property.send')} <ArrowRight size={15} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen gallery */}
      <AnimatePresence>
        {showGallery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col"
            style={{ background: 'rgba(8,10,18,0.96)', backdropFilter: 'blur(8px)' }}
          >
            <div className="flex items-center justify-between px-6 py-4">
              <p className="font-semibold text-white text-sm truncate max-w-md">{property.title}</p>
              <button
                onClick={() => setShowGallery(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                style={{ background: 'rgba(255,255,255,0.10)' }}
              >
                <X size={18} color="#fff" />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center px-4 gap-4">
              <button
                onClick={() => setActiveImage(i => (i - 1 + property.images.length) % property.images.length)}
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.10)' }}
              >
                <ChevronLeft size={20} color="#fff" />
              </button>
              <motion.img
                key={activeImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
                src={property.images[activeImage]}
                alt={property.title}
                className="max-h-[75vh] max-w-[78vw] object-contain rounded-2xl"
              />
              <button
                onClick={() => setActiveImage(i => (i + 1) % property.images.length)}
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.10)' }}
              >
                <ChevronRight size={20} color="#fff" />
              </button>
            </div>

            <div className="flex gap-2 px-6 pb-6 justify-center overflow-x-auto">
              {property.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className="flex-shrink-0 rounded-xl overflow-hidden transition-all"
                  style={{
                    width: 64, height: 48,
                    border: i === activeImage ? '2px solid #2563eb' : '2px solid transparent',
                    opacity: i === activeImage ? 1 : 0.5,
                  }}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
