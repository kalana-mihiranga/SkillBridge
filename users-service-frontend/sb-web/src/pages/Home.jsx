import { useState } from 'react';
import { pingUsers } from '../api/users';

export default function Home() {
  const [resp, setResp] = useState(null);
  const [err, setErr] = useState('');

  const ping = async () => {
    setErr(''); setResp(null);
    try {
      const data = await pingUsers();
      setResp(data);
    } catch (e) {
      setErr(String(e));
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>SkillBridge (Local)</h1>
      <button onClick={ping} style={{ padding: '8px 12px', borderRadius: 6 }}>Ping Users API</button>
      {resp && <pre style={{ background:'#111', color:'#0f0', padding:10, marginTop:10 }}>{JSON.stringify(resp,null,2)}</pre>}
      {err && <div style={{ color:'crimson', marginTop:10 }}>{err}</div>}
    </div>
  );
}
