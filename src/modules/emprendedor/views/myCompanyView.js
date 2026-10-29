import { CdeView } from '../../../shared/components/cde-view.js';
import { levelCard } from '../../../shared/components/gamification/level-card.js';
import { statusBadge } from '../../../shared/components/data-table/status-badge.js';
import { meterBar } from '../../../shared/components/data-table/meter-bar.js';
import { DIRECTORIO, USUARIO_EMPRENDEDOR, ASESOR_NOMBRE } from '../../../core/db/data.js';
import { XP_MISION_CITA } from '../../../core/db/data.js';
import { go } from '../../../core/router/vanillaRouter.js';
import { h } from '../../../shared/utils/dom.js';
import { largo, hora12 } from '../../../shared/utils/dates.js';
import { planesDe } from '../../intervenciones/services/planes.js';
import { proximaDe } from '../../agenda/services/citas.js';
import { getPerfil, nivelDe, medallas } from '../services/gamificacion.js';

/**
 * P10 · Mi empresa (Emprendedor): nivel/racha/XP/medallas, plan de acción y próxima asesoría de SU empresa.
 * Los datos salen de los mismos servicios que el Kanban y la Agenda (una sola fuente de verdad).
 * En móvil se llama "Mi ruta" y la próxima asesoría pasa por delante del plan (solo CSS).
 */
export class MyCompanyView extends CdeView {
  get emp(){ return DIRECTORIO.find(e => e.id === USUARIO_EMPRENDEDOR.empresaId); }
  verExpediente(){ go('/empresas/' + this.emp.id); }

  nivel(){
    const p = getPerfil(), ms = medallas();
    return levelCard({ nivel: nivelDe(p.xp), xp: p.xp, xpSemana: p.xpSemana, racha: p.racha, dias: p.dias, medallas: { ganadas: ms.filter(m => m.ganada).length, total: ms.length } });
  }
  plan(){
    const planes = planesDe(this.emp.id).sort((a, b) => b.avance - a.avance);
    return h('section', { class: 'card plan-card', aria: { labelledby: 'pl-t' } }, h('h2', { class: 'h', id: 'pl-t', text: 'Mi plan de acción' }),
      planes.length
        ? h('ul', { class: 'plans' }, planes.map(p => h('li', { class: 'plan' },
            h('div', { class: 'plan-h' }, h('b', { text: p.nombre }), h('span', {}, statusBadge(p.estado))),
            h('div', { class: 'meter' }, meterBar(p.avance), h('b', { text: p.avance + '%' })))))
        : h('p', { class: 'muted', text: 'Aún no tienes un plan de acción. Tu asesor lo definirá contigo en la próxima asesoría.' }));
  }
  asesoria(){
    const c = proximaDe(this.emp.id);
    if (!c) return h('section', { class: 'card asesoria', aria: { labelledby: 'as-t' } }, h('h2', { class: 'h', id: 'as-t', text: 'Próxima asesoría' }),
      h('p', { class: 'muted', text: 'No tienes asesorías programadas.' }), h('button', { class: 'btn o block push', type: 'button', text: 'Ver mis citas', on: { click: () => go('/agenda') } }));
    return h('section', { class: 'card asesoria', aria: { labelledby: 'as-t' } },
      h('div', { class: 'h' }, h('h2', { id: 'as-t', style: { font: 'inherit', margin: '0' }, text: 'Próxima asesoría' }), statusBadge(c.estado)),
      h('p', { class: 'fecha', text: `${largo(c.fecha)} · ${hora12(c.hora)}` }),
      h('p', { class: 'muted', text: `${ASESOR_NOMBRE} · ${c.tema}` }),
      h('span', { class: 'chip fit', text: `Misión asociada +${XP_MISION_CITA} XP` }),
      h('button', { class: 'btn block push', type: 'button', text: 'Ir a la misión', on: { click: () => go('/academia') } }));
  }
  render(){
    return h('div', { class: 'mie' },
      h('header', { class: 'page-h' },
        h('div', {}, h('h1', {}, h('span', { class: 't-d', text: 'Mi empresa' }), h('span', { class: 't-m', text: 'Mi ruta' })), h('p', { text: this.emp.nombre })),
        h('button', { class: 'btn o hd-exp', type: 'button', text: 'Ver expediente', on: { click: () => this.verExpediente() } })),
      this.nivel(),
      h('div', { class: 'mie-grid' }, this.plan(), this.asesoria()),
      h('button', { class: 'btn o ft-exp', type: 'button', text: 'Ver expediente', on: { click: () => this.verExpediente() } }));
  }
}
