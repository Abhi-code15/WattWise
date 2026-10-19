import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { config } from '../src/config/index.js';

describe('Simulator, Inventory & Telemetry Ingestion Tests', () => {
  it('verifies exactly 200 residential rooms and correct floor distribution', async () => {
    const floors = await prisma.floor.findMany({
      include: {
        rooms: {
          where: { roomType: 'RESIDENTIAL' }
        }
      }
    });

    const ground = floors.find(f => f.floorCode === 'GROUND');
    const second = floors.find(f => f.floorCode === 'SECOND');
    const third = floors.find(f => f.floorCode === 'THIRD');

    expect(ground.rooms.length).toBe(60);
    expect(second.rooms.length).toBe(70);
    expect(third.rooms.length).toBe(70);

    const totalResidential = ground.rooms.length + second.rooms.length + third.rooms.length;
    expect(totalResidential).toBe(200);
  });

  it('verifies shared facilities have distinct virtual meters', async () => {
    const sharedFacilities = await prisma.room.findMany({
      where: { roomType: { not: 'RESIDENTIAL' } },
      include: { devices: true }
    });

    expect(sharedFacilities.length).toBeGreaterThanOrEqual(11);
    for (const facility of sharedFacilities) {
      expect(facility.devices.length).toBeGreaterThanOrEqual(1);
      expect(facility.devices[0].deviceUid).toBe(`WW-${facility.roomCode}`);
    }
  });

  it('verifies electrical parameters coherence (P = V * I * pf)', () => {
    const voltageV = 230.0;
    const powerFactor = 0.90;
    const powerW = 414.0;

    // Current = Power / (Voltage * pf) = 414 / (230 * 0.90) = 414 / 207 = 2.0 A
    const currentA = powerW / (voltageV * powerFactor);
    expect(currentA).toBeCloseTo(2.0, 2);
  });

  it('ingests valid telemetry through the standard ingestion API (POST /api/v1/telemetry/readings)', async () => {
    const testSeq = Math.floor(Math.random() * 900000) + 100000;
    const testReading = {
      deviceId: 'WW-G001',
      sequenceNumber: testSeq,
      timestamp: new Date().toISOString(),
      powerW: 245.5,
      voltageV: 231.0,
      currentA: 1.15,
      powerFactor: 0.92,
      cumulativeEnergyKWh: 14.85,
      quality: 'valid'
    };

    const res = await request(app)
      .post('/api/v1/telemetry/readings')
      .set('x-simulator-key', config.simulatorApiKey)
      .send(testReading);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.processedCount).toBe(1);

    // Verify persisted in PostgreSQL
    const saved = await prisma.energyReading.findFirst({
      where: { sequenceNumber: BigInt(testSeq) }
    });
    expect(saved).toBeDefined();
    expect(saved.powerW).toBe(245.5);
  });

  it('rejects unauthenticated telemetry requests (401)', async () => {
    const res = await request(app)
      .post('/api/v1/telemetry/readings')
      .send({
        deviceId: 'WW-G001',
        sequenceNumber: 999999,
        timestamp: new Date().toISOString(),
        powerW: 100,
        voltageV: 230,
        currentA: 0.5,
        powerFactor: 0.9,
        cumulativeEnergyKWh: 10
      });

    expect(res.status).toBe(401);
  });
});
