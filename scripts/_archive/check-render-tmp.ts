import fs from 'node:fs';
const src = fs.readFileSync('packages/occ/src/build.ts', 'utf8');
const m = /STUDIO_RENDER_TMP \?\? '([^']+)'/.exec(src)!;
const value = eval(`'${m[1]}'`);  // evaluate the JS literal exactly as the builder would
console.log(JSON.stringify(value), fs.existsSync(value));
