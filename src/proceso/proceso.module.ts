import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcesoTne } from './proceso-tne.entity';
import { Alumno } from '../alumno/alumno.entity';
import { TneModule } from '../tne/tne.module';
import { ProcesoService } from './proceso.service';
import { ProcesoController } from './proceso.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProcesoTne, Alumno]), TneModule],
  providers: [ProcesoService],
  controllers: [ProcesoController],
  exports: [ProcesoService],
})
export class ProcesoModule {}

