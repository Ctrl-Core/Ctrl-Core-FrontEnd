/* Nombre fijado por el árbol de arquitectura. Hoy genera el QR de DEMOSTRACIÓN (SVG) del check-in; el escaneo simulado vive en services/agenda.js (simularCheckin). */
import { svg } from '../../../shared/utils/dom.js';
/**
 * QR de DEMOSTRACIÓN: patrón determinista (21×21 con tres marcas de esquina) derivado del id del evento.
 * No codifica datos reales; en producción se reemplaza por un generador de QR con el enlace de check-in.
 */
export function qrDemo(seed, size = 132){
  let s = 2166136261; for (const ch of String(seed)) { s ^= ch.charCodeAt(0); s = Math.imul(s, 16777619); }
  const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  const N = 21, finder = (x, y) => (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
  let d = '';
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!finder(x, y) && rnd() > 0.52) d += `M${x} ${y}h1v1h-1z`;
  const marca = (x, y) => [svg('rect', { x, y, width: 7, height: 7, fill: 'var(--verde-oscuro)' }), svg('rect', { x: x + 1, y: y + 1, width: 5, height: 5, fill: '#fff' }), svg('rect', { x: x + 2, y: y + 2, width: 3, height: 3, fill: 'var(--verde-oscuro)' })];
  return svg('svg', { viewBox: '0 0 21 21', width: size, height: size, role: 'img', 'aria-label': 'Código QR de demostración del evento', 'shape-rendering': 'crispEdges' },
    svg('rect', { width: 21, height: 21, fill: '#fff' }), svg('path', { d, fill: 'var(--verde-oscuro)' }), ...marca(0, 0), ...marca(14, 0), ...marca(0, 14));
}
