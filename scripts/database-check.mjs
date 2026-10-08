import mysql from 'mysql2/promise';
import { mysqlOptions } from '../lib/mysql-options.mjs';
const connection = await mysql.createConnection(mysqlOptions());
try {
  await connection.execute('SELECT 1');
  await connection.execute('SELECT record_key FROM app_records LIMIT 1');
  console.log('PASS: MySQL connection and app_records schema');
} finally { await connection.end(); }
