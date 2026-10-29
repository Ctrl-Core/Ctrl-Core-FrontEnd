import { store } from '../../../core/db/store.js';
import { ROLES } from '../../../core/db/data.js';
import { go, exists } from '../../../core/router/vanillaRouter.js';
import { toast, h } from '../../utils/dom.js';

/** Conmutador "Modo demostración · cambiar rol": salta de rol en 1 clic, sin pasar por el login */
export class CdeRoleSwitch extends HTMLElement {
  connectedCallback(){
    this._off = store.subscribe(() => this.render());
    this.render();
  }
  disconnectedCallback(){ this._off?.(); }
  pick(key){
    const r = ROLES[key];
    if (!exists(r.home)) return toast(`La vista de ${r.label} se construye en una siguiente pantalla`);
    store.setRole(key); go(r.home);
  }
  render(){
    const cur = store.get().role;
    this.replaceChildren(h('div', { class: 'seg', role: 'group', aria: { label: 'Cambiar rol (modo demostración)' } },
      Object.entries(ROLES).map(([k, r]) => h('button', { type: 'button', aria: { pressed: k === cur }, text: r.label, on: { click: () => this.pick(k) } }))));
  }
}
