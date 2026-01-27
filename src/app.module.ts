import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './db/db.module';
import { MailModule } from './mail/mail.module';
import { ProcesoModule } from './proceso/proceso.module';
import { ImportadorModule } from './importador/importador.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { SqlitePragmasService } from './db/sqlite-pragmas.service';
import { ReporteModule } from './reporte/reporte.module';
import { TneModule } from './tne/tne.module';

@Module({
  providers: [SqlitePragmasService],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    MailModule,
    ProcesoModule,
    ImportadorModule,
    NotificacionesModule,
    ReporteModule,
    TneModule,
  ],
})
export class AppModule {}
