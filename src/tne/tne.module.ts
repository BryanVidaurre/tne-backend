import { Module } from '@nestjs/common';
import { TneScraperService } from './tne-scraper.service';
import { TneJobService } from './tne-job.service';
import { TneController } from './tne.controller';

@Module({
  controllers: [TneController],
  providers: [TneScraperService, TneJobService],
  exports: [TneScraperService, TneJobService],
})
export class TneModule {}
