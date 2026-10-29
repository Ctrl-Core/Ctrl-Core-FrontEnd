/** Normaliza texto para búsquedas (sin tildes ni signos) */
export const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
export const fmt = n => new Intl.NumberFormat('es-CO').format(n);
