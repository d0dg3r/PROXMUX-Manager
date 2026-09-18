import fs from 'fs';
import path from 'path';
import { Buffer } from 'buffer';

const libDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../lib');

function toDataUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source, 'utf8').toString('base64')}`;
}

export async function importLibModule(fileName) {
  const filePath = path.join(libDir, fileName);
  let source = fs.readFileSync(filePath, 'utf8');
  source = source.replace(/from '\.\/([^']+)'/g, (_match, depName) => {
    const depSource = fs.readFileSync(path.join(libDir, depName), 'utf8');
    return `from '${toDataUrl(depSource)}'`;
  });
  return import(toDataUrl(source));
}
