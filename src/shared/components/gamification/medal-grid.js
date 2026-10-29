import { h } from '../../utils/dom.js';
import { icon } from '../../utils/icons.js';
/** Cuadrícula de medallas. items: [{ nombre, icono, ganada }]. El estado se dice con texto ("bloqueada"), no solo con color. */
export const medalGrid = items => h('ul', { class: 'medallas' }, items.map(m =>
  h('li', { class: ['md', !m.ganada && 'off'] }, h('i', {}, icon(m.ganada ? m.icono : 'lock', 20)), m.nombre, m.ganada ? null : h('small', { text: 'bloqueada' }))));
