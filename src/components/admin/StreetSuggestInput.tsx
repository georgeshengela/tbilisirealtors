import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { suggestStreets, type StreetSuggestion } from '../../lib/geocoding';

interface StreetSuggestInputProps {
  value: string;
  city: string;
  onChange: (value: string) => void;
  onPick: (hit: StreetSuggestion) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function StreetSuggestInput({
  value,
  city,
  onChange,
  onPick,
  placeholder = 'დაიწყეთ ქუჩის სახელის წერა…',
  disabled,
  className = '',
}: StreetSuggestInputProps) {
  const [hits, setHits] = useState<StreetSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function lookup(text: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 2) {
      setHits([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const seq = ++seqRef.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const found = await suggestStreets(text, city);
        if (seq !== seqRef.current) return;
        setHits(found);
        setActive(0);
        setOpen(found.length > 0);
      } finally {
        if (seq === seqRef.current) setLoading(false);
      }
    }, 220);
  }

  function pick(hit: StreetSuggestion) {
    onPick(hit);
    setOpen(false);
    setHits([]);
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          onChange={e => {
            onChange(e.target.value);
            lookup(e.target.value);
          }}
          onFocus={() => hits.length > 0 && setOpen(true)}
          onKeyDown={e => {
            if (!open || hits.length === 0) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive(i => (i + 1) % hits.length);
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive(i => (i - 1 + hits.length) % hits.length);
            }
            if (e.key === 'Enter' && hits[active]) {
              e.preventDefault();
              pick(hits[active]);
            }
            if (e.key === 'Escape') setOpen(false);
          }}
          className="w-full px-3.5 py-2.5 pr-9 rounded-xl border border-slate-200 text-slate-800 text-sm placeholder-slate-400 focus:outline-none bg-white"
        />
        {loading && (
          <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 animate-spin" />
        )}
      </div>

      {open && hits.length > 0 && (
        <div className="absolute z-[80] mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {hits.map((hit, index) => (
            <button
              key={`${hit.street}-${hit.lat}-${hit.lng}-${index}`}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => pick(hit)}
              className={`w-full flex items-start gap-2.5 px-3.5 py-2.5 text-left ${
                index === active ? 'bg-blue-50' : 'hover:bg-slate-50'
              }`}
            >
              <MapPin size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-800 truncate">{hit.label}</span>
                {hit.sublabel && (
                  <span className="block text-[11px] text-slate-500 truncate">{hit.sublabel}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
