/** Reglas de asesorías (Docente): agendar sin cruces, confirmar, cancelar y registrar el acta. Sin DOM. */
import { store } from '../../../core/db/store.js';
import { CITAS, DIRECTORIO, HOY, HORAS_CITA } from '../../../core/db/data.js';
import { esFecha, diaSemana } from '../../../shared/utils/dates.js';

export const getCitas = () => store.get().citas ?? CITAS;
const guardar = l => store.set({ citas: l });
const cambiar = (id, patch) => guardar(getCitas().map(c => (c.id === id ? { ...c, ...patch } : c)));
export const citasDe = empresaId => getCitas().filter(c => c.empresaId === empresaId);

export function agendar({ empresaId, tema, fecha, hora }){
  const t = String(tema ?? '').trim();
  const emp = DIRECTORIO.find(e => e.id === empresaId && !e.dupDe && !(store.get().fusionadas ?? []).includes(e.id));
  if (!emp) return { ok: false, error: 'Elige una empresa válida' };
  if (t.length < 3 || t.length > 40) return { ok: false, error: 'El tema debe tener entre 3 y 40 caracteres' };
  if (!esFecha(fecha) || fecha < HOY) return { ok: false, error: 'La fecha no puede ser anterior a hoy' };
  if (diaSemana(fecha) > 4) return { ok: false, error: 'Las asesorías se agendan de lunes a viernes' };
  if (!HORAS_CITA.includes(hora)) return { ok: false, error: 'Elige una hora de la lista' };
  if (getCitas().some(c => c.fecha === fecha && c.hora === hora && c.estado !== 'Cancelada')) return { ok: false, error: 'Ya tienes una cita a esa hora' };
  const id = 'c' + Date.now();
  guardar([...getCitas(), { id, empresaId: emp.id, tema: t, fecha, hora, estado: 'Pendiente', acta: null }]);
  return { ok: true, id };
}
export function confirmar(id){
  const c = getCitas().find(x => x.id === id);
  if (!c || c.estado !== 'Pendiente') return { ok: false, error: 'Solo se confirman citas pendientes' };
  cambiar(id, { estado: 'Confirmada' }); return { ok: true };
}
export function cancelar(id){
  const c = getCitas().find(x => x.id === id);
  if (!c || c.estado === 'Realizada' || c.estado === 'Cancelada') return { ok: false, error: 'Esta cita ya no se puede cancelar' };
  cambiar(id, { estado: 'Cancelada' }); return { ok: true };
}
/** Guardar el acta marca la cita como Realizada (solo desde Confirmada o Realizada) */
export function guardarActa(id, { acuerdos, proximo }){
  const c = getCitas().find(x => x.id === id), a = String(acuerdos ?? '').trim(), p = String(proximo ?? '').trim();
  if (!c || (c.estado !== 'Confirmada' && c.estado !== 'Realizada')) return { ok: false, error: 'Confirma la cita antes de registrar el acta' };
  if (a.length < 5 || a.length > 1000) return { ok: false, error: 'Los acuerdos deben tener entre 5 y 1.000 caracteres' };
  if (p.length > 300) return { ok: false, error: 'El próximo paso admite hasta 300 caracteres' };
  cambiar(id, { estado: 'Realizada', acta: { acuerdos: a, proximo: p } }); return { ok: true };
}
