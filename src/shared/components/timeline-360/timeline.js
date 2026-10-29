import { h } from '../../utils/dom.js';
/**
 * Línea de tiempo 360°. items: [{ titulo, detalle, fecha, tipo }] ya ordenados; formatDate(fecha) → texto.
 * Presentacional: no conoce el dominio (el módulo de empresas decide qué hitos mostrar).
 */
export const timeline = (items, formatDate = f => f) => h('ol', { class: 'tls' }, items.map(t =>
  h('li', { class: 'tl' },
    h('span', { class: 'tl-dot', aria: { hidden: 'true' } }),
    h('div', { class: 'tl-b' }, h('b', { text: t.titulo }), h('p', { class: 'muted', text: `${formatDate(t.fecha)} · ${t.detalle}` })),
    h('span', { class: 'badge', text: t.tipo }))));
