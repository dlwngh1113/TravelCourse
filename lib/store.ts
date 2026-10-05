import 'server-only';
import { mkdir, readFile, readdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { Component, seeds } from './components';
const directory = path.resolve(process.env.DATA_DIR || './data/components');
export async function listComponents(): Promise<Component[]> { await mkdir(directory,{recursive:true}); const files=await readdir(directory); const items=await Promise.all(files.filter(f=>f.endsWith('.json')).map(async f=>JSON.parse(await readFile(path.join(directory,f),'utf8')) as Component)); return [...items.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),...seeds]; }
export async function saveComponent(item:Component) { await mkdir(directory,{recursive:true}); const target=path.join(directory,`${item.id}.json`); await writeFile(`${target}.tmp`,JSON.stringify(item),'utf8'); await rename(`${target}.tmp`,target); }

