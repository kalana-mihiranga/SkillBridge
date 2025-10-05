export default function TextInput({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <label style={{ display: 'block', margin: '8px 0' }}>
      <div style={{ fontSize: 13, opacity: 0.8 }}>{label}</div>
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 6 }}
      />
    </label>
  );
}
