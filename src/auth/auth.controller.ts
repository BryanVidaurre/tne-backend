import { Body, Controller, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() body: any) {
    const username = String(body?.username || '').trim();
    const password = String(body?.password || '');
    return this.auth.login(username, password);
  }

  @Post('change')
  change(@Req() req: any, @Body() body: any) {
    const username = body?.username ? String(body.username).trim() : undefined;
    const password = body?.password ? String(body.password) : undefined;
    return this.auth.changeCredentials(req.user?.sub, username, password);
  }

  @Public()
  @Post('recover')
  recover(@Body() body: any) {
    const recovery_key = String(body?.recovery_key || '');
    const username = body?.username ? String(body.username).trim() : undefined;
    const password = body?.password ? String(body.password) : undefined;
    const recovery_key_new = body?.recovery_key_new
      ? String(body.recovery_key_new)
      : undefined;
    return this.auth.recover(recovery_key, username, password, recovery_key_new);
  }
}
