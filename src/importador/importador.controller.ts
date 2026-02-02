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
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Importador')
@ApiBearerAuth('bearer')
@Controller('import')
export class ImportadorController {
  constructor(private readonly importador: ImportadorService) {}

  @ApiOperation({ summary: 'Importar archivo de pagos' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'periodo', type: Number, required: true, example: 2026 })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
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

  @ApiOperation({ summary: 'Importar archivo de matricula' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'periodo', type: Number, required: true, example: 2026 })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
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

  @ApiOperation({ summary: 'Importar archivo de JUNAEB' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'periodo', type: Number, required: true, example: 2026 })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
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

  @ApiOperation({ summary: 'Importar archivo de invitados' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'periodo', type: Number, required: true, example: 2026 })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
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

  @ApiOperation({ summary: 'Importar archivo de asistentes' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'periodo', type: Number, required: true, example: 2026 })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
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
