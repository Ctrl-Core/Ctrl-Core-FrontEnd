import { h } from '../../utils/dom.js';
/**
 * Tabla semántica accesible. columns: ['Persona', 'Empresa', …]; rows: arreglo de filas, cada fila un arreglo de celdas
 * (texto o nodos). La primera celda es el encabezado de fila (<th scope="row">).
 */
export const simpleTable = (columns, rows) => h('div', { class: 'tw' },
  h('table', { class: 'tbl' },
    h('thead', {}, h('tr', {}, columns.map(c => h('th', { scope: 'col', text: c })))),
    h('tbody', {}, rows.map(([first, ...rest]) => h('tr', {}, h('th', { scope: 'row' }, first), rest.map(c => h('td', {}, c)))))));
