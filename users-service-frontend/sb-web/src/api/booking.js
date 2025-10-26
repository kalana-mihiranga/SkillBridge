import { http } from './client';
const BOOK_API = import.meta.env.VITE_BOOKING_API || '/booking';

export function createBooking(body) { return http.post('/bookings', body, BOOK_API); }
export function listBookings(params = {}) { return http.get('/bookings', params, BOOK_API); }
export function listBookingsDetailed(params = {}) { return http.get('/bookings/details', params, BOOK_API); }
export function deleteBooking(id) {
  return fetch(`${BOOK_API}/bookings/${id}`, { method: 'DELETE' })
    .then(async r => { if (!r.ok) throw new Error(await r.text()); return r.json(); });
}
