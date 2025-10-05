export default function MentorCard({ m }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, marginBottom: 10 }}>
      <div style={{ fontWeight: 700 }}>{m.name}</div>
      <div style={{ fontSize: 13, opacity: 0.8 }}>{m.email}</div>
      <div style={{ marginTop: 6 }}>
        <b>Seniority:</b> {m.seniority || '—'} &nbsp; | &nbsp;
        <b>Rate:</b> {m.rate ? `$${m.rate}` : 'n/a'} &nbsp; | &nbsp;
        <b>Timezone:</b> {m.timezone || '—'}
      </div>
      <div style={{ marginTop: 6 }}>
        <b>Domains:</b> {m.domains?.join(', ') || '—'}
      </div>
      <div style={{ marginTop: 6 }}>
        <b>Badges:</b> {m.badges?.join(', ') || '—'}
      </div>
      {m.bio && <div style={{ marginTop: 6 }}>{m.bio}</div>}
    </div>
  );
}
