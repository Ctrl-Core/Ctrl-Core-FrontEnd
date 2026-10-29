import { ROLES } from './data.js';
/** Adaptador de persistencia síncrono (localStorage). El contrato get/set/subscribe es el PUERTO que usan servicios y vistas. */
const KEY = 'cde.state.v1';
/** Estado global mínimo con suscripción (patrón observable) y persistencia en localStorage */
class Store {
  constructor(){
    this.s = { role: 'dir', logged: true };
    this.subs = new Set();
    try { Object.assign(this.s, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch {}
    if (!ROLES[this.s.role]) this.s.role = 'dir';
  }
  get(){ return this.s; }
  set(patch){ Object.assign(this.s, patch); try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch {} this.subs.forEach(f => f(this.s)); }
  subscribe(fn){ this.subs.add(fn); return () => this.subs.delete(fn); }
  setRole(role){ if (ROLES[role]) this.set({ role }); }
}
export const store = new Store();
