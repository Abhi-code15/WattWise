import express from 'express';
import { prisma } from '../../config/prisma.js';
import { authenticate, requireRoomAccess } from '../../middleware/auth.js';

const router = express.Router();

// Helper to resolve roomId or roomCode to a room record
async function resolveRoom(identifier) {
  return await prisma.room.findFirst({
    where: {
      OR: [
        { id: identifier },
        { roomCode: identifier.toUpperCase() }
      ]
    },
    include: {
      floor: true,
      devices: true,
      assignments: {
        where: { isActive: true },
        include: { user: { select: { id: true, name: true, email: true } } }
      },
      alerts: {
        where: { status: { in: ['TRIGGERED', 'ACKNOWLEDGED', 'INVESTIGATING'] } },
        orderBy: { triggeredAt: 'desc' }
      }
    }
  });
}

// Get all rooms for a specific floor (Used by Floor Map)
router.get('/floors/:floorId/rooms', authenticate, async (req, res, next) => {
  try {
    const { floorId } = req.params;

    // Check if floor exists by ID or by floorCode (GROUND, SECOND, THIRD)
    const floor = await prisma.floor.findFirst({
      where: {
        OR: [
          { id: floorId },
          { floorCode: floorId.toUpperCase() }
        ]
      }
    });

    if (!floor) {
      return res.status(404).json({ success: false, error: 'Floor not found' });
    }

    const rooms = await prisma.room.findMany({
      where: { floorId: floor.id },
      orderBy: { roomCode: 'asc' },
      include: {
        devices: {
          select: {
            id: true,
            deviceUid: true,
            status: true,
            simulatorStatus: true,
            lastSeenAt: true,
            lastPowerW: true,
            lastEnergyKWh: true
          }
        },
        alerts: {
          where: { status: { in: ['TRIGGERED', 'ACKNOWLEDGED', 'INVESTIGATING'] } },
          select: {
            id: true,
            alertType: true,
            severity: true,
            status: true,
            triggeredAt: true,
            message: true
          }
        },
        assignments: {
          where: { isActive: true },
          select: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });

    // Format response with computed operational statuses
    const formattedRooms = rooms.map(room => {
      const primaryDevice = room.devices[0] || null;
      const activeAlert = room.alerts[0] || null;

      let operationalStatus = 'NORMAL';
      if (!primaryDevice || primaryDevice.status === 'OFFLINE') {
        operationalStatus = 'OFFLINE';
      } else if (primaryDevice.status === 'STALE') {
        operationalStatus = 'STALE';
      } else if (activeAlert) {
        operationalStatus = activeAlert.severity === 'CRITICAL' ? 'ALERT' : 'HIGH_CONSUMPTION';
      } else if ((primaryDevice.lastPowerW || 0) > room.highPowerThresholdW) {
        operationalStatus = 'HIGH_CONSUMPTION';
      }

      // If user is STUDENT and this is NOT their room, mask occupant personal info
      const isAssignedToUser = req.user.role === 'WARDEN' || req.user.assignedRooms.some(r => r.roomId === room.id);

      return {
        id: room.id,
        roomCode: room.roomCode,
        displayName: room.displayName,
        roomType: room.roomType,
        highPowerThresholdW: room.highPowerThresholdW,
        operationalStatus,
        device: primaryDevice,
        activeAlertsCount: room.alerts.length,
        activeAlert,
        occupants: isAssignedToUser ? room.assignments.map(a => a.user) : []
      };
    });

    res.json({
      success: true,
      floor: {
        id: floor.id,
        floorCode: floor.floorCode,
        displayName: floor.displayName,
        floorNumber: floor.floorNumber
      },
      rooms: formattedRooms
    });
  } catch (err) {
    next(err);
  }
});

// Get detailed room info by ID or Code (Protected by RBAC)
router.get('/rooms/:roomId', authenticate, requireRoomAccess, async (req, res, next) => {
  try {
    const room = await resolveRoom(req.params.roomId);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found.' });
    }

    // Get current month budget
    const currentMonth = new Date().toISOString().slice(0, 7);
    const budget = await prisma.budget.findUnique({
      where: {
        scope_scopeId_billingPeriod: {
          scope: 'ROOM',
          scopeId: room.id,
          billingPeriod: currentMonth
        }
      }
    });

    // Get active tariff
    const tariff = await prisma.tariff.findFirst({
      where: { isActive: true }
    });

    const primaryDevice = room.devices[0] || null;

    res.json({
      success: true,
      data: {
        id: room.id,
        roomCode: room.roomCode,
        displayName: room.displayName,
        roomType: room.roomType,
        floor: room.floor,
        highPowerThresholdW: room.highPowerThresholdW,
        device: primaryDevice,
        occupants: room.assignments.map(a => a.user),
        activeAlerts: room.alerts,
        budget: budget ? { amount: budget.budgetAmount, currency: budget.currency } : null,
        tariff: tariff ? { baseRate: tariff.baseRatePerKWh, currency: tariff.currency } : null
      }
    });
  } catch (err) {
    next(err);
  }
});

// Get historical readings for a room (Protected by RBAC)
router.get('/rooms/:roomId/readings', authenticate, requireRoomAccess, async (req, res, next) => {
  try {
    const room = await resolveRoom(req.params.roomId);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found.' });
    }

    const device = room.devices[0];
    if (!device) {
      return res.json({ success: true, data: [] });
    }

    const limit = Math.min(parseInt(req.query.limit || '60', 10), 500);

    const readings = await prisma.energyReading.findMany({
      where: { deviceId: device.id },
      orderBy: { eventTimestamp: 'desc' },
      take: limit
    });

    res.json({
      success: true,
      count: readings.length,
      data: readings.map(r => ({
        id: r.id,
        sequenceNumber: Number(r.sequenceNumber),
        eventTimestamp: r.eventTimestamp,
        powerW: r.powerW,
        voltageV: r.voltageV,
        currentA: r.currentA,
        powerFactor: r.powerFactor,
        cumulativeEnergyKWh: r.cumulativeEnergyKWh,
        dataQuality: r.dataQuality
      }))
    });
  } catch (err) {
    next(err);
  }
});

// Get consumption and cost summary for a room (Protected by RBAC)
router.get('/rooms/:roomId/summary', authenticate, requireRoomAccess, async (req, res, next) => {
  try {
    const room = await resolveRoom(req.params.roomId);
    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found.' });
    }

    const device = room.devices[0];
    const tariff = await prisma.tariff.findFirst({ where: { isActive: true } });
    const rate = tariff ? tariff.baseRatePerKWh : 7.50;

    if (!device) {
      return res.json({
        success: true,
        summary: {
          currentPowerW: 0,
          todayEnergyKWh: 0,
          monthEnergyKWh: 0,
          estimatedCostToday: 0,
          estimatedCostMonth: 0,
          tariffRate: rate
        }
      });
    }

    // Calculate today's start and month's start in UTC/local
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get earliest and latest reading today for cumulative diff
    const [todayEarliest, todayLatest, monthEarliest] = await Promise.all([
      prisma.energyReading.findFirst({
        where: { deviceId: device.id, eventTimestamp: { gte: startOfToday } },
        orderBy: { eventTimestamp: 'asc' }
      }),
      prisma.energyReading.findFirst({
        where: { deviceId: device.id },
        orderBy: { eventTimestamp: 'desc' }
      }),
      prisma.energyReading.findFirst({
        where: { deviceId: device.id, eventTimestamp: { gte: startOfMonth } },
        orderBy: { eventTimestamp: 'asc' }
      })
    ]);

    let todayEnergyKWh = 0;
    if (todayEarliest && todayLatest && todayLatest.cumulativeEnergyKWh >= todayEarliest.cumulativeEnergyKWh) {
      todayEnergyKWh = todayLatest.cumulativeEnergyKWh - todayEarliest.cumulativeEnergyKWh;
    }

    let monthEnergyKWh = 0;
    if (monthEarliest && todayLatest && todayLatest.cumulativeEnergyKWh >= monthEarliest.cumulativeEnergyKWh) {
      monthEnergyKWh = todayLatest.cumulativeEnergyKWh - monthEarliest.cumulativeEnergyKWh;
    }

    const estimatedCostToday = parseFloat((todayEnergyKWh * rate).toFixed(2));
    const estimatedCostMonth = parseFloat((monthEnergyKWh * rate).toFixed(2));

    res.json({
      success: true,
      summary: {
        roomCode: room.roomCode,
        currentPowerW: device.lastPowerW || 0,
        todayEnergyKWh: parseFloat(todayEnergyKWh.toFixed(3)),
        monthEnergyKWh: parseFloat(monthEnergyKWh.toFixed(3)),
        estimatedCostToday,
        estimatedCostMonth,
        tariffRate: rate,
        currency: tariff?.currency || 'INR',
        deviceStatus: device.status,
        lastSeenAt: device.lastSeenAt
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
