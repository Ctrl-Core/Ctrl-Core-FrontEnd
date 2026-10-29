/**
 * ADAPTADOR · configuración del cliente HTTP.
 * baseUrl vacío = mismo origen (compatible con la CSP `connect-src 'self'` de index.html).
 * Si el backend vive en otro dominio, ponerlo aquí Y agregar ese origen a `connect-src` en index.html.
 */
export const API_CONFIG = Object.freeze({
  baseUrl: '',
  timeoutMs: 10_000,
  defaultHeaders: Object.freeze({ Accept: 'application/json' })
});
