process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-jest-only';
process.env.PGUSER = process.env.PGUSER || 'test-pg-user';
process.env.PGHOST = process.env.PGHOST || 'localhost';
process.env.PGDATABASE = process.env.PGDATABASE || 'test-db';
process.env.PGPASSWORD = process.env.PGPASSWORD || 'test-pg-password-for-jest-only';
