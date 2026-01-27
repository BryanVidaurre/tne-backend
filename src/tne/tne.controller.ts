import { Controller, Get, Query } from '@nestjs/common';
import { TneJobService } from './tne-job.service';

@Controller('tne')
export class TneController {
  constructor(private readonly job: TneJobService) {}

  // GET /tne/sin-registro-junaeb?periodo=2026
  @Get('sin-registro-junaeb')
  async run(@Query('periodo') periodo: string) {
    const p = Number(periodo);
    return this.job.runForSinRegistroJunaeb(p);
  }
}
