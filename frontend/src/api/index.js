const BASE = 'http://127.0.0.1:8000'

export const authApi = {
  login: (username_email, password) =>
    fetch(`${BASE}/api/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username_email, password }),
    }).then(r => r.json()),

  register: (username, email, password) =>
    fetch(`${BASE}/api/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    }).then(r => r.json()),

  logout: (token) =>
    fetch(`${BASE}/api/auth/logout/`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    }),
}
