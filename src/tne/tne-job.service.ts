import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TneScraperService } from './tne-scraper.service';

@Injectable()
export class TneJobService {
  constructor(
    private readonly ds: DataSource,
    private readonly scraper: TneScraperService,
  ) {}

  async runForSinRegistroJunaeb(periodo: number) {
    const rows = await this.ds.query(
      `
      select a.rut_num, a.rut_dv
      from alumno a
      join proceso_tne pt on a.rut_num = pt.rut_num
      where pt.estado_final like 'SIN_REGISTRO_JUNAEB'
        and pt.periodo = $1
      `,
      [periodo],
    );

    // rows: [{rut_num: ..., rut_dv: ...}, ...]
    return await this.scraper.fetchBatch(rows);
  }
}
