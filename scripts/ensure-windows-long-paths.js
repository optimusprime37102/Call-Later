/**
 * Ninja 1.12+ only accepts paths longer than 260 characters when Windows
 * long paths are enabled (RtlAreLongPathsEnabled). Without this, CMake object
 * files under New Architecture fail with:
 *   Filename longer than 260 characters
 *
 * Enabling LongPathsEnabled is a one-time HKLM change (admin / UAC).
 */
const { execFileSync, spawnSync } = require('child_process');

const REG_PATH = 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\FileSystem';
const REG_NAME = 'LongPathsEnabled';

function isWindows() {
  return process.platform === 'win32';
}

function readLongPathsEnabled() {
  try {
    const out = execFileSync(
      'reg.exe',
      ['query', REG_PATH, '/v', REG_NAME],
      { encoding: 'utf8' },
    );
    const match = out.match(/LongPathsEnabled\s+REG_DWORD\s+0x([0-9a-fA-F]+)/);
    if (!match) return 0;
    return parseInt(match[1], 16);
  } catch {
    return 0;
  }
}

function trySetLongPathsEnabled() {
  const result = spawnSync(
    'reg.exe',
    ['add', REG_PATH, '/v', REG_NAME, '/t', 'REG_DWORD', '/d', '1', '/f'],
    { encoding: 'utf8' },
  );
  return result.status === 0 && readLongPathsEnabled() === 1;
}

function trySetLongPathsEnabledElevated() {
  const ps = [
    "$ErrorActionPreference = 'Stop'",
    "$p = 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\FileSystem'",
    "New-ItemProperty -Path $p -Name 'LongPathsEnabled' -Value 1 -PropertyType DWORD -Force | Out-Null",
  ].join('; ');

  const encoded = Buffer.from(ps, 'utf16le').toString('base64');
  const result = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `Start-Process -FilePath powershell.exe -Verb RunAs -Wait -ArgumentList @('-NoProfile','-EncodedCommand','${encoded}')`,
    ],
    { encoding: 'utf8', windowsHide: false },
  );
  return result.status === 0 && readLongPathsEnabled() === 1;
}

function printManualInstructions() {
  console.error(`
Windows long paths are DISABLED. Ninja cannot build this app until they are enabled.

1) Approve the UAC prompt if one appeared, OR
2) Run this once in Administrator PowerShell:

   New-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\FileSystem' -Name 'LongPathsEnabled' -Value 1 -PropertyType DWORD -Force

Then open a NEW terminal and run: npm run android:device
`);
}

function main() {
  if (!isWindows()) {
    return;
  }

  if (readLongPathsEnabled() === 1) {
    process.stdout.write('Windows long paths: enabled\n');
    return;
  }

  process.stdout.write(
    'Windows long paths: disabled — enabling (approve UAC if prompted)...\n',
  );

  if (trySetLongPathsEnabled()) {
    process.stdout.write('Windows long paths: enabled\n');
    return;
  }

  // Skip interactive UAC when not attached to a real console (e.g. some agents).
  const allowUac =
    process.env.ALLOW_UAC === '1' ||
    Boolean(process.stdout.isTTY) ||
    Boolean(process.stderr.isTTY);

  if (allowUac && trySetLongPathsEnabledElevated()) {
    process.stdout.write('Windows long paths: enabled (via UAC)\n');
    return;
  }

  printManualInstructions();
  process.exit(1);
}

main();
