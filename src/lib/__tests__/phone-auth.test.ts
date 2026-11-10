import { describe, it, expect } from "vitest";
import {
  normalizeNigerianPhone,
  looksLikeEmail,
  phoneToPlaceholderEmail,
  phoneLookupVariants,
} from "../phone";

describe("Phone Authentication Utilities", () => {
  describe("normalizeNigerianPhone", () => {
    it("normalizes standard 11-digit local Nigerian numbers", () => {
      expect(normalizeNigerianPhone("08031234567")).toBe("+2348031234567");
      expect(normalizeNigerianPhone("07011122233")).toBe("+2347011122233");
      expect(normalizeNigerianPhone("09098765432")).toBe("+2349098765432");
      expect(normalizeNigerianPhone("08145678901")).toBe("+2348145678901");
    });

    it("normalizes numbers with spaces, dashes, or parentheses", () => {
      expect(normalizeNigerianPhone("0803 123 4567")).toBe("+2348031234567");
      expect(normalizeNigerianPhone("0803-123-4567")).toBe("+2348031234567");
      expect(normalizeNigerianPhone("(0803) 123 4567")).toBe("+2348031234567");
    });

    it("handles +234 and 234 prefixes", () => {
      expect(normalizeNigerianPhone("+2348031234567")).toBe("+2348031234567");
      expect(normalizeNigerianPhone("2348031234567")).toBe("+2348031234567");
      expect(normalizeNigerianPhone("+234 803 123 4567")).toBe("+2348031234567");
    });

    it("handles 10-digit format without leading 0", () => {
      expect(normalizeNigerianPhone("8031234567")).toBe("+2348031234567");
    });

    it("returns null for invalid numbers", () => {
      expect(normalizeNigerianPhone("12345")).toBeNull();
      expect(normalizeNigerianPhone("abc08031234567")).toBeNull();
      expect(normalizeNigerianPhone("")).toBeNull();
      expect(normalizeNigerianPhone(null as any)).toBeNull();
      expect(normalizeNigerianPhone(undefined as any)).toBeNull();
    });
  });

  describe("looksLikeEmail", () => {
    it("correctly identifies email addresses", () => {
      expect(looksLikeEmail("user@example.com")).toBe(true);
      expect(looksLikeEmail("rider.solomon@dandoev.app")).toBe(true);
      expect(looksLikeEmail("  test@domain.ng  ")).toBe(true);
    });

    it("returns false for phone numbers or plain text", () => {
      expect(looksLikeEmail("08031234567")).toBe(false);
      expect(looksLikeEmail("+2348031234567")).toBe(false);
      expect(looksLikeEmail("solomondunu")).toBe(false);
      expect(looksLikeEmail("")).toBe(false);
    });
  });

  describe("phoneToPlaceholderEmail", () => {
    it("generates deterministic placeholder email for phone", () => {
      const email = phoneToPlaceholderEmail("+2348031234567");
      expect(email).toBe("2348031234567@phone.dandoev.app");
    });
  });

  describe("phoneLookupVariants", () => {
    it("generates all valid database matching variants", () => {
      const variants = phoneLookupVariants("0803 123 4567");
      expect(variants).toContain("+2348031234567");
      expect(variants).toContain("2348031234567");
      expect(variants).toContain("08031234567");
      expect(variants).toContain("8031234567");
    });
  });
});
