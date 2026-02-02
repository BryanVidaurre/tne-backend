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
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth/auth.guard';

@Module({
  providers: [
    SqlitePragmasService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    MailModule,
    ProcesoModule,
    ImportadorModule,
    NotificacionesModule,
    ReporteModule,
    TneModule,
    AuthModule,
  ],
})
export class AppModule {}
