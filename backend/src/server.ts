import { buildApp } from './app.js';
import { env } from './config/env.js';
import { closePool } from './db/index.js';
import { runMigrations } from './db/migrate.js';

async function start() {
  const app = buildApp();

  // Run database migrations on startup
  try {
    await runMigrations();
  } catch (err) {
    console.error('Failed to run database migrations on startup:', err);
    process.exit(1);
  }

  // Start HTTP Server
  try {
    const address = await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`🚀 EquipTrack API server running at ${address}`);
    console.log(`📡 Environment: ${env.NODE_ENV}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful Shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      console.log(`\nReceived ${signal}, shutting down gracefully...`);
      try {
        await app.close();
        await closePool();
        console.log('Server and database pool closed successfully.');
        process.exit(0);
      } catch (err) {
        console.error('Error during graceful shutdown:', err);
        process.exit(1);
      }
    });
  }
}

start();
