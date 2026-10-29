/**
 * Reglas del módulo de eventos (Director): embudo, check-in por QR, creación/confirmación y segmentación.
 * Sin DOM. Los cambios se guardan en store.eventos / store.asistencia (localStorage).
 */
import { store } from '../../../core/db/store.js';
import { EVENTOS, ASISTENCIA, DIRECTORIO, HOY, XP_CHECKIN } from '../../../core/db/data.js';
import { esFecha } from '../../../shared/utils/dates.js';

export const getEventos = () => store.get().eventos ?? EVENTOS;
export const getAsistencia = id => (store.get().asistencia ?? ASISTENCIA)[id] ?? [];
const guardarEventos = l => store.set({ eventos: l });
const guardarPersonas = (id, l) => store.set({ asistencia: { ...(store.get().asistencia ?? ASISTENCIA), [id]: l } });
const pct = (a, b) => (b ? Math.round(a / b * 100) : 0);

/** Embudo de conversión: convocados → inscritos → asistentes */
export const embudo = ev => ({ conv: ev.convocados, insc: ev.inscritos, asis: ev.asistentes,
  wInsc: pct(ev.inscritos, ev.convocados), wAsis: pct(ev.asistentes, ev.convocados), pctConv: pct(ev.asistentes, ev.convocados), pctAsis: pct(ev.asistentes, ev.inscritos) });

export function crearEvento({ nombre, fecha, hora, convocados }){
  const n = String(nombre ?? '').trim(), c = Number(convocados);
  if (n.length < 3 || n.length > 60) return { ok: false, error: 'El nombre debe tener entre 3 y 60 caracteres' };
  if (!esFecha(fecha) || fecha < HOY) return { ok: false, error: 'La fecha no puede ser anterior a hoy' };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora ?? '')) return { ok: false, error: 'Indica una hora válida' };
  if (!Number.isInteger(c) || c < 1 || c > 5000) return { ok: false, error: 'Los convocados deben ser un entero entre 1 y 5.000' };
  const id = 'ev' + Date.now();
  guardarEventos([...getEventos(), { id, nombre: n, fecha, hora, estado: 'Borrador', convocados: c, inscritos: 0, asistentes: 0 }]);
  return { ok: true, id };
}
/** Borrador → Confirmada (habilita inscripciones y check-in) */
export function confirmarEvento(id){
  const ev = getEventos().find(e => e.id === id);
  if (!ev) return { ok: false, error: 'El evento no existe' };
  if (ev.estado !== 'Borrador') return { ok: false, error: 'Solo se confirman eventos en borrador' };
  if (ev.fecha < HOY) return { ok: false, error: 'La fecha del evento ya pasó: edítala antes de confirmar' };
  guardarEventos(getEventos().map(e => (e.id === id ? { ...e, estado: 'Confirmada' } : e)));
  return { ok: true };
}
/** Check-in por QR (simulado): el siguiente inscrito pasa a "Asistió" y suma XP al instante. Solo eventos confirmados. */
export function simularCheckin(id){
  const ev = getEventos().find(e => e.id === id);
  if (!ev) return { ok: false, motivo: 'El evento no existe' };
  if (ev.estado !== 'Confirmada') return { ok: false, motivo: 'Confirma el evento para habilitar el check-in' };
  const lista = getAsistencia(id), p = lista.find(x => x.estado === 'Inscrito');
  if (!p) return { ok: false, motivo: 'No quedan inscritos pendientes de check-in' };
  guardarPersonas(id, lista.map(x => (x.id === p.id ? { ...x, estado: 'Asistió' } : x)));
  guardarEventos(getEventos().map(e => (e.id === id ? { ...e, asistentes: e.asistentes + 1 } : e)));
  return { ok: true, persona: p, xp: XP_CHECKIN };
}
/** Segmentación por reglas sobre el directorio (sector, sin asistencia previa, ficha mínima) */
export function segmentar({ sectorId, sinAsistencia, fichaMin }){
  const asistieron = new Set(getEventos().flatMap(e => getAsistencia(e.id)).filter(p => p.estado === 'Asistió').map(p => p.empresaId));
  const fus = store.get().fusionadas ?? [];
  return DIRECTORIO.filter(e => !e.dupDe && !fus.includes(e.id))
    .filter(e => !sectorId || e.sectorId === sectorId)
    .filter(e => !sinAsistencia || !asistieron.has(e.id))
    .filter(e => !fichaMin || e.salud > fichaMin);
}
