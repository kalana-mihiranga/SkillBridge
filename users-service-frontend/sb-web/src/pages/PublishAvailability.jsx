import { useMemo, useState } from 'react';
import TextInput from '../components/TextInput';
import DateInput from '../components/DateInput';
import { publishSlots } from '../api/availability';
import { localDateTimeToIsoUtc, minutesBetween, addMinutes } from '../utils/time';

export default function PublishAvailability() {
  const [mentorId, setMentorId] = useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('12:00');
  const [slotLen, setSlotLen] = useState('30'); // minutes
  const [gap, setGap] = useState('0');          // minutes between slots
  const [genError, setGenError] = useState('');
  const [preview, setPreview] = useState([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [apiErr, setApiErr] = useState('');

  const canGenerate = useMemo(() => {
    if (!mentorId || !date || !start || !end) return false;
    const total = minutesBetween(start, end);
    return total > 0 && Number(slotLen) > 0;
  }, [mentorId, date, start, end, slotLen]);

  function generateSlots() {
    setGenError(''); setPreview([]); setResult(null); setApiErr('');
    if (!canGenerate) {
      setGenError('Please fill Mentor ID, Date, Start/End times, and a positive slot length.');
      return;
    }
    const total = minutesBetween(start, end);
    const len = Number(slotLen);
    const gapM = Number(gap) || 0;

    if (len > total) {
      setGenError('Slot length is greater than the total time range.');
      return;
    }

    const slots = [];
    let cur = start;
    while (minutesBetween(cur, end) >= len) {
      const slotEndLocal = addMinutes(cur, len);
      slots.push({
        start: localDateTimeToIsoUtc(date, cur),
        end:   localDateTimeToIsoUtc(date, slotEndLocal),
      });
      cur = addMinutes(slotEndLocal, gapM);
    }
    if (slots.length === 0) {
      setGenError('No slots generated; adjust times/length.');
      return;
    }
    setPreview(slots);
  }

  async function submit() {
    setSaving(true); setApiErr(''); setResult(null);
    try {
      const res = await publishSlots({ mentorId, slots: preview });
      setResult(res);
      // keep preview visible; mentor might want to see what was sent
    } catch (e) {
      setApiErr(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">Publish Availability</h2>

      <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4 max-w-3xl">
        <div className="grid md:grid-cols-2 gap-4">
          <TextInput label="Mentor ID" value={mentorId} onChange={setMentorId} placeholder="paste a mentor id" />
          <DateInput label="Date" value={date} onChange={setDate} />
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <label className="block">
            <div className="text-sm text-slate-600 mb-1">Start time</div>
            <input type="time" value={start} onChange={(e)=>setStart(e.target.value)}
                   className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white
                              focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </label>

          <label className="block">
            <div className="text-sm text-slate-600 mb-1">End time</div>
            <input type="time" value={end} onChange={(e)=>setEnd(e.target.value)}
                   className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white
                              focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </label>

          <TextInput label="Slot length (min)" value={slotLen} onChange={setSlotLen} />
          <TextInput label="Gap (min, optional)" value={gap} onChange={setGap} />
        </div>

        <div className="flex gap-3">
          <button
            onClick={generateSlots}
            className="bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-800 transition text-sm"
          >
            Generate
          </button>
          <button
            onClick={submit}
            disabled={preview.length === 0 || saving}
            className="bg-cyan-600 text-white px-4 py-2 rounded hover:bg-cyan-700 transition text-sm disabled:opacity-50"
          >
            {saving ? 'Publishing…' : 'Publish slots'}
          </button>
        </div>

        {genError && <div className="text-red-600 text-sm">{genError}</div>}
        {apiErr && <div className="text-red-600 text-sm">{apiErr}</div>}
        {result && (
          <div className="text-green-700 text-sm">Created: <b>{result.created}</b> slots</div>
        )}
      </div>

      <div className="bg-white border rounded-xl p-5 shadow-sm max-w-3xl">
        <h3 className="font-semibold text-slate-800 mb-2">Preview</h3>
        {preview.length === 0 ? (
          <div className="text-slate-500 text-sm">No slots yet. Click Generate to preview.</div>
        ) : (
          <ul className="text-sm list-disc pl-5 space-y-1">
            {preview.map((s, idx) => (
              <li key={idx} className="text-slate-700">
                <span className="font-mono">{s.start}</span> → <span className="font-mono">{s.end}</span> (UTC)
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-slate-500 mt-2">
          Note: Times are saved as UTC on the server. We used your local date/time and converted to UTC (Z).
        </p>
      </div>
    </div>
  );
}
