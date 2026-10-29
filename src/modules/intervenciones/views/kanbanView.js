import { CdeView } from '../../../shared/components/cde-view.js';
import { kanbanCard } from '../../../shared/components/kanban-board/kanban-card.js';
import { kanbanColumn } from '../../../shared/components/kanban-board/kanban-column.js';
import { xpText } from '../../../shared/components/gamification/xp-badge.js';
import { COLUMNAS, DIRECTORIO, RESPONSABLES, USUARIO_DOCENTE, HOY } from '../../../core/db/data.js';
import { store } from '../../../core/db/store.js';
import { icon } from '../../../shared/utils/icons.js';
import { diaMes } from '../../../shared/utils/dates.js';
import { h, toast } from '../../../shared/utils/dom.js';
import { getPlanes, estaVencido, mover, crear, puedeMover } from '../services/planes.js';

const CLASE_COL = { 'Pendiente': 'p-gray', 'En ejecución': 'p-g', 'En validación CDE': 'p-ol', 'Completado con impacto': 'p-s' };
const nombreEmp = id => DIRECTORIO.find(e => e.id === id)?.nombre ?? 'Empresa';

/**
 * P6 · Planes de acción (Tablero Kanban). Pantalla principal del Docente; el Director llega desde "Ver planes vencidos".
 * Mover tarjetas: arrastrar y soltar (mouse) o botones anterior/siguiente (teclado y táctil). Reglas en services/planes.js.
 */
export class KanbanView extends CdeView {
  filtro = 'todos';     // 'todos' | 'vencidos' | 'mios'
  empresa = null;       // id de empresa (viene de /intervenciones?empresa=e101)
  get role(){ return store.get().role; }
  get esDocente(){ return this.role === 'doc'; }

  bind(){
    const q = this.q;
    this.filtro = q.filtro === 'vencidos' ? 'vencidos' : q.filtro === 'mios' && this.esDocente ? 'mios' : 'todos';
    this.empresa = DIRECTORIO.some(e => e.id === q.empresa) ? q.empresa : null;
    this._off.push(store.subscribe(() => { if (this.isConnected) this.update(); }));
  }
  visibles(){
    return getPlanes().filter(p => (!this.empresa || p.empresaId === this.empresa)
      && (this.filtro === 'todos' || (this.filtro === 'vencidos' ? estaVencido(p) : p.resp === USUARIO_DOCENTE)));
  }

  /* ---------- Movimiento ---------- */
  mover(plan, destino){
    const r = mover(plan.id, destino, this.role);
    if (!r.ok){ if (r.motivo) toast(r.motivo); return; }
    toast(destino === COLUMNAS[3] ? `“${plan.nombre}” completado con impacto · ${xpText(r.plan.xp)}` : `“${plan.nombre}” → ${destino}`);
    this.update(); this.focusBy('plan', plan.id);
  }

  /* ---------- Nodos ---------- */
  tarjeta(p){
    const i = COLUMNAS.indexOf(p.estado), nombre = nombreEmp(p.empresaId);
    const nav = dest => {
      if (!dest) return null;
      const ok = puedeMover(p, dest, this.role).ok;
      return { label: `Mover ${p.nombre} a ${dest}`, title: ok ? `Mover a ${dest}` : 'Solo el Director valida y cierra planes con impacto', disabled: !ok, onClick: () => this.mover(p, dest) };
    };
    return kanbanCard({ id: p.id, titulo: p.nombre, empresa: nombre, empresaHref: '#/empresas/' + p.empresaId, meta: `${p.resp} · ${diaMes(p.fecha)}`,
      avance: p.avance, cerrado: p.estado === COLUMNAS[3], xp: p.xp, vencido: estaVencido(p), prev: nav(COLUMNAS[i - 1]), next: nav(COLUMNAS[i + 1]) });
  }
  columna(nombre, planes, idx){
    return kanbanColumn({ idx, titulo: nombre, pillClass: CLASE_COL[nombre], cards: planes.map(p => this.tarjeta(p)),
      onDropCard: id => { const plan = getPlanes().find(x => x.id === id); if (plan) this.mover(plan, nombre); } });
  }
  chips(){
    const todos = getPlanes().filter(p => !this.empresa || p.empresaId === this.empresa);
    const venc = todos.filter(estaVencido).length;
    const def = [['todos', 'Todos'], ['vencidos', `Vencidos (${venc})`], ...(this.esDocente ? [['mios', 'Mis planes']] : [])];
    const nodes = def.map(([k, label]) => h('button', { class: 'chip', type: 'button', text: label, dataset: { filtro: k }, aria: { pressed: this.filtro === k },
      on: { click: () => { this.filtro = k; this.update(); this.focusBy('filtro', k); } } }));
    if (this.empresa) nodes.push(h('button', { class: 'chip', type: 'button', aria: { pressed: 'true', label: 'Quitar filtro de empresa' },
      on: { click: () => { this.empresa = null; this.update(); } } }, `Empresa: ${nombreEmp(this.empresa)}`, icon('x', 12)));
    return nodes;
  }

  /* ---------- Nuevo plan ---------- */
  dlgNuevo(opener){
    const emp = h('select', { id: 'np-emp', class: 'field' }, h('option', { value: '', text: 'Selecciona una empresa' }),
      ...DIRECTORIO.filter(e => !e.dupDe).map(e => h('option', { value: e.id, text: e.nombre })));
    if (this.empresa) emp.value = this.empresa;
    const nombre = h('input', { id: 'np-n', class: 'field', type: 'text', maxlength: '60', autocomplete: 'off' });
    const resp = h('select', { id: 'np-r', class: 'field' }, ...RESPONSABLES.map(r => h('option', { value: r, text: r })));
    if (this.esDocente) resp.value = USUARIO_DOCENTE;
    const fecha = h('input', { id: 'np-f', class: 'field', type: 'date', min: HOY });
    const fld = (id, label, el) => h('div', { class: 'fld' }, h('label', { for: id, text: label }), el);
    this.dialog('Nuevo plan de acción', [fld('np-emp', 'Empresa', emp), fld('np-n', 'Nombre del plan', nombre), fld('np-r', 'Responsable', resp), fld('np-f', 'Fecha límite', fecha)], () => {
      const r = crear({ empresaId: emp.value, nombre: nombre.value, resp: resp.value, fecha: fecha.value });
      if (!r.ok) return r.error;
      toast('Plan creado en Pendiente'); return null;   // el store notifica y la vista se repinta
    }, opener);
  }

  render(){
    const vis = this.visibles();
    const hayVencidos = getPlanes().some(estaVencido);
    return h('div', { class: 'kanban' },
      h('header', { class: 'page-h' },
        h('div', {}, h('h1', { text: 'Planes de acción' }), h('p', { text: 'Tablero Kanban · 2026-2' })),
        h('button', { class: 'btn', type: 'button', on: { click: e => this.dlgNuevo(e.currentTarget) } }, icon('plus', 16), ' Nuevo plan')),
      h('div', { class: 'chips', role: 'group', aria: { label: 'Filtros' } }, this.chips()),
      this.filtro === 'vencidos' && !vis.length ? h('p', { class: 'muted', role: 'status', text: hayVencidos ? 'Ningún plan vencido con estos filtros.' : 'No hay planes vencidos. ¡Buen trabajo!' }) : null,
      h('p', { class: 'muted small', text: this.esDocente ? 'Arrastra una tarjeta o usa las flechas para moverla. Solo el Director cierra planes con impacto.' : 'Como Director validas el cierre: mueve los planes en validación a “Completado con impacto”.' }),
      h('div', { class: 'kan' }, COLUMNAS.map((c, i) => this.columna(c, vis.filter(p => p.estado === c), i + 1))));
  }
}
