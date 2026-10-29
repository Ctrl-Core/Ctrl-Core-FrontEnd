import { CdeView } from '../../../shared/components/cde-view.js';
import { statusBadge } from '../../../shared/components/data-table/status-badge.js';
import { meterBar } from '../../../shared/components/data-table/meter-bar.js';
import { timeline } from '../../../shared/components/timeline-360/timeline.js';
import { radarChart, radarLegend, areaList } from '../../../shared/components/timeline-360/radar-chart.js';
import { DIRECTORIO, SECTORES, AREAS, TIPOS_EVENTO, ROLES } from '../../../core/db/data.js';
import { store } from '../../../core/db/store.js';
import { go } from '../../../core/router/vanillaRouter.js';
import { icon } from '../../../shared/utils/icons.js';
import { h, toast } from '../../../shared/utils/dom.js';
import { hidratarEmpresas, hidratarExpediente, nombreSector } from '../../../core/api/contrato.js';
import { getExpediente, aplicarDiagnostico, editarFicha, sintesis, fechaCorta } from '../services/expedientes.js';

/**
 * P5 · Expediente 360° (compartida Director / Docente).
 * Reglas de negocio: el Docente aplica diagnósticos (actualizan el radar y la línea de tiempo); el Director edita la ficha;
 * ambos pueden filtrar la línea de tiempo y generar la síntesis. El Emprendedor no accede (guarda de ruta).
 */
export class Dossier360View extends CdeView {
  tipo = 'Todo';
  sint = null;        // null | 'cargando' | string[]
  get role(){ return store.get().role; }
  get esDocente(){ return this.role === 'doc'; }
  get esDirector(){ return this.role === 'dir'; }

  bind(){ this.resolver(); }
  async load(){ await hidratarEmpresas(); await hidratarExpediente(this.params.id); }
  loaded(){ this.cargado = true; this.resolver(); }
  resolver(){
    this.empresa = DIRECTORIO.find(e => e.id === this.params.id) ?? null;
    this.exp = this.empresa ? getExpediente(this.empresa.id) : null;
    if (this.route && this.empresa) this.route.label = this.empresa.nombre;   // el shell lo muestra en las migas
  }
  cleanup(){ clearTimeout(this._t); }

  /* ---------- Estados alternos ---------- */
  aviso(titulo, texto, label, destino){
    return h('div', { class: 'exp' }, h('section', { class: 'card dir-empty' },
      h('h1', { text: titulo }), h('p', { text: texto }),
      h('button', { class: 'btn', type: 'button', text: label, on: { click: () => go(destino) } })));
  }

  /* ---------- Bloques ---------- */
  iniciales(n){ return n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join(''); }
  ficha(){
    const e = this.empresa, x = this.exp, sector = nombreSector(e.sectorId);
    const kv = (k, v) => h('div', { class: 'kv' }, h('span', { text: k }), h('b', { text: v }));
    return h('section', { class: 'card exp-ficha', aria: { label: 'Ficha de la empresa' } },
      h('div', { class: 'exp-id' },
        h('span', { class: 'exp-av', aria: { hidden: 'true' }, text: this.iniciales(e.nombre) }),
        h('h2', { text: e.nombre }), h('p', { class: 'muted', text: `${sector} · ${x.ciudad}` }),
        h('div', { class: 'chips exp-chips' }, e.unab ? h('span', { class: 'badge', text: 'Comunidad UNAB' }) : null, statusBadge(e.estado))),
      h('div', { class: 'kvs' }, kv('Contacto', x.contacto), kv('Empleados', String(x.empleados)), kv('Ficha completa', e.salud + '%')),
      h('button', { class: 'btn o block', type: 'button', text: 'Ver planes en el Kanban', on: { click: () => go('/intervenciones', { empresa: e.id }) } }));
  }
  linea(){
    const items = this.exp.linea.filter(t => this.tipo === 'Todo' || t.tipo === this.tipo);
    const chips = ['Todo', ...TIPOS_EVENTO].map(t => h('button', { class: 'chip', type: 'button', text: t, dataset: { tipo: t }, aria: { pressed: this.tipo === t },
      on: { click: () => { this.tipo = t; this.update(); this.focusBy('tipo', t); } } }));
    const lista = items.length
      ? timeline(items, fechaCorta)
      : h('p', { class: 'muted', text: 'No hay hitos de este tipo todavía.' });
    return h('section', { class: 'card exp-linea', aria: { labelledby: 'tl-t' } },
      h('div', { class: 'h' }, h('h2', { id: 'tl-t', style: { font: 'inherit', margin: '0' }, text: 'Línea de tiempo 360°' }),
        h('button', { class: this.esDirector ? 'btn' : 'btn o', type: 'button', disabled: this.sint === 'cargando' ? '' : null, aria: { busy: this.sint === 'cargando' ? 'true' : null }, on: { click: () => this.generar() } },
          icon('sparkles', 16), ' Generar síntesis con IA')),
      this.sintNode(), h('div', { class: 'chips', role: 'group', aria: { label: 'Filtrar por tipo' } }, chips), lista);
  }
  sintNode(){
    if (!this.sint) return null;
    if (this.sint === 'cargando') return h('div', { class: 'sint', aria: { busy: 'true' } }, h('div', { class: 'sk' }), h('div', { class: 'sk', style: { width: '70%' } }));
    return h('div', { class: 'sint', role: 'status' }, h('b', { text: 'Síntesis del expediente' }),
      h('ul', {}, this.sint.map(l => h('li', { text: l }))), h('small', { class: 'muted', text: 'Calculada con los datos de este expediente (demostración, sin servicio externo).' }));
  }
  generar(){
    if (this.sint === 'cargando') return;
    this.sint = 'cargando'; this.update();
    this._t = setTimeout(() => { this.sint = sintesis(this.exp); if (this.isConnected){ this.update(); this.querySelector('.sint')?.scrollIntoView({ block: 'nearest' }); } }, 700);
  }
  /** Fila de plan (nombre, estado y avance) */
  planRow(p){
    return h('li', { class: 'plan' }, h('div', { class: 'plan-h' }, h('b', { text: p.nombre }), h('span', {}, statusBadge(p.estado))),
      h('div', { class: 'meter' }, meterBar(p.avance), h('b', { text: p.avance + '%' })));
  }
  radar(){
    const { inicial, actual } = this.exp.radar;
    return h('section', { class: 'card exp-radar', aria: { labelledby: 'rd-t' } },
      h('div', { class: 'h' }, h('h2', { id: 'rd-t', style: { font: 'inherit', margin: '0' }, text: 'Radar de capacidades' })),
      radarChart(AREAS, inicial, actual), radarLegend(), areaList(AREAS, inicial, actual),
      h('h3', { class: 'exp-sub', text: 'Planes de acción' }),
      this.exp.planes.length ? h('ul', { class: 'plans' }, this.exp.planes.map(p => this.planRow(p)))
        : h('p', { class: 'muted small', text: 'Esta empresa aún no tiene planes de acción.' }));
  }

  /* ---------- Diálogos (se crean con h() y se retiran al cerrar) ---------- */
  dlgDiagnostico(opener){
    if (!this.esDocente) return toast('Solo el Docente aplica diagnósticos');
    const vals = { ...this.exp.radar.actual }, outs = {};
    const campos = AREAS.map(a => { const id = 'dg-' + a.id, out = h('output', { for: id, text: vals[a.id] + '%' }); outs[a.id] = out;
      return h('div', { class: 'dg-row' }, h('label', { for: id, text: a.nombre }),
        h('input', { id, type: 'range', min: '0', max: '100', step: '5', value: vals[a.id], on: { input: e => { vals[a.id] = +e.target.value; out.textContent = vals[a.id] + '%'; } } }), out); });
    this.dialog('Aplicar diagnóstico', [h('p', { class: 'muted small', text: 'Ajusta el nivel actual de cada área (0–100%). Se actualizará el radar y se registrará un hito en la línea de tiempo.' }), ...campos], () => {
      const r = aplicarDiagnostico(this.empresa.id, vals, ROLES[this.role].label);
      if (!r.ok) return r.error;
      this.exp = getExpediente(this.empresa.id); this.sint = null; this.update(); toast('Diagnóstico registrado'); return null;
    }, opener);
  }
  dlgFicha(opener){
    if (!this.esDirector) return toast('Solo el Director edita la ficha');
    const c = h('input', { id: 'f-contacto', class: 'field', type: 'text', maxlength: '80', autocomplete: 'off', value: this.exp.contacto });
    const n = h('input', { id: 'f-emp', class: 'field', type: 'number', min: '0', max: '10000', step: '1', inputmode: 'numeric', value: this.exp.empleados });
    this.dialog('Editar ficha', [
      h('div', { class: 'fld' }, h('label', { for: 'f-contacto', text: 'Contacto' }), c),
      h('div', { class: 'fld' }, h('label', { for: 'f-emp', text: 'Empleados' }), n)], () => {
      const r = editarFicha(this.empresa.id, { contacto: c.value, empleados: n.value });
      if (!r.ok) return r.error;
      this.exp = getExpediente(this.empresa.id); this.update(); toast('Ficha actualizada'); return null;
    }, opener);
  }

  render(){
    if (!this.cargado && (!this.empresa || !this.exp)) return h('p', { class: 'muted', role: 'status', text: 'Cargando expediente…' });
    if (!this.empresa || !this.exp){
      const dup = this.empresa?.dupDe && DIRECTORIO.find(e => e.id === this.empresa.dupDe);
      return dup
        ? this.aviso('Ficha duplicada', `“${this.empresa.nombre}” es un posible duplicado de “${dup.nombre}”. Revisa la ficha principal.`, `Abrir ${dup.nombre}`, '/empresas/' + dup.id)
        : this.aviso('Empresa no encontrada', 'No existe un expediente con ese identificador.', 'Volver al directorio', '/empresas');
    }
    if ((store.get().fusionadas ?? []).includes(this.empresa.id)) return this.aviso('Ficha fusionada', 'Esta ficha se fusionó con otra y ya no está disponible.', 'Volver al directorio', '/empresas');
    return h('div', { class: 'exp' },
      h('header', { class: 'page-h' },
        h('div', {}, h('h1', { text: 'Expediente 360°' }), h('p', { text: `${this.empresa.nombre} · Periodo ${this.exp.periodo}` })),
        this.esDirector ? h('button', { class: 'btn o', type: 'button', text: 'Editar ficha', on: { click: e => this.dlgFicha(e.currentTarget) } })
          : this.esDocente ? h('button', { class: 'btn', type: 'button', text: 'Aplicar diagnóstico', on: { click: e => this.dlgDiagnostico(e.currentTarget) } }) : null),
      h('div', { class: 'exp-grid' }, this.ficha(), this.linea(), this.radar()));
  }
}
