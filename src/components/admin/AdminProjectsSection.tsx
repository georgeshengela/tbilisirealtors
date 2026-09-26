import { ExternalLink, HardHat } from 'lucide-react';
import { constructionProjects } from '../../data/mockData';

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  presale: { label: 'პრე-გაყიდვა', color: '#2563eb', bg: '#eff6ff' },
  building: { label: 'მშენებარე', color: '#d97706', bg: '#fff7ed' },
  completed: { label: 'დასრულებული', color: '#059669', bg: '#ecfdf5' },
};

export default function AdminProjectsSection() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">პროექტები</p>
        <h1 className="text-2xl font-extrabold text-slate-900">დეველოპერები და კომპლექსები</h1>
        <p className="mt-1 text-sm text-slate-500">
          იგივე პროექტები, რაც საჯარო საიტზე ჩანს. დეველოპერის სახელი თითო ბარათზეა.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
              <th className="py-2.5 px-4">პროექტი</th>
              <th className="py-2.5 pr-3">დეველოპერი</th>
              <th className="py-2.5 pr-3">ქალაქი</th>
              <th className="py-2.5 pr-3">სტატუსი</th>
              <th className="py-2.5 pr-3">ბინა</th>
              <th className="py-2.5 pr-4" />
            </tr>
          </thead>
          <tbody>
            {constructionProjects.map(project => {
              const meta = STATUS[project.status] ?? STATUS.building;
              return (
                <tr key={project.id} className="border-b border-slate-50 hover:bg-blue-50/30">
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={project.image}
                        alt=""
                        className="h-12 w-16 rounded-lg object-cover bg-slate-100"
                      />
                      <div>
                        <p className="font-bold text-slate-800">{project.name}</p>
                        <p className="text-[11px] text-slate-400">{project.district}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 font-semibold text-slate-700">{project.developer}</td>
                  <td className="py-2.5 pr-3 text-slate-600">{project.city}</td>
                  <td className="py-2.5 pr-3">
                    <span
                      className="rounded-lg px-2 py-1 text-[10px] font-extrabold"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 tabular-nums text-slate-600">{project.units}</td>
                  <td className="py-2.5 pr-4">
                    <a
                      href={`/project/${project.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                    >
                      საიტზე
                      <ExternalLink size={11} />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="inline-flex items-center gap-2 text-[12px] text-slate-400">
        <HardHat size={14} /> {constructionProjects.length} პროექტი
      </p>
    </div>
  );
}
