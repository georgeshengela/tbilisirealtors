import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bed, Calculator, Layers, Maximize2, MessageCircle, Phone } from 'lucide-react';
import type { ConstructionProject, ProjectUnit } from '../types/project';
import { useCurrency } from '../contexts/CurrencyContext';
import { useTranslation } from '../i18n/LocaleContext';
import { CONTACT } from '../data/contactInfo';
import { whatsappNumber } from '../lib/listingInsights';
import { unitBlockName } from '../lib/projects';

const STATUSES = ['available', 'reserved', 'sold'] as const;

function slot(unit: ProjectUnit): number {
  return unit.position ?? (Number.parseInt(unit.number.replace(/\D/g, ''), 10) || 0);
}

export default function BuildingUnitPicker({ project, onCalculate }: {
  project: ConstructionProject;
  /** Hands the chosen unit to the installment calculator. */
  onCalculate?: (unit: ProjectUnit) => void;
}) {
  const { t } = useTranslation();
  const { formatMoney } = useCurrency();
  const P = 'home.projectDetail.page';
  const units = project.projectUnits;
  const money = (amount: number, perSqm = false) => formatMoney(amount, { from: project.priceCurrency, perSqm });

  const blockNames = useMemo(() => {
    const names = project.blocks.map(b => b.name);
    for (const unit of units) {
      const name = unitBlockName(unit, project.blocks);
      if (!names.includes(name)) names.push(name);
    }
    return names;
  }, [project.blocks, units]);
  const [activeBlock, setActiveBlock] = useState(blockNames[0] ?? '');
  const blockUnits = useMemo(
    () => units.filter(u => unitBlockName(u, project.blocks) === activeBlock),
    [units, project.blocks, activeBlock],
  );
  const floors = useMemo(() => {
    const byFloor = new Map<number, ProjectUnit[]>();
    for (const unit of blockUnits) byFloor.set(unit.floor, [...(byFloor.get(unit.floor) ?? []), unit]);
    return [...byFloor.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([floor, list]) => ({ floor, units: list.sort((a, b) => slot(a) - slot(b)) }));
  }, [blockUnits]);

  const roomOptions = useMemo(
    () => [...new Set(units.map(u => u.bedrooms).filter(n => n > 0))].sort((a, b) => a - b),
    [units],
  );
  const [rooms, setRooms] = useState<number | null>(null);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const matches = (u: ProjectUnit) => (rooms == null || u.bedrooms === rooms) && (!onlyAvailable || u.status === 'available');

  const firstOpenFloor = (list: typeof floors) => (list.find(f => f.units.some(u => u.status === 'available')) ?? list[0])?.floor ?? 1;
  const [activeFloor, setActiveFloor] = useState(() => firstOpenFloor(floors));
  const [hoverFloor, setHoverFloor] = useState<number | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<ProjectUnit | null>(null);
  const floorUnits = floors.find(f => f.floor === activeFloor)?.units ?? [];

  const counts = useMemo(() => {
    const c = { available: 0, reserved: 0, sold: 0 };
    for (const u of units) c[u.status] += 1;
    return c;
  }, [units]);
  const soldPct = units.length ? Math.round((counts.sold / units.length) * 100) : 0;

  function pickBlock(name: string) {
    setActiveBlock(name);
    const list = units.filter(u => unitBlockName(u, project.blocks) === name);
    const open = list.filter(u => u.status === 'available').map(u => u.floor);
    setActiveFloor(Math.max(0, ...(open.length ? open : list.map(u => u.floor))) || 1);
    setSelectedUnit(null);
  }

  const floorRef = useRef<HTMLDivElement>(null);
  function pickFloor(floor: number, unitId?: string) {
    setActiveFloor(floor);
    const unit = unitId ? units.find(u => u.id === unitId) : undefined;
    setSelectedUnit(unit && unit.status !== 'sold' ? unit : null);
    // Stacked layout on phones: the floor's units sit below the building, so bring them up.
    if (window.matchMedia('(max-width: 1023px)').matches) {
      window.setTimeout(() => floorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }
  }

  // Project line first; WhatsApp only works on a Georgian mobile, else the office mobile answers.
  const phone = project.phone?.trim() || CONTACT.mobile.tel;
  const telHref = `tel:${phone.replace(/[^\d+]/g, '')}`;
  const projectWa = whatsappNumber(project.phone);
  const waNumber = projectWa && projectWa.startsWith('9955') ? projectWa : whatsappNumber(CONTACT.mobile.tel);
  const waHref = selectedUnit && waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(t('home.projectDetail.whatsappText', {
      project: project.name,
      unit: selectedUnit.number,
      url: typeof window === 'undefined' ? '' : window.location.href,
    }))}`
    : null;

  const shownFloor = hoverFloor ?? activeFloor;
  const floorFree = (list: ProjectUnit[]) => list.filter(u => u.status === 'available' && matches(u)).length;

  return (
    <div className="pjd-picker">
      <div className="pjd-picker__stock">
        <div className="pjd-picker__bar" aria-hidden>
          {STATUSES.map(key => counts[key] > 0 && (
            <motion.span
              key={key}
              className={`is-${key}`}
              initial={{ flexGrow: 0 }}
              whileInView={{ flexGrow: counts[key] }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            />
          ))}
        </div>
        <div className="pjd-picker__legend">
          {STATUSES.map(key => (
            <span key={key}><i className={`is-${key}`} />{t(`home.projectDetail.${key}`)} <b>{counts[key]}</b></span>
          ))}
          {soldPct >= 30 && <em>🔥 {t(`${P}.soldPct`, { pct: soldPct })}</em>}
        </div>
      </div>

      <div className="pjd-picker__filters">
        {blockNames.length > 1 && (
          <div className="pjd-seg" role="group" aria-label={t('home.projectDetail.selectBlock')}>
            {blockNames.map(name => (
              <button key={name} type="button" className={activeBlock === name ? 'is-on' : ''} onClick={() => pickBlock(name)}>
                {t('home.projectDetail.block')} {name}
              </button>
            ))}
          </div>
        )}
        {roomOptions.length > 1 && (
          <div className="pjd-seg" role="group" aria-label={t(`${P}.rooms`)}>
            <span className="pjd-seg__label"><Bed size={14} />{t(`${P}.rooms`)}</span>
            <button type="button" className={rooms == null ? 'is-on' : ''} onClick={() => setRooms(null)}>{t(`${P}.all`)}</button>
            {roomOptions.map(n => (
              <button key={n} type="button" className={rooms === n ? 'is-on' : ''} onClick={() => setRooms(n)}>{n}</button>
            ))}
          </div>
        )}
        <label className="pjd-switch">
          <input type="checkbox" checked={onlyAvailable} onChange={e => setOnlyAvailable(e.target.checked)} />
          <span aria-hidden />
          {t(`${P}.onlyAvailable`)}
        </label>
      </div>

      <div className="pjd-picker__body">
        <div className="pjd-tower" onMouseLeave={() => setHoverFloor(null)}>
          <p className="pjd-tower__hint">{t(`${P}.pickerHint`)}</p>
          <div className="pjd-tower__roof" aria-hidden />
          <div className="pjd-tower__floors">
            {floors.map(({ floor, units: list }) => {
              const free = floorFree(list);
              return (
                <button
                  key={floor}
                  type="button"
                  className={`pjd-tower__floor ${floor === activeFloor ? 'is-active' : ''} ${free === 0 ? 'is-full' : ''}`}
                  onMouseEnter={() => setHoverFloor(floor)}
                  onFocus={() => setHoverFloor(floor)}
                  onBlur={() => setHoverFloor(null)}
                  onClick={e => pickFloor(floor, (e.target as HTMLElement).closest<HTMLElement>('[data-unit]')?.dataset.unit)}
                  aria-pressed={floor === activeFloor}
                  aria-label={`${floor} ${t('home.projectDetail.floor')} · ${t(`${P}.floorSummary`, { free, total: list.length })}`}
                >
                  <span className="pjd-tower__num">{floor}</span>
                  <span className="pjd-tower__cells">
                    {list.map(u => (
                      <span
                        key={u.id}
                        data-unit={u.id}
                        title={`№${u.number} · ${u.area} მ² · ${t(`home.projectDetail.${u.status}`)}`}
                        className={`pjd-cell is-${u.status} ${matches(u) ? '' : 'is-dim'} ${selectedUnit?.id === u.id ? 'is-picked' : ''}`}
                      />
                    ))}
                  </span>
                  <span className="pjd-tower__free">{free > 0 ? free : '—'}</span>
                </button>
              );
            })}
          </div>
          <div className="pjd-tower__ground" aria-hidden />
        </div>

        <div className="pjd-floor" ref={floorRef}>
          <div className="pjd-floor__head">
            <div>
              <span className="pjd-floor__eyebrow"><Layers size={14} />{blockNames.length > 1 ? `${t('home.projectDetail.block')} ${activeBlock} · ` : ''}{t('home.projectDetail.floor')}</span>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.strong
                  key={shownFloor}
                  className="pjd-floor__num"
                  initial={{ y: 18, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -18, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {shownFloor}
                </motion.strong>
              </AnimatePresence>
            </div>
            <span className="pjd-floor__free">
              {t(`${P}.floorSummary`, { free: floorFree(floorUnits), total: floorUnits.length })}
            </span>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${activeBlock}-${activeFloor}`}
              className="pjd-floor__grid"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              {floorUnits.map((unit, i) => {
                const picked = selectedUnit?.id === unit.id;
                return (
                  <motion.button
                    key={unit.id}
                    type="button"
                    disabled={unit.status === 'sold'}
                    onClick={() => setSelectedUnit(picked ? null : unit)}
                    className={`pjd-unit is-${unit.status} ${picked ? 'is-picked' : ''} ${matches(unit) ? '' : 'is-dim'}`}
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.025, duration: 0.25 }}
                    aria-pressed={picked}
                  >
                    <span className="pjd-unit__top">
                      <strong>№{unit.number}</strong>
                      <em>{t(`home.projectDetail.${unit.status}`)}</em>
                    </span>
                    <span className="pjd-unit__meta">
                      {unit.area > 0 ? `${unit.area} მ²` : '—'}
                      {unit.bedrooms > 0 && <> · <Bed size={12} /> {unit.bedrooms}</>}
                    </span>
                    <span className="pjd-unit__price">
                      {unit.status === 'sold' ? '—' : unit.price > 0 ? money(unit.price) : t('home.projectDetail.priceOnRequest')}
                    </span>
                  </motion.button>
                );
              })}
              {floorUnits.length > 0 && !floorUnits.some(matches) && (
                <p className="pjd-floor__empty">{t(`${P}.noMatch`)}</p>
              )}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {selectedUnit ? (
              <motion.div
                key={selectedUnit.id}
                className="pjd-selected"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="pjd-selected__head">
                  <div>
                    <span className={`pjd-selected__status is-${selectedUnit.status}`}>{t(`home.projectDetail.${selectedUnit.status}`)}</span>
                    <h3>{t('home.projectDetail.unit')} №{selectedUnit.number}</h3>
                    <p>
                      {blockNames.length > 1 && `${t('home.projectDetail.block')} ${activeBlock} · `}
                      {selectedUnit.floor} {t('home.projectDetail.floor')}
                      {selectedUnit.bedrooms > 0 && ` · ${selectedUnit.bedrooms} ${t('home.bedroomLabel')}`}
                    </p>
                  </div>
                  <div className="pjd-selected__price">
                    <strong>{selectedUnit.price > 0 ? money(selectedUnit.price) : t('home.projectDetail.priceOnRequest')}</strong>
                    {selectedUnit.pricePerSqm > 0 && <span>{money(selectedUnit.pricePerSqm, true)}</span>}
                  </div>
                </div>
                <div className="pjd-selected__facts">
                  {selectedUnit.area > 0 && <span><Maximize2 size={14} />{selectedUnit.area} მ²</span>}
                  {selectedUnit.bedrooms > 0 && <span><Bed size={14} />{selectedUnit.bedrooms}</span>}
                  <span><Layers size={14} />{selectedUnit.floor}/{floors[0]?.floor ?? selectedUnit.floor}</span>
                </div>
                <div className="pjd-selected__actions">
                  <a href={telHref} className="pjd-btn is-primary"><Phone size={16} />{t('home.projectDetail.callAbout')}</a>
                  {waHref && (
                    <a href={waHref} target="_blank" rel="noopener noreferrer" className="pjd-btn is-wa">
                      <MessageCircle size={16} />WhatsApp
                    </a>
                  )}
                  {onCalculate && selectedUnit.price > 0 && (
                    <button type="button" className="pjd-btn is-ghost" onClick={() => onCalculate(selectedUnit)}>
                      <Calculator size={16} />{t(`${P}.calcThis`)}
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.p key="hint" className="pjd-floor__hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {t(`${P}.selectHint`)}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
