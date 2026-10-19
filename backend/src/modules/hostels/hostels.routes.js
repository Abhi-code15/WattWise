import express from 'express';
import { prisma } from '../../config/prisma.js';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

router.get('/hostel', authenticate, async (req, res, next) => {
  try {
    const hostel = await prisma.hostel.findFirst({
      include: {
        floors: {
          orderBy: { floorNumber: 'asc' }
        },
        tariffs: {
          where: { isActive: true },
          take: 1
        }
      }
    });

    if (!hostel) {
      return res.status(404).json({ success: false, error: 'Hostel configuration not found.' });
    }

    res.json({
      success: true,
      data: hostel
    });
  } catch (err) {
    next(err);
  }
});

router.get('/floors', authenticate, async (req, res, next) => {
  try {
    const floors = await prisma.floor.findMany({
      orderBy: { floorNumber: 'asc' },
      include: {
        _count: {
          select: { rooms: true }
        }
      }
    });

    res.json({
      success: true,
      data: floors
    });
  } catch (err) {
    next(err);
  }
});

export default router;
