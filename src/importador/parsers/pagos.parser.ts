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

  // Leer como matriz cruda
  const raw: any[][] = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: null,
  });

  // Buscar la fila donde esté la columna "Rut"
  const headerRowIndex = raw.findIndex((row) =>
    row.some(
      (cell) =>
        String(cell || '')
          .trim()
          .toUpperCase() === 'RUT',
    ),
  );

  if (headerRowIndex === -1) {
    return [];
  }

  const headers = raw[headerRowIndex].map((h) =>
    String(h || '')
      .trim()
      .toUpperCase(),
  );

  const rutIdx = headers.indexOf('RUT');
  const fechaIdx = headers.indexOf('FECHA DE PAGO');
  const tipoIdx = headers.indexOf('TIPO ALUMNO');

  const out: PagoRow[] = [];

  for (let i = headerRowIndex + 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row || !row[rutIdx]) continue;

    const parsed = parseRut(row[rutIdx]);
    if (!parsed) continue;

    out.push({
      rut_num: parsed.rut_num,
      rut_dv: parsed.rut_dv,
      fecha_pago: toIsoDate(row[fechaIdx]),
      tipo_alumno: String(row[tipoIdx] || '').trim() || null,
    });
  }

  return out;
}
