import { CdeView } from '../../../shared/components/cde-view.js';
import { statusBadge } from '../../../shared/components/data-table/status-badge.js';
import { conflicts as seed, initialFiles, TOTALS } from '../../../core/db/data.js';
import { go } from '../../../core/router/vanillaRouter.js';
import { icon } from '../../../shared/utils/icons.js';
import { h, toast } from '../../../shared/utils/dom.js';

const NOTES = { 'Por revisar': 'Posible duplicado · mismo contacto', 'Fusionado': 'Unido a la ficha', 'Descartado': 'No es duplicado' };
const VALID = /\.(xlsx|xls|csv)$/i;

/** P2 · Asistente de configuración: migrador inteligente y deduplicador (primer uso del Director) */
export class SetupView extends CdeView {
  conflicts = seed.map(c => ({ ...c }));
  files = [...initialFiles];
  finished = false;
  get pending(){ return this.conflicts.filter(c => c.status === 'Por revisar').length; }

  bind(){
    this.on('click', '[data-pick]', () => this.querySelector('input[type=file]').click());
    this.on('change', 'input[type=file]', (e, i) => { this.load(i.files); i.value = ''; });
    this.addEventListener('dragover', e => { const z = e.target.closest('.dz'); if (z){ e.preventDefault(); z.classList.add('over'); } });
    this.addEventListener('dragleave', e => e.target.closest('.dz')?.classList.remove('over'));
    this.addEventListener('drop', e => { if (e.target.closest('.dz')){ e.preventDefault(); this.load(e.dataTransfer.files); } });
    this.on('click', '[data-set]', (e, b) => {
      const c = this.conflicts.find(x => x.id === b.dataset.id); c.status = b.dataset.set; this.finished = false; this.update();
      if (c.status === 'Fusionado') toast(`Fichas fusionadas: se conserva “${c.a}”`);
      this.focusBy('id', c.id);
    });
    this.on('click', '[data-confirm]', () => {
      if (this.finished) return go('/dashboard');
      if (this.pending){ toast(`Aún tienes ${this.pending} conflicto${this.pending > 1 ? 's' : ''} por revisar`); return this.querySelector('[data-set="Fusionado"]')?.focus(); }
      this.finished = true; this.update(); toast(`Base lista: ${TOTALS.unicas} empresas únicas`);
    });
  }

  /** Valida los archivos (solo .xlsx/.xls/.csv) y anima el conteo 569 → 497 */
  load(list){
    const ok = [...list].filter(f => VALID.test(f.name)), bad = list.length - ok.length;
    if (bad) toast(`${bad} archivo${bad > 1 ? 's' : ''} omitido${bad > 1 ? 's' : ''}: solo se aceptan .xlsx, .xls o .csv`);
    if (!ok.length) return;
    this.files = ok.map(f => f.name); this.update(); toast(`${ok.length} archivo${ok.length > 1 ? 's' : ''} cargado${ok.length > 1 ? 's' : ''}`);
    const out = this.querySelector('[data-unicas]'), t0 = performance.now();
    const tick = t => { const p = Math.min(1, (t - t0) / 900); if (out.isConnected) out.textContent = String(Math.round(TOTALS.atenciones - (TOTALS.atenciones - TOTALS.unicas) * p)); if (p < 1) requestAnimationFrame(tick); };
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(tick);
  }

  step(n, label, state){
    return h('li', { class: state, aria: { current: state === 'cur' ? 'step' : null } },
      h('span', { class: 'n' }, state === 'done' ? icon('tick', 16) : String(n)),
      h('span', { text: (n === 1 ? '1 · ' : '') + label }));
  }
  /** Fila de conflicto + acciones según estado */
  row(c){
    const btn = (label, set, cls) => h('button', { class: 'btn ' + cls, dataset: { id: c.id, set }, text: label });
    const pendiente = c.status === 'Por revisar';
    return h('article', { class: ['conf', pendiente && 'pending'], aria: { label: c.a } },
      h('div', {}, h('h3', {}, h('span', { text: c.a }), ' ', h('span', { class: 'alt' }, '≈ ', h('span', { text: c.b }))), h('p', { text: NOTES[c.status] })),
      pendiente
        ? [statusBadge(c.status), h('div', { class: 'acts' }, btn('Fusionar', 'Fusionado', ''), btn('Descartar', 'Descartado', 'o'))]
        : h('div', { class: 'side' }, statusBadge(c.status), btn(c.status === 'Fusionado' ? 'Deshacer' : 'Revisar', 'Por revisar', 'o')));
  }
  render(){
    const p = this.pending, fin = this.finished;
    const fileRows = this.files.map(name => h('li', {}, h('span', {}, icon('tick', 15)), h('span', { text: name })));
    return h('div', { class: 'setup' },
      h('header', {}, h('h1', { text: 'Asistente de configuración' }), h('p', { class: 'lead', text: 'Importa tus Excels y deja una base de empresas limpia, sin duplicados.' })),
      h('ol', { class: 'steps', aria: { label: 'Progreso' } },
        this.step(1, 'Subir', 'done'), h('li', { class: 'ln done', aria: { hidden: 'true' } }),
        this.step(2, 'Revisar', fin ? 'done' : 'cur'), h('li', { class: fin ? 'ln done' : 'ln', aria: { hidden: 'true' } }),
        this.step(3, 'Listo', fin ? 'cur' : '')),
      h('div', { class: 'setup-grid' },
        h('section', { class: 'card', aria: { labelledby: 'h-files' } },
          h('h2', { class: 'h', id: 'h-files', text: 'Archivos cargados' }),
          h('div', { class: 'dz' }, h('span', { class: 'it' }, icon('upload', 18)), h('b', { text: 'Arrastra tus Excels aquí' }),
            h('button', { class: 'btn o', type: 'button', dataset: { pick: '' }, text: 'Seleccionar archivos' }),
            h('input', { type: 'file', multiple: true, accept: '.xlsx,.xls,.csv', hidden: true, tabindex: '-1' })),
          h('ul', { class: 'files' }, fileRows),
          h('div', { class: 'tally', aria: { live: 'polite' } },
            h('div', {}, h('b', { text: TOTALS.atenciones }), h('span', { text: 'Atenciones' })), icon('arrow', 16),
            h('div', { class: 'to' }, h('b', { dataset: { unicas: '' }, text: TOTALS.unicas }), h('span', { text: 'Empresas únicas' })))),
        h('section', { class: 'card', aria: { labelledby: 'h-conf' } },
          h('div', { class: 'h', id: 'h-conf' }, h('h2', { style: { font: 'inherit', margin: '0' }, text: 'Conflictos por revisar' }),
            h('span', { class: p ? 'badge warn' : 'badge', text: p ? `${p} de ${this.conflicts.length} por revisar` : 'Todo revisado' })),
          h('div', { class: 'conf-list' }, this.conflicts.map(c => this.row(c))),
          h('div', { class: 'setup-foot' },
            fin ? h('span', { class: 'done-note' }, icon('tick', 16), ' Tu base quedó lista.') : null,
            h('button', { class: 'btn', dataset: { confirm: '' }, text: fin ? 'Ir al Centro de mando' : 'Confirmar y continuar' })))));
  }
}
