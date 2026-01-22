import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class SqlitePragmasService implements OnModuleInit {
  constructor(private readonly ds: DataSource) {}

  async onModuleInit() {
    await this.ds.query('PRAGMA journal_mode = WAL;');
    await this.ds.query('PRAGMA synchronous = NORMAL;');
    await this.ds.query('PRAGMA busy_timeout = 60000;');
  }
}
