import express from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validation.js';
import { getSocketIO } from '../../sockets/socketHandler.js';

const router = express.Router();

// List alerts (Role-filtered)
router.get('/alerts', authenticate, async (req, res, next) => {
  try {
    const { status, severity, roomId, limit = '50', page = '1' } = req.query;
    const take = Math.min(parseInt(limit, 10), 100);
    const skip = (Math.max(parseInt(page, 10), 1) - 1) * take;

    const where = {};

    // Role-based filtering
    if (req.user.role === 'STUDENT') {
      const studentRoomIds = req.user.assignedRooms.map(r => r.roomId);
      where.roomId = { in: studentRoomIds };
    } else if (roomId) {
      where.roomId = roomId;
    }

    if (status) {
      where.status = status;
    }
    if (severity) {
      where.severity = severity;
    }

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        take,
        skip,
        orderBy: { triggeredAt: 'desc' },
        include: {
          room: {
            select: {
              id: true,
              roomCode: true,
              displayName: true,
              floor: { select: { displayName: true } }
            }
          },
          device: {
            select: {
              deviceUid: true,
              status: true
            }
          }
        }
      }),
      prisma.alert.count({ where })
    ]);

    res.json({
      success: true,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: take,
        pages: Math.ceil(total / take)
      },
      data: alerts
    });
  } catch (err) {
    next(err);
  }
});

// Get alert details
router.get('/alerts/:alertId', authenticate, async (req, res, next) => {
  try {
    const alert = await prisma.alert.findUnique({
      where: { id: req.params.alertId },
      include: {
        room: { include: { floor: true } },
        device: true
      }
    });

    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    // Student access validation
    if (req.user.role === 'STUDENT') {
      const isAssigned = req.user.assignedRooms.some(r => r.roomId === alert.roomId);
      if (!isAssigned) {
        return res.status(403).json({ success: false, error: 'Access denied: Alert does not belong to your assigned room.' });
      }
    }

    res.json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
});

// Acknowledge alert (Warden only)
router.post('/alerts/:alertId/acknowledge', authenticate, requireRole('WARDEN'), async (req, res, next) => {
  try {
    const alert = await prisma.alert.findUnique({ where: { id: req.params.alertId } });
    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    const updated = await prisma.alert.update({
      where: { id: req.params.alertId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedBy: req.user.name
      },
      include: { room: true }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: req.user.id,
        actorEmail: req.user.email,
        action: 'ALERT_ACKNOWLEDGED',
        entityType: 'ALERT',
        entityId: updated.id,
        details: { previousStatus: alert.status, acknowledgedBy: req.user.name }
      }
    }).catch(() => {});

    const io = getSocketIO();
    if (io) {
      io.to('hostel:all').emit('alert:updated', {
        alertId: updated.id,
        status: updated.status,
        acknowledgedAt: updated.acknowledgedAt,
        acknowledgedBy: updated.acknowledgedBy
      });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// Resolve alert (Warden only)
const resolveSchema = z.object({
  notes: z.string().optional()
});

router.post('/alerts/:alertId/resolve', authenticate, requireRole('WARDEN'), validateBody(resolveSchema), async (req, res, next) => {
  try {
    const alert = await prisma.alert.findUnique({ where: { id: req.params.alertId } });
    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    const updated = await prisma.alert.update({
      where: { id: req.params.alertId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy: req.user.name,
        investigationNotes: req.body.notes
          ? `${alert.investigationNotes || ''}\n[Resolution Note - ${new Date().toLocaleString()}]: ${req.body.notes}`.trim()
          : alert.investigationNotes
      },
      include: { room: true }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: req.user.id,
        actorEmail: req.user.email,
        action: 'ALERT_RESOLVED',
        entityType: 'ALERT',
        entityId: updated.id,
        details: { previousStatus: alert.status, resolvedBy: req.user.name, notes: req.body.notes }
      }
    }).catch(() => {});

    const io = getSocketIO();
    if (io) {
      io.to('hostel:all').emit('alert:updated', {
        alertId: updated.id,
        status: updated.status,
        resolvedAt: updated.resolvedAt,
        resolvedBy: updated.resolvedBy
      });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// Add investigation notes (Warden only)
const notesSchema = z.object({
  notes: z.string().min(1, 'Investigation note cannot be empty')
});

router.post('/alerts/:alertId/notes', authenticate, requireRole('WARDEN'), validateBody(notesSchema), async (req, res, next) => {
  try {
    const alert = await prisma.alert.findUnique({ where: { id: req.params.alertId } });
    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }

    const updatedNotes = `${alert.investigationNotes || ''}\n[${req.user.name} - ${new Date().toLocaleString()}]: ${req.body.notes}`.trim();

    const updated = await prisma.alert.update({
      where: { id: req.params.alertId },
      data: {
        status: alert.status === 'TRIGGERED' ? 'INVESTIGATING' : alert.status,
        investigationNotes: updatedNotes
      }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: req.user.id,
        actorEmail: req.user.email,
        action: 'ALERT_INVESTIGATION_NOTE_ADDED',
        entityType: 'ALERT',
        entityId: updated.id,
        details: { note: req.body.notes }
      }
    }).catch(() => {});

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// In-app Notifications for current user
router.get('/notifications', authenticate, async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false }
    });

    res.json({
      success: true,
      unreadCount,
      data: notifications
    });
  } catch (err) {
    next(err);
  }
});

router.post('/notifications/:id/read', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { isRead: true, readAt: new Date() }
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
