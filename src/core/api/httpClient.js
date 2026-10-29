/**
 * ADAPTADOR · cliente HTTP sobre fetch (JSON, timeout, errores tipados).
 * Los servicios de dominio dependen de este contrato (http.get/post/…), no de fetch: así el backend se puede simular en pruebas.
 * Seguridad: solo rutas relativas al baseUrl (nunca URLs absolutas arbitrarias), credenciales solo del mismo origen.
 */
import { API_CONFIG } from './apiConfig.js';

export class HttpError extends Error {
  constructor(status, body, url) { super(`HTTP ${status} en ${url}`); this.name = 'HttpError'; this.status = status; this.body = body; this.url = url; }
}

const ABSOLUTE = /^([a-z][a-z0-9+.-]*:|\/\/)/i;

function buildUrl(path, query) {
  if (ABSOLUTE.test(path)) throw new Error('[http] Solo se permiten rutas relativas al baseUrl');
  const url = new URL(API_CONFIG.baseUrl + (path.startsWith('/') ? path : '/' + path), location.origin);
  for (const [k, v] of Object.entries(query ?? {})) if (v != null) url.searchParams.set(k, String(v));
  return url;
}

async function parse(res) {
  if (res.status === 204) return null;
  const type = res.headers.get('content-type') ?? '';
  return type.includes('application/json') ? res.json() : res.text();
}

async function request(method, path, { query, body, headers, signal, timeoutMs = API_CONFIG.timeoutMs } = {}) {
  const url = buildUrl(path, query);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new DOMException('Tiempo de espera agotado', 'TimeoutError')), timeoutMs);
  signal?.addEventListener('abort', () => ctrl.abort(signal.reason), { once: true });
  const hasBody = body !== undefined && body !== null;
  try {
    const res = await fetch(url, {
      method, signal: ctrl.signal, credentials: 'same-origin',
      headers: { ...API_CONFIG.defaultHeaders, ...(hasBody ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: hasBody ? JSON.stringify(body) : undefined
    });
    const data = await parse(res);
    if (!res.ok) throw new HttpError(res.status, data, url.pathname);
    return data;
  } finally { clearTimeout(timer); }
}

export const http = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, body, opts) => request('POST', path, { ...opts, body }),
  put: (path, body, opts) => request('PUT', path, { ...opts, body }),
  patch: (path, body, opts) => request('PATCH', path, { ...opts, body }),
  delete: (path, opts) => request('DELETE', path, opts)
};
