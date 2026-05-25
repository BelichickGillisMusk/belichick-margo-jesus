import { readFileSync } from 'fs';
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

const checks = [
  { name: 'DOCTYPE', test: html => html.startsWith('<!DOCTYPE html>') },
  { name: 'lang attribute', test: html => html.includes('lang="en"') },
  { name: 'viewport meta', test: html => html.includes('name="viewport"') },
  { name: 'canonical link', test: html => html.includes('rel="canonical"') },
  { name: 'JSON-LD schema', test: html => html.includes('application/ld+json') },
  { name: 'CARB Tester ID IF530523', test: html => html.includes('IF530523') },
  { name: 'cleantruckcheckvin.app', test: html => html.includes('cleantruckcheckvin.app') },
  { name: 'free retest', test: html => /free retest/i.test(html) },
  { name: 'no norcalcarbmobile.com', test: html => !html.includes('norcalcarbmobile.com') },
];

let fail = false;

for (const site of sites) {
  const html = readFileSync(join(site, 'index.html'), 'utf8');
  for (const check of checks) {
    if (!check.test(html)) {
      console.error(`FAIL [${site}]: ${check.name}`);
      fail = true;
    }
  }
}

if (fail) {
  process.exit(1);
} else {
  console.log(`All ${sites.length} sites passed ${checks.length} HTML checks.`);
}
