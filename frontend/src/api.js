/**
 * API base URL, derived from the Vite `base` so the subpath lives in exactly
 * one place (frontend/vite.config.js).
 *
 *   npm run dev    BASE_URL = "/"               -> API_BASE = "/api"
 *   vite build     BASE_URL = "/tc_compliance/" -> API_BASE = "/tc_compliance/api"
 *
 * Both are same-origin relative URLs, so nothing here hardcodes a scheme,
 * host or port. In dev, "/api" is proxied to http://localhost:8000 by the
 * server.proxy block in vite.config.js; in production nginx strips the
 * /tc_compliance prefix and FastAPI sees "/api/..." either way.
 *
 * Set VITE_API_BASE to override (e.g. pointing a local `npm run dev` at a
 * deployed backend). It wins over the derived value when non-empty.
 */
const derived = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api`;

export const API_BASE = import.meta.env.VITE_API_BASE || derived;

/** Join a route onto the API base: apiUrl("/standards/list"). */
export function apiUrl(path) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}
