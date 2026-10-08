import 'server-only';
import mysql, { type Pool } from 'mysql2/promise';
import { mysqlOptions } from './mysql-options.mjs';

// Keep the driver behind this module so domain services never depend on MySQL.
let pool: Pool | undefined;
export function mysqlPool(): Pool {
  if (!process.env.MYSQL_URL) throw new Error('MYSQL_URL is required');
  if (!pool) {
    pool = mysql.createPool({ ...mysqlOptions(), connectionLimit: 10 });
  }
  return pool!;
}
