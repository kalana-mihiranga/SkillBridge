import { http } from './client';
const AVAIL_API = import.meta.env.VITE_AVAIL_API || '/api/availability';

export function publishSlots(body) {
  return http.post('/availability/slots', body, AVAIL_API);
}

export function getSlots(params) {
  // params: { mentorId, date: 'YYYY-MM-DD' }
  return http.get('/availability', params, AVAIL_API);
}
