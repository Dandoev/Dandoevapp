// ============================================================
// Prisma Client Singleton (prevents hot-reload connection leaks)
// ============================================================
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

console.log(`[Prisma] Initializing client in runtime: ${process.env.NEXT_RUNTIME || 'unknown'}`);

const connectionString = process.env.DATABASE_URL || 'postgresql://dandoev_user:dandoev_password@localhost:5432/dandoev?schema=public';
const isCloudDb = connectionString.includes('supabase.com') || connectionString.includes('supabase.co') || connectionString.includes('neon.tech') || connectionString.includes('sslmode=require');
const pool = new Pool({
  connectionString,
  ssl: isCloudDb ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
