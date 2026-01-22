import {
  Controller,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportadorService } from './importador.service';

@Controller('import')
export class ImportadorController {
  constructor(private readonly importador: ImportadorService) {}

  @Post('pagos')
  @UseInterceptors(FileInterceptor('file'))
  pagos(
    @UploadedFile() file: Express.Multer.File,
    @Query('periodo') periodoStr: string,
  ) {
    if (!file) throw new BadRequestException('Archivo requerido');
    const periodo = Number(periodoStr);
    return this.importador.importPagos(file.buffer, periodo);
  }

  @Post('matricula')
  @UseInterceptors(FileInterceptor('file'))
  matricula(
    @UploadedFile() file: Express.Multer.File,
    @Query('periodo') periodoStr: string,
  ) {
    if (!file) throw new BadRequestException('Archivo requerido');
    const periodo = Number(periodoStr);
    return this.importador.importMatricula(file.buffer, periodo);
  }

  @Post('junaeb')
  @UseInterceptors(FileInterceptor('file'))
  junaeb(
    @UploadedFile() file: Express.Multer.File,
    @Query('periodo') periodoStr: string,
  ) {
    if (!file) throw new BadRequestException('Archivo requerido');
    const periodo = Number(periodoStr);
    return this.importador.importJunaeb(file.buffer, periodo);
  }

  @Post('invitados')
  @UseInterceptors(FileInterceptor('file'))
  invitados(
    @UploadedFile() file: Express.Multer.File,
    @Query('periodo') periodoStr: string,
  ) {
    if (!file) throw new BadRequestException('Archivo requerido');
    const periodo = Number(periodoStr);
    return this.importador.importInvitados(file.buffer, periodo);
  }

  @Post('asistentes')
  @UseInterceptors(FileInterceptor('file'))
  asistentes(
    @UploadedFile() file: Express.Multer.File,
    @Query('periodo') periodoStr: string,
  ) {
    if (!file) throw new BadRequestException('Archivo requerido');
    const periodo = Number(periodoStr);
    return this.importador.importAsistentes(file.buffer, periodo);
  }
}
