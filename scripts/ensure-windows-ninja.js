/**
 * Keep the Android SDK Ninja binary new enough for Windows builds.
 * Ninja 1.10 (shipped with CMake 3.22.1) rejects paths > 260 characters.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const NINJA_VERSION = '1.13.2';
const NINJA_ZIP_URL = `https://github.com/ninja-build/ninja/releases/download/v${NINJA_VERSION}/ninja-win.zip`;

function isWindows() {
  return process.platform === 'win32';
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const request = (currentUrl) => {
      https
        .get(currentUrl, (res) => {
          if (
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            res.resume();
            request(res.headers.location);
            return;
          }
          if (res.statusCode !== 200) {
            res.resume();
            reject(
              new Error(`Download failed (${res.statusCode}): ${currentUrl}`),
            );
            return;
          }
          const file = fs.createWriteStream(dest);
          res.pipe(file);
          file.on('finish', () => file.close(resolve));
          file.on('error', reject);
        })
        .on('error', reject);
    };
    request(url);
  });
}

function ninjaVersion(exe) {
  try {
    return execFileSync(exe, ['--version'], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function versionAtLeast(current, minimum) {
  const toNums = (v) =>
    String(v)
      .split('.')
      .map((part) => parseInt(part, 10) || 0);
  const a = toNums(current);
  const b = toNums(minimum);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    const av = a[i] || 0;
    const bv = b[i] || 0;
    if (av > bv) return true;
    if (av < bv) return false;
  }
  return true;
}

async function ensureProjectNinja(projectRoot) {
  const destDir = path.join(projectRoot, 'tools', 'ninja');
  const destExe = path.join(destDir, 'ninja.exe');
  if (fs.existsSync(destExe) && versionAtLeast(ninjaVersion(destExe), '1.12.0')) {
    return destExe;
  }

  fs.mkdirSync(destDir, { recursive: true });
  const zipPath = path.join(destDir, 'ninja-win.zip');
  process.stdout.write(`Downloading Ninja ${NINJA_VERSION}...\n`);
  await download(NINJA_ZIP_URL, zipPath);
  execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force`,
    ],
    { stdio: 'inherit' },
  );
  fs.rmSync(zipPath, { force: true });
  if (!fs.existsSync(destExe)) {
    throw new Error(`Ninja extract failed: ${destExe} not found`);
  }
  return destExe;
}

function androidSdkRoot() {
  return (
    process.env.ANDROID_HOME ||
    process.env.ANDROID_SDK_ROOT ||
    path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk')
  );
}

function replaceSdkNinjas(newNinja) {
  const cmakeRoot = path.join(androidSdkRoot(), 'cmake');
  if (!fs.existsSync(cmakeRoot)) {
    return [];
  }
  const replaced = [];
  for (const entry of fs.readdirSync(cmakeRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const sdkNinja = path.join(cmakeRoot, entry.name, 'bin', 'ninja.exe');
    if (!fs.existsSync(sdkNinja)) continue;
    const current = ninjaVersion(sdkNinja);
    if (versionAtLeast(current, '1.12.0')) continue;
    const backup = `${sdkNinja}.sdk-orig`;
    if (!fs.existsSync(backup)) {
      fs.copyFileSync(sdkNinja, backup);
    }
    fs.copyFileSync(newNinja, sdkNinja);
    replaced.push({
      path: sdkNinja,
      from: current || 'unknown',
      to: ninjaVersion(sdkNinja),
    });
  }
  return replaced;
}

async function main() {
  const projectRoot = path.resolve(__dirname, '..');
  if (!isWindows()) {
    return;
  }

  // Ninja 1.12+ still refuses >260 paths unless Windows LongPathsEnabled=1.
  execFileSync(process.execPath, [path.join(__dirname, 'ensure-windows-long-paths.js')], {
    stdio: 'inherit',
  });

  const ninjaExe = await ensureProjectNinja(projectRoot);
  process.stdout.write(`Using Ninja ${ninjaVersion(ninjaExe)} at ${ninjaExe}\n`);
  for (const item of replaceSdkNinjas(ninjaExe)) {
    process.stdout.write(
      `Replaced SDK Ninja ${item.from} -> ${item.to}: ${item.path}\n`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
