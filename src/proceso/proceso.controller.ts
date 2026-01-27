import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { ProcesoService } from './proceso.service';

@Controller('proceso')
export class ProcesoController {
  constructor(private readonly procesoService: ProcesoService) {}

  @Get()
  listar(
    @Query('periodo') periodoStr: string,
    @Query('estado') estado?: string,
  ) {
    const periodo = Number(periodoStr);
    return this.procesoService.listar(periodo, estado);
  }

  @Get('recalcular')
  recalcular(@Query('periodo') periodoStr: string) {
    const periodo = Number(periodoStr);
    return this.procesoService.recalcularEstados(periodo);
  }

  @Public()
  @Get('estado-publico')
  estadoPublico(
    @Query('rut') rut: string,
    @Query('periodo') periodoStr?: string,
  ) {
    const periodo = periodoStr ? Number(periodoStr) : undefined;
    return this.procesoService.estadoPublico(rut, periodo);
  }
}
