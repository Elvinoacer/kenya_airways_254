export interface CompanionSupportRequest {
  required?: boolean;
  companionCount?: number;
  notes?: string | null;
}

export interface AccessibilityNeeds {
  wheelchairAssistance?: boolean;
  visualImpairmentAssistance?: boolean;
  hearingImpairmentAssistance?: boolean;
  medicalAssistance?: string | null;
  specialMealRequest?: string | null;
  companionSupport?: CompanionSupportRequest | null;
  accessibleSeating?: boolean;
  notes?: string | null;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBoolean(value: unknown) {
  return Boolean(value);
}

function normalizePositiveInt(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

export function normalizeAccessibilityNeeds(
  input?: AccessibilityNeeds | null | unknown,
): AccessibilityNeeds | null {
  if (!input || typeof input !== "object") return null;
  const candidate = input as AccessibilityNeeds;
  const companionSupport = candidate.companionSupport
    ? {
        required: normalizeBoolean(candidate.companionSupport.required),
        companionCount: normalizePositiveInt(
          candidate.companionSupport.companionCount,
        ),
        notes: normalizeText(candidate.companionSupport.notes) || null,
      }
    : null;

  const normalized: AccessibilityNeeds = {
    wheelchairAssistance: normalizeBoolean(candidate.wheelchairAssistance),
    visualImpairmentAssistance: normalizeBoolean(
      candidate.visualImpairmentAssistance,
    ),
    hearingImpairmentAssistance: normalizeBoolean(
      candidate.hearingImpairmentAssistance,
    ),
    medicalAssistance: normalizeText(candidate.medicalAssistance) || null,
    specialMealRequest: normalizeText(candidate.specialMealRequest) || null,
    companionSupport,
    accessibleSeating: normalizeBoolean(candidate.accessibleSeating),
    notes: normalizeText(candidate.notes) || null,
  };

  const hasValue =
    normalized.wheelchairAssistance ||
    normalized.visualImpairmentAssistance ||
    normalized.hearingImpairmentAssistance ||
    Boolean(normalized.medicalAssistance) ||
    Boolean(normalized.specialMealRequest) ||
    Boolean(normalized.companionSupport?.required) ||
    Boolean(normalized.companionSupport?.companionCount) ||
    Boolean(normalized.companionSupport?.notes) ||
    normalized.accessibleSeating ||
    Boolean(normalized.notes);

  return hasValue ? normalized : null;
}

export function accessibilityNeedsSummary(input?: AccessibilityNeeds | null) {
  if (!input) return "";
  const parts: string[] = [];
  if (input.wheelchairAssistance) parts.push("Wheelchair assistance");
  if (input.visualImpairmentAssistance) parts.push("Visual support");
  if (input.hearingImpairmentAssistance) parts.push("Hearing support");
  if (input.medicalAssistance)
    parts.push(`Medical: ${input.medicalAssistance}`);
  if (input.specialMealRequest) parts.push(`Meal: ${input.specialMealRequest}`);
  if (input.accessibleSeating) parts.push("Accessible seating");
  if (input.companionSupport?.required) {
    const count = input.companionSupport.companionCount || 1;
    parts.push(`Companion support x${count}`);
  }
  if (input.companionSupport?.notes)
    parts.push(`Companion note: ${input.companionSupport.notes}`);
  if (input.notes) parts.push(input.notes);
  return parts.join(" • ");
}
