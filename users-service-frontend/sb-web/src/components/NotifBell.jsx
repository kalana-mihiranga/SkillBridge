import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listBookingsDetailed } from '../api/booking';
import { ensureThread, getThreadByBooking, listMessages } from '../api/messaging';

// localStorage utils (same keys we used in Bookings & ChatPanel)
const seenKey = (whoId, bookingId) => `chatSeen_${whoId}_${bookingId}`;
function getSeen(whoId, bookingId) {
  return localStorage.getItem(seenKey(whoId, bookingId)) || '';
}

export default function NotifBell() {
  const nav = useNavigate();
  const [total, setTotal] = useState(0);
  const [firstBooking, setFirstBooking] = useState(null);
  const [label, setLabel] = useState(''); // "Mentor" / "Mentee"
  const tick = useRef(null);

  const ident = useMemo(() => {
    const role = localStorage.getItem('sb_role') || '';   // 'MENTEE' | 'MENTOR'
    const whoId = localStorage.getItem('sb_whoId') || '';
    return { role, whoId };
  }, []);

  async function pollOnce() {
    try {
      if (!ident.role || !ident.whoId) { setTotal(0); setFirstBooking(null); setLabel(''); return; }

      setLabel(ident.role === 'MENTEE' ? 'Mentee' : 'Mentor');

      // 1) load bookings for current identity
      const params = ident.role === 'MENTEE' ? { menteeId: ident.whoId } : { mentorId: ident.whoId };
      const data = await listBookingsDetailed(params);
      const bookings = data.items || [];
      if (bookings.length === 0) { setTotal(0); setFirstBooking(null); return; }

      // 2) for each booking, load thread + messages and count "other-side" unread
      let totalUnread = 0;
      let firstB = null;
      for (const b of bookings) {
        let t;
        try { t = await getThreadByBooking(b.id); }
        catch { t = await ensureThread(b.id); }

        const res = await listMessages(t.id);
        const messages = res.messages || [];
        if (messages.length === 0) continue;

        const lastSeenISO = getSeen(ident.whoId, b.id);
        const lastSeenTs = lastSeenISO ? new Date(lastSeenISO).getTime() : 0;

        const unread = messages.reduce((acc, m) => {
          const ts = new Date(m.createdAt).getTime();
          const meRole = ident.role; // 'MENTEE' or 'MENTOR'
          const isOther = (meRole === 'MENTEE' && m.senderRole === 'MENTOR') ||
                          (meRole === 'MENTOR' && m.senderRole === 'MENTEE');
          return acc + (isOther && ts > lastSeenTs ? 1 : 0);
        }, 0);

        if (unread > 0) {
          totalUnread += unread;
          if (!firstB) firstB = b;
        }
      }

      setTotal(totalUnread);
      setFirstBooking(firstB);
    } catch {
      // ignore polling errors
    }
  }

  useEffect(() => {
    // initial after mount
    pollOnce();
    // poll every 10s
    tick.current = setInterval(pollOnce, 10000);
    return () => { if (tick.current) clearInterval(tick.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goToBookings() {
    nav('/bookings', { state: firstBooking ? { openBookingId: firstBooking.id } : undefined });
  }

  return (
    <button
      onClick={goToBookings}
      className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-white text-sm"
      title={label ? `${label} notifications` : 'Notifications'}
    >
      <span>🔔</span>
      {label && <span className="hidden md:inline">{label}</span>}
      {total > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
          {total}
        </span>
      )}
    </button>
  );
}
