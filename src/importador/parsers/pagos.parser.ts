import * as XLSX from 'xlsx';
import { parseRut } from '../../common/rut.util';
import { toIsoDate } from '../../common/date.util';

export type PagoRow = {
  rut_num: number;
  rut_dv?: string;
  fecha_pago?: string | null;
  tipo_alumno?: string | null;
};

export function parsePagos(buffer: Buffer): PagoRow[] {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: null });

  const out: PagoRow[] = [];
  for (const r of rows) {
    const parsed = parseRut(r['Rut'] ?? r['RUT'] ?? r['rut']);
    if (!parsed) continue;
    out.push({
      rut_num: parsed.rut_num,
      rut_dv: parsed.rut_dv,
      fecha_pago: toIsoDate(
        r['Fecha de Pago'] ?? r['Fecha Pago'] ?? r['fecha_pago'],
      ),
      tipo_alumno: String(r['Tipo Alumno'] ?? r['Tipo'] ?? '').trim() || null,
    });
  }
  return out;
}
