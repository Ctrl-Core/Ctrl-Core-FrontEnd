import { store } from './store.js';
import { PERFIL } from './data.js';
/** Perfil de gamificación del Emprendedor (XP, racha). Accesor de core: lo leen el shell (píldora de racha) y el módulo emprendedor. */
export const getPerfil = () => store.get().perfil ?? PERFIL;
