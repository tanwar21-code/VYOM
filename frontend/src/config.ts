/**
 * Application environment configuration.
 * Reads VITE_API_BASE_URL from import.meta.env with fallback to Render backend.
 */
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string) || 'https://vyom-1.onrender.com';
