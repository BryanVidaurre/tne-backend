import { Controller, Get, Query, Res } from '@nestjs/common';
import express from 'express';
import { ReporteService } from './reporte.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Reporte')
@ApiBearerAuth('bearer')
@Controller('reporte')
export class ReporteController {
  constructor(private readonly service: ReporteService) {}

  @ApiOperation({ summary: 'Descargar reporte Excel del periodo' })
  @ApiQuery({ name: 'periodo', type: Number, required: true, example: 2026 })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
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
