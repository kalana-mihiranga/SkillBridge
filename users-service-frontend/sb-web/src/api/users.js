import { http } from './client';
const USERS_API = import.meta.env.VITE_USERS_API || '/users';

export function pingUsers() { return http.get('/health', {}, USERS_API); }
export function getMentors(filters = {}) { return http.get('/mentors', filters, USERS_API); }
export function createUserProfile(payload) { return http.post('/users', payload, USERS_API); }
