import crypto from "node:crypto";
import { db, query } from "./db";
import {
  normalizeAccessibilityNeeds,
  type AccessibilityNeeds,
} from "./accessibility";

export interface PassengerProfile {
  id: string;
  ownerUserId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  passportNo?: string | null;
  nationality?: string | null;
  phone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  frequentFlyerNumber?: string | null;
  travelPreferences: Record<string, any>;
  accessibilityNeeds?: AccessibilityNeeds | null;
  notes?: string | null;
  vipLabel?: string | null;
  tags: string[];
  isBlacklisted: boolean;
  blacklistReason?: string | null;
  mergedIntoId?: string | null;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePassengerProfileInput {
  ownerUserId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  passportNo?: string | null;
  nationality?: string | null;
  phone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  frequentFlyerNumber?: string | null;
  travelPreferences?: Record<string, any>;
  accessibilityNeeds?: AccessibilityNeeds | null;
  notes?: string | null;
  vipLabel?: string | null;
  tags?: string[];
}

export interface UpdatePassengerProfileInput extends Partial<CreatePassengerProfileInput> {
  isBlacklisted?: boolean;
  blacklistReason?: string | null;
}

export interface PassengerMergeInput {
  sourcePassengerId: string;
  targetPassengerId: string;
  reason?: string;
  actor?: string;
}

export interface PassengerTravelInput {
  passengerProfileId: string;
  bookingId?: string | null;
  bookingRef?: string | null;
  flightId?: string | null;
  flightNumber?: string | null;
  departureTime?: string | null;
  arrivalTime?: string | null;
  seatClass?: string | null;
  eventType: string;
  notes?: string | null;
}

function normalizeText(value?: string | null) {
  return value?.trim() || null;
}

function normalizeNationality(value?: string | null) {
  return value ? value.trim().toUpperCase() : null;
}

export function validatePassportNumber(passportNo?: string | null) {
  if (!passportNo) return { valid: true, normalized: null as string | null };
  const normalized = passportNo.trim().toUpperCase();
  if (!/^[A-Z0-9]{6,15}$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      reason: "Passport number must be 6-15 alphanumeric uppercase characters",
    };
  }
  return { valid: true, normalized };
}

function parseTags(tagsJson?: string | null): string[] {
  if (!tagsJson) return [];
  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed.map((tag) => String(tag)) : [];
  } catch {
    return [];
  }
}

function rowToProfile(row: any): PassengerProfile {
  const travelPreferences = row.travel_preferences_json
    ? JSON.parse(row.travel_preferences_json)
    : {};
  const tags = db
    .prepare(
      "SELECT tag FROM passenger_tags WHERE passenger_profile_id = ? ORDER BY tag ASC",
    )
    .all(row.id) as { tag: string }[];
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth,
    passportNo: row.passport_no,
    nationality: row.nationality,
    phone: row.phone,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    frequentFlyerNumber: row.frequent_flyer_number,
    travelPreferences,
    accessibilityNeeds: normalizeAccessibilityNeeds(
      travelPreferences.accessibilityNeeds || null,
    ),
    notes: row.notes,
    vipLabel: row.vip_label,
    tags: tags.map((t) => t.tag),
    isBlacklisted: Boolean(row.is_blacklisted),
    blacklistReason: row.blacklist_reason,
    mergedIntoId: row.merged_into_id,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeTravelPreferences(
  travelPreferences?: Record<string, any> | null,
  accessibilityNeeds?: AccessibilityNeeds | null,
) {
  const normalized = { ...(travelPreferences || {}) };
  if (accessibilityNeeds !== undefined) {
    const next = normalizeAccessibilityNeeds(accessibilityNeeds);
    if (next) normalized.accessibilityNeeds = next;
    else delete normalized.accessibilityNeeds;
  } else if (normalized.accessibilityNeeds) {
    const next = normalizeAccessibilityNeeds(normalized.accessibilityNeeds);
    if (next) normalized.accessibilityNeeds = next;
    else delete normalized.accessibilityNeeds;
  }
  return normalized;
}

function saveAudit(
  passengerId: string,
  action: string,
  details?: any,
  actor?: string,
) {
  db.prepare(
    `
    INSERT INTO passenger_audit_log (id, passenger_profile_id, action, details_json, actor)
    VALUES (?, ?, ?, ?, ?)
  `,
  ).run(
    crypto.randomUUID(),
    passengerId,
    action,
    details ? JSON.stringify(details) : null,
    actor || null,
  );
}

function saveTravelHistory(input: PassengerTravelInput) {
  db.prepare(
    `
    INSERT INTO passenger_travel_history (
      id, passenger_profile_id, booking_id, booking_ref, flight_id, flight_number,
      departure_time, arrival_time, seat_class, event_type, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    crypto.randomUUID(),
    input.passengerProfileId,
    input.bookingId || null,
    input.bookingRef || null,
    input.flightId || null,
    input.flightNumber || null,
    input.departureTime || null,
    input.arrivalTime || null,
    input.seatClass || null,
    input.eventType,
    input.notes || null,
  );
}

function syncTags(passengerId: string, tags: string[]) {
  db.prepare("DELETE FROM passenger_tags WHERE passenger_profile_id = ?").run(
    passengerId,
  );
  const insertStmt = db.prepare(
    `INSERT INTO passenger_tags (id, passenger_profile_id, tag) VALUES (?, ?, ?)`,
  );
  for (const tag of Array.from(
    new Set(tags.map((t) => t.trim()).filter(Boolean)),
  )) {
    insertStmt.run(crypto.randomUUID(), passengerId, tag);
  }
}

function profileDuplicateCandidates(input: {
  ownerUserId?: string;
  passportNo?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  frequentFlyerNumber?: string | null;
}) {
  const rows = db
    .prepare(
      `SELECT * FROM passenger_profiles WHERE deleted_at IS NULL${input.ownerUserId ? " AND owner_user_id = ?" : ""}`,
    )
    .all(...(input.ownerUserId ? [input.ownerUserId] : [])) as any[];
  return rows.filter((row) => {
    if (input.passportNo && row.passport_no === input.passportNo) return true;
    if (
      input.frequentFlyerNumber &&
      row.frequent_flyer_number === input.frequentFlyerNumber
    )
      return true;
    if (input.phone && row.phone === input.phone) return true;
    if (input.firstName && input.lastName && input.dateOfBirth) {
      return (
        String(row.first_name).toLowerCase() ===
          String(input.firstName).toLowerCase() &&
        String(row.last_name).toLowerCase() ===
          String(input.lastName).toLowerCase() &&
        row.date_of_birth === input.dateOfBirth
      );
    }
    return false;
  });
}

export function detectDuplicatePassengers(input: {
  ownerUserId?: string;
  passportNo?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  frequentFlyerNumber?: string | null;
}) {
  const candidates = profileDuplicateCandidates(input);
  return candidates.map(rowToProfile);
}

export function listPassengerProfiles(
  filters: {
    ownerUserId?: string;
    includeDeleted?: boolean;
    includeBlacklisted?: boolean;
  } = {},
) {
  const where: string[] = [];
  const params: any[] = [];
  if (filters.ownerUserId) {
    where.push("owner_user_id = ?");
    params.push(filters.ownerUserId);
  }
  if (!filters.includeDeleted) where.push("deleted_at IS NULL");
  if (!filters.includeBlacklisted) where.push("is_blacklisted = 0");
  const sql = `SELECT * FROM passenger_profiles${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY updated_at DESC`;
  const rows = db.prepare(sql).all(...params) as any[];
  return rows.map(rowToProfile);
}

export function getPassengerProfile(passengerId: string) {
  const row = db
    .prepare("SELECT * FROM passenger_profiles WHERE id = ?")
    .get(passengerId) as any | undefined;
  return row && !row.deleted_at ? rowToProfile(row) : null;
}

export function getPassengerProfilesByIds(passengerIds: string[]) {
  const ids = Array.from(new Set((passengerIds || []).filter(Boolean)));
  if (!ids.length) return [] as PassengerProfile[];
  const placeholders = ids.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `SELECT * FROM passenger_profiles WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
    )
    .all(...ids) as any[];
  return rows.map(rowToProfile);
}

export function createPassengerProfile(
  input: CreatePassengerProfileInput,
  actor?: string,
) {
  const passport = validatePassportNumber(input.passportNo);
  if (!passport.valid)
    throw new Error(passport.reason || "Invalid passport number");
  const normalizedNationality = normalizeNationality(input.nationality);
  const normalizedFirstName = normalizeText(input.firstName);
  const normalizedLastName = normalizeText(input.lastName);
  if (!normalizedFirstName || !normalizedLastName)
    throw new Error("Passenger first and last name are required");

  const duplicates = detectDuplicatePassengers({
    ownerUserId: input.ownerUserId,
    passportNo: passport.normalized,
    firstName: normalizedFirstName,
    lastName: normalizedLastName,
    dateOfBirth: input.dateOfBirth || null,
    phone: input.phone || null,
    frequentFlyerNumber: input.frequentFlyerNumber || null,
  });

  if (duplicates.length) {
    return { duplicate: true, duplicates };
  }

  const profileId = crypto.randomUUID();
  const travelPreferencesJson = JSON.stringify(
    normalizeTravelPreferences(
      input.travelPreferences,
      input.accessibilityNeeds,
    ),
  );
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      `
      INSERT INTO passenger_profiles (
        id, owner_user_id, first_name, last_name, date_of_birth, passport_no, nationality, phone,
        emergency_contact_name, emergency_contact_phone, frequent_flyer_number, travel_preferences_json,
        notes, vip_label, is_blacklisted, blacklist_reason, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    ).run(
      profileId,
      input.ownerUserId,
      normalizedFirstName,
      normalizedLastName,
      input.dateOfBirth || null,
      passport.normalized,
      normalizedNationality,
      normalizeText(input.phone),
      normalizeText(input.emergencyContactName),
      normalizeText(input.emergencyContactPhone),
      normalizeText(input.frequentFlyerNumber),
      travelPreferencesJson,
      normalizeText(input.notes),
      normalizeText(input.vipLabel),
    );
    syncTags(profileId, input.tags || []);
    saveAudit(profileId, "create", input, actor);
    db.exec("COMMIT");
    return { duplicate: false, profile: getPassengerProfile(profileId) };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function updatePassengerProfile(
  passengerId: string,
  input: UpdatePassengerProfileInput,
  actor?: string,
) {
  const current = getPassengerProfile(passengerId);
  if (!current) throw new Error("Passenger profile not found");
  if (current.mergedIntoId)
    throw new Error("Merged passenger profile cannot be edited");

  const passport = validatePassportNumber(
    input.passportNo ?? current.passportNo ?? null,
  );
  if (!passport.valid)
    throw new Error(passport.reason || "Invalid passport number");

  const next = {
    firstName: normalizeText(input.firstName) || current.firstName,
    lastName: normalizeText(input.lastName) || current.lastName,
    dateOfBirth: input.dateOfBirth ?? current.dateOfBirth ?? null,
    passportNo: passport.normalized,
    nationality: normalizeNationality(
      input.nationality ?? current.nationality ?? null,
    ),
    phone: normalizeText(input.phone ?? current.phone ?? null),
    emergencyContactName: normalizeText(
      input.emergencyContactName ?? current.emergencyContactName ?? null,
    ),
    emergencyContactPhone: normalizeText(
      input.emergencyContactPhone ?? current.emergencyContactPhone ?? null,
    ),
    frequentFlyerNumber: normalizeText(
      input.frequentFlyerNumber ?? current.frequentFlyerNumber ?? null,
    ),
    travelPreferences: normalizeTravelPreferences(
      input.travelPreferences ?? current.travelPreferences,
      input.accessibilityNeeds,
    ),
    notes: normalizeText(input.notes ?? current.notes ?? null),
    vipLabel: normalizeText(input.vipLabel ?? current.vipLabel ?? null),
    isBlacklisted:
      typeof input.isBlacklisted === "boolean"
        ? input.isBlacklisted
        : current.isBlacklisted,
    blacklistReason: input.blacklistReason ?? current.blacklistReason ?? null,
    tags: input.tags ?? current.tags,
  };

  const duplicates = detectDuplicatePassengers({
    ownerUserId: current.ownerUserId,
    passportNo: next.passportNo,
    firstName: next.firstName,
    lastName: next.lastName,
    dateOfBirth: next.dateOfBirth || null,
    phone: next.phone || null,
    frequentFlyerNumber: next.frequentFlyerNumber || null,
  }).filter((p) => p.id !== passengerId);
  if (duplicates.length) return { duplicate: true, duplicates };

  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      `
      UPDATE passenger_profiles
      SET first_name = ?, last_name = ?, date_of_birth = ?, passport_no = ?, nationality = ?, phone = ?,
          emergency_contact_name = ?, emergency_contact_phone = ?, frequent_flyer_number = ?,
          travel_preferences_json = ?, notes = ?, vip_label = ?, is_blacklisted = ?, blacklist_reason = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `,
    ).run(
      next.firstName,
      next.lastName,
      next.dateOfBirth,
      next.passportNo,
      next.nationality,
      next.phone,
      next.emergencyContactName,
      next.emergencyContactPhone,
      next.frequentFlyerNumber,
      JSON.stringify(next.travelPreferences || {}),
      next.notes,
      next.vipLabel,
      next.isBlacklisted ? 1 : 0,
      next.blacklistReason,
      passengerId,
    );
    syncTags(passengerId, next.tags || []);
    saveAudit(passengerId, "update", input, actor);
    if (typeof input.isBlacklisted === "boolean") {
      db.prepare(
        `
        INSERT INTO passenger_blacklist_events (id, passenger_profile_id, action, reason, actor)
        VALUES (?, ?, ?, ?, ?)
      `,
      ).run(
        crypto.randomUUID(),
        passengerId,
        input.isBlacklisted ? "BLACKLIST" : "UNBLACKLIST",
        input.blacklistReason || null,
        actor || null,
      );
    }
    db.exec("COMMIT");
    return { profile: getPassengerProfile(passengerId) };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function deletePassengerProfile(passengerId: string, actor?: string) {
  const current = getPassengerProfile(passengerId);
  if (!current) throw new Error("Passenger profile not found");
  db.prepare(
    `UPDATE passenger_profiles SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
  ).run(passengerId);
  saveAudit(
    passengerId,
    "delete",
    { deletedAt: new Date().toISOString() },
    actor,
  );
  return { ok: true };
}

export function blacklistPassengerProfile(
  passengerId: string,
  reason: string,
  actor?: string,
) {
  return updatePassengerProfile(
    passengerId,
    { isBlacklisted: true, blacklistReason: reason },
    actor,
  );
}

export function unblacklistPassengerProfile(
  passengerId: string,
  actor?: string,
) {
  return updatePassengerProfile(
    passengerId,
    { isBlacklisted: false, blacklistReason: null },
    actor,
  );
}

export function setPassengerTags(
  passengerId: string,
  tags: string[],
  vipLabel?: string | null,
  actor?: string,
) {
  const current = getPassengerProfile(passengerId);
  if (!current) throw new Error("Passenger profile not found");
  db.exec("BEGIN IMMEDIATE");
  try {
    syncTags(passengerId, tags);
    db.prepare(
      `UPDATE passenger_profiles SET vip_label = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    ).run(vipLabel || null, passengerId);
    saveAudit(passengerId, "tags.update", { tags, vipLabel }, actor);
    db.exec("COMMIT");
    return { profile: getPassengerProfile(passengerId) };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function getPassengerTravelHistory(passengerId: string) {
  const rows = db
    .prepare(
      `
    SELECT * FROM passenger_travel_history WHERE passenger_profile_id = ? ORDER BY travel_at DESC
  `,
    )
    .all(passengerId) as any[];
  return rows.map((row) => ({
    id: row.id,
    bookingId: row.booking_id,
    bookingRef: row.booking_ref,
    flightId: row.flight_id,
    flightNumber: row.flight_number,
    departureTime: row.departure_time,
    arrivalTime: row.arrival_time,
    seatClass: row.seat_class,
    eventType: row.event_type,
    travelAt: row.travel_at,
    notes: row.notes,
  }));
}

export function recordPassengerTravel(input: PassengerTravelInput) {
  saveTravelHistory(input);
}

export function recordPassengerTravelForBooking(
  booking: any,
  eventType: string,
  actor?: string,
) {
  const flight = query.get<{
    flight_number: string;
    departure_time: string;
    arrival_time: string;
  }>(
    "SELECT flight_number, departure_time, arrival_time FROM flights WHERE id = ?",
    [booking.flightId],
  );
  if (!flight) return;

  for (const passenger of booking.passengers || []) {
    const matchingProfiles = findProfilesForBookingPassenger(
      passenger,
      booking,
    );
    for (const profile of matchingProfiles) {
      saveTravelHistory({
        passengerProfileId: profile.id,
        bookingId: booking.id,
        bookingRef: booking.reference,
        flightId: booking.flightId,
        flightNumber: flight.flight_number,
        departureTime: flight.departure_time,
        arrivalTime: flight.arrival_time,
        seatClass: booking.seatClass,
        eventType,
        notes: actor ? `actor:${actor}` : null,
      });
    }
  }
}

function findProfilesForBookingPassenger(passenger: any, booking: any) {
  if (passenger.profileId) {
    const profile = getPassengerProfile(passenger.profileId);
    return profile ? [profile] : [];
  }

  const passportNo = validatePassportNumber(
    passenger.passportNo || null,
  ).normalized;
  const rows = db
    .prepare(`SELECT * FROM passenger_profiles WHERE deleted_at IS NULL`)
    .all() as any[];
  const matches = rows.filter((row) => {
    if (passportNo && row.passport_no === passportNo) return true;
    if (passenger.firstName && passenger.lastName) {
      return (
        String(row.first_name).toLowerCase() ===
          String(passenger.firstName).toLowerCase() &&
        String(row.last_name).toLowerCase() ===
          String(passenger.lastName).toLowerCase()
      );
    }
    return false;
  });
  return matches.map(rowToProfile);
}

export function mergePassengerProfiles(input: PassengerMergeInput) {
  const source = getPassengerProfile(input.sourcePassengerId);
  const target = getPassengerProfile(input.targetPassengerId);
  if (!source || !target)
    throw new Error("Source or target passenger profile not found");
  if (source.id === target.id)
    throw new Error("Source and target cannot be the same");
  if (source.ownerUserId !== target.ownerUserId)
    throw new Error("Passenger merge requires the same owner");

  db.exec("BEGIN IMMEDIATE");
  try {
    const mergedTags = Array.from(
      new Set([...(target.tags || []), ...(source.tags || [])]),
    );
    syncTags(target.id, mergedTags);

    const travelPrefs = normalizeTravelPreferences(
      {
        ...(source.travelPreferences || {}),
        ...(target.travelPreferences || {}),
      },
      target.accessibilityNeeds || source.accessibilityNeeds || null,
    );
    const notes = [target.notes, source.notes].filter(Boolean).join("\n\n");
    db.prepare(
      `
      UPDATE passenger_profiles
      SET emergency_contact_name = COALESCE(emergency_contact_name, ?),
          emergency_contact_phone = COALESCE(emergency_contact_phone, ?),
          frequent_flyer_number = COALESCE(frequent_flyer_number, ?),
          travel_preferences_json = ?,
          notes = ?,
          vip_label = COALESCE(vip_label, ?),
          is_blacklisted = CASE WHEN is_blacklisted = 1 OR ? = 1 THEN 1 ELSE 0 END,
          blacklist_reason = COALESCE(blacklist_reason, ?),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    ).run(
      source.emergencyContactName,
      source.emergencyContactPhone,
      source.frequentFlyerNumber,
      JSON.stringify(travelPrefs),
      notes || null,
      source.vipLabel || null,
      source.isBlacklisted ? 1 : 0,
      source.blacklistReason || null,
      target.id,
    );

    db.prepare(
      `
      UPDATE passenger_travel_history SET passenger_profile_id = ? WHERE passenger_profile_id = ?
    `,
    ).run(target.id, source.id);

    db.prepare(
      `
      UPDATE passenger_profiles
      SET merged_into_id = ?, merged_at = CURRENT_TIMESTAMP, merged_by = ?, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    ).run(target.id, input.actor || null, source.id);

    db.prepare(
      `
      INSERT INTO passenger_merge_log (id, source_passenger_id, target_passenger_id, reason, actor)
      VALUES (?, ?, ?, ?, ?)
    `,
    ).run(
      crypto.randomUUID(),
      source.id,
      target.id,
      input.reason || null,
      input.actor || null,
    );

    saveAudit(
      source.id,
      "merge",
      { targetPassengerId: target.id, reason: input.reason },
      input.actor,
    );
    saveAudit(
      target.id,
      "merge.receive",
      { sourcePassengerId: source.id, reason: input.reason },
      input.actor,
    );
    db.exec("COMMIT");
    return {
      target: getPassengerProfile(target.id),
      source: getPassengerProfile(source.id),
    };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function findPassengerDuplicates(search: {
  ownerUserId?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string | null;
  passportNo?: string | null;
  phone?: string | null;
  frequentFlyerNumber?: string | null;
}) {
  return detectDuplicatePassengers(search);
}
