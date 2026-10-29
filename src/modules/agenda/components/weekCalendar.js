import { h } from '../../../shared/utils/dom.js';
import { addDias, DIAS, diaMes, hora12 } from '../../../shared/utils/dates.js';

/**
 * Calendario semanal (lunes a viernes). items: { fecha, hora, titulo, sub, tono: 'g'|'s'|'w'|'x'|'o', onClick?, pressed? }.
 * Devuelve el nodo de la rejilla; la navegación de semanas la pinta cada vista.
 */
export function semanaNode(lunes, items, etiqueta){
  const dias = DIAS.map((d, i) => {
    const fecha = addDias(lunes, i);
    const lista = items.filter(it => it.fecha === fecha).sort((a, b) => a.hora.localeCompare(b.hora));
    return h('div', { class: 'day', role: 'group', aria: { label: `${d} ${diaMes(fecha)}` } },
      h('div', { class: 'dayh', text: `${d} · ${diaMes(fecha)}` }),
      lista.length ? lista.map(it => {
        const cuerpo = [h('b', { text: `${hora12(it.hora)} · ${it.titulo}` }), it.sub ? h('span', { text: it.sub }) : null];
        return it.onClick
          ? h('button', { class: ['ev', it.tono], type: 'button', aria: { pressed: !!it.pressed }, dataset: { id: it.id }, on: { click: it.onClick } }, cuerpo)
          : h('div', { class: ['ev', it.tono] }, cuerpo);
      }) : h('p', { class: 'dayempty', text: 'Sin actividades' }));
  });
  return h('div', { class: 'wk', role: 'group', aria: { label: etiqueta } }, dias);
}
/** Cabecera con navegación de semana */
export const navSemana = (titulo, id, onPrev, onNext) => h('div', { class: 'h' },
  h('h2', { id, style: { font: 'inherit', margin: '0' }, text: titulo }),
  h('div', { class: 'row' },
    h('button', { class: 'icon-btn', type: 'button', aria: { label: 'Semana anterior' }, text: '‹', on: { click: onPrev } }),
    h('button', { class: 'icon-btn', type: 'button', aria: { label: 'Semana siguiente' }, text: '›', on: { click: onNext } })));
