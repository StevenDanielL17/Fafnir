const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function apiFetch(path, options = {}) {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('fafnir_token')
      : null;

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `API error: ${res.status}`);
  }

  return data;
}
