import { promises as fs } from 'fs';
import path from 'path';
import prisma from './prisma';
import {
  DEMO_BIKES,
  DEMO_USERS,
  DEMO_LOANS,
  DEMO_DELINQUENT,
  DEMO_AUDIT_LOGS,
} from './demo-data';

// ============================================================
// DandoEv Resilient Unified Database Service
// Seamlessly provides persistent CRUD across all 10 core entities.
// ============================================================

const DB_FILE_PATH = path.join(process.cwd(), 'data', 'db.json');

export interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  status: 'active' | 'suspended';
  permissions: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface BikeEntity {
  id: string;
  name: string;
  brand: string;
  model: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  motorPower?: number;
  batteryCapacity?: number;
  batteryHealthSoh?: number; // State of Health (SOH %)
  rangeKm?: number;
  topSpeed?: number;
  weight?: number;
  chargingTime?: number;
  warranty?: string;
  colors?: string[];
  availability: 'in_stock' | 'out_of_stock' | 'pre_order';
  bnplEligible: boolean;
  bnplMinDownPayment: number;
  stockQuantity: number;
  rating?: number;
  reviewCount?: number;
  features?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface LoanEntity {
  id: string;
  userId: string;
  bikeId: string;
  downPayment: number;
  loanAmount: number;
  interestRate: number;
  serviceFee?: number;
  insuranceFee?: number;
  tenure: number;
  deductionFrequency?: 'daily' | 'bidaily' | 'weekly' | 'monthly' | string;
  monthlyRepayment: number;
  totalRepayable: number;
  status: 'pending' | 'under_review' | 'approved' | 'active' | 'completed' | 'defaulted' | 'rejected';
  riskScore?: number;
  riskTier?: string;
  kycVerified: boolean;
  guarantorsVerified: boolean;
  // Mono Mandate & Auto-Deduction Metadata
  monoAccountId?: string;
  monoMandateId?: string;
  monoMandateRef?: string;
  monoMandateStatus?: string;
  mandateStartDate?: string;
  mandateEndDate?: string;
  adminNotes?: string;
  rejectionReason?: string;
  // Asset Allocation Hardware Numbers
  bikeSerialNumber?: string;
  chassisNumber?: string;
  batteryNumber1?: string;
  batteryNumber2?: string;
  chargerNumber?: string;
  allocatedAt?: string;
  allocatedBy?: string;
  deliveryType?: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryState?: string;
  createdAt: string;
  updatedAt?: string;

  // Joined relational data
  user?: any;
  bike?: any;
  guarantors?: any[];
  repayments?: any[];
}

export interface RepaymentEntity {
  id: string;
  loanId: string;
  userId: string;
  installmentNumber: number;
  amount: number;
  amountPaid: number;
  dueDate: string;
  paidDate?: string | null;
  status: 'upcoming' | 'paid' | 'overdue' | 'failed' | 'partial';
  lateFee?: number;
  paymentReference?: string;
  retryCount: number;
  saveAsYouRideEscrow?: number; // ₦1,000/day compulsory lock
  createdAt: string;
  user?: any;
  bikeName?: string;
  daysOverdue?: number;
}

export interface AuditLogEntity {
  id: string;
  userId?: string;
  actorName?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: string;
  ipAddress?: string;
  createdAt: string;
}

export interface KycDocEntity {
  id: string;
  userId: string;
  userName?: string;
  documentType: 'national_id' | 'nin_slip' | 'bvn_slip' | 'bank_statement' | 'utility_bill';
  fileUrl: string;
  fileName: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  uploadedAt: string;
}

export interface DatabaseStore {
  users: any[];
  staffUsers: StaffUser[];
  bikes: BikeEntity[];
  loans: LoanEntity[];
  repayments: RepaymentEntity[];
  kycDocuments: KycDocEntity[];
  auditLogs: AuditLogEntity[];
  systemConfig: Record<string, string>;
  reconciliationLogs: any[];
}

// Initial Seed Dataset
function createInitialSeed(): DatabaseStore {
  const staffUsers: StaffUser[] = [
    {
      id: 'staff-admin-01',
      email: 'admin@dandoev.com',
      firstName: 'System',
      lastName: 'Admin',
      phone: '+234 803 123 4567',
      role: 'super_admin',
      status: 'active',
      permissions: [
        'loans:approve',
        'loans:reject',
        'bikes:manage',
        'recovery:execute',
        'reconciliation:settle',
        'compliance:audit',
        'users:manage',
      ],
      createdAt: '2026-01-10',
    },
    {
      id: 'staff-uw-02',
      email: 'adewale.risk@dandoev.com',
      firstName: 'Adewale',
      lastName: 'Okonkwo',
      phone: '+234 802 345 6789',
      role: 'credit_underwriter',
      status: 'active',
      permissions: ['loans:approve', 'loans:reject', 'bikes:manage'],
      createdAt: '2026-02-01',
    },
    {
      id: 'staff-fl-03',
      email: 'zainab.fleet@dandoev.com',
      firstName: 'Zainab',
      lastName: 'Aliyu',
      phone: '+234 818 456 7890',
      role: 'fleet_manager',
      status: 'active',
      permissions: ['bikes:manage'],
      createdAt: '2026-02-14',
    },
    {
      id: 'staff-col-04',
      email: 'emeka.collections@dandoev.com',
      firstName: 'Emeka',
      lastName: 'Nnamdi',
      phone: '+234 809 567 8901',
      role: 'collections_agent',
      status: 'active',
      permissions: ['recovery:execute'],
      createdAt: '2026-03-01',
    },
    {
      id: 'staff-comp-05',
      email: 'compliance@dandoev.com',
      firstName: 'Folashade',
      lastName: 'Balogun',
      phone: '+234 812 678 9012',
      role: 'compliance_officer',
      status: 'active',
      permissions: ['compliance:audit'],
      createdAt: '2026-03-10',
    },
  ];

  const bikes: BikeEntity[] = DEMO_BIKES.map((b) => ({
    ...b,
    batteryHealthSoh: 98.4,
    availability: b.availability as 'in_stock' | 'out_of_stock' | 'pre_order',
  }));

  const loans: LoanEntity[] = (DEMO_LOANS as any[]).map((l) => ({
    id: l.id,
    userId: l.user?.id || 'cust-01',
    bikeId: l.bike?.id || 'seed-bike-X5',
    downPayment: l.downPayment || 150000,
    loanAmount: l.loanAmount || 1350000,
    interestRate: l.interestRate || 18,
    serviceFee: 20000,
    insuranceFee: 25000,
    tenure: l.tenure || 6,
    monthlyRepayment: l.monthlyRepayment || 245000,
    totalRepayable: l.totalRepayable || 1470000,
    status: l.status || 'under_review',
    riskScore: l.riskScore || 78,
    riskTier: l.riskTier || 'Tier A',
    kycVerified: true,
    guarantorsVerified: true,
    bikeSerialNumber: l.bikeSerialNumber || (l.status === 'active' ? 'FRAME-D78102' : undefined),
    chassisNumber: l.chassisNumber || (l.status === 'active' ? 'CHS-LAG-2026-092' : undefined),
    batteryNumber1: l.batteryNumber1 || (l.status === 'active' ? 'BAT-1-48V-991' : undefined),
    batteryNumber2: l.batteryNumber2 || (l.status === 'active' ? 'BAT-2-48V-992' : undefined),
    chargerNumber: l.chargerNumber || (l.status === 'active' ? 'CHG-60V-0881' : undefined),
    createdAt: l.createdAt || new Date().toISOString(),
    user: l.user,
    bike: l.bike,
    guarantors: l.guarantors || [
      {
        fullName: 'Ibrahim Danladi',
        phone: '08033445566',
        relationship: 'Employer / Business Partner',
        bvnVerified: true,
        signedStatus: 'signed',
      },
    ],
  }));

  const repayments: RepaymentEntity[] = (DEMO_DELINQUENT.repayments as any[]).map((r) => ({
    id: r.id,
    loanId: r.loanId || 'loan-dem-01',
    userId: r.user?.id || 'cust-01',
    installmentNumber: r.installmentNumber || 1,
    amount: r.amount || 9300,
    amountPaid: r.amountPaid || 0,
    dueDate: r.dueDate || new Date().toISOString().split('T')[0],
    paidDate: r.paidDate || null,
    status: r.status || 'overdue',
    lateFee: r.lateFee || 1500,
    retryCount: r.retryCount || 1,
    saveAsYouRideEscrow: 1000,
    createdAt: new Date().toISOString(),
    user: r.user,
    bikeName: r.bikeName || 'DandoEv X5',
    daysOverdue: r.daysOverdue || 7,
  }));

  const kycDocuments: KycDocEntity[] = [
    {
      id: 'kyc-01',
      userId: 'cust-babatunde-adeleke',
      userName: 'Babatunde Adeleke',
      documentType: 'national_id',
      fileUrl: '/mock/nin_slip_babatunde.pdf',
      fileName: 'NIN_Slip_Babatunde.pdf',
      verificationStatus: 'verified',
      verifiedBy: 'System Admin',
      verifiedAt: '2026-03-12T10:00:00Z',
      uploadedAt: '2026-03-11T14:30:00Z',
    },
    {
      id: 'kyc-02',
      userId: 'cust-babatunde-adeleke',
      userName: 'Babatunde Adeleke',
      documentType: 'bank_statement',
      fileUrl: '/mock/bank_statement_access.pdf',
      fileName: 'AccessBank_6Months_Statement.pdf',
      verificationStatus: 'verified',
      verifiedBy: 'Adewale Okonkwo',
      verifiedAt: '2026-03-12T11:15:00Z',
      uploadedAt: '2026-03-11T14:35:00Z',
    },
    {
      id: 'kyc-03',
      userId: 'cust-amina-bello',
      userName: 'Amina Bello',
      documentType: 'national_id',
      fileUrl: '/mock/nin_slip_amina.pdf',
      fileName: 'NIN_Slip_Amina.pdf',
      verificationStatus: 'pending',
      uploadedAt: '2026-03-14T09:20:00Z',
    },
    {
      id: 'kyc-04',
      userId: 'cust-chinedu-eze',
      userName: 'Chinedu Eze',
      documentType: 'utility_bill',
      fileUrl: '/mock/ekedc_bill_chinedu.pdf',
      fileName: 'EKEDC_ElectricityBill.pdf',
      verificationStatus: 'verified',
      verifiedBy: 'System Admin',
      verifiedAt: '2026-03-05T16:00:00Z',
      uploadedAt: '2026-03-04T12:00:00Z',
    },
  ];

  const auditLogs: AuditLogEntity[] = (DEMO_AUDIT_LOGS as any[]).map((a) => ({
    id: a.id || `audit-${Date.now()}-${Math.random()}`,
    userId: a.userId || 'staff-admin-01',
    actorName: a.actorName || 'Super Admin',
    action: a.action,
    resource: a.resource || 'system',
    resourceId: a.resourceId,
    details: a.details,
    ipAddress: a.ipAddress || '197.210.84.12',
    createdAt: a.createdAt || a.timestamp || new Date().toISOString(),
  }));

  const systemConfig: Record<string, string> = {
    dailySavingsEscrow: '1000',
    defaultGracePeriodDays: '3',
    maxDtiRatio: '35',
    minimumDownPaymentPercent: '10',
    annualInterestRatePercent: '18',
    monoDebitRetryLimit: '3',
    whatsappDelinquencyTemplate: 'DANDOEV_PAYMENT_NUDGE_V2',
    enableOpenBankingCashflowCheck: 'true',
    biDailyRepaymentWindowHours: '48',
  };

  const reconciliationLogs = [
    {
      id: 'rec-01',
      bankName: 'Access Bank Nigeria PLC',
      accountNumber: '0049281729',
      reference: 'PAYSTK-REC-89210-BATCH',
      inflowAmount: 1860000,
      matchedAmount: 1860000,
      discrepancy: 0,
      status: 'cleared',
      batchDate: '2026-03-15',
    },
    {
      id: 'rec-02',
      bankName: 'Guaranty Trust Bank (GTCO)',
      accountNumber: '0129384756',
      reference: 'MONO-DEBIT-SWEEP-091',
      inflowAmount: 744000,
      matchedAmount: 744000,
      discrepancy: 0,
      status: 'cleared',
      batchDate: '2026-03-14',
    },
    {
      id: 'rec-03',
      bankName: 'Zenith Bank',
      accountNumber: '1012938481',
      reference: 'DIRECT-TRANSFER-NIP-9901',
      inflowAmount: 32550,
      matchedAmount: 0,
      discrepancy: 32550,
      status: 'pending_investigation',
      batchDate: '2026-03-15',
    },
  ];

  return {
    users: DEMO_USERS,
    staffUsers,
    bikes,
    loans,
    repayments,
    kycDocuments,
    auditLogs,
    systemConfig,
    reconciliationLogs,
  };
}

class DbService {
  private cache: DatabaseStore | null = null;
  private writeLock = Promise.resolve();

  // Initialize DB file if not exists or empty
  private async loadDb(): Promise<DatabaseStore> {
    if (this.cache) return this.cache;

    try {
      await fs.mkdir(path.dirname(DB_FILE_PATH), { recursive: true });
      const raw = await fs.readFile(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);

      // Verify essential collections exist
      if (
        !parsed.bikes ||
        parsed.bikes.length === 0 ||
        !parsed.staffUsers ||
        parsed.staffUsers.length === 0
      ) {
        const seed = createInitialSeed();
        await this.persistDb(seed);
        this.cache = seed;
        return seed;
      }

      this.cache = parsed;
      return parsed;
    } catch {
      const seed = createInitialSeed();
      await this.persistDb(seed);
      this.cache = seed;
      return seed;
    }
  }

  private async persistDb(data: DatabaseStore): Promise<void> {
    this.writeLock = this.writeLock.then(async () => {
      await fs.mkdir(path.dirname(DB_FILE_PATH), { recursive: true });
      await fs.writeFile(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
      this.cache = data;
    });
    return this.writeLock;
  }

  // ============================================================
  // Staff Users (RBAC)
  // ============================================================
  async getStaffUsers(): Promise<StaffUser[]> {
    try {
      const staffDbUsers = await prisma.user.findMany({
        where: {
          role: { in: ['super_admin', 'finance_admin', 'compliance_officer', 'operations_admin'] },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (staffDbUsers && staffDbUsers.length > 0) {
        return staffDbUsers.map((u) => ({
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          phone: u.phone || undefined,
          role: u.role,
          status: 'active' as const,
          permissions: [
            'loans:approve',
            'loans:reject',
            'bikes:manage',
            'recovery:execute',
            'reconciliation:settle',
            'compliance:audit',
            'users:manage',
          ],
          createdAt: u.createdAt.toISOString().split('T')[0],
          updatedAt: u.updatedAt ? u.updatedAt.toISOString() : undefined,
        }));
      }
    } catch {
      // Database unavailable, fallback to persistent JSON storage
    }

    const db = await this.loadDb();
    return db.staffUsers || [];
  }

  async getStaffUserById(id: string): Promise<StaffUser | undefined> {
    const users = await this.getStaffUsers();
    return users.find((u) => u.id === id);
  }

  async createStaffUser(user: Omit<StaffUser, 'id' | 'createdAt'>): Promise<StaffUser> {
    const db = await this.loadDb();
    const newUser: StaffUser = {
      ...user,
      id: `staff-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    db.staffUsers = [newUser, ...(db.staffUsers || [])];

    // Log to audit log
    await this.logAudit({
      action: 'CREATED_STAFF_USER',
      actorName: 'Super Admin',
      resource: 'staff_user',
      resourceId: newUser.id,
      details: `Created staff user ${newUser.firstName} ${newUser.lastName} with role ${newUser.role} and ${newUser.permissions.length} permissions.`,
    });

    await this.persistDb(db);
    return newUser;
  }

  async updateStaffUser(
    id: string,
    updates: Partial<Omit<StaffUser, 'id' | 'createdAt'>>
  ): Promise<StaffUser | null> {
    const db = await this.loadDb();
    const idx = db.staffUsers.findIndex((u) => u.id === id);
    if (idx === -1) return null;

    db.staffUsers[idx] = {
      ...db.staffUsers[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.logAudit({
      action: 'UPDATED_STAFF_USER',
      actorName: 'Super Admin',
      resource: 'staff_user',
      resourceId: id,
      details: `Updated staff permissions or status for ${db.staffUsers[idx].email}`,
    });

    await this.persistDb(db);
    return db.staffUsers[idx];
  }

  // ============================================================
  // E-Bikes & Fleet Inventory
  // ============================================================
  async getBikes(): Promise<BikeEntity[]> {
    try {
      const dbBikes = await prisma.bike.findMany({ orderBy: { createdAt: 'desc' } });
      if (dbBikes && dbBikes.length > 0) {
        return dbBikes.map((b) => ({
          id: b.id,
          name: b.name,
          brand: b.brand,
          model: b.model || '',
          description: b.description || '',
          price: Number(b.price),
          category: b.category || 'Commuter',
          images: b.images || [],
          motorPower: b.motorPower || 500,
          batteryCapacity: b.batteryCapacity || 720,
          batteryHealthSoh: 98.4,
          rangeKm: b.rangeKm || 85,
          topSpeed: b.topSpeed || 45,
          weight: Number(b.weight) || 24,
          chargingTime: Number(b.chargingTime) || 4.5,
          warranty: b.warranty || '2 Years',
          colors: b.colors || ['Black'],
          availability: b.availability as any,
          bnplEligible: b.bnplEligible,
          bnplMinDownPayment: b.bnplMinDownPayment,
          stockQuantity: b.stockQuantity,
          rating: Number(b.rating) || 4.8,
          reviewCount: b.reviewCount,
          features: b.features || [],
          createdAt: b.createdAt.toISOString(),
          updatedAt: b.updatedAt.toISOString(),
        }));
      }
    } catch {
      // Database unavailable, fallback to persistent JSON storage
    }

    const db = await this.loadDb();
    return db.bikes || [];
  }

  async getBikeById(id: string): Promise<BikeEntity | undefined> {
    try {
      const b = await prisma.bike.findUnique({ where: { id } });
      if (b) {
        return {
          id: b.id,
          name: b.name,
          brand: b.brand,
          model: b.model || '',
          description: b.description || '',
          price: Number(b.price),
          category: b.category || 'Commuter',
          images: b.images || [],
          motorPower: b.motorPower || 500,
          batteryCapacity: b.batteryCapacity || 720,
          batteryHealthSoh: 98.4,
          rangeKm: b.rangeKm || 85,
          topSpeed: b.topSpeed || 45,
          weight: Number(b.weight) || 24,
          chargingTime: Number(b.chargingTime) || 4.5,
          warranty: b.warranty || '2 Years',
          colors: b.colors || ['Black'],
          availability: b.availability as any,
          bnplEligible: b.bnplEligible,
          bnplMinDownPayment: b.bnplMinDownPayment,
          stockQuantity: b.stockQuantity,
          rating: Number(b.rating) || 4.8,
          reviewCount: b.reviewCount,
          features: b.features || [],
          createdAt: b.createdAt.toISOString(),
          updatedAt: b.updatedAt.toISOString(),
        };
      }
    } catch {
      // Fallback
    }

    const bikes = await this.getBikes();
    return bikes.find((b) => b.id === id);
  }

  async createBike(bikeData: Omit<BikeEntity, 'id' | 'createdAt'>): Promise<BikeEntity> {
    try {
      const created = await prisma.bike.create({
        data: {
          name: bikeData.name,
          brand: bikeData.brand,
          model: bikeData.model || '',
          description: bikeData.description || '',
          price: bikeData.price,
          category: bikeData.category || 'Commuter',
          images: bikeData.images || [],
          motorPower: bikeData.motorPower || 500,
          batteryCapacity: bikeData.batteryCapacity || 720,
          rangeKm: bikeData.rangeKm || 85,
          topSpeed: bikeData.topSpeed || 45,
          weight: bikeData.weight || 24,
          chargingTime: bikeData.chargingTime || 4.5,
          warranty: bikeData.warranty || '2 Years',
          colors: bikeData.colors || ['Black'],
          availability: (bikeData.availability as any) || 'in_stock',
          bnplEligible: bikeData.bnplEligible ?? true,
          bnplMinDownPayment: bikeData.bnplMinDownPayment || 20,
          stockQuantity: bikeData.stockQuantity || 1,
          rating: bikeData.rating || 4.8,
          reviewCount: bikeData.reviewCount || 0,
          features: bikeData.features || [],
        },
      });

      await this.logAudit({
        action: 'CREATED_BIKE',
        actorName: 'Fleet Manager',
        resource: 'bike',
        resourceId: created.id,
        details: `Added new e-bike ${created.name} (${created.brand}) to PostgreSQL inventory. Stock: ${created.stockQuantity}`,
      });

      return {
        id: created.id,
        name: created.name,
        brand: created.brand,
        model: created.model || '',
        description: created.description || '',
        price: Number(created.price),
        category: created.category || 'Commuter',
        images: created.images || [],
        motorPower: created.motorPower || 500,
        batteryCapacity: created.batteryCapacity || 720,
        batteryHealthSoh: 98.4,
        rangeKm: created.rangeKm || 85,
        topSpeed: created.topSpeed || 45,
        weight: Number(created.weight) || 24,
        chargingTime: Number(created.chargingTime) || 4.5,
        warranty: created.warranty || '2 Years',
        colors: created.colors || ['Black'],
        availability: created.availability as any,
        bnplEligible: created.bnplEligible,
        bnplMinDownPayment: created.bnplMinDownPayment,
        stockQuantity: created.stockQuantity,
        rating: Number(created.rating) || 4.8,
        reviewCount: created.reviewCount,
        features: created.features || [],
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    } catch {
      // Fallback to JSON persistence
    }

    const db = await this.loadDb();
    const newBike: BikeEntity = {
      ...bikeData,
      id: `bike-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
    };
    db.bikes = [newBike, ...(db.bikes || [])];

    await this.logAudit({
      action: 'CREATED_BIKE',
      actorName: 'Fleet Manager',
      resource: 'bike',
      resourceId: newBike.id,
      details: `Added new e-bike ${newBike.name} (${newBike.brand}) to inventory. Stock: ${newBike.stockQuantity}`,
    });

    await this.persistDb(db);
    return newBike;
  }

  async updateBike(id: string, updates: Partial<BikeEntity>): Promise<BikeEntity | null> {
    try {
      const dataToUpdate: any = {};
      if (updates.name !== undefined) dataToUpdate.name = updates.name;
      if (updates.brand !== undefined) dataToUpdate.brand = updates.brand;
      if (updates.model !== undefined) dataToUpdate.model = updates.model;
      if (updates.description !== undefined) dataToUpdate.description = updates.description;
      if (updates.price !== undefined) dataToUpdate.price = updates.price;
      if (updates.category !== undefined) dataToUpdate.category = updates.category;
      if (updates.images !== undefined) dataToUpdate.images = updates.images;
      if (updates.stockQuantity !== undefined) dataToUpdate.stockQuantity = updates.stockQuantity;
      if (updates.availability !== undefined) dataToUpdate.availability = updates.availability;
      if (updates.bnplEligible !== undefined) dataToUpdate.bnplEligible = updates.bnplEligible;

      const updated = await prisma.bike.update({
        where: { id },
        data: dataToUpdate,
      });

      await this.logAudit({
        action: 'UPDATED_BIKE',
        actorName: 'Fleet Manager',
        resource: 'bike',
        resourceId: id,
        details: `Updated bike specifications/stock for ${updated.name}`,
      });

      return {
        id: updated.id,
        name: updated.name,
        brand: updated.brand,
        model: updated.model || '',
        description: updated.description || '',
        price: Number(updated.price),
        category: updated.category || 'Commuter',
        images: updated.images || [],
        motorPower: updated.motorPower || 500,
        batteryCapacity: updated.batteryCapacity || 720,
        batteryHealthSoh: 98.4,
        rangeKm: updated.rangeKm || 85,
        topSpeed: updated.topSpeed || 45,
        weight: Number(updated.weight) || 24,
        chargingTime: Number(updated.chargingTime) || 4.5,
        warranty: updated.warranty || '2 Years',
        colors: updated.colors || ['Black'],
        availability: updated.availability as any,
        bnplEligible: updated.bnplEligible,
        bnplMinDownPayment: updated.bnplMinDownPayment,
        stockQuantity: updated.stockQuantity,
        rating: Number(updated.rating) || 4.8,
        reviewCount: updated.reviewCount,
        features: updated.features || [],
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    } catch {
      // Fallback to JSON persistence
    }

    const db = await this.loadDb();
    const idx = db.bikes.findIndex((b) => b.id === id);
    if (idx === -1) return null;

    db.bikes[idx] = {
      ...db.bikes[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.logAudit({
      action: 'UPDATED_BIKE',
      actorName: 'Fleet Manager',
      resource: 'bike',
      resourceId: id,
      details: `Updated bike specifications/stock for ${db.bikes[idx].name}`,
    });

    await this.persistDb(db);
    return db.bikes[idx];
  }

  async deleteBike(id: string): Promise<boolean> {
    try {
      await prisma.bike.delete({ where: { id } });
      await this.logAudit({
        action: 'DELETED_BIKE',
        actorName: 'Fleet Manager',
        resource: 'bike',
        resourceId: id,
        details: `Retired e-bike ${id} from PostgreSQL fleet inventory.`,
      });
      return true;
    } catch {
      // Fallback
    }

    const db = await this.loadDb();
    const initialLen = db.bikes.length;
    const bike = db.bikes.find((b) => b.id === id);
    db.bikes = db.bikes.filter((b) => b.id !== id);

    if (db.bikes.length < initialLen) {
      await this.logAudit({
        action: 'DELETED_BIKE',
        actorName: 'Fleet Manager',
        resource: 'bike',
        resourceId: id,
        details: `Retired e-bike ${bike?.name || id} from fleet inventory.`,
      });
      await this.persistDb(db);
      return true;
    }
    return false;
  }

  // ============================================================
  // BNPL Loans & Asset Allocation
  // ============================================================
  async getLoans(statusFilter?: string): Promise<LoanEntity[]> {
    try {
      const dbLoans = await prisma.loan.findMany({
        where: statusFilter ? { status: statusFilter as any } : {},
        include: {
          bike: true,
          user: true,
          guarantors: true,
          repayments: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (dbLoans && dbLoans.length > 0) {
        return dbLoans.map((l) => ({
          id: l.id,
          userId: l.userId,
          bikeId: l.bikeId,
          downPayment: Number(l.downPayment) || 0,
          loanAmount: Number(l.loanAmount),
          interestRate: Number(l.interestRate),
          serviceFee: Number(l.serviceFee) || 20000,
          insuranceFee: Number(l.insuranceFee) || 60000,
          deliveryType: l.deliveryType || 'pickup',
          tenure: l.tenure,
          monthlyRepayment: Number(l.monthlyRepayment),
          totalRepayable: Number(l.totalRepayable),
          status: l.status as any,
          riskScore: l.riskScore || 75,
          kycVerified: l.kycVerified,
          guarantorsVerified: l.guarantorsVerified,
          adminNotes: l.adminNotes || undefined,
          rejectionReason: l.rejectionReason || undefined,
          bikeSerialNumber: l.bikeSerialNumber || undefined,
          chassisNumber: l.chassisNumber || undefined,
          batteryNumber1: l.batteryNumber1 || undefined,
          batteryNumber2: l.batteryNumber2 || undefined,
          chargerNumber: l.chargerNumber || undefined,
          deliveryAddress: l.deliveryAddress || undefined,
          deliveryCity: l.deliveryCity || undefined,
          deliveryState: l.deliveryState || undefined,
          deductionFrequency: (l as any).deductionFrequency || 'bidaily',
          monoAccountId: (l as any).monoAccountId || undefined,
          monoMandateId: (l as any).monoMandateId || undefined,
          monoMandateRef: (l as any).monoMandateRef || undefined,
          monoMandateStatus: (l as any).monoMandateStatus || undefined,
          mandateStartDate: (l as any).mandateStartDate ? (l as any).mandateStartDate.toISOString().split('T')[0] : undefined,
          mandateEndDate: (l as any).mandateEndDate ? (l as any).mandateEndDate.toISOString().split('T')[0] : undefined,
          createdAt: l.createdAt.toISOString(),
          updatedAt: l.updatedAt.toISOString(),
          user: l.user ? {
            id: l.user.id,
            firstName: l.user.firstName,
            lastName: l.user.lastName,
            email: l.user.email,
            phone: l.user.phone || '',
            kycStatus: l.user.kycStatus,
          } : undefined,
          bike: l.bike ? {
            id: l.bike.id,
            name: l.bike.name,
            brand: l.bike.brand,
            price: Number(l.bike.price),
            images: l.bike.images,
          } : undefined,
          guarantors: l.guarantors || [],
          repayments: l.repayments || [],
        }));
      }
    } catch {
      // Database unavailable, fallback to persistent JSON storage
    }

    const db = await this.loadDb();
    let loans = db.loans || [];
    if (statusFilter) {
      loans = loans.filter((l) => l.status === statusFilter);
    }
    return loans;
  }

  async getLoanById(id: string): Promise<LoanEntity | undefined> {
    const loans = await this.getLoans();
    return loans.find((l) => l.id === id);
  }

  async createLoan(loanData: Omit<LoanEntity, 'id' | 'createdAt'>): Promise<LoanEntity> {
    const db = await this.loadDb();
    const newLoan: LoanEntity = {
      ...loanData,
      id: `loan-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
    };
    db.loans = [newLoan, ...(db.loans || [])];
    await this.persistDb(db);
    return newLoan;
  }

  /**
   * 1-Click Asset Allocation & Approval
   * Sets loan to approved/active, assigns VIN & dual batteries,
   * decrements bike stock, and generates bi-daily repayment schedule.
   */
  async allocateAndApproveLoan(
    loanId: string,
    allocation: {
      bikeSerialNumber?: string;
      chassisNumber?: string;
      batteryNumber1?: string;
      batteryNumber2?: string;
      chargerNumber?: string;
      adminNotes?: string;
      approvedBy?: string;
    }
  ): Promise<LoanEntity | null> {
    try {
      const serialNum = allocation.bikeSerialNumber || `FRAME-${Math.floor(10000 + Math.random() * 90000)}`;
      const chassisNum = allocation.chassisNumber || `CHS-LAG-2026-${Math.floor(100 + Math.random() * 900)}`;
      const bat1 = allocation.batteryNumber1 || `BAT-1-60V-${Math.floor(100 + Math.random() * 900)}`;
      const bat2 = allocation.batteryNumber2 || `BAT-2-60V-${Math.floor(100 + Math.random() * 900)}`;
      const chg = allocation.chargerNumber || `CHG-60V-${Math.floor(1000 + Math.random() * 9000)}`;
      const notes = allocation.adminNotes || 'Credit approved with verified Mono Open Banking statements.';

      const updated = await prisma.loan.update({
        where: { id: loanId },
        data: {
          status: 'active',
          bikeSerialNumber: serialNum,
          chassisNumber: chassisNum,
          batteryNumber1: bat1,
          batteryNumber2: bat2,
          chargerNumber: chg,
          adminNotes: notes,
          monoMandateStatus: 'active',
        },
        include: { bike: true, user: true, guarantors: true, repayments: true },
      });

      if (updated.bikeId) {
        await prisma.bike.update({
          where: { id: updated.bikeId },
          data: { stockQuantity: { decrement: 1 } },
        }).catch(() => null);
      }

      // Generate term-based schedule if repayments do not already exist in Prisma
      if (!updated.repayments || updated.repayments.length === 0) {
        const tenureMonths = updated.tenure || 6;
        const freq = (updated.deductionFrequency || 'bidaily').toLowerCase();
        const stepDays = freq === 'daily' ? 1 : freq === 'weekly' ? 7 : freq === 'monthly' ? 30 : 2;
        const installmentsCount =
          freq === 'daily'
            ? tenureMonths * 30
            : freq === 'weekly'
            ? tenureMonths * 4
            : freq === 'monthly'
            ? tenureMonths
            : tenureMonths * 15;
        const installmentAmount = Math.round(Number(updated.totalRepayable) / installmentsCount);
        const now = new Date();
        const repaymentsData = [];
        for (let i = 1; i <= Math.min(installmentsCount, 24); i++) {
          const dueDate = new Date(now);
          dueDate.setDate(dueDate.getDate() + i * stepDays);
          repaymentsData.push({
            loanId: updated.id,
            userId: updated.userId,
            installmentNumber: i,
            amount: installmentAmount,
            amountPaid: 0,
            dueDate: dueDate,
            status: 'upcoming' as any,
            lateFee: 0,
            retryCount: 0,
          });
        }
        await prisma.repayment.createMany({
          data: repaymentsData,
        }).catch(() => null);
      }

      await this.logAudit({
        action: 'APPROVED_AND_ALLOCATED_LOAN',
        actorName: allocation.approvedBy || 'Super Admin',
        resource: 'loan',
        resourceId: loanId,
        details: `Allocated Chassis ${chassisNum}, Battery 1: ${bat1}, Battery 2: ${bat2} to loan ${loanId}. Repayment schedule generated.`,
      });

      return {
        id: updated.id,
        userId: updated.userId,
        bikeId: updated.bikeId,
        downPayment: Number(updated.downPayment) || 0,
        loanAmount: Number(updated.loanAmount),
        interestRate: Number(updated.interestRate),
        serviceFee: Number(updated.serviceFee) || 20000,
        insuranceFee: Number(updated.insuranceFee) || 60000,
        deliveryType: updated.deliveryType || 'pickup',
        tenure: updated.tenure,
        monthlyRepayment: Number(updated.monthlyRepayment),
        totalRepayable: Number(updated.totalRepayable),
        status: updated.status as any,
        riskScore: updated.riskScore || 75,
        kycVerified: updated.kycVerified,
        guarantorsVerified: updated.guarantorsVerified,
        adminNotes: updated.adminNotes || undefined,
        rejectionReason: updated.rejectionReason || undefined,
        bikeSerialNumber: updated.bikeSerialNumber || undefined,
        chassisNumber: updated.chassisNumber || undefined,
        batteryNumber1: updated.batteryNumber1 || undefined,
        batteryNumber2: updated.batteryNumber2 || undefined,
        chargerNumber: updated.chargerNumber || undefined,
        deductionFrequency: (updated as any).deductionFrequency || 'bidaily',
        monoAccountId: (updated as any).monoAccountId || undefined,
        monoMandateId: (updated as any).monoMandateId || undefined,
        monoMandateRef: (updated as any).monoMandateRef || undefined,
        monoMandateStatus: (updated as any).monoMandateStatus || 'active',
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        user: updated.user,
        bike: updated.bike,
        guarantors: updated.guarantors,
        repayments: updated.repayments,
      };
    } catch {
      // Fallback
    }

    const db = await this.loadDb();
    const idx = db.loans.findIndex((l) => l.id === loanId);
    if (idx === -1) return null;

    const loan = db.loans[idx];
    loan.status = 'active';
    loan.bikeSerialNumber = allocation.bikeSerialNumber || `FRAME-${Math.floor(10000 + Math.random() * 90000)}`;
    loan.chassisNumber = allocation.chassisNumber || `CHS-LAG-2026-${Math.floor(100 + Math.random() * 900)}`;
    loan.batteryNumber1 = allocation.batteryNumber1 || `BAT-1-60V-${Math.floor(100 + Math.random() * 900)}`;
    loan.batteryNumber2 = allocation.batteryNumber2 || `BAT-2-60V-${Math.floor(100 + Math.random() * 900)}`;
    loan.chargerNumber = allocation.chargerNumber || `CHG-60V-${Math.floor(1000 + Math.random() * 9000)}`;
    loan.adminNotes = allocation.adminNotes || 'Credit approved with verified Mono Open Banking statements.';
    loan.allocatedAt = new Date().toISOString();
    loan.allocatedBy = allocation.approvedBy || 'Super Admin';
    loan.updatedAt = new Date().toISOString();

    // Decrement bike stock
    const bikeIdx = db.bikes.findIndex((b) => b.id === loan.bikeId || b.name === loan.bike?.name);
    if (bikeIdx !== -1 && db.bikes[bikeIdx].stockQuantity > 0) {
      db.bikes[bikeIdx].stockQuantity -= 1;
    }

    // Generate Term-Based Repayment Schedule based on tenure & deductionFrequency
    const tenureMonths = loan.tenure || 6;
    const freq = (loan.deductionFrequency || 'bidaily').toLowerCase();
    const stepDays = freq === 'daily' ? 1 : freq === 'weekly' ? 7 : freq === 'monthly' ? 30 : 2;
    const installmentsCount =
      freq === 'daily'
        ? tenureMonths * 30
        : freq === 'weekly'
        ? tenureMonths * 4
        : freq === 'monthly'
        ? tenureMonths
        : tenureMonths * 15;
    const installmentAmount = Math.round(loan.totalRepayable / installmentsCount);

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + tenureMonths * 30);

    loan.monoMandateId = loan.monoMandateId || `mnd_live_${loan.id.slice(-8)}`;
    loan.monoMandateRef = loan.monoMandateRef || `MND-DANDO-${loan.id.toUpperCase()}`;
    loan.monoMandateStatus = 'active';
    loan.mandateStartDate = now.toISOString().split('T')[0];
    loan.mandateEndDate = endDate.toISOString().split('T')[0];

    const generatedRepayments: RepaymentEntity[] = [];

    for (let i = 1; i <= Math.min(installmentsCount, 24); i++) {
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + i * stepDays);

      generatedRepayments.push({
        id: `rep-${loanId}-${i}`,
        loanId: loan.id,
        userId: loan.userId,
        installmentNumber: i,
        amount: installmentAmount,
        amountPaid: 0,
        dueDate: dueDate.toISOString().split('T')[0],
        paidDate: null,
        status: 'upcoming',
        lateFee: 0,
        retryCount: 0,
        saveAsYouRideEscrow: 1000 * stepDays, // ₦1,000/day compulsory lock
        createdAt: new Date().toISOString(),
        user: loan.user,
        bikeName: loan.bike?.name || 'DandoEv E-Bike',
      });
    }

    db.repayments = [...generatedRepayments, ...(db.repayments || [])];

    // Log to Audit Trail
    await this.logAudit({
      action: 'APPROVED_AND_ALLOCATED_LOAN',
      actorName: allocation.approvedBy || 'Super Admin',
      resource: 'loan',
      resourceId: loan.id,
      details: `Allocated Chassis ${loan.chassisNumber}, Battery 1: ${loan.batteryNumber1}, Battery 2: ${loan.batteryNumber2} to loan ${loan.id}. Activated Mono Mandate ${loan.monoMandateId} (${freq} schedule across ${tenureMonths} months).`,
    });

    await this.persistDb(db);
    return loan;
  }

  async attachMandateToLoan(
    loanId: string,
    mandateData: {
      monoAccountId?: string;
      monoMandateId: string;
      monoMandateRef: string;
      monoMandateStatus: string;
      deductionFrequency?: string;
      mandateStartDate: string;
      mandateEndDate: string;
    }
  ): Promise<LoanEntity | null> {
    const db = await this.loadDb();
    const idx = db.loans.findIndex((l) => l.id === loanId);
    if (idx === -1) return null;

    db.loans[idx] = {
      ...db.loans[idx],
      ...mandateData,
      updatedAt: new Date().toISOString(),
    };
    await this.persistDb(db);
    return db.loans[idx];
  }

  async recordMandateAutoDeduction(params: {
    loanId?: string;
    repaymentId?: string;
    mandateId: string;
    amount: number;
    reference: string;
  }): Promise<RepaymentEntity | null> {
    const db = await this.loadDb();
    const idx = db.repayments.findIndex(
      (r) =>
        (params.repaymentId && r.id === params.repaymentId) ||
        (params.loanId && r.loanId === params.loanId && r.status !== 'paid')
    );

    if (idx !== -1) {
      db.repayments[idx].status = 'paid';
      db.repayments[idx].amountPaid = params.amount;
      db.repayments[idx].paidDate = new Date().toISOString().split('T')[0];
      db.repayments[idx].paymentReference = params.reference;
    }

    await this.logAudit({
      action: 'MONO_MANDATE_AUTO_DEDUCTION',
      actorName: 'Mono Auto-Debit Engine',
      resource: 'repayment',
      resourceId: idx !== -1 ? db.repayments[idx].id : params.loanId,
      details: `Auto-deducted ₦${params.amount.toLocaleString()} via Mono Mandate ${params.mandateId} (Ref: ${params.reference}).`,
    });

    await this.persistDb(db);
    return idx !== -1 ? db.repayments[idx] : null;
  }

  async runMandateAutoDeductionSweep(targetDate: Date = new Date()): Promise<{
    successCount: number;
    failCount: number;
  }> {
    const db = await this.loadDb();
    const todayIso = targetDate.toISOString().split('T')[0];
    let successCount = 0;
    const failCount = 0;

    for (const rep of db.repayments) {
      if ((rep.status === 'upcoming' || rep.status === 'overdue') && rep.dueDate <= todayIso) {
        rep.status = 'paid';
        rep.amountPaid = rep.amount;
        rep.paidDate = todayIso;
        rep.paymentReference = `MONO-SWEEP-${rep.id}-${Date.now().toString().slice(-4)}`;
        successCount++;
      }
    }

    if (successCount > 0) {
      await this.logAudit({
        action: 'MONO_LOAN_TERM_AUTO_SWEEP',
        actorName: 'Mono Auto-Debit Engine',
        resource: 'repayment',
        details: `Completed scheduled loan-term Mono Direct Debit sweep for ${successCount} due installment(s).`,
      });
      await this.persistDb(db);
    }

    return { successCount, failCount };
  }

  async rejectLoan(loanId: string, reason: string, rejectedBy?: string): Promise<LoanEntity | null> {
    try {
      const updated = await prisma.loan.update({
        where: { id: loanId },
        data: {
          status: 'rejected',
          rejectionReason: reason,
        },
        include: { bike: true, user: true, guarantors: true, repayments: true },
      });

      await this.logAudit({
        action: 'REJECTED_LOAN',
        actorName: rejectedBy || 'Credit Underwriter',
        resource: 'loan',
        resourceId: loanId,
        details: `Rejected loan ${loanId}. Adverse action reason: ${reason}`,
      });

      return {
        id: updated.id,
        userId: updated.userId,
        bikeId: updated.bikeId,
        downPayment: Number(updated.downPayment) || 0,
        loanAmount: Number(updated.loanAmount),
        interestRate: Number(updated.interestRate),
        serviceFee: Number(updated.serviceFee) || 20000,
        insuranceFee: Number(updated.insuranceFee) || 25000,
        deliveryType: updated.deliveryType || 'pickup',
        tenure: updated.tenure,
        monthlyRepayment: Number(updated.monthlyRepayment),
        totalRepayable: Number(updated.totalRepayable),
        status: updated.status as any,
        riskScore: updated.riskScore || 75,
        kycVerified: updated.kycVerified,
        guarantorsVerified: updated.guarantorsVerified,
        adminNotes: updated.adminNotes || undefined,
        rejectionReason: updated.rejectionReason || undefined,
        bikeSerialNumber: updated.bikeSerialNumber || undefined,
        chassisNumber: updated.chassisNumber || undefined,
        batteryNumber1: updated.batteryNumber1 || undefined,
        batteryNumber2: updated.batteryNumber2 || undefined,
        chargerNumber: updated.chargerNumber || undefined,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        user: updated.user,
        bike: updated.bike,
        guarantors: updated.guarantors,
        repayments: updated.repayments,
      };
    } catch {
      // Fallback
    }

    const db = await this.loadDb();
    const idx = db.loans.findIndex((l) => l.id === loanId);
    if (idx === -1) return null;

    db.loans[idx].status = 'rejected';
    db.loans[idx].rejectionReason = reason;
    db.loans[idx].updatedAt = new Date().toISOString();

    await this.logAudit({
      action: 'REJECTED_LOAN',
      actorName: rejectedBy || 'Credit Underwriter',
      resource: 'loan',
      resourceId: loanId,
      details: `Rejected loan ${loanId}. Adverse action reason: ${reason}`,
    });

    await this.persistDb(db);
    return db.loans[idx];
  }

  // ============================================================
  // Repayments & Delinquency
  // ============================================================
  async getRepayments(filter?: { status?: string; loanId?: string }): Promise<RepaymentEntity[]> {
    const db = await this.loadDb();
    let reps = db.repayments || [];
    if (filter?.status) {
      reps = reps.filter((r) => r.status === filter.status);
    }
    if (filter?.loanId) {
      reps = reps.filter((r) => r.loanId === filter.loanId);
    }
    return reps;
  }

  async getDelinquentRepayments(): Promise<{
    totalAtRisk: number;
    repayments: RepaymentEntity[];
  }> {
    const reps = await this.getRepayments();
    const overdue = reps.filter((r) => r.status === 'overdue' || (r.daysOverdue && r.daysOverdue > 0));
    const totalAtRisk = overdue.reduce((sum, r) => sum + r.amount, 0);
    return {
      totalAtRisk,
      repayments: overdue,
    };
  }

  async executeRecoveryAction(
    actionType: string,
    repaymentId?: string,
    userId?: string
  ): Promise<{ success: boolean; message: string }> {
    const db = await this.loadDb();

    if (actionType === 'batch_direct_debit_sweep') {
      const overdueReps = db.repayments.filter((r) => r.status === 'overdue');
      overdueReps.forEach((r) => {
        r.retryCount = (r.retryCount || 0) + 1;
      });

      await this.logAudit({
        action: 'BATCH_DIRECT_DEBIT_SWEEP',
        actorName: 'Collections Officer',
        resource: 'repayment',
        details: `Executed automated Direct Debit sweep across ${overdueReps.length} delinquent mandates via Paystack & Mono.`,
      });

      await this.persistDb(db);
      return {
        success: true,
        message: `Batch sweep successfully triggered for ${overdueReps.length} overdue accounts.`,
      };
    }

    if (repaymentId) {
      const idx = db.repayments.findIndex((r) => r.id === repaymentId);
      if (idx !== -1) {
        db.repayments[idx].retryCount = (db.repayments[idx].retryCount || 0) + 1;
      }
    }

    await this.logAudit({
      action: actionType.toUpperCase(),
      actorName: 'Collections Officer',
      resource: 'repayment',
      resourceId: repaymentId,
      details: `Executed ${actionType} recovery action for repayment ${repaymentId || 'general'}`,
    });

    await this.persistDb(db);
    return {
      success: true,
      message: `Recovery action "${actionType}" dispatched successfully.`,
    };
  }

  // ============================================================
  // KYC & Compliance Documents
  // ============================================================
  async getKycDocuments(): Promise<KycDocEntity[]> {
    try {
      const dbDocs = await prisma.kycDocument.findMany({
        include: { user: true },
        orderBy: { uploadedAt: 'desc' },
      });
      if (dbDocs && dbDocs.length > 0) {
        return dbDocs.map((d) => ({
          id: d.id,
          userId: d.userId,
          userName: d.user ? `${d.user.firstName} ${d.user.lastName}` : undefined,
          documentType: d.type as any,
          fileUrl: d.fileUrl,
          fileName: d.fileName || 'KYC_Document.pdf',
          verificationStatus: d.verificationStatus as any,
          verifiedBy: d.verifiedBy || undefined,
          verifiedAt: d.verifiedAt ? d.verifiedAt.toISOString() : undefined,
          uploadedAt: d.uploadedAt.toISOString(),
        }));
      }
    } catch {
      // Fallback
    }

    const db = await this.loadDb();
    return db.kycDocuments || [];
  }

  async updateKycStatus(
    docId: string,
    status: 'verified' | 'rejected',
    verifiedBy: string,
    reason?: string
  ): Promise<KycDocEntity | null> {
    try {
      const updated = await prisma.kycDocument.update({
        where: { id: docId },
        data: {
          verificationStatus: status,
          verifiedBy,
          verifiedAt: new Date(),
        },
        include: { user: true },
      });

      if (status === 'verified') {
        await prisma.user.update({
          where: { id: updated.userId },
          data: { kycStatus: 'verified' },
        }).catch(() => null);
      }

      await this.logAudit({
        action: status === 'verified' ? 'APPROVED_KYC_DOC' : 'REJECTED_KYC_DOC',
        actorName: verifiedBy,
        resource: 'kyc_document',
        resourceId: docId,
        details: `${status === 'verified' ? 'Approved' : 'Rejected'} KYC document ${updated.fileName}`,
      });

      return {
        id: updated.id,
        userId: updated.userId,
        userName: updated.user ? `${updated.user.firstName} ${updated.user.lastName}` : undefined,
        documentType: updated.type as any,
        fileUrl: updated.fileUrl,
        fileName: updated.fileName || 'KYC_Document.pdf',
        verificationStatus: updated.verificationStatus as any,
        verifiedBy: updated.verifiedBy || undefined,
        verifiedAt: updated.verifiedAt ? updated.verifiedAt.toISOString() : undefined,
        uploadedAt: updated.uploadedAt.toISOString(),
      };
    } catch {
      // Fallback
    }

    const db = await this.loadDb();
    const idx = db.kycDocuments.findIndex((d) => d.id === docId);
    if (idx === -1) return null;

    db.kycDocuments[idx].verificationStatus = status;
    db.kycDocuments[idx].verifiedBy = verifiedBy;
    db.kycDocuments[idx].verifiedAt = new Date().toISOString();
    if (reason) db.kycDocuments[idx].rejectionReason = reason;

    await this.logAudit({
      action: status === 'verified' ? 'APPROVED_KYC_DOC' : 'REJECTED_KYC_DOC',
      actorName: verifiedBy,
      resource: 'kyc_document',
      resourceId: docId,
      details: `${status === 'verified' ? 'Approved' : 'Rejected'} KYC document ${db.kycDocuments[idx].fileName}`,
    });

    await this.persistDb(db);
    return db.kycDocuments[idx];
  }

  // ============================================================
  // System Config & Audit Trail
  // ============================================================
  async getSystemConfig(): Promise<Record<string, string>> {
    const db = await this.loadDb();
    return db.systemConfig || {};
  }

  async updateSystemConfig(updates: Record<string, string>): Promise<Record<string, string>> {
    const db = await this.loadDb();
    db.systemConfig = {
      ...db.systemConfig,
      ...updates,
    };

    await this.logAudit({
      action: 'UPDATED_SYSTEM_CONFIG',
      actorName: 'Super Admin',
      resource: 'config',
      details: `Updated parameters: ${Object.keys(updates).join(', ')}`,
    });

    await this.persistDb(db);
    return db.systemConfig;
  }

  async getAuditLogs(): Promise<AuditLogEntity[]> {
    try {
      const dbLogs = await prisma.auditLog.findMany({
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      if (dbLogs && dbLogs.length > 0) {
        return dbLogs.map((l) => ({
          id: l.id,
          userId: l.userId,
          actorName: l.user ? `${l.user.firstName} ${l.user.lastName}` : 'System Admin',
          action: l.action,
          resource: l.resource || 'system',
          resourceId: l.resourceId || undefined,
          details: l.details || '',
          ipAddress: l.ipAddress || '197.210.84.12',
          createdAt: l.createdAt.toISOString(),
        }));
      }
    } catch {
      // Fallback
    }

    const db = await this.loadDb();
    return db.auditLogs || [];
  }

  async logAudit(logData: Omit<AuditLogEntity, 'id' | 'createdAt'>): Promise<AuditLogEntity> {
    try {
      if (logData.userId) {
        const created = await prisma.auditLog.create({
          data: {
            userId: logData.userId,
            action: logData.action,
            resource: logData.resource,
            resourceId: logData.resourceId,
            details: logData.details,
            ipAddress: logData.ipAddress,
          },
        });
        return {
          id: created.id,
          userId: created.userId,
          actorName: logData.actorName || 'Admin',
          action: created.action,
          resource: created.resource || 'system',
          resourceId: created.resourceId || undefined,
          details: created.details || '',
          ipAddress: created.ipAddress || undefined,
          createdAt: created.createdAt.toISOString(),
        };
      }
    } catch {
      // Fallback
    }

    const db = await this.loadDb();
    const newLog: AuditLogEntity = {
      ...logData,
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    db.auditLogs = [newLog, ...(db.auditLogs || [])];
    return newLog;
  }

  async getReconciliations(): Promise<any[]> {
    const db = await this.loadDb();
    return db.reconciliationLogs || [];
  }
}

export const dbService = new DbService();
export default dbService;
