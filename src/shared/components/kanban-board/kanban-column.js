import { h } from '../../utils/dom.js';

/**
 * Columna de un tablero Kanban (zona de soltar). onDropCard(cardId) lo resuelve el módulo de dominio.
 * @param {{ idx:number, titulo:string, pillClass?:string, cards:Node[], onDropCard:(id:string)=>void }} p
 */
export function kanbanColumn({ idx, titulo, pillClass, cards, onDropCard }) {
  const col = h('section', { class: 'kcol', aria: { labelledby: 'k' + idx },
    on: {
      dragover: e => { e.preventDefault(); col.classList.add('over'); },
      dragleave: e => { if (!col.contains(e.relatedTarget)) col.classList.remove('over'); },
      drop: e => { e.preventDefault(); col.classList.remove('over'); const id = e.dataTransfer.getData('text/plain'); if (id) onDropCard(id); }
    } },
    h('div', { class: 'kh' }, h('span', { id: 'k' + idx, text: titulo }), h('span', { class: ['pill', 'nd', pillClass], text: String(cards.length) })),
    cards.length ? cards : h('p', { class: 'kempty muted small', text: 'Sin planes en este estado' }));
  return col;
}
