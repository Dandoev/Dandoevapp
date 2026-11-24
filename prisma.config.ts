import path from 'node:path';
import fs from 'node:fs';
import { defineConfig } from 'prisma/config';

// Simple .env loader for Windows/CLI issues
function getDbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const env = fs.readFileSync(envPath, 'utf8');
      const match = env.match(/^DATABASE_URL=["']?(.+?)["']?$/m);
      if (match) return match[1];
    }
  } catch (e) {}
  return 'postgresql://dandoev_user:dandoev_password@localhost:5432/dandoev?schema=public';
}

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  migrations: {
    seed: 'node -r dotenv/config -r ts-node/register prisma/seed.ts',
  },
  datasource: {
    url: getDbUrl(),
  },
});
