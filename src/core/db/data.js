/** Datos de demostración y configuración estática (reemplazar por llamadas a core/api/httpClient.js o core/db/indexedDB.js) */
export const initialFiles = ['atenciones_2026.xlsx', 'eventos.xlsx'];
export const TOTALS = { atenciones: 569, unicas: 497 };
export const conflicts = [
  { id: 'c1', a: 'Panadería San José', b: 'Panad. San Jose', status: 'Por revisar' },
  { id: 'c2', a: 'Café Páramo SAS', b: 'Café Páramo', status: 'Fusionado' },
  { id: 'c3', a: 'Textiles Andes', b: 'Textil Andes', status: 'Descartado' }
];

/* ---------- Centro de mando (P3) ---------- */
export const PERIODO = '2026-2';
export const KPIS = [
  { id: 'unicas', valor: 497, label: 'Empresas únicas', icon: 'building', to: '/empresas' },
  { id: 'atenciones', valor: 569, label: 'Atenciones', icon: 'clip', to: '/intervenciones' },
  { id: 'unab', valor: 37, sufijo: '%', label: 'Comunidad UNAB', icon: 'users', to: '/empresas', query: { origen: 'unab' } },
  { id: 'planes', valor: null, label: 'Cumplimiento de planes', icon: 'target', vacio: 'Sin datos aún', to: '/intervenciones', destacado: true }
];
export const PLANES_VENCIDOS = 12;
/** v = % de empresas por sector (el ancho de la barra es v / MAX_SECTOR) */
export const SECTORES = [
  { id: 'alimentos', nombre: 'Alimentos', v: 28 }, { id: 'comercio', nombre: 'Comercio', v: 20 },
  { id: 'servicios', nombre: 'Servicios', v: 14 }, { id: 'manufactura', nombre: 'Manufactura', v: 11 },
  { id: 'turismo', nombre: 'Turismo', v: 7 }
];
export const MAX_SECTOR = 32;
export const PREGUNTA_EJEMPLO = '¿Cuáles son las mayores brechas en Alimentos frente a Manufactura?';
export const SUGERENCIAS = [
  { label: 'Brechas por sector', to: '/empresas', query: { vista: 'brechas' } },
  { label: 'Empresas sin sector', to: '/empresas', query: { sector: 'sin-sector' } },
  { label: 'Asistencia vs inscritos', to: '/agenda', query: { vista: 'asistencia' } }
];
/** P3 · Directorio de empresas (muestra del diseño). sectorId referencia SECTORES; dupDe apunta a la ficha canónica. */
export const DIRECTORIO = [
  { id: 'e101', nombre: 'Panadería San José', sectorId: 'alimentos', salud: 85, estado: 'Activa', unab: true },
  { id: 'e102', nombre: 'Ferretería El Tornillo', sectorId: 'comercio', salud: 72, estado: 'Activa', unab: false },
  { id: 'e103', nombre: 'Textiles Andes', sectorId: 'manufactura', salud: 64, estado: 'Incompleta', unab: true },
  { id: 'e104', nombre: 'Café Páramo', sectorId: 'alimentos', salud: 91, estado: 'Activa', unab: true },
  { id: 'e105', nombre: 'Hotel Mirador', sectorId: 'turismo', salud: 48, estado: 'Incompleta', unab: false },
  { id: 'e107', nombre: 'Digital Norte', sectorId: 'servicios', salud: 78, estado: 'Activa', unab: false },
  { id: 'e108', nombre: 'Dulces Sol', sectorId: 'alimentos', salud: 88, estado: 'Activa', unab: true },
  { id: 'e106', nombre: 'Panad. San Jose', sectorId: 'alimentos', salud: 40, estado: 'Por revisar', unab: false, dupDe: 'e101' }
];
export const FILTROS_ESTADO = ['Todas', 'Activa', 'Incompleta', 'Por revisar', 'Comunidad UNAB'];
/** Muestra para el buscador Ctrl+K (Expediente 360°): solo fichas canónicas del directorio */
export const EMPRESAS = DIRECTORIO.filter(e => !e.dupDe).map(e => ({ id: e.id, nombre: e.nombre, sector: SECTORES.find(s => s.id === e.sectorId).nombre }));

/* ---------- Expediente 360° (P5) ---------- */
/** Áreas del radar de capacidades (orden = sentido horario desde arriba) */
export const AREAS = [
  { id: 'finanzas', nombre: 'Finanzas' }, { id: 'mercadeo', nombre: 'Mercadeo' }, { id: 'operaciones', nombre: 'Operaciones' },
  { id: 'talento', nombre: 'Talento' }, { id: 'digital', nombre: 'Digital' }
];
export const TIPOS_EVENTO = ['Asesoría', 'Evento', 'Plan', 'Impacto', 'Diagnóstico'];
/** Datos base por empresa (id de DIRECTORIO). fecha = AAAA-MM. radar: % por área. */
export const EXPEDIENTES = {
  e101: { ciudad: 'Bucaramanga', contacto: 'María Rojas', empleados: 8, periodo: '2026-2',
    radar: { inicial: { finanzas: 15, mercadeo: 40, operaciones: 60, talento: 45, digital: 30 }, actual: { finanzas: 30, mercadeo: 60, operaciones: 75, talento: 65, digital: 55 } },
    linea: [
      { id: 't1', tipo: 'Asesoría', titulo: 'Diagnóstico inicial', fecha: '2026-03', detalle: 'Brechas en finanzas y mercadeo' },
      { id: 't2', tipo: 'Evento', titulo: 'Taller de costos', fecha: '2026-05', detalle: 'Asistió · +120 XP' },
      { id: 't3', tipo: 'Plan', titulo: 'Plan de acción firmado', fecha: '2026-08', detalle: '3 compromisos' },
      { id: 't4', tipo: 'Impacto', titulo: 'Validación CDE', fecha: '2026-10', detalle: 'Impacto: +18% ventas' }] },
  e102: { ciudad: 'Floridablanca', contacto: 'Jorge Mejía', empleados: 5, periodo: '2026-2',
    radar: { inicial: { finanzas: 35, mercadeo: 25, operaciones: 50, talento: 40, digital: 20 }, actual: { finanzas: 50, mercadeo: 35, operaciones: 60, talento: 45, digital: 30 } },
    linea: [{ id: 't1', tipo: 'Asesoría', titulo: 'Diagnóstico inicial', fecha: '2026-04', detalle: 'Brecha en mercadeo y digital' }, { id: 't2', tipo: 'Plan', titulo: 'Plan de acción firmado', fecha: '2026-06', detalle: '2 compromisos' }] },
  e103: { ciudad: 'Bucaramanga', contacto: 'Laura Prada', empleados: 14, periodo: '2026-2',
    radar: { inicial: { finanzas: 45, mercadeo: 30, operaciones: 40, talento: 50, digital: 25 }, actual: { finanzas: 55, mercadeo: 40, operaciones: 55, talento: 55, digital: 35 } },
    linea: [{ id: 't1', tipo: 'Asesoría', titulo: 'Diagnóstico inicial', fecha: '2026-03', detalle: 'Brecha en operaciones' }, { id: 't2', tipo: 'Evento', titulo: 'Feria de proveedores', fecha: '2026-07', detalle: 'Asistió · +80 XP' }] },
  e104: { ciudad: 'Piedecuesta', contacto: 'Camilo Duarte', empleados: 11, periodo: '2026-2',
    radar: { inicial: { finanzas: 50, mercadeo: 55, operaciones: 65, talento: 55, digital: 40 }, actual: { finanzas: 70, mercadeo: 75, operaciones: 80, talento: 65, digital: 60 } },
    linea: [{ id: 't1', tipo: 'Asesoría', titulo: 'Diagnóstico inicial', fecha: '2026-02', detalle: 'Brecha en digital' }, { id: 't2', tipo: 'Plan', titulo: 'Plan de acción firmado', fecha: '2026-04', detalle: '3 compromisos' }, { id: 't3', tipo: 'Impacto', titulo: 'Validación CDE', fecha: '2026-09', detalle: 'Impacto: +12% ventas' }] },
  e105: { ciudad: 'Girón', contacto: 'Sandra Villamizar', empleados: 6, periodo: '2026-2',
    radar: { inicial: { finanzas: 20, mercadeo: 30, operaciones: 35, talento: 30, digital: 15 }, actual: { finanzas: 20, mercadeo: 30, operaciones: 35, talento: 30, digital: 15 } },
    linea: [{ id: 't1', tipo: 'Asesoría', titulo: 'Diagnóstico inicial', fecha: '2026-08', detalle: 'Ficha incompleta: faltan datos de contacto' }] }
};

EXPEDIENTES.e107 = { ciudad: 'Bucaramanga', contacto: 'Andrés Mora', empleados: 9, periodo: '2026-2',
  radar: { inicial: { finanzas: 40, mercadeo: 45, operaciones: 50, talento: 50, digital: 60 }, actual: { finanzas: 50, mercadeo: 60, operaciones: 55, talento: 55, digital: 70 } },
  linea: [{ id: 't1', tipo: 'Asesoría', titulo: 'Diagnóstico inicial', fecha: '2026-05', detalle: 'Brecha en ventas y finanzas' }] };
EXPEDIENTES.e108 = { ciudad: 'Floridablanca', contacto: 'Paula Gómez', empleados: 4, periodo: '2026-2',
  radar: { inicial: { finanzas: 25, mercadeo: 40, operaciones: 55, talento: 40, digital: 30 }, actual: { finanzas: 55, mercadeo: 50, operaciones: 60, talento: 45, digital: 35 } },
  linea: [{ id: 't1', tipo: 'Asesoría', titulo: 'Diagnóstico inicial', fecha: '2026-04', detalle: 'Brecha en contabilidad' }] };

/* ---------- Planes de acción / Kanban (P6) ---------- */
/** Fecha de referencia de la demo (para calcular "Vencido" de forma determinista) */
export const HOY = '2026-10-29';
export const COLUMNAS = ['Pendiente', 'En ejecución', 'En validación CDE', 'Completado con impacto'];
export const RESPONSABLES = ['Ana', 'Luis', 'Sara'];
export const USUARIO_DOCENTE = 'Ana';   // el Docente de la demo
export const XP_COMPLETADO = 300;
export const PLANES = [
  { id: 'p1', empresaId: 'e104', nombre: 'Marca propia', estado: 'Pendiente', avance: 0, resp: 'Luis', fecha: '2026-10-28' },
  { id: 'p2', empresaId: 'e105', nombre: 'Rediseñar oferta', estado: 'Pendiente', avance: 0, resp: 'Luis', fecha: '2026-11-20' },
  { id: 'p3', empresaId: 'e101', nombre: 'Lanzar tienda online', estado: 'En ejecución', avance: 55, resp: 'Ana', fecha: '2026-11-30' },
  { id: 'p4', empresaId: 'e103', nombre: 'Certificar calidad', estado: 'En ejecución', avance: 40, resp: 'Sara', fecha: '2026-12-02' },
  { id: 'p5', empresaId: 'e107', nombre: 'Plan de ventas', estado: 'En validación CDE', avance: 90, resp: 'Luis', fecha: '2026-11-05' },
  { id: 'p6', empresaId: 'e108', nombre: 'Contabilidad', estado: 'En validación CDE', avance: 95, resp: 'Sara', fecha: '2026-11-08' },
  { id: 'p7', empresaId: 'e102', nombre: 'Control de inventario', estado: 'Completado con impacto', avance: 100, resp: 'Ana', fecha: '2026-11-01', xp: 300 },
  { id: 'p8', empresaId: 'e101', nombre: 'Registrar costos', estado: 'Completado con impacto', avance: 100, resp: 'Ana', fecha: '2026-11-12', xp: 300 }
];

/* ---------- Agenda, eventos y asesorías (P7) ---------- */
export const XP_CHECKIN = 50;
export const EVENTOS = [
  { id: 'ev1', nombre: 'Taller de costos', fecha: '2026-11-24', hora: '14:00', estado: 'Confirmada', convocados: 320, inscritos: 148, asistentes: 96 },
  { id: 'ev2', nombre: 'Feria CDE', fecha: '2026-12-02', hora: '09:00', estado: 'Borrador', convocados: 250, inscritos: 0, asistentes: 0 },
  { id: 'ev0', nombre: 'Taller de costos', fecha: '2026-05-14', hora: '14:00', estado: 'Realizada', convocados: 200, inscritos: 90, asistentes: 61 }
];
/** Muestra nominal de personas por evento (los totales del embudo vienen del evento) */
export const ASISTENCIA = {
  ev1: [
    { id: 'a1', nombre: 'María Rojas', empresaId: 'e101', estado: 'Inscrito' },
    { id: 'a2', nombre: 'Laura Mejía', empresaId: 'e108', estado: 'Inscrito' },
    { id: 'a3', nombre: 'Pedro Gil', empresaId: 'e104', estado: 'Inscrito' },
    { id: 'a4', nombre: 'Ana Cruz', empresaId: 'e105', estado: 'No asistió' }
  ],
  ev2: [],
  ev0: [{ id: 'b1', nombre: 'María Rojas', empresaId: 'e101', estado: 'Asistió' }, { id: 'b2', nombre: 'Pedro Gil', empresaId: 'e104', estado: 'No asistió' }]
};
export const HORAS_CITA = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
export const CITAS = [
  { id: 'c1', empresaId: 'e101', tema: 'Costos', fecha: '2026-11-02', hora: '09:00', estado: 'Realizada', acta: null },
  { id: 'c2', empresaId: 'e104', tema: 'Marca', fecha: '2026-11-02', hora: '14:00', estado: 'Confirmada', acta: null },
  { id: 'c3', empresaId: 'e103', tema: 'Calidad', fecha: '2026-11-03', hora: '10:00', estado: 'Confirmada', acta: null },
  { id: 'c4', empresaId: 'e107', tema: 'Ventas', fecha: '2026-11-03', hora: '15:00', estado: 'Cancelada', acta: null },
  { id: 'c5', empresaId: 'e105', tema: 'Oferta', fecha: '2026-11-04', hora: '09:00', estado: 'Pendiente', acta: null },
  { id: 'c6', empresaId: 'e108', tema: 'Finanzas', fecha: '2026-11-05', hora: '11:00', estado: 'Pendiente', acta: null },
  { id: 'c7', empresaId: 'e102', tema: 'Inventario', fecha: '2026-11-06', hora: '08:00', estado: 'Confirmada', acta: null },
  { id: 'c8', empresaId: 'e101', tema: 'Costos', fecha: '2026-11-09', hora: '09:00', estado: 'Confirmada', acta: null }
];

/* ---------- Automatizaciones (P6) ---------- */
/** Catálogo del lienzo CUANDO → SI → ENTONCES. Los textos usan {n} para el parámetro. */
export const CUANDO = {
  cita_proxima:   { texto: 'Falta {n} h para la cita', fuente: 'Agenda', ruta: '/agenda', corto: 'Cita próxima', param: { etiqueta: 'Horas antes', min: 1, max: 72, def: 24 } },
  plan_vencido:   { texto: 'Plan vencido {n} días', fuente: 'Intervenciones', ruta: '/intervenciones', query: { filtro: 'vencidos' }, corto: 'Plan vencido', param: { etiqueta: 'Días de vencido', min: 1, max: 60, def: 7 } },
  nuevo_inscrito: { texto: 'Nuevo inscrito a un evento', fuente: 'Eventos', ruta: '/agenda', corto: 'Nuevo inscrito' },
  seguimiento:    { texto: '{n} meses tras la intervención', fuente: 'Expedientes', ruta: '/empresas', corto: 'Seguimiento', param: { etiqueta: 'Meses', opciones: [3, 6], def: 3 } }
};
export const SI = {
  contacto_activo: { texto: 'Contacto activo', fuente: 'CRM' },
  plan_activo:     { texto: 'Plan activo', fuente: 'Intervenciones' },
  autorizo_datos:  { texto: 'Autorizó tratamiento de datos', fuente: 'Ley 1581' }
};
export const ENTONCES = {
  whatsapp: { texto: 'Enviar WhatsApp', verbo: 'enviar WhatsApp', externo: true, plantillas: ['Recordatorio', 'Seguimiento'] },
  correo:   { texto: 'Enviar correo', verbo: 'enviar correo', externo: true, plantillas: ['Bienvenida', 'Seguimiento', 'Recordatorio'] },
  avisar:   { texto: 'Avisar al asesor', verbo: 'avisar', externo: false, plantillas: ['Alerta'] }
};
export const REGLAS = [
  { id: 'r1', nombre: 'Recordatorio de cita', cuando: { tipo: 'cita_proxima', n: 24 }, si: { tipo: 'contacto_activo' }, entonces: { tipo: 'whatsapp', plantilla: 'Recordatorio' }, estado: 'Activo' },
  { id: 'r2', nombre: 'Plan vencido → alertar asesor', cuando: { tipo: 'plan_vencido', n: 7 }, si: { tipo: 'plan_activo' }, entonces: { tipo: 'avisar', plantilla: 'Alerta' }, estado: 'Pausado' },
  { id: 'r3', nombre: 'Nuevo inscrito → bienvenida', cuando: { tipo: 'nuevo_inscrito' }, si: { tipo: 'autorizo_datos' }, entonces: { tipo: 'correo', plantilla: 'Bienvenida' }, estado: 'Borrador' }
];
/** Autorización de tratamiento de datos (Ley 1581 de 2012): false = no se le puede contactar por canales externos */
export const AUTORIZACIONES = { e105: false };
export const AHORA = HOY + 'T08:00';

/* ---------- Roles (antes roles.js) ----------
 * Matriz de roles: menú lateral y pantalla de inicio. Es configuración estática, por eso vive junto a los datos base. */
export const ROLES = {
  dir: { label: 'Director', avatar: 'JD', home: '/setup',
    menu: [['/dashboard','Centro de mando','dash'], ['/empresas','Empresas','building'], ['/agenda','Agenda y eventos','calendar'], ['/automatizaciones','Automatizaciones','zap']] },
  doc: { label: 'Docente', avatar: 'AP', home: '/intervenciones',
    menu: [['/intervenciones','Intervenciones','clip'], ['/empresas','Empresas','building'], ['/agenda','Agenda y eventos','calendar']] },
  emp: { label: 'Emprendedor', avatar: 'MR', home: '/mi-empresa',
    // 4.º elemento = etiquetas cortas para tablet (md) y móvil (sm)
    menu: [['/mi-empresa','Mi empresa','briefcase',{ md: 'Mi empresa', sm: 'Mi ruta' }], ['/academia','Academia','cap',{ md: 'Academia', sm: 'Academia' }], ['/agenda','Mis citas / eventos','calendar',{ md: 'Mis citas', sm: 'Citas' }]] }
};

/* ---------- Emprendedor: Mi empresa, Academia, Mis citas ---------- */
export const USUARIO_EMPRENDEDOR = { nombre: 'María Rojas', empresaId: 'e101', iniciales: 'MR' };
export const ASESOR_NOMBRE = 'Ana Pérez';
export const XP_MISION_CITA = 150;
/** Niveles por XP acumulado: el avance se mide contra el umbral del siguiente nivel (1.450 / 2.000 = 72 %) */
export const NIVELES = [
  { n: 1, nombre: 'Idea en Semilla', desde: 0 }, { n: 2, nombre: 'Emprendimiento Activo', desde: 500 },
  { n: 3, nombre: 'Empresa en Tracción', desde: 1000 }, { n: 4, nombre: 'Empresa Consolidada', desde: 2000 }
];
export const PERFIL = { xp: 1450, xpSemana: 320, racha: 5, dias: [1, 1, 1, 1, 1, 0, 0] };
export const DIAS_RACHA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export const MEDALLAS = [{ id: 'primer_plan', nombre: 'Primer plan' }, { id: 'constante', nombre: 'Constante' }, { id: 'despegue', nombre: 'Despegue' }, { id: 'lider', nombre: 'Líder' }, { id: 'referente', nombre: 'Referente' }];

/* ---------- Academia (Emprendedor) ---------- */
/** Misiones: pasos 'leer' (se confirman) o 'quiz' (opciones + índice correcto). xp se otorga UNA vez al completar. */
export const MISIONES = [
  { id: 'm1', tipo: 'Píldora', titulo: 'Costos en 5 minutos', area: 'finanzas', xp: 150, minutos: 5, nivelMin: 1, pasos: [
    { t: 'leer', titulo: '¿Qué es el costo unitario?', texto: 'Es lo que te cuesta producir UNA unidad: materia prima + mano de obra + costos indirectos, divididos entre las unidades producidas.' },
    { t: 'leer', titulo: 'No olvides los costos ocultos', texto: 'Empaques, transporte, desperdicio y tu propio tiempo también cuentan. Si no los incluyes, tu margen real es menor al que crees.' },
    { t: 'quiz', titulo: 'Comprueba lo aprendido', pregunta: 'Una panadería gasta $600.000 en insumos y $200.000 en mano de obra para producir 400 panes. ¿Cuál es el costo unitario?', opciones: ['$1.500', '$2.000', '$800'], correcta: 1 }] },
  { id: 'm2', tipo: 'Quiz', titulo: 'Quiz de precios', area: 'mercadeo', xp: 100, minutos: 4, nivelMin: 1, pasos: [
    { t: 'quiz', titulo: 'Pregunta 1', pregunta: '¿Qué debe cubrir como mínimo un precio de venta?', opciones: ['Solo la materia prima', 'El costo total más una ganancia', 'El precio de la competencia'], correcta: 1 },
    { t: 'quiz', titulo: 'Pregunta 2', pregunta: 'Si subes el precio y las ventas bajan poco, tu demanda es…', opciones: ['Poco sensible al precio', 'Muy sensible al precio', 'Inexistente'], correcta: 0 },
    { t: 'quiz', titulo: 'Pregunta 3', pregunta: 'Si el costo unitario es $2.000 y quieres un margen de 25% sobre el costo, ¿cuánto cobras?', opciones: ['$2.250', '$2.500', '$2.600'], correcta: 1 }] },
  { id: 'm3', tipo: 'Meta', titulo: 'Subir a 3 clientes', area: 'mercadeo', xp: 150, minutos: 0, nivelMin: 1, pasos: [
    { t: 'leer', titulo: 'Primer cliente nuevo', texto: 'Registra tu primer cliente nuevo del periodo.' }, { t: 'leer', titulo: 'Segundo cliente nuevo', texto: 'Registra el segundo cliente nuevo.' }, { t: 'leer', titulo: 'Tercer cliente nuevo', texto: 'Registra el tercer cliente nuevo.' }] },
  { id: 'm4', tipo: 'Mentoría', titulo: 'Mentoría con experto', area: null, xp: 300, minutos: 0, nivelMin: 4, pasos: [{ t: 'leer', titulo: 'Sesión con tu mentor', texto: 'Se agenda con el CDE.' }] }
];
/** Estado inicial de progreso por misión (hechos = pasos cumplidos; cobrada = XP ya otorgado) */
export const MISION_INICIAL = { m1: { hechos: 0, cobrada: false }, m2: { hechos: 2, cobrada: false }, m3: { hechos: 3, cobrada: true }, m4: { hechos: 0, cobrada: false } };
export const RETO = { id: 'reto1', titulo: 'Sube tu ficha al 90%', meta: 90, bono: 200, fin: '2026-10-31T22:00' };
export const RESULTADOS = { ventas: '+18%', clientes: 2 };
/** Recompensas canjeables con saldo de XP (el nivel NO baja al canjear: el saldo se lleva aparte) */
export const RECOMPENSAS = [
  { id: 'rw1', nombre: 'Mentoría premium', costo: 1500, nivelMin: 4, nota: 'Nueva recompensa. Se abre al llegar al Nivel 4.' },
  { id: 'rw2', nombre: 'Cupo prioritario en taller CDE', costo: 300, nivelMin: 2, nota: 'Reserva tu cupo en el próximo taller del CDE.' }
];
