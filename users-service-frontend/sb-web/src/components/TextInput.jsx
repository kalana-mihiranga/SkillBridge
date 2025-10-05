export default function TextInput({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <label className="block">
      {label && <div className="text-sm text-slate-600 mb-1">{label}</div>}
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm
                   focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white"
      />
    </label>
  );
}
