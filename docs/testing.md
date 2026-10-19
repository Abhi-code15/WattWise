# WattWise Verification & Testing Suite

## 1. Automated Test Execution

The automated test suite runs via Vitest:

```bash
cd backend
npm test
```

### Measured Test Results:
- **Test Files**: 4 passed (4)
- **Total Tests**: 20 passed (20)
- **Suite Duration**: ~3.5 seconds

### Test Suites Covered:
1. `tests/energy.test.js`:
   - Watt-to-kWh mathematical conversions
   - Trapezoidal numerical energy integration
   - Flat-rate electricity cost calculations
   - Slab-based tiered electricity calculations
   - Zero and negative consumption sanity checks
2. `tests/alerts.test.js`:
   - Consecutive high-power counter increments
   - Counter resets on valid normal readings
   - Threshold requirement enforcement (10 readings)
3. `tests/auth.test.js`:
   - Warden authentication & token issuance
   - Student authentication & room assignment
   - Student accessing assigned room G024 (200 OK)
   - Student blocked from unassigned room S210 (403 Forbidden)
   - Student blocked from administrative simulator controls (403 Forbidden)
   - Warden accessing full hostel overview
4. `tests/simulator.test.js`:
   - Exactly 200 residential rooms seeded:
     - Ground Floor: 60 rooms (G001–G060)
     - Second Floor: 70 rooms (S201–S270)
     - Third Floor: 70 rooms (T301–T370)
   - 11 separately monitored shared facilities
   - Electrical parameters coherence ($P = V \times I \times \text{pf}$)
   - Telemetry ingestion pipeline execution & persistence

---

## 2. Telemetry Ingestion Load Test

Execute the reproducible load test:

```bash
cd backend
node tests/loadTest.js
```

### Measured Benchmark:
```
================ LOAD TEST RESULTS ================
Total Readings Ingested:    1,000 readings
Total Time Elapsed:         6.99 seconds
Effective Ingestion Rate:   143.09 readings/second
Average Batch Latency:      348.72 ms
P95 Batch Latency:          468.56 ms
Expected Hostel Rate (200m): ~13.3 readings/sec
Performance Margin:         10.8x of target load
Status:                     ✅ EXCEEDS PRODUCTION SLA
====================================================
```
