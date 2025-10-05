export default function DateInput({ label, value, onChange, min, max }) {
  return (
    <label className="block">
      {label && <div className="text-sm text-slate-600 mb-1">{label}</div>}
      <input
        type="date"
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        min={min}
        max={max}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white
                   focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
      />
    </label>
  );
}
