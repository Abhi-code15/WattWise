import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authentication required. No Bearer token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        assignments: {
          where: { isActive: true },
          include: { room: true }
        }
      }
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ success: false, error: 'User not found or account inactive.' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      assignedRooms: user.assignments.map(a => ({
        roomId: a.roomId,
        roomCode: a.room.roomCode,
        displayName: a.room.displayName
      }))
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, error: 'Invalid authentication token.' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Access restricted to roles [${roles.join(', ')}].`
      });
    }
    next();
  };
}

export function requireRoomAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  // Wardens have universal hostel room access
  if (req.user.role === 'WARDEN') {
    return next();
  }

  // Students can only access their assigned room
  const targetRoomId = req.params.roomId;
  const isAssigned = req.user.assignedRooms.some(
    r => r.roomId === targetRoomId || r.roomCode.toLowerCase() === targetRoomId?.toLowerCase()
  );

  if (!isAssigned) {
    return res.status(403).json({
      success: false,
      error: 'Access denied: You are only authorized to view telemetry and details for your assigned room.'
    });
  }

  next();
}

export async function authenticateTelemetrySource(req, res, next) {
  const simKey = req.headers['x-simulator-key'] || req.query.simulatorKey;
  if (simKey && simKey === config.simulatorApiKey) {
    req.telemetrySource = { type: 'SIMULATOR', identity: 'internal-simulator' };
    return next();
  }

  const deviceKey = req.headers['x-device-key'];
  const deviceUid = req.body?.deviceId;

  if (deviceKey && deviceUid) {
    const device = await prisma.device.findUnique({
      where: { deviceUid }
    });

    if (device && device.secretKey === deviceKey) {
      req.telemetrySource = { type: 'DEVICE', identity: device.deviceUid, deviceId: device.id };
      return next();
    }
  }

  return res.status(401).json({
    success: false,
    error: 'Unauthorized telemetry source. Valid x-simulator-key or x-device-key is required.'
  });
}
