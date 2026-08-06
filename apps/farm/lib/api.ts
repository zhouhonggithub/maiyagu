/**
 * Farm API client configuration
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

/**
 * Get authorization headers with the current farm user token
 */
export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};

  const token = localStorage.getItem('farm_token');
  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Authenticated fetch wrapper for the farm API
 */
export async function apiFetch<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}
