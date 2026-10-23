// ============================================================
// DandoEv — Security, Encryption & Fraud Verification Script
// Run via ts-node to verify all security primitives.
// ============================================================

import {
  encryptField,
  decryptField,
  createBlindIndex,
  Masking,
} from './encryption';
import {
  generateTotpSecret,
  verifyTotpCode,
  generateBackupCodes,
  verifyBackupCode,
} from './mfa';
import { assertPciDssCompliance } from './compliance';

async function runSecurityTests() {
  console.log('====================================================');
  console.log('🔒 RUNNING DANDOEV SECURITY & COMPLIANCE TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // TEST 1: AES-256-GCM Field Encryption & Decryption
  // ----------------------------------------------------
  console.log('1. Testing AES-256-GCM Field Encryption...');
  const testBvn = '22234567890';
  const encrypted = encryptField(testBvn);
  assert(encrypted !== null && encrypted.startsWith('enc:v1:'), 'Ciphertext generated with enc:v1 prefix');

  const decrypted = decryptField(encrypted);
  assert(decrypted === testBvn, 'Decrypted text exactly matches original BVN plaintext');

  // Test Tamper resistance (Auth Tag validation)
  let tamperCaught = false;
  try {
    const tampered = encrypted!.replace(/a/g, 'b');
    decryptField(tampered);
  } catch {
    tamperCaught = true;
  }
  assert(tamperCaught, 'Tampered ciphertext rejected by AES-GCM authentication tag');

  // ----------------------------------------------------
  // TEST 2: Blind Indexing for Exact Match Queries
  // ----------------------------------------------------
  console.log('\n2. Testing Blind Indexing (Searchable Hashes)...');
  const index1 = createBlindIndex('22234567890');
  const index2 = createBlindIndex(' 22234567890 ');
  const index3 = createBlindIndex('99999999999');
  assert(index1 === index2, 'Blind index is deterministic and trims whitespace');
  assert(index1 !== index3, 'Different inputs yield distinct blind index hashes');

  // ----------------------------------------------------
  // TEST 3: PII Masking
  // ----------------------------------------------------
  console.log('\n3. Testing PII Masking...');
  assert(Masking.bvn('22234567890') === '222*****890', 'BVN correctly masked');
  assert(Masking.nin('12345678901') === '123*****901', 'NIN correctly masked');
  assert(Masking.accountNumber('0123456789') === '******6789', 'Account number correctly masked');
  assert(Masking.email('john.doe@example.com') === 'j***e@example.com', 'Email correctly masked');

  // ----------------------------------------------------
  // TEST 4: TOTP Multi-Factor Authentication
  // ----------------------------------------------------
  console.log('\n4. Testing TOTP MFA & Backup Codes...');
  const { secret, uri } = generateTotpSecret();
  assert(typeof secret === 'string' && secret.length > 0, 'Generated valid Base32 TOTP secret');
  assert(uri('user@dandoev.com').includes('otpauth://totp/'), 'Generated valid OTPAuth QR URI');

  const { rawCodes, hashedCodes } = generateBackupCodes();
  assert(rawCodes.length === 10 && hashedCodes.length === 10, 'Generated 10 single-use backup codes');

  const firstCode = rawCodes[0];
  const { valid, remainingHashes } = verifyBackupCode(firstCode, hashedCodes);
  assert(valid === true && remainingHashes.length === 9, 'Successfully consumed backup recovery code');

  const recheck = verifyBackupCode(firstCode, remainingHashes);
  assert(recheck.valid === false, 'Consumed backup code cannot be reused (one-time use enforced)');

  // ----------------------------------------------------
  // TEST 5: PCI-DSS Compliance Asserter
  // ----------------------------------------------------
  console.log('\n5. Testing PCI-DSS Cardholder Data Asserter...');
  let pciBlocked = false;
  try {
    assertPciDssCompliance({
      card_number: '4111111111111111',
      cvv: '123',
    });
  } catch (err: any) {
    if (err.message.includes('PCI-DSS Violation')) {
      pciBlocked = true;
    }
  }
  assert(pciBlocked, 'PCI-DSS asserter catches and blocks raw cardholder PAN & CVV');

  // Non-card tokenized payload should pass
  let tokenizedAllowed = true;
  try {
    assertPciDssCompliance({
      paymentMethod: 'card',
      paystackAuthCode: 'AUTH_876xyz123',
      amount: 50000,
    });
  } catch {
    tokenizedAllowed = false;
  }
  assert(tokenizedAllowed, 'PCI-DSS asserter allows tokenized payment gateway references');

  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');
}

runSecurityTests().catch(console.error);
