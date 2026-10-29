/**
 * Reglas de negocio del Kanban de planes de acción (sin DOM).
 * - Estados: Pendiente → En ejecución → En validación CDE → Completado con impacto.
 * - "Vencido" no es una columna: se calcula (no completado y fecha < HOY) y se marca en la tarjeta.
 * - El Docente mueve planes hasta "En validación CDE"; solo el Director valida y cierra (Completado con impacto, +300 XP).
 */
import { store } from '../../../core/db/store.js';
import { PLANES, COLUMNAS, HOY, DIRECTORIO, RESPONSABLES, XP_COMPLETADO } from '../../../core/db/data.js';

const FIN = COLUMNAS[3];
export const getPlanes = () => store.get().planes ?? PLANES;
const guardar = lista => store.set({ planes: lista });
export const estaVencido = p => p.estado !== FIN && p.fecha < HOY;
export const planesDe = empresaId => getPlanes().filter(p => p.empresaId === empresaId);


/** Avance coherente con la columna destino */
const avanceEn = (estado, a) => estado === COLUMNAS[0] ? 0 : estado === COLUMNAS[1] ? Math.min(89, Math.max(1, a)) : estado === COLUMNAS[2] ? Math.max(90, Math.min(99, a)) : 100;

export function puedeMover(plan, destino, rol){
  if (!COLUMNAS.includes(destino)) return { ok: false, motivo: 'Estado no válido' };
  if (rol !== 'dir' && rol !== 'doc') return { ok: false, motivo: 'Tu rol no puede modificar planes' };
  if (plan.estado === destino) return { ok: false, motivo: '' };
  if (rol === 'doc' && (destino === FIN || plan.estado === FIN)) return { ok: false, motivo: 'Solo el Director valida y cierra planes con impacto' };
  return { ok: true };
}
export function mover(id, destino, rol){
  const lista = getPlanes(), plan = lista.find(p => p.id === id);
  if (!plan) return { ok: false, motivo: 'El plan no existe' };
  const r = puedeMover(plan, destino, rol); if (!r.ok) return r;
  const nuevo = { ...plan, estado: destino, avance: avanceEn(destino, plan.avance) };
  if (destino === FIN) nuevo.xp = XP_COMPLETADO; else delete nuevo.xp;
  guardar(lista.map(p => (p.id === id ? nuevo : p)));
  return { ok: true, plan: nuevo };
}
export function crear({ empresaId, nombre, resp, fecha }){
  const n = String(nombre ?? '').trim();
  const emp = DIRECTORIO.find(e => e.id === empresaId && !e.dupDe && !(store.get().fusionadas ?? []).includes(e.id));
  if (!emp) return { ok: false, error: 'Elige una empresa válida' };
  if (n.length < 3 || n.length > 60) return { ok: false, error: 'El nombre del plan debe tener entre 3 y 60 caracteres' };
  if (!RESPONSABLES.includes(resp)) return { ok: false, error: 'Elige un responsable de la lista' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha ?? '') || fecha < HOY) return { ok: false, error: 'La fecha límite no puede ser anterior a hoy' };
  guardar([...getPlanes(), { id: 'n' + Date.now(), empresaId: emp.id, nombre: n, estado: COLUMNAS[0], avance: 0, resp, fecha }]);
  return { ok: true };
}
