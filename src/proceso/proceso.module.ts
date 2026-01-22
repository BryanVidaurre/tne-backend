import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcesoTne } from './proceso-tne.entity';
import { ProcesoService } from './proceso.service';
import { ProcesoController } from './proceso.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProcesoTne])],
  providers: [ProcesoService],
  controllers: [ProcesoController],
  exports: [ProcesoService],
})
export class ProcesoModule {}
