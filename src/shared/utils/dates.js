/** Utilidades de fecha (AAAA-MM-DD, calculadas en UTC para evitar desfases de zona horaria). Antes: services/fechas.js */
const parse = f => { const [y, m, d] = f.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const iso = d => d.toISOString().slice(0, 10);
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
export const DIAS_LARGO = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const esFecha = f => /^\d{4}-\d{2}-\d{2}$/.test(f ?? '') && iso(parse(f)) === f;
export const addDias = (f, n) => { const d = parse(f); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
export const diaSemana = f => (parse(f).getUTCDay() + 6) % 7;          // 0 = lunes … 6 = domingo
export const lunesDe = f => addDias(f, -diaSemana(f));
export const diaMes = f => { const [, m, d] = f.split('-'); return `${+d} ${MESES[+m - 1]}`; };
export const rangoSemana = lunes => `${diaMes(lunes)} al ${diaMes(addDias(lunes, 4))}`;
export const hora12 = h => { const [hh, mm] = h.split(':').map(Number); return `${hh % 12 || 12}:${String(mm).padStart(2, '0')}${hh >= 12 ? ' p. m.' : ''}`; };
export const largo = f => `${DIAS_LARGO[diaSemana(f)]} ${diaMes(f)}`;
