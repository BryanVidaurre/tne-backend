import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Alumno } from '../alumno/alumno.entity';
import { ProcesoTne } from '../proceso/proceso-tne.entity';
import { Repository } from 'typeorm';
import { parsePagos } from './parsers/pagos.parser';
import { parseMatricula } from './parsers/matricula.parser';
import { parseJunaeb } from './parsers/junaeb.parser';
import { parseInvitados } from './parsers/invitados.parser';
import { parseAsistentes } from './parsers/asistentes.parser';
import { ProcesoService } from '../proceso/proceso.service';

@Injectable()
export class ImportadorService {
  constructor(
    @InjectRepository(Alumno) private readonly alumnoRepo: Repository<Alumno>,
    @InjectRepository(ProcesoTne)
    private readonly procesoRepo: Repository<ProcesoTne>,
    private readonly procesoService: ProcesoService,
  ) {}

  // PAGOS: crea proceso_tne para el periodo
  async importPagos(buffer: Buffer, periodo: number) {
    const rows = parsePagos(buffer);
    let upserts = 0;

    for (const r of rows) {
      const alumno = await this.alumnoRepo.findOne({
        where: { rut_num: r.rut_num },
      });

      // Si no existe, lo crea con nombre de pagos
      if (!alumno) {
        await this.alumnoRepo.save({
          rut_num: r.rut_num,
          rut_dv: r.rut_dv ?? null,
          nombre: r.nombre ?? null,
        });
      } else {
        // Si existe pero no tiene nombre (aún no se sube matrícula)
        if (!alumno.nombre && r.nombre) {
          alumno.nombre = r.nombre;
          await this.alumnoRepo.save(alumno);
        }
      }

      await this.procesoRepo.save({
        periodo,
        rut_num: r.rut_num,
        fecha_pago: r.fecha_pago ?? null,
        tipo_alumno: r.tipo_alumno ?? null,
      });

      upserts++;
    }

    return { periodo, rows: rows.length, upserts };
  }

  // MATRÍCULA: actualiza alumno (manda), pero NO crea procesos
  async importMatricula(buffer: Buffer, _periodo: number) {
    const rows = parseMatricula(buffer);
    let upserts = 0;

    for (const r of rows) {
      await this.alumnoRepo.save({
        rut_num: r.rut_num,
        rut_dv: r.rut_dv ?? null,
        nombre: r.nombre || null,
        email: r.email ?? null,
      });
      upserts++;
    }
    return { rows: rows.length, upserts };
  }

  // JUNAEB: solo actualiza si existe proceso (pagó)
  async importJunaeb(buffer: Buffer, periodo: number) {
    const rows = parseJunaeb(buffer);
    let updated = 0;

    for (const r of rows) {
      const proc = await this.procesoRepo.findOne({
        where: { periodo, rut_num: r.rut_num },
      });
      if (!proc) continue; // ignorar no pagados

      proc.proceso_junaeb = r.proceso ?? proc.proceso_junaeb ?? null;
      proc.estado_junaeb =
        normalizeEstadoJunaeb(r.estado_tne) ?? proc.estado_junaeb ?? null;
      proc.motivo_rechazo = r.motivo_rechazo ?? proc.motivo_rechazo ?? null;
      proc.numero_ot = r.numero_ot ?? proc.numero_ot ?? null;
      proc.fecha_inscripcion =
        r.fecha_inscripcion ?? proc.fecha_inscripcion ?? null;
      proc.fecha_atencion = r.fecha_atencion ?? proc.fecha_atencion ?? null;
      proc.fecha_entrega_u = r.fecha_entrega_u ?? proc.fecha_entrega_u ?? null;

      await this.procesoRepo.save(proc);
      updated++;
    }

    return { periodo, rows: rows.length, updated };
  }

  // INVITADOS: solo actualiza si existe proceso
  async importInvitados(buffer: Buffer, periodo: number) {
    const rows = parseInvitados(buffer);
    let updated = 0;

    for (const r of rows) {
      const proc = await this.procesoRepo.findOne({
        where: { periodo, rut_num: r.rut_num },
      });
      if (!proc) continue;

      proc.lista_retiro = 1;
      if (r.con_huella !== null && r.con_huella !== undefined)
        proc.con_huella = r.con_huella;

      await this.procesoRepo.save(proc);
      updated++;
    }

    return { periodo, rows: rows.length, updated };
  }

  // ASISTENTES: solo actualiza si existe proceso
  async importAsistentes(buffer: Buffer, periodo: number) {
    const rows = parseAsistentes(buffer);
    let updated = 0;

    for (const r of rows) {
      const proc = await this.procesoRepo.findOne({
        where: { periodo, rut_num: r.rut_num },
      });
      if (!proc) continue;

      proc.retiro_confirmado = 1;
      if (r.con_huella !== null && r.con_huella !== undefined)
        proc.con_huella = r.con_huella;
      proc.medio_ingreso = r.medio_ingreso ?? proc.medio_ingreso ?? null;
      proc.fecha_retiro = r.fecha ?? proc.fecha_retiro ?? null;

      await this.procesoRepo.save(proc);
      updated++;
    }

    return { periodo, rows: rows.length, updated };
  }
}

function normalizeEstadoJunaeb(s?: string | null): string | null {
  if (!s) return null;
  const t = s.trim().toUpperCase();

  // aceptar variantes con espacios/guiones
  if (t.includes('ENTREG')) return 'TNE ENTREGADA';
  if (t.includes('ACEPT')) return 'ACEPTADA';
  if (t.includes('REVALID')) return 'REVALIDADO';
  if (t.includes('FOTOG')) return 'FOTOGRAFIADO';
  if (t.includes('RECHAZ')) return 'RECHAZADA';
  return t; // fallback (por si aparece uno nuevo)
}
