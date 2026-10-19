# WattWise REST API Specification (`/api/v1`)

All endpoints are prefixed with `/api/v1`. Authentication uses standard Bearer JWT tokens in the `Authorization` header.

## 1. Authentication

### `POST /api/v1/auth/login`
- **Request Body**:
  ```json
  {
    "email": "warden@wattwise.local",
    "password": "WardenPass123!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOi...",
    "user": {
      "id": "uuid",
      "name": "Chief Warden Sharma",
      "email": "warden@wattwise.local",
      "role": "WARDEN",
      "assignedRooms": []
    }
  }
  ```

### `GET /api/v1/auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**: Returns authenticated user profile.

---

## 2. Telemetry Ingestion

### `POST /api/v1/telemetry/readings`
- **Headers**: `x-simulator-key: <key>` OR `x-device-key: <key>`
- **Request Body**: Single reading or Array of readings
  ```json
  [
    {
      "deviceId": "WW-G001",
      "sequenceNumber": 1024,
      "timestamp": "2026-10-19T10:30:00Z",
      "powerW": 280.5,
      "voltageV": 230.0,
      "currentA": 1.36,
      "powerFactor": 0.90,
      "cumulativeEnergyKWh": 14.85,
      "quality": "valid"
    }
  ]
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "processedCount": 1,
    "results": [{ "deviceId": "WW-G001", "sequenceNumber": 1024, "status": "PERSISTED" }]
  }
  ```

---

## 3. Hostel & Floor Map

### `GET /api/v1/hostel`
Returns primary hostel configuration and floor summaries.

### `GET /api/v1/floors`
Returns list of floors (`GROUND`, `SECOND`, `THIRD`) with room counts.

### `GET /api/v1/floors/:floorId/rooms`
Returns all rooms for the given floor code or ID, including device power, energy, and alert statuses.

---

## 4. Room Telemetry & Summaries (Protected by RBAC)

### `GET /api/v1/rooms/:roomId`
Returns room details, current device metrics, occupants, and active alerts.

### `GET /api/v1/rooms/:roomId/readings?limit=60`
Returns timestamped historical telemetry readings for the room.

### `GET /api/v1/rooms/:roomId/summary`
Returns today's energy (kWh), monthly energy (kWh), estimated cost today, and tariff rate.

---

## 5. Alerts & Incidents

### `GET /api/v1/alerts?status=TRIGGERED&severity=CRITICAL`
Returns alerts filtered by status and severity.

### `POST /api/v1/alerts/:alertId/acknowledge`
Warden action to mark alert as `ACKNOWLEDGED`.

### `POST /api/v1/alerts/:alertId/resolve`
Warden action to resolve alert with investigation notes.

### `POST /api/v1/alerts/:alertId/notes`
Append investigation notes to an alert record.

---

## 6. Simulator Controls (Warden Only)

### `GET /api/v1/simulator/status`
Returns loop state (`RUNNING`, `PAUSED`, `STOPPED`), speed (ms), and active scenarios.

### `POST /api/v1/simulator/start`
Start simulator loop.

### `POST /api/v1/simulator/pause`
Pause simulator loop.

### `POST /api/v1/simulator/speed`
Change loop interval speed in milliseconds (`1000` to `60000`).

### `POST /api/v1/simulator/scenarios`
- **Request Body**:
  ```json
  {
    "roomCode": "G024",
    "scenarioType": "SUSTAINED_HIGH_POWER",
    "powerW": 1450,
    "durationCycles": 15
  }
  ```
