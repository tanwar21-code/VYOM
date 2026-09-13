/**
 * Application environment configuration.
 * Reads VITE_API_BASE_URL from import.meta.env with fallback to localhost:8000.
 */
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000';
