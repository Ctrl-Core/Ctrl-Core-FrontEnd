/**
 * Constructor seguro de DOM (único punto donde se crean nodos). CERO innerHTML.
 * - Texto SIEMPRE vía createTextNode / textContent (nunca se interpreta como HTML).
 * - Prohíbe atributos on* inline, innerHTML/outerHTML/srcdoc y URLs javascript:/data:/vbscript:.
 * - Eventos solo con addEventListener (prop `on`).
 */
const SVG_NS = 'http://www.w3.org/2000/svg';
const FORBIDDEN = /^(on.+|innerhtml|outerhtml|srcdoc)$/i;
const BAD_URL = /^\s*(javascript|data|vbscript):/i;

function apply(el, props) {
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (FORBIDDEN.test(k)) throw new Error(`Atributo prohibido por política de seguridad: ${k}`);
    if (k === 'class') el.classList.add(...[].concat(v).filter(Boolean).join(' ').split(/\s+/).filter(Boolean)); // string o arreglo (valores falsos se ignoran)
    else if (k === 'text') el.textContent = String(v);
    else if (k === 'dataset') for (const [d, x] of Object.entries(v)) el.dataset[d] = String(x);
    else if (k === 'style') for (const [p, x] of Object.entries(v)) el.style.setProperty(p, String(x)); // CSSOM: compatible con CSP sin 'unsafe-inline'
    else if (k === 'aria') for (const [a, x] of Object.entries(v)) { if (x != null) el.setAttribute('aria-' + a, String(x)); }
    else if (k === 'on') for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
    else if (k === 'value') el.value = String(v);
    else if ((k === 'href' || k === 'src') && BAD_URL.test(String(v))) continue;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
}
const flat = kids => kids.flat(Infinity).filter(x => x != null && x !== false)
  .map(x => (x instanceof Node ? x : document.createTextNode(String(x))));

/** h('button', { class: 'btn', on: { click } }, 'Texto', otroNodo) */
export const h = (tag, props, ...kids) => { const el = document.createElement(tag); apply(el, props); el.append(...flat(kids)); return el; };
/** svg('path', { d: '…' }) — nodos SVG con createElementNS */
export const svg = (tag, props, ...kids) => { const el = document.createElementNS(SVG_NS, tag); for (const [k, v] of Object.entries(props || {})) if (!FORBIDDEN.test(k)) el.setAttribute(k, String(v)); el.append(...flat(kids)); return el; };
export const frag = (...kids) => { const f = document.createDocumentFragment(); f.append(...flat(kids)); return f; };

/** Aviso flotante: lo escucha el App Shell (cde-app-shell). Recibe texto plano. */
export const toast = msg => document.dispatchEvent(new CustomEvent('cde:toast', { detail: String(msg) }));
