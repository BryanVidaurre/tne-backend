import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReporteController } from './reporte.controller';
import { ReporteService } from './reporte.service';
import { ProcesoTne } from '../proceso/proceso-tne.entity';
import { Alumno } from '../alumno/alumno.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProcesoTne, Alumno])],
  controllers: [ReporteController],
  providers: [ReporteService],
})
export class ReporteModule {}
