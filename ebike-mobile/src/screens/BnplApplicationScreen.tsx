import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  Link2,
  ShieldCheck,
  AlertCircle,
  Clock,
  Users,
  Check,
  FileCheck,
  ShoppingBag,
} from "lucide-react-native";
import { DemoProduct } from "../lib/demo-data";
import { MobileApi } from "../lib/api";

type Guarantor = {
  fullName: string;
  email: string;
  phone: string;
  relationship: string;
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

export default function BnplApplicationScreen({
  token,
  product,
  onBack,
  onComplete,
}: {
  token: string;
  product: DemoProduct;
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [employerName, setEmployerName] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [deliveryType, setDeliveryType] = useState<
    "pickup" | "delivery_lagos" | "delivery_outside"
  >("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryState, setDeliveryState] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [financial, setFinancial] = useState<any>(null);
  const [frequency, setFrequency] = useState("weekly");
  const [tenure, setTenure] = useState(12);
  const [guarantors, setGuarantors] = useState<Guarantor[]>([
    { fullName: "", email: "", phone: "", relationship: "" },
    { fullName: "", email: "", phone: "", relationship: "" },
  ]);
  const [accepted, setAccepted] = useState(false);
  const draftKey = `@dandoev_bnpl_draft_${product.id}`;

  useEffect(() => {
    AsyncStorage.getItem(draftKey)
      .then((raw) => {
        if (!raw) return;
        try {
          const draft = JSON.parse(raw);
          if (typeof draft.step === "number") setStep(draft.step);
          setFirstName(draft.firstName || "");
          setLastName(draft.lastName || "");
          setPhone(draft.phone || "");
          setDateOfBirth(draft.dateOfBirth || "");
          setEmploymentStatus(draft.employmentStatus || "");
          setEmployerName(draft.employerName || "");
          setMonthlyIncome(draft.monthlyIncome || "");
          setAddress(draft.address || "");
          setCity(draft.city || "");
          setState(draft.state || "");
          setDeliveryType(draft.deliveryType || "pickup");
          setDeliveryAddress(draft.deliveryAddress || "");
          setDeliveryCity(draft.deliveryCity || "");
          setDeliveryState(draft.deliveryState || "");
          setFrequency(draft.frequency || "weekly");
          setTenure(draft.tenure || 12);
          setGuarantors(draft.guarantors || guarantors);
        } catch {
          /* discard a corrupt local draft */
        }
      })
      .catch(() => {});
  }, [draftKey]);

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
        employmentStatus,
        employerName,
        monthlyIncome,
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
    employmentStatus,
    employerName,
    monthlyIncome,
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
  const downPayment = Math.round(price * 0.2);
  const loanAmount = price - downPayment;
  const monthly = Math.max(1, Math.round((loanAmount * 1.16) / tenure));

  const validateApplicant = () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !/^\+?\d{10,15}$/.test(phone.replace(/[\s()-]/g, ""))
    )
      return "Enter your full name and a valid phone number.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth))
      return "Enter your date of birth as YYYY-MM-DD.";
    if (
      !employmentStatus.trim() ||
      !employerName.trim() ||
      Number(monthlyIncome) <= 0
    )
      return "Complete your employment and monthly income details.";
    if (!address.trim() || !city.trim() || !state.trim())
      return "Complete your residential address.";
    if (
      deliveryType !== "pickup" &&
      (!deliveryAddress.trim() || !deliveryCity.trim() || !deliveryState.trim())
    )
      return "Complete your delivery address.";
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
      : "Enter both guarantors' names, valid phone numbers, and relationships.";

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
      if (!code)
        throw new Error("Bank connection window closed or cancelled. Please tap to retry.");
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
      setAccountNumber(
        linked.data.accountDetails?.accountNumber || accountNumber,
      );
      setAccountName(linked.data.accountDetails?.accountName || accountName);
      setStep(1);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to complete bank verification.",
      );
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await MobileApi.applyForLoan(
        {
          bikeId: product.id,
          bikeName: product.name,
          bikePrice: price,
          downPayment,
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
          employmentStatus,
          employerName,
          monthlyIncome: Number(monthlyIncome),
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

  const fields = (g: Guarantor, i: number) => (
    <View style={styles.card}>
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
                  : "Relationship (e.g. Colleague, Sibling)"
          }
          placeholderTextColor="#94A3B8"
          value={g[key]}
          onChangeText={(v) => updateGuarantor(i, key, v)}
          autoCapitalize={key === "email" ? "none" : "words"}
        />
      ))}
    </View>
  );

  // ==========================================
  // COMPLETE & SUCCESS SCREEN VIEW
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
            Your application for <Text style={{ fontWeight: '800', color: '#0A154F' }}>{submittedLoan.bikeName}</Text> has been received and queued for credit assessment.
          </Text>

          <View style={styles.refPill}>
            <Text style={styles.refPillLabel}>APPLICATION ID:</Text>
            <Text style={styles.refPillVal}>#{shortRef}</Text>
          </View>
        </View>

        {/* Plan Overview Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderWithIcon}>
            <FileCheck size={18} color="#2E3192" />
            <Text style={styles.cardTitle}>Approved Financing Terms</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Vehicle Model</Text>
            <Text style={styles.reviewVal}>{submittedLoan.bikeName}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Financed Principal</Text>
            <Text style={styles.reviewVal}>₦{submittedLoan.loanAmount.toLocaleString()}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Repayment Cadence</Text>
            <Text style={[styles.reviewVal, { color: '#2E3192', fontWeight: '800' }]}>
              ₦{submittedLoan.monthly.toLocaleString()} / {submittedLoan.frequency}
            </Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Tenure Duration</Text>
            <Text style={styles.reviewVal}>{submittedLoan.tenure} Months</Text>
          </View>
          <View style={[styles.reviewRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.reviewLabel}>Fulfillment Method</Text>
            <Text style={styles.reviewVal}>
              {submittedLoan.deliveryType === 'pickup' ? 'Hub Pickup (Lagos Central)' : 'Doorstep Courier'}
            </Text>
          </View>
        </View>

        {/* Guarantor Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderWithIcon}>
            <Users size={18} color="#2E3192" />
            <Text style={styles.cardTitle}>Guarantor Invitations Dispatched</Text>
          </View>
          <Text style={styles.guarantorNote}>
            We have sent verification SMS & email links to your 2 nominated guarantors:
          </Text>
          {submittedLoan.guarantors.map((g, idx) => (
            <View key={idx} style={styles.guarantorItem}>
              <View style={styles.guarantorAvatar}>
                <Text style={styles.guarantorInitial}>{g.fullName[0]?.toUpperCase() || 'G'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.guarantorName}>{g.fullName} ({g.relationship})</Text>
                <Text style={styles.guarantorPhone}>{g.phone}</Text>
              </View>
              <View style={styles.guarantorBadge}>
                <Clock size={12} color="#D97706" />
                <Text style={styles.guarantorBadgeText}>Invited</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Next Steps Journey */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What Happens Next?</Text>
          <View style={styles.timelineList}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineIconDot, styles.timelineIconDotDone]}>
                <Check size={12} color="#FFFFFF" strokeWidth={3} />
              </View>
              <View style={styles.timelineBody}>
                <Text style={styles.timelineTitle}>1. Application Logged</Text>
                <Text style={styles.timelineText}>Your bank statement and profile have been securely synchronized with Mono.</Text>
              </View>
            </View>

            <View style={styles.timelineItem}>
              <View style={[styles.timelineIconDot, styles.timelineIconDotActive]}>
                <Text style={styles.timelineDotNumber}>2</Text>
              </View>
              <View style={styles.timelineBody}>
                <Text style={styles.timelineTitle}>2. Guarantor Digital Sign-Off</Text>
                <Text style={styles.timelineText}>Remind both guarantors to click their invite link to verify their details.</Text>
              </View>
            </View>

            <View style={styles.timelineItem}>
              <View style={styles.timelineIconDot}>
                <Text style={styles.timelineDotNumber}>3</Text>
              </View>
              <View style={styles.timelineBody}>
                <Text style={styles.timelineTitle}>3. Credit Underwriter Decision</Text>
                <Text style={styles.timelineText}>Our operations risk team approves within 24 hours.</Text>
              </View>
            </View>

            <View style={[styles.timelineItem, { borderLeftWidth: 0, paddingBottom: 0 }]}>
              <View style={styles.timelineIconDot}>
                <Text style={styles.timelineDotNumber}>4</Text>
              </View>
              <View style={styles.timelineBody}>
                <Text style={styles.timelineTitle}>4. Vehicle Handover & Keys</Text>
                <Text style={styles.timelineText}>Pick up your bike at the Ikeja Central Hub or receive dispatch delivery.</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={styles.primary} onPress={onComplete} activeOpacity={0.85}>
          <Text style={styles.primaryText}>View Application in My Plans</Text>
          <ChevronRight size={18} color="#0A154F" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={onBack} activeOpacity={0.85}>
          <Text style={styles.secondaryBtnText}>Back to Product Catalog</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ==========================================
  // MULTI-STEP WIZARD FORM VIEW
  // ==========================================
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack} style={styles.back}>
        <ArrowLeft size={18} color="#102152" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
      <View style={styles.hero}>
        <ShieldCheck size={24} color="#117F78" />
        <Text style={styles.eyebrow}>BNPL APPLICATION</Text>
        <Text style={styles.title}>{product.name}</Text>
        <Text style={styles.body}>
          Complete each secure step before submitting your application.
        </Text>
      </View>
      <View style={styles.steps}>
        {["Your details", "Bank & finances", "Guarantors", "Agreement"].map(
          (label, i) => (
            <View key={label} style={styles.step}>
              <View style={[styles.dot, i <= step && styles.dotActive]}>
                <Text style={styles.dotText}>{i < step ? "✓" : i + 1}</Text>
              </View>
              <Text style={styles.stepLabel}>{label}</Text>
            </View>
          ),
        )}
      </View>

      {/* Styled Error & Failure Alert Banner */}
      {error ? (
        <View style={styles.errorCard}>
          <View style={styles.errorHeader}>
            <AlertCircle size={20} color="#DC2626" />
            <Text style={styles.errorTitle}>Application Attention Needed</Text>
          </View>
          <Text style={styles.errorBody}>{error}</Text>
          <TouchableOpacity
            style={styles.errorDismissBtn}
            onPress={() => setError("")}
            activeOpacity={0.7}
          >
            <Text style={styles.errorDismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {step === 0 && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Applicant information</Text>
            {[
              [firstName, setFirstName, "First name"],
              [lastName, setLastName, "Last name"],
              [phone, setPhone, "Phone number"],
              [dateOfBirth, setDateOfBirth, "Date of birth (YYYY-MM-DD)"],
              [employmentStatus, setEmploymentStatus, "Employment status"],
              [employerName, setEmployerName, "Employer name"],
              [monthlyIncome, setMonthlyIncome, "Monthly income"],
            ].map(([value, setter, placeholder]) => (
              <TextInput
                key={placeholder as string}
                style={styles.input}
                placeholder={placeholder as string}
                placeholderTextColor="#94A3B8"
                value={value as string}
                onChangeText={setter as (value: string) => void}
                keyboardType={
                  placeholder === "Monthly income" ? "number-pad" : "default"
                }
              />
            ))}
            <TextInput
              style={styles.input}
              placeholder="Residential address"
              placeholderTextColor="#94A3B8"
              value={address}
              onChangeText={setAddress}
            />
            <TextInput
              style={styles.input}
              placeholder="City"
              placeholderTextColor="#94A3B8"
              value={city}
              onChangeText={setCity}
            />
            <TextInput
              style={styles.input}
              placeholder="State"
              placeholderTextColor="#94A3B8"
              value={state}
              onChangeText={setState}
            />
            <Text style={[styles.cardTitle, { marginTop: 16 }]}>Delivery Option</Text>
            <View style={styles.choiceRow}>
              {(["pickup", "delivery_lagos", "delivery_outside"] as const).map(
                (option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.choice,
                      deliveryType === option && styles.choiceActive,
                    ]}
                    onPress={() => setDeliveryType(option)}
                  >
                    <Text style={styles.choiceText}>
                      {option === "pickup"
                        ? "Pickup"
                        : option === "delivery_lagos"
                          ? "Lagos delivery"
                          : "Outside Lagos"}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>
            {deliveryType !== "pickup" && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Delivery street address"
                  placeholderTextColor="#94A3B8"
                  value={deliveryAddress}
                  onChangeText={setDeliveryAddress}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Delivery city"
                  placeholderTextColor="#94A3B8"
                  value={deliveryCity}
                  onChangeText={setDeliveryCity}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Delivery state"
                  placeholderTextColor="#94A3B8"
                  value={deliveryState}
                  onChangeText={setDeliveryState}
                />
              </>
            )}
            <TouchableOpacity
              style={styles.primary}
              onPress={() => {
                const message = validateApplicant();
                if (message) setError(message);
                else {
                  setError("");
                  setStep(1);
                }
              }}
            >
              <Text style={styles.primaryText}>
                Continue to bank verification
              </Text>
              <ChevronRight size={18} color="#102152" />
            </TouchableOpacity>
          </View>
        </>
      )}

      {step === 1 && (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Mono financial verification</Text>
            <Text style={styles.body}>
              Link your bank securely with Mono. We use your statement and
              credit profile to assess affordability and set up repayment.
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
                  <ActivityIndicator color="#102152" />
                ) : (
                  <>
                    <Link2 size={18} color="#102152" />
                    <Text style={styles.primaryText}>
                      Connect bank with Mono
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Repayment preference</Text>
            <Text style={styles.fieldHint}>Tenure duration (months):</Text>
            <TextInput
              style={styles.input}
              placeholder="Tenure in months (12)"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              value={String(tenure)}
              onChangeText={(v) => setTenure(Number(v) || 12)}
            />
            <Text style={styles.fieldHint}>Deduction frequency:</Text>
            <TextInput
              style={styles.input}
              placeholder="Frequency: weekly"
              placeholderTextColor="#94A3B8"
              value={frequency}
              onChangeText={setFrequency}
            />
          </View>
          {financial && (
            <TouchableOpacity
              style={styles.primary}
              onPress={() => {
                setError("");
                setStep(2);
              }}
            >
              <Text style={styles.primaryText}>Continue to guarantors</Text>
              <ChevronRight size={18} color="#102152" />
            </TouchableOpacity>
          )}
        </>
      )}

      {step === 2 && (
        <>
          {fields(guarantors[0], 0)}
          {fields(guarantors[1], 1)}
          <TouchableOpacity
            style={styles.primary}
            onPress={() => {
              const message = validateGuarantors();
              if (message) setError(message);
              else {
                setError("");
                setStep(3);
              }
            }}
          >
            <Text style={styles.primaryText}>Review agreement</Text>
            <ChevronRight size={18} color="#102152" />
          </TouchableOpacity>
        </>
      )}

      {step === 3 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Agreement & submission</Text>
          <Text style={styles.body}>
            I confirm that my information is accurate and authorize DandoEv to
            assess this application, contact my guarantors, and use the verified
            Mono mandate for repayments if approved.
          </Text>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setAccepted(!accepted)}
          >
            <View style={[styles.box, accepted && styles.boxChecked]}>
              {accepted && <Text style={styles.check}>✓</Text>}
            </View>
            <Text style={[styles.body, { marginTop: 0 }]}>
              I accept the BNPL financing agreement (bnpl-v1)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primary, (!accepted || busy) && styles.disabled]}
            onPress={() => void submit()}
            disabled={!accepted || busy}
          >
            {busy ? (
              <ActivityIndicator color="#102152" />
            ) : (
              <>
                <Text style={styles.primaryText}>Submit BNPL application</Text>
                <ChevronRight size={18} color="#102152" />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F9FB" },
  content: { padding: 20, paddingBottom: 48 },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
  },
  backText: { color: "#102152", fontWeight: "700" },
  hero: {
    backgroundColor: "#DDF7F0",
    borderRadius: 22,
    padding: 22,
    marginBottom: 16,
  },
  eyebrow: {
    color: "#117F78",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 12,
  },
  title: { color: "#102152", fontSize: 24, fontWeight: "800", marginTop: 6 },
  body: {
    color: "#607384",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    flex: 1,
  },
  steps: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  step: { alignItems: "center", gap: 5 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  dotActive: { backgroundColor: "#117F78" },
  dotText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  stepLabel: { color: "#607384", fontSize: 11 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#DDE8ED",
  },
  cardTitle: {
    color: "#102152",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  cardHeaderWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  fieldHint: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: -4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D8E2E8",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginTop: 10,
    color: "#102152",
    backgroundColor: "#FAFCFD",
    fontSize: 14,
  },
  choiceRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  choice: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D8E2E8",
    borderRadius: 10,
    padding: 10,
  },
  choiceActive: { backgroundColor: "#DDF7F0", borderColor: "#117F78" },
  choiceText: {
    color: "#102152",
    fontSize: 11,
    textAlign: "center",
    fontWeight: "700",
  },
  primary: {
    backgroundColor: "#52E0C1",
    borderRadius: 15,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  primaryText: { color: "#102152", fontWeight: "800", fontSize: 15 },
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
  errorCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FECDD3",
  },
  errorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  errorTitle: { color: "#991B1B", fontWeight: "800", fontSize: 14 },
  errorBody: { color: "#B91C1C", fontSize: 13, lineHeight: 18 },
  errorDismissBtn: { alignSelf: "flex-end", marginTop: 8 },
  errorDismissText: { color: "#991B1B", fontWeight: "700", fontSize: 12 },
  checkbox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 18,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#AABBC5",
    alignItems: "center",
    justifyContent: "center",
  },
  boxChecked: { backgroundColor: "#117F78", borderColor: "#117F78" },
  check: { color: "#FFFFFF", fontWeight: "800" },
  disabled: { opacity: 0.5 },

  // Success Screen Styles
  successHeroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#DDE8ED",
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
  reviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  reviewLabel: { color: "#64748B", fontSize: 13 },
  reviewVal: { color: "#0A154F", fontSize: 13, fontWeight: "700" },
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
  timelineList: { marginTop: 6 },
  timelineItem: {
    flexDirection: "row",
    gap: 14,
    paddingLeft: 4,
    paddingBottom: 16,
    borderLeftWidth: 2,
    borderLeftColor: "#E2E8F0",
    marginLeft: 12,
  },
  timelineIconDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -13,
  },
  timelineIconDotDone: { backgroundColor: "#10B981" },
  timelineIconDotActive: { backgroundColor: "#2E3192" },
  timelineDotNumber: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  timelineBody: { flex: 1, marginTop: -2 },
  timelineTitle: { color: "#0A154F", fontSize: 13, fontWeight: "800" },
  timelineText: { color: "#64748B", fontSize: 12, lineHeight: 17, marginTop: 2 },
});
