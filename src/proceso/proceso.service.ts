import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProcesoTne } from './proceso-tne.entity';
import { Repository } from 'typeorm';
import { Alumno } from '../alumno/alumno.entity';
import { buildEstadoEmail } from '../mail/templates';
import { TneScraperService } from '../tne/tne-scraper.service';
import { parseRut } from '../common/rut.util';

@Injectable()
export class ProcesoService {
  constructor(
    @InjectRepository(ProcesoTne)
    private readonly procesoRepo: Repository<ProcesoTne>,
    @InjectRepository(Alumno)
    private readonly alumnoRepo: Repository<Alumno>,
    private readonly scraper: TneScraperService,
  ) {}

  async recalcularEstados(periodo: number): Promise<{ updated: number }> {
    const rows = await this.procesoRepo.find({ where: { periodo } });

    for (const p of rows) {
      if (p.retiro_confirmado === 1) {
        p.estado_final = 'RETIRADA';
        p.pendiente = null;
        await this.procesoRepo.save(p);
        continue;
      }

      if (p.lista_retiro === 1) {
        p.estado_final = 'LISTA_RETIRO_U';
        p.pendiente = p.con_huella === 1 ? 'RETIRO' : 'HUELLA';
        await this.procesoRepo.save(p);
        continue;
      }

      const ej = (p.estado_junaeb || '').trim().toUpperCase();

      if (ej) {
        if (ej.includes('ENTREG')) {
          p.estado_final = 'LISTA_RETIRO_U';
          p.pendiente = p.con_huella === 1 ? 'RETIRO' : 'HUELLA';
        } else if (ej.includes('ACEPT')) {
          p.estado_final = 'ACEPTADA';
          p.pendiente = null;
        } else if (ej.includes('FOTOG')) {
          p.estado_final = 'FOTOGRAFIADO';
          p.pendiente = null;
        } else if (ej.includes('REVALID')) {
          p.estado_final = 'REVALIDADO';
          p.pendiente = null;
        } else if (ej.includes('RECHAZ')) {
          p.estado_final = 'RECHAZADA';
          p.pendiente = 'CORREGIR';
        } else {
          p.estado_final = ej;
          p.pendiente = null;
        }

        await this.procesoRepo.save(p);
        continue;
      }

      p.estado_final = 'SIN_REGISTRO_JUNAEB';
      p.pendiente = null;
      await this.procesoRepo.save(p);
    }

    return { updated: rows.length };
  }

  async listar(periodo: number, estado?: string) {
    if (estado)
      return this.procesoRepo.find({
        where: { periodo, estado_final: estado },
      });
    return this.procesoRepo.find({ where: { periodo } });
  }

  async estadoPublico(rutInput: string, periodo?: number) {
    const parsed = parseRut(rutInput);
    if (!parsed) throw new BadRequestException('RUT inválido');

    const where = periodo
      ? { rut_num: parsed.rut_num, periodo }
      : { rut_num: parsed.rut_num };

    const proceso = await this.procesoRepo.findOne({
      where,
      order: periodo ? undefined : { periodo: 'DESC' },
    });

    if (!proceso) throw new NotFoundException('No hay proceso para ese RUT');

    const alumno = await this.alumnoRepo.findOne({
      where: { rut_num: parsed.rut_num },
    });

    const rut_dv = alumno?.rut_dv ?? parsed.rut_dv ?? null;
    const estado_final = proceso.estado_final ?? 'SIN_ESTADO';

    let periodo_tne: string | null = null;
    let institucion: string | null = null;
    if (estado_final === 'SIN_REGISTRO_JUNAEB' && rut_dv) {
      try {
        const info = await this.scraper.fetchPeriodoRbdInstitucion(
          parsed.rut_num,
          rut_dv,
        );
        periodo_tne = info.periodo || null;
        institucion = info.institucion || null;
      } catch (e: any) {
        console.warn('SCRAPER ERROR:', e?.code, e?.response, e?.message || e);
      }
    }

    const mensaje_html = buildEstadoEmail({
      nombre: alumno?.nombre ?? 'Estudiante',
      rut_num: parsed.rut_num,
      rut_dv,
      periodo: proceso.periodo,
      estado_final,
      pendiente: proceso.pendiente ?? null,
      proceso_junaeb: proceso.proceso_junaeb ?? null,
      estado_junaeb: proceso.estado_junaeb ?? null,
      motivo_rechazo: proceso.motivo_rechazo ?? null,
      fecha_entrega_u: proceso.fecha_entrega_u ?? null,
      fecha_retiro: proceso.fecha_retiro ?? null,
      medio_ingreso: proceso.medio_ingreso ?? null,
      periodo_tne,
      institucion,
    });

    return {
      rut_num: parsed.rut_num,
      rut_dv,
      periodo: proceso.periodo,
      estado_final,
      updated_at: proceso.updated_at,
      mensaje_html,
    };
  }
}
