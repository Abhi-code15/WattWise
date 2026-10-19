import { prisma } from '../../config/prisma.js';
import { logger } from '../../utils/logger.js';
import { config } from '../../config/index.js';

class SimulatorEngine {
  constructor() {
    this.intervalId = null;
    this.status = 'STOPPED'; // 'RUNNING', 'PAUSED', 'STOPPED'
    this.intervalMs = config.simulatorIntervalMs || 15000;
    this.devices = new Map(); // deviceUid -> state
    this.scenarios = new Map(); // deviceUid -> scenario override
    this.backendUrl = `http://127.0.0.1:${config.port}/api/v1/telemetry/readings`;
  }

  async initialize() {
    try {
      logger.info('Initializing Virtual Smart-Meter Simulator Engine...');
      const dbDevices = await prisma.device.findMany({
        where: { deviceType: 'VIRTUAL_SMART_METER' },
        include: { room: true }
      });

      this.devices.clear();
      for (const d of dbDevices) {
        this.devices.set(d.deviceUid, {
          id: d.id,
          deviceUid: d.deviceUid,
          roomCode: d.room?.roomCode || 'UNKNOWN',
          roomType: d.room?.roomType || 'RESIDENTIAL',
          thresholdW: d.room?.highPowerThresholdW || 800.0,
          sequenceNumber: d.lastSequence ? Number(d.lastSequence) : 0,
          cumulativeEnergyKWh: d.lastEnergyKWh || 10.0 + Math.random() * 20.0,
          lastPowerW: d.lastPowerW || 150.0,
          lastTimestamp: d.lastSeenAt || new Date(),
          isSimulatedOffline: false
        });
      }

      logger.info(`Simulator loaded ${this.devices.size} virtual meters.`);
    } catch (err) {
      logger.error('Failed to initialize simulator', { error: err.message });
    }
  }

  start(intervalMs) {
    if (this.status === 'RUNNING') {
      logger.warn('Simulator is already running.');
      return;
    }

    if (intervalMs) {
      this.intervalMs = intervalMs;
    }

    this.status = 'RUNNING';
    logger.info(`Starting simulation loop with interval ${this.intervalMs}ms`);

    // Run first tick immediately, then schedule
    this.tick();
    this.intervalId = setInterval(() => this.tick(), this.intervalMs);
  }

  pause() {
    if (this.status === 'RUNNING') {
      this.status = 'PAUSED';
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      logger.info('Simulator paused.');
    }
  }

  resume() {
    if (this.status === 'PAUSED') {
      this.status = 'RUNNING';
      this.intervalId = setInterval(() => this.tick(), this.intervalMs);
      logger.info('Simulator resumed.');
    }
  }

  stop() {
    this.status = 'STOPPED';
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    logger.info('Simulator stopped.');
  }

  setIntervalSpeed(ms) {
    this.intervalMs = Math.max(500, ms);
    if (this.status === 'RUNNING') {
      clearInterval(this.intervalId);
      this.intervalId = setInterval(() => this.tick(), this.intervalMs);
    }
    logger.info(`Simulator speed updated to ${this.intervalMs}ms`);
  }

  setScenario(deviceUid, scenario) {
    // scenario: { type: 'SUSTAINED_HIGH_POWER'|'SPIKE'|'OFFLINE'|'RESET', powerW: number, durationCycles: number }
    if (scenario) {
      this.scenarios.set(deviceUid, {
        ...scenario,
        remainingCycles: scenario.durationCycles || 15
      });
      logger.info(`Scenario applied to ${deviceUid}: ${scenario.type}`);
    } else {
      this.scenarios.delete(deviceUid);
      const dev = this.devices.get(deviceUid);
      if (dev) dev.isSimulatedOffline = false;
      logger.info(`Scenario cleared for ${deviceUid}`);
    }
  }

  clearAllScenarios() {
    this.scenarios.clear();
    for (const dev of this.devices.values()) {
      dev.isSimulatedOffline = false;
    }
    logger.info('All simulator scenarios cleared.');
  }

  /**
   * Generates realistic power based on room type, diurnal schedule, and random bounded variance
   */
  calculateRealisticPower(dev) {
    const scenario = this.scenarios.get(dev.deviceUid);
    if (scenario) {
      if (scenario.type === 'OFFLINE') {
        dev.isSimulatedOffline = true;
        return null; // Will not report
      }
      if (scenario.type === 'SUSTAINED_HIGH_POWER') {
        scenario.remainingCycles -= 1;
        if (scenario.remainingCycles <= 0) {
          this.scenarios.delete(dev.deviceUid);
        }
        return scenario.powerW || (dev.thresholdW * 1.6);
      }
      if (scenario.type === 'SPIKE') {
        scenario.remainingCycles -= 1;
        if (scenario.remainingCycles <= 0) {
          this.scenarios.delete(dev.deviceUid);
        }
        return scenario.powerW || 1800.0;
      }
    }

    if (dev.isSimulatedOffline) {
      return null;
    }

    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    let basePower = 150.0;
    let variance = (Math.random() - 0.5) * 40.0;

    switch (dev.roomType) {
      case 'RESIDENTIAL':
        if (hour >= 0 && hour < 6) {
          // Night standby
          basePower = 55.0;
          variance = (Math.random() - 0.5) * 20.0;
        } else if (hour >= 6 && hour < 9) {
          // Morning activity
          basePower = 320.0;
          variance = (Math.random() - 0.5) * 80.0;
        } else if (hour >= 9 && hour < 17) {
          // Daytime moderate
          basePower = 180.0;
          variance = (Math.random() - 0.5) * 60.0;
        } else {
          // Evening peak study
          basePower = 380.0;
          variance = (Math.random() - 0.5) * 110.0;
        }
        break;

      case 'COMMON_MESS':
        // High during meal hours (Breakfast 7:30-9:30, Lunch 12:00-14:30, Dinner 19:30-22:00)
        if ((hour >= 7 && hour <= 9.5) || (hour >= 12 && hour <= 14.5) || (hour >= 19.5 && hour <= 22)) {
          basePower = 3800.0;
          variance = (Math.random() - 0.5) * 600.0;
        } else {
          basePower = 350.0;
          variance = (Math.random() - 0.5) * 80.0;
        }
        break;

      case 'COMMON_CANTEEN':
        if (hour >= 17 || hour <= 2) {
          basePower = 2400.0;
          variance = (Math.random() - 0.5) * 400.0;
        } else {
          basePower = 180.0;
          variance = (Math.random() - 0.5) * 50.0;
        }
        break;

      case 'COMMON_WARDEN':
        if (hour >= 9 && hour <= 18) {
          basePower = 950.0;
          variance = (Math.random() - 0.5) * 150.0;
        } else {
          basePower = 90.0;
          variance = (Math.random() - 0.5) * 20.0;
        }
        break;

      case 'COMMON_TV_HALL':
        if (hour >= 18 && hour <= 23.5) {
          basePower = 1600.0;
          variance = (Math.random() - 0.5) * 300.0;
        } else {
          basePower = 120.0;
          variance = (Math.random() - 0.5) * 30.0;
        }
        break;

      case 'COMMON_WASHROOM':
        basePower = 450.0;
        variance = (Math.random() - 0.5) * 250.0;
        break;

      case 'COMMON_CORRIDOR':
        if (hour >= 18 || hour <= 6.5) {
          basePower = 750.0;
          variance = (Math.random() - 0.5) * 50.0;
        } else {
          basePower = 80.0;
          variance = (Math.random() - 0.5) * 15.0;
        }
        break;

      case 'COMMON_STAIRWELL':
        basePower = 260.0;
        variance = (Math.random() - 0.5) * 30.0;
        break;

      default:
        basePower = 200.0;
        variance = (Math.random() - 0.5) * 50.0;
    }

    return Math.max(15.0, parseFloat((basePower + variance).toFixed(1)));
  }

  async tick() {
    if (this.status !== 'RUNNING') return;

    try {
      const now = new Date();
      const readingsBatch = [];

      for (const dev of this.devices.values()) {
        const powerW = this.calculateRealisticPower(dev);
        if (powerW === null) {
          // Simulated offline: Skip generating reading
          continue;
        }

        // Electrical model coherence:
        // Nominal voltage 230V with slight realistic fluctuations
        const voltageV = parseFloat((230.0 + (Math.random() - 0.5) * 4.0).toFixed(1));
        const powerFactor = parseFloat((0.88 + (Math.random() - 0.5) * 0.08).toFixed(2));
        // Current A = Power / (Voltage * PowerFactor)
        const currentA = parseFloat((powerW / (voltageV * powerFactor)).toFixed(2));

        // Trapezoidal numerical integration for cumulative energy:
        // dt in seconds
        const dtSec = (now.getTime() - new Date(dev.lastTimestamp).getTime()) / 1000;
        const safeDtSec = Math.min(Math.max(dtSec, 1), 60); // Bound between 1s and 60s
        const avgPowerW = (powerW + dev.lastPowerW) / 2;
        const deltaKWh = (avgPowerW * safeDtSec) / 3600000;

        dev.cumulativeEnergyKWh = parseFloat((dev.cumulativeEnergyKWh + deltaKWh).toFixed(5));
        dev.sequenceNumber += 1;
        dev.lastPowerW = powerW;
        dev.lastTimestamp = now;

        readingsBatch.push({
          deviceId: dev.deviceUid,
          sequenceNumber: dev.sequenceNumber,
          timestamp: now.toISOString(),
          powerW,
          voltageV,
          currentA,
          powerFactor,
          cumulativeEnergyKWh: dev.cumulativeEnergyKWh,
          quality: 'valid'
        });
      }

      if (readingsBatch.length > 0) {
        // Send batch through the standard Ingestion API
        const response = await fetch(this.backendUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-simulator-key': config.simulatorApiKey
          },
          body: JSON.stringify(readingsBatch)
        });

        if (!response.ok) {
          const errText = await response.text();
          logger.error(`Simulator ingestion HTTP error ${response.status}`, { details: errText });
        }
      }
    } catch (err) {
      logger.error('Error during simulator tick', { error: err.message });
    }
  }

  getStatus() {
    return {
      status: this.status,
      intervalMs: this.intervalMs,
      totalDevices: this.devices.size,
      activeScenarios: Array.from(this.scenarios.entries()).map(([deviceUid, sc]) => ({
        deviceUid,
        scenario: sc
      }))
    };
  }
}

export const simulatorEngine = new SimulatorEngine();
