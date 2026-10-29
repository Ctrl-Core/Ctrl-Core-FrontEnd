import { CdeView } from '../../../shared/components/cde-view.js';
import { levelCard } from '../../../shared/components/gamification/level-card.js';
import { levelSteps } from '../../../shared/components/gamification/level-steps.js';
import { medalGrid } from '../../../shared/components/gamification/medal-grid.js';
import { missionRow } from '../../../shared/components/gamification/mission-row.js';
import { meterBar } from '../../../shared/components/data-table/meter-bar.js';
import { xpText } from '../../../shared/components/gamification/xp-badge.js';
import { h } from '../../../shared/utils/dom.js';
import { toast } from '../../../shared/utils/dom.js';
import { icon } from '../../../shared/utils/icons.js';
import { fmt } from '../../../shared/utils/text.js';
import { getPerfil, nivelDe, medallas } from '../services/gamificacion.js';
import { misiones, pasoActual, avanzarPaso, recomendada, reto, cobrarReto, niveles, resultados, saldo, recompensas, canjear } from '../services/academia.js';

const ICONO_MEDALLA = { primer_plan: 'flag', constante: 'flame', despegue: 'sprout', lider: 'trophy', referente: 'gem' };

/**
 * P10 · Academia gamificada (Emprendedor): misión recomendada, reto semanal, nivel y medallas, misiones por pasos y canje de XP.
 * Sin lógica de negocio en la vista: todo se delega en services/academia.js y gamificacion.js.
 */
export class AcademyView extends CdeView {
  /* ---------- Acciones ---------- */
  /** Abre el paso actual de una misión (leer o quiz); al cumplirlo abre el siguiente hasta completarla */
  abrir(id, opener){
    const ctx = pasoActual(id); if (!ctx) return;
    const { mision, paso, n, total } = ctx, titulo = `${mision.titulo} · paso ${n} de ${total}`;
    let sel = null;
    const cuerpo = paso.t === 'quiz'
      ? [h('p', { class: 'q-txt', text: paso.pregunta }),
         h('fieldset', { class: 'q-ops' }, h('legend', { class: 'sr-only', text: 'Opciones de respuesta' }),
           paso.opciones.map((o, i) => h('label', { class: 'q-op' }, h('input', { type: 'radio', name: 'q', value: String(i), on: { change: () => { sel = i; } } }), h('span', { text: o }))))]
      : [h('h3', { text: paso.titulo }), h('p', { text: paso.texto })];
    this.dialog(titulo, cuerpo, () => {
      const r = avanzarPaso(id, sel);
      if (!r.ok) return r.error;
      if (r.completada){
        toast(r.xp ? `¡Misión completada! ${xpText(r.xp)}${r.subeNivel ? ` · subiste al Nivel ${r.nivel.n}` : ''}` : 'Misión completada');
      } else { setTimeout(() => this.abrir(id, opener), 0); }
      this.update(); this.focusBy('mision', id);
      return null;
    }, opener, paso.t === 'quiz' ? 'Responder' : (n === total ? 'Terminar misión' : 'Entendido, siguiente'));
  }
  cobrar(){
    const r = cobrarReto();
    toast(r.ok ? `Bono cobrado ${xpText(r.xp)}${r.subeNivel ? ' · ¡subiste de nivel!' : ''}` : r.error);
    if (r.ok) this.update();
  }
  canjear(rw){
    if (!confirm(`¿Canjear “${rw.nombre}” por ${fmt(rw.costo)} XP? Tu nivel no cambia.`)) return;
    const r = canjear(rw.id);
    toast(r.ok ? `Canjeaste “${r.recompensa.nombre}”` : r.error);
    if (r.ok) this.update();
  }

  /* ---------- Bloques ---------- */
  iaCard(){
    const rec = recomendada();
    if (!rec) return h('section', { class: 'card ia-card', aria: { labelledby: 'ia-t' } }, h('h2', { id: 'ia-t', text: '¡Estás al día!' }), h('p', { text: 'Completaste todas las misiones disponibles. Vuelve pronto: se publican nuevas cada semana.' }));
    const { mision: m } = rec;
    return h('section', { class: 'card ia-card', aria: { labelledby: 'ia-t' } },
      h('div', { class: 'ia-k' }, icon('sparkles', 18), h('span', { class: 'kicker', text: 'RECOMENDADA PARA TI' })),
      h('h2', { id: 'ia-t', text: rec.coincide ? `Cierra tu brecha en ${rec.area.toLowerCase()}` : m.titulo }),
      h('p', { text: rec.coincide ? `Tu radar muestra ${rec.area.toLowerCase()} en ${rec.valor}%. Esta misión sube tu puntaje en esa área.` : `Misión disponible: ${m.titulo}.` }),
      h('div', { class: 'ia-acts' }, h('span', { class: 'badge ia-b', text: xpText(m.xp) }), m.minutos ? h('span', { class: 'badge ia-b', text: `${m.minutos} min` }) : null,
        h('button', { class: 'btn claro', type: 'button', text: m.estado === 'En progreso' ? 'Continuar misión' : 'Iniciar misión', dataset: { mision: 'rec' }, on: { click: e => this.abrir(m.id, e.currentTarget) } })));
  }
  retoCard(){
    const r = reto();
    const tiempo = r.cobrado ? 'Bono cobrado' : r.vence ? `Termina en ${r.vence.d} d ${r.vence.h} h` : 'Terminó';
    return h('section', { class: 'card reto', aria: { labelledby: 'rt-t' } },
      h('div', { class: 'h' }, h('span', { class: 'kicker', text: 'RETO DE LA SEMANA' }), h('span', { class: 'badge warn', text: tiempo })),
      h('h2', { id: 'rt-t', text: r.titulo }),
      h('div', { class: 'meter' }, meterBar(r.progreso), h('b', { text: r.progreso + '%' })),
      h('p', { class: 'muted' }, `Vas en ${r.progreso}% · `, h('b', { text: `${xpText(r.bono)} de bono` })),
      r.cumplido && !r.cobrado && r.vence ? h('button', { class: 'btn', type: 'button', text: 'Cobrar bono', on: { click: () => this.cobrar() } }) : null);
  }
  nivelCard(){
    const p = getPerfil(), ms = medallas();
    const card = levelCard({ nivel: nivelDe(p.xp), xp: p.xp, xpSemana: p.xpSemana, racha: p.racha, dias: p.dias, medallas: { ganadas: ms.filter(m => m.ganada).length, total: ms.length } });
    card.classList.add('pasos'); card.append(levelSteps(niveles()));
    return card;
  }
  resultadosCard(){
    const r = resultados(), fila = (ic, v, l) => h('li', {}, h('span', { class: 'it' }, icon(ic, 18)), h('div', {}, h('b', { text: String(v) }), h('span', { class: 'muted', text: l })));
    return h('section', { class: 'card', aria: { labelledby: 'rs-t' } }, h('h2', { class: 'h', id: 'rs-t', text: 'Resultados desde que empezaste' }),
      h('ul', { class: 'resultados' }, fila('dash', r.ventas, 'ventas'), fila('award', r.planes, r.planes === 1 ? 'plan completado' : 'planes completados'), fila('users', r.clientes, 'clientes nuevos')));
  }
  medallasCard(){
    const ms = medallas();
    return h('section', { class: 'card', aria: { labelledby: 'md-t' } },
      h('div', { class: 'h' }, h('h2', { id: 'md-t', style: { font: 'inherit', margin: '0' }, text: 'Medallas' }), h('span', { class: 'badge', text: `${ms.filter(m => m.ganada).length} / ${ms.length}` })),
      medalGrid(ms.map(m => ({ nombre: m.nombre, icono: ICONO_MEDALLA[m.id], ganada: m.ganada }))));
  }
  misionesCard(){
    const filas = misiones().map(m => {
      const detalle = m.estado === 'Bloqueada' ? `Se abre en Nivel ${m.nivelMin}` : `${m.hechos} de ${m.pasos.length} pasos`;
      const accion = m.estado === 'Disponible' ? { label: 'Empezar' } : m.estado === 'En progreso' ? { label: 'Continuar', variante: 'o' } : null;
      const row = missionRow({ tipo: m.tipo, titulo: m.titulo, detalle, estado: m.estado,
        accion: accion && { ...accion, onClick: e => this.abrir(m.id, e.currentTarget) }, extra: m.estado === 'Completada' ? `${xpText(m.xp)} · Misión completada` : null });
      row.dataset.mision = m.id; row.tabIndex = -1;
      return row;
    });
    return h('section', { class: 'card', aria: { labelledby: 'ms-t' } }, h('h2', { class: 'h', id: 'ms-t', text: 'Misiones' }), h('ul', { class: 'misiones' }, filas));
  }
  canjeCard(){
    const items = recompensas().map(r => {
      const motivo = r.canjeada ? 'Canjeada' : r.bloqueada ? `Se abre en Nivel ${r.nivelMin}` : r.sinSaldo ? `Te faltan ${fmt(r.costo - saldo())} XP` : null;
      return h('li', { class: ['rw', (r.bloqueada || r.canjeada) && 'off'] },
        h('span', { class: 'h3' }, icon(r.bloqueada ? 'lock' : 'gift', 18), ' ', h('b', { text: r.nombre })),
        h('span', { class: 'muted small', text: `${r.nota} · ${fmt(r.costo)} XP` }),
        h('button', { class: 'btn s', type: 'button', text: r.canjeada ? 'Canjeada' : 'Canjear', disabled: !!motivo, title: motivo ?? '', aria: { describedby: null }, on: { click: () => this.canjear(r) } }),
        motivo && !r.canjeada ? h('small', { class: 'muted', text: motivo }) : null);
    });
    return h('section', { class: 'card', aria: { labelledby: 'cj-t' } },
      h('div', { class: 'h' }, h('h2', { id: 'cj-t', style: { font: 'inherit', margin: '0' }, text: 'Canjear XP' }), h('span', { class: 'badge warn', text: `${fmt(saldo())} XP` })), h('ul', { class: 'recompensas' }, items));
  }

  render(){
    return h('div', { class: 'acad' },
      h('header', { class: 'page-h' }, h('div', {}, h('h1', { text: 'Academia' }), h('p', { text: 'Aprende, suma XP y canjea beneficios' }))),
      h('div', { class: 'acad-row a1' }, this.iaCard(), this.retoCard()),
      h('div', { class: 'acad-row a2' }, this.nivelCard(), this.resultadosCard()),
      this.medallasCard(),
      h('div', { class: 'acad-row a3' }, this.misionesCard(), this.canjeCard()));
  }
}
