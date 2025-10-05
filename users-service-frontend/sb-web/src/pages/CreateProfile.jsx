import { useState } from 'react';
import { createUserProfile } from '../api/users';
import TextInput from '../components/TextInput';
import Select from '../components/Select';

const ROLES = ['MENTEE', 'MENTOR'];
const SENIORITY = ['SENIOR', 'STAFF', 'PRINCIPAL'];
const DOMAINS = ['backend', 'frontend', 'devops', 'data'];
const BADGES = ['interview-coach', 'system-design-specialist'];

function Multi({ label, options, value = [], onChange }) {
  const toggle = (v) => {
    const set = new Set(value);
    set.has(v) ? set.delete(v) : set.add(v);
    onChange?.(Array.from(set));
  };
  return (
    <div style={{ margin: '8px 0' }}>
      <div style={{ fontSize: 13, opacity: 0.8 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(o => (
          <button key={o} type="button"
            onClick={()=>toggle(o)}
            style={{
              padding: '6px 10px', borderRadius: 999,
              border: '1px solid #ccc',
              background: value.includes(o) ? '#eef' : '#fff'
            }}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CreateProfile() {
  const [form, setForm] = useState({
    email: '', name: '', role: 'MENTEE',
    seniority: '', rate: '', currency: 'USD',
    timezone: 'Asia/Colombo', bio: '',
    domains: [], badges: []
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setResult(null);
    try {
      const payload = {
        ...form,
        rate: form.rate ? Number(form.rate) : undefined,
        seniority: form.role === 'MENTOR' && form.seniority ? form.seniority : undefined,
        domains: form.role === 'MENTOR' ? form.domains : [],
        badges: form.role === 'MENTOR' ? form.badges : []
      };
      const data = await createUserProfile(payload);
      setResult(data);
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Create Profile</h2>
      <form onSubmit={submit} style={{ maxWidth: 700 }}>
        <TextInput label="Email" value={form.email} onChange={set('email')} />
        <TextInput label="Full name" value={form.name} onChange={set('name')} />
        <Select label="Role" value={form.role} onChange={set('role')} options={ROLES} />
        {form.role === 'MENTOR' && (
          <>
            <Select label="Seniority" value={form.seniority} onChange={set('seniority')} options={SENIORITY} />
            <TextInput label="Hourly rate (USD)" value={form.rate} onChange={set('rate')} />
            <TextInput label="Currency" value={form.currency} onChange={set('currency')} />
            <Multi label="Domains" options={DOMAINS} value={form.domains} onChange={set('domains')} />
            <Multi label="Badges" options={BADGES} value={form.badges} onChange={set('badges')} />
          </>
        )}
        <TextInput label="Timezone" value={form.timezone} onChange={set('timezone')} />
        <TextInput label="Bio" value={form.bio} onChange={set('bio')} />
        <button type="submit" style={{ padding: '10px 14px', borderRadius: 6, marginTop: 8 }}>Create</button>
      </form>

      {error && <div style={{ color: 'crimson', marginTop: 12 }}>{error}</div>}
      {result && (
        <pre style={{ marginTop: 12, background: '#111', color: '#0f0', padding: 12, overflowX: 'auto' }}>
{JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
