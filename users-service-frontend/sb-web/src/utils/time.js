// Build an ISO string in UTC (with Z) for a given local date (YYYY-MM-DD) and time (HH:mm).
export function localDateTimeToIsoUtc(dateStr, timeStr) {
  // If timeStr missing, default to 00:00
  const [hh = '00', mm = '00'] = (timeStr || '').split(':');
  // Create a Date in local time
  const d = new Date(dateStr);
  d.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);
  // Convert to ISO in UTC
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// Return minutes between two local HH:mm times (assumes same day)
export function minutesBetween(startHHMM, endHHMM) {
  const [sh, sm] = startHHMM.split(':').map(Number);
  const [eh, em] = endHHMM.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

// Add minutes to a HH:mm and return new HH:mm (24h)
export function addMinutes(hhmm, mins) {
  let [h, m] = hhmm.split(':').map(Number);
  let total = h * 60 + m + mins;
  total = Math.max(0, Math.min(24 * 60, total));
  const nh = String(Math.floor(total / 60)).padStart(2, '0');
  const nm = String(total % 60).padStart(2, '0');
  return `${nh}:${nm}`;
}
