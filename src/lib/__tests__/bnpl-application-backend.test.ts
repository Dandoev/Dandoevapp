import { describe, it, expect } from "vitest";
import { createLoanSchema, loanActionSchema } from "../schemas";

describe("BNPL Application Form Backend & Admin Pipeline", () => {
  const sampleMobileFormData = {
    bikeId: "bike-g90",
    bikeName: "DandoEv G90 Commuter",
    bikePrice: 1650000,
    downPayment: 0,
    loanAmount: 1650000,
    interestRate: 4,
    insuranceFee: 60000,
    serviceFee: 20000,
    deliveryType: "pickup" as const,
    deliveryFee: 0,
    deductionFrequency: "weekly" as const,
    tenure: 12,
    monthlyRepayment: 148500,
    totalRepayable: 1782000,
    firstName: "Solomon",
    lastName: "Dunu",
    phone: "08034567890",
    dateOfBirth: "1996-10-14",
    employmentStatus: "gig_rider",
    employerName: "Chowdeck",
    employerAddress: "Lagos Mainland Dispatch Base, Yaba",
    address: "12 Isaac John Street, GRA",
    city: "Ikeja",
    state: "Lagos",
    deliveryAddress: "Lagos Central Pickup Hub, Ikeja",
    deliveryCity: "Ikeja",
    deliveryState: "Lagos",
    ninNumber: "12345678901",
    bankName: "Guaranty Trust Bank (GTBank)",
    bankAccountNumber: "0123456789",
    bankAccountName: "Solomon Dunu",
    agreementAccepted: true as const,
    agreementVersion: "bnpl-v1",
    guarantors: [
      {
        fullName: "Emeka Okafor",
        email: "emeka.okafor@example.com",
        phone: "+2348021112233",
        relationship: "Brother",
      },
      {
        fullName: "Amina Yusuf",
        email: "amina.yusuf@example.com",
        phone: "+2348033334455",
        relationship: "Colleague",
      },
    ],
    documents: [
      {
        type: "work_id" as const,
        fileName: "chowdeck-earnings-october.png",
        fileUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      },
    ],
  };

  it("validates mobile BNPL application payload with gig platform, NIN, bank account, and courier proof", () => {
    const parsed = createLoanSchema.safeParse(sampleMobileFormData);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data.employerName).toBe("Chowdeck");
    expect(parsed.data.employmentStatus).toBe("gig_rider");
    expect(parsed.data.ninNumber).toBe("12345678901");
    expect(parsed.data.bankAccountNumber).toBe("0123456789");
    expect(parsed.data.documents).toHaveLength(1);
    expect(parsed.data.documents?.[0].type).toBe("work_id");
    expect(parsed.data.guarantors).toHaveLength(2);
  });

  it("validates admin approval action with underwriter manual verification override", () => {
    const adminActionPayload = {
      action: "approve" as const,
      bikeSerialNumber: "DAN-2026-X5-9012",
      chassisNumber: "CH-NG-98127364",
      batteryNumber1: "BATT-60V45AH-9012A",
      batteryNumber2: "BATT-60V45AH-9012B",
      chargerNumber: "CHG-60V10A-332",
      adminNotes: "Applicant courier earnings and NIN verified manually.",
      overrideBlockers: true,
    };

    const parsed = loanActionSchema.safeParse(adminActionPayload);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.action).toBe("approve");
    expect(parsed.data.overrideBlockers).toBe(true);
    expect(parsed.data.bikeSerialNumber).toBe("DAN-2026-X5-9012");
  });

  it("validates admin rejection action with specific reason", () => {
    const rejectPayload = {
      action: "reject" as const,
      rejectionReason: "Uploaded earnings dashboard is unreadable.",
      adminNotes: "Asked applicant to resubmit clearer screenshot.",
    };

    const parsed = loanActionSchema.safeParse(rejectPayload);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.action).toBe("reject");
    expect(parsed.data.rejectionReason).toBe("Uploaded earnings dashboard is unreadable.");
  });
});
