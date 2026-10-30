// ============================================================
// Prisma Database Seed Script
// Run with: npx prisma db seed
// ============================================================
import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Seeding DandoEv database with rich Nigerian demo datasets...');

  // ---- 1. Create Admin Users ----
  const adminPasswordHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || require('crypto').randomBytes(18).toString('base64url'), 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@dandoev.com' },
    update: {},
    create: {
      email: 'admin@dandoev.com',
      firstName: 'Super',
      lastName: 'Admin',
      passwordHash: adminPasswordHash,
      role: 'super_admin',
      customerStatus: 'registered',
      isEmailVerified: true,
    },
  });
  console.log(`✅ Super Admin: ${superAdmin.email}`);

  const financeAdmin = await prisma.user.upsert({
    where: { email: 'finance@dandoev.com' },
    update: {},
    create: {
      email: 'finance@dandoev.com',
      firstName: 'Finance',
      lastName: 'Officer',
      passwordHash: adminPasswordHash,
      role: 'finance_admin',
      customerStatus: 'registered',
      isEmailVerified: true,
    },
  });
  console.log(`✅ Finance Admin: ${financeAdmin.email}`);

  const opsAdmin = await prisma.user.upsert({
    where: { email: 'ops@dandoev.com' },
    update: {},
    create: {
      email: 'ops@dandoev.com',
      firstName: 'Operations',
      lastName: 'Manager',
      passwordHash: adminPasswordHash,
      role: 'operations_admin',
      customerStatus: 'registered',
      isEmailVerified: true,
    },
  });
  console.log(`✅ Operations Admin: ${opsAdmin.email}`);

  // ---- 2. Seed Bikes ----
  const bikes = [
    {
      name: 'DandoEv G90 Flagship',
      brand: 'DandoEv',
      model: 'G90',
      description: 'Our flagship commercial urban commuter e-bike in Nigeria. Single 48V 20Ah swappable battery, 750W high-efficiency motor, rugged metal frame, 20x4 pneumatic tubeless puncture-resistant fat tyres, digital dashboard with NFC card unlock, anti-theft motion alerts, and Google Maps.',
      price: 1700000,
      images: ['/bikes/DandoEv_G90-removebg-preview.png'],
      category: 'Commuter',
      motorPower: 750,
      batteryCapacity: 20,
      rangeKm: 85,
      topSpeed: 45,
      weight: 41,
      chargingTime: 4,
      warranty: '1 Year Full Warranty',
      colors: ['Black'],
      availability: 'in_stock' as const,
      bnplEligible: true,
      bnplMinDownPayment: 0,
      stockQuantity: 15,
      rating: 4.9,
      reviewCount: 94,
      features: [
        'Digital dashboard / NFC card',
        'Anti-theft motion alerts',
        'Google Maps',
        'Pneumatic tubeless puncture resistant tyres (20*4)',
        'Electronic Hydraulic disc brakes',
        '7-speed gear',
        'Single 48V 20Ah Battery',
        'PAS Range: 115KM',
        'Max load: 240KG',
      ],
    },
    {
      name: 'DandoEv X5',
      brand: 'DandoEv',
      model: 'X5',
      description: 'Built for sports enthusiasts and high-torque delivery riders. Features 750W motor, single 48V 20Ah battery, 26x4 inch pneumatic tubeless puncture-resistant fat tyres, digital dashboard with NFC card, anti-theft motion alerts, and Google Maps.',
      price: 1550000,
      images: ['/bikes/DandoEv_X5-removebg-preview.png'],
      category: 'Sports',
      motorPower: 750,
      batteryCapacity: 20,
      rangeKm: 80,
      topSpeed: 40,
      weight: 40,
      chargingTime: 4,
      warranty: '1 Year Full Warranty',
      colors: ['Black'],
      availability: 'in_stock' as const,
      bnplEligible: true,
      bnplMinDownPayment: 0,
      stockQuantity: 10,
      rating: 4.8,
      reviewCount: 48,
      features: [
        'Digital dashboard / NFC card',
        'Anti-theft motion alerts',
        'Google Maps',
        'Pneumatic tubeless puncture resistant tyres (26*4)',
        'Hydraulic brake',
        'USB Charging Port',
        'Single 48V 20Ah Battery',
        '7-speed gear',
        'PAS Range: 105km',
      ],
    },
    {
      name: 'DandoEv X6',
      brand: 'DandoEv',
      model: 'X6',
      description: 'Powerhouse 29-inch wheel commuter and commercial cargo bike with 500W motor, single 48V 20Ah battery, 29-inch pneumatic tubeless puncture-resistant tyres, digital dashboard with NFC card, anti-theft motion alerts, and Google Maps.',
      price: 1500000,
      images: ['/bikes/DandoEV_X6-removebg-preview.png'],
      category: 'Sports',
      motorPower: 500,
      batteryCapacity: 20,
      rangeKm: 80,
      topSpeed: 40,
      weight: 42,
      chargingTime: 4,
      warranty: '1 Year Full Warranty',
      colors: ['Black'],
      availability: 'in_stock' as const,
      bnplEligible: true,
      bnplMinDownPayment: 0,
      stockQuantity: 12,
      rating: 4.7,
      reviewCount: 52,
      features: [
        'Digital dashboard / NFC card',
        'Anti-theft motion alerts',
        'Google Maps',
        'Pneumatic tubeless puncture resistant tyres (29 inch)',
        'Hydraulic brake',
        'Front Suspension Fork',
        'Single 48V 20Ah Battery',
        'USB Charging Port',
        'Max load: 150KG',
      ],
    },
    {
      name: 'DandoEv X4',
      brand: 'DandoEv',
      model: 'X4',
      description: 'Rugged 29-inch utility e-bike with 500W motor, single 48V 15Ah battery, digital dashboard with NFC card, anti-theft motion alerts, and Google Maps. Extra 48V 15Ah battery available for ₦350,000.',
      price: 1300000,
      images: ['/bikes/DandoEv_X4-removebg-preview.png'],
      category: 'Commuter',
      motorPower: 500,
      batteryCapacity: 15,
      rangeKm: 70,
      topSpeed: 38,
      weight: 38,
      chargingTime: 3.5,
      warranty: '1 Year Full Warranty',
      colors: ['Black'],
      availability: 'in_stock' as const,
      bnplEligible: true,
      bnplMinDownPayment: 0,
      stockQuantity: 10,
      rating: 4.7,
      reviewCount: 31,
      features: [
        'Digital dashboard / NFC card',
        'Anti-theft motion alerts',
        'Google Maps',
        '29 inch All-Terrain Tyre',
        'Front & Rear Disc Brakes',
        'Single 48V 15Ah Battery',
        'Optional Extra Battery (+₦350,000)',
        'USB Charging Port',
      ],
    },
    {
      name: 'DandoEv X5 Lite',
      brand: 'DandoEv',
      model: 'X5 Lite',
      description: 'Lightweight fat-tire e-bike designed for agile city commuting. 500W motor, single 48V 15Ah battery, 26x4 fat tyres, digital dashboard with NFC card, anti-theft motion alerts, and Google Maps. Extra battery available for ₦350,000.',
      price: 1350000,
      images: ['/bikes/DandoEv_X5_Lite-removebg-preview.png'],
      category: 'Sports',
      motorPower: 500,
      batteryCapacity: 15,
      rangeKm: 70,
      topSpeed: 38,
      weight: 36,
      chargingTime: 3.5,
      warranty: '1 Year Full Warranty',
      colors: ['Black'],
      availability: 'in_stock' as const,
      bnplEligible: true,
      bnplMinDownPayment: 0,
      stockQuantity: 14,
      rating: 4.8,
      reviewCount: 39,
      features: [
        'Digital dashboard / NFC card',
        'Anti-theft motion alerts',
        'Google Maps',
        '26*4 inch Fat Tyre',
        'Front & Rear Disc Brakes',
        'Single 48V 15Ah Battery',
        'Optional Extra Battery (+₦350,000)',
        'USB Charging Port',
      ],
    },
    {
      name: 'DandoEv X2',
      brand: 'DandoEv',
      model: 'X2',
      description: 'Accessible urban commuter e-bike featuring 350W motor, single 36V 15Ah battery, 26-inch tyres, digital dashboard with NFC card, anti-theft motion alerts, and Google Maps. Extra battery available for ₦250,000.',
      price: 850000,
      images: ['/bikes/DandoEv_X2-removebg-preview.png'],
      category: 'Commuter',
      motorPower: 350,
      batteryCapacity: 15,
      rangeKm: 60,
      topSpeed: 32,
      weight: 30,
      chargingTime: 3,
      warranty: '1 Year Full Warranty',
      colors: ['Black'],
      availability: 'in_stock' as const,
      bnplEligible: true,
      bnplMinDownPayment: 0,
      stockQuantity: 18,
      rating: 4.6,
      reviewCount: 22,
      features: [
        'Digital dashboard / NFC card',
        'Anti-theft motion alerts',
        'Google Maps',
        '26 inch Commuter Tyre',
        'Mechanical Disc Brakes',
        'Single 36V 15Ah Battery',
        'Optional Extra Battery (+₦250,000)',
        'USB Charging Port',
      ],
    },
  ];

  const createdBikes: Record<string, any> = {};
  for (const bike of bikes) {
    const created = await prisma.bike.upsert({
      where: { id: `seed-bike-${bike.model}` },
      update: { stockQuantity: bike.stockQuantity },
      create: {
        id: `seed-bike-${bike.model}`,
        ...bike,
        price: bike.price,
        weight: bike.weight,
        chargingTime: bike.chargingTime,
        rating: bike.rating,
      },
    });
    createdBikes[bike.model] = created;
    console.log(`✅ Bike: ${created.name}`);
  }

  // ---- 3. Seed System Configuration ----
  const configs = [
    { key: 'bnpl_interest_rate', value: '8' },
    { key: 'bnpl_processing_fee', value: '15000' },
    { key: 'bnpl_daily_savings', value: '1000' },
    { key: 'bnpl_health_insurance', value: '5000' },
    { key: 'bnpl_late_fee_percent', value: '5' },
    { key: 'bnpl_grace_period_days', value: '3' },
    { key: 'max_loan_amount', value: '2000000' },
    { key: 'delivery_fee_lagos', value: '10000' },
    { key: 'delivery_fee_other_states', value: '20000' },
    { key: 'maintenance_mode', value: 'false' },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    });
  }

  // ---- 4. Seed Accessories ----
  const accessories = [
    {
      name: '48V 20Ah Replacement Battery (G90, X5, X6)',
      description: 'Reliable 48V 20Ah Lithium-ion battery for DandoEv G90, X5, and X6.',
      price: 385000,
      images: ['/products/batteries/0a1ca434-12a4-4dd2-9df0-0f491053101b.jpg'],
      category: 'battery',
      stockQuantity: 50,
    },
    {
      name: '48V 15Ah Extra Battery Pack (X4, X5 Lite)',
      description: 'Extra 48V 15Ah Lithium-ion battery pack compatible with DandoEv X4 and X5 Lite.',
      price: 350000,
      images: ['/products/batteries/0a6fa4c4-99db-4149-9f4a-a0b7b83b698c.jpg'],
      category: 'battery',
      stockQuantity: 50,
    },
    {
      name: '36V 15Ah Extra Battery Pack (X2)',
      description: 'Extra 36V 15Ah Lithium-ion battery pack compatible with DandoEv X2.',
      price: 250000,
      images: ['/products/batteries/0a1ca434-12a4-4dd2-9df0-0f491053101b.jpg'],
      category: 'battery',
      stockQuantity: 50,
    },
    {
      name: 'Li-ion Charger Model: SJF-T25',
      description: 'Input: 100-240V 50/60 HZ | Output: 54.6V - 2A',
      price: 60000,
      images: ['/products/chargers/WhatsApp%20Image%202026-06-06%20at%2011.28.20.jpeg'],
      category: 'charger',
      stockQuantity: 100,
    },
    {
      name: 'Standard 42V - 2A Smart Charger',
      description: 'Input: 100-240V 50/60 HZ | Output: 42V - 2A for 36V packs',
      price: 45000,
      images: ['/products/chargers/WhatsApp%20Image%202026-06-06%20at%2011.28.20.jpeg'],
      category: 'charger',
      stockQuantity: 100,
    }
  ];

  for (const acc of accessories) {
    await prisma.accessory.upsert({
      where: { id: `seed-acc-${acc.category}-${acc.price}` },
      update: { stockQuantity: acc.stockQuantity },
      create: {
        id: `seed-acc-${acc.category}-${acc.price}`,
        ...acc,
      }
    });
  }

  // ---- 5. Seed Nigerian Customer Personas ----
  const customerPasswordHash = await bcrypt.hash('password123', 12);

  const demoCustomers = [
    {
      id: 'cust-solomon-dunu',
      email: 'solomon.dunu@demo.com',
      firstName: 'Solomon',
      lastName: 'Dunu',
      phone: '08099001122',
      address: '24 Sandstrip Oworoshoki',
      city: 'Lagos',
      state: 'Lagos',
      employmentStatus: 'Self Employed (Gig Rider)',
      monthlyIncome: 350000,
      employerName: 'Bolt Nigeria',
      customerStatus: 'active_bnpl' as const,
      kycStatus: 'verified' as const,
      monoStatus: 'linked',
    },
    {
      id: 'cust-babatunde-adeleke',
      email: 'babatunde.adeleke@demo.com',
      firstName: 'Babatunde',
      lastName: 'Adeleke',
      phone: '08023456789',
      address: '14 Allen Avenue, Ikeja',
      city: 'Ikeja',
      state: 'Lagos',
      employmentStatus: 'Employed (Dispatch Courier)',
      monthlyIncome: 420000,
      employerName: 'GIG Logistics',
      customerStatus: 'registered' as const,
      kycStatus: 'verified' as const,
      monoStatus: 'linked',
    },
    {
      id: 'cust-amina-bello',
      email: 'amina.bello@demo.com',
      firstName: 'Amina',
      lastName: 'Bello',
      phone: '08134567890',
      address: '88 Bompai Road, Kano Central',
      city: 'Kano',
      state: 'Kano',
      employmentStatus: 'Self Employed',
      monthlyIncome: 290000,
      employerName: 'Chowdeck Delivery',
      customerStatus: 'registered' as const,
      kycStatus: 'verified' as const,
      monoStatus: 'linked',
    },
    {
      id: 'cust-chinedu-eze',
      email: 'chinedu.eze@demo.com',
      firstName: 'Chinedu',
      lastName: 'Eze',
      phone: '08055667788',
      address: '42 Bodija Market Road',
      city: 'Ibadan',
      state: 'Oyo',
      employmentStatus: 'Logistics Rider',
      monthlyIncome: 240000,
      employerName: 'Freelance Express',
      customerStatus: 'active_bnpl' as const,
      kycStatus: 'verified' as const,
      monoStatus: 'linked',
    },
    {
      id: 'cust-fatima-yusuf',
      email: 'fatima.yusuf@demo.com',
      firstName: 'Fatima',
      lastName: 'Yusuf',
      phone: '08188990011',
      address: 'Plot 12 Adetokunbo Ademola Crescent',
      city: 'Wuse 2',
      state: 'Abuja (FCT)',
      employmentStatus: 'Office Commuter & Courier',
      monthlyIncome: 510000,
      employerName: 'Federal Ministry Staff',
      customerStatus: 'active_bnpl' as const,
      kycStatus: 'verified' as const,
      monoStatus: 'linked',
    },
    {
      id: 'cust-emeka-okafor',
      email: 'emeka.okafor@demo.com',
      firstName: 'Emeka',
      lastName: 'Okafor',
      phone: '08077889900',
      address: '15 Ogui Road',
      city: 'Enugu',
      state: 'Enugu',
      employmentStatus: 'Trader',
      monthlyIncome: 180000,
      employerName: 'Okafor Provisions',
      customerStatus: 'registered' as const,
      kycStatus: 'verified' as const,
      monoStatus: 'linked',
    }
  ];

  const seededUsers: Record<string, any> = {};
  for (const c of demoCustomers) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: {
        customerStatus: c.customerStatus,
        kycStatus: c.kycStatus,
        monoStatus: c.monoStatus,
      },
      create: {
        id: c.id,
        email: c.email,
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone,
        address: c.address,
        city: c.city,
        state: c.state,
        employmentStatus: c.employmentStatus,
        monthlyIncome: c.monthlyIncome,
        employerName: c.employerName,
        passwordHash: customerPasswordHash,
        role: 'customer',
        customerStatus: c.customerStatus,
        kycStatus: c.kycStatus,
        isEmailVerified: true,
        monoStatus: c.monoStatus,
      },
    });

    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        mainBalance: 0,
        lockedSaving: 0,
      },
    });

    seededUsers[c.email] = user;
    console.log(`✅ Demo Customer: ${user.firstName} ${user.lastName} (${user.email})`);
  }

  // ---- 6. Seed Diverse BNPL Loans ----
  // Loan 1: Babatunde Adeleke -> PENDING (Perfect for live demo approval!)
  const loanPending = await prisma.loan.upsert({
    where: { id: 'loan-demo-pending-001' },
    update: {},
    create: {
      id: 'loan-demo-pending-001',
      userId: seededUsers['babatunde.adeleke@demo.com'].id,
      bikeId: createdBikes['X5'].id,
      downPayment: 150000,
      loanAmount: 1350000,
      interestRate: 8,
      serviceFee: 20000,
      insuranceFee: 25000,
      deliveryType: 'pickup',
      deliveryFee: 0,
      deductionFrequency: 'weekly',
      tenure: 12,
      monthlyRepayment: 139500,
      totalRepayable: 1674000,
      status: 'pending',
      riskScore: 84,
      kycVerified: true,
      guarantorsVerified: true,
      deliveryState: 'Lagos',
      adminNotes: 'Application submitted via mobile. Mono statement shows healthy ₦420k monthly inflow.',
    },
  });

  await prisma.guarantor.upsert({
    where: { id: 'guar-demo-babatunde-01' },
    update: {},
    create: {
      id: 'guar-demo-babatunde-01',
      loanId: loanPending.id,
      applicantUserId: seededUsers['babatunde.adeleke@demo.com'].id,
      fullName: 'Ngozi Adeleke',
      email: 'ngozi.adeleke@gmail.com',
      phone: '08029988776',
      relationship: 'Sister (Business Owner)',
      status: 'accepted',
      acceptedAt: new Date(Date.now() - 86400000 * 2),
    },
  });

  // Loan 2: Amina Bello -> UNDER REVIEW
  const loanUnderReview = await prisma.loan.upsert({
    where: { id: 'loan-demo-review-002' },
    update: {},
    create: {
      id: 'loan-demo-review-002',
      userId: seededUsers['amina.bello@demo.com'].id,
      bikeId: createdBikes['G90'].id,
      downPayment: 200000,
      loanAmount: 1450000,
      interestRate: 8,
      serviceFee: 20000,
      insuranceFee: 25000,
      deliveryType: 'delivery',
      deliveryFee: 20000,
      deductionFrequency: 'monthly',
      tenure: 10,
      monthlyRepayment: 168200,
      totalRepayable: 1682000,
      status: 'under_review',
      riskScore: 76,
      kycVerified: true,
      guarantorsVerified: true,
      deliveryState: 'Kano',
      adminNotes: 'Underwriting verification in progress. Statement inflow confirmed.',
    },
  });

  await prisma.guarantor.upsert({
    where: { id: 'guar-demo-amina-01' },
    update: {},
    create: {
      id: 'guar-demo-amina-01',
      loanId: loanUnderReview.id,
      applicantUserId: seededUsers['amina.bello@demo.com'].id,
      fullName: 'Haruna Bello',
      email: 'haruna.bello@yahoo.com',
      phone: '08139988776',
      relationship: 'Brother (Kano Central Merchant)',
      status: 'accepted',
      acceptedAt: new Date(Date.now() - 86400000 * 1),
    },
  });

  // Loan 3: Fatima Yusuf -> ACTIVE (Hardware allocated & performing)
  const loanActiveFatima = await prisma.loan.upsert({
    where: { id: 'loan-demo-active-003' },
    update: {},
    create: {
      id: 'loan-demo-active-003',
      userId: seededUsers['fatima.yusuf@demo.com'].id,
      bikeId: createdBikes['X5'].id,
      downPayment: 250000,
      loanAmount: 1250000,
      interestRate: 8,
      serviceFee: 20000,
      insuranceFee: 25000,
      deliveryType: 'pickup',
      deliveryFee: 0,
      deductionFrequency: 'weekly',
      tenure: 12,
      monthlyRepayment: 129000,
      totalRepayable: 1548000,
      status: 'active',
      riskScore: 92,
      kycVerified: true,
      guarantorsVerified: true,
      bikeSerialNumber: 'SN-DE-2026-X5-0982',
      chassisNumber: 'FRAME-D78102',
      batteryNumber1: 'BAT-1-48V-991',
      batteryNumber2: 'BAT-2-48V-992',
      chargerNumber: 'CHG-SJF-8821',
      deliveryState: 'Abuja (FCT)',
      approvedBy: 'Operations Manager',
      approvedAt: new Date(Date.now() - 86400000 * 30),
      disbursedAt: new Date(Date.now() - 86400000 * 29),
      adminNotes: 'Fully approved and physical handover completed at Abuja Hub.',
    },
  });

  // Loan 4: Chinedu Eze -> DELINQUENT (Active with overdue payments for Collections demo!)
  const loanDelinquent = await prisma.loan.upsert({
    where: { id: 'loan-demo-delinquent-004' },
    update: {},
    create: {
      id: 'loan-demo-delinquent-004',
      userId: seededUsers['chinedu.eze@demo.com'].id,
      bikeId: createdBikes['X6'].id,
      downPayment: 140000,
      loanAmount: 1260000,
      interestRate: 8,
      serviceFee: 20000,
      insuranceFee: 25000,
      deliveryType: 'delivery',
      deliveryFee: 15000,
      deductionFrequency: 'weekly',
      tenure: 12,
      monthlyRepayment: 130200,
      totalRepayable: 1562400,
      status: 'active',
      riskScore: 68,
      kycVerified: true,
      guarantorsVerified: true,
      bikeSerialNumber: 'SN-DE-2026-X6-0412',
      chassisNumber: 'FRAME-C61099',
      batteryNumber1: 'BAT-1-48V-441',
      chargerNumber: 'CHG-SJF-3310',
      deliveryState: 'Oyo',
      approvedBy: 'Super Admin',
      approvedAt: new Date(Date.now() - 86400000 * 60),
      disbursedAt: new Date(Date.now() - 86400000 * 59),
      adminNotes: 'Missed 2 consecutive direct debit deductions. Automated reminder queued.',
    },
  });

  // Loan 5: Emeka Okafor -> REJECTED
  const loanRejected = await prisma.loan.upsert({
    where: { id: 'loan-demo-rejected-005' },
    update: {},
    create: {
      id: 'loan-demo-rejected-005',
      userId: seededUsers['emeka.okafor@demo.com'].id,
      bikeId: createdBikes['G90'].id,
      downPayment: 100000,
      loanAmount: 1550000,
      interestRate: 8,
      serviceFee: 20000,
      insuranceFee: 25000,
      deliveryType: 'pickup',
      deliveryFee: 0,
      deductionFrequency: 'monthly',
      tenure: 12,
      monthlyRepayment: 160000,
      totalRepayable: 1920000,
      status: 'rejected',
      riskScore: 48,
      kycVerified: true,
      guarantorsVerified: false,
      deliveryState: 'Enugu',
      rejectionReason: 'Inadequate bank turnover / High debt-to-income ratio',
      adminNotes: 'Monthly bank turnover of ₦180k does not comfortably cover ₦160k monthly commitment.',
    },
  });

  console.log(`✅ Seeded 5 Diverse Loans: Pending, Under Review, Active (Allocated), Delinquent, Rejected.`);

  // ---- 7. Seed Repayments ----
  const now = Date.now();
  const weekMs = 7 * 86400000;

  await prisma.repayment.upsert({
    where: { id: 'rep-fatima-01' },
    update: {},
    create: {
      id: 'rep-fatima-01',
      loanId: loanActiveFatima.id,
      userId: seededUsers['fatima.yusuf@demo.com'].id,
      installmentNumber: 1,
      amount: 32250,
      amountPaid: 32250,
      dueDate: new Date(now - weekMs * 3),
      paidDate: new Date(now - weekMs * 3),
      status: 'paid',
      paymentReference: 'PAY_FATIMA_001',
    },
  });

  await prisma.repayment.upsert({
    where: { id: 'rep-fatima-02' },
    update: {},
    create: {
      id: 'rep-fatima-02',
      loanId: loanActiveFatima.id,
      userId: seededUsers['fatima.yusuf@demo.com'].id,
      installmentNumber: 2,
      amount: 32250,
      amountPaid: 32250,
      dueDate: new Date(now - weekMs * 2),
      paidDate: new Date(now - weekMs * 2),
      status: 'paid',
      paymentReference: 'PAY_FATIMA_002',
    },
  });

  await prisma.repayment.upsert({
    where: { id: 'rep-fatima-03' },
    update: {},
    create: {
      id: 'rep-fatima-03',
      loanId: loanActiveFatima.id,
      userId: seededUsers['fatima.yusuf@demo.com'].id,
      installmentNumber: 3,
      amount: 32250,
      amountPaid: 32250,
      dueDate: new Date(now - weekMs * 1),
      paidDate: new Date(now - weekMs * 1),
      status: 'paid',
      paymentReference: 'PAY_FATIMA_003',
    },
  });

  await prisma.repayment.upsert({
    where: { id: 'rep-fatima-04' },
    update: {},
    create: {
      id: 'rep-fatima-04',
      loanId: loanActiveFatima.id,
      userId: seededUsers['fatima.yusuf@demo.com'].id,
      installmentNumber: 4,
      amount: 32250,
      amountPaid: 0,
      dueDate: new Date(now + weekMs * 1),
      status: 'upcoming',
    },
  });

  // Chinedu Eze: 2 overdue repayments for the Collections / Defaults tab!
  await prisma.repayment.upsert({
    where: { id: 'rep-chinedu-overdue-01' },
    update: {},
    create: {
      id: 'rep-chinedu-overdue-01',
      loanId: loanDelinquent.id,
      userId: seededUsers['chinedu.eze@demo.com'].id,
      installmentNumber: 4,
      amount: 32550,
      amountPaid: 0,
      dueDate: new Date(now - 86400000 * 14), // 14 days overdue
      status: 'overdue',
      retryCount: 2,
    },
  });

  await prisma.repayment.upsert({
    where: { id: 'rep-chinedu-overdue-02' },
    update: {},
    create: {
      id: 'rep-chinedu-overdue-02',
      loanId: loanDelinquent.id,
      userId: seededUsers['chinedu.eze@demo.com'].id,
      installmentNumber: 5,
      amount: 32550,
      amountPaid: 0,
      dueDate: new Date(now - 86400000 * 7), // 7 days overdue
      status: 'overdue',
      retryCount: 1,
    },
  });

  console.log(`✅ Seeded Repayment schedules with Paid, Upcoming, and Overdue installments.`);

  // ---- 8. Seed KYC Documents for Compliance Tab ----
  await prisma.kycDocument.upsert({
    where: { id: 'kyc-doc-babatunde-01' },
    update: {},
    create: {
      id: 'kyc-doc-babatunde-01',
      userId: seededUsers['babatunde.adeleke@demo.com'].id,
      loanId: loanPending.id,
      type: 'drivers_license',
      fileUrl: '/bikes/DandoEv_X5.jpg',
      verificationStatus: 'verified',
      verifiedBy: superAdmin.id,
      verifiedAt: new Date(),
    },
  });

  await prisma.kycDocument.upsert({
    where: { id: 'kyc-doc-amina-01' },
    update: {},
    create: {
      id: 'kyc-doc-amina-01',
      userId: seededUsers['amina.bello@demo.com'].id,
      loanId: loanUnderReview.id,
      type: 'national_id',
      fileUrl: '/bikes/DandoEv_G90-removebg-preview.png',
      verificationStatus: 'verified',
      verifiedBy: financeAdmin.id,
      verifiedAt: new Date(),
    },
  });

  // ---- 9. Seed Audit Logs for Activity Tab ----
  const logs = [
    {
      userId: superAdmin.id,
      action: 'loan_hardware_allocated',
      resource: 'loan',
      resourceId: loanActiveFatima.id,
      details: 'Assigned Bike Serial SN-DE-2026-X5-0982 and Battery pack.',
      createdAt: new Date(now - 86400000 * 2),
    },
    {
      userId: financeAdmin.id,
      action: 'underwriting_review_completed',
      resource: 'loan',
      resourceId: loanPending.id,
      details: 'Mono Open Banking statement verified. ₦420,000 monthly turnover confirmed.',
      createdAt: new Date(now - 86400000 * 1),
    },
    {
      userId: opsAdmin.id,
      action: 'direct_debit_retry_queued',
      resource: 'repayment',
      resourceId: 'rep-chinedu-overdue-01',
      details: 'Automated Mono Direct Debit mandate collection scheduled for overdue repayment.',
      createdAt: new Date(now - 3600000 * 4),
    },
  ];

  for (const log of logs) {
    await prisma.auditLog.create({
      data: log,
    });
  }
  console.log(`✅ Seeded Audit Logs for live Activity feed.`);

  console.log('\n✨ Database seeding completed successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 ADMIN ACCOUNTS (Use for Dashboard Presentation):');
  console.log('  Super Admin   : admin@dandoev.com');
  console.log('  Finance Admin : finance@dandoev.com');
  console.log('  Ops Admin     : ops@dandoev.com');
  console.log('────────────────────────────────────────────────────────');
  console.log('👤 DEMO BORROWERS:');
  console.log('  1. Babatunde Adeleke (babatunde.adeleke@demo.com) → PENDING (Demo Asset Allocation)');
  console.log('  2. Amina Bello      (amina.bello@demo.com)      → UNDER REVIEW (Demo Credit Drawer)');
  console.log('  3. Chinedu Eze       (chinedu.eze@demo.com)       → DELINQUENT (Demo Direct Debit Retry)');
  console.log('  4. Fatima Yusuf      (fatima.yusuf@demo.com)      → ACTIVE (With Hardware Serials)');
  console.log('  5. Solomon Dunu      (solomon.dunu@demo.com)      → ACTIVE CUSTOMER (password123)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
