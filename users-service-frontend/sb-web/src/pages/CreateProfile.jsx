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
    <div>
      <div className="text-sm text-slate-600 mb-1">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button
            type="button"
            key={o}
            onClick={()=>toggle(o)}
            className={`px-3 py-1.5 rounded-full border text-sm ${
              value.includes(o) ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-slate-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
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
    e.preventDefault(); setError(''); setResult(null);
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
    } catch (e) { setError(String(e)); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Create Profile</h2>

      <form onSubmit={submit} className="bg-white border rounded-xl p-5 shadow-sm max-w-3xl space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <TextInput label="Email" value={form.email} onChange={set('email')} />
          <TextInput label="Full name" value={form.name} onChange={set('name')} />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Select label="Role" value={form.role} onChange={set('role')} options={ROLES} />
          <TextInput label="Timezone" value={form.timezone} onChange={set('timezone')} />
          <TextInput label="Currency" value={form.currency} onChange={set('currency')} />
        </div>

        {form.role === 'MENTOR' && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <Select label="Seniority" value={form.seniority} onChange={set('seniority')} options={SENIORITY} />
              <TextInput label="Hourly rate" value={form.rate} onChange={set('rate')} />
              <TextInput label="Bio" value={form.bio} onChange={set('bio')} />
            </div>
            <Multi label="Domains" options={DOMAINS} value={form.domains} onChange={set('domains')} />
            <Multi label="Badges"  options={BADGES}  value={form.badges}  onChange={set('badges')} />
          </div>
        )}

        <button type="submit" className="bg-cyan-600 text-white px-4 py-2 rounded hover:bg-cyan-700 transition">
          Create
        </button>

        {error && <div className="text-red-600 text-sm">{error}</div>}
      </form>

      {result && (
        <div className="bg-slate-900 text-green-300 text-xs p-4 rounded max-w-3xl overflow-x-auto">
{JSON.stringify(result, null, 2)}
        </div>
      )}
    </div>
  );
}
