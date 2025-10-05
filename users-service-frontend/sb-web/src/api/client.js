const USERS_API = import.meta.env.VITE_USERS_API || '/api/users';

export const http = {
  async get(url, params = {}, base = USERS_API) {
    const qs = new URLSearchParams(params).toString();
    const resp = await fetch(`${base}${url}${qs ? `?${qs}` : ''}`);
    if (!resp.ok) throw new Error(await resp.text());
    return resp.json();
  },
  async post(url, body, base = USERS_API) {
    const resp = await fetch(`${base}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    if (!resp.ok) throw new Error(await resp.text());
    return resp.json();
  },
  async patch(url, body, base = USERS_API) {
    const resp = await fetch(`${base}${url}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    if (!resp.ok) throw new Error(await resp.text());
    return resp.json();
  }
};
