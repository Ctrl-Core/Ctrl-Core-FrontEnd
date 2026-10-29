import { store } from '../../core/db/store.js';
import { h } from '../utils/dom.js';
/**
 * Clase base de las vistas (Web Components nativos, light DOM para compartir los estilos globales).
 * Cada vista implementa render() → Node (construido con h()) y, opcionalmente, bind() (eventos delegados, una vez).
 * El registro de la etiqueta NO se hace aquí: lo decide app.js (composition root).
 */
export class CdeView extends HTMLElement {
  connectedCallback(){
    this._off = [];
    this.bind?.();
    this.update();
  }
  disconnectedCallback(){ this._off.forEach(f => f()); this._off = []; this.cleanup?.(); }
  /** Re-renderiza cuando cambia el store */
  watch(){ this._off.push(store.subscribe(() => this.update())); }
  update(){ this.replaceChildren(this.render()); this.afterRender?.(); }
  /** Delegación de eventos con addEventListener: on('click', '[data-x]', (e, el) => ...) */
  on(type, sel, fn){ this.addEventListener(type, e => { const t = e.target.closest?.(sel); if (t && this.contains(t)) fn(e, t); }); }
  /** Enfoca el primer elemento con data-<attr>=<valor> (sin interpolar selectores) */
  focusBy(attr, value){ [...this.querySelectorAll('[data-' + attr + ']')].find(n => n.dataset[attr] === value)?.focus(); }
  /** Diálogo modal construido con h(): guardar() devuelve un mensaje de error (string) o null si todo salió bien */
  dialog(titulo, campos, guardar, opener){
    const err = h('p', { class: 'form-err', role: 'alert' });
    const dlg = h('dialog', { aria: { label: titulo } },
      h('form', { class: 'dlg', novalidate: '', on: { submit: e => { e.preventDefault(); const msg = guardar(); if (msg) err.textContent = msg; else dlg.close(); } } },
        h('h2', { class: 'h', text: titulo }), ...campos, err,
        h('div', { class: 'dlg-acts' }, h('button', { class: 'btn o', type: 'button', text: 'Cancelar', on: { click: () => dlg.close() } }), h('button', { class: 'btn', type: 'submit', text: 'Guardar' }))));
    dlg.addEventListener('close', () => { dlg.remove(); opener?.focus(); });
    this.append(dlg); dlg.showModal();
    return dlg;
  }
  get q(){ return this.route?.query ?? {}; }
  get params(){ return this.route?.params ?? {}; }
}
