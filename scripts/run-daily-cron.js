const baseUrl = process.env.CRON_TARGET_URL;
const secret = process.env.CRON_SECRET;

if (!baseUrl || !secret) {
  console.error('Cron target or secret is missing');
  process.exit(1);
}

async function run() {
  const response = await fetch(new URL('/api/admin/system/cron', baseUrl), {
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(10 * 60 * 1000),
  });
  const body = await response.json();
  if (!response.ok || body.status !== 'success') {
    console.error('Daily collection job failed', { httpStatus: response.status, result: body.status, errors: body.errors });
    process.exitCode = 1;
    return;
  }
  console.info('Daily collection job completed', body.results);
}

run().catch((error) => {
  console.error('Daily collection job could not reach the app', error);
  process.exitCode = 1;
});
