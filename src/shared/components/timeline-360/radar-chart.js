import { h, svg } from '../../utils/dom.js';
import { meterBar } from '../data-table/meter-bar.js';

/* Geometría del radar (viewBox 300×264) */
const CX = 150, CY = 132, R = 86;

/**
 * Radar de capacidades en SVG (createElementNS). areas: [{ id, nombre }]; inicial/actual: { [areaId]: 0–100 }.
 * Incluye aria-label con todos los valores: el gráfico no depende solo del color ni de la forma.
 */
export function radarChart(areas, inicial, actual) {
  const ang = i => -Math.PI / 2 + i * 2 * Math.PI / areas.length;
  const pt = (i, v) => [CX + R * v / 100 * Math.cos(ang(i)), CY + R * v / 100 * Math.sin(ang(i))];
  const poly = vals => areas.map((a, i) => pt(i, vals[a.id]).map(n => n.toFixed(1)).join(',')).join(' ');
  const desc = areas.map(a => `${a.nombre} ${actual[a.id]}% (inicial ${inicial[a.id]}%)`).join(', ');
  const grid = [33, 66, 100].map(p => svg('polygon', { class: 'rd-grid', points: poly(Object.fromEntries(areas.map(a => [a.id, p]))) }));
  const ejes = areas.map((a, i) => { const [x, y] = pt(i, 100); return svg('line', { class: 'rd-grid', x1: CX, y1: CY, x2: x.toFixed(1), y2: y.toFixed(1) }); });
  const etiq = areas.map((a, i) => { const [x, y] = pt(i, 122), c = Math.cos(ang(i));
    return svg('text', { class: 'rd-lbl', x: x.toFixed(1), y: (y + 4).toFixed(1), 'text-anchor': c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle' }, a.nombre); });
  return svg('svg', { class: 'radar', viewBox: '-24 0 348 264', role: 'img', 'aria-label': `Radar de capacidades. ${desc}.` },
    ...grid, ...ejes, svg('polygon', { class: 'rd-ini', points: poly(inicial) }), svg('polygon', { class: 'rd-act', points: poly(actual) }), ...etiq);
}

/** Leyenda Inicial / Actual del radar */
export const radarLegend = () => h('div', { class: 'rd-leg' }, h('span', {}, h('i', { class: 'lg lg-ini' }), 'Inicial'), h('span', {}, h('i', { class: 'lg lg-act' }), 'Actual'));

/** Lista de áreas con avance y variación (alternativa textual al gráfico) */
export const areaList = (areas, inicial, actual) => h('ul', { class: 'areas', aria: { label: 'Detalle por área' } }, areas.map(a => {
  const d = actual[a.id] - inicial[a.id];
  return h('li', { class: 'area' }, h('span', { class: 'area-n', text: a.nombre }), meterBar(actual[a.id]), h('b', { text: actual[a.id] + '%' }),
    h('small', { class: 'area-d', text: d ? `${d > 0 ? '+' : ''}${d} pts` : 'sin cambio' }));
}));
