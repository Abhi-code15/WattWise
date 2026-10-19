import express from 'express';
import { prisma } from '../../config/prisma.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = express.Router();

router.get('/analytics/overview', authenticate, requireRole('WARDEN'), async (req, res, next) => {
  try {
    const [
      totalRooms,
      totalDevices,
      onlineDevices,
      offlineDevices,
      activeAlertsCount,
      tariff,
      allDevices
    ] = await Promise.all([
      prisma.room.count(),
      prisma.device.count(),
      prisma.device.count({ where: { status: 'ONLINE' } }),
      prisma.device.count({ where: { status: 'OFFLINE' } }),
      prisma.alert.count({ where: { status: { in: ['TRIGGERED', 'ACKNOWLEDGED', 'INVESTIGATING'] } } }),
      prisma.tariff.findFirst({ where: { isActive: true } }),
      prisma.device.findMany({
        select: {
          id: true,
          lastPowerW: true,
          lastEnergyKWh: true,
          status: true,
          room: {
            select: {
              id: true,
              roomCode: true,
              floor: { select: { id: true, floorCode: true, displayName: true } }
            }
          }
        }
      })
    ]);

    const tariffRate = tariff ? tariff.baseRatePerKWh : 7.50;

    // Calculate current total power in kW
    let totalPowerW = 0;
    let totalEnergyTodayKWh = 0;

    // Floor-wise breakdown
    const floorBreakdown = {
      GROUND: { displayName: 'Ground Floor', powerW: 0, roomCount: 0, activeCount: 0 },
      SECOND: { displayName: 'Second Floor', powerW: 0, roomCount: 0, activeCount: 0 },
      THIRD: { displayName: 'Third Floor', powerW: 0, roomCount: 0, activeCount: 0 }
    };

    allDevices.forEach(d => {
      const p = d.lastPowerW || 0;
      totalPowerW += p;

      const floorCode = d.room?.floor?.floorCode;
      if (floorCode && floorBreakdown[floorCode]) {
        floorBreakdown[floorCode].powerW += p;
        floorBreakdown[floorCode].roomCount += 1;
        if (d.status === 'ONLINE') floorBreakdown[floorCode].activeCount += 1;
      }
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Compute today's total energy from readings
    const readingsToday = await prisma.energyReading.groupBy({
      by: ['deviceId'],
      where: { eventTimestamp: { gte: startOfToday } },
      _min: { cumulativeEnergyKWh: true },
      _max: { cumulativeEnergyKWh: true }
    });

    readingsToday.forEach(r => {
      if (r._max.cumulativeEnergyKWh !== null && r._min.cumulativeEnergyKWh !== null) {
        const delta = r._max.cumulativeEnergyKWh - r._min.cumulativeEnergyKWh;
        if (delta >= 0) {
          totalEnergyTodayKWh += delta;
        }
      }
    });

    const estimatedCostToday = parseFloat((totalEnergyTodayKWh * tariffRate).toFixed(2));

    // Get 5 recent alerts
    const recentAlerts = await prisma.alert.findMany({
      take: 5,
      orderBy: { triggeredAt: 'desc' },
      include: {
        room: { select: { roomCode: true, displayName: true } }
      }
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalMonitoredRooms: totalRooms,
          totalDevices,
          onlineMeters: onlineDevices,
          offlineMeters: offlineDevices,
          activeAlertsCount,
          currentTotalPowerKW: parseFloat((totalPowerW / 1000).toFixed(2)),
          currentTotalPowerW: Math.round(totalPowerW),
          todayTotalEnergyKWh: parseFloat(totalEnergyTodayKWh.toFixed(2)),
          estimatedCostToday,
          currency: tariff?.currency || 'INR',
          tariffRate
        },
        floorBreakdown: Object.keys(floorBreakdown).map(code => ({
          floorCode: code,
          displayName: floorBreakdown[code].displayName,
          powerKW: parseFloat((floorBreakdown[code].powerW / 1000).toFixed(2)),
          powerW: Math.round(floorBreakdown[code].powerW),
          onlineDevices: floorBreakdown[code].activeCount,
          totalRooms: floorBreakdown[code].roomCount
        })),
        recentAlerts
      }
    });
  } catch (err) {
    next(err);
  }
});

// Floor-level detailed analytics
router.get('/analytics/floors', authenticate, requireRole('WARDEN'), async (req, res, next) => {
  try {
    const floors = await prisma.floor.findMany({
      orderBy: { floorNumber: 'asc' },
      include: {
        rooms: {
          include: {
            devices: {
              select: {
                id: true,
                status: true,
                lastPowerW: true,
                lastEnergyKWh: true
              }
            }
          }
        }
      }
    });

    const result = floors.map(floor => {
      let totalFloorPowerW = 0;
      let onlineMeters = 0;
      let totalMeters = 0;

      floor.rooms.forEach(r => {
        r.devices.forEach(d => {
          totalMeters += 1;
          if (d.status === 'ONLINE') onlineMeters += 1;
          totalFloorPowerW += d.lastPowerW || 0;
        });
      });

      return {
        id: floor.id,
        floorCode: floor.floorCode,
        displayName: floor.displayName,
        floorNumber: floor.floorNumber,
        totalRooms: floor.rooms.length,
        totalMeters,
        onlineMeters,
        currentPowerKW: parseFloat((totalFloorPowerW / 1000).toFixed(2)),
        currentPowerW: Math.round(totalFloorPowerW)
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Top consuming rooms ranking
router.get('/analytics/rooms', authenticate, requireRole('WARDEN'), async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);

    const rooms = await prisma.room.findMany({
      include: {
        floor: { select: { displayName: true } },
        devices: {
          select: {
            id: true,
            status: true,
            lastPowerW: true,
            lastEnergyKWh: true
          }
        }
      }
    });

    const ranked = rooms
      .map(r => ({
        id: r.id,
        roomCode: r.roomCode,
        displayName: r.displayName,
        roomType: r.roomType,
        floor: r.floor.displayName,
        currentPowerW: r.devices[0]?.lastPowerW || 0,
        status: r.devices[0]?.status || 'OFFLINE'
      }))
      .sort((a, b) => b.currentPowerW - a.currentPowerW)
      .slice(0, limit);

    res.json({ success: true, data: ranked });
  } catch (err) {
    next(err);
  }
});

// CSV Export of historical readings
router.get('/analytics/export/csv', authenticate, requireRole('WARDEN'), async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '500', 10), 5000);
    const readings = await prisma.energyReading.findMany({
      take: limit,
      orderBy: { eventTimestamp: 'desc' },
      include: {
        device: {
          select: {
            deviceUid: true,
            room: { select: { roomCode: true, roomType: true } }
          }
        }
      }
    });

    let csv = 'Timestamp,Device UID,Room Code,Room Type,Power (W),Voltage (V),Current (A),Power Factor,Cumulative Energy (kWh),Data Quality\n';
    readings.forEach(r => {
      csv += `"${r.eventTimestamp.toISOString()}","${r.device.deviceUid}","${r.device.room?.roomCode || ''}","${r.device.room?.roomType || ''}",${r.powerW},${r.voltageV},${r.currentA},${r.powerFactor},${r.cumulativeEnergyKWh},"${r.dataQuality}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="wattwise-telemetry-export-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
});

export default router;
