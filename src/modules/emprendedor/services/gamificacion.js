/**
 * Reglas de gamificación del Emprendedor (sin DOM).
 * - El nivel sale del XP acumulado; el avance se mide contra el umbral del SIGUIENTE nivel (1.450 / 2.000 = 72 %).
 * - Las medallas no se "regalan": se calculan (primer plan cerrado, racha ≥ 5, nivel ≥ 3 / ≥ 4, referente = nivel 4 + 3 planes).
 * - El XP solo sube (enteros de 1 a 1.000 por evento) y el motivo queda en el perfil para auditoría.
 */
import { store } from '../../../core/db/store.js';
import { getPerfil } from '../../../core/db/perfil.js';
import { NIVELES, MEDALLAS, USUARIO_EMPRENDEDOR, COLUMNAS } from '../../../core/db/data.js';
import { planesDe } from '../../intervenciones/services/planes.js';

export { getPerfil };
export function nivelDe(xp){
  const actual = NIVELES.filter(n => xp >= n.desde).at(-1) ?? NIVELES[0];
  const sig = NIVELES.find(n => n.n === actual.n + 1) ?? null;
  return { n: actual.n, nombre: actual.nombre, siguiente: sig?.desde ?? null, nivelSig: sig?.n ?? null,
    pct: sig ? Math.min(100, Math.floor(xp / sig.desde * 100)) : 100, faltan: sig ? Math.max(0, sig.desde - xp) : 0 };
}
export const planesCerrados = () => planesDe(USUARIO_EMPRENDEDOR.empresaId).filter(p => p.estado === COLUMNAS[3]).length;
export function medallas(){
  const p = getPerfil(), lv = nivelDe(p.xp), cerrados = planesCerrados();
  const ok = { primer_plan: cerrados >= 1, constante: p.racha >= 5, despegue: lv.n >= 3, lider: lv.n >= 4, referente: lv.n >= 4 && cerrados >= 3 };
  return MEDALLAS.map(m => ({ ...m, ganada: !!ok[m.id] }));
}
export function sumarXp(n, motivo){
  if (!Number.isInteger(n) || n < 1 || n > 1000) return { ok: false, error: 'La cantidad de XP no es válida' };
  const p = getPerfil(), antes = nivelDe(p.xp).n;
  const nuevo = { ...p, xp: p.xp + n, xpSemana: p.xpSemana + n, historial: [...(p.historial ?? []), { n, motivo: String(motivo ?? '').slice(0, 60) }] };
  store.set({ perfil: nuevo });
  const nivel = nivelDe(nuevo.xp);
  return { ok: true, nivel, subeNivel: nivel.n > antes };
}
