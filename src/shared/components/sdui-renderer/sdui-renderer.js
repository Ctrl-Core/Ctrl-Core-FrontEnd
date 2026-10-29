import { h, frag } from '../../utils/dom.js';
import { icon } from '../../utils/icons.js';

/**
 * Renderizador de UI dirigida por el servidor (SDUI) — seguro por construcción.
 * El backend envía JSON; aquí se valida contra listas blancas y se construye con h() (jamás markup en texto).
 *
 *   { "type": "section", "class": "card", "children": [
 *       { "type": "h2", "text": "Mi plan" },
 *       { "type": "button", "text": "Ir a empresas", "action": "ir-empresas" },
 *       { "type": "a", "text": "Ver", "href": "#/empresas" } ] }
 *
 * - Solo etiquetas de TAGS; solo atributos de ATTRS; `href` únicamente hash interno (#/ruta).
 * - Los eventos NO viajan en el JSON: `action` es un nombre que el cliente resuelve en su registro `actions`.
 * - Límites de profundidad y de nodos para evitar documentos hostiles.
 */
const TAGS = new Set(['div', 'section', 'article', 'header', 'footer', 'p', 'span', 'b', 'small', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'button', 'icon']);
const ATTRS = new Set(['class', 'text', 'href', 'aria-label', 'role']);
const MAX_DEPTH = 8, MAX_NODES = 500;
const SAFE_HREF = /^#\/[\w\-./?=&%]*$/;

/**
 * @param {object|object[]} spec
 * @param {{ actions?: Record<string, Function> }} [ctx]
 * @returns {DocumentFragment}
 */
export function renderSdui(spec, { actions = {} } = {}) {
  let count = 0;
  const build = (node, depth) => {
    if (!node || typeof node !== 'object') return null;
    if (depth > MAX_DEPTH) throw new Error('[sdui] Profundidad máxima excedida');
    if (++count > MAX_NODES) throw new Error('[sdui] Demasiados nodos');
    const { type, children, action } = node;
    if (!TAGS.has(type)) return null;                                  // etiqueta no permitida → se ignora
    if (type === 'icon') return typeof node.name === 'string' ? icon(node.name, Number(node.size) || 18) : null;
    const props = {};
    for (const [k, v] of Object.entries(node)) {
      if (!ATTRS.has(k) || typeof v !== 'string') continue;
      if (k === 'href' && !SAFE_HREF.test(v)) continue;
      if (k === 'aria-label') (props.aria ??= {}).label = v; else props[k] = v;
    }
    if (type === 'button') props.type = 'button';
    if (action && typeof actions[action] === 'function') props.on = { click: actions[action] };
    const kids = Array.isArray(children) ? children.map(c => build(c, depth + 1)) : [];
    return h(type, props, kids);
  };
  return frag([].concat(spec).map(n => build(n, 1)));
}
