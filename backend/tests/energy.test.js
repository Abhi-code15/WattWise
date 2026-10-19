import { describe, it, expect } from 'vitest';
import { computeCost } from '../src/modules/tariffs/tariffs.routes.js';

describe('Energy Calculation & Tariff Engine Tests', () => {
  it('converts Watts to kWh correctly for a fixed duration', () => {
    // 1000 Watts for 3600 seconds (1 hour) = 1.0 kWh
    const powerW = 1000;
    const timeSec = 3600;
    const kwh = (powerW * timeSec) / 3600000;
    expect(kwh).toBe(1.0);

    // 500 Watts for 1800 seconds (30 mins) = 0.25 kWh
    const halfHourKwh = (500 * 1800) / 3600000;
    expect(halfHourKwh).toBe(0.25);
  });

  it('performs trapezoidal interval numerical integration accurately', () => {
    const prevPowerW = 400;
    const currentPowerW = 600;
    const dtSec = 15; // 15-second simulation step

    const avgPowerW = (prevPowerW + currentPowerW) / 2; // 500W
    const intervalEnergyKWh = (avgPowerW * dtSec) / 3600000;

    // 500 * 15 / 3,600,000 = 7500 / 3,600,000 = 0.00208333...
    expect(intervalEnergyKWh).toBeCloseTo(0.0020833, 6);
  });

  it('computes flat-rate electricity cost accurately', () => {
    const flatTariff = {
      tariffType: 'FLAT_RATE',
      baseRatePerKWh: 7.50,
      fixedCharge: 50.0
    };

    // 100 kWh * 7.50 + 50 = 800.00
    const cost = computeCost(100, flatTariff);
    expect(cost).toBe(800.0);
  });

  it('computes slab-based electricity cost accurately', () => {
    const slabTariff = {
      tariffType: 'SLAB',
      fixedCharge: 50.0,
      slabConfig: [
        { minKWh: 0, maxKWh: 100, rate: 6.50 },
        { minKWh: 100, maxKWh: 300, rate: 7.50 },
        { minKWh: 300, maxKWh: 999999, rate: 9.00 }
      ]
    };

    // Case 1: 50 kWh -> 50 * 6.50 + 50 = 325 + 50 = 375
    expect(computeCost(50, slabTariff)).toBe(375.0);

    // Case 2: 150 kWh -> 100 * 6.50 + 50 * 7.50 + 50 = 650 + 375 + 50 = 1075
    expect(computeCost(150, slabTariff)).toBe(1075.0);

    // Case 3: 350 kWh -> 100 * 6.50 + 200 * 7.50 + 50 * 9.00 + 50 = 650 + 1500 + 450 + 50 = 2650
    expect(computeCost(350, slabTariff)).toBe(2650.0);
  });

  it('handles zero or negative consumption safely', () => {
    const flatTariff = { tariffType: 'FLAT_RATE', baseRatePerKWh: 7.50, fixedCharge: 50 };
    expect(computeCost(0, flatTariff)).toBe(0);
    expect(computeCost(-10, flatTariff)).toBe(0);
  });
});
