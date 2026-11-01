// Production start wrapper for Render & containerized platforms.
// Render provides process.env.PORT (e.g. 10000) and requires binding to 0.0.0.0 so external health checks can reach the server.
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const port = process.env.PORT || '3000';
const hostname = process.env.HOSTNAME || '0.0.0.0';

console.log(`[start] Starting Next.js production server on ${hostname}:${port}...`);

const isWin = process.platform === 'win32';
const nextBin = path.join(__dirname, '..', 'node_modules', '.bin', isWin ? 'next.cmd' : 'next');
const useDirectBin = fs.existsSync(nextBin);

const cmd = useDirectBin ? nextBin : 'npx';
const args = useDirectBin
  ? ['start', '-H', hostname, '-p', String(port)]
  : ['next', 'start', '-H', hostname, '-p', String(port)];

const child = spawn(
  cmd,
  args,
  {
    stdio: 'inherit',
    shell: isWin,
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: hostname,
      NODE_ENV: 'production',
    },
  }
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
