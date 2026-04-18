import fs from 'node:fs';
import path from 'node:path';

const mode = process.argv[2];
const rootDir = process.cwd();
const appDir = path.join(rootDir, 'src', 'app');
const apiDir = path.join(appDir, 'api');
const disabledApiDir = path.join(appDir, '_api-disabled');

function moveIfPresent(from, to) {
  if (!fs.existsSync(from)) return false;
  if (fs.existsSync(to)) {
    throw new Error(`Target already exists: ${path.relative(rootDir, to)}`);
  }
  try {
    fs.renameSync(from, to);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'EPERM') {
      throw new Error(
        `Failed to move ${path.relative(rootDir, from)}. Another local dev/server process is probably using app/api. Stop the running local server and try again.`
      );
    }
    throw error;
  }
  return true;
}

try {
  if (mode === 'enable') {
    const moved = moveIfPresent(apiDir, disabledApiDir);
    console.log(
      moved
        ? 'Static export mode enabled: src/app/api -> src/app/_api-disabled'
        : 'Static export mode already enabled or src/app/api missing'
    );
    process.exit(0);
  }

  if (mode === 'restore') {
    const moved = moveIfPresent(disabledApiDir, apiDir);
    console.log(
      moved
        ? 'Static export mode restored: src/app/_api-disabled -> src/app/api'
        : 'Static export mode already restored'
    );
    process.exit(0);
  }

  console.error('Usage: node scripts/toggle-static-export.mjs <enable|restore>');
  process.exit(1);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
