import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcesoTne } from '../proceso/proceso-tne.entity';
import { Alumno } from '../alumno/alumno.entity';
import { MailService } from '../mail/mail.service';
import { buildEstadoEmail } from '../mail/templates';
import { TneScraperService } from '../tne/tne-scraper.service';

@Injectable()
export class NotificacionesService {
  constructor(
    @InjectRepository(ProcesoTne)
    private readonly procesoRepo: Repository<ProcesoTne>,
    @InjectRepository(Alumno)
    private readonly alumnoRepo: Repository<Alumno>,
    private readonly mail: MailService,
    private readonly scraper: TneScraperService,
  ) {}

  async enviar(periodo: number) {
    const procesos = await this.procesoRepo.find({ where: { periodo } });

    let enviados = 0;
    let omitidos = 0;
    let errores = 0;

    for (const p of procesos) {
      const alumno = await this.alumnoRepo.findOne({
        where: { rut_num: p.rut_num },
      });
      const email = alumno?.email?.trim();
      if (!email) {
        omitidos++;
        continue;
      }

      const estado = p.estado_final;

      // 1) Otros estados: enviar SIEMPRE (no se registra nada)
      if (estado !== 'RETIRADA' && estado !== 'SIN_REGISTRO_JUNAEB') {
        try {
          const html = buildEstadoEmail({
            nombre: alumno?.nombre ?? 'Estudiante',
            rut_num: p.rut_num,
            rut_dv: alumno?.rut_dv ?? null,
            periodo,
            estado_final: p.estado_final ?? 'SIN_ESTADO',

            pendiente: p.pendiente ?? null,

            proceso_junaeb: (p as any).proceso_junaeb ?? null,
            estado_junaeb: (p as any).estado_junaeb ?? null,
            motivo_rechazo: (p as any).motivo_rechazo ?? null,
            fecha_entrega_u: (p as any).fecha_entrega_u ?? null,
            fecha_retiro: (p as any).fecha_retiro ?? null,
            medio_ingreso: (p as any).medio_ingreso ?? null,
          });

          await this.mail.send(
            email,
            `TNE ${periodo}: actualización de estado`,
            html,
          );
          enviados++;
        } catch (e: any) {
          console.error('MAIL ERROR:', e?.code, e?.response, e?.message || e);
          errores++;
        }
        continue;
      }

      // 2) Solo estos dos estados NO deben repetirse por periodo
      const reserve = await this.tryReserveOnce(periodo, p.rut_num, estado);
      if (!reserve.reserved) {
        omitidos++;
        continue;
      }

      try {
        const tipo =
          estado === 'RETIRADA' ? 'ENTREGADA_AL_ALUMNO' : 'SIN_REGISTRO_JUNAEB';

        let periodoTne: string | null = null;
        let institucion: string | null = null;
        if (estado === 'SIN_REGISTRO_JUNAEB' && alumno?.rut_dv) {
          try {
            const info = await this.scraper.fetchPeriodoRbdInstitucion(
              p.rut_num,
              alumno.rut_dv,
            );
            periodoTne = info.periodo || null;
            institucion = info.institucion || null;
          } catch (e: any) {
            console.warn(
              'SCRAPER ERROR:',
              e?.code,
              e?.response,
              e?.message || e,
            );
          }
        }

        const html = buildEstadoEmail({
          nombre: alumno?.nombre ?? 'Estudiante',
          rut_num: p.rut_num,
          rut_dv: alumno?.rut_dv ?? null,
          periodo,
          estado_final: p.estado_final ?? 'SIN_ESTADO',

          pendiente: p.pendiente ?? null,

          proceso_junaeb: (p as any).proceso_junaeb ?? null,
          estado_junaeb: (p as any).estado_junaeb ?? null,
          motivo_rechazo: (p as any).motivo_rechazo ?? null,
          fecha_entrega_u: (p as any).fecha_entrega_u ?? null,
          fecha_retiro: (p as any).fecha_retiro ?? null,
          medio_ingreso: (p as any).medio_ingreso ?? null,
          periodo_tne: periodoTne,
          institucion,
        });

        await this.mail.send(email, subjectFor(tipo, periodo), html);
        enviados++;
      } catch (e: any) {
        // rollback de la reserva si falla el envío (para permitir reintento)
        const col = reserve.col;
        await this.procesoRepo
          .createQueryBuilder()
          .update()
          .set({ [col]: null } as any)
          .where(
            'periodo = :periodo AND rut_num = :rut_num AND ' + col + ' = :now',
            {
              periodo,
              rut_num: p.rut_num,
              now: reserve.now,
            },
          )
          .execute();
        console.error('MAIL ERROR:', e?.code, e?.response, e?.message || e);
        errores++;
      }
    }

    return { periodo, enviados, omitidos, errores };
  }

  private async tryReserveOnce(
    periodo: number,
    rut_num: number,
    estado: 'RETIRADA' | 'SIN_REGISTRO_JUNAEB',
  ) {
    const now = new Date().toISOString();

    if (estado === 'RETIRADA') {
      const r = await this.procesoRepo
        .createQueryBuilder()
        .update()
        .set({ notificado_retirada_at: now } as any)
        .where(
          'periodo = :periodo AND rut_num = :rut_num AND estado_final = :st AND notificado_retirada_at IS NULL',
          { periodo, rut_num, st: 'RETIRADA' },
        )
        .execute();

      return {
        reserved: r.affected === 1,
        now,
        col: 'notificado_retirada_at' as const,
      };
    }

    const r = await this.procesoRepo
      .createQueryBuilder()
      .update()
      .set({ notificado_sin_junaeb_at: now } as any)
      .where(
        'periodo = :periodo AND rut_num = :rut_num AND estado_final = :st AND notificado_sin_junaeb_at IS NULL',
        { periodo, rut_num, st: 'SIN_REGISTRO_JUNAEB' },
      )
      .execute();

    return {
      reserved: r.affected === 1,
      now,
      col: 'notificado_sin_junaeb_at' as const,
    };
  }
}

function subjectFor(
  tipo: 'ENTREGADA_AL_ALUMNO' | 'SIN_REGISTRO_JUNAEB',
  periodo: number,
) {
  if (tipo === 'ENTREGADA_AL_ALUMNO')
    return `TNE ${periodo}: retiro registrado`;
  return `TNE ${periodo}: sin registro en JUNAEB`;
}
