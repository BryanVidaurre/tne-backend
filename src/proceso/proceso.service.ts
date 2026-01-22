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
      // Prioridad: asistentes > invitados > junaeb > sin registro
      if (p.retiro_confirmado === 1) {
        p.estado_final = 'RETIRADA';
        p.pendiente = null;
      } else if (p.lista_retiro === 1) {
        p.estado_final = 'LISTA_RETIRO_U';
        p.pendiente = p.con_huella === 1 ? 'RETIRO' : 'HUELLA';
      } else if (
        (p.estado_junaeb || '').toUpperCase() === 'RECHAZADA' ||
        (p.motivo_rechazo && p.motivo_rechazo.trim())
      ) {
        p.estado_final = 'RECHAZADA';
        p.pendiente = 'CORREGIR';
      } else if ((p.proceso_junaeb || '').toUpperCase().includes('FOTO')) {
        p.estado_final = 'EN_PROCESO_FOTO';
        p.pendiente = 'ESPERAR_JUNAEB';
      } else if ((p.proceso_junaeb || '').toUpperCase().includes('REVALID')) {
        p.estado_final = 'EN_PROCESO_REVALIDACION';
        p.pendiente = 'ESPERAR_JUNAEB';
      } else {
        p.estado_final = 'SIN_REGISTRO_JUNAEB';
        p.pendiente = 'ESPERAR_JUNAEB';
      }
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
