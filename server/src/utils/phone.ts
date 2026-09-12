/**
 * Lightweight phone normalization/validation utility.
 * Defaults to Indian numbers (+91) per the spec, but accepts any number
 * already in E.164 form with a country code.
 */

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string | null;
  reason?: string;
}

const INDIA_MOBILE_REGEX = /^[6-9]\d{9}$/; // 10-digit Indian mobile, starts 6-9

export function normalizeAndValidatePhone(
  raw: string,
  defaultCountryCode = "91"
): PhoneValidationResult {
  if (!raw || typeof raw !== "string") {
    return { isValid: false, normalized: null, reason: "Empty phone number" };
  }

  // Strip everything except digits and leading +
  let cleaned = raw.trim().replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) {
    const digits = cleaned.slice(1);
    if (digits.startsWith(defaultCountryCode)) {
      const local = digits.slice(defaultCountryCode.length);
      if (defaultCountryCode === "91" && !INDIA_MOBILE_REGEX.test(local)) {
        return {
          isValid: false,
          normalized: null,
          reason: "Invalid Indian mobile number (must be 10 digits starting 6-9)",
        };
      }
      return { isValid: true, normalized: `+${digits}` };
    }
    // Non-default country code: accept if length is plausible (8-15 digits per E.164)
    if (digits.length >= 8 && digits.length <= 15) {
      return { isValid: true, normalized: `+${digits}` };
    }
    return { isValid: false, normalized: null, reason: "Invalid international number length" };
  }

  // No leading +: assume local number in default country
  const digitsOnly = cleaned.replace(/^0+/, ""); // strip leading trunk zero
  if (defaultCountryCode === "91") {
    if (INDIA_MOBILE_REGEX.test(digitsOnly)) {
      return { isValid: true, normalized: `+91${digitsOnly}` };
    }
    // Maybe it already includes country code without plus, e.g. 919876543210
    if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
      const local = digitsOnly.slice(2);
      if (INDIA_MOBILE_REGEX.test(local)) {
        return { isValid: true, normalized: `+${digitsOnly}` };
      }
    }
    return {
      isValid: false,
      normalized: null,
      reason: "Invalid Indian mobile number (must be 10 digits starting 6-9)",
    };
  }

  if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
    return { isValid: true, normalized: `+${defaultCountryCode}${digitsOnly}` };
  }

  return { isValid: false, normalized: null, reason: "Unrecognized phone format" };
}
