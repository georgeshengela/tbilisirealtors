import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Loader2, User } from 'lucide-react';
import { useApiRequest } from '../../contexts/AdminAuthContext';

export interface OwnerSuggestion {
  name: string;
  phone: string;
  email: string;
  idNumber: string;
  address: string;
  note: string;
  listingCount: number;
  sampleAddress: string;
}

interface OwnerSuggestInputProps {
  value: string;
  onChange: (value: string) => void;
  onPick: (owner: OwnerSuggestion) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  label?: ReactNode;
}

export default function OwnerSuggestInput({
  value,
  onChange,
  onPick,
  placeholder,
  disabled,
  className = '',
  inputClassName = '',
  label,
}: OwnerSuggestInputProps) {
  const api = useApiRequest();
  const [hits, setHits] = useState<OwnerSuggestion[]>([]);
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
    const q = text.trim();
    const digits = q.replace(/\D/g, '');
    if (q.length < 2 && digits.length < 3) {
      setHits([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const seq = ++seqRef.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api(`/owners/search?q=${encodeURIComponent(q)}`);
        if (seq !== seqRef.current) return;
        const list = Array.isArray(res?.owners) ? (res.owners as OwnerSuggestion[]) : [];
        setHits(list);
        setActive(0);
        setOpen(list.length > 0);
      } catch {
        if (seq === seqRef.current) {
          setHits([]);
          setOpen(false);
        }
      } finally {
        if (seq === seqRef.current) setLoading(false);
      }
    }, 250);
  }

  function pick(hit: OwnerSuggestion) {
    onPick(hit);
    setOpen(false);
    setHits([]);
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label}
      <div className="relative">
        <input
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          readOnly={disabled}
          onChange={e => {
            onChange(e.target.value);
            if (!disabled) lookup(e.target.value);
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
          className={inputClassName}
        />
        {loading && (
          <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 animate-spin" />
        )}
      </div>

      {open && hits.length > 0 && (
        <div className="absolute z-[80] mt-1.5 w-full min-w-[260px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <p className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100">
            არსებული მესაკუთრეები — აირჩიე მიბმისთვის
          </p>
          {hits.map((hit, index) => (
            <button
              key={`${hit.phone || hit.name}-${index}`}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => pick(hit)}
              className={`w-full flex items-start gap-2.5 px-3.5 py-2.5 text-left ${
                index === active ? 'bg-blue-50' : 'hover:bg-slate-50'
              }`}
            >
              <User size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-800 truncate">
                  {hit.name || 'უსახელო'}
                </span>
                <span className="block text-[11px] text-slate-500 truncate">
                  {[hit.phone, hit.idNumber].filter(Boolean).join(' · ') || 'კონტაქტი არ არის'}
                </span>
                <span className="block text-[10px] text-slate-400 mt-0.5 truncate">
                  {hit.listingCount} განცხადება
                  {hit.sampleAddress ? ` · ${hit.sampleAddress}` : ''}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
