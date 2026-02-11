import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);

const map = {
  win32: {
    x64: '@rollup/rollup-win32-x64-msvc',
    arm64: '@rollup/rollup-win32-arm64-msvc',
    ia32: '@rollup/rollup-win32-ia32-msvc',
  },
  darwin: {
    x64: '@rollup/rollup-darwin-x64',
    arm64: '@rollup/rollup-darwin-arm64',
  },
  linux: {
    x64: '@rollup/rollup-linux-x64-gnu',
    arm64: '@rollup/rollup-linux-arm64-gnu',
  },
};

const pkg = map[process.platform]?.[process.arch];

if (!pkg) {
  process.exit(0);
}

try {
  require.resolve(pkg);
} catch {
  console.warn(`Missing optional Rollup binary: ${pkg}. Installing workaround package...`);
  try {
    execSync(`npm install --no-save ${pkg}`, { stdio: 'inherit' });
  } catch {
    console.error(`Failed to auto-install ${pkg}.`);
    console.error('Run: rm -rf node_modules package-lock.json && npm install');
    process.exit(1);
  }
}
