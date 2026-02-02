import { Controller, Post, Query } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Notificaciones')
@ApiBearerAuth('bearer')
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly svc: NotificacionesService) {}

  @ApiOperation({ summary: 'Enviar correos de notificacion para un periodo' })
  @ApiQuery({ name: 'periodo', type: Number, required: true, example: 2026 })
  @Post('enviar')
  enviar(@Query('periodo') periodoStr: string) {
    const periodo = Number(periodoStr);
    return this.svc.enviar(periodo);
  }
}
