export default function Select({ label, value, onChange, options = [], placeholder }) {
  return (
    <label className="block">
      {label && <div className="text-sm text-slate-600 mb-1">{label}</div>}
      <select
        value={value ?? ''}
        onChange={e => onChange?.(e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white
                   focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
      >
        <option value="">{placeholder || '— select —'}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
