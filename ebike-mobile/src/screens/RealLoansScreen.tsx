import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  RefreshControl,
  Linking,
} from "react-native";
import { MobileApi } from "../lib/api";

type Repayment = {
  id: string;
  installmentNumber: number;
  amount: string | number;
  dueDate: string;
  status: string;
};
type Guarantor = {
  id: string;
  fullName: string;
  status: string;
  inviteExpiresAt?: string;
};
type Transaction = {
  id: string;
  amount: string | number;
  status: string;
  provider?: string;
  createdAt: string;
  providerRef?: string;
};
type Document = {
  id: string;
  type: string;
  fileUrl: string;
  verificationStatus: string;
};
type Loan = {
  id: string;
  status: string;
  bike?: { name?: string };
  totalRepayable?: string | number;
  tenure?: number;
  repayments?: Repayment[];
  guarantors?: Guarantor[];
  guarantorsVerified?: boolean;
  transactions?: Transaction[];
  documents?: Document[];
  monoMandateStatus?: string;
  monoAssessment?: {
    verifiedMonthlyInflow?: string | number;
    verifiedMonthlyOutflow?: string | number;
    dtiRatioPercent?: string | number;
    creditScore?: number;
    riskTier?: string;
    underwritingDecision?: string;
  };
};

export default function RealLoansScreen({ token }: { token: string }) {
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const loadLoans = useCallback(async () => {
    setError(false);
    try {
      const result = await MobileApi.getMyLoans(token);
      setLoans(result.data ?? []);
    } catch {
      setError(true);
      setLoans((current) => current ?? []);
    }
  }, [token]);
  useEffect(() => {
    let active = true;
    loadLoans().catch(() => {});
    return () => {
      active = false;
    };
  }, [loadLoans]);
  const refresh = async () => {
    setRefreshing(true);
    await loadLoans();
    setRefreshing(false);
  };
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          colors={["#2E3192"]}
        />
      }
    >
      <Text style={styles.heading}>Your plans</Text>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.body}>Unable to load your plans.</Text>
          <Text style={styles.retry} onPress={refresh}>
            Tap to retry
          </Text>
        </View>
      ) : loans === null ? (
        <ActivityIndicator color="#2E3192" />
      ) : loans.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.title}>No BNPL application yet</Text>
          <Text style={styles.body}>
            Applications and repayments will appear here when you apply.
          </Text>
        </View>
      ) : (
        loans.map((loan) => (
          <View key={loan.id} style={styles.card}>
            <Text style={styles.label}>
              {loan.status.replace(/_/g, " ").toUpperCase()}
            </Text>
            <Text style={styles.title}>
              {loan.bike?.name || "E-bike financing"}
            </Text>
            <Text style={styles.body}>Reference: {loan.id}</Text>
            <Text style={styles.body}>
              Total repayable: ₦
              {Number(loan.totalRepayable || 0).toLocaleString()}
            </Text>
            <Text style={styles.body}>Term: {loan.tenure || "—"} months</Text>
            <View style={styles.timeline}>
              <Text style={styles.title}>Application timeline</Text>
              {[
                "Application submitted",
                "Mono assessment",
                "Guarantors verified",
                "Admin decision",
                "Bike assigned",
              ].map((label, index) => (
                <View key={label} style={styles.timelineRow}>
                  <View
                    style={[
                      styles.timelineDot,
                      index === 0 ||
                      (index === 1 && loan.monoAssessment) ||
                      (index === 2 && loan.guarantorsVerified) ||
                      (index >= 3 &&
                        ["approved", "active", "completed"].includes(
                          loan.status,
                        ))
                        ? styles.timelineDone
                        : null,
                    ]}
                  />
                  <Text style={styles.body}>{label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.summary}>
              <Text style={styles.title}>Financial & mandate summary</Text>
              <Text style={styles.body}>
                Mandate: {loan.monoMandateStatus || "pending"}
              </Text>
              {loan.monoAssessment && (
                <>
                  <Text style={styles.body}>
                    Income: ₦
                    {Number(
                      loan.monoAssessment.verifiedMonthlyInflow || 0,
                    ).toLocaleString()}
                  </Text>
                  <Text style={styles.body}>
                    DTI:{" "}
                    {Number(loan.monoAssessment.dtiRatioPercent || 0).toFixed(
                      1,
                    )}
                    %
                  </Text>
                  <Text style={styles.body}>
                    Decision:{" "}
                    {loan.monoAssessment.underwritingDecision || "Under review"}
                  </Text>
                </>
              )}
            </View>
            {!!loan.guarantors?.length && (
              <View style={styles.guarantors}>
                <Text style={styles.title}>Guarantor verification</Text>
                {loan.guarantors.map((guarantor) => (
                  <View key={guarantor.id} style={styles.guarantorRow}>
                    <Text style={styles.body}>{guarantor.fullName}</Text>
                    <Text style={styles.guarantorStatus}>
                      {guarantor.status.replace(/_/g, " ")}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {!!loan.transactions?.length && (
              <View style={styles.schedule}>
                <Text style={styles.title}>Payment history</Text>
                {loan.transactions.map((transaction) => (
                  <View key={transaction.id} style={styles.row}>
                    <Text style={styles.body}>
                      ₦{Number(transaction.amount).toLocaleString()} ·{" "}
                      {transaction.status}
                    </Text>
                    <Text style={styles.body}>
                      {new Date(transaction.createdAt).toLocaleDateString()} ·{" "}
                      {transaction.provider || "Mono"}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {!!loan.documents?.length && (
              <View style={styles.schedule}>
                <Text style={styles.title}>Documents</Text>
                {loan.documents.map((document) => (
                  <Text
                    key={document.id}
                    style={styles.documentLink}
                    onPress={() => void Linking.openURL(document.fileUrl)}
                  >
                    Download {document.type.replace(/_/g, " ")} ·{" "}
                    {document.verificationStatus}
                  </Text>
                ))}
              </View>
            )}
            {loan.status === "active" && !!loan.repayments?.length && (
              <View style={styles.schedule}>
                <Text style={styles.title}>Repayment schedule</Text>
                {loan.repayments.map((item) => (
                  <View key={item.id} style={styles.row}>
                    <Text style={styles.body}>
                      #{item.installmentNumber} ·{" "}
                      {new Date(item.dueDate).toLocaleDateString()}
                    </Text>
                    <Text style={styles.body}>
                      ₦{Number(item.amount).toLocaleString()} · {item.status}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F6F7FC" },
  content: { padding: 18, paddingBottom: 40 },
  heading: {
    fontSize: 25,
    color: "#0A154F",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#DBE2F0",
  },
  label: {
    color: "#2E3192",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    marginBottom: 8,
  },
  title: {
    color: "#0A154F",
    fontSize: 17,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    marginBottom: 8,
  },
  body: { color: "#66728A", fontFamily: "Inter_400Regular", lineHeight: 21 },
  errorBox: {
    backgroundColor: "#FEE4E2",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  retry: { color: "#B42318", fontFamily: "Inter_600SemiBold", marginTop: 6 },
  timeline: { marginTop: 18 },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#CBD5E1",
  },
  timelineDone: { backgroundColor: "#117F78" },
  summary: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#EDF2FA",
  },
  documentLink: {
    color: "#2E3192",
    fontFamily: "Inter_600SemiBold",
    paddingVertical: 7,
    textTransform: "capitalize",
  },
  guarantors: { marginTop: 18 },
  guarantorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2FA",
  },
  guarantorStatus: {
    color: "#117F78",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textTransform: "capitalize",
  },
  schedule: { marginTop: 18 },
  row: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2FA",
  },
});
