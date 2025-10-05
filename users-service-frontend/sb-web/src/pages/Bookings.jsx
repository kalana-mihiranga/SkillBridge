// src/pages/Bookings.jsx
import { useMemo, useState } from 'react';
import { listBookingsDetailed, deleteBooking } from '../api/booking';

function BookingCard({ b, onCancel }) {
  const start = new Date(b.start);
  const end = new Date(b.end);
  const dateStr = start.toISOString().slice(0, 10);
  const timeStr = `${start.toISOString().slice(11, 16)}–${end.toISOString().slice(11, 16)} UTC`;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-slate-600">{dateStr} • {timeStr}</div>
          <div className="text-lg font-semibold text-slate-800 mt-0.5">
            Mentor: {b.mentor?.name || b.mentorId}
          </div>
          <div className="text-xs text-slate-500">
            {b.mentor?.email ? `(${b.mentor.email})` : null}
          </div>
          <div className="text-sm text-slate-700 mt-2">
            Status: <span className="font-semibold">{b.status}</span>
            {b.amount ? ` • ${b.currency || 'USD'} ${b.amount / 100}` : ''}
          </div>
          {b.notes && <div className="text-sm text-slate-600 mt-2">{b.notes}</div>}
        </div>
        <div className="text-right">
          {b.status !== 'CANCELLED' && (
            <button
              onClick={() => onCancel?.(b)}
              className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Bookings() {
  const [role, setRole] = useState('mentee'); // 'mentee' | 'mentor'
  const [whoId, setWhoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    setLoading(true); setErr(''); setMsg('');
    try {
      const params = role === 'mentee' ? { menteeId: whoId } : { mentorId: whoId };
      const data = await listBookingsDetailed(params);
      setItems(data.items || []);
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function cancelOne(b) {
    setMsg('Cancelling…'); setErr('');
    try {
      await deleteBooking(b.id);
      setMsg('Cancelled.');
      await load();
    } catch (e) {
      setMsg('');
      setErr(`Cancel failed: ${String(e)}`);
    }
  }

  const now = Date.now();
  const upcoming = useMemo(() => items.filter(b => new Date(b.start).getTime() >= now), [items, now]);
  const past     = useMemo(() => items.filter(b => new Date(b.start).getTime() <  now), [items, now]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">My Bookings</h2>

      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <div className="text-sm text-slate-600 mb-1">I am a</div>
            <div className="flex gap-2">
              <button
                className={`px-3 py-1.5 rounded-md border text-sm ${role==='mentee' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-gray-300'}`}
                onClick={() => setRole('mentee')}
              >Mentee</button>
              <button
                className={`px-3 py-1.5 rounded-md border text-sm ${role==='mentor' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-gray-300'}`}
                onClick={() => setRole('mentor')}
              >Mentor</button>
            </div>
          </div>

          <div>
            <div className="text-sm text-slate-600 mb-1">{role === 'mentee' ? 'Mentee ID' : 'Mentor ID'}</div>
            <input
              value={whoId}
              onChange={(e)=>setWhoId(e.target.value)}
              placeholder={`paste your ${role} id`}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <p className="text-xs text-slate-500 mt-1">We’ll replace this with Cognito later.</p>
          </div>

          <div className="flex items-end">
            <button
              onClick={load}
              disabled={!whoId || loading}
              className="h-10 bg-cyan-600 text-white px-4 rounded hover:bg-cyan-700 transition text-sm disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Load Bookings'}
            </button>
          </div>
        </div>

        {err && <div className="text-red-600 text-sm mt-2">{err}</div>}
        {msg && <div className="text-emerald-700 text-sm mt-2">{msg}</div>}
      </div>

      {/* Upcoming */}
      <section className="space-y-2">
        <h3 className="text-md font-semibold text-slate-800">Upcoming</h3>
        {upcoming.length === 0 ? (
          <div className="text-slate-500 text-sm">No upcoming bookings.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {upcoming.map(b => (
              <BookingCard key={b.id} b={b} onCancel={cancelOne} />
            ))}
          </div>
        )}
      </section>

      {/* Past */}
      <section className="space-y-2">
        <h3 className="text-md font-semibold text-slate-800">Past</h3>
        {past.length === 0 ? (
          <div className="text-slate-500 text-sm">No past bookings.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {past.map(b => (
              <BookingCard key={b.id} b={b} onCancel={cancelOne} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
