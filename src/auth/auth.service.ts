import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AdminUser } from './admin-user.entity';

type AppJwtPayload = { sub: number; username: string };

function isAppJwtPayload(v: unknown): v is AppJwtPayload {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  return typeof obj.sub === 'number' && typeof obj.username === 'string';
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(AdminUser)
    private readonly adminRepo: Repository<AdminUser>,
  ) {}

  private getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('Falta JWT_SECRET en el entorno');
    return secret;
  }

  async login(username: string, password: string) {
    if (!username || !password)
      throw new BadRequestException('Username y password requeridos');

    const u = await this.adminRepo.findOne({ where: { username } });
    if (!u) throw new UnauthorizedException('Credenciales inválidas');

    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    const token = jwt.sign(
      { sub: u.id, username: u.username } satisfies AppJwtPayload,
      this.getJwtSecret(),
      { expiresIn: '12h' },
    );

    return { token, username: u.username };
  }

  verifyToken(token: string): AppJwtPayload {
    try {
      const decoded = jwt.verify(token, this.getJwtSecret()); // string | object
      if (!isAppJwtPayload(decoded)) {
        throw new UnauthorizedException('Token inválido');
      }
      return decoded;
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
  }

  async changeCredentials(
    userId: number,
    username?: string,
    password?: string,
  ) {
    if (!username && !password)
      throw new BadRequestException('Debe indicar username y/o password');

    const u = await this.adminRepo.findOne({ where: { id: userId } });
    if (!u) throw new UnauthorizedException('Usuario no encontrado');

    if (username) u.username = username.trim();
    if (password) u.password_hash = await bcrypt.hash(password, 10);

    await this.adminRepo.save(u);
    return { ok: true, username: u.username };
  }

  async recover(
    recovery_key: string,
    username?: string,
    password?: string,
    recovery_key_new?: string,
  ) {
    if (!recovery_key) throw new BadRequestException('recovery_key requerido');
    if (!username && !password && !recovery_key_new)
      throw new BadRequestException(
        'Debe indicar username, password o recovery_key_new',
      );

    const u = await this.adminRepo.findOne({ order: { id: 'ASC' } });
    if (!u) throw new UnauthorizedException('Usuario no encontrado');

    const ok = await bcrypt.compare(recovery_key, u.recovery_key_hash);
    if (!ok) throw new UnauthorizedException('Recovery key inválida');

    if (username) u.username = username.trim();
    if (password) u.password_hash = await bcrypt.hash(password, 10);
    if (recovery_key_new)
      u.recovery_key_hash = await bcrypt.hash(recovery_key_new, 10);

    await this.adminRepo.save(u);
    return { ok: true, username: u.username };
  }
}
