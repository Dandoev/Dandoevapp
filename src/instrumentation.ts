import logger from './lib/logger';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.DISABLE_BACKGROUND_WORKERS === 'true') {
      logger.warn('Background workers disabled for this process');
      return;
    }
    try {
      logger.info('Starting background workers via instrumentation...');
      const { startWorkers } = await import('./lib/workers');
      startWorkers();
    } catch (e) {
      console.error('Failed to start background workers in instrumentation:', e);
    }
  }
}
