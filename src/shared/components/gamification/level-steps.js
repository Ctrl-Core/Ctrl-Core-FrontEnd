import { h } from '../../utils/dom.js';
import { icon } from '../../utils/icons.js';
/** Escalera de niveles. items: [{ n, estado: 'hecho' | 'actual' | 'pendiente' }]. Presentación pura. */
export const levelSteps = items => h('ol', { class: 'lv-steps', aria: { label: 'Niveles' } }, items.map(it =>
  h('li', { class: ['lv', it.estado], aria: { current: it.estado === 'actual' ? 'step' : null } },
    h('i', {}, it.estado === 'hecho' ? icon('tick', 14) : String(it.n)), `Nivel ${it.n}${it.estado === 'actual' ? ' · actual' : ''}`)));
