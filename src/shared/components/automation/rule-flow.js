import { h } from '../../utils/dom.js';
import { icon } from '../../utils/icons.js';
import { statusBadge } from '../data-table/status-badge.js';

/** Nodo del lienzo CUANDO → SI → ENTONCES. tag: nodo (badge/enlace) con la fuente del dato. */
export const flowNode = (k, titulo, tag, fin = false) =>
  h('div', { class: fin ? 'nodo fin' : 'nodo', role: 'listitem' }, h('span', { class: 'nodo-k', text: k }), h('b', { class: 'nodo-t', text: titulo }), tag);

export const flowArrow = () => h('div', { class: 'flow-arrow', aria: { hidden: 'true' } }, icon('arrow', 18));

/** Fila de la vista previa: a quién dispararía la regla. omitido: motivo (se marca como advertencia). */
export const dispatchRow = ({ empresa, detalle, cuando, omitido }) =>
  h('li', { class: 'disp' }, h('b', { text: empresa }), h('span', { class: 'muted', text: detalle }), h('span', { class: ['badge', omitido && 'warn'], text: omitido ?? cuando }));

/** Ítem de la lista "Mis reglas" (botón seleccionable). */
export const ruleItem = ({ id, nombre, estado, selected, onSelect }) =>
  h('li', {}, h('button', { type: 'button', class: 'regla', dataset: { id }, aria: { pressed: selected }, on: { click: onSelect } },
    h('span', { class: 'regla-n', text: nombre }), h('span', {}, statusBadge(estado))));
