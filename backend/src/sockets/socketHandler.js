import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

let ioInstance = null;

export function setupSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  ioInstance = io;

  // Authentication Middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          assignments: {
            where: { isActive: true },
            select: { roomId: true }
          }
        }
      });

      if (!user || user.status !== 'ACTIVE') {
        return next(new Error('Authentication error: User inactive or not found'));
      }

      socket.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedRoomIds: user.assignments.map(a => a.roomId)
      };

      next();
    } catch (err) {
      logger.warn('Socket authentication rejected', { error: err.message });
      next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket client connected: ${socket.id} (User: ${socket.user.email}, Role: ${socket.user.role})`);

    // Auto-subscribe wardens to hostel-wide channel
    if (socket.user.role === 'WARDEN') {
      socket.join('hostel:all');
      socket.emit('subscribed', { channel: 'hostel:all' });
    }

    // Auto-subscribe students to their assigned rooms
    if (socket.user.role === 'STUDENT') {
      socket.user.assignedRoomIds.forEach(roomId => {
        const channel = `room:${roomId}`;
        socket.join(channel);
        socket.emit('subscribed', { channel });
      });
    }

    // Controlled subscription handler
    socket.on('subscribe:room', (data) => {
      const roomId = data?.roomId;
      if (!roomId) return;

      if (socket.user.role === 'WARDEN') {
        socket.join(`room:${roomId}`);
        socket.emit('subscribed', { channel: `room:${roomId}` });
      } else if (socket.user.role === 'STUDENT') {
        if (socket.user.assignedRoomIds.includes(roomId)) {
          socket.join(`room:${roomId}`);
          socket.emit('subscribed', { channel: `room:${roomId}` });
        } else {
          socket.emit('error', { message: 'Unauthorized room subscription' });
        }
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getSocketIO() {
  return ioInstance;
}
