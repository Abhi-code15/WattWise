import express from 'express';
import { prisma } from '../../config/prisma.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = express.Router();

router.get('/devices', authenticate, requireRole('WARDEN'), async (req, res, next) => {
  try {
    const devices = await prisma.device.findMany({
      orderBy: { deviceUid: 'asc' },
      include: {
        room: {
          select: {
            id: true,
            roomCode: true,
            displayName: true,
            roomType: true,
            floor: {
              select: { displayName: true }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      count: devices.length,
      data: devices
    });
  } catch (err) {
    next(err);
  }
});

router.get('/devices/:deviceId', authenticate, requireRole('WARDEN'), async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const device = await prisma.device.findFirst({
      where: {
        OR: [{ id: deviceId }, { deviceUid: deviceId }]
      },
      include: {
        room: {
          include: { floor: true }
        },
        alerts: {
          take: 5,
          orderBy: { triggeredAt: 'desc' }
        }
      }
    });

    if (!device) {
      return res.status(404).json({ success: false, error: 'Device not found' });
    }

    res.json({ success: true, data: device });
  } catch (err) {
    next(err);
  }
});

export default router;
