/**
 * Reglas de automatización (sin DOM). Modelo: { id, nombre, cuando:{tipo,n}, si:{tipo}, entonces:{tipo,plantilla}, estado }.
 * Negocio:
 *  - Estados: Borrador → Activo ⇄ Pausado. Solo se activa una regla válida y no equivalente a otra.
 *  - Un Activo no se elimina (se pausa primero). Nombres únicos; no hay dos reglas equivalentes.
 *  - "Plan activo" solo aplica a reglas de planes. Los canales externos (WhatsApp/correo) NUNCA se envían a
 *    empresas sin autorización de tratamiento de datos (Ley 1581), aunque la regla no lo pida.
 *  - Idempotencia: una regla no dispara dos veces el mismo mensaje a la misma empresa por el mismo motivo.
 *  - Las ejecuciones son SIMULADAS y quedan en un registro auditable (store.autoLog).
 */
import { store } from '../../../core/db/store.js';
import { REGLAS, CUANDO, SI, ENTONCES, AUTORIZACIONES, DIRECTORIO, COLUMNAS, HOY, AHORA } from '../../../core/db/data.js';
import { norm } from '../../../shared/utils/text.js';
import { getCitas } from '../../agenda/services/citas.js';
import { getPlanes } from '../../intervenciones/services/planes.js';
import { getEventos, getAsistencia } from '../../agenda/services/agenda.js';
import { addDias, largo, hora12 } from '../../../shared/utils/dates.js';

export const ESTADOS = ['Activo', 'Pausado', 'Borrador'];
export const getReglas = () => store.get().reglas ?? REGLAS;
export const getLog = () => store.get().autoLog ?? [];
const guardar = l => store.set({ reglas: l });
const FIN = COLUMNAS[3];
const nombreEmpresa = id => DIRECTORIO.find(e => e.id === id)?.nombre ?? '—';
export { nombreEmpresa };

/** Textos del lienzo para una regla */
export const describir = r => ({
  cuando: { titulo: CUANDO[r.cuando.tipo].texto.replace('{n}', r.cuando.n), fuente: CUANDO[r.cuando.tipo].fuente, ruta: CUANDO[r.cuando.tipo].ruta, query: CUANDO[r.cuando.tipo].query },
  si: { titulo: SI[r.si.tipo].texto, fuente: SI[r.si.tipo].fuente },
  entonces: { titulo: ENTONCES[r.entonces.tipo].texto, fuente: r.entonces.plantilla }
});
const bajo = s => s.charAt(0).toLowerCase() + s.slice(1);
export const resumen = r => { const d = describir(r); return [`CUANDO · ${bajo(d.cuando.titulo)}`, `SI · ${bajo(d.si.titulo)}`, `ENTONCES · ${ENTONCES[r.entonces.tipo].verbo}`]; };
const equivalentes = (a, b) => a.cuando.tipo === b.cuando.tipo && (a.cuando.n ?? null) === (b.cuando.n ?? null) && a.si.tipo === b.si.tipo && a.entonces.tipo === b.entonces.tipo && a.entonces.plantilla === b.entonces.plantilla;

/** Valida y normaliza una regla; `propio` = id que se ignora al buscar duplicados (al activar) */
export function validar(d, propio = null){
  const nombre = String(d.nombre ?? '').trim();
  const c = CUANDO[d.cuando?.tipo], s = SI[d.si?.tipo], e = ENTONCES[d.entonces?.tipo];
  if (nombre.length < 3 || nombre.length > 60) return { ok: false, error: 'El nombre debe tener entre 3 y 60 caracteres' };
  if (!c || !s || !e) return { ok: false, error: 'Completa CUANDO, SI y ENTONCES' };
  let n;
  if (c.param){
    n = Number(d.cuando.n);
    const bien = c.param.opciones ? c.param.opciones.includes(n) : Number.isInteger(n) && n >= c.param.min && n <= c.param.max;
    if (!bien) return { ok: false, error: c.param.opciones ? `${c.param.etiqueta}: elige ${c.param.opciones.join(' o ')}` : `${c.param.etiqueta}: un entero entre ${c.param.min} y ${c.param.max}` };
  }
  if (!e.plantillas.includes(d.entonces.plantilla)) return { ok: false, error: 'Elige una plantilla válida para esa acción' };
  if (d.si.tipo === 'plan_activo' && d.cuando.tipo !== 'plan_vencido') return { ok: false, error: '“Plan activo” solo aplica a reglas de planes vencidos' };
  const regla = { id: d.id, nombre, cuando: c.param ? { tipo: d.cuando.tipo, n } : { tipo: d.cuando.tipo }, si: { tipo: d.si.tipo }, entonces: { tipo: d.entonces.tipo, plantilla: d.entonces.plantilla }, estado: d.estado ?? 'Borrador' };
  const otras = getReglas().filter(r => r.id !== propio);
  if (otras.some(r => norm(r.nombre) === norm(nombre))) return { ok: false, error: 'Ya existe una regla con ese nombre' };
  const eq = otras.find(r => equivalentes(r, regla));
  if (eq) return { ok: false, error: `Ya existe una regla equivalente: “${eq.nombre}”` };
  return { ok: true, regla };
}
export function crear(datos){
  const v = validar(datos); if (!v.ok) return v;
  const regla = { ...v.regla, id: 'r' + Date.now(), estado: 'Borrador' };   // toda regla nueva nace en Borrador (revisión humana)
  guardar([...getReglas(), regla]); return { ok: true, regla };
}
export function cambiarEstado(id, destino){
  const r = getReglas().find(x => x.id === id); if (!r) return { ok: false, error: 'La regla no existe' };
  const permitido = { Borrador: ['Activo'], Activo: ['Pausado'], Pausado: ['Activo'] }[r.estado] ?? [];
  if (!permitido.includes(destino)) return { ok: false, error: `Una regla ${r.estado.toLowerCase()} no puede pasar a ${destino.toLowerCase()}` };
  if (destino === 'Activo'){ const v = validar(r, r.id); if (!v.ok) return v; }
  guardar(getReglas().map(x => (x.id === id ? { ...x, estado: destino } : x))); return { ok: true };
}
export function eliminar(id){
  const r = getReglas().find(x => x.id === id); if (!r) return { ok: false, error: 'La regla no existe' };
  if (r.estado === 'Activo') return { ok: false, error: 'Pausa la regla antes de eliminarla' };
  guardar(getReglas().filter(x => x.id !== id)); return { ok: true };
}

/** Asistente: interpreta una frase en lenguaje natural (heurística local; el contrato permite cambiarla por un LLM). */
export function interpretar(texto){
  const t = norm(String(texto ?? '').slice(0, 200)); if (t.length < 6) return { ok: false, error: 'Describe la regla con una frase (por ejemplo: “Avísame si un plan lleva 7 días vencido”)' };
  const num = re => { const m = t.match(re); return m ? Number(m[1]) : null; };
  let cuando, si;
  if (/vencid|atrasad/.test(t)){ cuando = { tipo: 'plan_vencido', n: num(/(\d+)\s*dia/) ?? 7 }; si = 'plan_activo'; }
  else if (/seguimiento|\d+\s*mes/.test(t)){ cuando = { tipo: 'seguimiento', n: num(/(\d+)\s*mes/) ?? 3 }; si = 'autorizo_datos'; }
  else if (/inscri/.test(t)){ cuando = { tipo: 'nuevo_inscrito' }; si = 'autorizo_datos'; }
  else if (/cita|asesoria|recordator/.test(t)){ cuando = { tipo: 'cita_proxima', n: num(/(\d+)\s*h/) ?? 24 }; si = 'contacto_activo'; }
  else return { ok: false, error: 'No identifiqué el evento. Menciona planes vencidos, citas, inscritos o seguimiento.' };
  const canal = /whats|wasap/.test(t) ? 'whatsapp' : /correo|email|mail/.test(t) ? 'correo' : /avis|alert|notific/.test(t) ? 'avisar' : (cuando.tipo === 'plan_vencido' ? 'avisar' : cuando.tipo === 'cita_proxima' ? 'whatsapp' : 'correo');
  const plantilla = canal === 'avisar' ? 'Alerta' : cuando.tipo === 'nuevo_inscrito' ? 'Bienvenida' : cuando.tipo === 'cita_proxima' ? 'Recordatorio' : 'Seguimiento';
  const entonces = { tipo: canal, plantilla };
  if (!ENTONCES[canal].plantillas.includes(plantilla)) entonces.plantilla = ENTONCES[canal].plantillas[0];
  const corto = canal === 'avisar' ? 'alertar asesor' : canal === 'whatsapp' ? 'WhatsApp' : entonces.plantilla.toLowerCase();
  let nombre = cuando.tipo === 'seguimiento' ? `Seguimiento a ${cuando.n} meses` : `${CUANDO[cuando.tipo].corto} → ${corto}`;
  if (getReglas().some(r => norm(r.nombre) === norm(nombre))) nombre += ' (2)';
  const regla = { nombre, cuando, si: { tipo: si }, entonces };
  return { ok: true, regla, chips: resumen(regla) };
}

const fechaHora = ms => new Date(ms).toISOString().slice(0, 16).replace('T', ' ');
/** Vista previa: a qué empresas dispararía la regla, cuándo, y qué se omite (condición SI o falta de autorización) */
export function disparos(r){
  const dir = new Map(DIRECTORIO.filter(e => !e.dupDe && !(store.get().fusionadas ?? []).includes(e.id)).map(e => [e.id, e]));
  let base = [];
  const { tipo, n } = r.cuando;
  if (tipo === 'cita_proxima') base = getCitas().filter(c => (c.estado === 'Pendiente' || c.estado === 'Confirmada') && c.fecha >= HOY)
    .map(c => ({ empresaId: c.empresaId, ref: c.id, cuando: fechaHora(Date.parse(`${c.fecha}T${c.hora}:00Z`) - n * 3600000), detalle: `${c.tema} · ${largo(c.fecha)} ${hora12(c.hora)}` }))
    .filter(x => x.cuando >= AHORA.replace('T', ' '));
  if (tipo === 'plan_vencido') base = getPlanes().filter(p => p.estado !== FIN).map(p => ({ empresaId: p.empresaId, ref: p.id, plan: p, cuando: (addDias(p.fecha, n) < HOY ? HOY : addDias(p.fecha, n)), detalle: p.nombre }));
  if (tipo === 'seguimiento') base = getPlanes().filter(p => p.estado === FIN).map(p => ({ empresaId: p.empresaId, ref: p.id, plan: p, cuando: addDias(p.fecha, n * 30), detalle: `${p.nombre} · +${n} meses` }));
  if (tipo === 'nuevo_inscrito') base = getEventos().flatMap(ev => getAsistencia(ev.id).filter(a => a.estado === 'Inscrito').map(a => ({ empresaId: a.empresaId, ref: a.id, cuando: HOY, detalle: `${a.nombre} · ${ev.nombre}` })));
  const items = []; let noCumple = 0, omitidas = 0;
  for (const x of base){
    const emp = dir.get(x.empresaId);
    const cumple = !!emp && (r.si.tipo === 'contacto_activo' ? emp.estado !== 'Por revisar' : r.si.tipo === 'plan_activo' ? x.plan && x.plan.estado !== FIN : r.si.tipo === 'autorizo_datos' ? AUTORIZACIONES[x.empresaId] !== false : true);
    if (!cumple){ noCumple++; continue; }
    if (ENTONCES[r.entonces.tipo].externo && AUTORIZACIONES[x.empresaId] === false){ omitidas++; items.push({ ...x, omitido: 'Sin autorización de datos' }); continue; }
    items.push(x);
  }
  return { items, enviables: items.filter(i => !i.omitido), noCumple, omitidas };
}
/** Prueba (simulada): registra cada disparo una sola vez. Devuelve cuántos son nuevos y cuántos ya estaban */
export function probar(id){
  const r = getReglas().find(x => x.id === id); if (!r) return { ok: false, error: 'La regla no existe' };
  const log = getLog(), claves = new Set(log.map(l => l.clave)), d = disparos(r);
  const nuevos = d.enviables.map(i => ({ clave: `${r.id}|${i.empresaId}|${i.ref}|${i.cuando}`, reglaId: r.id, empresaId: i.empresaId, cuando: i.cuando, canal: r.entonces.tipo, simulado: true, fecha: HOY }))
    .filter(l => !claves.has(l.clave));
  if (nuevos.length) store.set({ autoLog: [...log, ...nuevos] });
  return { ok: true, nuevos: nuevos.length, repetidos: d.enviables.length - nuevos.length, omitidas: d.omitidas };
}
export const ejecucionesDe = id => getLog().filter(l => l.reglaId === id).length;
