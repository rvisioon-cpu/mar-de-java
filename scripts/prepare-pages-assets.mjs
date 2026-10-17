import { readdirSync, rmSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = '.open-next/assets';
let removed = 0;
function prepare(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      prepare(path);
      continue;
    }
    const key = relative(root, path).split(sep).join('/');
    // These files are served by the R2 binding, never bundled into Pages.
    if (/\.(mp4|webm|ogg|mov|avi)$/i.test(key) || /^(amenities|homepage|building)\//.test(key)) {
      rmSync(path);
      removed++;
    } else if (statSync(path).size > 25 * 1024 * 1024) {
      throw new Error(`Pages asset exceeds 25 MiB: ${key}`);
    }
  }
}
prepare(root);
console.log(`Pages prepared: ${removed} media files excluded; served from R2.`);
