/**
 * Admin API configuration
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

/**
 * Get authorization headers with the current admin token
 */
export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};

  const token = localStorage.getItem('admin_token');
  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Authenticated fetch wrapper
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers,
  };

  return fetch(url, { ...options, headers });
}
