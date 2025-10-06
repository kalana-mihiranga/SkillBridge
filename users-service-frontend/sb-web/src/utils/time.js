export function localDateTimeToIsoUtc(dateStr, timeStr) {
  const [hh='00', mm='00'] = (timeStr || '').split(':');
  const d = new Date(dateStr);
  d.setHours(parseInt(hh,10), parseInt(mm,10), 0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().replace(/\.\d{3}Z$/, 'Z');
}
export function minutesBetween(startHHMM, endHHMM) {
  const [sh, sm] = startHHMM.split(':').map(Number);
  const [eh, em] = endHHMM.split(':').map(Number);
  return (eh*60 + em) - (sh*60 + sm);
}
export function addMinutes(hhmm, mins) {
  let [h, m] = hhmm.split(':').map(Number);
  let total = h*60 + m + mins;
  total = Math.max(0, Math.min(24*60, total));
  const nh = String(Math.floor(total/60)).padStart(2, '0');
  const nm = String(total % 60).padStart(2, '0');
  return `${nh}:${nm}`;
}
