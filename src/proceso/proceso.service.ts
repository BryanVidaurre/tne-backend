import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProcesoTne } from './proceso-tne.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ProcesoService {
  constructor(
    @InjectRepository(ProcesoTne)
    private readonly procesoRepo: Repository<ProcesoTne>,
  ) {}

  async recalcularEstados(periodo: number): Promise<{ updated: number }> {
    const rows = await this.procesoRepo.find({ where: { periodo } });

    for (const p of rows) {
      // 1) Prioridad absoluta: si retiró
      if (p.retiro_confirmado === 1) {
        p.estado_final = 'RETIRADA';
        p.pendiente = null;
        await this.procesoRepo.save(p);
        continue;
      }

      // 2) Si está en invitados (tarjeta en U para retiro)
      if (p.lista_retiro === 1) {
        p.estado_final = 'LISTA_RETIRO_U';
        // opcional: pendiente informativo
        p.pendiente = p.con_huella === 1 ? 'RETIRO' : 'HUELLA';
        await this.procesoRepo.save(p);
        continue;
      }

      // 3) Si existe estado JUNAEB, se respeta (con 1 traducción)
      const ej = (p.estado_junaeb || '').trim().toUpperCase();

      if (ej) {
        if (ej.includes('ENTREG')) {
          // JUNAEB "TNE ENTREGADA" = entregada a la universidad
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
          // fallback si aparece un estado nuevo en el reporte
          p.estado_final = ej;
          p.pendiente = null;
        }

        await this.procesoRepo.save(p);
        continue;
      }

      // 4) Pagó pero no aparece en JUNAEB
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
}
