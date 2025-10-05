export default function MentorCard({ m }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">{m.name}</h3>
          <p className="text-xs text-gray-500">{m.email}</p>
        </div>
        <div className="text-right text-sm text-slate-700">
          <div><span className="font-semibold">Rate:</span> {m.rate ? `$${m.rate}` : '—'}</div>
          <div><span className="font-semibold">Timezone:</span> {m.timezone ?? '—'}</div>
        </div>
      </div>

      <div className="mt-3 text-sm text-slate-700">
        <span className="font-semibold">Seniority:</span> {m.seniority || '—'}
      </div>

      <div className="mt-3">
        <span className="font-semibold text-sm">Domains:</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {m.domains?.length
            ? m.domains.map(d => (
                <span key={d} className="text-xs bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-full">
                  {d}
                </span>
              ))
            : <span className="text-sm text-gray-500 ml-2">—</span>
          }
        </div>
      </div>

      <div className="mt-3">
        <span className="font-semibold text-sm">Badges:</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {m.badges?.length
            ? m.badges.map(b => (
                <span key={b} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  {b}
                </span>
              ))
            : <span className="text-sm text-gray-500 ml-2">—</span>
          }
        </div>
      </div>

      {m.bio && <p className="mt-3 text-sm text-gray-600">{m.bio}</p>}
    </div>
  );
}
