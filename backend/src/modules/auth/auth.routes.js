import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../../config/index.js';
import { prisma } from '../../config/prisma.js';
import { authenticate } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validation.js';

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required')
});

router.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        assignments: {
          where: { isActive: true },
          include: { room: true }
        }
      }
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    // Record audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        actorEmail: user.email,
        action: 'USER_LOGIN',
        entityType: 'USER',
        entityId: user.id,
        details: { ip: req.ip, userAgent: req.get('user-agent') }
      }
    }).catch(() => {});

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedRooms: user.assignments.map(a => ({
          assignmentId: a.id,
          roomId: a.roomId,
          roomCode: a.room.roomCode,
          displayName: a.room.displayName
        }))
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: req.user.id,
        actorEmail: req.user.email,
        action: 'USER_LOGOUT',
        entityType: 'USER',
        entityId: req.user.id
      }
    }).catch(() => {});

    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

export default router;
