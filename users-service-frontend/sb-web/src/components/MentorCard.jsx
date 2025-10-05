// src/components/MentorCard.jsx
import { useEffect, useState } from 'react';
import { getSlots } from '../api/availability';
import { createBooking } from '../api/booking';

/**
 * Props:
 *  - m: Mentor object from /mentors
 *  - date?: 'YYYY-MM-DD' string (when provided, shows that day's open slots)
 *  - menteeId?: string (required to book a slot; no auth yet)
 */
export default function MentorCard({ m, date, menteeId }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // Load open slots for this mentor on the given date
  useEffect(() => {
    setMsg('');
    setError('');
    setSlots([]);
    if (!date) return; // only fetch when a date is selected
    setLoading(true);
    getSlots({ mentorId: m.id, date })
      .then((res) => setSlots(res.slots || []))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [m.id, date]);

  // Book a specific slot
  async function book(slot) {
    if (!menteeId) {
      setMsg('Please enter your Mentee ID above (on the Mentors page).');
      return;
    }
    try {
      setMsg('Booking…');
      await createBooking({
        menteeId,
        mentorId: m.id,
        slotId: slot.id,
        amount: m.rate ? Number(m.rate) * 100 : 0, // example cents calculation
        currency: m.currency || 'USD',
        notes: `Booked via UI for ${date}`
      });
      setMsg('Booked! The slot is now reserved.');
      // Refresh visible slots
      const refreshed = await getSlots({ mentorId: m.id, date });
      setSlots(refreshed.slots || []);
    } catch (e) {
      setMsg(`Booking failed: ${String(e)}`);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">{m.name}</h3>
          <p className="text-xs text-gray-500">{m.email}</p>
        </div>
        <div className="text-right text-sm text-slate-700">
          <div>
            <span className="font-semibold">Rate:</span> {m.rate ? `$${m.rate}` : '—'}
            {m.currency ? ` ${m.currency}` : ''}
          </div>
          <div><span className="font-semibold">Timezone:</span> {m.timezone ?? '—'}</div>
        </div>
      </div>

      {/* Seniority */}
      <div className="mt-3 text-sm text-slate-700">
        <span className="font-semibold">Seniority:</span> {m.seniority || '—'}
      </div>

      {/* Domains */}
      <div className="mt-3">
        <span className="font-semibold text-sm">Domains:</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {m.domains?.length
            ? m.domains.map((d) => (
                <span key={d} className="text-xs bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-full">
                  {d}
                </span>
              ))
            : <span className="text-sm text-gray-500 ml-2">—</span>}
        </div>
      </div>

      {/* Badges */}
      <div className="mt-3">
        <span className="font-semibold text-sm">Badges:</span>
        <div className="mt-1 flex flex-wrap gap-2">
          {m.badges?.length
            ? m.badges.map((b) => (
                <span key={b} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  {b}
                </span>
              ))
            : <span className="text-sm text-gray-500 ml-2">—</span>}
        </div>
      </div>

      {/* Bio */}
      {m.bio && <p className="mt-3 text-sm text-gray-600">{m.bio}</p>}

      {/* Availability for selected date */}
      {date && (
        <div className="mt-4 border-t pt-3">
          <h4 className="text-sm font-semibold text-slate-800 mb-2">Available on {date}</h4>

          {loading && <div className="text-xs text-slate-500">Loading slots…</div>}
          {error && <div className="text-xs text-red-600">{error}</div>}
          {msg && !loading && !error && <div className="text-xs text-emerald-700">{msg}</div>}

          {!loading && !error && (
            slots.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {slots.map((s) => {
                  // Show only HH:mm for readability (from UTC ISO)
                  const startHM = new Date(s.start).toISOString().substring(11, 16);
                  const endHM = new Date(s.end).toISOString().substring(11, 16);
                  return (
                    <button
                      key={s.id}
                      onClick={() => book(s)}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-md"
                      title={`${s.start} → ${s.end} (UTC)`}
                    >
                      Book {startHM}-{endHM}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-500">No open slots for this date.</div>
            )
          )}

          <p className="text-[11px] text-slate-500 mt-2">
            Times are shown in <b>UTC</b> for now. We’ll localize later.
          </p>
        </div>
      )}
    </div>
  );
}
