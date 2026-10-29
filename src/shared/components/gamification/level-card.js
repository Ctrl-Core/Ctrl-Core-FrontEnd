import { DIAS_RACHA } from '../../../core/db/data.js';
import { fmt } from '../../utils/text.js';
import { h } from '../../utils/dom.js';
import { meterBar } from '../data-table/meter-bar.js';

/** Anillo de nivel (conic-gradient controlado con la variable CSS --p). Presentación pura: recibe números ya calculados. */
export const levelRing = (n, pct) => h('div', { class: 'anillo', role: 'img', aria: { label: `Nivel ${n}: ${pct}% hacia el siguiente` }, style: { '--p': String(pct) } },
  h('div', {}, h('b', { text: String(n) }), h('span', { text: 'NIVEL' })));
/** Racha de la semana (L M X J V S D) */
export const streakDays = (dias, racha) => h('div', { class: 'racha' },
  h('div', { class: 'dias', role: 'img', aria: { label: `Racha de ${racha} días` } }, DIAS_RACHA.map((d, i) => h('i', { class: dias[i] ? 'on' : '', text: d }))),
  h('small', { class: 'muted', text: `Racha · ${racha} días` }));
const stat = (v, l) => h('div', { class: 'stat' }, h('b', { text: v }), h('span', { text: l }));

/**
 * Tarjeta de nivel reutilizable (Mi empresa y Academia). Sin lógica de negocio:
 * @param {{ nivel:{n,nombre,pct,siguiente,faltan,nivelSig}, xp:number, xpSemana:number, racha:number, dias:number[], medallas:{ganadas:number,total:number} }} d
 */
export function levelCard(d){
  const { nivel: lv } = d;
  return h('section', { class: 'card nivel', aria: { labelledby: 'nv-t' } },
    levelRing(lv.n, lv.pct),
    h('div', { class: 'nv-info' },
      h('small', { class: 'kicker', text: 'TU NIVEL' }), h('h2', { id: 'nv-t', text: lv.nombre }),
      h('div', { class: 'meter' }, meterBar(lv.pct), h('b', { text: lv.pct + '%' })),
      h('p', { class: 'nv-xp' }, h('b', { text: fmt(d.xp) }), lv.siguiente ? ` / ${fmt(lv.siguiente)} XP · faltan ${fmt(lv.faltan)} para el Nivel ${lv.nivelSig}` : ' XP · nivel máximo')),
    h('div', { class: 'nv-stats' }, streakDays(d.dias, d.racha), stat('+' + fmt(d.xpSemana), 'XP esta semana'), stat(`${d.medallas.ganadas} / ${d.medallas.total}`, 'Medallas')));
}
