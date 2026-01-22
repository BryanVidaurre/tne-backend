import * as XLSX from 'xlsx';
import { parseRut } from '../../common/rut.util';

export type MatriculaRow = {
  rut_num: number;
  rut_dv?: string;
  nombre: string;
  email?: string | null;
};

export function parseMatricula(buffer: Buffer): MatriculaRow[] {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: null });

  const out: MatriculaRow[] = [];
  for (const r of rows) {
    const nrut = r['PER_NRUT'] ?? r['per_nrut'];
    const dv = r['PER_DRUT'] ?? r['per_drut'];
    const parsed = parseRut(`${nrut}-${dv}`);
    if (!parsed) continue;

    const nombre = [
      r['PNA_NOM'] ?? '',
      r['PNA_APAT'] ?? '',
      r['PNA_AMAT'] ?? '',
    ]
      .map((x: any) => String(x).trim())
      .filter(Boolean)
      .join(' ')
      .trim();

    const email = String(r['PER_EMAIL'] ?? '').trim() || null;

    out.push({ rut_num: parsed.rut_num, rut_dv: parsed.rut_dv, nombre, email });
  }
  return out;
}
