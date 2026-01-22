import { Controller, Post, Query } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';

@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly svc: NotificacionesService) {}

  @Post('enviar')
  enviar(@Query('periodo') periodoStr: string) {
    const periodo = Number(periodoStr);
    return this.svc.enviar(periodo);
  }
}
