import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting WattWise database seed...');

  // 1. Seed or update Hostel
  const hostel = await prisma.hostel.upsert({
    where: { code: 'WATTWISE-A' },
    update: {
      name: 'WattWise Hostel A',
      configuration: {
        campus: 'Central University Campus',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        currencySymbol: '₹',
        billingCycleDay: 1,
        totalCapacity: 400
      }
    },
    create: {
      name: 'WattWise Hostel A',
      code: 'WATTWISE-A',
      configuration: {
        campus: 'Central University Campus',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        currencySymbol: '₹',
        billingCycleDay: 1,
        totalCapacity: 400
      }
    }
  });
  console.log(`✅ Hostel ready: ${hostel.name} (${hostel.id})`);

  // 2. Seed Floors
  const floorData = [
    {
      floorCode: 'GROUND',
      displayName: 'Ground Floor',
      floorNumber: 0,
      totalRooms: 60,
      configuration: {
        residentialCount: 60,
        hasMess: true,
        hasCanteen: true,
        hasWardenOffice: true
      }
    },
    {
      floorCode: 'SECOND',
      displayName: 'Second Floor',
      floorNumber: 2,
      totalRooms: 70,
      configuration: {
        residentialCount: 70
      }
    },
    {
      floorCode: 'THIRD',
      displayName: 'Third Floor',
      floorNumber: 3,
      totalRooms: 70,
      configuration: {
        residentialCount: 70
      }
    }
  ];

  const floorMap = {};
  for (const f of floorData) {
    const floor = await prisma.floor.upsert({
      where: { floorCode: f.floorCode },
      update: {
        displayName: f.displayName,
        floorNumber: f.floorNumber,
        totalRooms: f.totalRooms,
        configuration: f.configuration,
        hostelId: hostel.id
      },
      create: {
        hostelId: hostel.id,
        floorCode: f.floorCode,
        displayName: f.displayName,
        floorNumber: f.floorNumber,
        totalRooms: f.totalRooms,
        configuration: f.configuration
      }
    });
    floorMap[f.floorCode] = floor;
    console.log(`✅ Floor ready: ${floor.displayName} (${floor.id})`);
  }

  // 3. Seed Rooms & Shared Facilities
  // Residential Rooms:
  // Ground: G001 - G060 (60 rooms)
  // Second: S201 - S270 (70 rooms)
  // Third: T301 - T370 (70 rooms)
  const roomsToSeed = [];

  // Ground Floor Residential Rooms
  for (let i = 1; i <= 60; i++) {
    const code = `G${String(i).padStart(3, '0')}`;
    roomsToSeed.push({
      floorId: floorMap['GROUND'].id,
      roomCode: code,
      displayName: `Room ${code}`,
      roomType: 'RESIDENTIAL',
      highPowerThresholdW: 800.0,
      configuration: { wing: i <= 30 ? 'East Wing' : 'West Wing', capacity: 2 }
    });
  }

  // Second Floor Residential Rooms
  for (let i = 201; i <= 270; i++) {
    const code = `S${i}`;
    roomsToSeed.push({
      floorId: floorMap['SECOND'].id,
      roomCode: code,
      displayName: `Room ${code}`,
      roomType: 'RESIDENTIAL',
      highPowerThresholdW: 800.0,
      configuration: { wing: i <= 235 ? 'East Wing' : 'West Wing', capacity: 2 }
    });
  }

  // Third Floor Residential Rooms
  for (let i = 301; i <= 370; i++) {
    const code = `T${i}`;
    roomsToSeed.push({
      floorId: floorMap['THIRD'].id,
      roomCode: code,
      displayName: `Room ${code}`,
      roomType: 'RESIDENTIAL',
      highPowerThresholdW: 800.0,
      configuration: { wing: i <= 335 ? 'East Wing' : 'West Wing', capacity: 2 }
    });
  }

  // Shared Facilities
  const sharedFacilities = [
    {
      floorId: floorMap['GROUND'].id,
      roomCode: 'COMMON-MESS',
      displayName: 'Hostel Dining Hall & Mess',
      roomType: 'COMMON_MESS',
      highPowerThresholdW: 5500.0,
      configuration: { schedule: '07:00-22:00', type: 'Dining Facility' }
    },
    {
      floorId: floorMap['GROUND'].id,
      roomCode: 'COMMON-CANTEEN',
      displayName: 'Night Canteen & Cafeteria',
      roomType: 'COMMON_CANTEEN',
      highPowerThresholdW: 3500.0,
      configuration: { schedule: '17:00-02:00', type: 'Food Stall' }
    },
    {
      floorId: floorMap['GROUND'].id,
      roomCode: 'COMMON-WARDEN',
      displayName: "Warden's Office & Administration",
      roomType: 'COMMON_WARDEN',
      highPowerThresholdW: 1500.0,
      configuration: { schedule: '09:00-18:00', type: 'Administrative' }
    },
    {
      floorId: floorMap['GROUND'].id,
      roomCode: 'COMMON-TV-HALL',
      displayName: 'Recreation & Common TV Hall',
      roomType: 'COMMON_TV_HALL',
      highPowerThresholdW: 2500.0,
      configuration: { schedule: '08:00-23:00', type: 'Recreation' }
    },
    {
      floorId: floorMap['GROUND'].id,
      roomCode: 'GROUND-WASHROOM',
      displayName: 'Ground Floor Washroom Block',
      roomType: 'COMMON_WASHROOM',
      highPowerThresholdW: 1500.0,
      configuration: { schedule: '24/7', type: 'Sanitary' }
    },
    {
      floorId: floorMap['GROUND'].id,
      roomCode: 'GROUND-CORRIDOR',
      displayName: 'Ground Floor Corridor Lighting',
      roomType: 'COMMON_CORRIDOR',
      highPowerThresholdW: 1200.0,
      configuration: { schedule: 'Sunset-Sunrise', type: 'Lighting' }
    },
    {
      floorId: floorMap['GROUND'].id,
      roomCode: 'STAIRWELL',
      displayName: 'Central Stairwell & Emergency Core',
      roomType: 'COMMON_STAIRWELL',
      highPowerThresholdW: 800.0,
      configuration: { schedule: '24/7', type: 'Safety' }
    },
    {
      floorId: floorMap['SECOND'].id,
      roomCode: 'SECOND-WASHROOM',
      displayName: 'Second Floor Washroom Block',
      roomType: 'COMMON_WASHROOM',
      highPowerThresholdW: 1500.0,
      configuration: { schedule: '24/7', type: 'Sanitary' }
    },
    {
      floorId: floorMap['SECOND'].id,
      roomCode: 'SECOND-CORRIDOR',
      displayName: 'Second Floor Corridor Lighting',
      roomType: 'COMMON_CORRIDOR',
      highPowerThresholdW: 1200.0,
      configuration: { schedule: 'Sunset-Sunrise', type: 'Lighting' }
    },
    {
      floorId: floorMap['THIRD'].id,
      roomCode: 'THIRD-WASHROOM',
      displayName: 'Third Floor Washroom Block',
      roomType: 'COMMON_WASHROOM',
      highPowerThresholdW: 1500.0,
      configuration: { schedule: '24/7', type: 'Sanitary' }
    },
    {
      floorId: floorMap['THIRD'].id,
      roomCode: 'THIRD-CORRIDOR',
      displayName: 'Third Floor Corridor Lighting',
      roomType: 'COMMON_CORRIDOR',
      highPowerThresholdW: 1200.0,
      configuration: { schedule: 'Sunset-Sunrise', type: 'Lighting' }
    }
  ];

  const allRoomsToProcess = [...roomsToSeed, ...sharedFacilities];
  console.log(`⚡ Seeding ${allRoomsToProcess.length} rooms (200 residential + ${sharedFacilities.length} shared facilities)...`);

  const createdRoomsMap = {};
  for (const r of allRoomsToProcess) {
    const room = await prisma.room.upsert({
      where: { roomCode: r.roomCode },
      update: {
        floorId: r.floorId,
        displayName: r.displayName,
        roomType: r.roomType,
        highPowerThresholdW: r.highPowerThresholdW,
        configuration: r.configuration
      },
      create: {
        floorId: r.floorId,
        roomCode: r.roomCode,
        displayName: r.displayName,
        roomType: r.roomType,
        highPowerThresholdW: r.highPowerThresholdW,
        configuration: r.configuration
      }
    });
    createdRoomsMap[r.roomCode] = room;

    // 4. Seed associated Virtual Smart Meter
    const deviceUid = `WW-${r.roomCode}`;
    await prisma.device.upsert({
      where: { deviceUid },
      update: {
        roomId: room.id,
        deviceType: 'VIRTUAL_SMART_METER',
        secretKey: `key-${deviceUid.toLowerCase()}-2026`,
        simulatorStatus: 'RUNNING',
        status: 'ONLINE',
        lastSeenAt: new Date(),
        configuration: {
          meterModel: 'WattWise-Sim-v1',
          precision: 3,
          nominalVoltage: 230.0,
          roomCode: r.roomCode
        }
      },
      create: {
        deviceUid,
        roomId: room.id,
        deviceType: 'VIRTUAL_SMART_METER',
        secretKey: `key-${deviceUid.toLowerCase()}-2026`,
        simulatorStatus: 'RUNNING',
        status: 'ONLINE',
        lastSeenAt: new Date(),
        configuration: {
          meterModel: 'WattWise-Sim-v1',
          precision: 3,
          nominalVoltage: 230.0,
          roomCode: r.roomCode
        }
      }
    });
  }
  console.log(`✅ Seeded ${Object.keys(createdRoomsMap).length} rooms and corresponding virtual meters.`);

  // 5. Seed Users (Warden + Students)
  const salt = await bcrypt.genSalt(10);
  const wardenPasswordHash = await bcrypt.hash('WardenPass123!', salt);
  const studentPasswordHash = await bcrypt.hash('StudentPass123!', salt);

  const warden = await prisma.user.upsert({
    where: { email: 'warden@wattwise.local' },
    update: {
      name: 'Chief Warden Sharma',
      passwordHash: wardenPasswordHash,
      role: 'WARDEN',
      status: 'ACTIVE'
    },
    create: {
      name: 'Chief Warden Sharma',
      email: 'warden@wattwise.local',
      passwordHash: wardenPasswordHash,
      role: 'WARDEN',
      status: 'ACTIVE'
    }
  });
  console.log(`✅ Warden user ready: ${warden.email}`);

  // Seed primary demo student for Room G024
  const studentG024 = await prisma.user.upsert({
    where: { email: 'student.g024@wattwise.local' },
    update: {
      name: 'Aryan Patel (Student G024)',
      passwordHash: studentPasswordHash,
      role: 'STUDENT',
      status: 'ACTIVE'
    },
    create: {
      name: 'Aryan Patel (Student G024)',
      email: 'student.g024@wattwise.local',
      passwordHash: studentPasswordHash,
      role: 'STUDENT',
      status: 'ACTIVE'
    }
  });

  // Assign Student to G024
  const roomG024 = createdRoomsMap['G024'];
  if (roomG024) {
    const existingAssignment = await prisma.roomAssignment.findFirst({
      where: { userId: studentG024.id, roomId: roomG024.id, isActive: true }
    });
    if (!existingAssignment) {
      await prisma.roomAssignment.create({
        data: {
          userId: studentG024.id,
          roomId: roomG024.id,
          isActive: true
        }
      });
    }
  }
  console.log(`✅ Student user ready: ${studentG024.email} assigned to G024`);

  // Seed a second student for Room S210
  const studentS210 = await prisma.user.upsert({
    where: { email: 'student.s210@wattwise.local' },
    update: {
      name: 'Rohan Mehra (Student S210)',
      passwordHash: studentPasswordHash,
      role: 'STUDENT',
      status: 'ACTIVE'
    },
    create: {
      name: 'Rohan Mehra (Student S210)',
      email: 'student.s210@wattwise.local',
      passwordHash: studentPasswordHash,
      role: 'STUDENT',
      status: 'ACTIVE'
    }
  });
  const roomS210 = createdRoomsMap['S210'];
  if (roomS210) {
    const existingAssignment = await prisma.roomAssignment.findFirst({
      where: { userId: studentS210.id, roomId: roomS210.id, isActive: true }
    });
    if (!existingAssignment) {
      await prisma.roomAssignment.create({
        data: {
          userId: studentS210.id,
          roomId: roomS210.id,
          isActive: true
        }
      });
    }
  }

  // 6. Seed Electricity Tariff
  const tariff = await prisma.tariff.upsert({
    where: { id: 'default-hostel-tariff' },
    update: {
      name: 'Standard Hostel Tariff 2026',
      tariffType: 'SLAB',
      baseRatePerKWh: 7.50,
      fixedCharge: 50.0,
      slabConfig: [
        { minKWh: 0, maxKWh: 100, rate: 6.50 },
        { minKWh: 100, maxKWh: 300, rate: 7.50 },
        { minKWh: 300, maxKWh: 999999, rate: 9.00 }
      ],
      currency: 'INR',
      isActive: true,
      hostelId: hostel.id
    },
    create: {
      id: 'default-hostel-tariff',
      hostelId: hostel.id,
      name: 'Standard Hostel Tariff 2026',
      tariffType: 'SLAB',
      baseRatePerKWh: 7.50,
      fixedCharge: 50.0,
      slabConfig: [
        { minKWh: 0, maxKWh: 100, rate: 6.50 },
        { minKWh: 100, maxKWh: 300, rate: 7.50 },
        { minKWh: 300, maxKWh: 999999, rate: 9.00 }
      ],
      currency: 'INR',
      isActive: true
    }
  });
  console.log(`✅ Default tariff ready: ${tariff.name} (Base rate: ₹${tariff.baseRatePerKWh}/kWh)`);

  // 7. Seed Initial Budget for Hostel & Student
  const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  await prisma.budget.upsert({
    where: {
      scope_scopeId_billingPeriod: {
        scope: 'HOSTEL',
        scopeId: hostel.id,
        billingPeriod: currentMonth
      }
    },
    update: {
      budgetAmount: 150000.0,
      currency: 'INR'
    },
    create: {
      scope: 'HOSTEL',
      scopeId: hostel.id,
      billingPeriod: currentMonth,
      budgetAmount: 150000.0,
      currency: 'INR'
    }
  });

  if (roomG024) {
    await prisma.budget.upsert({
      where: {
        scope_scopeId_billingPeriod: {
          scope: 'ROOM',
          scopeId: roomG024.id,
          billingPeriod: currentMonth
        }
      },
      update: {
        budgetAmount: 1200.0,
        currency: 'INR'
      },
      create: {
        scope: 'ROOM',
        scopeId: roomG024.id,
        billingPeriod: currentMonth,
        budgetAmount: 1200.0,
        currency: 'INR'
      }
    });
  }

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
