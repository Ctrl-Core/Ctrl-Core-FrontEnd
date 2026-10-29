import { h } from '../../utils/dom.js';
/** Barra de progreso decorativa (el valor numérico lo acompaña siempre en texto). pct: 0–100, admite decimales. */
export const meterBar = pct => h('span', { class: 'bar' }, h('i', { style: { width: `${Math.max(0, Math.min(100, +Number(pct).toFixed(1)))}%` } }));
