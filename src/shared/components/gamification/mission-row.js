import { h } from '../../utils/dom.js';
import { statusBadge } from '../data-table/status-badge.js';
/**
 * Fila de misión. Presentación pura: la vista decide qué hace el botón.
 * @param {{ tipo, titulo, detalle, estado, accion?:{label, variante, onClick}, extra?:string }} d
 */
export const missionRow = d => h('li', { class: ['ms', d.estado === 'Bloqueada' && 'lock'] },
  h('div', { class: 'ms-t' }, h('span', { class: 'chip fit', text: d.tipo }), h('b', { text: d.titulo }), h('small', { class: 'muted', text: d.detalle })),
  statusBadge(d.estado),
  d.accion ? h('button', { class: ['btn', d.accion.variante === 'o' && 'o', 's'], type: 'button', text: d.accion.label, on: { click: d.accion.onClick } })
    : d.extra ? h('span', { class: 'badge', text: d.extra }) : null);
