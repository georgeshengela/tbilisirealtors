import { useMemo, useState } from 'react';
import { Bed, Maximize2 } from 'lucide-react';
import type { ProjectUnit } from '../data/mockData';
import { useCurrency } from '../contexts/CurrencyContext';
import { useTranslation } from '../i18n/LocaleContext';

const STATUS_STYLE = {
  available: { bg: '#ecfdf5', border: '#10b981', color: '#059669', labelKey: 'available' as const },
  reserved: { bg: '#fff7ed', border: '#f59e0b', color: '#d97706', labelKey: 'reserved' as const },
  sold: { bg: '#f3f4f6', border: '#d1d5db', color: '#9ca3af', labelKey: 'sold' as const },
};

export default function BuildingUnitPicker({ units }: { units: ProjectUnit[] }) {
  const { t } = useTranslation();
  const { formatMoney } = useCurrency();
  const floors = useMemo(
    () => [...new Set(units.map(u => u.floor))].sort((a, b) => b - a),
    [units],
  );
  const [activeFloor, setActiveFloor] = useState(floors[0] ?? 1);
  const [selectedUnit, setSelectedUnit] = useState<ProjectUnit | null>(null);

  const floorUnits = units.filter(u => u.floor === activeFloor);

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide mb-2.5" style={{ color: '#9ea0a7' }}>
        {t('home.projectDetail.selectFloor')}
      </p>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 mb-4">
        {floors.map(floor => (
          <button
            key={floor}
            type="button"
            onClick={() => { setActiveFloor(floor); setSelectedUnit(null); }}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors"
            style={{
              background: activeFloor === floor ? '#2563eb' : '#f3f4f6',
              color: activeFloor === floor ? '#fff' : '#45464d',
            }}
          >
            {floor} {t('home.projectDetail.floor')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
        {floorUnits.map(unit => {
          const style = STATUS_STYLE[unit.status];
          const active = selectedUnit?.id === unit.id;
          return (
            <button
              key={unit.id}
              type="button"
              disabled={unit.status === 'sold'}
              onClick={() => setSelectedUnit(unit)}
              className="text-left rounded-xl p-2.5 transition-colors"
              style={{
                background: active ? '#eff6ff' : style.bg,
                border: `1.5px solid ${active ? '#2563eb' : style.border}`,
                opacity: unit.status === 'sold' ? 0.65 : 1,
                cursor: unit.status === 'sold' ? 'not-allowed' : 'pointer',
              }}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[12px] font-extrabold" style={{ color: '#191c1e' }}>№{unit.number}</span>
                <span className="text-[9px] font-bold uppercase" style={{ color: style.color }}>
                  {t(`home.projectDetail.${style.labelKey}`)}
                </span>
              </div>
              <p className="text-[11px] font-semibold" style={{ color: '#2563eb' }}>{formatMoney(unit.price)}</p>
              <p className="text-[10px] mt-0.5" style={{ color: '#9ea0a7' }}>{unit.area} მ²</p>
            </button>
          );
        })}
      </div>

      {selectedUnit && (
        <div className="rounded-xl p-4" style={{ background: '#f8f9fb', border: '1.5px solid #e8eaed' }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-extrabold text-[16px]" style={{ color: '#191c1e' }}>
                {t('home.projectDetail.unit')} №{selectedUnit.number}
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: '#9ea0a7' }}>
                {selectedUnit.floor} {t('home.projectDetail.floor')} · {selectedUnit.bedrooms} {t('home.bedroomLabel')}
              </p>
            </div>
            <p className="font-extrabold text-xl" style={{ color: '#2563eb' }}>{formatMoney(selectedUnit.price)}</p>
          </div>
          <div className="flex flex-wrap gap-4 mt-3">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: '#45464d' }}>
              <Maximize2 size={13} /> {selectedUnit.area} მ²
            </span>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: '#45464d' }}>
              <Bed size={13} /> {selectedUnit.bedrooms}
            </span>
            <span className="text-[12px] font-semibold" style={{ color: '#45464d' }}>
              {formatMoney(selectedUnit.pricePerSqm, { perSqm: true })}
            </span>
          </div>
          {selectedUnit.status === 'available' && (
            <a
              href={`tel:+995322050505`}
              className="inline-flex mt-3 px-4 py-2 rounded-lg text-[13px] font-bold text-white"
              style={{ background: '#2563eb' }}
            >
              {t('home.projectDetail.viewUnit')}
            </a>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3 mt-3">
        {(['available', 'reserved', 'sold'] as const).map(key => (
          <span key={key} className="inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: '#6b7280' }}>
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: STATUS_STYLE[key].border }} />
            {t(`home.projectDetail.${key}`)}
          </span>
        ))}
      </div>
    </div>
  );
}
