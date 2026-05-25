import { existsSync } from 'fs';
import { join } from 'path';

const sites = [
  'carb-clean-truck-check',
  'carbteststockton',
  'cleantruckcheckfairfield',
  'cleantruckcheckhayward',
  'cleantruckchecklodi',
  'cleantruckcheckroseville',
  'mobilecarbsmoketest',
  'mobilecarbtest',
];

const required = ['index.html', '_headers', '_redirects', 'robots.txt', 'sitemap.xml', '404.html', 'wrangler.toml'];

let fail = false;

for (const site of sites) {
  for (const file of required) {
    const p = join(site, file);
    if (!existsSync(p)) {
      console.error(`MISSING: ${p}`);
      fail = true;
    }
  }
}

if (fail) {
  process.exit(1);
} else {
  console.log(`All ${sites.length} sites have required files.`);
}
