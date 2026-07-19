import { discoverCells } from './lib/cells.mjs';

const catalog = await discoverCells();
if (catalog.errors.length > 0) {
  console.error(JSON.stringify(catalog, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify(catalog, null, 2));
}
