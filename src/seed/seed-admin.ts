import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AdminUser } from '../auth/admin-user.entity';
import 'dotenv/config';

async function main() {
  const username = String(process.env.ADMIN_USER || '').trim();
  const password = String(process.env.ADMIN_PASS || '');
  const recoveryKey = String(process.env.ADMIN_RECOVERY_KEY || '');

  if (!username || !password || !recoveryKey) {
    throw new Error('Faltan ADMIN_USER, ADMIN_PASS o ADMIN_RECOVERY_KEY');
  }

  const ds = new DataSource({
    type: 'sqlite',
    database: 'tne.sqlite',
    entities: [AdminUser],
    synchronize: true,
  });

  await ds.initialize();
  const repo = ds.getRepository(AdminUser);

  const existing = await repo.find({ order: { id: 'ASC' }, take: 1 });
  const u = existing[0] ?? repo.create();

  u.username = username;
  u.password_hash = await bcrypt.hash(password, 10);
  u.recovery_key_hash = await bcrypt.hash(recoveryKey, 10);

  await repo.save(u);
  await ds.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
