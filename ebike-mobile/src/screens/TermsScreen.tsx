import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

export default function TermsScreen({ onBack }: { onBack: () => void }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ChevronLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updatedDate}>Last Updated: March 29, 2026</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. INTRODUCTION</Text>
          <Text style={styles.paragraph}>
            These Terms and Conditions (the "Terms") and our Privacy Policy govern your access to and use of the DandoEv Platform (the "Platform"), including the mobile application, web-based administrative systems, and any related services (the "Services") made available by DandoEv Limited ("DandoEv", "We", "Us" or "Our").
          </Text>
          <Text style={styles.paragraph}>
            By accessing or using the Platform, you agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you must immediately discontinue use of the Platform.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. ACCOUNT & REGISTRATION</Text>
          <Text style={styles.paragraph}>
            In order to access certain features, you may be required to create an account using your mobile number and complete identity verification procedures. You agree that all information provided shall be accurate and complete.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. OWNERSHIP & USER RESPONSIBILITIES</Text>
          <Text style={styles.paragraph}>
            Where an Asset is acquired through a financing arrangement, legal ownership remains with DandoEv until full payment. You bear full responsibility for the possession, operation, and maintenance of the Asset from delivery.
          </Text>
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              DandoEv shall not be liable for any injury, loss, damage, or accidents arising from your use of the Asset.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. FINANCING & PAYMENTS</Text>
          <Text style={styles.paragraph}>
            You agree to make all payments when due, including down payments and installments. You authorize DandoEv to initiate recurring debits from your designated payment method.
          </Text>
          <Text style={styles.paragraph}>
            Failure to pay may result in penalties, repossession of the Asset, or referral to debt recovery agencies.
          </Text>
        </View>

        <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. RESTRICTIONS</Text>
            <Text style={styles.paragraph}>
                You shall not sell, transfer, or dispose of the Asset to any third party until all payment obligations have been fully discharged.
            </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 24,
    paddingTop: 16,
    backgroundColor: '#2E3192',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#FFFFFF',
  },
  content: {
    padding: 24,
  },
  updatedDate: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#2E3192',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  paragraph: {
    fontSize: 14,
    color: '#4B5563',
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    marginBottom: 12,
  },
  warningBox: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    marginTop: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#991B1B',
    lineHeight: 20,
    fontWeight: '500',
    fontFamily: 'Inter_500Medium',
  },
});
