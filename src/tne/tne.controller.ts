import { Controller, Get, Query } from '@nestjs/common';
import { TneJobService } from './tne-job.service';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('TNE')
@ApiBearerAuth('bearer')
@Controller('tne')
export class TneController {
  constructor(private readonly job: TneJobService) {}

  // GET /tne/sin-registro-junaeb?periodo=2026
  @ApiOperation({ summary: 'Ejecutar job para casos sin registro JUNAEB' })
  @ApiQuery({ name: 'periodo', type: Number, required: true, example: 2026 })
  @Get('sin-registro-junaeb')
  async run(@Query('periodo') periodo: string) {
    const p = Number(periodo);
    return this.job.runForSinRegistroJunaeb(p);
  }
}
