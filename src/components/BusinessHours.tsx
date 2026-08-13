import { Clock } from 'lucide-react';
import { BUSINESS_HOURS, isBusinessOpenNow } from '../data/contactInfo';
import { useTranslation } from '../i18n/LocaleContext';

type Variant = 'dark' | 'light';

interface BusinessHoursProps {
  variant?: Variant;
  showStatus?: boolean;
  showHeader?: boolean;
  compact?: boolean;
}

const DAY_KEYS: Record<string, string> = {
  'mon-fri': 'businessHours.days.monFri',
  saturday: 'businessHours.days.saturday',
  sunday: 'businessHours.days.sunday',
};

export default function BusinessHours({
  variant = 'light',
  showStatus = true,
  showHeader = false,
  compact = false,
}: BusinessHoursProps) {
  const { t } = useTranslation();
  const open = isBusinessOpenNow();
  const dark = variant === 'dark';

  return (
    <div className="w-full">
      {showHeader && (
        <p
          className="text-[10px] font-bold uppercase tracking-widest mb-3"
          style={{ color: dark ? 'rgba(255,255,255,0.35)' : '#94a3b8' }}
        >
          {t('businessHours.title')}
        </p>
      )}

      {showStatus && (
        <div
          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full mb-3"
          style={
            open
              ? {
                  background: dark ? 'rgba(16,185,129,0.12)' : '#ecfdf5',
                  border: dark ? '1px solid rgba(16,185,129,0.25)' : '1px solid #bbf7d0',
                }
              : {
                  background: dark ? 'rgba(255,255,255,0.05)' : '#f8fafc',
                  border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
                }
          }
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{
              background: open ? '#34d399' : '#94a3b8',
            }}
          />
          <span
            className="text-[11px] font-bold"
            style={{ color: open ? (dark ? '#6ee7b7' : '#059669') : (dark ? '#94a3b8' : '#64748b') }}
          >
            {open ? t('businessHours.open') : t('businessHours.closed')}
          </span>
        </div>
      )}

      <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
        {BUSINESS_HOURS.map(row => {
          const isClosed = row.closed || !row.time;
          const dayLabel = DAY_KEYS[row.id] ? t(DAY_KEYS[row.id]) : row.label;
          return (
            <div
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-xl transition-colors"
              style={{
                padding: compact ? '7px 10px' : '9px 12px',
                background: dark
                  ? isClosed ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)'
                  : isClosed ? '#f8fafc' : '#fff',
                border: dark
                  ? `1px solid ${isClosed ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.07)'}`
                  : `1px solid ${isClosed ? '#f1f5f9' : '#e8edf2'}`,
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                {!compact && (
                  <Clock
                    size={13}
                    strokeWidth={2}
                    style={{ color: isClosed ? '#94a3b8' : dark ? '#2563eb' : '#2563eb', flexShrink: 0 }}
                  />
                )}
                <span
                  className="text-xs font-semibold truncate"
                  style={{ color: dark ? 'rgba(255,255,255,0.75)' : '#334155' }}
                >
                  {dayLabel}
                </span>
              </div>
              {isClosed ? (
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-md flex-shrink-0"
                  style={{
                    background: dark ? 'rgba(239,68,68,0.1)' : '#fef2f2',
                    color: dark ? '#fca5a5' : '#dc2626',
                    border: dark ? '1px solid rgba(239,68,68,0.2)' : '1px solid #fecaca',
                  }}
                >
                  {t('businessHours.dayOff')}
                </span>
              ) : (
                <span
                  className="text-xs font-bold tabular-nums flex-shrink-0"
                  style={{ color: dark ? '#e2e8f0' : '#0f172a' }}
                >
                  {row.time}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
