/**
 * ADAPTADOR · contrato de integración con el backend (FrontEnd_Integración.pdf).
 * Traduce las respuestas JSON del contrato a las formas que ya consumen vistas y servicios, y las "hidrata" EN SITIO
 * (mismo array/objeto exportado por data.js), de modo que ningún consumidor tiene que cambiar de import.
 * Si el servidor no responde, se conservan los datos de demostración y se avisa una sola vez (la interfaz nunca se detiene).
 */
import { http, httpAi } from './httpClient.js';
import { store } from '../db/store.js';
import { DIRECTORIO, EMPRESAS, SECTORES, KPIS, TOTALS, EXPEDIENTES, PLANES, COLUMNAS, AREAS, PERFIL, PERIODO, USUARIO_EMPRENDEDOR, XP_COMPLETADO } from '../db/data.js';
import { toast } from '../../shared/utils/dom.js';
import { norm } from '../../shared/utils/text.js';

export const estadoApi = { demo: false };
/** Programas de la meta anual (GET /analytics/dashboard-bi → plan_accion_2026). Se rellena en sitio. */
export const PLAN_ACCION = [];

const replace = (arr, items) => arr.splice(0, arr.length, ...items);
const idApi = id => String(id).replace(/^e/, '');
const idFront = id => 'e' + id;

function avisar(err){
  console.warn('[api]', err?.message ?? err);
  if (!estadoApi.demo){ estadoApi.demo = true; toast('Sin conexión con el servidor: se muestran datos de demostración'); }
}
/** Ejecuta fn; ante error avisa (una vez) y devuelve null */
const seguro = async fn => { try { const r = await fn(); estadoApi.demo = false; return r; } catch (e) { avisar(e); return null; } };
const datos = r => { if (!r || r.success === false) throw new Error('Respuesta inválida del servidor'); return r; };

/* ───────── Catálogo de sectores (ids sembrados en schema_core_fixed.sql; Agroindustria no tiene id fijo) ───────── */
const CATALOGO = { 'sin-sector': 'Sin sector', alimentos: 'Alimentos', comercio: 'Comercio', servicios: 'Servicios', manufactura: 'Manufactura', turismo: 'Turismo',
  agropecuario: 'Agropecuario', tecnologia: 'Tecnología', construccion: 'Construcción', salud: 'Salud', educacion: 'Educación', transporte: 'Transporte y logística', otros: 'Otros', agroindustria: 'Agroindustria' };
const SECTOR_POR_ID = { 1: 'alimentos', 2: 'comercio', 3: 'servicios', 4: 'manufactura', 5: 'turismo', 6: 'agropecuario', 7: 'tecnologia', 8: 'construccion', 9: 'salud', 10: 'educacion', 11: 'transporte', 12: 'otros' };
export const nombreSector = id => !id ? CATALOGO['sin-sector'] : CATALOGO[id] ?? SECTORES.find(s => s.id === id)?.nombre ?? 'Otro sector';
const slugDeNombre = n => Object.keys(CATALOGO).find(k => norm(CATALOGO[k]) === norm(n)) ?? norm(n).replace(/\s+/g, '-');

/* ───────── 1. Directorio · GET /empresas ───────── */
function mapEmpresa(d){
  const estado = d.estado === 'activa' ? (d.ficha_estado === 'incompleta' ? 'Incompleta' : 'Activa')
    : d.estado === 'por_revisar' ? 'Por revisar' : String(d.estado).charAt(0).toUpperCase() + String(d.estado).slice(1);
  return { id: idFront(d.empresa_id), nombre: d.nombre_comercial, sectorId: d.sector_id == null ? null : SECTOR_POR_ID[d.sector_id] ?? 'sector-' + d.sector_id,
    salud: Number(d.ficha_pct) || 0, estado, unab: !!Number(d.es_comunidad_unab) };
}
let pEmpresas = null;
export function hidratarEmpresas(forzar = false){
  if (pEmpresas && !forzar) return pEmpresas;
  const p = seguro(async () => {
    const r = datos(await http.get('/empresas')), lista = r.data.map(mapEmpresa);
    replace(DIRECTORIO, lista);
    replace(EMPRESAS, lista.filter(e => !e.dupDe).map(e => ({ id: e.id, nombre: e.nombre, sector: nombreSector(e.sectorId) })));
    TOTALS.unicas = r.total ?? lista.length;
    return true;
  });
  pEmpresas = p; p.then(ok => { if (!ok && pEmpresas === p) pEmpresas = null; });
  return p;
}

/* ───────── 2. Expediente 360 · GET /empresas/:id/expediente-360 ───────── */
const TIPO_LINEA = { cita: 'Asesoría', proyecto: 'Asesoría', evento: 'Evento', plan: 'Plan', impacto: 'Impacto', diagnostico: 'Diagnóstico' };
export async function hidratarExpediente(id){
  const r = await seguro(async () => datos(await http.get(`/empresas/${idApi(id)}/expediente-360`)));
  if (!r) return false;
  const { gamificacion: g, timeline = [] } = r.data;
  const ceros = Object.fromEntries(AREAS.map(a => [a.id, 0]));
  const base = EXPEDIENTES[id] ?? { ciudad: '—', contacto: '—', empleados: 0, periodo: PERIODO, radar: { inicial: ceros, actual: ceros } };
  EXPEDIENTES[id] = { ...base, linea: timeline.map((t, i) => ({ id: 't' + i, tipo: TIPO_LINEA[t.tipo] ?? 'Evento', titulo: t.titulo, fecha: String(t.fecha).slice(0, 7), detalle: t.detalle ?? '' })) };
  if (g && id === USUARIO_EMPRENDEDOR.empresaId) PERFIL.xp = g.xp_total;
  return true;
}

/* ───────── 3. Dashboard BI · GET /analytics/dashboard-bi ───────── */
export async function hidratarDashboard(){
  const r = await seguro(async () => datos(await http.get('/analytics/dashboard-bi')));
  if (!r) return false;
  const { kpis: k, grafico_sectores: gs, plan_accion_2026: pa } = r.data;
  TOTALS.unicas = k.total_empresas; TOTALS.atenciones = k.atenciones_acumuladas;
  const valor = { unicas: k.total_empresas, atenciones: k.atenciones_acumuladas, unab: Math.round(k.comunidad_unab_pct) };
  KPIS.forEach(x => { if (x.id in valor) x.valor = valor[x.id]; });
  const serie = gs?.datasets?.[0]?.data ?? [], total = k.total_empresas || serie.reduce((a, b) => a + b, 0) || 1;
  replace(SECTORES, (gs?.labels ?? []).map((n, i) => ({ id: slugDeNombre(n), nombre: n, v: Math.round(100 * (serie[i] ?? 0) / total) })));
  replace(PLAN_ACCION, pa ?? []);
  return true;
}

/* ───────── 4. Kanban · GET /intervenciones/kanban y PATCH …/:id/move ───────── */
const ESTADOS_API = ['pendiente', 'en_ejecucion', 'en_validacion_cde', 'completado_con_impacto'];
export async function hidratarKanban(){
  await hidratarEmpresas();
  const r = await seguro(async () => datos(await http.get('/intervenciones/kanban')));
  if (!r) return false;
  const lista = [];
  ESTADOS_API.forEach((k, i) => (r.data[k] ?? []).forEach(c => lista.push({
    id: String(c.id), empresaId: DIRECTORIO.find(e => norm(e.nombre) === norm(c.empresa))?.id ?? '', nombre: c.titulo, estado: COLUMNAS[i],
    avance: Number(c.progreso) || 0, resp: c.responsable ?? '', fecha: String(c.fecha_limite ?? '').slice(0, 10), eje: c.eje, ...(i === 3 ? { xp: XP_COMPLETADO } : {}) })));
  replace(PLANES, lista);
  if (store.get().planes) store.set({ planes: null });   // descarta la copia local: manda el servidor
  return true;
}
/** Lanza (no traga) el error: la vista decide cómo revertir */
export const moverTarjeta = (id, destino, orden) =>
  http.patch(`/intervenciones/kanban/${id}/move`, { nuevo_estado: ESTADOS_API[COLUMNAS.indexOf(destino)], nuevo_orden: orden });

/* ───────── 5. IA · POST /empresas/check-duplicate y /planes/generate (silenciosas si la IA no está) ───────── */
const quieto = async fn => { try { return await fn(); } catch (e) { console.warn('[api-ia]', e?.message); return null; } };
export const verificarDuplicado = body => quieto(async () => datos(await httpAi.post('/empresas/check-duplicate', body)));

const EJE_IA = { finanzas: 'Financiera' };
/** Brechas en escala 0–5 a partir del radar (0–100) de la empresa */
function brechasDe(id){
  const act = EXPEDIENTES[id]?.radar?.actual ?? {};
  const b = Object.fromEntries(AREAS.filter(a => a.id in act).map(a => [EJE_IA[a.id] ?? a.nombre, Math.round(act[a.id] / 20 * 10) / 10]));
  return Object.values(b).some(v => v > 0) ? b : {};   // sin diagnóstico real no se inventan brechas
}
/** Títulos de tareas sugeridas por la IA para una empresa del directorio ([] si no hay respuesta) */
export async function sugerirTareas(empresa){
  const r = await quieto(async () => datos(await httpAi.post('/planes/generate', { razon_social: empresa.nombre, sector: nombreSector(empresa.sectorId), brechas: brechasDe(empresa.id) })));
  const tareas = r?.tareas ?? r?.data?.tareas ?? [];
  return tareas.map(t => typeof t === 'string' ? t : t.titulo ?? t.nombre ?? t.tarea).filter(Boolean);
}
