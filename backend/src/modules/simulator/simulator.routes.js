import express from 'express';
import { z } from 'zod';
import { simulatorEngine } from './simulator.engine.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validation.js';
import { prisma } from '../../config/prisma.js';

const router = express.Router();

router.get('/simulator/status', authenticate, requireRole('WARDEN'), (req, res) => {
  res.json({
    success: true,
    data: simulatorEngine.getStatus()
  });
});

const startSchema = z.object({
  intervalMs: z.number().int().min(500).max(60000).optional()
});

router.post('/simulator/start', authenticate, requireRole('WARDEN'), validateBody(startSchema), async (req, res) => {
  simulatorEngine.start(req.body.intervalMs);

  await prisma.auditLog.create({
    data: {
      actorUserId: req.user.id,
      actorEmail: req.user.email,
      action: 'SIMULATOR_STARTED',
      entityType: 'SIMULATOR',
      details: { intervalMs: req.body.intervalMs || simulatorEngine.intervalMs }
    }
  }).catch(() => {});

  res.json({ success: true, message: 'Simulator started successfully', data: simulatorEngine.getStatus() });
});

router.post('/simulator/pause', authenticate, requireRole('WARDEN'), async (req, res) => {
  simulatorEngine.pause();
  res.json({ success: true, message: 'Simulator paused', data: simulatorEngine.getStatus() });
});

router.post('/simulator/resume', authenticate, requireRole('WARDEN'), async (req, res) => {
  simulatorEngine.resume();
  res.json({ success: true, message: 'Simulator resumed', data: simulatorEngine.getStatus() });
});

router.post('/simulator/stop', authenticate, requireRole('WARDEN'), async (req, res) => {
  simulatorEngine.stop();

  await prisma.auditLog.create({
    data: {
      actorUserId: req.user.id,
      actorEmail: req.user.email,
      action: 'SIMULATOR_STOPPED',
      entityType: 'SIMULATOR'
    }
  }).catch(() => {});

  res.json({ success: true, message: 'Simulator stopped', data: simulatorEngine.getStatus() });
});

const speedSchema = z.object({
  intervalMs: z.number().int().min(500).max(60000)
});

router.post('/simulator/speed', authenticate, requireRole('WARDEN'), validateBody(speedSchema), (req, res) => {
  simulatorEngine.setIntervalSpeed(req.body.intervalMs);
  res.json({ success: true, message: 'Simulation speed updated', data: simulatorEngine.getStatus() });
});

const scenarioSchema = z.object({
  deviceUid: z.string().optional(),
  roomCode: z.string().optional(),
  scenarioType: z.enum(['SUSTAINED_HIGH_POWER', 'SPIKE', 'OFFLINE', 'RESTORE', 'RESET_DEMO']),
  powerW: z.number().optional(),
  durationCycles: z.number().int().min(1).max(100).optional()
});

router.post('/simulator/scenarios', authenticate, requireRole('WARDEN'), validateBody(scenarioSchema), async (req, res, next) => {
  try {
    const { deviceUid, roomCode, scenarioType, powerW, durationCycles } = req.body;

    if (scenarioType === 'RESET_DEMO') {
      simulatorEngine.clearAllScenarios();
      // Restore all devices to ONLINE
      await prisma.device.updateMany({
        data: { status: 'ONLINE' }
      });
      return res.json({ success: true, message: 'All demo scenarios cleared and meters restored' });
    }

    let targetUid = deviceUid;
    if (!targetUid && roomCode) {
      targetUid = `WW-${roomCode.toUpperCase()}`;
    }

    if (!targetUid) {
      return res.status(400).json({ success: false, error: 'Either deviceUid or roomCode must be provided' });
    }

    if (scenarioType === 'RESTORE') {
      simulatorEngine.setScenario(targetUid, null);
      await prisma.device.updateMany({
        where: { deviceUid: targetUid },
        data: { status: 'ONLINE', lastSeenAt: new Date() }
      });
      return res.json({ success: true, message: `Device ${targetUid} restored to normal simulation` });
    }

    simulatorEngine.setScenario(targetUid, {
      type: scenarioType,
      powerW: powerW,
      durationCycles: durationCycles || (scenarioType === 'SUSTAINED_HIGH_POWER' ? 15 : 2)
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: req.user.id,
        actorEmail: req.user.email,
        action: `SIMULATOR_SCENARIO_${scenarioType}`,
        entityType: 'SIMULATOR',
        entityId: targetUid,
        details: { scenarioType, powerW, durationCycles }
      }
    }).catch(() => {});

    res.json({
      success: true,
      message: `Scenario ${scenarioType} successfully applied to ${targetUid}`,
      data: simulatorEngine.getStatus()
    });
  } catch (err) {
    next(err);
  }
});

export default router;
