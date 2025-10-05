import { useState } from 'react';

const USERS_API = import.meta.env.VITE_USERS_API || '/api/users';

export default function Home() {
  const [resp, setResp] = useState('');
  const [err, setErr] = useState('');

  const ping = async () => {
    setErr(''); setResp('');
    try {
      const r = await fetch(`${USERS_API}/health`);
      const t = await r.text();
      setResp(t);
    } catch (e) {
      setErr(String(e));
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-slate-800">Welcome to SkillBridge (Local)</h2>
      <p className="text-slate-600">Use the navbar to browse mentors or create a profile.</p>

      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-600">Users API base</div>
            <div className="font-mono text-xs">{USERS_API}</div>
          </div>
          <button
            onClick={ping}
            className="bg-cyan-600 text-white px-4 py-2 rounded hover:bg-cyan-700 transition text-sm"
          >
            Ping API
          </button>
        </div>
        {resp && <pre className="mt-3 bg-slate-900 text-green-300 text-xs p-3 rounded">{resp}</pre>}
        {err && <div className="mt-3 text-red-600 text-sm">{err}</div>}
      </div>
    </div>
  );
}
