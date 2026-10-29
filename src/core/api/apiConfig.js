/**
 * ADAPTADOR · configuración de los clientes HTTP (contrato de integración v1).
 * - baseUrl   : API Core (Node.js).  - aiBaseUrl : API de IA (FastAPI).
 * Los dos orígenes están permitidos en `connect-src` de index.html. Si cambian, actualizar ambos sitios.
 * Con un proxy en el mismo origen, poner aquí '/api/v1' y '/api/ai' y quitar los orígenes del CSP.
 * Autenticación: si hay token en el store se envía `Authorization: Bearer`; si no, `x-tenant-id` (modo desarrollo del contrato).
 */
export const API_CONFIG = Object.freeze({
  baseUrl: 'http://localhost:3000/api/v1',
  aiBaseUrl: 'http://localhost:8000/api/ai',
  tenantId: '1',
  timeoutMs: 10_000,
  defaultHeaders: Object.freeze({ Accept: 'application/json', 'Content-Type': 'application/json' })
});
