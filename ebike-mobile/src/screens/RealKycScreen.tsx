import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as WebBrowser from "expo-web-browser";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
  ScanFace,
} from "lucide-react-native";
import { MobileApi } from "../lib/api";

export default function RealKycScreen({
  token,
  onBack,
  onKycComplete,
}: {
  token: string;
  onBack: () => void;
  onKycComplete: () => void;
}) {
  const [status, setStatus] = useState("pending");
  const [stage, setStage] = useState("identity_lookup");
  const [nextAction, setNextAction] = useState("verify_identity");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [addressDocument, setAddressDocument] = useState<any | null>(null);
  const [uploadingAddress, setUploadingAddress] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await MobileApi.verifyMonoProveStatus(token).catch(() => {});
      const result = await MobileApi.getProfile(token);
      const profile = (result as any).user ?? result.data;
      setStatus(profile?.faceVerified === true ? "verified" : profile?.kycStatus === "failed" ? "failed" : "pending");
      setStage(profile?.kycStage || "identity_lookup");
      setNextAction(profile?.kycNextAction || "verify_identity");
      setMessage(null);
    } catch {
      setMessage(
        "Unable to refresh your status. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const startVerification = async () => {
    setStarting(true);
    setMessage(null);
    try {
      const session = await MobileApi.initiateMonoProve(
        "dandoev://kyc-callback",
        token,
      );
      const proveUrl = session.data?.url;
      if (!proveUrl || !/^https:\/\//i.test(proveUrl)) {
        throw new Error(
          "Mono did not return a valid identity verification link. Please try again.",
        );
      }
      const result = await WebBrowser.openAuthSessionAsync(
        proveUrl,
        "dandoev://kyc-callback",
      );

      // Instantly verify with backend Mono Prove API sync
      const instantCheck = await MobileApi.verifyMonoProveStatus(token).catch(() => null);
      if (instantCheck?.verified || instantCheck?.data?.verified) {
        setStatus("verified");
        setMessage("Your identity and face have been verified successfully!");
        return;
      }

      await refresh();
      // Mono may deliver the successful webhook or customer sync a few seconds after the browser closes
      if (result.type === "success") {
        for (let attempt = 0; attempt < 5; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          const checkRetry = await MobileApi.verifyMonoProveStatus(token).catch(() => null);
          if (checkRetry?.verified || checkRetry?.data?.verified) {
            setStatus("verified");
            setMessage("Your identity and face have been verified successfully!");
            break;
          }
          await refresh();
          const latest = await MobileApi.getProfile(token).catch(() => null);
          const latestProfile = (latest as any)?.user ?? (latest as any)?.data;
          const latestStatus = latestProfile?.faceVerified === true ? "verified" : latestProfile?.kycStatus === "failed" ? "failed" : "pending";
          if (latestStatus === "verified" || latestStatus === "failed") break;
        }
      }
      setMessage(
        result.type === "success"
          ? "Mono verification submitted. Tap 'Refresh status' if your result is pending."
          : "Verification was closed. You can continue when you are ready.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Verification could not start. Please try again.",
      );
    } finally {
      setStarting(false);
    }
  };
  const pickProofOfAddress = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["image/jpeg", "image/png", "application/pdf"], copyToCacheDirectory: true });
      if (result.canceled || !result.assets[0]) return;
      const file = result.assets[0];
      const fileName = file.name || file.uri.split(/[\\/]/).pop() || "proof-of-address";
      setUploadingAddress(true);
      setMessage(null);
      const lowerName = fileName.toLowerCase();
      const inferredMimeType = lowerName.endsWith(".pdf")
        ? "application/pdf"
        : lowerName.endsWith(".png")
          ? "image/png"
          : "image/jpeg";
      const uploaded = await MobileApi.uploadProofOfAddress({ uri: file.uri, name: fileName, mimeType: file.mimeType || inferredMimeType }, token);
      setAddressDocument(uploaded.data);
      setMessage("Proof of address uploaded and sent for review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Proof of address upload failed. Please try again.");
    } finally {
      setUploadingAddress(false);
    }
  };
  const verified = status === "verified";
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.back}
        accessibilityRole="button"
      >
        <ArrowLeft size={18} color="#102152" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
      <View style={styles.hero}>
        <View style={styles.icon}>
          <ShieldCheck size={28} color="#102152" />
        </View>
        <Text style={styles.eyebrow}>KYC PROGRESS · {stage.replace(/_/g, " ").toUpperCase()}</Text>
        <Text style={styles.heading}>Verify your identity securely.</Text>
        <Text style={styles.intro}>
          Your application details are saved. Complete this Mono identity check
          to continue to bank verification, guarantors, and agreement review.
        </Text>
      </View>
      <View style={styles.statusCard}>
        <View style={styles.row}>
          <Text style={styles.cardLabel}>VERIFICATION STATUS</Text>
          <TouchableOpacity
            onPress={() => void refresh()}
            accessibilityLabel="Refresh verification status"
            accessibilityRole="button"
            disabled={loading}
          >
            <RefreshCw size={18} color="#117F78" />
          </TouchableOpacity>
        </View>
        {loading ? (
          <ActivityIndicator color="#117F78" style={{ marginVertical: 18 }} />
        ) : (
          <>
            <Text style={styles.status}>
              {verified
                ? "Identity verified"
                : status === "failed"
                  ? "Needs another attempt"
                  : status === "pending"
                    ? "Waiting for verification"
                    : status.replace(/_/g, " ")}
            </Text>
            <Text style={styles.statusHint}>
              {verified
                ? "Your verification is complete."
                : status === "failed"
                  ? "The last check did not complete. You can start a new secure session."
                  : "Your status updates after Mono confirms your result."}
            </Text>
            {!verified && <Text style={styles.statusHint}>You can continue from this stage without repeating completed checks.</Text>}
          </>
        )}
      </View>
      <View style={styles.addressCard}>
        <Text style={styles.addressTitle}>Proof of address</Text>
        <Text style={styles.addressBody}>Upload a recent utility bill, bank statement, tenancy document, or official correspondence showing your residential address.</Text>
        <TouchableOpacity style={[styles.uploadButton, uploadingAddress && styles.disabled]} onPress={() => void pickProofOfAddress()} disabled={uploadingAddress} accessibilityRole="button">
          {uploadingAddress ? <ActivityIndicator color="#102152" /> : <Text style={styles.uploadButtonText}>{addressDocument ? `Uploaded: ${addressDocument.fileName || "document"}` : "Upload proof of address"}</Text>}
        </TouchableOpacity>
        {addressDocument && <Text style={styles.pendingText}>Pending review · PDF, JPG, and PNG accepted · max 5 MB</Text>}
      </View>
      <Text style={styles.sectionTitle}>How it works</Text>
      <View style={styles.step}>
        <View style={styles.stepIcon}>
          <ScanFace size={20} color="#117F78" />
        </View>
        <View style={styles.stepText}>
          <Text style={styles.stepTitle}>Complete the face check</Text>
          <Text style={styles.stepBody}>
            Mono guides you through a secure selfie and identity check.
          </Text>
        </View>
        <ChevronRight size={18} color="#92A2B5" />
      </View>
      <View style={styles.step}>
        <View style={styles.stepIcon}>
          <Check size={20} color="#117F78" />
        </View>
        <View style={styles.stepText}>
          <Text style={styles.stepTitle}>Get your result</Text>
          <Text style={styles.stepBody}>
            Return here to see your status before continuing.
          </Text>
        </View>
      </View>
      {!verified && (
        <TouchableOpacity
          style={[styles.button, starting && styles.disabled]}
          onPress={() => void startVerification()}
          disabled={starting || loading}
          accessibilityRole="button"
        >
          {starting ? (
            <ActivityIndicator color="#102152" />
          ) : (
            <>
              <Text style={styles.buttonText}>
                {status === "failed"
                  ? "Try verification again"
                  : nextAction === "complete_face_check" ? "Continue face check" : "Start secure verification"}
              </Text>
              <ChevronRight size={19} color="#102152" />
            </>
          )}
        </TouchableOpacity>
      )}
      {verified && (
        <TouchableOpacity
          style={styles.button}
          onPress={onKycComplete}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Continue to BNPL application</Text>
          <ChevronRight size={19} color="#102152" />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={styles.refreshButton}
        onPress={() => void refresh()}
        disabled={loading}
        accessibilityRole="button"
      >
        <Text style={styles.refreshText}>Refresh status</Text>
      </TouchableOpacity>
      {message && <Text style={styles.message}>{message}</Text>}
      <Text style={styles.footnote}>
        Closing the verification window does not mean your identity was
        approved. Your result may take a moment to appear.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F9FB" },
  content: { padding: 20, paddingBottom: 42 },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  backText: { color: "#102152", fontFamily: "Inter_600SemiBold", fontSize: 16 },
  hero: {
    backgroundColor: "#DDF7F0",
    borderRadius: 24,
    padding: 24,
    marginBottom: 18,
  },
  icon: {
    width: 52,
    height: 52,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  eyebrow: {
    color: "#117F78",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    letterSpacing: 1.3,
  },
  heading: {
    color: "#102152",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 27,
    lineHeight: 34,
    marginTop: 8,
  },
  intro: {
    color: "#475C70",
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    lineHeight: 22,
    marginTop: 10,
  },
  statusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#DDE8ED",
  },
  addressCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#DDE8ED", marginTop: 14 },
  addressTitle: { color: "#102152", fontFamily: "PlusJakartaSans_700Bold", fontSize: 17 },
  addressBody: { color: "#607384", fontFamily: 'Inter_500Medium', fontSize: 15, lineHeight: 20, marginTop: 7 },
  uploadButton: { minHeight: 48, borderRadius: 13, backgroundColor: "#DDF7F0", alignItems: "center", justifyContent: "center", paddingHorizontal: 14, marginTop: 14 },
  uploadButtonText: { color: "#102152", fontFamily: "Inter_600SemiBold", fontSize: 16 },
  pendingText: { color: "#117F78", fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 18, marginTop: 9 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLabel: {
    color: "#667A89",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    letterSpacing: 1,
  },
  status: {
    color: "#102152",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontSize: 19,
    marginTop: 14,
    textTransform: "capitalize",
  },
  statusHint: {
    color: "#607384",
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    lineHeight: 20,
    marginTop: 5,
  },
  sectionTitle: {
    color: "#102152",
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 16,
    marginTop: 26,
    marginBottom: 12,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 15,
    borderRadius: 16,
    marginBottom: 9,
    gap: 12,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E5FAF5",
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { flex: 1 },
  stepTitle: {
    color: "#102152",
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  stepBody: {
    color: "#607384",
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 18,
    marginTop: 3,
  },
  button: {
    backgroundColor: "#52E0C1",
    borderRadius: 16,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 18,
  },
  disabled: { opacity: 0.65 },
  buttonText: {
    color: "#102152",
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
  },
  refreshButton: { padding: 15, alignItems: "center" },
  refreshText: {
    color: "#117F78",
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  message: {
    color: "#102152",
    backgroundColor: "#E5FAF5",
    borderRadius: 12,
    padding: 13,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    lineHeight: 20,
  },
  footnote: {
    color: "#718394",
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 18,
    marginTop: 16,
  },
});
