import express from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';
import { authenticateTelemetrySource } from '../../middleware/auth.js';
import { AlertService } from '../alerts/alerts.service.js';
import { getSocketIO } from '../../sockets/socketHandler.js';

const router = express.Router();

const readingSchema = z.object({
  deviceId: z.string().min(1, 'deviceId is required'),
  sequenceNumber: z.number().int().nonnegative('sequenceNumber must be non-negative integer'),
  timestamp: z.string().datetime().or(z.date()),
  powerW: z.number().min(0, 'Power cannot be negative').max(100000, 'Power exceeds realistic range'),
  voltageV: z.number().min(100, 'Voltage below realistic lower threshold').max(300, 'Voltage exceeds upper threshold'),
  currentA: z.number().min(0).max(200),
  powerFactor: z.number().min(0.0).max(1.0),
  cumulativeEnergyKWh: z.number().min(0, 'Cumulative energy cannot be negative'),
  quality: z.string().default('valid')
});

const payloadSchema = z.union([
  readingSchema,
  z.array(readingSchema),
  z.object({ readings: z.array(readingSchema) })
]);

router.post('/telemetry/readings', authenticateTelemetrySource, async (req, res, next) => {
  try {
    const parsed = payloadSchema.parse(req.body);
    const rawReadings = Array.isArray(parsed)
      ? parsed
      : (parsed.readings ? parsed.readings : [parsed]);

    if (rawReadings.length === 0) {
      return res.status(400).json({ success: false, error: 'Empty readings array' });
    }

    const processedResults = [];

    for (const item of rawReadings) {
      const device = await prisma.device.findUnique({
        where: { deviceUid: item.deviceId },
        include: { room: true }
      });

      if (!device) {
        logger.warn(`Telemetry ignored for unknown device: ${item.deviceId}`);
        processedResults.push({ deviceId: item.deviceId, status: 'UNKNOWN_DEVICE' });
        continue;
      }

      const eventDate = new Date(item.timestamp);
      const seq = BigInt(item.sequenceNumber);

      // Idempotency check: check if reading already exists
      const existing = await prisma.energyReading.findUnique({
        where: {
          deviceId_sequenceNumber: {
            deviceId: device.id,
            sequenceNumber: seq
          }
        }
      });

      if (existing) {
        processedResults.push({ deviceId: item.deviceId, sequenceNumber: item.sequenceNumber, status: 'DUPLICATE_IGNORED' });
        continue;
      }

      // Check cumulative energy sanity (detect reset or corrupted data)
      let quality = item.quality;
      if (device.lastEnergyKWh && item.cumulativeEnergyKWh < device.lastEnergyKWh) {
        logger.warn(`Meter reset or negative energy delta detected for ${device.deviceUid}: prev=${device.lastEnergyKWh}, current=${item.cumulativeEnergyKWh}`);
        quality = 'meter_reset_detected';
      }

      // 1. Persist the reading in PostgreSQL
      const reading = await prisma.energyReading.create({
        data: {
          deviceId: device.id,
          sequenceNumber: seq,
          eventTimestamp: eventDate,
          powerW: item.powerW,
          voltageV: item.voltageV,
          currentA: item.currentA,
          powerFactor: item.powerFactor,
          cumulativeEnergyKWh: item.cumulativeEnergyKWh,
          dataQuality: quality
        }
      });

      // 2. Update device status
      await prisma.device.update({
        where: { id: device.id },
        data: {
          lastSeenAt: new Date(),
          status: 'ONLINE',
          lastSequence: seq,
          lastPowerW: item.powerW,
          lastEnergyKWh: item.cumulativeEnergyKWh
        }
      });

      // 3. Evaluate Alerts
      await AlertService.evaluateReadingAlerts(device, item, device.room);

      // 4. Update Daily Summary in background/async
      const summaryDate = eventDate.toISOString().slice(0, 10);
      prisma.dailySummary.upsert({
        where: {
          deviceId_summaryDate: {
            deviceId: device.id,
            summaryDate
          }
        },
        update: {
          energyKWh: item.cumulativeEnergyKWh,
          peakPowerW: { increment: 0 }, // Handled in aggregation if needed
          readingCount: { increment: 1 },
          roomId: device.roomId
        },
        create: {
          deviceId: device.id,
          roomId: device.roomId,
          summaryDate,
          energyKWh: item.cumulativeEnergyKWh,
          peakPowerW: item.powerW,
          avgPowerW: item.powerW,
          readingCount: 1
        }
      }).catch(e => logger.error('Error updating daily summary', { error: e.message }));

      // 5. Broadcast real-time Socket.IO event
      const io = getSocketIO();
      if (io) {
        const liveEvent = {
          deviceId: device.id,
          deviceUid: device.deviceUid,
          roomId: device.roomId,
          roomCode: device.room?.roomCode,
          floorId: device.room?.floorId,
          timestamp: item.timestamp,
          powerW: item.powerW,
          voltageV: item.voltageV,
          currentA: item.currentA,
          powerFactor: item.powerFactor,
          cumulativeEnergyKWh: item.cumulativeEnergyKWh,
          status: 'ONLINE'
        };

        // Broadcast to hostel-wide channel (for Wardens and floor map)
        io.to('hostel:all').emit('meter:reading', liveEvent);

        // Broadcast to specific room channel (for Student dashboard)
        if (device.roomId) {
          io.to(`room:${device.roomId}`).emit('meter:reading', liveEvent);
        }
      }

      processedResults.push({
        deviceId: item.deviceId,
        sequenceNumber: item.sequenceNumber,
        status: 'PERSISTED',
        id: reading.id
      });
    }

    res.status(201).json({
      success: true,
      processedCount: processedResults.length,
      results: processedResults
    });
  } catch (err) {
    next(err);
  }
});

export default router;
