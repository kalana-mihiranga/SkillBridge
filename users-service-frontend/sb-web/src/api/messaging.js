import { http } from './client';
const MSG_API = import.meta.env.VITE_MSG_API || '/api/messaging';

export function ensureThread(bookingId) { return http.post('/threads', { bookingId }, MSG_API); }
export function getThreadByBooking(bookingId) { return http.get(`/threads/by-booking/${bookingId}`, {}, MSG_API); }
export function listMessages(threadId) { return http.get(`/threads/${threadId}/messages`, {}, MSG_API); }
export function sendMessage(threadId, payload) { return http.post(`/threads/${threadId}/messages`, payload, MSG_API); }
