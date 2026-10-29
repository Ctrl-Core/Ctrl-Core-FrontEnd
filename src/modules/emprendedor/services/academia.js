/**
 * Reglas de la Academia gamificada (sin DOM).
 * - Misiones: estado derivado (Bloqueada por nivel · Disponible · En progreso · Completada). Cada paso se valida:
 *   'leer' se confirma; 'quiz' exige la opción correcta. El XP se otorga UNA sola vez al completar (flag `cobrada`).
 * - Recomendación: la misión disponible cuyo área coincide con la MAYOR BRECHA del radar de la empresa (reglas, sin servicio externo).
 * - Reto semanal: se cobra una vez, solo si la meta se cumplió y no venció (tiempo calculado contra AHORA de la demo).
 * - Canje: se paga con SALDO (XP total − XP canjeado); el nivel no baja. Requiere nivel mínimo y saldo suficiente.
 */
import { store } from '../../../core/db/store.js';
import { MISIONES, MISION_INICIAL, RETO, RESULTADOS, RECOMPENSAS, DIRECTORIO, USUARIO_EMPRENDEDOR, AREAS, AHORA, NIVELES } from '../../../core/db/data.js';
import { getPerfil, nivelDe, sumarXp, planesCerrados } from './gamificacion.js';
import { getExpediente } from '../../empresas/services/expedientes.js';

const progreso = () => store.get().misiones ?? MISION_INICIAL;
const guardarProgreso = (id, patch) => store.set({ misiones: { ...progreso(), [id]: { ...progreso()[id], ...patch } } });
const miEmpresa = () => DIRECTORIO.find(e => e.id === USUARIO_EMPRENDEDOR.empresaId);

/* ---------- Misiones ---------- */
export function estadoDe(m){
  const p = progreso()[m.id] ?? { hechos: 0 };
  if (nivelDe(getPerfil().xp).n < m.nivelMin) return 'Bloqueada';
  return p.hechos >= m.pasos.length ? 'Completada' : p.hechos > 0 ? 'En progreso' : 'Disponible';
}
export const misiones = () => MISIONES.map(m => ({ ...m, hechos: progreso()[m.id]?.hechos ?? 0, estado: estadoDe(m) }));
/** Paso actual de una misión (o null si está completa o bloqueada) */
export function pasoActual(id){
  const m = misiones().find(x => x.id === id);
  return m && m.estado !== 'Completada' && m.estado !== 'Bloqueada' ? { mision: m, paso: m.pasos[m.hechos], n: m.hechos + 1, total: m.pasos.length } : null;
}
/** Cumple el paso actual. respuesta = índice de la opción (solo quiz). */
export function avanzarPaso(id, respuesta){
  const ctx = pasoActual(id);
  if (!ctx) return { ok: false, error: 'Esta misión no está disponible' };
  const { mision, paso } = ctx;
  if (paso.t === 'quiz'){
    if (!Number.isInteger(respuesta) || respuesta < 0 || respuesta >= paso.opciones.length) return { ok: false, error: 'Elige una opción' };
    if (respuesta !== paso.correcta) return { ok: false, error: 'Respuesta incorrecta: relee la pregunta e inténtalo de nuevo' };
  }
  const hechos = mision.hechos + 1, completa = hechos >= mision.pasos.length;
  guardarProgreso(id, { hechos });
  if (!completa) return { ok: true, completada: false };
  if (progreso()[id]?.cobrada) return { ok: true, completada: true, xp: 0, subeNivel: false };
  const r = sumarXp(mision.xp, `Misión: ${mision.titulo}`);
  guardarProgreso(id, { cobrada: true });
  return { ok: true, completada: true, xp: mision.xp, subeNivel: r.subeNivel, nivel: r.nivel };
}
/** Misión recomendada: la disponible cuya área coincide con la mayor brecha del radar; si no, la primera disponible */
export function recomendada(){
  const actual = getExpediente(USUARIO_EMPRENDEDOR.empresaId).radar.actual;
  const brecha = AREAS.reduce((m, a) => (actual[a.id] < actual[m.id] ? a : m), AREAS[0]);
  const libres = misiones().filter(m => m.estado === 'Disponible' || m.estado === 'En progreso');
  const mision = libres.find(m => m.area === brecha.id) ?? libres[0] ?? null;
  return mision ? { mision, area: brecha.nombre, valor: actual[brecha.id], coincide: mision.area === brecha.id } : null;
}

/* ---------- Reto de la semana ---------- */
export function reto(){
  const salud = miEmpresa().salud, ms = Date.parse(RETO.fin) - Date.parse(AHORA), cobrado = !!store.get().retoCobrado;
  const vence = ms > 0 ? { d: Math.floor(ms / 864e5), h: Math.floor(ms % 864e5 / 36e5) } : null;
  return { ...RETO, progreso: Math.min(100, salud), cumplido: salud >= RETO.meta, cobrado, vence };
}
export function cobrarReto(){
  const r = reto();
  if (r.cobrado) return { ok: false, error: 'Ya cobraste el bono de este reto' };
  if (!r.vence) return { ok: false, error: 'El reto ya terminó' };
  if (!r.cumplido) return { ok: false, error: `Aún no llegas a ${r.meta}%` };
  const x = sumarXp(r.bono, 'Reto semanal'); store.set({ retoCobrado: true });
  return { ok: true, xp: r.bono, subeNivel: x.subeNivel };
}

/* ---------- Niveles, resultados y canje ---------- */
export const niveles = () => { const n = nivelDe(getPerfil().xp).n; return NIVELES.map(x => ({ n: x.n, estado: x.n < n ? 'hecho' : x.n === n ? 'actual' : 'pendiente' })); };
export const resultados = () => ({ ventas: RESULTADOS.ventas, clientes: RESULTADOS.clientes, planes: planesCerrados() });
const canjes = () => store.get().canjes ?? [];
export const saldo = () => getPerfil().xp - canjes().reduce((s, c) => s + c.costo, 0);
export function recompensas(){
  const lv = nivelDe(getPerfil().xp).n, hechos = new Set(canjes().map(c => c.id)), s = saldo();
  return RECOMPENSAS.map(r => ({ ...r, canjeada: hechos.has(r.id), bloqueada: lv < r.nivelMin, sinSaldo: s < r.costo }));
}
export function canjear(id){
  const r = recompensas().find(x => x.id === id);
  if (!r) return { ok: false, error: 'La recompensa no existe' };
  if (r.canjeada) return { ok: false, error: 'Ya canjeaste esta recompensa' };
  if (r.bloqueada) return { ok: false, error: `Se abre en el Nivel ${r.nivelMin}` };
  if (r.sinSaldo) return { ok: false, error: `Te faltan ${r.costo - saldo()} XP` };
  store.set({ canjes: [...canjes(), { id, costo: r.costo }] });
  return { ok: true, recompensa: r };
}
