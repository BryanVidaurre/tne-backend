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

    // 1) Define columnas primero (esto crea/usa la fila 1 como header)
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

    // 2) Inserta filas ARRIBA de la tabla (empuja el header hacia abajo)
    const generadoEn = new Date();
    const fechaStr = generadoEn.toLocaleString('es-CL', {
      timeZone: 'America/Santiago',
    });

    sheet.spliceRows(
      1,
      0,
      [`Reporte TNE - Generado: ${fechaStr}`],
      [`Periodo: ${periodo}`],
      [],
    );

    // (opcional) merge para que el título quede “arriba de la tabla” ancho completo
    sheet.mergeCells(1, 1, 1, sheet.columnCount);
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { vertical: 'middle' };
    sheet.getRow(1).height = 18;

    sheet.mergeCells(2, 1, 2, sheet.columnCount);
    sheet.getRow(2).alignment = { vertical: 'middle' };

    // El header ahora quedó en la fila 4
    const headerRow = sheet.getRow(4);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle' };
    headerRow.height = 18;

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
