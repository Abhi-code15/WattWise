# WattWise System Architecture

## 1. System Overview

**WattWise** is a centralized, real-time IoT-based energy intelligence and hostel monitoring platform designed for high-density student residential facilities.

```mermaid
flowchart TD
    subgraph IoT_Simulation_Layer ["IoT Device Simulation Layer"]
        A1["200 Residential Virtual Smart Meters (G001-T370)"]
        A2["11 Shared Facility Meters (Mess, Canteen, etc.)"]
        A3["Deterministic Telemetry Engine (Interval: 15s)"]
    end

    subgraph Telemetry_Ingestion_Layer ["Telemetry Ingestion Layer"]
        B1["POST /api/v1/telemetry/readings"]
        B2["Device Key / Simulator Secret Auth"]
        B3["Zod Range & Quality Validation"]
        B4["Idempotent Deduplication Check"]
    end

    subgraph Backend_Modular_Monolith ["Node.js / Express Backend Engine"]
        C1["Authentication & RBAC (Warden vs Student)"]
        C2["Alert Engine (10 Consecutive High Load Rule)"]
        C3["Offline & Stale Heartbeat Detector"]
        C4["Trapezoidal Numerical kWh Integrator"]
        C5["Tariff Slabs & Cost Estimator"]
    end

    subgraph Persistence_Layer ["PostgreSQL Database (Prisma ORM)"]
        D1[("hostels, floors, rooms (200 + 11)")]
        D2[("devices (211 virtual meters)")]
        D3[("energy_readings (Timestamped Time-Series)")]
        D4[("alerts & notifications")]
        D5[("tariffs & budgets")]
    end

    subgraph RealTime_Distribution ["Real-Time Event Gateway"]
        E1["Authenticated Socket.IO Server"]
        E2["Room-Scoped Channels (room:roomId)"]
        E3["Hostel-Wide Channel (hostel:all)"]
    end

    subgraph Frontend_Presentation ["React + Vite Dashboard"]
        F1["Chief Warden Overview & Floor Breakdown"]
        F2["Interactive 3-Floor Hostel Map"]
        F3["Alerts Lifecycle Center"]
        F4["Simulation Test Lab Console"]
        F5["Student Private Room Dashboard"]
    end

    A1 & A2 & A3 -->|HTTP POST with Telemetry Payload| B1
    B1 --> B2 --> B3 --> B4
    B4 --> C4 --> D3
    B4 --> C2 --> D4
    B4 --> C3 --> D2
    C1 & C2 & C4 & C5 <--> D1 & D2 & D3 & D4 & D5
    C2 & B4 -->|Emit meter:reading & alert:created| E1
    E1 --> E2 & E3
    E2 --> F5
    E3 --> F1 & F2 & F3 & F4
```

## 2. Telemetry Ingestion Contract

The telemetry interface accepts both single readings and batches:

```json
{
  "deviceId": "WW-G024",
  "sequenceNumber": 1024,
  "timestamp": "2026-10-19T10:30:00Z",
  "powerW": 280.5,
  "voltageV": 230.0,
  "currentA": 1.36,
  "powerFactor": 0.90,
  "cumulativeEnergyKWh": 14.85,
  "quality": "valid"
}
```

### Ingestion Validation Pipeline:
1. **Source Authentication**: Verifies `x-simulator-key` or device `x-device-key`.
2. **Schema & Range Sanity**: Voltage (100–300V), Power (0–100kW), Current (0–200A), Power Factor (0–1.0).
3. **Sequence & Idempotency**: `(deviceId, sequenceNumber)` uniqueness constraint prevents double-counting.
4. **Energy Discontinuity Detection**: Flags resets or negative energy deltas explicitly.
5. **Persistence**: Saves to PostgreSQL `energy_readings` table.
6. **Alert Evaluation**: Feeds to `AlertService`.
7. **WebSocket Broadcast**: Emits `meter:reading` to authorized Socket.IO rooms.

## 3. High-Consumption Alert Engine (Section 12 Compliance)

- **Default Interval**: 15 seconds.
- **Rule**: If a room's power exceeds its configured threshold (`highPowerThresholdW`, e.g. 800W for residential rooms) for **10 consecutive valid readings** (~150 seconds / 2.5 minutes), a `SUSTAINED_HIGH_POWER` alert triggers.
- **Counter Reset**: Any valid normal reading immediately resets the consecutive count to 0.
- **Deduplication**: Active incidents are updated without creating duplicate spam.
- **Lifecycle**: `TRIGGERED` &rarr; `ACKNOWLEDGED` &rarr; `INVESTIGATING` &rarr; `RESOLVED`.
- **Targeted Notification**: Only the student assigned to that room and authorized wardens receive the alert notification.

## 4. Role-Based Access Control (RBAC) Security Architecture

- **Warden**: Universal access to all 3 floors, 200 rooms, 11 shared facilities, analytics, tariffs, and simulator controls.
- **Student**: Strict room isolation enforced at the backend middleware (`requireRoomAccess`) and Socket.IO level. A student assigned to `G024` cannot query or subscribe to `S210` under any circumstances (returns 403 Forbidden).
