import { CdeView } from '../../../shared/components/cde-view.js';
import { statusBadge } from '../../../shared/components/data-table/status-badge.js';
import { meterBar } from '../../../shared/components/data-table/meter-bar.js';
import { simpleTable } from '../../../shared/components/data-table/simple-table.js';
import { xpText } from '../../../shared/components/gamification/xp-badge.js';
import { DIRECTORIO, SECTORES, HOY } from '../../../core/db/data.js';
import { icon } from '../../../shared/utils/icons.js';
import { addDias, lunesDe, rangoSemana, diaMes } from '../../../shared/utils/dates.js';
import { h, toast } from '../../../shared/utils/dom.js';
import { semanaNode, navSemana } from '../components/weekCalendar.js';
import { qrDemo } from '../services/qrScanner.js';
import { getEventos, getAsistencia, embudo, crearEvento, confirmarEvento, simularCheckin, segmentar } from '../services/agenda.js';
import { getCitas } from '../services/citas.js';

const TONO = { Pendiente: 'w', Confirmada: 'g', Realizada: 's', Cancelada: 'x', Borrador: 'o' };
const nombreEmp = id => DIRECTORIO.find(e => e.id === id)?.nombre ?? '—';
const corto = n => { const p = n.split(' '); return p.length > 1 ? `${p[0]} ${p[1][0]}.` : n; };

/** P7 · Agenda y eventos (Director): embudo, check-in por QR, eventos, asistencia nominal, segmentación y semana. */
export class EventsHubView extends CdeView {
  sel = null;                     // id del evento seleccionado
  ultimo = null;                  // último check-in mostrado en el estado del QR
  seg = { sectorId: 'alimentos', sinAsistencia: true, fichaMin: 70 };
  lista = null;                   // resultado de la segmentación
  semana = null;

  bind(){
    const ev = getEventos();
    this.sel = (ev.find(e => e.estado === 'Confirmada') ?? ev[0])?.id ?? null;
    const futuros = [...getCitas().map(c => c.fecha), ...ev.map(e => e.fecha)].filter(f => f >= HOY).sort();
    this.semana = lunesDe(futuros[0] ?? HOY);
    
  }
  get ev(){ return getEventos().find(e => e.id === this.sel) ?? null; }
  refrescar(){ this.update(); }

  /* ---------- Acciones ---------- */
  checkin(){
    const r = simularCheckin(this.sel);
    if (!r.ok){ this.ultimo = { error: r.motivo }; } else { this.ultimo = { texto: `${corto(r.persona.nombre)} · ${xpText(r.xp)} al instante` }; }
    this.update();
  }
  confirmar(id){ const r = confirmarEvento(id); toast(r.ok ? 'Evento confirmado: ya admite inscripciones y check-in' : r.error); if (r.ok) this.update(); }
  generar(){
    this.lista = segmentar(this.seg); this.update();
    toast(`Lista generada: ${this.lista.length} empresa${this.lista.length === 1 ? '' : 's'}`);
  }
  dlgEvento(opener){
    const n = h('input', { id: 'ne-n', class: 'field', type: 'text', maxlength: '60', autocomplete: 'off' });
    const f = h('input', { id: 'ne-f', class: 'field', type: 'date', min: HOY });
    const hr = h('input', { id: 'ne-h', class: 'field', type: 'time', value: '09:00' });
    const c = h('input', { id: 'ne-c', class: 'field', type: 'number', min: '1', max: '5000', step: '1', inputmode: 'numeric' });
    const fld = (id, l, el) => h('div', { class: 'fld' }, h('label', { for: id, text: l }), el);
    this.dialog('Nuevo evento', [fld('ne-n', 'Nombre', n), fld('ne-f', 'Fecha', f), fld('ne-h', 'Hora', hr), fld('ne-c', 'Personas a convocar', c)], () => {
      const r = crearEvento({ nombre: n.value, fecha: f.value, hora: hr.value, convocados: c.value });
      if (!r.ok) return r.error;
      this.sel = r.id; this.ultimo = null; this.update(); toast('Evento creado en borrador'); return null;
    }, opener);
  }

  /* ---------- Bloques ---------- */
  embudoCard(){
    const ev = this.ev; if (!ev) return h('section', { class: 'card' }, h('p', { class: 'muted', text: 'Aún no hay eventos. Crea el primero con “Nuevo evento”.' }));
    const e = embudo(ev);
    const barra = (cls, w, l, v) => { const b = h('div', { class: ['fb', cls] }, h('span', { text: l }), h('span', { text: String(v) })); b.style.width = w + '%'; return b; };
    return h('section', { class: 'card', aria: { labelledby: 'emb-t' } },
      h('div', { class: 'h' }, h('h2', { id: 'emb-t', style: { font: 'inherit', margin: '0' }, text: `Embudo de conversión · ${ev.nombre}` }), statusBadge(ev.estado)),
      h('div', { class: 'fn' }, barra('fb1', 100, 'Convocados', e.conv), barra('fb2', e.wInsc, 'Inscritos', e.insc), barra('fb3', e.wAsis, 'Asistentes', e.asis)),
      h('p', { class: 'muted fn-p', role: 'status' }, h('b', { text: e.pctConv + '%' }), ' de convocados asistieron · ', h('b', { text: e.pctAsis + '%' }), ' de inscritos'));
  }
  qrCard(){
    const ev = this.ev, ok = ev?.estado === 'Confirmada', u = this.ultimo;
    return h('section', { class: 'card qr-card', aria: { labelledby: 'qr-t' } },
      h('h2', { class: 'h', id: 'qr-t', text: 'Check-in por QR' }),
      h('div', { class: 'qr-box' }, ev ? qrDemo(ev.id) : null),
      h('p', { class: 'muted small', text: 'QR de demostración: en producción lleva al enlace de check-in del evento.' }),
      h('button', { class: 'btn o block', type: 'button', disabled: !ok, text: 'Simular escaneo', on: { click: () => this.checkin() } }),
      ok ? null : h('p', { class: 'muted small', text: 'Confirma el evento para habilitar el check-in.' }),
      h('div', { class: ['qr-st', u?.error && 'err'], role: 'status', aria: { live: 'polite' } }, u ? [icon(u.error ? 'alert' : 'tick', 16), ' ', u.error ?? u.texto] : null));
  }
  eventosCard(){
    const items = getEventos().map(ev => {
      const e = embudo(ev);
      return h('li', { class: 'evi' },
        h('button', { type: 'button', class: 'evc', aria: { pressed: ev.id === this.sel }, on: { click: () => { this.sel = ev.id; this.ultimo = null; this.update(); } } },
          h('div', { class: 'evc-h' }, h('b', { text: ev.nombre }), h('span', {}, statusBadge(ev.estado))),
          h('p', { class: 'muted small', text: `${diaMes(ev.fecha)} · ${ev.inscritos} inscritos` }),
          ev.estado === 'Borrador' ? h('p', { class: 'muted small', text: 'Sin asistencia aún' })
            : h('div', { class: 'meter' }, h('span', { class: 'muted small', text: 'Asistencia' }), meterBar(e.pctAsis), h('b', { text: e.pctAsis + '%' }))),
        ev.estado === 'Borrador' ? h('button', { class: 'btn s', type: 'button', text: 'Confirmar evento', on: { click: () => this.confirmar(ev.id) } }) : null);
    });
    return h('section', { class: 'card', aria: { labelledby: 'ev-t' } }, h('h2', { class: 'h', id: 'ev-t', text: 'Eventos' }), h('ul', { class: 'evs' }, items));
  }
  nominalCard(){
    const ev = this.ev, personas = ev ? getAsistencia(ev.id) : [];
    return h('section', { class: 'card nominal', aria: { labelledby: 'ln-t' } },
      h('h2', { class: 'h', id: 'ln-t', text: `Asistencia nominal${ev ? ' · ' + ev.nombre : ''}` }),
      personas.length ? simpleTable(['Persona', 'Empresa', 'Estado'], personas.map(p => [p.nombre, nombreEmp(p.empresaId), statusBadge(p.estado)]))
        : h('p', { class: 'muted', text: 'Aún no hay personas inscritas en este evento.' }));
  }
  segCard(){
    const sector = h('select', { id: 'sg-s', class: 'field', on: { change: e => { this.seg.sectorId = e.target.value || null; this.lista = null; } } },
      h('option', { value: '', text: 'Todos los sectores' }), ...SECTORES.map(s => h('option', { value: s.id, text: s.nombre })));
    sector.value = this.seg.sectorId ?? '';
    const chip = (k, t) => h('button', { class: 'chip', type: 'button', text: t, aria: { pressed: !!this.seg[k] },
      on: { click: () => { this.seg[k] = this.seg[k] ? (k === 'fichaMin' ? 0 : false) : (k === 'fichaMin' ? 70 : true); this.lista = null; this.update(); } } });
    return h('section', { class: 'card segmentar', aria: { labelledby: 'seg-t' } },
      h('h2', { class: 'h', id: 'seg-t' }, h('span', { class: 'lft' }, icon('sparkles', 18), ' Segmentar convocatoria')),
      h('p', { class: 'muted', text: 'Define reglas para invitar a las empresas correctas.' }),
      h('div', { class: 'fld' }, h('label', { for: 'sg-s', text: 'Sector' }), sector),
      h('div', { class: 'chips' }, chip('sinAsistencia', 'Sin asistencia previa'), chip('fichaMin', 'Ficha > 70%')),
      h('button', { class: 'btn', type: 'button', text: 'Generar lista', on: { click: () => this.generar() } }),
      this.lista ? h('div', { class: 'seg-res', role: 'status' }, h('b', { text: `${this.lista.length} empresa${this.lista.length === 1 ? '' : 's'} para invitar` }),
        this.lista.length ? h('ul', {}, this.lista.map(e => h('li', { text: `${e.nombre} · ficha ${e.salud}%` }))) : h('p', { class: 'muted small', text: 'Ninguna empresa cumple las reglas: prueba quitar un filtro.' })) : null);
  }
  semanaCard(){
    const l = this.semana;
    const items = [
      ...getCitas().map(c => ({ fecha: c.fecha, hora: c.hora, titulo: 'Asesoría', sub: `${nombreEmp(c.empresaId)} · ${c.estado}`, tono: TONO[c.estado] })),
      ...getEventos().map(e => ({ fecha: e.fecha, hora: e.hora, titulo: e.nombre, sub: e.estado, tono: TONO[e.estado] }))];
    return h('section', { class: 'card ag-full', aria: { labelledby: 'wk-t' } },
      navSemana(`Semana del ${rangoSemana(l)}`, 'wk-t', () => { this.semana = addDias(l, -7); this.update(); this.querySelector('[aria-label="Semana anterior"]')?.focus(); }, () => { this.semana = addDias(l, 7); this.update(); this.querySelector('[aria-label="Semana siguiente"]')?.focus(); }),
      semanaNode(l, items, `Actividades de la semana del ${rangoSemana(l)}`));
  }

  render(){
    return h('div', { class: 'agenda' },
      h('header', { class: 'page-h' }, h('div', {}, h('h1', { text: 'Agenda y eventos' }), h('p', { text: 'Embudo, QR y calendario' })),
        h('button', { class: 'btn', type: 'button', on: { click: e => this.dlgEvento(e.currentTarget) } }, icon('plus', 16), ' Nuevo evento')),
      h('div', { class: 'ag-grid' }, this.embudoCard(), this.qrCard(), this.eventosCard(), this.nominalCard(), this.semanaCard(), this.segCard()));
  }
}
