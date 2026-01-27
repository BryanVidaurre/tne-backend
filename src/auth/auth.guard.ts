import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const authHeader = String(req.headers?.authorization || '');
    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta Bearer token');
    }

    const token = authHeader.slice(7).trim();
    if (!token) throw new UnauthorizedException('Falta Bearer token');

    const payload = this.auth.verifyToken(token);
    req.user = payload;
    return true;
  }
}
