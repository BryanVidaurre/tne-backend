import { Body, Controller, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';

class LoginDto {
  @ApiProperty({ example: 'admin' })
  username!: string;

  @ApiProperty({ example: '123456' })
  password!: string;
}

class ChangeCredentialsDto {
  @ApiProperty({ required: false, example: 'admin' })
  username?: string;

  @ApiProperty({ required: false, example: 'nuevo-password' })
  password?: string;
}

class RecoverDto {
  @ApiProperty({ example: 'mi-clave-recuperacion' })
  recovery_key!: string;

  @ApiProperty({ required: false, example: 'admin' })
  username?: string;

  @ApiProperty({ required: false, example: 'nuevo-password' })
  password?: string;

  @ApiProperty({ required: false, example: 'nueva-clave-recuperacion' })
  recovery_key_new?: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @ApiOperation({ summary: 'Iniciar sesion y obtener token JWT' })
  @ApiBody({ type: LoginDto })
  @Post('login')
  login(@Body() body: LoginDto) {
    const username = String(body?.username || '').trim();
    const password = String(body?.password || '');
    return this.auth.login(username, password);
  }

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Cambiar usuario y/o password autenticado' })
  @ApiBody({ type: ChangeCredentialsDto })
  @Post('change')
  change(@Req() req: any, @Body() body: ChangeCredentialsDto) {
    const username = body?.username ? String(body.username).trim() : undefined;
    const password = body?.password ? String(body.password) : undefined;
    return this.auth.changeCredentials(req.user?.sub, username, password);
  }

  @Public()
  @ApiOperation({ summary: 'Recuperar credenciales usando recovery key' })
  @ApiBody({ type: RecoverDto })
  @Post('recover')
  recover(@Body() body: RecoverDto) {
    const recovery_key = String(body?.recovery_key || '');
    const username = body?.username ? String(body.username).trim() : undefined;
    const password = body?.password ? String(body.password) : undefined;
    const recovery_key_new = body?.recovery_key_new
      ? String(body.recovery_key_new)
      : undefined;
    return this.auth.recover(recovery_key, username, password, recovery_key_new);
  }
}
