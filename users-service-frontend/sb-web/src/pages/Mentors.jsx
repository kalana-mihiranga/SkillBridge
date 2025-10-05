import { useEffect, useState } from 'react';
import { getMentors } from '../api/users';
import TextInput from '../components/TextInput';
import Select from '../components/Select';
import MentorCard from '../components/MentorCard';

const DOMAINS = ['backend', 'frontend', 'devops', 'data'];
const SENIORITY = ['SENIOR', 'STAFF', 'PRINCIPAL'];
const BADGES = ['interview-coach', 'system-design-specialist'];

export default function Mentors() {
  const [filters, setFilters] = useState({ domain: '', seniority: '', badge: '', minRate: '', maxRate: '', q: '' });
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      // remove empty filters
      const params = Object.fromEntries(Object.entries(filters).filter(([,v]) => v !== '' && v != null));
      const data = await getMentors(params);
      setList(data.mentors || []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* auto-load on mount */ }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Browse Mentors</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
        <Select label="Domain" value={filters.domain} onChange={(v)=>setFilters(f=>({...f, domain:v}))} options={DOMAINS} />
        <Select label="Seniority" value={filters.seniority} onChange={(v)=>setFilters(f=>({...f, seniority:v}))} options={SENIORITY} />
        <Select label="Badge" value={filters.badge} onChange={(v)=>setFilters(f=>({...f, badge:v}))} options={BADGES} />
        <TextInput label="Min rate" value={filters.minRate} onChange={(v)=>setFilters(f=>({...f, minRate:v}))} />
        <TextInput label="Max rate" value={filters.maxRate} onChange={(v)=>setFilters(f=>({...f, maxRate:v}))} />
        <TextInput label="Search (name/bio)" value={filters.q} onChange={(v)=>setFilters(f=>({...f, q:v}))} />
      </div>

      <div style={{ marginTop: 10 }}>
        <button onClick={load} disabled={loading} style={{ padding: '8px 12px', borderRadius: 6 }}>
          {loading ? 'Loading…' : 'Apply filters'}
        </button>
      </div>

      {error && <div style={{ color: 'crimson', marginTop: 8 }}>{error}</div>}

      <div style={{ marginTop: 16 }}>
        {list.length === 0 && !loading && <div>No mentors found.</div>}
        {list.map((m) => <MentorCard key={m.id} m={m} />)}
      </div>
    </div>
  );
}
