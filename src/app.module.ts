import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { ProcesoModule } from './proceso/proceso.module';
import { ImportadorModule } from './importador/importador.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    DbModule,
    MailModule,
    ProcesoModule,
    ImportadorModule,
    NotificacionesModule,
  ],
})
export class AppModule {}
