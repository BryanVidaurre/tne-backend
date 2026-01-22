import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alumno } from '../alumno/alumno.entity';
import { ProcesoTne } from '../proceso/proceso-tne.entity';
import { NotificacionEmail } from '../notificaciones/notificacion-email.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'tne.sqlite',
      entities: [Alumno, ProcesoTne, NotificacionEmail],
      synchronize: true, // en producción usar migraciones
    }),
  ],
})
export class DbModule {}
