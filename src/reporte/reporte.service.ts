import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProcesoTne } from '../proceso/proceso-tne.entity';
import { Alumno } from '../alumno/alumno.entity';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ReporteService {
  constructor(
    @InjectRepository(ProcesoTne)
    private readonly procesoRepo: Repository<ProcesoTne>,
    @InjectRepository(Alumno)
    private readonly alumnoRepo: Repository<Alumno>,
  ) {}

  async generarExcel(periodo: number): Promise<Buffer> {
    const procesos = await this.procesoRepo.find({ where: { periodo } });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('TNE');

    // Cabeceras
    sheet.columns = [
      { header: 'RUT', key: 'rut', width: 15 },
      { header: 'Nombre', key: 'nombre', width: 35 },
      { header: 'Email', key: 'email', width: 35 },
      { header: 'Estado Final', key: 'estado', width: 22 },
      { header: 'Proceso', key: 'proceso_junaeb', width: 22 },
      { header: 'Fecha Entrega U', key: 'fecha_entrega_u', width: 18 },
      { header: 'Fecha Retiro', key: 'fecha_retiro', width: 18 },
      { header: 'Medio Ingreso', key: 'medio', width: 18 },
      { header: 'Con Huella', key: 'huella', width: 12 },
    ];

    for (const p of procesos) {
      const alumno = await this.alumnoRepo.findOne({
        where: { rut_num: p.rut_num },
      });

      sheet.addRow({
        rut: `${p.rut_num}-${alumno?.rut_dv ?? ''}`,
        nombre: alumno?.nombre ?? '',
        email: alumno?.email ?? '',
        estado: p.estado_final,
        proceso_junaeb: p.proceso_junaeb ?? '',
        fecha_entrega_u: p.fecha_entrega_u ?? '',
        fecha_retiro: p.fecha_retiro ?? '',
        medio: p.medio_ingreso ?? '',
        huella: p.con_huella === 1 ? 'SI' : 'NO',
      });
    }

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
