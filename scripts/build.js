// Production build wrapper.
// Next.js requires NODE_ENV=production during `next build`. If a hosting dashboard
// (e.g. Render) or a copied .env sets NODE_ENV to "development"/"staging", React is
// loaded in the wrong mode and prerendering crashes with
// "Cannot read properties of null (reading 'useContext')". Force it here.
const { spawnSync } = require('node:child_process');

const env = { ...process.env, NODE_ENV: 'production', EBIKE_LOW_RESOURCE_BUILD: '1' };
const shell = process.platform === 'win32';

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', env, shell });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

run('npx', ['prisma', 'generate']);
run('npx', ['next', 'build']);
