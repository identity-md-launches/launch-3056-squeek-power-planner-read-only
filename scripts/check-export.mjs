import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
const html=await readFile('dist/index.html','utf8');
for(const value of ['<title>','name="description"','property="og:title"','property="og:image"','rel="icon"']) assert(html.includes(value),'Missing metadata: '+value);
const refs=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(x=>x[1]);
for(const ref of refs){assert(!ref.startsWith('/'),'Absolute asset path: '+ref);if(!/^(https?:|data:|#)/.test(ref))assert((await stat(resolve('dist',ref))).isFile(),'Missing asset: '+ref)}
let bytes=0,files=0;
async function walk(path){for(const item of await readdir(path,{withFileTypes:true})){const p=join(path,item.name);assert(!item.isSymbolicLink(),'Symlink in export: '+p);assert(!['node_modules','.cache','.npm','.vite'].includes(item.name),'Dependency or cache directory in export');if(item.isDirectory())await walk(p);else{assert(!/\.(tgz|map)$/.test(p),'Unnecessary archive/source map: '+p);bytes+=(await stat(p)).size;files++;}}}
await walk('dist');assert(bytes<=2_097_152,'Export exceeds allocated 2 MiB budget');console.log(`PASS export: ${files} files, ${bytes} bytes; local HTML assets resolve at relative URLs; required metadata present.`);
