import express from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validation.js';

const router = express.Router();

export function computeCost(kwh, tariff) {
  if (!tariff || kwh <= 0) return 0;

  if (tariff.tariffType === 'FLAT_RATE' || !tariff.slabConfig || !Array.isArray(tariff.slabConfig)) {
    return parseFloat(((kwh * tariff.baseRatePerKWh) + (tariff.fixedCharge || 0)).toFixed(2));
  }

  // Slab calculation
  let remaining = kwh;
  let totalCost = tariff.fixedCharge || 0;

  for (const slab of tariff.slabConfig) {
    if (remaining <= 0) break;
    const slabSpan = slab.maxKWh - slab.minKWh;
    const kwhInSlab = Math.min(remaining, slabSpan);
    totalCost += kwhInSlab * slab.rate;
    remaining -= kwhInSlab;
  }

  return parseFloat(totalCost.toFixed(2));
}

router.get('/tariffs', authenticate, async (req, res, next) => {
  try {
    const tariffs = await prisma.tariff.findMany({
      orderBy: { effectiveFrom: 'desc' }
    });

    const activeTariff = tariffs.find(t => t.isActive) || tariffs[0];

    res.json({
      success: true,
      activeTariff,
      allTariffs: tariffs
    });
  } catch (err) {
    next(err);
  }
});

const tariffUpdateSchema = z.object({
  name: z.string().min(1),
  tariffType: z.enum(['FLAT_RATE', 'SLAB']),
  baseRatePerKWh: z.number().positive(),
  fixedCharge: z.number().min(0).default(0),
  slabConfig: z.array(z.object({
    minKWh: z.number(),
    maxKWh: z.number(),
    rate: z.number()
  })).optional()
});

router.post('/tariffs', authenticate, requireRole('WARDEN'), validateBody(tariffUpdateSchema), async (req, res, next) => {
  try {
    const hostel = await prisma.hostel.findFirst();
    if (!hostel) return res.status(404).json({ success: false, error: 'Hostel not found' });

    // Mark previous active tariffs inactive
    await prisma.tariff.updateMany({
      where: { hostelId: hostel.id, isActive: true },
      data: { isActive: false }
    });

    const newTariff = await prisma.tariff.create({
      data: {
        hostelId: hostel.id,
        name: req.body.name,
        tariffType: req.body.tariffType,
        baseRatePerKWh: req.body.baseRatePerKWh,
        fixedCharge: req.body.fixedCharge,
        slabConfig: req.body.slabConfig,
        currency: 'INR',
        isActive: true
      }
    });

    await prisma.auditLog.create({
      data: {
        actorUserId: req.user.id,
        actorEmail: req.user.email,
        action: 'TARIFF_UPDATED',
        entityType: 'TARIFF',
        entityId: newTariff.id,
        details: { baseRate: req.body.baseRatePerKWh, type: req.body.tariffType }
      }
    }).catch(() => {});

    res.status(201).json({ success: true, data: newTariff });
  } catch (err) {
    next(err);
  }
});

const calculateSchema = z.object({
  kwh: z.number().nonnegative()
});

router.post('/tariffs/calculate', authenticate, validateBody(calculateSchema), async (req, res, next) => {
  try {
    const tariff = await prisma.tariff.findFirst({ where: { isActive: true } });
    const cost = computeCost(req.body.kwh, tariff);

    res.json({
      success: true,
      kwh: req.body.kwh,
      estimatedCost: cost,
      currency: tariff?.currency || 'INR',
      tariffModel: tariff?.tariffType || 'FLAT_RATE'
    });
  } catch (err) {
    next(err);
  }
});

export default router;
