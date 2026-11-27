-- One-time production cleanup requested by operations.
-- Removes demo/requested public user records and all dependent application data.
CREATE TEMP TABLE "_purge_users" ON COMMIT DROP AS
SELECT "id" FROM "users"
WHERE lower("email") LIKE '%@demo.com'
   OR lower("email") IN (
     'kenechukwuigbokwe853@gmail.com',
     'ifeomadunu@yahoo.com',
     'kizitokelvin1@gmail.com',
     'solomon@dandoev.com',
     'ifeomavivien33@gmail.com',
     'nwekepeace91@gmail.com',
     'chinedu.okafor@example.com',
     'info@dandoev.com'
   );

CREATE TEMP TABLE "_purge_loans" ON COMMIT DROP AS
SELECT "id" FROM "loans" WHERE "userId" IN (SELECT "id" FROM "_purge_users");

CREATE TEMP TABLE "_purge_orders" ON COMMIT DROP AS
SELECT "id" FROM "orders" WHERE "userId" IN (SELECT "id" FROM "_purge_users");

DELETE FROM "recovery_activities" WHERE "caseId" IN (SELECT "id" FROM "recovery_cases" WHERE "loanId" IN (SELECT "id" FROM "_purge_loans"));
DELETE FROM "recovery_cases" WHERE "loanId" IN (SELECT "id" FROM "_purge_loans");
DELETE FROM "payment_transactions" WHERE "userId" IN (SELECT "id" FROM "_purge_users") OR "loanId" IN (SELECT "id" FROM "_purge_loans") OR "orderId" IN (SELECT "id" FROM "_purge_orders");
DELETE FROM "daily_savings" WHERE "userId" IN (SELECT "id" FROM "_purge_users") OR "loanId" IN (SELECT "id" FROM "_purge_loans");
DELETE FROM "repayments" WHERE "userId" IN (SELECT "id" FROM "_purge_users") OR "loanId" IN (SELECT "id" FROM "_purge_loans");
DELETE FROM "guarantors" WHERE "applicantUserId" IN (SELECT "id" FROM "_purge_users") OR "userId" IN (SELECT "id" FROM "_purge_users") OR "loanId" IN (SELECT "id" FROM "_purge_loans");
DELETE FROM "kyc_documents" WHERE "userId" IN (SELECT "id" FROM "_purge_users") OR "loanId" IN (SELECT "id" FROM "_purge_loans");
DELETE FROM "mono_financial_assessments" WHERE "userId" IN (SELECT "id" FROM "_purge_users") OR "loanId" IN (SELECT "id" FROM "_purge_loans");
DELETE FROM "vehicle_assignments" WHERE "riderId" IN (SELECT "id" FROM "_purge_users") OR "loanId" IN (SELECT "id" FROM "_purge_loans") OR "orderId" IN (SELECT "id" FROM "_purge_orders");
DELETE FROM "vehicle_cards" WHERE "riderId" IN (SELECT "id" FROM "_purge_users");
DELETE FROM "swap_purchases" WHERE "userId" IN (SELECT "id" FROM "_purge_users");
DELETE FROM "orders" WHERE "id" IN (SELECT "id" FROM "_purge_orders");
DELETE FROM "loans" WHERE "id" IN (SELECT "id" FROM "_purge_loans");
DELETE FROM "notifications" WHERE "userId" IN (SELECT "id" FROM "_purge_users");
DELETE FROM "audit_logs" WHERE "userId" IN (SELECT "id" FROM "_purge_users");
DELETE FROM "refresh_tokens" WHERE "userId" IN (SELECT "id" FROM "_purge_users");
DELETE FROM "idempotency_keys" WHERE "userId" IN (SELECT "id" FROM "_purge_users");
DELETE FROM "wallets" WHERE "userId" IN (SELECT "id" FROM "_purge_users");
DELETE FROM "users" WHERE "id" IN (SELECT "id" FROM "_purge_users");
