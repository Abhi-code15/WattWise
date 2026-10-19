import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('Authentication & Role-Based Access Control (RBAC) Tests', () => {
  let wardenToken = '';
  let studentToken = '';

  it('authenticates Warden successfully with demo credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'warden@wattwise.local',
        password: 'WardenPass123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('WARDEN');
    expect(res.body.token).toBeDefined();

    wardenToken = res.body.token;
  });

  it('authenticates Student successfully with demo credentials and assigned room', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'student.g024@wattwise.local',
        password: 'StudentPass123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('STUDENT');
    expect(res.body.user.assignedRooms.length).toBeGreaterThan(0);
    expect(res.body.user.assignedRooms[0].roomCode).toBe('G024');

    studentToken = res.body.token;
  });

  it('rejects invalid password with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'warden@wattwise.local',
        password: 'WrongPassword!'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('permits Student to access their assigned room G024 details', async () => {
    const res = await request(app)
      .get('/api/v1/rooms/G024')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.roomCode).toBe('G024');
  });

  it('strictly FORBIDS Student from accessing another room S210 (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/v1/rooms/S210')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Access denied');
  });

  it('strictly FORBIDS Student from accessing administrative simulator endpoints', async () => {
    const res = await request(app)
      .get('/api/v1/simulator/status')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('allows Warden to access hostel analytics overview and all rooms', async () => {
    const res = await request(app)
      .get('/api/v1/analytics/overview')
      .set('Authorization', `Bearer ${wardenToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary.totalMonitoredRooms).toBe(211);
  });
});
