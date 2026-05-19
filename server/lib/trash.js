import { spawn } from 'node:child_process';

function classifyKind(stat) {
  if (stat.isSymbolicLink()) return 'symlink';
  if (stat.isDirectory()) return 'dir';
  if (stat.isFile()) return 'file';
  return 'other';
}

function runOsaScript(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('/usr/bin/osascript', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (buf) => { stdout += buf.toString('utf8'); });
    child.stderr.on('data', (buf) => { stderr += buf.toString('utf8'); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }
      const msg = stderr.trim() || stdout.trim() || `osascript exited with code ${code}`;
      reject(new Error(msg));
    });
  });
}

export async function movePathToTrash(absPath, stat) {
  if (process.platform !== 'darwin') {
    const err = new Error('移到废纸篓当前仅支持 macOS');
    err.statusCode = 501;
    throw err;
  }

  const kind = classifyKind(stat);
  if (kind === 'other') {
    const err = new Error('只支持删除文件、目录或符号链接');
    err.statusCode = 400;
    throw err;
  }

  await runOsaScript([
    '-e', 'on run argv',
    '-e', 'set targetPath to item 1 of argv',
    '-e', 'tell application "Finder"',
    '-e', 'delete (targetPath as POSIX file)',
    '-e', 'end tell',
    '-e', 'end run',
    absPath,
  ]);

  return { kind };
}
