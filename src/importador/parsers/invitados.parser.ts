import * as XLSX from 'xlsx';
import { parseRut } from '../../common/rut.util';

export type InvitadoRow = {
  rut_num: number;
  rut_dv?: string;
  con_huella?: number | null; // 0/1
};

export function parseInvitados(buffer: Buffer): InvitadoRow[] {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: null });

  const out: InvitadoRow[] = [];
  for (const r of rows) {
    const parsed = parseRut(r['Rut'] ?? r['RUT'] ?? r['rut']);
    if (!parsed) continue;
    const huella = String(r['Con Huella Digital'] ?? '')
      .trim()
      .toUpperCase();
    out.push({
      rut_num: parsed.rut_num,
      rut_dv: parsed.rut_dv,
      con_huella: huella === 'SI' ? 1 : huella === 'NO' ? 0 : null,
    });
  }
  return out;
}
