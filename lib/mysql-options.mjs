import { readFileSync } from 'node:fs';

export function mysqlOptions() {
  if (!process.env.MYSQL_URL) throw new Error('MYSQL_URL is required');
  const url = new URL(process.env.MYSQL_URL);
  if (url.protocol !== 'mysql:' || !url.hostname || url.pathname.length < 2) throw new Error('MYSQL_URL must specify a MySQL host and database');
  return {
    host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password), database: decodeURIComponent(url.pathname.slice(1)),
    supportBigNumbers: true, bigNumberStrings: true,
    ...(process.env.MYSQL_SSL === 'true' ? { ssl: { rejectUnauthorized: true,
      ...(process.env.MYSQL_SSL_CA ? { ca: readFileSync(process.env.MYSQL_SSL_CA, 'utf8') } : {}) } } : {}),
  };
}
