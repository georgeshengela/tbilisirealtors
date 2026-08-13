import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function AdminFooter() {
  return (
    <footer
      className="mt-auto"
      style={{
        background: '#111827',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="container-xl py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-500 text-xs">
          <Shield size={13} className="text-slate-600 flex-shrink-0" />
          <span>© {new Date().getFullYear()} TbilisiRealtor.GE · Admin Panel</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <Link
            to="/"
            className="text-slate-400 hover:text-white transition-colors"
            style={{ textDecoration: 'none' }}
          >
            საიტი
          </Link>
          <Link
            to="/admin"
            className="text-slate-400 hover:text-white transition-colors"
            style={{ textDecoration: 'none' }}
          >
            პანელი
          </Link>
          <Link
            to="/admin/listings/new"
            className="text-slate-400 hover:text-emerald-400 transition-colors"
            style={{ textDecoration: 'none' }}
          >
            + განცხადება
          </Link>
        </div>
      </div>
    </footer>
  );
}
