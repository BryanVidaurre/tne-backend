import { Controller, Get, Query, Res } from '@nestjs/common';
import express from 'express';
import { ReporteService } from './reporte.service';

@Controller('reporte')
export class ReporteController {
  constructor(private readonly service: ReporteService) {}

  @Get('excel')
  async descargarExcel(
    @Query('periodo') periodo: number,
    @Res() res: express.Response,
  ) {
    const buffer = await this.service.generarExcel(periodo);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=TNE_${periodo}.xlsx`,
    );

    res.send(buffer);
  }
}
