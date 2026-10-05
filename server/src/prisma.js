const { PrismaClient } = require('@prisma/client');

if (!process.env.DATABASE_URL) {
  console.warn('⚠️ [Prisma] Warning: DATABASE_URL environment variable is not defined.');
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
