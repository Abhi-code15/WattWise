import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';
import { getSocketIO } from '../../sockets/socketHandler.js';

// In-memory tracking of consecutive high-power readings per device
// deviceUid -> { consecutiveHighCount: number, lastPowerW: number, lastTimestamp: Date }
const deviceHighPowerTracker = new Map();

export class AlertService {
  /**
   * Process a valid incoming power reading for high-consumption rules
   */
  static async evaluateReadingAlerts(device, reading, room) {
    if (!room) return;

    const threshold = room.highPowerThresholdW || 800.0;
    const powerW = reading.powerW;
    const tracker = deviceHighPowerTracker.get(device.deviceUid) || {
      consecutiveHighCount: 0,
      lastPowerW: powerW,
      lastTimestamp: reading.eventTimestamp
    };

    if (powerW > threshold) {
      tracker.consecutiveHighCount += 1;
      tracker.lastPowerW = powerW;
      tracker.lastTimestamp = reading.eventTimestamp;
      deviceHighPowerTracker.set(device.deviceUid, tracker);

      logger.debug(`High power counter for ${device.deviceUid} (${room.roomCode}): ${tracker.consecutiveHighCount} readings at ${powerW}W`);

      const requiredConsecutive = parseInt(process.env.HIGH_POWER_CONSECUTIVE_READINGS || '10', 10);

      if (tracker.consecutiveHighCount >= requiredConsecutive) {
        await this.triggerSustainedHighPowerAlert(device, room, powerW, threshold, tracker.consecutiveHighCount);
      }
    } else {
      // Normal reading resets the consecutive high counter
      if (tracker.consecutiveHighCount > 0) {
        logger.debug(`Normal reading received for ${device.deviceUid} (${room.roomCode}): resetting high power counter from ${tracker.consecutiveHighCount} to 0`);
        tracker.consecutiveHighCount = 0;
        deviceHighPowerTracker.set(device.deviceUid, tracker);
      }
    }
  }

  static async triggerSustainedHighPowerAlert(device, room, currentPowerW, thresholdW, consecutiveCount) {
    try {
      // Check if there is already an active alert for this device
      const existingAlert = await prisma.alert.findFirst({
        where: {
          deviceId: device.id,
          alertType: 'SUSTAINED_HIGH_POWER',
          status: { in: ['TRIGGERED', 'ACKNOWLEDGED', 'INVESTIGATING'] }
        }
      });

      if (existingAlert) {
        // Update triggering value and consecutive count, avoid duplicate spam
        await prisma.alert.update({
          where: { id: existingAlert.id },
          data: {
            triggeringValue: currentPowerW,
            consecutiveCount,
            metadata: {
              ...(typeof existingAlert.metadata === 'object' ? existingAlert.metadata : {}),
              latestPowerW: currentPowerW,
              updatedAt: new Date().toISOString()
            }
          }
        });
        return existingAlert;
      }

      const durationMinutes = (consecutiveCount * 15 / 60).toFixed(1);
      const message = `High power consumption detected — Room ${room.roomCode}. Power remained at ${currentPowerW.toFixed(1)}W (above ${thresholdW}W threshold) for approximately ${durationMinutes} minutes. Please check electrical appliances and meter status.`;

      const alert = await prisma.alert.create({
        data: {
          deviceId: device.id,
          roomId: room.id,
          alertType: 'SUSTAINED_HIGH_POWER',
          severity: currentPowerW > thresholdW * 1.5 ? 'CRITICAL' : 'WARNING',
          status: 'TRIGGERED',
          thresholdValue: thresholdW,
          triggeringValue: currentPowerW,
          consecutiveCount,
          message,
          metadata: {
            roomCode: room.roomCode,
            floorId: room.floorId,
            initialPowerW: currentPowerW,
            durationEstimateSec: consecutiveCount * 15
          }
        },
        include: {
          room: true,
          device: true
        }
      });

      logger.warn(`🚨 High power alert created for ${room.roomCode}: ${message}`);

      // Create in-app notifications for assigned students
      const assignments = await prisma.roomAssignment.findMany({
        where: { roomId: room.id, isActive: true },
        select: { userId: true }
      });

      for (const assignment of assignments) {
        await prisma.notification.create({
          data: {
            userId: assignment.userId,
            alertId: alert.id,
            title: `High Power Alert — Room ${room.roomCode}`,
            message
          }
        });
      }

      // Real-time notification dispatch via Socket.IO
      const io = getSocketIO();
      if (io) {
        const payload = {
          alertId: alert.id,
          type: alert.alertType,
          severity: alert.severity,
          status: alert.status,
          roomId: room.id,
          roomCode: room.roomCode,
          message: alert.message,
          triggeredAt: alert.triggeredAt,
          powerW: currentPowerW,
          thresholdW
        };

        // Notify wardens on hostel-wide channel
        io.to('hostel:all').emit('alert:created', payload);
        // Notify student on room channel
        io.to(`room:${room.id}`).emit('alert:created', payload);
      }

      return alert;
    } catch (err) {
      logger.error('Failed to trigger sustained high power alert', { error: err.message, deviceUid: device.deviceUid });
    }
  }

  /**
   * Periodic check for stale / offline meters
   */
  static async checkOfflineMeters() {
    try {
      const staleTimeoutSec = parseInt(process.env.STALE_TIMEOUT_SECONDS || '45', 10);
      const offlineTimeoutSec = parseInt(process.env.OFFLINE_TIMEOUT_SECONDS || '90', 10);

      const now = new Date();
      const staleCutoff = new Date(now.getTime() - staleTimeoutSec * 1000);
      const offlineCutoff = new Date(now.getTime() - offlineTimeoutSec * 1000);

      // Find devices currently marked ONLINE whose lastSeenAt is older than offlineCutoff
      const newlyOfflineDevices = await prisma.device.findMany({
        where: {
          status: { in: ['ONLINE', 'STALE'] },
          lastSeenAt: { lt: offlineCutoff }
        },
        include: { room: true }
      });

      for (const device of newlyOfflineDevices) {
        await prisma.device.update({
          where: { id: device.id },
          data: { status: 'OFFLINE' }
        });

        // Check if active offline alert exists
        const existingOfflineAlert = await prisma.alert.findFirst({
          where: {
            deviceId: device.id,
            alertType: 'OFFLINE_METER',
            status: { in: ['TRIGGERED', 'ACKNOWLEDGED', 'INVESTIGATING'] }
          }
        });

        if (!existingOfflineAlert) {
          const roomCode = device.room?.roomCode || device.deviceUid;
          const alert = await prisma.alert.create({
            data: {
              deviceId: device.id,
              roomId: device.roomId,
              alertType: 'OFFLINE_METER',
              severity: 'WARNING',
              status: 'TRIGGERED',
              message: `Smart meter disconnected — ${device.deviceUid} (${roomCode}) has not reported telemetry in over ${offlineTimeoutSec} seconds.`,
              metadata: {
                lastSeenAt: device.lastSeenAt,
                deviceUid: device.deviceUid
              }
            }
          });

          const io = getSocketIO();
          if (io) {
            io.to('hostel:all').emit('meter:status', {
              deviceId: device.id,
              deviceUid: device.deviceUid,
              roomId: device.roomId,
              status: 'OFFLINE',
              lastSeenAt: device.lastSeenAt
            });

            io.to('hostel:all').emit('alert:created', {
              alertId: alert.id,
              type: alert.alertType,
              severity: alert.severity,
              status: alert.status,
              roomId: device.roomId,
              roomCode,
              message: alert.message,
              triggeredAt: alert.triggeredAt
            });
          }
        }
      }

      // Mark devices as STALE if between staleCutoff and offlineCutoff
      await prisma.device.updateMany({
        where: {
          status: 'ONLINE',
          lastSeenAt: { lt: staleCutoff, gte: offlineCutoff }
        },
        data: { status: 'STALE' }
      });
    } catch (err) {
      logger.error('Error during offline meters check', { error: err.message });
    }
  }

  static resetTracker(deviceUid) {
    deviceHighPowerTracker.delete(deviceUid);
  }

  static getTrackerStatus(deviceUid) {
    return deviceHighPowerTracker.get(deviceUid) || { consecutiveHighCount: 0 };
  }
}
