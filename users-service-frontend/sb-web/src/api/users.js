import { http } from './client';

export function pingUsers() { return http.get('/health'); }
export function getMentors(filters = {}) { return http.get('/mentors', filters); }
export function createUserProfile(payload) { return http.post('/users', payload); }
