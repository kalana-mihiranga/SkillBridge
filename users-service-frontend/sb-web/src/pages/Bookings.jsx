// src/pages/Bookings.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { listBookingsDetailed, deleteBooking } from '../api/booking';
import { ensureThread, getThreadByBooking, listMessages } from '../api/messaging';
import ChatPanel from '../components/ChatPanel';
import CodeReviewPanel from '../components/CodeReviewPanel';

// ---- localStorage helpers for "last seen" per booking & user ----
const seenKey = (whoId, bookingId) => `chatSeen_${whoId}_${bookingId}`;
function getSeen(whoId, bookingId) {
  return localStorage.getItem(seenKey(whoId, bookingId)) || '';
}
function setSeenNow(whoId, bookingId) {
  localStorage.setItem(seenKey(whoId, bookingId), new Date().toISOString());
}

// ---- Card for a single booking ----
function BookingCard({ b, onCancel, onChat, onReview, onPair, unread = 0 }) {
  const start = new Date(b.start);
  const end = new Date(b.end);
  const dateStr = start.toISOString().slice(0, 10);
  const timeStr = `${start.toISOString().slice(11, 16)}–${end.toISOString().slice(11, 16)} UTC`;
  const durationMin = Math.max(0, Math.round((end - start) / 60000));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-sm text-slate-600">
            {dateStr} • {timeStr} • <span className="font-medium">{durationMin} min</span>
          </div>

          <div className="text-sm text-slate-700">
            <span className="font-semibold">Mentor:</span> {b.mentor?.name || b.mentorId}
            {b.mentor?.email && <span className="text-xs text-slate-500"> ({b.mentor.email})</span>}
          </div>

          <div className="text-sm text-slate-700">
            <span className="font-semibold">Mentee:</span> {b.mentee?.name || b.menteeId}
            {b.mentee?.email && <span className="text-xs text-slate-500"> ({b.mentee.email})</span>}
          </div>

          <div className="text-sm text-slate-700">
            Status: <span className="font-semibold">{b.status}</span>
            {b.amount ? ` • ${b.currency || 'USD'} ${b.amount / 100}` : ''}
          </div>

          {b.notes && <div className="text-sm text-slate-600">{b.notes}</div>}
        </div>

        <div className="text-right flex gap-2 items-start">
          <button
            onClick={() => onReview?.(b)}
            className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md"
            title="Open code review"
          >
            Code Review
          </button>
          <button
            onClick={() => onPair?.(b)}
            className="text-sm bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1.5 rounded-md"
            title="Join pair-programming session (WebRTC)"
          >
            Join Session
          </button>
          <button
            onClick={() => onChat?.(b)}
            className="relative text-sm bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-md"
            title="Open chat"
          >
            Chat
            {unread > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {unread}
              </span>
            )}
          </button>
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

// ---- Page ----
export default function Bookings() {
  const location = useLocation();
  const navigate = useNavigate();
  const openFromBell = location?.state?.openBookingId || null;

  const [role, setRole] = useState('mentee'); // 'mentee' | 'mentor'
  const [whoId, setWhoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const [chatFor, setChatFor] = useState(null);
  const [reviewFor, setReviewFor] = useState(null);

  // unreadCount per booking
  const [unreadMap, setUnreadMap] = useState({});
  const pollRef = useRef(null);

  // hydrate role/id from localStorage (so header bell & page stay in sync)
  useEffect(() => {
    const savedRole = localStorage.getItem('sb_role');
    const savedWho = localStorage.getItem('sb_whoId');
    if (savedRole === 'MENTEE' || savedRole === 'MENTOR') {
      setRole(savedRole.toLowerCase());
    }
    if (savedWho) setWhoId(savedWho);
  }, []);

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
  const meRole   = role === 'mentee' ? 'MENTEE' : 'MENTOR';

  // ---- unread polling: compute unread per booking every 8s for this user ----
  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setUnreadMap({});
    if (!whoId || items.length === 0) return;

    const poll = async () => {
      try {
        const entries = await Promise.all(items.map(async (b) => {
          try {
            let t;
            try { t = await getThreadByBooking(b.id); }
            catch { t = await ensureThread(b.id); }

            const res = await listMessages(t.id);
            const messages = res.messages || [];
            if (messages.length === 0) return [b.id, 0];

            const lastSeenISO = getSeen(whoId, b.id);
            const lastSeenTs = lastSeenISO ? new Date(lastSeenISO).getTime() : 0;

            const unread = messages.reduce((acc, m) => {
              const ts = new Date(m.createdAt).getTime();
              const isOther = (meRole === 'MENTEE' && m.senderRole === 'MENTOR') ||
                              (meRole === 'MENTOR' && m.senderRole === 'MENTEE');
              return acc + (isOther && ts > lastSeenTs ? 1 : 0);
            }, 0);
            return [b.id, unread];
          } catch {
            return [b.id, 0];
          }
        }));
        setUnreadMap(Object.fromEntries(entries));
      } catch {
        // ignore poll errors
      }
    };

    const kickoff = setTimeout(poll, 300);
    pollRef.current = setInterval(poll, 8000);
    return () => { clearTimeout(kickoff); if (pollRef.current) clearInterval(pollRef.current); };
  }, [items, whoId, meRole]);

  // mark as read when opening chat (so badge clears immediately)
  function openChat(b) {
    setChatFor(b);
    if (whoId && b?.id) {
      setSeenNow(whoId, b.id);
      setUnreadMap(prev => ({ ...prev, [b.id]: 0 }));
    }
  }

  // open code review panel
  function openReview(b) {
    setReviewFor(b);
  }

  // open WebRTC pair page
  function openPair(b) {
    if (!whoId) {
      alert('Please enter your ID first.');
      return;
    }
    navigate(`/pair?bookingId=${encodeURIComponent(b.id)}&userId=${encodeURIComponent(whoId)}&role=${encodeURIComponent(meRole)}`);
  }

  // notifications strip: bookings with unread > 0
  const notifications = Object.entries(unreadMap)
    .filter(([, count]) => count > 0)
    .map(([bookingId, count]) => {
      const b = items.find(x => x.id === bookingId);
      return b ? { booking: b, count } : null;
    })
    .filter(Boolean);

  // if navigated from bell with an openBookingId, auto-open once items arrive
  useEffect(() => {
    if (!openFromBell || items.length === 0) return;
    const b = items.find(x => x.id === openFromBell);
    if (b) openChat(b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openFromBell, items]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">My Bookings</h2>

      {/* Identity / load */}
      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <div className="text-sm text-slate-600 mb-1">I am a</div>
            <div className="flex gap-2">
              <button
                className={`px-3 py-1.5 rounded-md border text-sm ${role==='mentee' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-gray-300'}`}
                onClick={() => { setRole('mentee'); localStorage.setItem('sb_role','MENTEE'); }}
              >Mentee</button>
              <button
                className={`px-3 py-1.5 rounded-md border text-sm ${role==='mentor' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-gray-300'}`}
                onClick={() => { setRole('mentor'); localStorage.setItem('sb_role','MENTOR'); }}
              >Mentor</button>
            </div>
          </div>

          <div>
            <div className="text-sm text-slate-600 mb-1">{role === 'mentee' ? 'Mentee ID' : 'Mentor ID'}</div>
            <input
              value={whoId}
              onChange={(e)=>{ setWhoId(e.target.value); localStorage.setItem('sb_whoId', e.target.value); }}
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

        {err && <div className="mt-2 text-red-600 text-sm">{err}</div>}
        {msg && <div className="mt-2 text-emerald-700 text-sm">{msg}</div>}
      </div>

      {/* Notifications strip */}
      {notifications.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex flex-wrap gap-2 items-center">
          <span className="text-sm text-amber-900 font-semibold">New messages:</span>
          {notifications.map(({ booking, count }) => (
            <button
              key={booking.id}
              onClick={() => openChat(booking)}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded-md"
              title={`Go to chat for booking ${booking.id.slice(0,8)}`}
            >
              {booking.mentor?.name || booking.mentorId} • {count}
            </button>
          ))}
        </div>
      )}

      {/* Upcoming */}
      <section className="space-y-2">
        <h3 className="text-md font-semibold text-slate-800">Upcoming</h3>
        {upcoming.length === 0 ? (
          <div className="text-slate-500 text-sm">No upcoming bookings.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {upcoming.map(b => (
              <BookingCard
                key={b.id}
                b={b}
                onCancel={cancelOne}
                onChat={openChat}
                onReview={openReview}
                onPair={openPair}
                unread={unreadMap[b.id] || 0}
              />
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
              <BookingCard
                key={b.id}
                b={b}
                onCancel={cancelOne}
                onChat={openChat}
                onReview={openReview}
                onPair={openPair}
                unread={unreadMap[b.id] || 0}
              />
            ))}
          </div>
        )}
      </section>

      {/* Chat overlay */}
      {chatFor && (
        <ChatPanel
          booking={chatFor}
          meId={whoId}
          meRole={meRole}
          onClose={() => {
            if (whoId && chatFor?.id) setSeenNow(whoId, chatFor.id);
            setChatFor(null);
          }}
          onMarkedSeen={() => {
            if (chatFor?.id) setUnreadMap(prev => ({ ...prev, [chatFor.id]: 0 }));
          }}
        />
      )}

      {/* Code Review overlay */}
      {reviewFor && (
        <CodeReviewPanel
          booking={reviewFor}
          meId={whoId}
          meRole={meRole}
          onClose={() => setReviewFor(null)}
        />
      )}
    </div>
  );
}
