import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  AlertCircle,
  Clock,
  Users,
  Check,
  ShoppingBag,
  Calendar,
  Upload,
  BarChart3,
  Briefcase,
  Building,
  MapPin,
  Sparkles,
  X,
  FileText,
  Trash2,
  CreditCard,
  IdCard,
  Lock,
} from "lucide-react-native";
import { DemoProduct } from "../lib/demo-data";
import { MobileApi } from "../lib/api";

type Guarantor = {
  fullName: string;
  email: string;
  phone: string;
  relationship: string;
};

type UploadedFile = {
  name: string;
  uri: string;
  size?: string;
};

type SubmittedLoanInfo = {
  loanId: string;
  bikeName: string;
  loanAmount: number;
  tenure: number;
  frequency: string;
  monthly: number;
  guarantors: Guarantor[];
  deliveryType: string;
};

const EMPLOYMENT_STATUS_OPTIONS = [
  { id: "gig_rider", label: "Gig Economy / Logistics Courier", icon: "🛵", badge: "Recommended" },
  { id: "employed_full", label: "Employed (Full-Time)", icon: "💼" },
  { id: "employed_contract", label: "Employed (Contract / Dispatch)", icon: "📋" },
  { id: "self_employed", label: "Self-Employed / Business Owner", icon: "🏪" },
  { id: "independent_courier", label: "Independent Courier Rider", icon: "📦" },
];

const GIG_PLATFORMS = [
  "Chowdeck",
  "Bolt",
  "Glovo",
  "InDrive",
  "Uber",
  "Lagride",
  "Waysdrop",
  "Fez Delivery",
  "Gokada",
  "Other Corporate Logistics",
];

const NIGERIAN_BANKS = [
  "Guaranty Trust Bank (GTBank)",
  "Access Bank",
  "Zenith Bank",
  "First Bank of Nigeria",
  "United Bank for Africa (UBA)",
  "Kuda Bank",
  "Opay",
  "Palmpay",
  "Fidelity Bank",
  "Stanbic IBTC Bank",
  "Sterling Bank",
  "Wema Bank / ALAT",
  "Moniepoint Microfinance Bank",
];

const NIGERIAN_STATES = [
  "Lagos",
  "Abuja (FCT)",
  "Ogun",
  "Oyo",
  "Rivers",
  "Kano",
  "Delta",
  "Kaduna",
  "Enugu",
  "Edo",
  "Anambra",
  "Akwa Ibom",
  "Ondo",
  "Kwara",
  "Imo",
  "Abia",
  "Plateau",
  "Other State",
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function BnplApplicationScreen({
  token,
  product,
  resumeStep,
  onRequestKyc,
  onBack,
  onComplete,
}: {
  token: string;
  product: DemoProduct;
  resumeStep?: number | null;
  onRequestKyc?: () => void;
  onBack: () => void;
  onComplete: () => void;
}) {
  // Pure in-app step state: 0 = Profile & Work, 1 = Identity & NIN, 2 = Bank & Repayment, 3 = Guarantors, 4 = Review & Agreement
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submittedLoan, setSubmittedLoan] = useState<SubmittedLoanInfo | null>(null);
  const [applicationKey] = useState(
    () => `bnpl-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  );

  // Step 0: Applicant & Gig Details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  // Employment & Gig details
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [employerName, setEmployerName] = useState("");
  const [customEmployerName, setCustomEmployerName] = useState("");
  const [joinedDate, setJoinedDate] = useState("");
  const [employerAddress, setEmployerAddress] = useState("");

  // Courier Dashboard Screenshot
  const [dashboardFile, setDashboardFile] = useState<UploadedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Delivery Option
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery_lagos" | "delivery_outside">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("Ikeja");
  const [deliveryState, setDeliveryState] = useState("Lagos");

  // Step 1: In-App Identity & NIN
  const [idType, setIdType] = useState("NIN");
  const [idNumber, setIdNumber] = useState("");
  const [bvn, setBvn] = useState("");
  const [faceVerified, setFaceVerified] = useState(false);

  // Step 2: In-App Bank & Repayment Mandate
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [frequency, setFrequency] = useState("weekly");
  const [tenure, setTenure] = useState(12);

  // Step 3: Guarantors
  const [guarantors, setGuarantors] = useState<Guarantor[]>([
    { fullName: "", email: "", phone: "", relationship: "" },
    { fullName: "", email: "", phone: "", relationship: "" },
  ]);

  // Step 4: Agreement
  const [accepted, setAccepted] = useState(false);

  // In-App Modals
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [dobYear, setDobYear] = useState(1996);
  const [dobMonth, setDobMonth] = useState(9); // 0-indexed: 9 = Oct
  const [dobDay, setDobDay] = useState(14);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);

  const draftKey = `@dandoev_bnpl_draft_${product.id}`;

  useEffect(() => {
    if (resumeStep === 1) {
      setFaceVerified(true);
      setStep(1);
    }
  }, [resumeStep]);

  // Restore Draft
  useEffect(() => {
    AsyncStorage.getItem(draftKey)
      .then((raw) => {
        if (!raw) return;
        try {
          const draft = JSON.parse(raw);
          if (draft.firstName) setFirstName(draft.firstName);
          if (draft.lastName) setLastName(draft.lastName);
          if (draft.phone) setPhone(draft.phone);
          if (draft.dateOfBirth) {
            setDateOfBirth(draft.dateOfBirth);
            const [y, m, d] = draft.dateOfBirth.split("-").map(Number);
            if (y && m && d) {
              setDobYear(y);
              setDobMonth(m - 1);
              setDobDay(d);
            }
          }
          if (draft.gender) setGender(draft.gender);
          if (draft.address) setAddress(draft.address);
          if (draft.city) setCity(draft.city);
          if (draft.state) setState(draft.state);
          if (draft.employmentStatus) setEmploymentStatus(draft.employmentStatus);
          if (draft.employerName) setEmployerName(draft.employerName);
          if (draft.joinedDate) setJoinedDate(draft.joinedDate);
          if (draft.employerAddress) setEmployerAddress(draft.employerAddress);
          if (draft.idNumber) setIdNumber(draft.idNumber);
          if (draft.bankName) setBankName(draft.bankName);
          if (draft.accountNumber) setAccountNumber(draft.accountNumber);
          if (draft.accountName) setAccountName(draft.accountName);
          if (draft.tenure) setTenure(draft.tenure);
          if (draft.frequency) setFrequency(draft.frequency);
        } catch {
          /* ignore corrupt draft */
        }
      })
      .catch(() => {});
  }, [draftKey]);

  // Auto-Save Draft
  useEffect(() => {
    if (submittedLoan) return;
    AsyncStorage.setItem(
      draftKey,
      JSON.stringify({
        firstName,
        lastName,
        phone,
        dateOfBirth,
        gender,
        address,
        city,
        state,
        employmentStatus,
        employerName,
        joinedDate,
        employerAddress,
        // Identity numbers are never written to the local form draft.
        bankName,
        accountNumber,
        accountName,
        tenure,
        frequency,
      }),
    ).catch(() => {});
  }, [
    draftKey,
    firstName,
    lastName,
    phone,
    dateOfBirth,
    gender,
    address,
    city,
    state,
    employmentStatus,
    employerName,
    joinedDate,
    employerAddress,
    bankName,
    accountNumber,
    accountName,
    tenure,
    frequency,
    submittedLoan,
  ]);

  const price = Number(product.price || 0);
  const loanAmount = price;
  const monthly = Math.max(1, Math.round((loanAmount * 1.16) / tenure));
  const weekly = Math.round(monthly / 4);

  const calculateAge = (year: number, month: number, day: number) => {
    const today = new Date();
    let age = today.getFullYear() - year;
    const m = today.getMonth() - month;
    if (m < 0 || (m === 0 && today.getDate() < day)) age--;
    return age;
  };

  const handleConfirmDob = () => {
    const formatted = `${dobYear}-${String(dobMonth + 1).padStart(2, "0")}-${String(dobDay).padStart(2, "0")}`;
    setDateOfBirth(formatted);
    setShowDobPicker(false);
  };

  // Pure In-App Mobile Dashboard Screenshot Upload
  const handlePickDashboardScreenshot = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setDashboardFile({
        name: `${employerName.toLowerCase()}_active_dashboard.png`,
        uri: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80",
        size: "1.4 MB",
      });
    }, 600);
  };

  // Step 0 Validator
  const validateStep0 = () => {
    if (!firstName.trim() || !lastName.trim()) {
      return "Please enter your legal first and last name.";
    }
    if (!/^\+?\d{10,15}$/.test(phone.replace(/[\s()-]/g, ""))) {
      return "Please enter a valid phone number (e.g. 08012345678).";
    }
    if (!dateOfBirth) {
      return "Please select your date of birth.";
    }
    const [y, m, d] = dateOfBirth.split("-").map(Number);
    if (calculateAge(y, m - 1, d) < 18) {
      return "Applicant must be at least 18 years old to qualify for BNPL.";
    }
    if (!address.trim() || !city.trim() || !state.trim()) {
      return "Please complete your residential street address.";
    }
    if (deliveryType !== "pickup" && !deliveryAddress.trim()) {
      return "Please provide your delivery street address.";
    }
    return null;
  };

  // Step 1 Validator
  const validateStep1 = () => {
    if (!/^\d{11}$/.test(idNumber)) return "Enter your 11-digit NIN.";
    if (!/^\d{11}$/.test(bvn)) return "Enter your 11-digit BVN.";
    return null;
  };

  // Step 2 Validator
  const validateStep2 = () => {
    if (!bankName.trim() || !accountNumber.trim() || accountNumber.length < 10) {
      return "Please select your bank and enter a valid 10-digit NUBAN account number.";
    }
    return null;
  };

  // Step 3 Validator
  const validateStep3 = () => {
    const valid = guarantors.every(
      (g) =>
        g.fullName.trim().length >= 2 &&
        /^\+?\d{7,15}$/.test(g.phone.replace(/[\s()-]/g, "")) &&
        g.relationship.trim().length >= 2,
    );
    return valid ? null : "Please provide names, phone numbers, and relationships for both guarantors.";
  };

  const updateGuarantor = (index: number, key: keyof Guarantor, value: string) => {
    setGuarantors((items) =>
      items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    );
  };

  // Final In-App Submission
  const handleSubmit = async () => {
    setBusy(true);
    setError("");
    try {
      const finalEmployer = employerName === "Other Corporate Logistics" && customEmployerName ? customEmployerName : employerName;
      const res = await MobileApi.applyForLoan(
        {
          bikeId: product.id,
          bikeName: product.name,
          bikePrice: price,
          downPayment: 0,
          loanAmount,
          interestRate: 4,
          insuranceFee: 60000,
          serviceFee: 20000,
          deliveryType,
          deliveryFee: deliveryType === "pickup" ? 0 : deliveryType === "delivery_lagos" ? 20000 : 50000,
          deductionFrequency: frequency,
          tenure,
          monthlyRepayment: monthly,
          totalRepayable: monthly * tenure,
          firstName,
          lastName,
          phone,
          dateOfBirth,
          gender,
          employmentStatus,
          employerName: finalEmployer,
          employerAddress,
          joinedDate,
          address,
          city,
          state,
          deliveryAddress: deliveryType === "pickup" ? "Lagos Central Pickup Hub, Ikeja" : deliveryAddress,
          deliveryCity: deliveryType === "pickup" ? "Ikeja" : deliveryCity,
          deliveryState: deliveryType === "pickup" ? "Lagos" : deliveryState,
          ninNumber: idNumber,
          bvn,
          bankName,
          bankAccountNumber: accountNumber,
          bankAccountName: accountName,
          agreementAccepted: true,
          agreementVersion: "bnpl-v1",
          guarantors,
          documents: dashboardFile
            ? [{ type: "work_id", fileName: dashboardFile.name, fileUrl: dashboardFile.uri }]
            : undefined,
        },
        token,
        applicationKey,
      );

      await AsyncStorage.removeItem(draftKey);
      setSubmittedLoan({
        loanId: res.loanId || `APP-${Date.now().toString(36).toUpperCase()}`,
        bikeName: product.name,
        loanAmount,
        tenure,
        frequency,
        monthly,
        guarantors,
        deliveryType,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to submit your application. Please check your network and try again.");
    } finally {
      setBusy(false);
    }
  };

  // ==========================================
  // CONFIRMATION VIEW (SUCCESS SCREEN)
  // ==========================================
  if (submittedLoan) {
    const shortRef = submittedLoan.loanId.slice(0, 8).toUpperCase();
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <CheckCircle2 size={44} color="#10B981" />
            </View>
            <Text style={styles.successEyebrow}>APPLICATION SUBMITTED</Text>
            <Text style={styles.successTitle}>Underwriting In Progress! 🎉</Text>
            <Text style={styles.successSub}>
              Your BNPL application for{" "}
              <Text style={{ fontWeight: "800", color: "#0A154F" }}>{submittedLoan.bikeName}</Text>{" "}
              has been securely logged. Guarantor verification SMS & WhatsApp notices are being dispatched.
            </Text>

            <View style={styles.refPill}>
              <Text style={styles.refPillLabel}>APPLICATION ID:</Text>
              <Text style={styles.refPillVal}>{shortRef}</Text>
            </View>
          </View>

          {/* Guarantors Dispatched */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Users size={18} color="#2E3192" />
              <Text style={styles.cardTitle}>Guarantor Verification</Text>
            </View>
            <Text style={styles.helperText}>Links sent to both nominated guarantors for digital sign-off:</Text>
            {submittedLoan.guarantors.map((g, idx) => (
              <View key={idx} style={styles.guarantorItem}>
                <View style={styles.guarantorAvatar}>
                  <Text style={styles.guarantorInitial}>{g.fullName[0]?.toUpperCase() || "G"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.guarantorName}>{g.fullName}</Text>
                  <Text style={styles.guarantorSub}>{g.relationship} • {g.phone}</Text>
                </View>
                <View style={styles.invitedBadge}>
                  <Clock size={11} color="#D97706" />
                  <Text style={styles.invitedBadgeText}>Invited</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Timeline */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What Happens Next?</Text>
            <View style={styles.timelineList}>
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.timelineDotDone]}>
                  <Check size={11} color="#FFFFFF" strokeWidth={3} />
                </View>
                <View style={styles.timelineBody}>
                  <Text style={styles.timelineTitle}>1. Profile & Bank Mandate Logged</Text>
                  <Text style={styles.timelineSub}>Affordability and weekly deduction schedule scheduled.</Text>
                </View>
              </View>

              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, styles.timelineDotActive]}>
                  <Text style={styles.timelineNum}>2</Text>
                </View>
                <View style={styles.timelineBody}>
                  <Text style={styles.timelineTitle}>2. Guarantor Digital Sign-Off</Text>
                  <Text style={styles.timelineSub}>Guarantors click their invite link to confirm identity.</Text>
                </View>
              </View>

              <View style={styles.timelineItem}>
                <View style={styles.timelineDot}>
                  <Text style={styles.timelineNum}>3</Text>
                </View>
                <View style={styles.timelineBody}>
                  <Text style={styles.timelineTitle}>3. Credit Approval (Within 24 Hours)</Text>
                  <Text style={styles.timelineSub}>Risk team reviews rider dashboard and approves.</Text>
                </View>
              </View>

              <View style={[styles.timelineItem, { borderLeftWidth: 0, paddingBottom: 0 }]}>
                <View style={styles.timelineDot}>
                  <Text style={styles.timelineNum}>4</Text>
                </View>
                <View style={styles.timelineBody}>
                  <Text style={styles.timelineTitle}>4. Vehicle Handover & Keys</Text>
                  <Text style={styles.timelineSub}>Pick up at Ikeja Central Hub or receive doorstep delivery.</Text>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryBtn} onPress={onComplete} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>View in My Plans</Text>
            <ChevronRight size={18} color="#0A154F" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={onBack} activeOpacity={0.85}>
            <Text style={styles.secondaryBtnText}>Back to Product Catalog</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ==========================================
  // IN-APP MULTI-STEP MOBILE SCREEN FLOW
  // ==========================================
  return (
    <SafeAreaView style={styles.container}>
      {/* Mobile Top Navigation Bar */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => {
            if (step > 0) setStep(step - 1);
            else onBack();
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#0A154F" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.navTitle}>BNPL Application</Text>
          <Text style={styles.navSub}>Step {step + 1} of 5</Text>
        </View>
        <TouchableOpacity
          onPress={onBack}
          style={styles.navCloseBtn}
          activeOpacity={0.7}
        >
          <X size={18} color="#64748B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Selected Product Mini Header Card */}
        <View style={styles.productHeaderCard}>
          <View style={styles.productHeaderLeft}>
            <View style={styles.zeroDepositBadge}>
              <Sparkles size={11} color="#047857" />
              <Text style={styles.zeroDepositText}>0% Down Payment</Text>
            </View>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productWeekly}>
              ₦{weekly.toLocaleString()}<Text style={styles.productWeeklySub}> / week (12 mos)</Text>
            </Text>
          </View>
          <View style={styles.productHeaderRight}>
            <View style={styles.verifiedFleetPill}>
              <ShieldCheck size={12} color="#2E3192" />
              <Text style={styles.verifiedFleetText}>Fleet Lease</Text>
            </View>
          </View>
        </View>

        {/* In-App Mobile Step Progress Indicators */}
        <View style={styles.progressRow}>
          {[
            { label: "Profile & Work", index: 0 },
            { label: "Identity", index: 1 },
            { label: "Bank Repayment", index: 2 },
            { label: "Guarantors", index: 3 },
            { label: "Submit", index: 4 },
          ].map((item) => (
            <TouchableOpacity
              key={item.index}
              style={[
                styles.progressSegment,
                step === item.index && styles.progressSegmentActive,
                step > item.index && styles.progressSegmentDone,
              ]}
              onPress={() => {
                if (item.index < step) setStep(item.index);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.progressSegmentText,
                  step === item.index && styles.progressSegmentTextActive,
                  step > item.index && styles.progressSegmentTextDone,
                ]}
              >
                {step > item.index ? "✓" : item.index + 1}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Error Alert Banner */}
        {error ? (
          <View style={styles.errorCard}>
            <View style={styles.errorHeader}>
              <AlertCircle size={18} color="#DC2626" />
              <Text style={styles.errorTitle}>Attention Needed</Text>
            </View>
            <Text style={styles.errorBody}>{error}</Text>
            <TouchableOpacity style={styles.errorDismissBtn} onPress={() => setError("")}>
              <Text style={styles.errorDismissText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ========================================================= */}
        {/* STEP 0: APPLICANT PROFILE, GIG WORK & DASHBOARD UPLOAD */}
        {/* ========================================================= */}
        {step === 0 && (
          <>
            {/* 1. PERSONAL DETAILS */}
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.iconCircle}>
                  <Text style={{ fontSize: 16 }}>👤</Text>
                </View>
                <View>
                  <Text style={styles.cardTitle}>Personal Information</Text>
                  <Text style={styles.cardSub}>Legal details matching your government ID</Text>
                </View>
              </View>

              <View style={styles.rowTwoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>First Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Solomon"
                    placeholderTextColor="#94A3B8"
                    value={firstName}
                    onChangeText={setFirstName}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Dunu"
                    placeholderTextColor="#94A3B8"
                    value={lastName}
                    onChangeText={setLastName}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Phone Number (WhatsApp Active)</Text>
              <TextInput
                style={styles.input}
                placeholder="0801 234 5678"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              {/* DATE OF BIRTH WITH IN-APP MODAL PICKER */}
              <Text style={styles.inputLabel}>Date of Birth (18+ Required)</Text>
              <TouchableOpacity
                style={styles.selectorTrigger}
                onPress={() => setShowDobPicker(true)}
                activeOpacity={0.8}
              >
                <View style={styles.selectorTriggerLeft}>
                  <Calendar size={18} color="#2E3192" />
                  <Text style={[styles.selectorTriggerText, !dateOfBirth && styles.selectorPlaceholder]}>
                    {dateOfBirth
                      ? `${dobDay} ${MONTHS[dobMonth]} ${dobYear} (${calculateAge(dobYear, dobMonth, dobDay)} years)`
                      : "Select Date of Birth"}
                  </Text>
                </View>
                <ChevronDown size={16} color="#64748B" />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.choiceRow}>
                {(["Male", "Female", "Other"] as const).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.choiceBtn, gender === g && styles.choiceBtnActive]}
                    onPress={() => setGender(g)}
                  >
                    <Text style={[styles.choiceBtnText, gender === g && styles.choiceBtnTextActive]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 2. RESIDENTIAL ADDRESS */}
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.iconCircle}>
                  <MapPin size={18} color="#2E3192" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Residential Address</Text>
                  <Text style={styles.cardSub}>Current living address in Nigeria</Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>Home Street Address</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 14 Commercial Avenue, Yaba"
                placeholderTextColor="#94A3B8"
                value={address}
                onChangeText={setAddress}
              />

              <View style={styles.rowTwoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>City / Area</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Yaba"
                    placeholderTextColor="#94A3B8"
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>State</Text>
                  <TouchableOpacity
                    style={styles.selectorTrigger}
                    onPress={() => setShowStatePicker(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.selectorTriggerText}>{state || "Select State"}</Text>
                    <ChevronDown size={14} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* 3. EMPLOYMENT & GIG PLATFORM DETAILS (NO MONTHLY INCOME) */}
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.iconCircle}>
                  <Briefcase size={18} color="#2E3192" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Employment & Dispatch Work</Text>
                  <Text style={styles.cardSub}>Select your primary line of work</Text>
                </View>
              </View>

              {/* Employment Status Options */}
              <Text style={styles.inputLabel}>Employment Status</Text>
              <View style={{ gap: 8 }}>
                {EMPLOYMENT_STATUS_OPTIONS.map((opt) => {
                  const isSelected = employmentStatus === opt.label;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.employmentRow, isSelected && styles.employmentRowActive]}
                      onPress={() => setEmploymentStatus(opt.label)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.employmentRowLeft}>
                        <Text style={{ fontSize: 18 }}>{opt.icon}</Text>
                        <View>
                          <Text style={[styles.employmentRowText, isSelected && styles.employmentRowTextActive]}>
                            {opt.label}
                          </Text>
                          {opt.badge && (
                            <View style={styles.optBadge}>
                              <Text style={styles.optBadgeText}>{opt.badge}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={[styles.radioDot, isSelected && styles.radioDotActive]}>
                        {isSelected && <View style={styles.radioDotInner} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Platform Chips */}
              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Courier / Delivery Platform</Text>
              <View style={styles.platformGrid}>
                {GIG_PLATFORMS.map((plat) => {
                  const isSelected = employerName === plat;
                  return (
                    <TouchableOpacity
                      key={plat}
                      style={[styles.platformChip, isSelected && styles.platformChipActive]}
                      onPress={() => setEmployerName(plat)}
                      activeOpacity={0.7}
                    >
                      {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                      <Text style={[styles.platformChipText, isSelected && styles.platformChipTextActive]}>
                        {plat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {employerName === "Other Corporate Logistics" && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.inputLabel}>Company Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter company or logistics hub"
                    placeholderTextColor="#94A3B8"
                    value={customEmployerName}
                    onChangeText={setCustomEmployerName}
                  />
                </View>
              )}

              <View style={styles.rowTwoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>When Did You Join?</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. March 2023"
                    placeholderTextColor="#94A3B8"
                    value={joinedDate}
                    onChangeText={setJoinedDate}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Dispatch Hub / Office</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Ikeja Hub"
                    placeholderTextColor="#94A3B8"
                    value={employerAddress}
                    onChangeText={setEmployerAddress}
                  />
                </View>
              </View>

              {/* 4. RIDER DASHBOARD SCREENSHOT UPLOAD */}
              <View style={styles.dashboardSection}>
                <Text style={styles.inputLabel}>Rider / Courier Earning Dashboard</Text>
                <Text style={styles.helperText}>
                  Screenshot of your Chowdeck, Bolt, Glovo, or InDrive rider profile showing your total deliveries, ratings, or weekly activity.
                </Text>

                {dashboardFile ? (
                  <View style={styles.uploadedCard}>
                    <View style={styles.uploadedLeft}>
                      <Image source={{ uri: dashboardFile.uri }} style={styles.uploadedThumb} resizeMode="cover" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.uploadedFileName} numberOfLines={1}>
                          {dashboardFile.name}
                        </Text>
                        <View style={styles.uploadedBadgeRow}>
                          <CheckCircle2 size={12} color="#10B981" />
                          <Text style={styles.uploadedBadgeText}>
                            Ready for Underwriting • {dashboardFile.size || "1.4 MB"}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.uploadedActions}>
                      <TouchableOpacity style={styles.replaceBtn} onPress={handlePickDashboardScreenshot}>
                        <Text style={styles.replaceBtnText}>Replace</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.removeBtn} onPress={() => setDashboardFile(null)}>
                        <Trash2 size={16} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadDropzone}
                    onPress={handlePickDashboardScreenshot}
                    disabled={isUploading}
                    activeOpacity={0.7}
                  >
                    {isUploading ? (
                      <ActivityIndicator color="#0A154F" />
                    ) : (
                      <>
                        <View style={styles.uploadCircle}>
                          <BarChart3 size={24} color="#2E3192" />
                        </View>
                        <Text style={styles.uploadTitle}>Tap to select dashboard screenshot</Text>
                        <Text style={styles.uploadSub}>PNG, JPG, or PDF from courier app</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* 5. DELIVERY OPTION */}
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.iconCircle}>
                  <ShoppingBag size={18} color="#2E3192" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Vehicle Handover Option</Text>
                  <Text style={styles.cardSub}>Where to collect your electric bike</Text>
                </View>
              </View>

              <View style={styles.deliveryRow}>
                {(
                  [
                    { id: "pickup", title: "Central Hub Pickup", price: "Free (Ikeja, Lagos)" },
                    { id: "delivery_lagos", title: "Lagos Delivery", price: "+₦20,000" },
                    { id: "delivery_outside", title: "Outside Lagos", price: "+₦50,000" },
                  ] as const
                ).map((opt) => {
                  const isSelected = deliveryType === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[styles.deliveryCard, isSelected && styles.deliveryCardActive]}
                      onPress={() => setDeliveryType(opt.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.deliveryCardTitle, isSelected && styles.deliveryCardTitleActive]}>
                        {opt.title}
                      </Text>
                      <Text style={[styles.deliveryCardPrice, isSelected && styles.deliveryCardPriceActive]}>
                        {opt.price}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {deliveryType !== "pickup" && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.inputLabel}>Delivery Street Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter landmark and street address"
                    placeholderTextColor="#94A3B8"
                    value={deliveryAddress}
                    onChangeText={setDeliveryAddress}
                  />
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                const msg = validateStep0();
                if (msg) setError(msg);
                else {
                  setError("");
                  setStep(1);
                }
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Continue to Identity Verification</Text>
              <ChevronRight size={18} color="#0A154F" />
            </TouchableOpacity>
          </>
        )}

        {/* ========================================================= */}
        {/* STEP 1: IN-APP IDENTITY & GOVERNMENT ID (NIN) */}
        {/* ========================================================= */}
        {step === 1 && (
          <>
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.iconCircle}>
                  <IdCard size={18} color="#2E3192" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Identity Verification</Text>
                  <Text style={styles.cardSub}>Government identification verification</Text>
                </View>
              </View>

              <Text style={styles.bodyText}>
                Under CBN & FRSC consumer credit guidelines, every vehicle lease applicant must verify their national identity.
              </Text>

              <Text style={styles.inputLabel}>ID Document Type</Text>
              <View style={styles.choiceRow}>
                {(["NIN", "Driver's License", "Voter's Card"] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.choiceBtn, idType === t && styles.choiceBtnActive]}
                    onPress={() => setIdType(t)}
                  >
                    <Text style={[styles.choiceBtnText, idType === t && styles.choiceBtnTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>
                {idType === "NIN" ? "11-Digit National Identification Number (NIN)" : `${idType} Number`}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={idType === "NIN" ? "e.g. 22334455667" : "Enter ID number"}
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                maxLength={idType === "NIN" ? 11 : 20}
                value={idNumber}
                onChangeText={setIdNumber}
              />

              <View style={styles.verifiedNoticeBox}>
                <ShieldCheck size={18} color="#10B981" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.verifiedNoticeTitle}>NIMC Direct Verification Ready</Text>
                  <Text style={styles.verifiedNoticeSub}>
                    Your identity will be encrypted and authenticated directly with Nigerian Identity Management Commission.
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                const msg = validateStep1();
                if (msg) setError(msg);
                else {
                  setError("");
                  setStep(2);
                }
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Continue to Bank Repayment</Text>
              <ChevronRight size={18} color="#0A154F" />
            </TouchableOpacity>
          </>
        )}

        {/* ========================================================= */}
        {/* STEP 2: IN-APP BANK ACCOUNT & DIRECT DEBIT MANDATE */}
        {/* ========================================================= */}
        {step === 2 && (
          <>
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.iconCircle}>
                  <Building size={18} color="#2E3192" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Repayment Bank Account</Text>
                  <Text style={styles.cardSub}>Set up automated weekly repayment sweeps</Text>
                </View>
              </View>

              <Text style={styles.bodyText}>
                Select your primary bank account where your courier earnings are received. Repayments are automatically debited weekly.
              </Text>

              <Text style={styles.inputLabel}>Bank Name</Text>
              <TouchableOpacity
                style={styles.selectorTrigger}
                onPress={() => setShowBankPicker(true)}
                activeOpacity={0.8}
              >
                <View style={styles.selectorTriggerLeft}>
                  <Building size={16} color="#2E3192" />
                  <Text style={styles.selectorTriggerText}>{bankName || "Select Bank"}</Text>
                </View>
                <ChevronDown size={14} color="#64748B" />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>10-Digit NUBAN Account Number</Text>
              <TextInput
                style={styles.input}
                placeholder="0123456789"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                maxLength={10}
                value={accountNumber}
                onChangeText={setAccountNumber}
              />

              <Text style={styles.inputLabel}>Account Name (Auto-Verified)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: "#F1F5F9" }]}
                placeholder="Account name"
                placeholderTextColor="#94A3B8"
                value={accountName}
                onChangeText={setAccountName}
              />
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.iconCircle}>
                  <CreditCard size={18} color="#2E3192" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Repayment Duration & Schedule</Text>
                  <Text style={styles.cardSub}>Tailored for daily rider cashflow</Text>
                </View>
              </View>

              <Text style={styles.inputLabel}>Tenure Duration (Months)</Text>
              <View style={styles.choiceRow}>
                {[6, 12, 18].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.choiceBtn, tenure === t && styles.choiceBtnActive]}
                    onPress={() => setTenure(t)}
                  >
                    <Text style={[styles.choiceBtnText, tenure === t && styles.choiceBtnTextActive]}>
                      {t} Months
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { marginTop: 14 }]}>Deduction Cadence</Text>
              <View style={styles.choiceRow}>
                {["weekly", "monthly"].map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.choiceBtn, frequency === f && styles.choiceBtnActive]}
                    onPress={() => setFrequency(f)}
                  >
                    <Text style={[styles.choiceBtnText, frequency === f && styles.choiceBtnTextActive]}>
                      {f.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.repaymentSummaryBox}>
                <View style={styles.repaymentSummaryRow}>
                  <Text style={styles.repaymentSummaryLabel}>Weekly Deduction:</Text>
                  <Text style={styles.repaymentSummaryVal}>₦{weekly.toLocaleString()}/week</Text>
                </View>
                <View style={styles.repaymentSummaryRow}>
                  <Text style={styles.repaymentSummaryLabel}>Total Financed:</Text>
                  <Text style={styles.repaymentSummaryVal}>₦{loanAmount.toLocaleString()}</Text>
                </View>
                <View style={styles.repaymentSummaryRow}>
                  <Text style={styles.repaymentSummaryLabel}>Initial Deposit:</Text>
                  <Text style={[styles.repaymentSummaryVal, { color: "#047857" }]}>₦0 (Zero Down)</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                const msg = validateStep2();
                if (msg) setError(msg);
                else {
                  setError("");
                  setStep(3);
                }
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Continue to Guarantors</Text>
              <ChevronRight size={18} color="#0A154F" />
            </TouchableOpacity>
          </>
        )}

        {/* ========================================================= */}
        {/* STEP 3: NOMINATED GUARANTORS */}
        {/* ========================================================= */}
        {step === 3 && (
          <>
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.iconCircle}>
                  <Users size={18} color="#2E3192" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Nominated Guarantors</Text>
                  <Text style={styles.cardSub}>Two credible contacts (Colleague, Union, Family)</Text>
                </View>
              </View>
              <Text style={styles.bodyText}>
                Guarantors will receive an automated SMS & WhatsApp verification request. No upfront collateral required from them.
              </Text>
            </View>

            {guarantors.map((g, i) => (
              <View key={i} style={styles.card}>
                <Text style={styles.cardTitle}>Guarantor {i + 1}</Text>
                <Text style={styles.inputLabel}>Full Legal Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Chief Babatunde Johnson"
                  placeholderTextColor="#94A3B8"
                  value={g.fullName}
                  onChangeText={(v) => updateGuarantor(i, "fullName", v)}
                />

                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0802 334 5566"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                  value={g.phone}
                  onChangeText={(v) => updateGuarantor(i, "phone", v)}
                />

                <Text style={styles.inputLabel}>Relationship</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Senior Colleague, Union Leader, Brother"
                  placeholderTextColor="#94A3B8"
                  value={g.relationship}
                  onChangeText={(v) => updateGuarantor(i, "relationship", v)}
                />
              </View>
            ))}

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                const msg = validateStep3();
                if (msg) setError(msg);
                else {
                  setError("");
                  setStep(4);
                }
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Review Agreement & Terms</Text>
              <ChevronRight size={18} color="#0A154F" />
            </TouchableOpacity>
          </>
        )}

        {/* ========================================================= */}
        {/* STEP 4: REVIEW & DIGITAL AGREEMENT */}
        {/* ========================================================= */}
        {step === 4 && (
          <>
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.iconCircle}>
                  <FileText size={18} color="#2E3192" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Application Review</Text>
                  <Text style={styles.cardSub}>Confirm all details before submission</Text>
                </View>
              </View>

              <View style={styles.reviewItem}>
                <Text style={styles.reviewItemLabel}>Vehicle:</Text>
                <Text style={styles.reviewItemVal}>{product.name}</Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewItemLabel}>Repayment Cadence:</Text>
                <Text style={styles.reviewItemVal}>₦{weekly.toLocaleString()} / week</Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewItemLabel}>Tenure Duration:</Text>
                <Text style={styles.reviewItemVal}>{tenure} Months</Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewItemLabel}>Repayment Bank:</Text>
                <Text style={styles.reviewItemVal}>{bankName} ({accountNumber})</Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewItemLabel}>Delivery:</Text>
                <Text style={styles.reviewItemVal}>
                  {deliveryType === "pickup" ? "Hub Pickup (Free - Ikeja)" : `${deliveryAddress}, ${city}`}
                </Text>
              </View>
              <View style={[styles.reviewItem, { borderBottomWidth: 0 }]}>
                <Text style={styles.reviewItemLabel}>Rider Platform:</Text>
                <Text style={styles.reviewItemVal}>{employerName}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Digital Consent & Mandate</Text>
              <Text style={styles.bodyText}>
                I confirm that my personal identity, delivery platform information, and bank details are accurate. I authorize DandoEv to initiate scheduled weekly sweeps via NIBSS/direct debit upon bike release.
              </Text>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setAccepted(!accepted)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkboxBox, accepted && styles.checkboxBoxChecked]}>
                  {accepted && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
                </View>
                <Text style={[styles.bodyText, { marginTop: 0, flex: 1, fontWeight: "600" }]}>
                  I accept the DandoEv Commercial E-Bike BNPL Agreement (bnpl-v1)
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, (!accepted || busy) && styles.disabled]}
              onPress={() => void handleSubmit()}
              disabled={!accepted || busy}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color="#0A154F" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Submit BNPL Application</Text>
                  <CheckCircle2 size={18} color="#0A154F" />
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* ========================================================= */}
      {/* IN-APP DATE OF BIRTH PICKER MODAL */}
      {/* ========================================================= */}
      <Modal visible={showDobPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Date of Birth</Text>
                <Text style={styles.modalSub}>Must be at least 18 years old to apply</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDobPicker(false)} style={styles.modalCloseBtn}>
                <X size={20} color="#0A154F" />
              </TouchableOpacity>
            </View>

            {/* Live Age Indicator */}
            <View style={styles.ageIndicatorBox}>
              <Sparkles size={16} color="#047857" />
              <Text style={styles.ageIndicatorText}>
                {dobDay} {MONTHS[dobMonth]} {dobYear} • {calculateAge(dobYear, dobMonth, dobDay)} Years Old (Eligible)
              </Text>
            </View>

            {/* Year Selector */}
            <Text style={styles.pickerSectionLabel}>Year</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
              {Array.from({ length: 50 }, (_, i) => 2008 - i).map((yr) => (
                <TouchableOpacity
                  key={yr}
                  style={[styles.chipItem, dobYear === yr && styles.chipItemActive]}
                  onPress={() => setDobYear(yr)}
                >
                  <Text style={[styles.chipText, dobYear === yr && styles.chipTextActive]}>{yr}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Month Selector */}
            <Text style={styles.pickerSectionLabel}>Month</Text>
            <View style={styles.monthsGrid}>
              {MONTHS.map((m, idx) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.monthCell, dobMonth === idx && styles.monthCellActive]}
                  onPress={() => setDobMonth(idx)}
                >
                  <Text style={[styles.monthCellText, dobMonth === idx && styles.monthCellTextActive]}>
                    {m.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Day Selector */}
            <Text style={styles.pickerSectionLabel}>Day</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.dayChip, dobDay === d && styles.dayChipActive]}
                  onPress={() => setDobDay(d)}
                >
                  <Text style={[styles.dayChipText, dobDay === d && styles.dayChipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleConfirmDob}>
              <Text style={styles.primaryBtnText}>Confirm Date of Birth</Text>
              <Check size={18} color="#0A154F" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* IN-APP NIGERIAN STATE SELECTOR MODAL */}
      {/* ========================================================= */}
      <Modal visible={showStatePicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: "75%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select State</Text>
              <TouchableOpacity onPress={() => setShowStatePicker(false)} style={styles.modalCloseBtn}>
                <X size={20} color="#0A154F" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ marginTop: 10 }}>
              {NIGERIAN_STATES.map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[styles.sheetItem, state === st && styles.sheetItemActive]}
                  onPress={() => {
                    setState(st);
                    setShowStatePicker(false);
                  }}
                >
                  <Text style={[styles.sheetItemText, state === st && styles.sheetItemTextActive]}>{st}</Text>
                  {state === st && <Check size={16} color="#2E3192" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* IN-APP NIGERIAN BANK SELECTOR MODAL */}
      {/* ========================================================= */}
      <Modal visible={showBankPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: "75%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Repayment Bank</Text>
              <TouchableOpacity onPress={() => setShowBankPicker(false)} style={styles.modalCloseBtn}>
                <X size={20} color="#0A154F" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ marginTop: 10 }}>
              {NIGERIAN_BANKS.map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[styles.sheetItem, bankName === b && styles.sheetItemActive]}
                  onPress={() => {
                    setBankName(b);
                    setShowBankPicker(false);
                  }}
                >
                  <Text style={[styles.sheetItemText, bankName === b && styles.sheetItemTextActive]}>{b}</Text>
                  {bankName === b && <Check size={16} color="#2E3192" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F7FC" },
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  navBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18 },
  navCloseBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18 },
  navTitle: { color: "#0A154F", fontSize: 16, fontWeight: "900", fontFamily: "PlusJakartaSans_800ExtraBold" },
  navSub: { color: "#64748B", fontSize: 11, fontWeight: "600", marginTop: 1 },

  scrollContent: { padding: 16, paddingBottom: 60 },

  // Product Mini Header Card
  productHeaderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  productHeaderLeft: { flex: 1 },
  zeroDepositBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  zeroDepositText: { color: "#047857", fontSize: 10, fontWeight: "800" },
  productName: { color: "#0A154F", fontSize: 16, fontWeight: "800", marginBottom: 2 },
  productWeekly: { color: "#2E3192", fontSize: 15, fontWeight: "900" },
  productWeeklySub: { color: "#64748B", fontSize: 12, fontWeight: "600" },
  productHeaderRight: { alignItems: "flex-end" },
  verifiedFleetPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedFleetText: { color: "#2E3192", fontSize: 11, fontWeight: "700" },

  // Mobile In-App Progress Segment Row
  progressRow: { flexDirection: "row", gap: 6, marginBottom: 16 },
  progressSegment: {
    flex: 1,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  progressSegmentActive: { backgroundColor: "#0A154F" },
  progressSegmentDone: { backgroundColor: "#10B981" },
  progressSegmentText: { color: "#64748B", fontSize: 12, fontWeight: "800" },
  progressSegmentTextActive: { color: "#FFFFFF" },
  progressSegmentTextDone: { color: "#FFFFFF" },

  // Cards
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { color: "#0A154F", fontSize: 15, fontWeight: "800" },
  cardSub: { color: "#64748B", fontSize: 11, marginTop: 1 },
  bodyText: { color: "#475569", fontSize: 12, lineHeight: 18, marginBottom: 10 },

  // Inputs & Selectors
  inputLabel: { color: "#0A154F", fontSize: 12, fontWeight: "700", marginTop: 10, marginBottom: 5 },
  helperText: { color: "#64748B", fontSize: 11, marginBottom: 8, lineHeight: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: "#0A154F",
    backgroundColor: "#F8FAFC",
    fontSize: 14,
    fontWeight: "500",
  },
  rowTwoCol: { flexDirection: "row", gap: 10 },

  selectorTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
  },
  selectorTriggerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  selectorTriggerText: { color: "#0A154F", fontSize: 13, fontWeight: "600" },
  selectorPlaceholder: { color: "#94A3B8", fontWeight: "400" },

  // Choice Buttons
  choiceRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  choiceBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  choiceBtnActive: { backgroundColor: "#EEF2FF", borderColor: "#2E3192" },
  choiceBtnText: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  choiceBtnTextActive: { color: "#2E3192" },

  // Employment List
  employmentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 11,
    backgroundColor: "#F8FAFC",
  },
  employmentRowActive: { borderColor: "#2E3192", backgroundColor: "#EEF2FF" },
  employmentRowLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  employmentRowText: { color: "#0A154F", fontSize: 12, fontWeight: "700" },
  employmentRowTextActive: { color: "#2E3192" },
  optBadge: { backgroundColor: "#FEF3C7", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, marginTop: 2, alignSelf: "flex-start" },
  optBadgeText: { color: "#92400E", fontSize: 9, fontWeight: "700" },
  radioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioDotActive: { borderColor: "#2E3192" },
  radioDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2E3192" },

  // Platform Grid
  platformGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  platformChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 100,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: "#FFFFFF",
  },
  platformChipActive: { backgroundColor: "#0A154F", borderColor: "#0A154F" },
  platformChipText: { color: "#0A154F", fontSize: 11, fontWeight: "600" },
  platformChipTextActive: { color: "#FFFFFF", fontWeight: "700" },

  // Dashboard Upload Dropzone
  dashboardSection: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 12 },
  uploadDropzone: {
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    marginTop: 4,
  },
  uploadCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  uploadTitle: { color: "#0A154F", fontSize: 12, fontWeight: "700", textAlign: "center" },
  uploadSub: { color: "#64748B", fontSize: 10, marginTop: 2, textAlign: "center" },

  uploadedCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#ECFDF5",
    marginTop: 6,
  },
  uploadedLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  uploadedThumb: { width: 40, height: 40, borderRadius: 8 },
  uploadedFileName: { color: "#0A154F", fontSize: 12, fontWeight: "700" },
  uploadedBadgeRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  uploadedBadgeText: { color: "#047857", fontSize: 10, fontWeight: "600" },
  uploadedActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  replaceBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  replaceBtnText: { color: "#0A154F", fontSize: 10, fontWeight: "700" },
  removeBtn: { padding: 4 },

  // Delivery
  deliveryRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  deliveryCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 8,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  deliveryCardActive: { backgroundColor: "#EEF2FF", borderColor: "#2E3192" },
  deliveryCardTitle: { color: "#64748B", fontSize: 10, fontWeight: "700", textAlign: "center" },
  deliveryCardTitleActive: { color: "#2E3192", fontWeight: "800" },
  deliveryCardPrice: { color: "#94A3B8", fontSize: 9, marginTop: 2, textAlign: "center" },
  deliveryCardPriceActive: { color: "#047857", fontWeight: "700" },

  // Verification Notice
  verifiedNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  verifiedNoticeTitle: { color: "#065F46", fontSize: 12, fontWeight: "800" },
  verifiedNoticeSub: { color: "#047857", fontSize: 10, lineHeight: 14, marginTop: 1 },

  // Repayment Summary
  repaymentSummaryBox: { backgroundColor: "#F8FAFC", borderRadius: 12, padding: 12, marginTop: 14, gap: 6 },
  repaymentSummaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  repaymentSummaryLabel: { color: "#64748B", fontSize: 12 },
  repaymentSummaryVal: { color: "#0A154F", fontSize: 12, fontWeight: "800" },

  // Review Items
  reviewItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  reviewItemLabel: { color: "#64748B", fontSize: 12 },
  reviewItemVal: { color: "#0A154F", fontSize: 12, fontWeight: "700" },

  // Checkbox
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxBoxChecked: { backgroundColor: "#0A154F", borderColor: "#0A154F" },

  // Primary & Secondary Buttons
  primaryBtn: {
    backgroundColor: "#52E0C1",
    borderRadius: 14,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  primaryBtnText: { color: "#0A154F", fontWeight: "900", fontSize: 14 },
  secondaryBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginBottom: 20,
  },
  secondaryBtnText: { color: "#64748B", fontWeight: "700", fontSize: 13 },
  disabled: { opacity: 0.5 },

  // Error Card
  errorCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  errorHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  errorTitle: { color: "#991B1B", fontWeight: "800", fontSize: 12 },
  errorBody: { color: "#B91C1C", fontSize: 11, lineHeight: 16 },
  errorDismissBtn: { alignSelf: "flex-end", marginTop: 4 },
  errorDismissText: { color: "#991B1B", fontWeight: "700", fontSize: 10 },

  // Success Screen
  successCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  successEyebrow: { color: "#10B981", fontSize: 11, fontWeight: "800", letterSpacing: 1, marginBottom: 4 },
  successTitle: { color: "#0A154F", fontSize: 20, fontWeight: "900", textAlign: "center", marginBottom: 6 },
  successSub: { color: "#64748B", fontSize: 12, lineHeight: 18, textAlign: "center", marginBottom: 14 },
  refPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refPillLabel: { color: "#64748B", fontSize: 10, fontWeight: "700" },
  refPillVal: { color: "#0A154F", fontSize: 12, fontWeight: "800" },

  // Guarantors
  guarantorItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  guarantorAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  guarantorInitial: { color: "#2E3192", fontWeight: "800", fontSize: 13 },
  guarantorName: { color: "#0A154F", fontSize: 12, fontWeight: "700" },
  guarantorSub: { color: "#64748B", fontSize: 11, marginTop: 1 },
  invitedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  invitedBadgeText: { color: "#92400E", fontSize: 10, fontWeight: "700" },

  // Timeline
  timelineList: { marginTop: 4 },
  timelineItem: {
    flexDirection: "row",
    gap: 12,
    paddingLeft: 4,
    paddingBottom: 14,
    borderLeftWidth: 2,
    borderLeftColor: "#E2E8F0",
    marginLeft: 10,
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -12,
  },
  timelineDotDone: { backgroundColor: "#10B981" },
  timelineDotActive: { backgroundColor: "#2E3192" },
  timelineNum: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  timelineBody: { flex: 1, marginTop: -2 },
  timelineTitle: { color: "#0A154F", fontSize: 12, fontWeight: "800" },
  timelineSub: { color: "#64748B", fontSize: 11, lineHeight: 15, marginTop: 1 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(10, 21, 79, 0.6)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  modalTitle: { color: "#0A154F", fontSize: 17, fontWeight: "800" },
  modalSub: { color: "#64748B", fontSize: 11, marginTop: 1 },
  modalCloseBtn: { padding: 4 },
  ageIndicatorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    padding: 9,
    borderRadius: 8,
    marginBottom: 10,
  },
  ageIndicatorText: { color: "#047857", fontSize: 11, fontWeight: "700" },
  pickerSectionLabel: { color: "#0A154F", fontSize: 11, fontWeight: "800", marginTop: 8, marginBottom: 5 },
  horizontalChips: { flexDirection: "row", marginBottom: 4 },
  chipItem: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 8, backgroundColor: "#F1F5F9", marginRight: 6 },
  chipItemActive: { backgroundColor: "#0A154F" },
  chipText: { color: "#475569", fontSize: 11, fontWeight: "700" },
  chipTextActive: { color: "#FFFFFF" },
  monthsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 4 },
  monthCell: { width: "23%", paddingVertical: 7, borderRadius: 8, backgroundColor: "#F1F5F9", alignItems: "center" },
  monthCellActive: { backgroundColor: "#0A154F" },
  monthCellText: { color: "#475569", fontSize: 11, fontWeight: "700" },
  monthCellTextActive: { color: "#FFFFFF" },
  dayChip: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", marginRight: 5 },
  dayChipActive: { backgroundColor: "#0A154F" },
  dayChipText: { color: "#475569", fontSize: 11, fontWeight: "700" },
  dayChipTextActive: { color: "#FFFFFF" },

  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sheetItemActive: { backgroundColor: "#F8FAFC" },
  sheetItemText: { color: "#0A154F", fontSize: 13, fontWeight: "600" },
  sheetItemTextActive: { color: "#2E3192", fontWeight: "800" },
});
