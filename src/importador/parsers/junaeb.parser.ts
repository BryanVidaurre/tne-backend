import * as XLSX from 'xlsx';
import { parseRut } from '../../common/rut.util';
import { toIsoDate } from '../../common/date.util';

export type JunaebRow = {
  rut_num: number;
  rut_dv?: string;
  proceso?: string | null;
  estado_tne?: string | null;
  motivo_rechazo?: string | null;
  numero_ot?: string | null;
  fecha_inscripcion?: string | null;
  fecha_atencion?: string | null;
  fecha_entrega_u?: string | null;
};

export function parseJunaeb(buffer: Buffer): JunaebRow[] {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: null });

  const out: JunaebRow[] = [];
  for (const r of rows) {
    const run = r['RUN'] ?? r['Rut'] ?? r['RUT'];
    const dv = r['DV_RUN'] ?? r['DV'] ?? '';
    const parsed = parseRut(`${run}-${dv}`);
    if (!parsed) continue;

    out.push({
      rut_num: parsed.rut_num,
      rut_dv: parsed.rut_dv,
      proceso: String(r['PROCESO'] ?? '').trim() || null,
      estado_tne: String(r['ESTADO_TNE'] ?? '').trim() || null,
      motivo_rechazo: String(r['MOTIVO_RECHAZO'] ?? '').trim() || null,
      numero_ot: String(r['NUMERO_OT'] ?? '').trim() || null,
      fecha_inscripcion: toIsoDate(r['FECHA_INSCRIPCION']),
      fecha_atencion: toIsoDate(r['FECHA_ATENCION']),
      fecha_entrega_u: toIsoDate(r['FECHA_ENTREGA']),
    });
  }
  return out;
}
