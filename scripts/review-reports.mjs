import path from 'node:path';
import { recordStore } from '../lib/binary-records.mjs';
const records = recordStore(path.resolve(process.env.DATA_DIR || './data/components'));
for (const name of (await records.names()).filter(name => name.startsWith('report-'))) {
  console.log(JSON.stringify(await records.read(name), null, 2));
}
