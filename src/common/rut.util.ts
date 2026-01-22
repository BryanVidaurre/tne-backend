export type RutParsed = { rut_num: number; rut_dv?: string };

export function parseRut(input: unknown): RutParsed | null {
  if (input === null || input === undefined) return null;
  const s = String(input).trim().toUpperCase();
  if (!s) return null;

  const cleaned = s.replace(/\./g, '').replace(/\s+/g, '');
  const m = cleaned.match(/^(\d+)-?([0-9K])?$/);
  if (!m) return null;

  const rut_num = Number(m[1]);
  const rut_dv = m[2];

  if (!Number.isFinite(rut_num) || rut_num <= 0) return null;
  return { rut_num, rut_dv };
}

export function rutToDisplay(rut_num: number, rut_dv?: string | null): string {
  return rut_dv
    ? `${rut_num}-${String(rut_dv).toUpperCase()}`
    : String(rut_num);
}
