// src/components/ChatPanel.jsx
import { useEffect, useRef, useState } from 'react';
import { ensureThread, getThreadByBooking, listMessages, sendMessage } from '../api/messaging';

// localStorage helpers (same convention as Bookings.jsx)
const seenKey = (whoId, bookingId) => `chatSeen_${whoId}_${bookingId}`;
function setSeenNow(whoId, bookingId) {
  localStorage.setItem(seenKey(whoId, bookingId), new Date().toISOString());
}

export default function ChatPanel({ booking, meId, meRole='MENTEE', onClose, onMarkedSeen }) {
  const [thread, setThread]   = useState(null);
  const [messages, setMsgs]   = useState([]);
  const [body, setBody]       = useState('');
  const [err, setErr]         = useState('');
  const listRef               = useRef(null);

  async function loadThreadAndMessages() {
    setErr('');
    try {
      let t;
      try {
        t = await getThreadByBooking(booking.id);
      } catch {
        t = await ensureThread(booking.id);
      }
      setThread(t);
      const m = await listMessages(t.id);
      setMsgs(m.messages || []);
      setTimeout(() => listRef.current?.scrollTo(0, 999999), 0);

      // mark seen when we load the list
      setSeenNow(meId, booking.id);
      onMarkedSeen?.();
    } catch (e) {
      setErr(String(e));
    }
  }

  useEffect(() => {
    if (booking?.id) loadThreadAndMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.id]);

  // whenever new messages arrive (e.g., after sending), mark seen again
  useEffect(() => {
    if (!booking?.id || messages.length === 0) return;
    setSeenNow(meId, booking.id);
    onMarkedSeen?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  async function send() {
    if (!thread || !body.trim()) return;
    try {
      const msg = await sendMessage(thread.id, { senderId: meId, senderRole: meRole, body });
      setMsgs(prev => [...prev, msg]);
      setBody('');
      setTimeout(() => listRef.current?.scrollTo(0, 999999), 0);
    } catch (e) { setErr(String(e)); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center">
      <div className="bg-white w-full max-w-xl rounded-xl shadow-lg overflow-hidden">
        <div className="bg-slate-800 text-white px-4 py-2 flex justify-between items-center">
          <div className="text-sm font-semibold">
            Chat — Booking {booking?.id.slice(0,8)}
          </div>
          <button
            onClick={() => { setSeenNow(meId, booking.id); onMarkedSeen?.(); onClose?.(); }}
            className="text-xs bg-slate-700 px-2 py-1 rounded"
          >
            Close
          </button>
        </div>

        <div className="p-4">
          {err && <div className="text-red-600 text-sm mb-2">{err}</div>}

          <div ref={listRef} className="border rounded-md h-64 overflow-y-auto p-3 space-y-2 bg-gray-50">
            {messages.length === 0 && <div className="text-xs text-slate-500">No messages yet.</div>}
            {messages.map((m) => (
              <div key={m.id} className={`max-w-[80%] ${m.senderRole === meRole ? 'ml-auto text-right' : ''}`}>
                <div className={`inline-block rounded-lg px-3 py-2 text-sm ${m.senderRole === meRole ? 'bg-cyan-600 text-white' : 'bg-white border'}`}>
                  <div className="text-[11px] opacity-80 mb-1">{m.senderRole}</div>
                  <div>{m.body}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={body}
              onChange={e=>setBody(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <button onClick={send} className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded">
              Send
            </button>
          </div>

          <p className="text-[11px] text-slate-500 mt-2">
            Messages are tied to this booking. (Polling every ~8s for new messages.)
          </p>
        </div>
      </div>
    </div>
  );
}
