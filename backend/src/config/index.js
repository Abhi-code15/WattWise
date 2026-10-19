import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5050', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'wattwise-fallback-secret-2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  simulatorApiKey: process.env.SIMULATOR_API_KEY || 'wattwise-internal-simulator-key-xyz789',
  simulatorIntervalMs: parseInt(process.env.SIMULATOR_INTERVAL_MS || '15000', 10),
  simulatorAutostart: process.env.SIMULATOR_AUTOSTART !== 'false',
  defaultTariffRate: parseFloat(process.env.DEFAULT_TARIFF_RATE || '7.50'),
  offlineTimeoutSeconds: parseInt(process.env.OFFLINE_TIMEOUT_SECONDS || '90', 10),
  staleTimeoutSeconds: parseInt(process.env.STALE_TIMEOUT_SECONDS || '45', 10),
  highPowerConsecutiveReadings: parseInt(process.env.HIGH_POWER_CONSECUTIVE_READINGS || '10', 10)
};
