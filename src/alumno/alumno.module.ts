import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Alumno } from './alumno.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Alumno])],
  exports: [TypeOrmModule],
})
export class AlumnoModule {}
