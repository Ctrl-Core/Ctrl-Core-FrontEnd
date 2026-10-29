import { CdeView } from '../../../shared/components/cde-view.js';
import { meterBar } from '../../../shared/components/data-table/meter-bar.js';
import { KPIS, PERIODO, PLANES_VENCIDOS, SECTORES, MAX_SECTOR, TOTALS, PREGUNTA_EJEMPLO, SUGERENCIAS } from '../../../core/db/data.js';
import { PLAN_ACCION, hidratarDashboard } from '../../../core/api/contrato.js';
import { statusBadge } from '../../../shared/components/data-table/status-badge.js';
import { go } from '../../../core/router/vanillaRouter.js';
import { fmt } from '../../../shared/utils/text.js';
import { icon } from '../../../shared/utils/icons.js';
import { h, toast } from '../../../shared/utils/dom.js';

/** P3 · Centro de mando (Dashboard del Director). Solo pinta datos y navega con go(); el shell no se repite aquí. */
export class DashboardView extends CdeView {
  sector = null;
  generating = false;
  ask = '';

  bind(){
    this.on('input', '#ask', (e, i) => { this.ask = i.value; });
    this.on('submit', 'form.ask', e => {
      e.preventDefault();
      if (!this.ask.trim()) return toast('Escribe una pregunta sobre tus datos');
      toast('La consulta con IA se conectará en el siguiente paso');
    });
    this.on('click', '[data-report]', () => {
      if (this.generating) return;
      this.generating = true; this.update();
      setTimeout(() => { this.generating = false; if (this.isConnected){ this.update(); toast('Reporte generado (demo)'); } }, 1400);
    });
  }
  load(){ return hidratarDashboard(); }
  pickSector(id){ this.sector = this.sector === id ? null : id; this.update(); this.focusBy('sector', id); }

  kpi(k){
    const body = k.valor == null ? h('b', { class: 'kpi-empty', text: k.vacio }) : h('b', { text: fmt(k.valor) + (k.sufijo || '') });
    const href = '#' + k.to + (k.query ? '?' + new URLSearchParams(k.query) : '');
    return h('a', { class: k.destacado ? 'card kpi hl' : 'card kpi', href },
      h('span', { class: k.destacado ? 'it dk' : 'it' }, icon(k.icon, 18)),
      h('span', { class: 'kpi-t' }, body, h('span', { text: k.label })));
  }
  /** Barra de sector (botón con porcentaje) */
  sectorRow(s){
    return h('li', {}, h('button', { type: 'button', class: 'bar-row', dataset: { sector: s.id }, aria: { pressed: this.sector === s.id, label: `${s.nombre}: ${s.v}%` },
      on: { click: () => this.pickSector(s.id) } },
      h('span', { class: 'bar-n', text: s.nombre }), meterBar(s.v / Math.max(MAX_SECTOR, ...SECTORES.map(x => x.v)) * 100), h('b', { text: s.v + '%' })));
  }
  render(){
    const sel = SECTORES.find(s => s.id === this.sector);
    return h('div', { class: 'dash' },
      h('header', { class: 'page-h' },
        h('div', {}, h('h1', { text: 'Centro de mando' }), h('p', { text: `Periodo ${PERIODO} · Vista Director` })),
        h('button', { class: 'btn', type: 'button', dataset: { report: '' }, aria: { busy: this.generating ? 'true' : null }, disabled: this.generating },
          icon('download', 16), ' ' + (this.generating ? 'Generando…' : 'Reporte en 1 clic'))),

      h('section', { class: 'alert', role: 'alert', aria: { label: 'Planes vencidos' } },
        h('span', { class: 'ico' }, icon('alert', 15)),
        h('div', { class: 'txt' }, h('b', { text: `${PLANES_VENCIDOS} empresas con planes vencidos` }), h('span', { text: 'Requieren seguimiento para retomar su plan de intervención.' })),
        h('button', { class: 'btn alerta', type: 'button', text: 'Ver planes vencidos', on: { click: () => go('/intervenciones', { filtro: 'vencidos' }) } })),

      h('section', { class: 'card', aria: { labelledby: 'h-ask' } },
        h('h2', { class: 'h', id: 'h-ask' }, h('span', { class: 'lft' }, icon('sparkles', 18), ' Pregunta a tus datos')),
        h('form', { class: 'ask', novalidate: true },
          h('label', { class: 'sr-only', for: 'ask', text: 'Pregunta' }),
          h('input', { id: 'ask', class: 'field', type: 'text', autocomplete: 'off', placeholder: PREGUNTA_EJEMPLO, value: this.ask }),
          h('button', { class: 'btn', type: 'submit', text: 'Preguntar' })),
        h('div', { class: 'chips', role: 'group', aria: { label: 'Sugerencias' } },
          SUGERENCIAS.map(s => h('button', { class: 'chip', type: 'button', text: s.label, on: { click: () => go(s.to, s.query) } })))),

      h('div', { class: 'kpis' }, KPIS.map(k => this.kpi(k))),

      PLAN_ACCION.length ? h('section', { class: 'card', aria: { labelledby: 'h-pa' } },
        h('h2', { class: 'h', id: 'h-pa', text: 'Plan de acción 2026' }),
        h('ul', { class: 'bars' }, PLAN_ACCION.map(p => h('li', { class: 'bar-row' },
          h('span', { class: 'bar-n', text: p.programa }), meterBar(Math.min(100, p.meta ? p.avance / p.meta * 100 : 0)),
          h('b', { text: `${p.avance}/${p.meta}` }),
          statusBadge(String(p.estado).replace(/_/g, ' ').toLowerCase().replace(/^./, c => c.toUpperCase())))))) : null,

      h('div', { class: 'g split-r dash-cols' },
        h('section', { class: 'card', aria: { labelledby: 'h-sec' } },
          h('h2', { class: 'h', id: 'h-sec', text: 'Empresas por sector' }),
          h('ul', { class: 'bars' }, SECTORES.map(s => this.sectorRow(s))),
          h('div', { class: 'sec-detail', aria: { live: 'polite' } },
            sel ? [h('span', {}, `${sel.nombre}: `, h('b', { text: `≈ ${fmt(Math.round(TOTALS.unicas * sel.v / 100))} empresas` })),
                   h('button', { class: 'btn o s', type: 'button', on: { click: () => go('/empresas', { sector: sel.id }) } }, 'Abrir lista filtrada ', icon('arrow', 14))]
                : h('span', { class: 'muted small', text: 'Selecciona un sector para ver el detalle.' }))),
        h('section', { class: 'card', aria: { labelledby: 'h-ia', busy: 'true' } },
          h('h2', { class: 'h', id: 'h-ia' }, h('span', { class: 'lft' }, icon('sparkles', 18), ' Hallazgos clave'), h('span', { class: 'badge', text: 'IA' })),
          h('div', { class: 'sk' }), h('div', { class: 'sk', style: { width: '85%' } }), h('div', { class: 'sk', style: { width: '60%' } }),
          h('p', { class: 'muted small', text: 'Los hallazgos aparecerán cuando termine la migración de datos.' }),
          h('button', { class: 'btn block', type: 'button', disabled: true, text: 'Exportar reporte' }))),

      h('p', { class: 'muted small dash-tip' }, 'Atajo: presiona ', h('kbd', { text: 'Ctrl' }), ' ', h('kbd', { text: 'K' }), ' para buscar una empresa y abrir su Expediente 360°. ',
        h('button', { class: 'link', type: 'button', text: 'Abrir buscador', on: { click: () => document.dispatchEvent(new CustomEvent('cde:search')) } })));
  }
}
