import { useEffect, useState } from 'react';
import { getMentors } from '../api/users';
import { getSlots } from '../api/availability';
import TextInput from '../components/TextInput';
import Select from '../components/Select';
import MentorCard from '../components/MentorCard';
import DateInput from '../components/DateInput';
const DOMAINS = ['backend', 'frontend', 'devops', 'data'];
const SENIORITY = ['SENIOR', 'STAFF', 'PRINCIPAL'];
const BADGES = ['interview-coach', 'system-design-specialist'];

export default function Mentors() {
  const [filters, setFilters] = useState({
    domain: '', seniority: '', badge: '', minRate: '', maxRate: '', q: '', date: ''
  });
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [error, setError] = useState('');
const today = new Date().toISOString().slice(0,10);                      // YYYY-MM-DD
const in60  = new Date(Date.now() + 60*24*3600*1000).toISOString().slice(0,10);
  async function load() {
    setLoading(true); setError('');
    try {
      const { date, ...rest } = filters;
      const params = Object.fromEntries(Object.entries(rest).filter(([,v]) => v !== '' && v != null));
      const data = await getMentors(params);
      let mentors = data.mentors || [];

      // If a date is provided, keep only mentors who have open slots on that day
      if (date) {
        const results = await Promise.allSettled(
          mentors.map(m => getSlots({ mentorId: m.id, date }))
        );
        const availableIds = new Set(
          results
            .map((r, i) => (r.status === 'fulfilled' && r.value.slots?.length ? mentors[i].id : null))
            .filter(Boolean)
        );
        mentors = mentors.filter(m => availableIds.has(m.id));
      }
      setList(mentors);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Browse Mentors</h2>

      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <div className="grid md:grid-cols-7 gap-3">
          <Select label="Domain" value={filters.domain} onChange={(v)=>setFilters(f=>({...f, domain:v}))} options={DOMAINS} />
          <Select label="Seniority" value={filters.seniority} onChange={(v)=>setFilters(f=>({...f, seniority:v}))} options={SENIORITY} />
          <Select label="Badge" value={filters.badge} onChange={(v)=>setFilters(f=>({...f, badge:v}))} options={BADGES} />
          <TextInput label="Min rate" value={filters.minRate} onChange={(v)=>setFilters(f=>({...f, minRate:v}))} />
          <TextInput label="Max rate" value={filters.maxRate} onChange={(v)=>setFilters(f=>({...f, maxRate:v}))} />
          <TextInput label="Search (name/bio)" value={filters.q} onChange={(v)=>setFilters(f=>({...f, q:v}))} />
         <DateInput label="Date" value={filters.date} onChange={(v)=>setFilters(f=>({...f, date:v}))} />
        </div>

        <div className="mt-3">
          <button
            onClick={load}
            disabled={loading}
            className="bg-cyan-600 text-white px-4 py-2 rounded hover:bg-cyan-700 transition text-sm disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Apply filters'}
          </button>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="grid md:grid-cols-2 gap-4">
        {list.length === 0 && !loading && <div className="text-slate-600">No mentors found.</div>}
        {list.map((m) => <MentorCard key={m.id} m={m} />)}
      </div>
    </div>
  );
}
