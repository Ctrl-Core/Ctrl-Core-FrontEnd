import { h } from '../../utils/dom.js';
import { meterBar } from '../data-table/meter-bar.js';
import { statusBadge } from '../data-table/status-badge.js';
import { xpBadge } from '../gamification/xp-badge.js';

/**
 * Tarjeta de un tablero Kanban (presentacional). Arrastrable (mouse) y con botones ← → (teclado/táctil).
 * @param {object} p
 * @param {string} p.id          identificador (viaja en el arrastre como text/plain)
 * @param {string} p.titulo
 * @param {string} p.empresa     nombre mostrado en el enlace superior
 * @param {string} p.empresaHref hash del enlace (ej. '#/empresas/e101')
 * @param {string} p.meta        línea secundaria (responsable · fecha)
 * @param {number} p.avance      0–100
 * @param {boolean} [p.cerrado]  tarjeta en la columna final: muestra XP en vez de barra
 * @param {number}  [p.xp]
 * @param {boolean} [p.vencido]
 * @param {{label:string,title:string,disabled?:boolean,onClick:Function}|null} p.prev
 * @param {{label:string,title:string,disabled?:boolean,onClick:Function}|null} p.next
 */
export function kanbanCard({ id, titulo, empresa, empresaHref, meta, avance, cerrado = false, xp, vencido = false, prev, next }) {
  const move = (glyph, m) => h('button', { class: 'btn o s', type: 'button', text: glyph, hidden: !m, aria: { label: m?.label, disabled: m?.disabled ? 'true' : null }, title: m?.title,
    on: m ? { click: m.onClick } : undefined });
  const card = h('article', { class: ['kc', vencido && 'venc'], draggable: 'true', dataset: { plan: id } },
    h('div', { class: 'kc-h' },
      h('a', { class: 'kc-emp', href: empresaHref, aria: { label: `Abrir expediente de ${empresa}` }, text: empresa }),
      h('span', {}, vencido ? statusBadge('Vencido') : null)),
    h('p', { class: 'kc-n', text: titulo }),
    h('div', { class: 'meta' }, h('span', { text: meta }), h('b', { text: cerrado ? '' : avance + '%' })),
    cerrado ? xpBadge(xp ?? 300) : meterBar(avance),
    h('div', { class: 'kc-acts' }, move('←', prev), move('→', next)));
  card.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move'; card.classList.add('drag'); });
  card.addEventListener('dragend', () => card.classList.remove('drag'));
  return card;
}
