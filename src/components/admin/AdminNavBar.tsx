import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, Newspaper, type LucideIcon } from 'lucide-react';

export interface AdminNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

const INFO_IDS = ['analytics', 'prices', 'blog'] as const;
const INFO_SET = new Set<string>(INFO_IDS);

function isInfoId(id: string): boolean {
  return INFO_SET.has(id);
}

function NavButton({
  item,
  active,
  onSelect,
  variant,
}: {
  item: AdminNavItem;
  active: boolean;
  onSelect: (id: string) => void;
  variant: 'desktop' | 'mobile';
}) {
  if (variant === 'mobile') {
    return (
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all"
        style={
          active
            ? {
                background: 'rgba(37, 99, 235,0.25)',
                color: '#fff',
                border: '1px solid rgba(37, 99, 235,0.4)',
              }
            : {
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(148,163,184,0.95)',
                border: '1px solid rgba(255,255,255,0.07)',
              }
        }
      >
        <item.icon size={13} strokeWidth={active ? 2.2 : 2} />
        {item.label}
        {Boolean(item.badge) && (
          <span
            className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white"
            style={{ background: item.id === 'desk' ? '#ef4444' : '#f59e0b' }}
          >
            {(item.badge ?? 0) > 99 ? '99+' : item.badge}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className="relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-all duration-200"
      style={
        active
          ? { background: 'rgba(255,255,255,0.12)', color: '#fff' }
          : { color: 'rgba(148,163,184,0.9)' }
      }
      onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#e2e8f0'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'rgba(148,163,184,0.9)'; }}
    >
      {active && (
        <span
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
          style={{ background: '#2563eb' }}
        />
      )}
      <item.icon size={14} strokeWidth={active ? 2.3 : 2} className={active ? undefined : 'opacity-75'} />
      {item.label}
      {Boolean(item.badge) && (
        <span
          className="inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-extrabold text-white"
          style={{ background: item.id === 'desk' ? '#ef4444' : '#f59e0b' }}
        >
          {(item.badge ?? 0) > 99 ? '99+' : item.badge}
        </span>
      )}
    </button>
  );
}

function InfoDropdown({
  items,
  activeId,
  onSelect,
  variant,
}: {
  items: AdminNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  variant: 'desktop' | 'mobile';
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const active = items.some(item => item.id === activeId);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function pick(id: string) {
    setOpen(false);
    onSelect(id);
  }

  return (
    <div ref={wrapRef} className="relative flex-shrink-0">
      {variant === 'desktop' ? (
        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          className="relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-all duration-200"
          style={
            active || open
              ? { background: 'rgba(255,255,255,0.12)', color: '#fff' }
              : { color: 'rgba(148,163,184,0.9)' }
          }
          onMouseEnter={e => { if (!active && !open) e.currentTarget.style.color = '#e2e8f0'; }}
          onMouseLeave={e => { if (!active && !open) e.currentTarget.style.color = 'rgba(148,163,184,0.9)'; }}
        >
          {active && (
            <span
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
              style={{ background: '#2563eb' }}
            />
          )}
          <Newspaper size={14} strokeWidth={active || open ? 2.3 : 2} className={active || open ? undefined : 'opacity-75'} />
          ინფორმაცია
          <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all"
          style={
            active || open
              ? {
                  background: 'rgba(37, 99, 235,0.25)',
                  color: '#fff',
                  border: '1px solid rgba(37, 99, 235,0.4)',
                }
              : {
                  background: 'rgba(255,255,255,0.04)',
                  color: 'rgba(148,163,184,0.95)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }
          }
        >
          <Newspaper size={13} strokeWidth={active || open ? 2.2 : 2} />
          ინფორმაცია
          <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}

      {open && (
        <div
          className="absolute top-full left-0 z-50 mt-2 min-w-[200px] overflow-hidden rounded-2xl p-1.5"
          style={{
            background: '#1f2937',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
          }}
        >
          {items.map(item => {
            const on = item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => pick(item.id)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold"
                style={
                  on
                    ? { background: 'rgba(37,99,235,0.22)', color: '#fff' }
                    : { color: '#cbd5e1' }
                }
              >
                <item.icon size={14} />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminNavBar({
  items,
  activeId,
  onSelect,
  variant,
}: {
  items: AdminNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  variant: 'desktop' | 'mobile';
}) {
  const infoItems = items.filter(item => isInfoId(item.id));
  const nodes: ReactNode[] = [];

  for (const item of items) {
    if (isInfoId(item.id)) {
      if (item.id === infoItems[0]?.id && infoItems.length) {
        nodes.push(
          <InfoDropdown
            key="info"
            items={infoItems}
            activeId={activeId}
            onSelect={onSelect}
            variant={variant}
          />,
        );
      }
      continue;
    }
    nodes.push(
      <NavButton
        key={item.id}
        item={item}
        active={activeId === item.id}
        onSelect={onSelect}
        variant={variant}
      />,
    );
  }

  return <>{nodes}</>;
}
