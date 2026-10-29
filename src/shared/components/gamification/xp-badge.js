import { h } from '../../utils/dom.js';
/** Texto de puntos de experiencia: xpText(300) → "+300 XP" */
export const xpText = n => `+${n} XP`;
/** Insignia de XP (nodo) */
export const xpBadge = n => h('span', { class: 'badge', text: xpText(n) });
