import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportadorController } from './importador.controller';
import { ImportadorService } from './importador.service';
import { Alumno } from '../alumno/alumno.entity';
import { ProcesoTne } from '../proceso/proceso-tne.entity';
import { ProcesoModule } from '../proceso/proceso.module';

@Module({
  imports: [TypeOrmModule.forFeature([Alumno, ProcesoTne]), ProcesoModule],
  controllers: [ImportadorController],
  providers: [ImportadorService],
})
export class ImportadorModule {}
