import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificacionEmail } from './notificacion-email.entity';
import { Repository } from 'typeorm';
import { ProcesoTne } from '../proceso/proceso-tne.entity';
import { Alumno } from '../alumno/alumno.entity';
import { MailService } from '../mail/mail.service';
import { buildEstadoEmail } from '../mail/templates';

@Injectable()
export class NotificacionesService {
  constructor(
    @InjectRepository(NotificacionEmail)
    private readonly notifRepo: Repository<NotificacionEmail>,
    @InjectRepository(ProcesoTne)
    private readonly procesoRepo: Repository<ProcesoTne>,
    @InjectRepository(Alumno) private readonly alumnoRepo: Repository<Alumno>,
    private readonly mail: MailService,
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

      // Reglas de notificación (mínimas pedidas)
      const tipos: string[] = [];
      if (p.estado_final === 'RETIRADA') tipos.push('ENTREGADA_AL_ALUMNO');
      if (p.estado_final === 'SIN_REGISTRO_JUNAEB')
        tipos.push('SIN_REGISTRO_JUNAEB');

      for (const tipo of tipos) {
        // Intento "reservar" envío (UNIQUE por periodo/rut/tipo)
        let record: NotificacionEmail | null = null;
        try {
          record = await this.notifRepo.save({
            periodo,
            rut_num: p.rut_num,
            tipo_notificacion: tipo,
            estado_enviado: 0,
            to_email: email,
            error: null,
          });
        } catch {
          // Ya existe => ya se envió/intentó en este periodo
          omitidos++;
          continue;
        }

        try {
          const subject = subjectFor(tipo, periodo);
          const html = buildEstadoEmail({
            nombre: alumno?.nombre || 'estudiante',
            rut_num: alumno!.rut_num,
            rut_dv: alumno?.rut_dv,
            periodo,
            estado_final: p.estado_final || '',
            pendiente: p.pendiente,
            proceso_junaeb: p.proceso_junaeb,
            estado_junaeb: p.estado_junaeb,
            motivo_rechazo: p.motivo_rechazo,
            fecha_entrega_u: p.fecha_entrega_u,
            fecha_retiro: p.fecha_retiro,
            medio_ingreso: p.medio_ingreso,
          });

          await this.mail.send(email, subject, html);

          record.estado_enviado = 1;
          record.sent_at = new Date().toISOString();
          record.error = null;
          await this.notifRepo.save(record);
          enviados++;
        } catch (e: any) {
          record.estado_enviado = 0;
          record.error = String(e?.message || e);
          await this.notifRepo.save(record);
          errores++;
        }
      }
    }

    return { periodo, enviados, omitidos, errores };
  }
}

function subjectFor(tipo: string, periodo: number) {
  if (tipo === 'ENTREGADA_AL_ALUMNO')
    return `TNE ${periodo}: retiro registrado`;
  if (tipo === 'SIN_REGISTRO_JUNAEB')
    return `TNE ${periodo}: sin registro en JUNAEB`;
  return `TNE ${periodo}: actualización`;
}
