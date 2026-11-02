import React, { useEffect, useState, useRef } from "react";
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
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Link2,
  ShieldCheck,
  AlertCircle,
  Clock,
  Users,
  Check,
  FileCheck,
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
  mimeType?: string;
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
  resumeStep: number | null;
  onRequestKyc: () => void;
  onBack: () => void;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submittedLoan, setSubmittedLoan] = useState<SubmittedLoanInfo | null>(null);
  const [applicationKey] = useState(
    () => `bnpl-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  );

  // Form Fields (Step 0)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState(""); // YYYY-MM-DD
  const [gender, setGender] = useState("Male");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Lagos");
  const [state, setState] = useState("Lagos");

  // Employment & Gig Details
  const [employmentStatus, setEmploymentStatus] = useState("Gig Economy / Logistics Courier");
  const [employerName, setEmployerName] = useState("Chowdeck");
  const [customEmployerName, setCustomEmployerName] = useState("");
  const [joinedDate, setJoinedDate] = useState("March 2023");
  const [employerAddress, setEmployerAddress] = useState("Ikeja Central Hub, Lagos");

  // Dashboard Screenshot Upload
  const [dashboardFile, setDashboardFile] = useState<UploadedFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Delivery Option
  const [deliveryType, setDeliveryType] = useState<"pickup" | "delivery_lagos" | "delivery_outside">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("Ikeja");
  const [deliveryState, setDeliveryState] = useState("Lagos");

  // Modals & Pickers
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [dobYear, setDobYear] = useState(1996);
  const [dobMonth, setDobMonth] = useState(9); // 0-indexed (9 = Oct)
  const [dobDay, setDobDay] = useState(14);
  const [showStatePicker, setShowStatePicker] = useState(false);

  // Step 1: Mono Financial
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [financial, setFinancial] = useState<any>(null);
  const [frequency, setFrequency] = useState("weekly");
  const [tenure, setTenure] = useState(12);

  // Step 2: Guarantors
  const [guarantors, setGuarantors] = useState<Guarantor[]>([
    { fullName: "", email: "", phone: "", relationship: "" },
    { fullName: "", email: "", phone: "", relationship: "" },
  ]);

  // Step 3: Agreement
  const [accepted, setAccepted] = useState(false);
  const draftKey = `@dandoev_bnpl_draft_${product.id}`;

  // Restore Draft
  useEffect(() => {
    AsyncStorage.getItem(draftKey)
      .then((raw) => {
        if (!raw) return;
        try {
          const draft = JSON.parse(raw);
          if (typeof draft.step === "number") setStep(draft.step);
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
          if (draft.employmentStatus) setEmploymentStatus(draft.employmentStatus);
          if (draft.employerName) setEmployerName(draft.employerName);
          if (draft.customEmployerName) setCustomEmployerName(draft.customEmployerName);
          if (draft.joinedDate) setJoinedDate(draft.joinedDate);
          if (draft.employerAddress) setEmployerAddress(draft.employerAddress);
          if (draft.dashboardFile) setDashboardFile(draft.dashboardFile);
          if (draft.address) setAddress(draft.address);
          if (draft.city) setCity(draft.city);
          if (draft.state) setState(draft.state);
          if (draft.deliveryType) setDeliveryType(draft.deliveryType);
          if (draft.deliveryAddress) setDeliveryAddress(draft.deliveryAddress);
          if (draft.deliveryCity) setDeliveryCity(draft.deliveryCity);
          if (draft.deliveryState) setDeliveryState(draft.deliveryState);
          if (draft.frequency) setFrequency(draft.frequency);
          if (draft.tenure) setTenure(draft.tenure);
          if (draft.guarantors) setGuarantors(draft.guarantors);
        } catch {
          /* discard corrupt local draft */
        }
      })
      .catch(() => {});
  }, [draftKey]);

  useEffect(() => {
    if (resumeStep !== null) setStep(resumeStep);
  }, [resumeStep]);

  // Save Draft on Change
  useEffect(() => {
    if (submittedLoan) return;
    AsyncStorage.setItem(
      draftKey,
      JSON.stringify({
        step,
        firstName,
        lastName,
        phone,
        dateOfBirth,
        gender,
        employmentStatus,
        employerName,
        customEmployerName,
        joinedDate,
        employerAddress,
        dashboardFile,
        address,
        city,
        state,
        deliveryType,
        deliveryAddress,
        deliveryCity,
        deliveryState,
        frequency,
        tenure,
        guarantors,
      }),
    ).catch(() => {});
  }, [
    draftKey,
    step,
    firstName,
    lastName,
    phone,
    dateOfBirth,
    gender,
    employmentStatus,
    employerName,
    customEmployerName,
    joinedDate,
    employerAddress,
    dashboardFile,
    address,
    city,
    state,
    deliveryType,
    deliveryAddress,
    deliveryCity,
    deliveryState,
    frequency,
    tenure,
    guarantors,
    submittedLoan,
  ]);

  const price = Number(product.price || 0);
  const downPayment = 0; // 0% initial deposit on commercial fleet
  const loanAmount = price;
  const monthly = Math.max(1, Math.round((loanAmount * 1.16) / tenure));
  const weekly = Math.round(monthly / 4);

  // Helper for Age Calculation
  const calculateAge = (year: number, month: number, day: number) => {
    const today = new Date();
    let age = today.getFullYear() - year;
    const m = today.getMonth() - month;
    if (m < 0 || (m === 0 && today.getDate() < day)) {
      age--;
    }
    return age;
  };

  const handleConfirmDob = () => {
    const formatted = `${dobYear}-${String(dobMonth + 1).padStart(2, "0")}-${String(dobDay).padStart(2, "0")}`;
    setDateOfBirth(formatted);
    setShowDobPicker(false);
  };

  // Upload Courier Dashboard Screenshot
  const handleUploadDashboard = () => {
    setIsUploading(true);
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*,.pdf";
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            setDashboardFile({
              name: file.name,
              uri: reader.result as string,
              size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
              mimeType: file.type,
            });
            setIsUploading(false);
          };
          reader.readAsDataURL(file);
        } else {
          setIsUploading(false);
        }
      };
      input.click();
    } else {
      // Mobile / simulated sample screenshot for instant testing
      setTimeout(() => {
        setIsUploading(false);
        setDashboardFile({
          name: `${employerName.toLowerCase()}_courier_dashboard.png`,
          uri: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80",
          size: "1.4 MB",
          mimeType: "image/png",
        });
      }, 700);
    }
  };

  const validateApplicant = () => {
    if (!firstName.trim() || !lastName.trim()) {
      return "Please enter your legal first and last name matching your ID.";
    }
    if (!/^\+?\d{10,15}$/.test(phone.replace(/[\s()-]/g, ""))) {
      return "Please enter a valid phone number (e.g. 08012345678).";
    }
    if (!dateOfBirth) {
      return "Please select your date of birth using the date picker.";
    }
    const [y, m, d] = dateOfBirth.split("-").map(Number);
    if (calculateAge(y, m - 1, d) < 18) {
      return "Applicant must be at least 18 years old to qualify for BNPL.";
    }
    if (!employmentStatus.trim()) {
      return "Please select your employment status.";
    }
    const finalEmployer = employerName === "Other" ? customEmployerName : employerName;
    if (!finalEmployer.trim()) {
      return "Please select or enter your employer / dispatch platform.";
    }
    if (!address.trim() || !city.trim() || !state.trim()) {
      return "Please complete your residential address.";
    }
    if (
      deliveryType !== "pickup" &&
      (!deliveryAddress.trim() || !deliveryCity.trim() || !deliveryState.trim())
    ) {
      return "Please complete your doorstep delivery address.";
    }
    return null;
  };

  const validateGuarantors = () =>
    guarantors.every(
      (g) =>
        g.fullName.trim().length >= 2 &&
        /^\+?\d{7,15}$/.test(g.phone.replace(/[\s()-]/g, "")) &&
        g.relationship.trim().length >= 2,
    )
      ? null
      : "Please enter both guarantors' names, valid phone numbers, and relationships.";

  const updateGuarantor = (
    index: number,
    key: keyof Guarantor,
    value: string,
  ) =>
    setGuarantors((items) =>
      items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    );

  const connectBank = async () => {
    setBusy(true);
    setError("");
    try {
      const session = await MobileApi.initiateMonoConnect(
        "dandoev://mono-connect-callback",
        token,
      );
      const result = await WebBrowser.openAuthSessionAsync(
        session.data.url,
        "dandoev://mono-connect-callback",
      );
      const callbackUrl = result.type === "success" ? result.url : undefined;
      const code = callbackUrl?.match(/[?&]code=([^&]+)/)?.[1];
      if (!code) {
        throw new Error("Bank connection window closed or cancelled. Please tap to retry.");
      }
      const linked = await MobileApi.completeMonoFinancial(
        decodeURIComponent(code),
        token,
        {
          tenureMonths: tenure,
          deductionFrequency: frequency,
          proposedMonthlyRepayment: monthly,
        },
      );
      setFinancial(linked.data);
      setBankName(linked.data.accountDetails?.bankName || bankName);
      setAccountNumber(linked.data.accountDetails?.accountNumber || accountNumber);
      setAccountName(linked.data.accountDetails?.accountName || accountName);
      setStep(1);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to complete bank verification.",
      );
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const finalEmployer = employerName === "Other" ? customEmployerName : employerName;
      const response = await MobileApi.applyForLoan(
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
          deliveryFee:
            deliveryType === "pickup"
              ? 0
              : deliveryType === "delivery_lagos"
                ? 20000
                : 50000,
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
          deliveryAddress:
            deliveryType === "pickup"
              ? "Lagos Central Pickup Hub"
              : deliveryAddress,
          deliveryCity: deliveryType === "pickup" ? "Ikeja" : deliveryCity,
          deliveryState: deliveryType === "pickup" ? "Lagos" : deliveryState,
          bankName,
          bankAccountNumber: accountNumber,
          bankAccountName: accountName,
          monoAccountId: financial?.accountId,
          monoMandateId: financial?.mandate?.id,
          monoMandateRef: financial?.mandate?.reference,
          monoMandateStatus: financial?.mandate?.status,
          agreementAccepted: true,
          agreementVersion: "bnpl-v1",
          guarantors,
          documents: dashboardFile
            ? [
                {
                  type: "work_id",
                  fileName: dashboardFile.name,
                  fileUrl: dashboardFile.uri,
                },
              ]
            : undefined,
        },
        token,
        applicationKey,
      );
      await AsyncStorage.removeItem(draftKey);
      setSubmittedLoan({
        loanId: response.loanId || `APP-${Date.now().toString(36).toUpperCase()}`,
        bikeName: product.name,
        loanAmount,
        tenure,
        frequency,
        monthly,
        guarantors,
        deliveryType,
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to submit your application.",
      );
    } finally {
      setBusy(false);
    }
  };

  // ==========================================
  // SUCCESS CONFIRMATION VIEW
  // ==========================================
  if (submittedLoan) {
    const shortRef = submittedLoan.loanId.slice(0, 8).toUpperCase();
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.successHeroCard}>
          <View style={styles.successIconBubble}>
            <CheckCircle2 size={42} color="#10B981" />
          </View>
          <Text style={styles.successEyebrow}>APPLICATION SUBMITTED</Text>
          <Text style={styles.successTitle}>Underwriting In Progress! 🎉</Text>
          <Text style={styles.successSub}>
            Your application for{" "}
            <Text style={{ fontWeight: "800", color: "#0A154F" }}>
              {submittedLoan.bikeName}
            </Text>{" "}
            has been received. Both nominated guarantors have been notified.
          </Text>

          <View style={styles.refPill}>
            <Text style={styles.refPillLabel}>REF:</Text>
            <Text style={styles.refPillVal}>{shortRef}</Text>
          </View>
        </View>

        {/* Guarantors Dispatched */}
        <View style={styles.card}>
          <View style={styles.cardHeaderWithIcon}>
            <Users size={18} color="#2E3192" />
            <Text style={styles.cardTitle}>Guarantor Invitations Dispatched</Text>
          </View>
          <Text style={styles.guarantorNote}>
            Verification links sent to your 2 nominated guarantors:
          </Text>
          {submittedLoan.guarantors.map((g, idx) => (
            <View key={idx} style={styles.guarantorItem}>
              <View style={styles.guarantorAvatar}>
                <Text style={styles.guarantorInitial}>
                  {g.fullName[0]?.toUpperCase() || "G"}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.guarantorName}>
                  {g.fullName} ({g.relationship})
                </Text>
                <Text style={styles.guarantorPhone}>{g.phone}</Text>
              </View>
              <View style={styles.guarantorBadge}>
                <Clock size={12} color="#D97706" />
                <Text style={styles.guarantorBadgeText}>Invited</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.primary}
          onPress={onComplete}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryText}>View Application in My Plans</Text>
          <ChevronRight size={18} color="#0A154F" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={onBack}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryBtnText}>Back to Product Catalog</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ==========================================
  // MULTI-STEP WIZARD VIEW
  // ==========================================
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Back Button */}
      <TouchableOpacity onPress={onBack} style={styles.back}>
        <ArrowLeft size={18} color="#0A154F" />
        <Text style={styles.backText}>Back to Catalog</Text>
      </TouchableOpacity>

      {/* Hero Header */}
      <View style={styles.hero}>
        <View style={styles.heroBadgeRow}>
          <View style={styles.heroBadge}>
            <ShieldCheck size={14} color="#0A154F" />
            <Text style={styles.heroBadgeText}>OFFICIAL BNPL APPLICATION</Text>
          </View>
          <View style={styles.zeroDepositBadge}>
            <Sparkles size={12} color="#047857" />
            <Text style={styles.zeroDepositText}>0% Initial Deposit</Text>
          </View>
        </View>
        <Text style={styles.title}>{product.name}</Text>
        <Text style={styles.body}>
          Flexible weekly rent-to-own plan • Estimated ₦{weekly.toLocaleString()}/week
        </Text>
      </View>

      {/* Stepper (Web-aligned 4 core phases) */}
      <View style={styles.steps}>
        {[
          { label: "Personal & Gig", num: 1 },
          { label: "Bank & Finances", num: 2 },
          { label: "Guarantors", num: 3 },
          { label: "Agreement", num: 4 },
        ].map((s, i) => (
          <View key={s.label} style={styles.step}>
            <View style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotCompleted]}>
              <Text style={[styles.dotText, i < step && styles.dotTextCompleted]}>
                {i < step ? "✓" : s.num}
              </Text>
            </View>
            <Text style={[styles.stepLabel, i === step && styles.stepLabelActive]}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Error Alert */}
      {error ? (
        <View style={styles.errorCard}>
          <View style={styles.errorHeader}>
            <AlertCircle size={18} color="#DC2626" />
            <Text style={styles.errorTitle}>Please check the form</Text>
          </View>
          <Text style={styles.errorBody}>{error}</Text>
          <TouchableOpacity style={styles.errorDismissBtn} onPress={() => setError("")}>
            <Text style={styles.errorDismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* ========================================================= */}
      {/* STEP 0: APPLICANT DETAILS, GIG PLATFORM & DASHBOARD UPLOAD */}
      {/* ========================================================= */}
      {step === 0 && (
        <>
          {/* 1. PERSONAL INFORMATION */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBubble}>
                <Text style={{ fontSize: 16 }}>👤</Text>
              </View>
              <View>
                <Text style={styles.cardTitle}>Personal Information</Text>
                <Text style={styles.cardSubtitle}>Must match your government-issued ID (NIN / Driver's License)</Text>
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

            {/* DATE OF BIRTH WITH MODERN PICKER */}
            <Text style={styles.inputLabel}>Date of Birth (18+ Required)</Text>
            <TouchableOpacity
              style={styles.datePickerTrigger}
              onPress={() => setShowDobPicker(true)}
              activeOpacity={0.8}
            >
              <View style={styles.datePickerTriggerLeft}>
                <Calendar size={18} color="#2E3192" />
                <Text style={[styles.datePickerText, !dateOfBirth && styles.datePickerPlaceholder]}>
                  {dateOfBirth
                    ? `${dobDay} ${MONTHS[dobMonth]} ${dobYear} (${calculateAge(dobYear, dobMonth, dobDay)} years)`
                    : "Select your date of birth"}
                </Text>
              </View>
              <ChevronDown size={16} color="#64748B" />
            </TouchableOpacity>

            {/* Gender Selector */}
            <Text style={styles.inputLabel}>Gender</Text>
            <View style={styles.choiceRow}>
              {(["Male", "Female", "Other"] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.choice, gender === g && styles.choiceActive]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.choiceText, gender === g && styles.choiceTextActive]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 2. RESIDENTIAL ADDRESS */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBubble}>
                <MapPin size={18} color="#2E3192" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Residential Address</Text>
                <Text style={styles.cardSubtitle}>Your current residence in Nigeria</Text>
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
                  placeholder="e.g. Yaba / Ikeja"
                  placeholderTextColor="#94A3B8"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>State</Text>
                <TouchableOpacity
                  style={styles.selectTrigger}
                  onPress={() => setShowStatePicker(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.selectTriggerText}>{state || "Select state"}</Text>
                  <ChevronDown size={14} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 3. EMPLOYMENT & GIG PLATFORM DETAILS (NO MONTHLY INCOME) */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBubble}>
                <Briefcase size={18} color="#2E3192" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Employment & Dispatch Work</Text>
                <Text style={styles.cardSubtitle}>Select your primary occupation category</Text>
              </View>
            </View>

            {/* Employment Status Options */}
            <Text style={styles.inputLabel}>Employment Status</Text>
            <View style={styles.employmentOptionsList}>
              {EMPLOYMENT_STATUS_OPTIONS.map((opt) => {
                const isSelected = employmentStatus === opt.label;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.employmentCard, isSelected && styles.employmentCardActive]}
                    onPress={() => setEmploymentStatus(opt.label)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.employmentCardLeft}>
                      <Text style={{ fontSize: 18 }}>{opt.icon}</Text>
                      <View>
                        <Text style={[styles.employmentCardLabel, isSelected && styles.employmentCardLabelActive]}>
                          {opt.label}
                        </Text>
                        {opt.badge && (
                          <View style={styles.optBadge}>
                            <Text style={styles.optBadgeText}>{opt.badge}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Courier / Gig Platform Selector */}
            <Text style={[styles.inputLabel, { marginTop: 14 }]}>
              Delivery / Dispatch Platform
            </Text>
            <Text style={styles.helperText}>Select the platform you currently ride or work with:</Text>
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
                <Text style={styles.inputLabel}>Company / Platform Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter company or logistics hub name"
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

            {/* 4. APPLICANT DASHBOARD UPLOAD (Rider Screenshot) */}
            <View style={styles.dashboardUploadSection}>
              <Text style={styles.inputLabel}>Upload Courier / Rider App Dashboard</Text>
              <Text style={styles.helperText}>
                Screenshot of your Chowdeck, Bolt, Glovo, or InDrive rider profile showing your total deliveries, ratings, or weekly activity.
              </Text>

              {dashboardFile ? (
                <View style={styles.uploadedCard}>
                  <View style={styles.uploadedLeft}>
                    {dashboardFile.mimeType?.includes("image") || dashboardFile.uri.startsWith("http") || dashboardFile.uri.startsWith("data:image") ? (
                      <Image source={{ uri: dashboardFile.uri }} style={styles.uploadedThumb} resizeMode="cover" />
                    ) : (
                      <View style={styles.uploadedIconFallback}>
                        <FileText size={24} color="#2E3192" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.uploadedFileName} numberOfLines={1}>
                        {dashboardFile.name}
                      </Text>
                      <View style={styles.uploadedBadgeRow}>
                        <CheckCircle2 size={12} color="#10B981" />
                        <Text style={styles.uploadedBadgeText}>
                          Ready for Underwriting {dashboardFile.size ? `• ${dashboardFile.size}` : ""}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.uploadedActions}>
                    <TouchableOpacity style={styles.uploadedChangeBtn} onPress={handleUploadDashboard}>
                      <Text style={styles.uploadedChangeBtnText}>Replace</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.uploadedRemoveBtn} onPress={() => setDashboardFile(null)}>
                      <Trash2 size={16} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadDropzone}
                  onPress={handleUploadDashboard}
                  disabled={isUploading}
                  activeOpacity={0.7}
                >
                  {isUploading ? (
                    <ActivityIndicator color="#0A154F" />
                  ) : (
                    <>
                      <View style={styles.uploadIconCircle}>
                        <BarChart3 size={24} color="#2E3192" />
                      </View>
                      <Text style={styles.uploadTitle}>Tap to upload rider dashboard screenshot</Text>
                      <Text style={styles.uploadSubtitle}>PNG, JPG, or PDF (From Chowdeck, Bolt, Glovo, InDrive)</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* 5. DELIVERY PREFERENCE */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBubble}>
                <ShoppingBag size={18} color="#2E3192" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Vehicle Handover Option</Text>
                <Text style={styles.cardSubtitle}>Select where to receive your commercial e-bike</Text>
              </View>
            </View>

            <View style={styles.choiceRow}>
              {(
                [
                  { id: "pickup", label: "Central Hub Pickup", sub: "Free (Ikeja, Lagos)" },
                  { id: "delivery_lagos", label: "Lagos Delivery", sub: "+₦20,000" },
                  { id: "delivery_outside", label: "Outside Lagos", sub: "+₦50,000" },
                ] as const
              ).map((opt) => {
                const isSelected = deliveryType === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.deliveryChoice, isSelected && styles.deliveryChoiceActive]}
                    onPress={() => setDeliveryType(opt.id)}
                  >
                    <Text style={[styles.deliveryChoiceTitle, isSelected && styles.deliveryChoiceTitleActive]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.deliveryChoiceSub, isSelected && styles.deliveryChoiceSubActive]}>
                      {opt.sub}
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
                  placeholder="Street and landmark address"
                  placeholderTextColor="#94A3B8"
                  value={deliveryAddress}
                  onChangeText={setDeliveryAddress}
                />
                <View style={styles.rowTwoCol}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Delivery City</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="City"
                      placeholderTextColor="#94A3B8"
                      value={deliveryCity}
                      onChangeText={setDeliveryCity}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Delivery State</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="State"
                      placeholderTextColor="#94A3B8"
                      value={deliveryState}
                      onChangeText={setDeliveryState}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={styles.primary}
            onPress={() => {
              const msg = validateApplicant();
              if (msg) {
                setError(msg);
              } else {
                setError("");
                onRequestKyc();
              }
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryText}>Continue to Identity Verification</Text>
            <ChevronRight size={18} color="#0A154F" />
          </TouchableOpacity>
        </>
      )}

      {/* ========================================================= */}
      {/* STEP 1: MONO BANK & FINANCIAL VERIFICATION */}
      {/* ========================================================= */}
      {step === 1 && (
        <>
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBubble}>
                <Building size={18} color="#2E3192" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Mono Financial Verification</Text>
                <Text style={styles.cardSubtitle}>
                  Link your primary bank account for weekly repayments
                </Text>
              </View>
            </View>

            <Text style={styles.body}>
              We connect securely with Mono to verify your bank statement and set up an automated weekly direct debit mandate.
            </Text>

            {financial ? (
              <View style={styles.verifiedBox}>
                <CheckCircle2 size={18} color="#10B981" />
                <Text style={styles.verifiedText}>
                  Bank & Mono assessment linked ({bankName || "Verified Account"})
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.primary}
                onPress={() => void connectBank()}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#0A154F" />
                ) : (
                  <>
                    <Link2 size={18} color="#0A154F" />
                    <Text style={styles.primaryText}>Connect Bank with Mono</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Financing Terms & Repayment</Text>
            <Text style={styles.inputLabel}>Tenure Duration (Months)</Text>
            <View style={styles.choiceRow}>
              {[6, 12, 18].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.choice, tenure === t && styles.choiceActive]}
                  onPress={() => setTenure(t)}
                >
                  <Text style={[styles.choiceText, tenure === t && styles.choiceTextActive]}>
                    {t} Months
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { marginTop: 14 }]}>Deduction Frequency</Text>
            <View style={styles.choiceRow}>
              {["weekly", "monthly"].map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.choice, frequency === f && styles.choiceActive]}
                  onPress={() => setFrequency(f)}
                >
                  <Text style={[styles.choiceText, frequency === f && styles.choiceTextActive]}>
                    {f.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {financial && (
            <TouchableOpacity
              style={styles.primary}
              onPress={() => {
                setError("");
                setStep(2);
              }}
            >
              <Text style={styles.primaryText}>Continue to Guarantors</Text>
              <ChevronRight size={18} color="#0A154F" />
            </TouchableOpacity>
          )}
        </>
      )}

      {/* ========================================================= */}
      {/* STEP 2: GUARANTORS */}
      {/* ========================================================= */}
      {step === 2 && (
        <>
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconBubble}>
                <Users size={18} color="#2E3192" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Guarantor Information</Text>
                <Text style={styles.cardSubtitle}>Two reputable guarantors (e.g. Colleague, Family, Union Leader)</Text>
              </View>
            </View>
          </View>

          {guarantors.map((g, i) => (
            <View key={i} style={styles.card}>
              <Text style={styles.cardTitle}>Guarantor {i + 1}</Text>
              {(["fullName", "email", "phone", "relationship"] as const).map((key) => (
                <TextInput
                  key={key}
                  style={styles.input}
                  placeholder={
                    key === "fullName"
                      ? "Full name"
                      : key === "email"
                        ? "Email address"
                        : key === "phone"
                          ? "Phone number (e.g. 080...)"
                          : "Relationship (e.g. Colleague, Sibling, Leader)"
                  }
                  placeholderTextColor="#94A3B8"
                  value={g[key]}
                  onChangeText={(v) => updateGuarantor(i, key, v)}
                  autoCapitalize={key === "email" ? "none" : "words"}
                />
              ))}
            </View>
          ))}

          <TouchableOpacity
            style={styles.primary}
            onPress={() => {
              const msg = validateGuarantors();
              if (msg) setError(msg);
              else {
                setError("");
                setStep(3);
              }
            }}
          >
            <Text style={styles.primaryText}>Review Agreement & Submit</Text>
            <ChevronRight size={18} color="#0A154F" />
          </TouchableOpacity>
        </>
      )}

      {/* ========================================================= */}
      {/* STEP 3: AGREEMENT & SUBMISSION */}
      {/* ========================================================= */}
      {step === 3 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Agreement & Final Submission</Text>
          <Text style={styles.body}>
            I confirm that my personal information, employment/gig details, and uploaded dashboard screenshot are authentic. I authorize DandoEv to verify my credit standing, contact my guarantors, and initiate scheduled weekly deductions via Mono upon vehicle delivery.
          </Text>

          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setAccepted(!accepted)}
            activeOpacity={0.8}
          >
            <View style={[styles.box, accepted && styles.boxChecked]}>
              {accepted && <Text style={styles.check}>✓</Text>}
            </View>
            <Text style={[styles.body, { marginTop: 0, flex: 1 }]}>
              I accept the DandoEv Commercial E-Bike BNPL Agreement (bnpl-v1)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primary, (!accepted || busy) && styles.disabled]}
            onPress={() => void submit()}
            disabled={!accepted || busy}
          >
            {busy ? (
              <ActivityIndicator color="#0A154F" />
            ) : (
              <>
                <Text style={styles.primaryText}>Submit Application</Text>
                <CheckCircle2 size={18} color="#0A154F" />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ========================================================= */}
      {/* DATE OF BIRTH PICKER MODAL */}
      {/* ========================================================= */}
      <Modal visible={showDobPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Date of Birth</Text>
                <Text style={styles.modalSubtitle}>Must be at least 18 years old to apply</Text>
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
            <Text style={styles.pickerSectionLabel}>Year of Birth</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
              {Array.from({ length: 50 }, (_, i) => 2008 - i).map((yr) => (
                <TouchableOpacity
                  key={yr}
                  style={[styles.chipItem, dobYear === yr && styles.chipItemActive]}
                  onPress={() => setDobYear(yr)}
                >
                  <Text style={[styles.chipText, dobYear === yr && styles.chipTextActive]}>
                    {yr}
                  </Text>
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
                  <Text style={[styles.dayChipText, dobDay === d && styles.dayChipTextActive]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.primary} onPress={handleConfirmDob}>
              <Text style={styles.primaryText}>Confirm Date of Birth</Text>
              <Check size={18} color="#0A154F" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* NIGERIAN STATE PICKER MODAL */}
      {/* ========================================================= */}
      <Modal visible={showStatePicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "75%" }]}>
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
                  style={[styles.stateItem, state === st && styles.stateItemActive]}
                  onPress={() => {
                    setState(st);
                    setShowStatePicker(false);
                  }}
                >
                  <Text style={[styles.stateItemText, state === st && styles.stateItemTextActive]}>
                    {st}
                  </Text>
                  {state === st && <Check size={16} color="#2E3192" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F6F7FC" },
  content: { padding: 18, paddingBottom: 50 },
  back: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 },
  backText: { color: "#0A154F", fontWeight: "700", fontSize: 13 },

  hero: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  heroBadgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  heroBadgeText: { color: "#0A154F", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  zeroDepositBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  zeroDepositText: { color: "#047857", fontSize: 11, fontWeight: "700" },
  title: { color: "#0A154F", fontSize: 20, fontWeight: "900", marginBottom: 4 },
  body: { color: "#475569", fontSize: 13, lineHeight: 19 },

  // Stepper
  steps: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  step: { alignItems: "center", gap: 5, flex: 1 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  dotActive: { backgroundColor: "#0A154F" },
  dotCompleted: { backgroundColor: "#10B981" },
  dotText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  dotTextCompleted: { color: "#FFFFFF", fontWeight: "900" },
  stepLabel: { color: "#64748B", fontSize: 10, fontWeight: "600", textAlign: "center" },
  stepLabelActive: { color: "#0A154F", fontWeight: "800" },

  // Cards & Sections
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  sectionIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { color: "#0A154F", fontSize: 16, fontWeight: "800" },
  cardSubtitle: { color: "#64748B", fontSize: 12, marginTop: 1 },
  cardHeaderWithIcon: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },

  // Form Inputs
  inputLabel: { color: "#0A154F", fontSize: 12, fontWeight: "700", marginTop: 12, marginBottom: 6 },
  helperText: { color: "#64748B", fontSize: 12, marginBottom: 8, lineHeight: 17 },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#0A154F",
    backgroundColor: "#F8FAFC",
    fontSize: 14,
    fontWeight: "500",
  },
  rowTwoCol: { flexDirection: "row", gap: 10 },

  // Date Picker Trigger
  datePickerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: "#F8FAFC",
  },
  datePickerTriggerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  datePickerText: { color: "#0A154F", fontSize: 14, fontWeight: "600" },
  datePickerPlaceholder: { color: "#94A3B8", fontWeight: "400" },

  // State Selector Trigger
  selectTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: "#F8FAFC",
  },
  selectTriggerText: { color: "#0A154F", fontSize: 14, fontWeight: "600" },

  // Choices & Options
  choiceRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  choice: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  choiceActive: { backgroundColor: "#EEF2FF", borderColor: "#2E3192" },
  choiceText: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  choiceTextActive: { color: "#2E3192" },

  // Delivery Choices
  deliveryChoice: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  deliveryChoiceActive: { backgroundColor: "#EEF2FF", borderColor: "#2E3192" },
  deliveryChoiceTitle: { color: "#64748B", fontSize: 11, fontWeight: "700", textAlign: "center" },
  deliveryChoiceTitleActive: { color: "#2E3192", fontWeight: "800" },
  deliveryChoiceSub: { color: "#94A3B8", fontSize: 10, marginTop: 2, textAlign: "center" },
  deliveryChoiceSubActive: { color: "#047857", fontWeight: "700" },

  // Employment Options
  employmentOptionsList: { gap: 8, marginTop: 4 },
  employmentCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#F8FAFC",
  },
  employmentCardActive: { borderColor: "#2E3192", backgroundColor: "#EEF2FF" },
  employmentCardLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  employmentCardLabel: { color: "#0A154F", fontSize: 13, fontWeight: "700" },
  employmentCardLabelActive: { color: "#2E3192" },
  optBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  optBadgeText: { color: "#92400E", fontSize: 10, fontWeight: "700" },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: { borderColor: "#2E3192" },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#2E3192" },

  // Gig Platform Chips
  platformGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  platformChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },
  platformChipActive: { backgroundColor: "#0A154F", borderColor: "#0A154F" },
  platformChipText: { color: "#0A154F", fontSize: 12, fontWeight: "600" },
  platformChipTextActive: { color: "#FFFFFF", fontWeight: "700" },

  // Dashboard Screenshot Upload Section
  dashboardUploadSection: { marginTop: 18, borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 14 },
  uploadDropzone: {
    borderWidth: 2,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    marginTop: 6,
  },
  uploadIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  uploadTitle: { color: "#0A154F", fontSize: 13, fontWeight: "700", textAlign: "center" },
  uploadSubtitle: { color: "#64748B", fontSize: 11, marginTop: 3, textAlign: "center" },

  // Uploaded Card
  uploadedCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#ECFDF5",
    marginTop: 6,
  },
  uploadedLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  uploadedThumb: { width: 44, height: 44, borderRadius: 8 },
  uploadedIconFallback: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadedFileName: { color: "#0A154F", fontSize: 13, fontWeight: "700" },
  uploadedBadgeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  uploadedBadgeText: { color: "#047857", fontSize: 11, fontWeight: "600" },
  uploadedActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  uploadedChangeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  uploadedChangeBtnText: { color: "#0A154F", fontSize: 11, fontWeight: "700" },
  uploadedRemoveBtn: { padding: 6 },

  // Buttons
  primary: {
    backgroundColor: "#52E0C1",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    marginBottom: 12,
    shadowColor: "#52E0C1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  primaryText: { color: "#0A154F", fontWeight: "900", fontSize: 15 },
  secondaryBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    marginBottom: 20,
  },
  secondaryBtnText: { color: "#64748B", fontWeight: "700", fontSize: 14 },
  disabled: { opacity: 0.5 },

  // Verified Box
  verifiedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  verifiedText: { color: "#065F46", fontWeight: "700", fontSize: 13 },

  // Error Alert Banner
  errorCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  errorHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  errorTitle: { color: "#991B1B", fontWeight: "800", fontSize: 13 },
  errorBody: { color: "#B91C1C", fontSize: 12, lineHeight: 17 },
  errorDismissBtn: { alignSelf: "flex-end", marginTop: 6 },
  errorDismissText: { color: "#991B1B", fontWeight: "700", fontSize: 11 },

  // Agreement Checkbox
  checkbox: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 18 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  boxChecked: { backgroundColor: "#0A154F", borderColor: "#0A154F" },
  check: { color: "#FFFFFF", fontWeight: "900" },

  // Success Screen
  successHeroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  successIconBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  successEyebrow: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  successTitle: {
    color: "#0A154F",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  successSub: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 16,
  },
  refPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  refPillLabel: { color: "#64748B", fontSize: 11, fontWeight: "700" },
  refPillVal: { color: "#0A154F", fontSize: 12, fontWeight: "800" },
  guarantorNote: { color: "#64748B", fontSize: 12, marginBottom: 12 },
  guarantorItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  guarantorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  guarantorInitial: { color: "#2E3192", fontWeight: "800", fontSize: 14 },
  guarantorName: { color: "#0A154F", fontSize: 13, fontWeight: "700" },
  guarantorPhone: { color: "#64748B", fontSize: 12 },
  guarantorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  guarantorBadgeText: { color: "#92400E", fontSize: 11, fontWeight: "700" },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 21, 79, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: { color: "#0A154F", fontSize: 18, fontWeight: "800" },
  modalSubtitle: { color: "#64748B", fontSize: 12, marginTop: 2 },
  modalCloseBtn: { padding: 6 },
  ageIndicatorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  ageIndicatorText: { color: "#047857", fontSize: 12, fontWeight: "700" },
  pickerSectionLabel: { color: "#0A154F", fontSize: 12, fontWeight: "800", marginTop: 10, marginBottom: 6 },
  horizontalChips: { flexDirection: "row", marginBottom: 6 },
  chipItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    marginRight: 6,
  },
  chipItemActive: { backgroundColor: "#0A154F" },
  chipText: { color: "#475569", fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: "#FFFFFF" },
  monthsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  monthCell: {
    width: "23%",
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  monthCellActive: { backgroundColor: "#0A154F" },
  monthCellText: { color: "#475569", fontSize: 12, fontWeight: "700" },
  monthCellTextActive: { color: "#FFFFFF" },
  dayChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  dayChipActive: { backgroundColor: "#0A154F" },
  dayChipText: { color: "#475569", fontSize: 12, fontWeight: "700" },
  dayChipTextActive: { color: "#FFFFFF" },

  // State Picker Modal Items
  stateItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  stateItemActive: { backgroundColor: "#F8FAFC" },
  stateItemText: { color: "#0A154F", fontSize: 14, fontWeight: "600" },
  stateItemTextActive: { color: "#2E3192", fontWeight: "800" },
});
