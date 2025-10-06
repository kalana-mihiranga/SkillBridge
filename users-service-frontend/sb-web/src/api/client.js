const defaultHeaders = { 'Content-Type': 'application/json' };

export const http = {
  async get(path, params = {}, base) {
    const qs = new URLSearchParams(params).toString();
    const url = `${base}${path}${qs ? `?${qs}` : ''}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(await r.text());
    // some endpoints return plain text (health), handle that
    const ct = r.headers.get('content-type') || '';
    return ct.includes('application/json') ? r.json() : r.text();
  },
  async post(path, body, base) {
    const r = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify(body || {})
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async patch(path, body, base) {
    const r = await fetch(`${base}${path}`, {
      method: 'PATCH',
      headers: defaultHeaders,
      body: JSON.stringify(body || {})
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }
};
