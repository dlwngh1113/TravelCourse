import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import driver from 'mysql2/promise';
import { mysqlOptions } from '../lib/mysql-options.mjs';
if(!process.env.MYSQL_URL)throw new Error('MYSQL_URL is required');
const db=await driver.createConnection(mysqlOptions());
try {
 await db.query(await readFile(new URL('../db/schema.sql',import.meta.url),'utf8'));
 if(process.argv.includes('--import')) {
  const root=path.resolve(process.env.INVITATION_DATA_DIR||'./data/invitations');
  for(const name of await readdir(root)) {
   if(!/^[a-zA-Z0-9_-]+\.bin$/.test(name))continue;
   const key=name.slice(0,-4), bytes=await readFile(path.join(root,name));
   const [rows]=await db.execute('SELECT payload FROM app_records WHERE record_key=?',[key]);
   if(rows.length) {if(!Buffer.from(rows[0].payload).equals(bytes))throw new Error('Conflicting record: '+key);continue;}
   await db.execute('INSERT INTO app_records(record_key,payload) VALUES (?,?)',[key,bytes]);
  }
 }
 console.log('MySQL schema/import completed. Original files retained.');
}finally{await db.end();}
