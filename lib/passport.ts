export type PassportDetails = {
  passportNo: string;
  nationality: string;
  country: string;
  countryCode: string;
  placeOfBirth: string;
  dateOfIssue: string;
  dateOfExpiry: string;
};

const KENYAN_PASSPORT_PREFIXES = ["AK", "BK", "CK", "DK", "EK", "KQ"];

function formatDate(date: Date) {
  return date.toISOString().split("T")[0];
}

export function generateKenyanPassportNumber() {
  const prefix =
    KENYAN_PASSPORT_PREFIXES[
      Math.floor(Math.random() * KENYAN_PASSPORT_PREFIXES.length)
    ];
  const serial = Math.floor(1000000 + Math.random() * 9000000);
  return `${prefix}${serial}`;
}

export function createKenyanPassportDetails(
  overrides: Partial<PassportDetails> = {},
): PassportDetails {
  const issued = new Date();
  const expires = new Date(issued);
  expires.setFullYear(expires.getFullYear() + 10);

  return {
    passportNo: overrides.passportNo || generateKenyanPassportNumber(),
    nationality: overrides.nationality || "Kenyan",
    country: overrides.country || "Republic of Kenya",
    countryCode: overrides.countryCode || "KEN",
    placeOfBirth: overrides.placeOfBirth || "Nairobi",
    dateOfIssue: overrides.dateOfIssue || formatDate(issued),
    dateOfExpiry: overrides.dateOfExpiry || formatDate(expires),
  };
}

export function hasRequiredPassportDetails(input: {
  passportNo?: string | null;
  nationality?: string | null;
}) {
  return Boolean(input.passportNo?.trim() && input.nationality?.trim());
}

export function passportStatusLabel(input: {
  passportNo?: string | null;
  nationality?: string | null;
}) {
  return hasRequiredPassportDetails(input)
    ? "Passport ready"
    : "Passport details required";
}
