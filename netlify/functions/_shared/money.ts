export function toMoneyNumber(input: any): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;

  const raw = String(input).trim();
  if (!raw) return null;

  const isParenNegative = /^\(.*\)$/.test(raw);
  const strippedParens = raw.replace(/^\(|\)$/g, '');
  const cleaned = strippedParens.replace(/[$,\s]/g, '');
  if (!cleaned) return null;

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  const signed = isParenNegative ? -Math.abs(parsed) : parsed;
  return signed;
}

function readPathValue(obj: any, path: string): any {
  if (!obj || typeof obj !== 'object') return undefined;
  const keys = String(path || '')
    .split('.')
    .map((k) => k.trim())
    .filter(Boolean);
  let current: any = obj;
  for (const key of keys) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return current;
}

export function getFirstMoney(obj: any, paths: string[]): number | null {
  for (const path of paths || []) {
    const raw = readPathValue(obj, path);
    const parsed = toMoneyNumber(raw);
    if (parsed !== null) return parsed;
  }
  return null;
}
