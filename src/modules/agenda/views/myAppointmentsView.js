import { CdeView } from '../../../shared/components/cde-view.js';
import { statusBadge } from '../../../shared/components/data-table/status-badge.js';
import { timeline } from '../../../shared/components/timeline-360/timeline.js';
import { xpText } from '../../../shared/components/gamification/xp-badge.js';
import { dateBadge } from '../../../shared/components/date-badge.js';
import { DIRECTORIO, USUARIO_EMPRENDEDOR, ASESOR_NOMBRE, XP_MISION_CITA, XP_CHECKIN, HORAS_CITA, HOY } from '../../../core/db/data.js';
import { go } from '../../../core/router/vanillaRouter.js';
import { h, toast } from '../../../shared/utils/dom.js';
import { icon } from '../../../shared/utils/icons.js';
import { largo, hora12, addDias, diaMes } from '../../../shared/utils/dates.js';
import { qrDemo } from '../services/qrScanner.js';
import { citasDe, proximaDe, solicitar, reprogramar, cancelar } from '../services/citas.js';
import { misEventos, eventoConQr, inscribir, cancelarInscripcion } from '../services/agenda.js';
import { getExpediente, fechaCorta } from '../../empresas/services/expedientes.js';

/**
 * P11 · Mis citas y eventos (Emprendedor): próxima asesoría, QR de check-in, inscripción a eventos,
 * asesorías con sus actas e historial con el CDE. Solo ve SU empresa; todos los datos salen de los servicios
 * de Agenda y Expediente (una única fuente de verdad con Docente y Director).
 */
export class MyAppointmentsView extends CdeView {
  get emp(){ return DIRECTORIO.find(e => e.id === USUARIO_EMPRENDEDOR.empresaId); }

  /* ---------- Acciones ---------- */
  accion(r, ok){ if (!r.ok){ toast(r.error); return; } toast(ok); this.update(); }
  /** Diálogo compartido para agendar (con tema) y reprogramar (sin tema) */
  dlgCita({ titulo, cita, opener }){
    const t = cita ? null : h('input', { id: 'mc-t', class: 'field', type: 'text', maxlength: '40', autocomplete: 'off', placeholder: 'Ej.: Costos, Marca, Finanzas' });
    const f = h('input', { id: 'mc-f', class: 'field', type: 'date', min: addDias(HOY, 1), value: cita?.fecha ?? '' });
    const hr = h('select', { id: 'mc-h', class: 'field' }, ...HORAS_CITA.map(x => h('option', { value: x, text: hora12(x) })));
    if (cita) hr.value = cita.hora;
    const fld = (id, l, el) => h('div', { class: 'fld' }, h('label', { for: id, text: l }), el);
    this.dialog(titulo, [h('p', { class: 'muted small', text: cita ? 'Tu asesor deberá confirmar el nuevo horario.' : 'Tu asesor confirmará la cita. Las asesorías son de lunes a viernes.' }),
      ...(t ? [fld('mc-t', 'Tema', t)] : []), fld('mc-f', 'Fecha', f), fld('mc-h', 'Hora', hr)], () => {
      const r = cita ? reprogramar(cita.id, { fecha: f.value, hora: hr.value }) : solicitar({ tema: t.value, fecha: f.value, hora: hr.value });
      if (!r.ok) return r.error;
      toast(cita ? 'Cita reprogramada: queda pendiente de confirmación' : 'Asesoría solicitada: queda pendiente de confirmación'); this.update(); return null;
    }, opener, cita ? 'Reprogramar' : 'Solicitar');
  }

  /* ---------- Bloques ---------- */
  proxima(){
    const c = proximaDe(this.emp.id);
    if (!c) return h('section', { class: 'card', aria: { labelledby: 'pa-t' } }, h('h2', { class: 'h', id: 'pa-t', text: 'Próxima asesoría' }),
      h('p', { class: 'muted', text: 'No tienes asesorías programadas. Pide una y tu asesor la confirmará.' }),
      h('button', { class: 'btn', type: 'button', text: 'Agendar asesoría', on: { click: e => this.dlgCita({ titulo: 'Agendar asesoría', opener: e.currentTarget }) } }));
    return h('section', { class: 'card proxima', aria: { labelledby: 'pa-t' } },
      h('div', { class: 'h' }, h('h2', { id: 'pa-t', style: { font: 'inherit', margin: '0' }, text: 'Próxima asesoría' }), statusBadge(c.estado)),
      h('div', { class: 'pa-fecha' }, dateBadge(c.fecha), h('div', {}, h('b', { class: 'pa-d', text: `${largo(c.fecha)} · ${hora12(c.hora)}` }), h('p', { text: `${ASESOR_NOMBRE} · ${c.tema}` }))),
      h('span', { class: 'chip fit', text: `Misión asociada ${xpText(XP_MISION_CITA)}` }),
      h('div', { class: 'acts' },
        h('button', { class: 'btn', type: 'button', text: 'Ir a la misión', on: { click: () => go('/academia') } }),
        h('button', { class: 'btn o', type: 'button', text: 'Reprogramar', on: { click: e => this.dlgCita({ titulo: 'Reprogramar asesoría', cita: c, opener: e.currentTarget }) } }),
        h('button', { class: 'btn o', type: 'button', text: 'Cancelar cita', on: { click: () => { if (confirm(`¿Cancelar tu asesoría del ${largo(c.fecha)}?`)) this.accion(cancelar(c.id), 'Cita cancelada'); } } })));
  }
  qr(){
    const x = eventoConQr();
    if (!x) return h('section', { class: 'card', aria: { labelledby: 'qr-t' } }, h('h2', { class: 'h', id: 'qr-t', text: 'Check-in por QR' }),
      h('p', { class: 'muted', text: 'Inscríbete a un evento confirmado y aquí aparecerá tu QR para registrar tu asistencia.' }));
    return h('section', { class: 'card qr-card', aria: { labelledby: 'qr-t' } },
      h('div', { class: 'h' }, h('h2', { id: 'qr-t', style: { font: 'inherit', margin: '0' }, text: 'Check-in por QR' }), h('span', { class: 'badge', text: x.evento.nombre })),
      h('div', { class: 'qr-box' }, qrDemo(`${x.evento.id}:${x.persona.id}`)),
      h('p', { class: 'qr-p' }, 'Muéstralo al llegar y suma ', h('b', { text: `${xpText(XP_CHECKIN)} al instante` }), '.'),
      h('p', { class: 'muted small', text: 'QR de demostración: el equipo del CDE lo escanea en la entrada.' }));
  }
  eventos(){
    const filas = misEventos().map(({ evento: e, persona: p }) => {
      const futuro = e.fecha >= HOY, estado = p?.estado ?? (futuro ? 'Disponible' : null);
      const accion = !p && futuro && e.estado === 'Confirmada' ? h('button', { class: 'btn s', type: 'button', text: 'Inscribirme', on: { click: () => this.accion(inscribir(e.id), `Quedaste inscrito en ${e.nombre}`) } })
        : p?.estado === 'Inscrito' && futuro ? h('button', { class: 'btn o s', type: 'button', text: 'Cancelar inscripción', on: { click: () => { if (confirm(`¿Cancelar tu inscripción a “${e.nombre}”?`)) this.accion(cancelarInscripcion(e.id), 'Inscripción cancelada'); } } }) : null;
      return h('li', { class: ['mev', p?.estado === 'Inscrito' && futuro && 'prox'] },
        h('div', { class: 'mev-t' }, h('b', { text: e.nombre }), h('small', { class: 'muted', text: `${diaMes(e.fecha)} ${e.fecha.slice(0, 4)} · ${hora12(e.hora)}${p?.estado === 'Asistió' ? ` · ${xpText(120)}` : ''}` })),
        estado ? statusBadge(estado) : null, accion);
    });
    return h('section', { class: 'card', aria: { labelledby: 'ev-t' } }, h('h2', { class: 'h', id: 'ev-t', text: 'Mis eventos' }),
      filas.length ? h('ul', { class: 'mevs' }, filas) : h('p', { class: 'muted', text: 'Aún no hay eventos publicados.' }));
  }
  asesorias(){
    const l = citasDe(this.emp.id).sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
    if (!l.length) return null;
    return h('section', { class: 'card', aria: { labelledby: 'as-t' } }, h('h2', { class: 'h', id: 'as-t', text: 'Mis asesorías' }),
      h('ul', { class: 'asesorias' }, l.map(c => h('li', { class: 'ase' },
        h('div', { class: 'ase-h' }, h('b', { text: c.tema }), statusBadge(c.estado)),
        h('small', { class: 'muted', text: `${largo(c.fecha)} · ${hora12(c.hora)} · ${ASESOR_NOMBRE}` }),
        c.acta ? h('details', {}, h('summary', { text: 'Ver acta' }),
          h('p', {}, h('b', { text: 'Acuerdos: ' }), c.acta.acuerdos), c.acta.proximo ? h('p', {}, h('b', { text: 'Próximo paso: ' }), c.acta.proximo) : null) : null))));
  }
  historial(){
    const items = getExpediente(this.emp.id).linea;
    return h('section', { class: 'card', aria: { labelledby: 'hs-t' } }, h('h2', { class: 'h', id: 'hs-t', text: 'Historial con el CDE' }), timeline(items, fechaCorta));
  }

  render(){
    const hayVigente = !!proximaDe(this.emp.id);
    return h('div', { class: 'citas' },
      h('header', { class: 'page-h' }, h('div', {}, h('h1', { text: 'Mis citas y eventos' }), h('p', { text: this.emp.nombre })),
        h('button', { class: 'btn', type: 'button', disabled: hayVigente, title: hayVigente ? 'Ya tienes una asesoría programada' : '', on: { click: e => this.dlgCita({ titulo: 'Agendar asesoría', opener: e.currentTarget }) } }, icon('plus', 16), ' Agendar asesoría')),
      h('div', { class: 'ct-row a' }, this.proxima(), this.qr()),
      h('div', { class: 'ct-row b' }, this.eventos(), this.historial()),
      this.asesorias());
  }
}
