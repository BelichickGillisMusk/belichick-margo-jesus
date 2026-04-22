import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const htmlFiles = [
  'index.html',
  'salesbot.html',
  'carbteststockton/index.html',
  'cleantruckcheckroseville/index.html',
];

for (const relativePath of htmlFiles) {
  const content = readFileSync(join(root, relativePath), 'utf-8');
  if (!content.includes('<!DOCTYPE html>')) {
    throw new Error(`${relativePath} is missing a DOCTYPE declaration.`);
  }
  if (!/<html[\s>]/i.test(content)) {
    throw new Error(`${relativePath} is missing an <html> root element.`);
  }
  if (!/<title>/i.test(content)) {
    throw new Error(`${relativePath} is missing a <title> tag.`);
  }
}

console.log(`Validated ${htmlFiles.length} HTML files.`);
