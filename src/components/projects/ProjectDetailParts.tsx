/** Interactive pieces of the project detail page. */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, animate, motion, useInView, useReducedMotion } from 'framer-motion';
import { Calculator, ChevronLeft, ChevronRight, CircleCheck, X } from 'lucide-react';
import type { ConstructionProject, ProjectUnit } from '../../types/project';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useTranslation } from '../../i18n/LocaleContext';
import { sizedImage } from '../../lib/projectMedia';

/** Counts up to `value` the first time it scrolls into view. */
export function CountUp({ value, format = n => Math.round(n).toLocaleString('en-US') }: {
  value: number;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);

  useEffect(() => {
    if (!inView || reduce) {
      if (reduce) setShown(value);
      return;
    }
    const controls = animate(0, value, { duration: 1.4, ease: [0.16, 1, 0.3, 1], onUpdate: setShown });
    return () => controls.stop();
  }, [inView, value, reduce]);

  return <span ref={ref}>{format(shown)}</span>;
}

/** Circular progress that fills when it scrolls into view. */
export function ProgressRing({ pct, label }: { pct: number; label: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="pjd-ring">
      <svg ref={ref} viewBox="0 0 120 120" aria-hidden>
        <circle cx="60" cy="60" r={r} className="pjd-ring__track" />
        <motion.circle
          cx="60" cy="60" r={r}
          className="pjd-ring__bar"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: inView ? c * (1 - pct / 100) : c }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="pjd-ring__label">
        <strong><CountUp value={pct} />%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

/** Blank-line paragraphs; lines starting with "*" or "-" become a checklist. */
export function RichDescription({ text }: { text: string }) {
  const blocks = useMemo(() => {
    const out: ({ kind: 'p'; text: string } | { kind: 'ul'; items: string[] })[] = [];
    for (const line of text.split(/\r?\n/).map(l => l.trim())) {
      if (!line) continue;
      const bullet = line.match(/^[*•-]\s+(.*)$/);
      if (bullet) {
        const last = out[out.length - 1];
        if (last?.kind === 'ul') last.items.push(bullet[1]);
        else out.push({ kind: 'ul', items: [bullet[1]] });
      } else {
        out.push({ kind: 'p', text: line });
      }
    }
    return out;
  }, [text]);

  return (
    <div className="pjd-prose">
      {blocks.map((block, i) => block.kind === 'p'
        ? <p key={i}>{block.text}</p>
        : (
          <ul key={i}>
            {block.items.map(item => (
              <li key={item}><CircleCheck size={16} strokeWidth={2.4} />{item.replace(/;$/, '')}</li>
            ))}
          </ul>
        ))}
    </div>
  );
}

/** Scroll-reveal wrapper for page sections. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Full-screen photo viewer: arrows, keyboard, swipe and a thumbnail strip. */
export function ProjectLightbox({ images, index, name, onIndex, onClose }: {
  images: string[];
  index: number;
  name: string;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [dir, setDir] = useState(1);
  const stripRef = useRef<HTMLDivElement>(null);
  const count = images.length;
  const go = (step: number) => {
    setDir(step);
    onIndex((index + step + count) % count);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  });

  useEffect(() => {
    stripRef.current?.querySelector<HTMLElement>('.is-active')?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [index]);

  return (
    <motion.div
      className="pjd-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={name}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="pjd-lightbox__top">
        <span className="pjd-lightbox__title">{name}</span>
        <span className="pjd-lightbox__count">{index + 1} / {count}</span>
        <button type="button" className="pjd-lightbox__close" onClick={onClose} aria-label={t('common.close')}>
          <X size={20} />
        </button>
      </div>

      <div className="pjd-lightbox__stage" onClick={onClose}>
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.img
            key={images[index]}
            src={sizedImage(images[index], 2000)}
            alt={t('home.projectDetail.page.image', { n: index + 1 })}
            className="pjd-lightbox__img"
            custom={dir}
            variants={{
              enter: (d: number) => ({ opacity: 0, x: d * 80, scale: 0.98 }),
              center: { opacity: 1, x: 0, scale: 1 },
              exit: (d: number) => ({ opacity: 0, x: d * -80, scale: 0.98 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.4}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) go(1);
              else if (info.offset.x > 60) go(-1);
            }}
            onClick={e => e.stopPropagation()}
            draggable={false}
          />
        </AnimatePresence>
        {count > 1 && (
          <>
            <button type="button" className="pjd-lightbox__nav is-prev" aria-label={t('home.projectDetail.page.prev')}
              onClick={e => { e.stopPropagation(); go(-1); }}>
              <ChevronLeft size={26} />
            </button>
            <button type="button" className="pjd-lightbox__nav is-next" aria-label={t('home.projectDetail.page.next')}
              onClick={e => { e.stopPropagation(); go(1); }}>
              <ChevronRight size={26} />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="pjd-lightbox__strip" ref={stripRef}>
          {images.map((img, i) => (
            <button
              key={img}
              type="button"
              className={i === index ? 'is-active' : ''}
              onClick={() => { setDir(i > index ? 1 : -1); onIndex(i); }}
              aria-label={t('home.projectDetail.page.image', { n: i + 1 })}
            >
              <img src={sizedImage(img, 200)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/** Animated money figure that glides between values instead of jumping. */
function Money({ value, render }: { value: number; render: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const controls = animate(from.current, value, {
      duration: 0.5,
      ease: 'easeOut',
      onUpdate: v => { from.current = v; setShown(v); },
    });
    return () => controls.stop();
  }, [value]);
  return <>{render(shown)}</>;
}

/** Interest-free developer installment: price, down payment and monthly figure. */
export function InstallmentCalculator({ project, pricePerSqm, unit, onClearUnit }: {
  project: ConstructionProject;
  pricePerSqm: number;
  unit: ProjectUnit | null;
  onClearUnit: () => void;
}) {
  const { t } = useTranslation();
  const { formatMoney } = useCurrency();
  const minArea = Math.max(project.areaFrom || 30, 10);
  const maxArea = Math.max(project.areaTo || minArea + 100, minArea + 10);
  const [area, setArea] = useState(Math.round((minArea + maxArea) / 2));
  const [down, setDown] = useState(30);
  const [term, setTerm] = useState(12);

  const unitPriced = unit && unit.price > 0;
  const total = unitPriced ? unit.price : area * pricePerSqm;
  const downAmount = total * (down / 100);
  const monthly = (total - downAmount) / term;
  const money = (n: number) => formatMoney(Math.round(n), { from: project.priceCurrency });
  const P = 'home.projectDetail.page';
  const fill = (v: number, min: number, max: number) => ({ '--fill': `${((v - min) / (max - min)) * 100}%` }) as CSSProperties;

  return (
    <div className="pjd-calc">
      <div className="pjd-calc__inputs">
        <div className="pjd-calc__head">
          <span className="pjd-calc__icon"><Calculator size={20} /></span>
          <div>
            <h3>{t(`${P}.calcTitle`)}</h3>
            <p>{t('home.projectDetail.installment')} · 0%</p>
          </div>
        </div>

        {unitPriced ? (
          <div className="pjd-calc__unit">
            <span>{t(`${P}.calcUnit`, { unit: unit.number })} · {unit.area} მ²</span>
            <button type="button" onClick={onClearUnit}>{t(`${P}.calcClearUnit`)}</button>
          </div>
        ) : (
          <label className="pjd-range">
            <span className="pjd-range__row">
              <span>{t(`${P}.calcArea`)}</span>
              <strong>{area} მ²</strong>
            </span>
            <input type="range" min={minArea} max={maxArea} step={1} value={area}
              style={fill(area, minArea, maxArea)} onChange={e => setArea(Number(e.target.value))} />
          </label>
        )}

        <label className="pjd-range">
          <span className="pjd-range__row">
            <span>{t(`${P}.calcDown`)}</span>
            <strong>{down}% · {money(downAmount)}</strong>
          </span>
          <input type="range" min={10} max={90} step={5} value={down}
            style={fill(down, 10, 90)} onChange={e => setDown(Number(e.target.value))} />
        </label>

        <label className="pjd-range">
          <span className="pjd-range__row">
            <span>{t(`${P}.calcTerm`)}</span>
            <strong>{t(`${P}.months`, { n: term })}</strong>
          </span>
          <input type="range" min={3} max={24} step={1} value={term}
            style={fill(term, 3, 24)} onChange={e => setTerm(Number(e.target.value))} />
        </label>
      </div>

      <div className="pjd-calc__result">
        <span className="pjd-calc__label">{t(`${P}.calcMonthly`)}</span>
        <strong className="pjd-calc__monthly"><Money value={monthly} render={money} /></strong>
        <div className="pjd-calc__split" aria-hidden>
          <span style={{ width: `${down}%` }} />
        </div>
        <dl>
          <div><dt>{t(`${P}.calcTotal`)}</dt><dd><Money value={total} render={money} /></dd></div>
          <div><dt>{t(`${P}.calcDown`)}</dt><dd><Money value={downAmount} render={money} /></dd></div>
          <div><dt>{t(`${P}.calcTerm`)}</dt><dd>{t(`${P}.months`, { n: term })} · 0%</dd></div>
        </dl>
        <p className="pjd-calc__note">{t(`${P}.calcNote`)}</p>
      </div>
    </div>
  );
}
