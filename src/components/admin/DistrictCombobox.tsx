import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Plus } from 'lucide-react';

export interface DistrictChoice {
  value: string;
  label: string;
}

interface DistrictComboboxProps {
  value: string;
  options: DistrictChoice[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function DistrictCombobox({
  value,
  options,
  onChange,
  placeholder = 'აირჩიეთ რაიონი',
  disabled,
  className = '',
}: DistrictComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) setQuery(value);
  }, [value, open]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = useMemo(() => {
    const key = query.trim().toLowerCase();
    if (!key) return options;
    return options.filter(opt =>
      opt.label.toLowerCase().includes(key) || opt.value.toLowerCase().includes(key),
    );
  }, [options, query]);

  const exact = options.some(opt => opt.value === query.trim() || opt.label === query.trim());
  const canAdd = Boolean(query.trim()) && !exact;

  function commit(next: string) {
    onChange(next);
    setQuery(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={open ? query : value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => {
            setQuery(value);
            setOpen(true);
          }}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
            onChange(e.target.value);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (filtered[0]) commit(filtered[0].value);
              else if (canAdd) commit(query.trim());
              else setOpen(false);
            }
            if (e.key === 'Escape') setOpen(false);
          }}
          className="w-full px-3.5 py-2.5 pr-9 rounded-xl border border-slate-200 text-slate-800 text-sm placeholder-slate-400 focus:outline-none bg-white"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => {
            setOpen(v => !v);
            inputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <ChevronDown size={16} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
      </div>

      {open && !disabled && (
        <div className="absolute z-[80] mt-1.5 w-full max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          {filtered.map(opt => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => commit(opt.value)}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2 text-left text-sm ${
                  selected ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{opt.label}</span>
                {selected && <Check size={14} />}
              </button>
            );
          })}
          {canAdd && (
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => commit(query.trim())}
              className="w-full flex items-center gap-2 px-3.5 py-2 text-left text-sm font-semibold text-blue-700 hover:bg-blue-50 border-t border-slate-100"
            >
              <Plus size={14} />
              დაამატე „{query.trim()}“
            </button>
          )}
          {filtered.length === 0 && !canAdd && (
            <p className="px-3.5 py-3 text-xs text-slate-400">რაიონი ვერ მოიძებნა — ჩაწერეთ ხელით</p>
          )}
        </div>
      )}
    </div>
  );
}
