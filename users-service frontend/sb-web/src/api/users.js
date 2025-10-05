import { http } from './client';

// health check (good connectivity test)
export function pingUsers() {
  return http.get('/health');
}

// GET /mentors with optional filters
export function getMentors(filters = {}) {
  return http.get('/mentors', filters);
}

// POST /users to create a profile
export function createUserProfile(payload) {
  return http.post('/users', payload);
}
