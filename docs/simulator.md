# Virtual Smart-Meter Simulator Specification

## 1. Electrical Model Coherence

The simulator implements physically coherent AC electrical measurements:

$$P = V \times I \times \text{pf} \implies I = \frac{P}{V \times \text{pf}}$$

Where:
- Nominal single-phase voltage $V \approx 230.0\text{ V} \pm 2.0\text{ V}$ bounded random variation.
- Power factor $\text{pf} \approx 0.88 \pm 0.04$ typical for mixed residential inductive/resistive loads (fans, laptops, LED drivers).
- Active power $P$ generated deterministically based on room profile and diurnal time of day.
- Current $I$ is calculated directly from power, voltage, and power factor.

## 2. Trapezoidal Numerical Energy Integration

Cumulative energy is calculated across discrete simulation intervals $\Delta t$:

$$\Delta E = \frac{P_{\text{current}} + P_{\text{previous}}}{2} \times \frac{\Delta t}{3,600,000} \text{ kWh}$$

This cumulative energy state is monotonically increased and persisted in the meter state. Meter resets or negative differences are trapped and flagged as `meter_reset_detected`.

## 3. Diurnal Room Profiles

| Type | Night (00:00–06:00) | Morning (06:00–09:00) | Daytime (09:00–17:00) | Evening (17:00–23:59) |
|---|---|---|---|---|
| **Residential (G001–T370)** | 40–90W (fan/chargers) | 220–480W (lights, laptop) | 120–280W (study) | 250–550W (peak study) |
| **Hostel Mess** | 150–300W (refrigeration) | 2500–4500W (breakfast) | 3000–5200W (lunch) | 3500–5400W (dinner) |
| **Night Canteen** | 1500–3200W (active) | 100W (idle) | 100W (idle) | 1500–3400W (evening) |
| **Warden Office** | 50W (standby) | 500–1200W (office) | 600–1400W (active) | 100W (idle) |
| **Corridors** | 600–850W (night lighting) | 80W (daylight) | 80W (daylight) | 650–900W (evening) |
