import { describe, it, expect, beforeEach } from 'vitest';
import { AlertService } from '../src/modules/alerts/alerts.service.js';
import { prisma } from '../src/config/prisma.js';

describe('Alert Engine Rule Evaluation Tests', () => {
  const mockDevice = {
    id: 'test-device-uuid-1',
    deviceUid: 'WW-TEST-ALERT-01',
    lastPowerW: 200.0,
    lastEnergyKWh: 15.0
  };

  const mockRoom = {
    id: 'test-room-uuid-1',
    roomCode: 'T-AL-01',
    highPowerThresholdW: 800.0
  };

  beforeEach(() => {
    AlertService.resetTracker(mockDevice.deviceUid);
  });

  it('increments consecutive high counter when power exceeds threshold', async () => {
    const reading = { powerW: 950.0, eventTimestamp: new Date() };

    await AlertService.evaluateReadingAlerts(mockDevice, reading, mockRoom);
    const status = AlertService.getTrackerStatus(mockDevice.deviceUid);

    expect(status.consecutiveHighCount).toBe(1);
    expect(status.lastPowerW).toBe(950.0);
  });

  it('resets consecutive counter to 0 immediately when a normal reading is received', async () => {
    // 3 high readings
    for (let i = 0; i < 3; i++) {
      await AlertService.evaluateReadingAlerts(mockDevice, { powerW: 1000.0, eventTimestamp: new Date() }, mockRoom);
    }
    expect(AlertService.getTrackerStatus(mockDevice.deviceUid).consecutiveHighCount).toBe(3);

    // 1 normal reading (e.g. 350W <= 800W)
    await AlertService.evaluateReadingAlerts(mockDevice, { powerW: 350.0, eventTimestamp: new Date() }, mockRoom);
    expect(AlertService.getTrackerStatus(mockDevice.deviceUid).consecutiveHighCount).toBe(0);
  });

  it('does NOT trigger sustained alert before reaching required consecutive threshold', async () => {
    // 5 high readings (less than 10)
    for (let i = 0; i < 5; i++) {
      await AlertService.evaluateReadingAlerts(mockDevice, { powerW: 1100.0, eventTimestamp: new Date() }, mockRoom);
    }

    const alert = await prisma.alert.findFirst({
      where: { deviceId: mockDevice.id, alertType: 'SUSTAINED_HIGH_POWER' }
    });

    expect(alert).toBeNull();
  });
});
