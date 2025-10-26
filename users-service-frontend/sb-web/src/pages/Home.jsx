import { useState } from 'react';
import { pingUsers } from '../api/users';
import { http } from '../api/client';

// Define base URLs from environment variables
const USERS_API = import.meta.env.VITE_USERS_API || '/users';
const AVAIL_API = import.meta.env.VITE_AVAIL_API || '/availability';
const BOOK_API  = import.meta.env.VITE_BOOKING_API || '/booking';
const MSG_API   = import.meta.env.VITE_MSG_API || '/messaging';

export default function Home() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function pingAll() {
    setLoading(true);
    setErr('');
    setResults([]);

    const services = [
      { name: 'Users Service', url: `${USERS_API}/health` },
      { name: 'Availability Service', url: `${AVAIL_API}/health` },
      { name: 'Booking Service', url: `${BOOK_API}/health` },
      { name: 'Messaging Service', url: `${MSG_API}/health` }
    ];

    try {
      const responses = await Promise.allSettled(
        services.map(async s => {
          const r = await fetch(s.url);
          const text = await r.text();
          return { ...s, ok: r.ok, body: text };
        })
      );

      setResults(
        responses.map((res, i) => {
          if (res.status === 'fulfilled') return res.value;
          return { ...services[i], ok: false, body: String(res.reason) };
        })
      );
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-800">SkillBridge Platform (Local Dev)</h2>
      <p className="text-slate-600">
        This dashboard lets you verify all backend microservices are running correctly.
      </p>

      <div className="bg-white border rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-600">Check health of all services</div>
        </div>
        <button
          onClick={pingAll}
          disabled={loading}
          className="bg-cyan-600 text-white px-4 py-2 rounded hover:bg-cyan-700 transition text-sm disabled:opacity-50"
        >
          {loading ? 'Checking…' : 'Ping All'}
        </button>
      </div>

      {err && <div className="text-red-600 text-sm">{err}</div>}

      {results.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {results.map((r) => (
            <div
              key={r.name}
              className={`border rounded-xl p-4 shadow-sm ${
                r.ok ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">{r.name}</h3>
                <span
                  className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                    r.ok
                      ? 'bg-green-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}
                >
                  {r.ok ? 'Healthy' : 'Down'}
                </span>
              </div>
              <pre className="mt-3 bg-slate-900 text-green-300 text-xs p-3 rounded overflow-x-auto max-h-40">
                {r.body}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
