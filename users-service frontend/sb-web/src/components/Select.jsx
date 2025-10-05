export default function Select({ label, value, onChange, options = [], placeholder }) {
  return (
    <label style={{ display: 'block', margin: '8px 0' }}>
      <div style={{ fontSize: 13, opacity: 0.8 }}>{label}</div>
      <select
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
      >
        <option value="">{placeholder || '— select —'}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
