import { h } from '../utils/dom.js';
const MES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
/** Bloque de fecha (día grande + mes). Presentación pura: recibe 'AAAA-MM-DD'. */
export const dateBadge = fecha => { const [, m, d] = fecha.split('-');
  return h('span', { class: 'fbloque', aria: { hidden: 'true' } }, h('b', { text: String(+d) }), h('small', { text: MES[+m - 1] })); };
