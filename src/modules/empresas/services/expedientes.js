/**
 * Lógica de negocio del Expediente 360°: fusiona los datos base con los cambios del usuario (store.expedientes),
 * valida entradas (0–100, longitudes) y calcula la síntesis. Sin DOM: solo datos.
 */
import { store } from '../../../core/db/store.js';
import { EXPEDIENTES, AREAS } from '../../../core/db/data.js';
import { planesDe, estaVencido } from '../../intervenciones/services/planes.js';
import { citasDe } from '../../agenda/services/citas.js';

export const clamp = n => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
const mesActual = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const fechaCorta = f => { const [y, m] = f.split('-'); const mes = MESES[+m - 1] ?? ''; return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${y}`; };
const over = id => store.get().expedientes?.[id] ?? {};

/** Expediente completo (base + cambios) o null si no existe */
export function getExpediente(id){
  const base = EXPEDIENTES[id]; if (!base) return null;
  const o = over(id);
  return {
    ...base, ...(o.ficha || {}),
    radar: { inicial: base.radar.inicial, actual: o.radarActual || base.radar.actual },
    planes: planesDe(id).map(p => ({ id: p.id, nombre: p.nombre, avance: p.avance, estado: estaVencido(p) ? 'Vencido' : p.estado })),
    linea: [...base.linea, ...(o.linea || []), ...citasDe(id).filter(c => c.estado === 'Realizada' && c.acta).map(c => ({ id: 'cita-' + c.id, tipo: 'Asesoría', titulo: `Asesoría: ${c.tema}`, fecha: c.fecha.slice(0, 7), detalle: c.acta.acuerdos.slice(0, 90) }))].sort((a, b) => a.fecha.localeCompare(b.fecha))
  };
}
const save = (id, patch) => store.set({ expedientes: { ...(store.get().expedientes || {}), [id]: { ...over(id), ...patch } } });

/** Docente: registra un nuevo diagnóstico (actualiza el radar y agrega un hito a la línea de tiempo) */
export function aplicarDiagnostico(id, puntajes, autor){
  if (!EXPEDIENTES[id]) return { ok: false, error: 'La empresa no existe' };
  const actual = Object.fromEntries(AREAS.map(a => [a.id, clamp(puntajes[a.id])]));
  const brecha = AREAS.reduce((m, a) => (actual[a.id] < actual[m.id] ? a : m), AREAS[0]);
  const hito = { id: 'd' + Date.now(), tipo: 'Diagnóstico', titulo: 'Diagnóstico aplicado', fecha: mesActual(), detalle: `${autor} · mayor brecha: ${brecha.nombre} (${actual[brecha.id]}%)` };
  save(id, { radarActual: actual, linea: [...(over(id).linea || []), hito] });
  return { ok: true };
}
/** Director: edita contacto y empleados con validación */
export function editarFicha(id, { contacto, empleados }){
  const c = String(contacto ?? '').trim(), n = Number(empleados);
  if (c.length < 2 || c.length > 80) return { ok: false, error: 'El contacto debe tener entre 2 y 80 caracteres' };
  if (!Number.isInteger(n) || n < 0 || n > 10000) return { ok: false, error: 'Los empleados deben ser un número entero entre 0 y 10.000' };
  save(id, { ficha: { contacto: c, empleados: n } });
  return { ok: true };
}
/** Síntesis calculada con los datos del expediente (sin servicios externos) */
export function sintesis(exp){
  const { inicial, actual } = exp.radar;
  const baja = AREAS.reduce((m, a) => (actual[a.id] < actual[m.id] ? a : m), AREAS[0]);
  const avance = AREAS.map(a => ({ a, d: actual[a.id] - inicial[a.id] })).sort((x, y) => y.d - x.d)[0];
  const cuenta = e => exp.planes.filter(p => p.estado === e).length;
  const l = [`Mayor brecha actual: ${baja.nombre} (${actual[baja.id]}%).`,
    avance.d > 0 ? `Mayor avance desde el diagnóstico inicial: ${avance.a.nombre} (+${avance.d} pts).` : 'Aún no hay avances registrados frente al diagnóstico inicial.'];
  l.push(exp.planes.length
    ? `Planes: ${cuenta('En ejecución')} en ejecución · ${cuenta('En validación CDE')} en validación CDE · ${cuenta('Pendiente')} pendiente(s) · ${cuenta('Vencido')} vencido(s).`
    : 'Sin planes de acción registrados: conviene definirlos tras el diagnóstico.');
  const imp = [...exp.linea].reverse().find(t => t.tipo === 'Impacto');
  if (imp) l.push(`Último impacto registrado: ${imp.detalle.replace(/^Impacto:\s*/, '')}.`);
  return l;
}
