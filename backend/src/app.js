import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler.js';

// Polyfill BigInt serialization for Express JSON responses
BigInt.prototype.toJSON = function () {
  return Number(this);
};

import authRouter from './modules/auth/auth.routes.js';
import hostelRouter from './modules/hostels/hostels.routes.js';
import roomRouter from './modules/rooms/rooms.routes.js';
import deviceRouter from './modules/devices/devices.routes.js';
import telemetryRouter from './modules/telemetry/telemetry.routes.js';
import alertRouter from './modules/alerts/alerts.routes.js';
import analyticsRouter from './modules/analytics/analytics.routes.js';
import tariffRouter from './modules/tariffs/tariffs.routes.js';
import simulatorRouter from './modules/simulator/simulator.routes.js';

export const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Health check endpoints (liveness & readiness)
app.get(['/health', '/health/live', '/health/ready'], (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'WattWise Backend API',
    version: '1.0.0'
  });
});

// Versioned API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1', hostelRouter);
app.use('/api/v1', roomRouter);
app.use('/api/v1', deviceRouter);
app.use('/api/v1', telemetryRouter);
app.use('/api/v1', alertRouter);
app.use('/api/v1', analyticsRouter);
app.use('/api/v1', tariffRouter);
app.use('/api/v1', simulatorRouter);

// Centralized error handler
app.use(errorHandler);
