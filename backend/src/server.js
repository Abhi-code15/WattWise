import http from 'http';
import { app } from './app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { setupSocketIO } from './sockets/socketHandler.js';
import { AlertService } from './modules/alerts/alerts.service.js';
import { simulatorEngine } from './modules/simulator/simulator.engine.js';
import { prisma } from './config/prisma.js';

const server = http.createServer(app);

// Initialize Socket.IO
setupSocketIO(server);

// Background timer for offline / stale meter monitoring
const offlineCheckInterval = setInterval(() => {
  AlertService.checkOfflineMeters();
}, 15000);

server.listen(config.port, async () => {
  logger.info(`🚀 WattWise Backend Server running on port ${config.port} (env: ${config.nodeEnv})`);

  // Initialize and optionally autostart simulator
  try {
    await simulatorEngine.initialize();
    if (config.simulatorAutostart) {
      simulatorEngine.start(config.simulatorIntervalMs);
    }
  } catch (err) {
    logger.error('Failed to autostart simulator', { error: err.message });
  }
});

// Graceful shutdown
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  clearInterval(offlineCheckInterval);
  simulatorEngine.stop();

  server.close(async () => {
    logger.info('HTTP server closed.');
    await prisma.$disconnect();
    logger.info('Database disconnected. Exiting.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
