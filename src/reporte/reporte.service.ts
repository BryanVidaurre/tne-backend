import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProcesoTne } from '../proceso/proceso-tne.entity';
import { Alumno } from '../alumno/alumno.entity';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { buildEstadoMensajePlano } from '../mail/templates';
import { TneScraperService } from '../tne/tne-scraper.service';

@Injectable()
export class ReporteService {
  constructor(
    @InjectRepository(ProcesoTne)
    private readonly procesoRepo: Repository<ProcesoTne>,
    @InjectRepository(Alumno)
    private readonly alumnoRepo: Repository<Alumno>,
    private readonly scraper: TneScraperService,
  ) {}

  async generarExcel(periodo: number): Promise<Buffer> {
    const procesos = await this.procesoRepo.find({ where: { periodo } });

    const rows: Array<{
      proceso: ProcesoTne;
      alumno: Alumno | null;
      nombres: string;
      paterno: string;
      materno: string;
    }> = [];

    const sinRegistro: Array<{ rut_num: number; rut_dv: string }> = [];

    for (const p of procesos) {
      const alumno = await this.alumnoRepo.findOne({
        where: { rut_num: p.rut_num },
      });
      const fullName = (alumno?.nombre ?? '').trim();
      const { nombres, paterno, materno } = splitNombre(fullName);

      if (p.estado_final === 'SIN_REGISTRO_JUNAEB' && alumno?.rut_dv) {
        sinRegistro.push({ rut_num: p.rut_num, rut_dv: alumno.rut_dv });
      }

      rows.push({ proceso: p, alumno, nombres, paterno, materno });
    }

    const infoMap = await fetchInfoMap(sinRegistro, this.scraper, 8, 4000);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('TNE');

    sheet.columns = [
      { header: 'Nº', key: 'num', width: 6 },
      { header: 'RUT2', key: 'rut_num', width: 12 },
      { header: 'DV', key: 'rut_dv', width: 4 },
      { header: 'NOMBRES', key: 'nombres', width: 28 },
      { header: 'PATERNO', key: 'paterno', width: 18 },
      { header: 'MATERNO', key: 'materno', width: 18 },
      { header: 'ESTADO1', key: 'estado1', width: 80 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle' };
    headerRow.height = 18;

    let idx = 1;
    for (const row of rows) {
      const p = row.proceso;
      const alumno = row.alumno;
      const estado_final = p.estado_final ?? 'SIN_ESTADO';

      let periodo_tne: string | null = null;
      let institucion: string | null = null;
      if (estado_final === 'SIN_REGISTRO_JUNAEB' && alumno?.rut_dv) {
        const key = `${p.rut_num}-${alumno.rut_dv}`;
        const info = infoMap.get(key);
        periodo_tne = info?.periodo ?? null;
        institucion = info?.institucion ?? null;
      }

      const mensaje = buildEstadoMensajePlano({
        nombre: alumno?.nombre ?? 'Estudiante',
        rut_num: p.rut_num,
        rut_dv: alumno?.rut_dv ?? null,
        periodo: p.periodo,
        estado_final,
        pendiente: p.pendiente ?? null,
        proceso_junaeb: p.proceso_junaeb ?? null,
        estado_junaeb: p.estado_junaeb ?? null,
        motivo_rechazo: p.motivo_rechazo ?? null,
        fecha_entrega_u: p.fecha_entrega_u ?? null,
        fecha_retiro: p.fecha_retiro ?? null,
        medio_ingreso: p.medio_ingreso ?? null,
        periodo_tne,
        institucion,
      });

      sheet.addRow({
        num: idx,
        rut_num: p.rut_num,
        rut_dv: alumno?.rut_dv ?? '',
        nombres: row.nombres,
        paterno: row.paterno,
        materno: row.materno,
        estado1: `${mensaje}`,
      });
      idx++;
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}

function splitNombre(nombre: string) {
  const parts = nombre.split(/\s+/).filter(Boolean);
  if (parts.length >= 3) {
    const materno = parts[parts.length - 1];
    const paterno = parts[parts.length - 2];
    const nombres = parts.slice(0, parts.length - 2).join(' ');
    return { nombres, paterno, materno };
  }
  if (parts.length === 2) {
    return { nombres: parts[0], paterno: parts[1], materno: '' };
  }
  if (parts.length === 1) {
    return { nombres: parts[0], paterno: '', materno: '' };
  }
  return { nombres: '', paterno: '', materno: '' };
}

async function fetchInfoMap(
  list: Array<{ rut_num: number; rut_dv: string }>,
  scraper: TneScraperService,
  concurrency: number,
  timeoutMs: number,
) {
  const map = new Map<
    string,
    { periodo: string | null; institucion: string | null }
  >();
  const unique = new Map<string, { rut_num: number; rut_dv: string }>();
  for (const it of list) {
    const key = `${it.rut_num}-${it.rut_dv}`;
    if (!unique.has(key)) unique.set(key, it);
  }
  const items = Array.from(unique.values());
  let index = 0;

  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (index < items.length) {
      const current = items[index++];
      const key = `${current.rut_num}-${current.rut_dv}`;
      try {
        const info = await withTimeout(
          scraper.fetchPeriodoRbdInstitucion(current.rut_num, current.rut_dv),
          timeoutMs,
        );
        map.set(key, {
          periodo: info.periodo || null,
          institucion: info.institucion || null,
        });
      } catch {
        map.set(key, { periodo: null, institucion: null });
      }
    }
  });

  await Promise.all(workers);
  return map;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}
