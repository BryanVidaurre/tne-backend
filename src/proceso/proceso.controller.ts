import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { ProcesoService } from './proceso.service';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Proceso')
@ApiBearerAuth('bearer')
@Controller('proceso')
export class ProcesoController {
  constructor(private readonly procesoService: ProcesoService) {}

  @ApiOperation({ summary: 'Listar estados de proceso por periodo' })
  @ApiQuery({ name: 'periodo', type: Number, required: true, example: 2026 })
  @ApiQuery({ name: 'estado', type: String, required: false, example: 'PENDIENTE' })
  @Get()
  listar(
    @Query('periodo') periodoStr: string,
    @Query('estado') estado?: string,
  ) {
    const periodo = Number(periodoStr);
    return this.procesoService.listar(periodo, estado);
  }

  @ApiOperation({ summary: 'Recalcular estado final para un periodo' })
  @ApiQuery({ name: 'periodo', type: Number, required: true, example: 2026 })
  @Get('recalcular')
  recalcular(@Query('periodo') periodoStr: string) {
    const periodo = Number(periodoStr);
    return this.procesoService.recalcularEstados(periodo);
  }

  @Public()
  @ApiOperation({ summary: 'Consultar estado publico por RUT' })
  @ApiQuery({ name: 'rut', type: String, required: true, example: '21802735-0' })
  @ApiQuery({ name: 'periodo', type: Number, required: false, example: 2026 })
  @Get('estado-publico')
  estadoPublico(
    @Query('rut') rut: string,
    @Query('periodo') periodoStr?: string,
  ) {
    const periodo = periodoStr ? Number(periodoStr) : undefined;
    return this.procesoService.estadoPublico(rut, periodo);
  }
}
