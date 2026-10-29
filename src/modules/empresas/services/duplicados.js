import { norm } from '../../../shared/utils/text.js';

/** Similitud 0..1 (Levenshtein) para el guardián antiduplicados del directorio de empresas */
export function similar(a, b){
  a = norm(a); b = norm(b);
  if (!a || !b) return 0;
  const m = a.length, n = b.length, d = Array.from({length: m + 1}, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
  return 1 - d[m][n] / Math.max(m, n);
}
