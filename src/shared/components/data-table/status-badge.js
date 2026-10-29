import { h } from '../../utils/dom.js';
const MAP = { 'Pendiente':'sp','En ejecución':'se','En validación CDE':'sv','Completado con impacto':'sc','Vencido':'sx','Borrador':'sg','Activo':'sc','Pausado':'sp','Confirmada':'se','Realizada':'sc','Cancelada':'sg','Por revisar':'sp','Fusionado':'sc','Descartado':'sg','Disponible':'se','En progreso':'sp','Completada':'sc','Bloqueada':'sg','Inscrito':'se','Asistió':'sc','No asistió':'sx','Completa':'sc','Incompleta':'sg','Activa':'sc' };
/** Píldora de estado (devuelve un nodo <span>). El color nunca es la única señal: siempre lleva el texto del estado. */
export const statusBadge = s => h('span', { class: 'st st-' + (MAP[s] || 'sp'), text: s });
