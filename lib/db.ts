// @ts-nocheck
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

// Singleton pattern to prevent database connection leaks during development hot-reloading
const globalForDb = global as unknown as {
  db?: DatabaseSync;
  dbBootstrapped?: boolean;
};

const dbPath = path.join(process.cwd(), "db.sqlite");

function getDb() {
  if (!globalForDb.db) {
    globalForDb.db = new DatabaseSync(dbPath);
    globalForDb.db.exec("PRAGMA busy_timeout = 5000;");
  }

  if (!globalForDb.dbBootstrapped) {
    bootstrapDatabase(globalForDb.db);
    globalForDb.dbBootstrapped = true;
  }

  return globalForDb.db;
}

export const db = new Proxy({} as DatabaseSync, {
  get(_target, prop) {
    const database = getDb();
    const value = database[prop as keyof DatabaseSync];
    return typeof value === "function" ? value.bind(database) : value;
  },
});

// Bootstrap schema
function bootstrapDatabase(db: DatabaseSync) {
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'PASSENGER',
    email_verified INTEGER NOT NULL DEFAULT 0,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT,
    two_factor_enabled INTEGER NOT NULL DEFAULT 0,
    two_factor_secret TEXT,
    two_factor_temp_secret TEXT,
    avatar_url TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    session_token TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    expires_at TEXT NOT NULL,
    is_valid INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS verification_tokens (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    type TEXT NOT NULL, -- 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'MFA_CODE'
    code TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS login_attempts (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS suspicious_alerts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    resolved INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS passengers (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    passport_no TEXT UNIQUE,
    nationality TEXT,
    date_of_birth TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS flights (
    id TEXT PRIMARY KEY,
    flight_number TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    departure_time TEXT NOT NULL,
    arrival_time TEXT NOT NULL,
    price_economy REAL NOT NULL,
    price_business REAL NOT NULL,
    price_first REAL NOT NULL
  );

  -- meta table for flight states (active/archived/recurrence)
  CREATE TABLE IF NOT EXISTS flight_meta (
    flight_id TEXT PRIMARY KEY,
    is_active INTEGER NOT NULL DEFAULT 1,
    is_archived INTEGER NOT NULL DEFAULT 0,
    recurrence_rule TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(flight_id) REFERENCES flights(id) ON DELETE CASCADE
  );

  -- Route management (logical route grouping)
  CREATE TABLE IF NOT EXISTS routes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Aircraft registry
  CREATE TABLE IF NOT EXISTS aircraft (
    id TEXT PRIMARY KEY,
    registration TEXT NOT NULL,
    model TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Gates
  CREATE TABLE IF NOT EXISTS gates (
    id TEXT PRIMARY KEY,
    terminal TEXT,
    gate_code TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Flight schedule entries (per-flight-run scheduling)
  CREATE TABLE IF NOT EXISTS flight_schedules (
    id TEXT PRIMARY KEY,
    flight_id TEXT NOT NULL,
    route_id TEXT,
    departure_time TEXT NOT NULL,
    departure_timezone TEXT,
    arrival_time TEXT NOT NULL,
    arrival_timezone TEXT,
    boarding_time TEXT,
    aircraft_id TEXT,
    gate_id TEXT,
    status TEXT NOT NULL DEFAULT 'SCHEDULED', -- SCHEDULED | DELAYED | CANCELLED | DEPARTED | ARRIVED
    delay_minutes INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(flight_id) REFERENCES flights(id) ON DELETE CASCADE,
    FOREIGN KEY(route_id) REFERENCES routes(id),
    FOREIGN KEY(aircraft_id) REFERENCES aircraft(id),
    FOREIGN KEY(gate_id) REFERENCES gates(id)
  );

  -- Flight status updates log and notification snapshot
  CREATE TABLE IF NOT EXISTS flight_status_updates (
    id TEXT PRIMARY KEY,
    schedule_id TEXT NOT NULL,
    status TEXT NOT NULL,
    reason TEXT,
    note TEXT,
    actor TEXT,
    notified_passengers_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(schedule_id) REFERENCES flight_schedules(id) ON DELETE CASCADE
  );

  -- Seat locks for checkout flow and availability
  CREATE TABLE IF NOT EXISTS seat_locks (
    id TEXT PRIMARY KEY,
    seat_id TEXT NOT NULL,
    flight_id TEXT NOT NULL,
    user_id TEXT,
    reserved_for_booking_id TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(seat_id) REFERENCES seats(id) ON DELETE CASCADE,
    FOREIGN KEY(flight_id) REFERENCES flights(id) ON DELETE CASCADE
  );

  -- Waitlist entries for full flights
  CREATE TABLE IF NOT EXISTS flight_waitlist (
    id TEXT PRIMARY KEY,
    flight_id TEXT NOT NULL,
    passenger_profile_id TEXT,
    user_id TEXT,
    requested_seat_class TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Additional seat metadata for seat map features
  CREATE TABLE IF NOT EXISTS seats_meta (
    seat_id TEXT PRIMARY KEY,
    is_emergency_exit INTEGER NOT NULL DEFAULT 0,
    is_accessible INTEGER NOT NULL DEFAULT 0,
    price_modifier REAL DEFAULT 0,
    preference_tags TEXT, -- comma separated tags like "window,aisle,extra_legroom"
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(seat_id) REFERENCES seats(id) ON DELETE CASCADE
  );

  -- Payments and invoices
  CREATE TABLE IF NOT EXISTS payment_methods (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    type TEXT NOT NULL, -- 'MPESA' | 'AIRTEL' | 'CARD' | 'BANK_TRANSFER'
    details_json TEXT,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    booking_id TEXT,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'KES',
    provider TEXT NOT NULL,
    provider_payment_id TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | AUTHORIZED | CAPTURED | FAILED | REFUNDED
    metadata_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS payment_attempts (
    id TEXT PRIMARY KEY,
    payment_id TEXT NOT NULL,
    attempt_no INTEGER NOT NULL,
    provider_response_json TEXT,
    success INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(payment_id) REFERENCES payments(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS refunds (
    id TEXT PRIMARY KEY,
    refund_ref TEXT UNIQUE NOT NULL,
    booking_id TEXT,
    booking_reference TEXT,
    payment_id TEXT,
    provider TEXT,
    provider_refund_id TEXT,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'KES',
    status TEXT NOT NULL DEFAULT 'REQUESTED', -- REQUESTED | PENDING_APPROVAL | APPROVED | PROCESSING | COMPLETED | REJECTED | FAILED
    reason TEXT NOT NULL,
    partial INTEGER NOT NULL DEFAULT 0,
    approval_required INTEGER NOT NULL DEFAULT 0,
    requested_by_role TEXT,
    requested_by TEXT,
    approved_by TEXT,
    rejected_by TEXT,
    failure_reason TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    source TEXT,
    notes TEXT,
    metadata_json TEXT,
    requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at TEXT,
    rejected_at TEXT,
    completed_at TEXT,
    failed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(payment_id) REFERENCES payments(id) ON DELETE SET NULL,
    FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS refund_events (
    id TEXT PRIMARY KEY,
    refund_id TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    actor TEXT,
    details_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(refund_id) REFERENCES refunds(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    booking_id TEXT,
    invoice_number TEXT UNIQUE NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'KES',
    issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at TEXT,
    pdf_url TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS seats (
    id TEXT PRIMARY KEY,
    flight_id TEXT NOT NULL,
    seat_number TEXT NOT NULL,
    seat_class TEXT NOT NULL, -- 'ECONOMY', 'BUSINESS', 'FIRST'
    is_occupied INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(flight_id) REFERENCES flights(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    booking_ref TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    flight_id TEXT NOT NULL,
    seat_id TEXT NOT NULL,
    passenger_first_name TEXT NOT NULL,
    passenger_last_name TEXT NOT NULL,
    passenger_passport_no TEXT NOT NULL,
    seat_class TEXT NOT NULL,
    extra_baggage INTEGER NOT NULL DEFAULT 0,
    meal_preference TEXT,
    total_price REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'CONFIRMED',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(flight_id) REFERENCES flights(id),
    FOREIGN KEY(seat_id) REFERENCES seats(id)
  );

  CREATE TABLE IF NOT EXISTS booking_versions (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    flight_id TEXT NOT NULL,
    seat_id TEXT NOT NULL,
    seat_class TEXT NOT NULL,
    extra_baggage INTEGER NOT NULL,
    meal_preference TEXT,
    total_price REAL NOT NULL,
    status TEXT NOT NULL,
    modified_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS booking_audit_trail (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS booking_status_timeline (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL,
    status TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS bookings_v2 (
    id TEXT PRIMARY KEY,
    booking_ref TEXT UNIQUE NOT NULL,
    user_id TEXT,
    flight_id TEXT NOT NULL,
    seat_class TEXT NOT NULL,
    seats INTEGER NOT NULL,
    fare_json TEXT NOT NULL,
    passengers_json TEXT NOT NULL,
    promo_code TEXT,
    status TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    contact_email TEXT,
    contact_phone TEXT,
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancellation_json TEXT,
    status_timeline_json TEXT,
    FOREIGN KEY(flight_id) REFERENCES flights(id)
  );

  CREATE TABLE IF NOT EXISTS booking_passengers_v2 (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL,
    passenger_id TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    passenger_type TEXT NOT NULL,
    dob TEXT,
    special_assistance TEXT,
    seat_assignment TEXT,
    meal_preference TEXT,
    is_cancelled INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS booking_snapshots_v2 (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    snapshot_json TEXT NOT NULL,
    reason TEXT,
    actor TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS booking_audit_v2 (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details_json TEXT,
    actor TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS booking_timeline_v2 (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL,
    status TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS booking_cancellations (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL UNIQUE,
    reason TEXT NOT NULL,
    requested_by_role TEXT,
    cancelled_passenger_ids TEXT NOT NULL,
    cancelled_seats INTEGER NOT NULL,
    partial INTEGER NOT NULL DEFAULT 0,
    refund_eligible INTEGER NOT NULL DEFAULT 0,
    refund_amount REAL NOT NULL DEFAULT 0,
    refund_policy TEXT NOT NULL,
    cancelled_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    undo_until TEXT,
    undone_at TEXT,
    actor TEXT,
    notes TEXT,
    FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS booking_reports (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL,
    reference TEXT NOT NULL,
    report_type TEXT NOT NULL,
    reason TEXT NOT NULL,
    cancelled_seats INTEGER NOT NULL,
    refund_eligible INTEGER NOT NULL,
    refund_amount REAL NOT NULL,
    partial INTEGER NOT NULL,
    role TEXT,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS passenger_profiles (
    id TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth TEXT,
    passport_no TEXT,
    nationality TEXT,
    phone TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    frequent_flyer_number TEXT,
    travel_preferences_json TEXT NOT NULL DEFAULT '{}',
    notes TEXT,
    vip_label TEXT,
    is_blacklisted INTEGER NOT NULL DEFAULT 0,
    blacklist_reason TEXT,
    blacklisted_at TEXT,
    blacklisted_by TEXT,
    merged_into_id TEXT,
    merged_at TEXT,
    merged_by TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS passenger_tags (
    id TEXT PRIMARY KEY,
    passenger_profile_id TEXT NOT NULL,
    tag TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(passenger_profile_id) REFERENCES passenger_profiles(id) ON DELETE CASCADE,
    UNIQUE(passenger_profile_id, tag)
  );

  CREATE TABLE IF NOT EXISTS passenger_travel_history (
    id TEXT PRIMARY KEY,
    passenger_profile_id TEXT NOT NULL,
    booking_id TEXT,
    booking_ref TEXT,
    flight_id TEXT,
    flight_number TEXT,
    departure_time TEXT,
    arrival_time TEXT,
    seat_class TEXT,
    event_type TEXT NOT NULL,
    travel_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(passenger_profile_id) REFERENCES passenger_profiles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS passenger_blacklist_events (
    id TEXT PRIMARY KEY,
    passenger_profile_id TEXT NOT NULL,
    action TEXT NOT NULL,
    reason TEXT,
    actor TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(passenger_profile_id) REFERENCES passenger_profiles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS passenger_audit_log (
    id TEXT PRIMARY KEY,
    passenger_profile_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details_json TEXT,
    actor TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(passenger_profile_id) REFERENCES passenger_profiles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS passenger_merge_log (
    id TEXT PRIMARY KEY,
    source_passenger_id TEXT NOT NULL,
    target_passenger_id TEXT NOT NULL,
    reason TEXT,
    actor TEXT,
    merged_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(source_passenger_id) REFERENCES passenger_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY(target_passenger_id) REFERENCES passenger_profiles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    manager_employee_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE,
    employee_number TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    job_title TEXT,
    employee_role TEXT NOT NULL,
    department_id TEXT,
    employment_type TEXT NOT NULL DEFAULT 'FULL_TIME',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    permissions_json TEXT NOT NULL DEFAULT '[]',
    profile_json TEXT NOT NULL DEFAULT '{}',
    notes TEXT,
    hired_at TEXT,
    manager_employee_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE SET NULL,
    FOREIGN KEY(manager_employee_id) REFERENCES employees(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS employee_schedules (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    schedule_date TEXT NOT NULL,
    shift_start TEXT NOT NULL,
    shift_end TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Africa/Nairobi',
    status TEXT NOT NULL DEFAULT 'SCHEDULED',
    location TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS employee_availability (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    availability_date TEXT,
    day_of_week INTEGER,
    available_from TEXT,
    available_to TEXT,
    timezone TEXT NOT NULL DEFAULT 'Africa/Nairobi',
    status TEXT NOT NULL DEFAULT 'AVAILABLE',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS employee_activity_logs (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details_json TEXT,
    actor TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS flight_staffing_requirements (
    id TEXT PRIMARY KEY,
    flight_schedule_id TEXT NOT NULL,
    role TEXT NOT NULL,
    required_count INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(flight_schedule_id) REFERENCES flight_schedules(id) ON DELETE CASCADE,
    UNIQUE(flight_schedule_id, role)
  );

  CREATE TABLE IF NOT EXISTS staff_assignments (
    id TEXT PRIMARY KEY,
    flight_schedule_id TEXT NOT NULL,
    flight_id TEXT NOT NULL,
    employee_id TEXT,
    assignment_role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN | PENDING_APPROVAL | APPROVED | ASSIGNED | REJECTED | CONFLICT | CANCELLED | COMPLETED
    source TEXT NOT NULL DEFAULT 'MANUAL', -- MANUAL | MATCHED | AUTO
    match_score REAL NOT NULL DEFAULT 0,
    match_reason TEXT,
    conflict_reason TEXT,
    open_text TEXT,
    required_count INTEGER NOT NULL DEFAULT 1,
    approved_by TEXT,
    rejected_by TEXT,
    completed_by TEXT,
    started_at TEXT,
    ended_at TEXT,
    notes TEXT,
    metadata_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(flight_schedule_id) REFERENCES flight_schedules(id) ON DELETE CASCADE,
    FOREIGN KEY(flight_id) REFERENCES flights(id) ON DELETE CASCADE,
    FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS staff_assignment_history (
    id TEXT PRIMARY KEY,
    assignment_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details_json TEXT,
    actor TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(assignment_id) REFERENCES staff_assignments(id) ON DELETE CASCADE
  );

  -- Stored reports generated by scheduled jobs or on-demand
  CREATE TABLE IF NOT EXISTS stored_reports (
    id TEXT PRIMARY KEY,
    schedule_id TEXT,
    report_type TEXT NOT NULL,
    params_json TEXT,
    file_path TEXT,
    file_format TEXT,
    generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(schedule_id) REFERENCES report_schedules(id) ON DELETE SET NULL
  );

  -- Scheduled report definitions
  CREATE TABLE IF NOT EXISTS report_schedules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    report_type TEXT NOT NULL,
    params_json TEXT,
    interval_minutes INTEGER NOT NULL DEFAULT 1440,
    next_run_at TEXT,
    last_run_at TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Notifications: in-app notifications for users
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT,
    message TEXT,
    metadata_json TEXT,
    read INTEGER NOT NULL DEFAULT 0,
    delivered_channels TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Push subscription storage (Web Push)
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    keys_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Notification templates for system announcements and common messages
  CREATE TABLE IF NOT EXISTS notification_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    channel TEXT NOT NULL,
    subject_template TEXT,
    body_template TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Scheduled reminders (e.g., booking reminders)
  CREATE TABLE IF NOT EXISTS scheduled_reminders (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    booking_id TEXT,
    send_at TEXT NOT NULL,
    type TEXT NOT NULL,
    params_json TEXT,
    sent INTEGER NOT NULL DEFAULT 0,
    sent_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Support tickets submitted by users via contact form
  CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    ticket_ref TEXT UNIQUE,
    name TEXT,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    context_json TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN | PENDING | CLOSED | ESCALATED | RESOLVED
    priority TEXT NOT NULL DEFAULT 'MEDIUM', -- LOW | MEDIUM | HIGH | URGENT
    escalation_level INTEGER NOT NULL DEFAULT 0,
    assigned_to TEXT,
    sla_due_at TEXT,
    csat_score INTEGER,
    csat_feedback TEXT,
    csat_submitted_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS support_ticket_events (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    details_json TEXT,
    actor TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS support_ticket_csat (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    feedback TEXT,
    submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
  );

  -- Live chat sessions for real-time customer support (polled or socket)
  CREATE TABLE IF NOT EXISTS live_chat_sessions (
    id TEXT PRIMARY KEY,
    ticket_id TEXT,
    visitor_id TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN | CLOSED
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS live_chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    sender TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(session_id) REFERENCES live_chat_sessions(id) ON DELETE CASCADE
  );

  -- Messaging: threads, messages, receipts and attachments
  CREATE TABLE IF NOT EXISTS message_threads (
    id TEXT PRIMARY KEY,
    subject TEXT,
    participants_json TEXT NOT NULL,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(thread_id) REFERENCES message_threads(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS message_receipts (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    delivered_channels TEXT,
    read INTEGER NOT NULL DEFAULT 0,
    read_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS message_attachments (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    filename TEXT,
    content_type TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE
  );

  -- Message templates for automated communications
  CREATE TABLE IF NOT EXISTS message_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    channel TEXT NOT NULL,
    subject_template TEXT,
    body_template TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Admin settings and feature toggles
  CREATE TABLE IF NOT EXISTS admin_settings (
    id TEXT PRIMARY KEY,
    key_name TEXT UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS feature_toggles (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT,
    actor_role TEXT,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    details_json TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS metrics_rum (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

// Bootstrap seed data for flights and seats if empty
const flightCheck = db
  .prepare("SELECT COUNT(*) as count FROM flights")
  .get() as { count: number };
if (!flightCheck || flightCheck.count === 0) {
  const f1 = "flight-nbo-lhr-kq100";
  const f2 = "flight-nbo-dxb-kq200";
  const f3 = "flight-nbo-jfk-kq300";

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const dateStr = tomorrow.toISOString().split("T")[0];

  db.prepare(
    `
    INSERT INTO flights (id, flight_number, origin, destination, departure_time, arrival_time, price_economy, price_business, price_first)
    VALUES 
      (?, 'KQ100', 'NBO', 'LHR', ?, ?, 600.0, 1500.0, 3000.0),
      (?, 'KQ200', 'NBO', 'DXB', ?, ?, 400.0, 1000.0, 2000.0),
      (?, 'KQ300', 'NBO', 'JFK', ?, ?, 900.0, 2500.0, 4500.0)
  `,
  ).run(
    f1,
    `${dateStr}T08:00:00Z`,
    `${dateStr}T16:30:00Z`,
    f2,
    `${dateStr}T14:00:00Z`,
    `${dateStr}T20:00:00Z`,
    f3,
    `${dateStr}T23:30:00Z`,
    `${tomorrow.toISOString().split("T")[0]}T13:30:00Z`,
  );

  const stmt = db.prepare(`
    INSERT INTO seats (id, flight_id, seat_number, seat_class, is_occupied)
    VALUES (?, ?, ?, ?, 0)
  `);

  for (const fId of [f1, f2, f3]) {
    // First class seats
    for (let row = 1; row <= 2; row++) {
      for (const letter of ["A", "B", "E", "F"]) {
        stmt.run(
          `${fId}-first-${row}${letter}`,
          fId,
          `${row}${letter}`,
          "FIRST",
        );
      }
    }
    // Business class seats
    for (let row = 4; row <= 6; row++) {
      for (const letter of ["A", "B", "C", "D", "E", "F"]) {
        stmt.run(
          `${fId}-business-${row}${letter}`,
          fId,
          `${row}${letter}`,
          "BUSINESS",
        );
      }
    }
    // Economy class seats
    for (let row = 10; row <= 15; row++) {
      for (const letter of ["A", "B", "C", "D", "E", "F"]) {
        stmt.run(
          `${fId}-economy-${row}${letter}`,
          fId,
          `${row}${letter}`,
          "ECONOMY",
        );
      }
    }
  }
}
}

// Types matching database rows
export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
  role: "PASSENGER" | "STAFF" | "ADMIN";
  email_verified: number; // 0 or 1
  failed_attempts: number;
  locked_until: string | null; // ISO string
  two_factor_enabled: number; // 0 or 1
  two_factor_secret: string | null;
  two_factor_temp_secret: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionRow {
  id: string;
  session_token: string;
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: string; // ISO string
  is_valid: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface VerificationTokenRow {
  id: string;
  email: string;
  token: string;
  expires_at: string; // ISO string
  type: "EMAIL_VERIFICATION" | "PASSWORD_RESET" | "MFA_CODE";
  code: string | null;
  created_at: string;
}

export interface LoginAttemptRow {
  id: string;
  email: string;
  ip_address: string;
  timestamp: string;
}

export interface SuspiciousAlertRow {
  id: string;
  user_id: string;
  ip_address: string;
  user_agent: string;
  resolved: number; // 0 or 1
  created_at: string;
}

export interface PassengerRow {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  passport_no: string | null;
  nationality: string | null;
  date_of_birth: string | null;
  created_at: string;
}
export interface FlightRow {
  id: string;
  flight_number: string;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  price_economy: number;
  price_business: number;
  price_first: number;
}

export interface SeatRow {
  id: string;
  flight_id: string;
  seat_number: string;
  seat_class: string;
  is_occupied: number; // 0 or 1
}

export interface BookingRow {
  id: string;
  booking_ref: string;
  user_id: string;
  flight_id: string;
  seat_id: string;
  passenger_first_name: string;
  passenger_last_name: string;
  passenger_passport_no: string;
  seat_class: string;
  extra_baggage: number;
  meal_preference: string | null;
  total_price: number;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface BookingVersionRow {
  id: string;
  booking_id: string;
  version: number;
  flight_id: string;
  seat_id: string;
  seat_class: string;
  extra_baggage: number;
  meal_preference: string | null;
  total_price: number;
  status: string;
  modified_at: string;
}

export interface BookingAuditTrailRow {
  id: string;
  booking_id: string;
  user_id: string;
  action: string;
  description: string;
  created_at: string;
}

export interface BookingStatusTimelineRow {
  id: string;
  booking_id: string;
  status: string;
  description: string;
  created_at: string;
}

export interface DepartmentRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  manager_employee_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeRow {
  id: string;
  user_id: string | null;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  employee_role: string;
  department_id: string | null;
  employment_type: string;
  status: string;
  permissions_json: string;
  profile_json: string;
  notes: string | null;
  hired_at: string | null;
  manager_employee_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeScheduleRow {
  id: string;
  employee_id: string;
  schedule_date: string;
  shift_start: string;
  shift_end: string;
  timezone: string;
  status: string;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeAvailabilityRow {
  id: string;
  employee_id: string;
  availability_date: string | null;
  day_of_week: number | null;
  available_from: string | null;
  available_to: string | null;
  timezone: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeActivityLogRow {
  id: string;
  employee_id: string;
  action: string;
  details_json: string | null;
  actor: string | null;
  created_at: string;
}

export interface FlightStaffingRequirementRow {
  id: string;
  flight_schedule_id: string;
  role: string;
  required_count: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffAssignmentRow {
  id: string;
  flight_schedule_id: string;
  flight_id: string;
  employee_id: string | null;
  assignment_role: string;
  status: string;
  source: string;
  match_score: number;
  match_reason: string | null;
  conflict_reason: string | null;
  open_text: string | null;
  required_count: number;
  approved_by: string | null;
  rejected_by: string | null;
  completed_by: string | null;
  started_at: string | null;
  ended_at: string | null;
  notes: string | null;
  metadata_json: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffAssignmentHistoryRow {
  id: string;
  assignment_id: string;
  action: string;
  details_json: string | null;
  actor: string | null;
  created_at: string;
}

// Database helper functions with parameterized query execution
export const query = {
  get<T>(sql: string, params: any[] = []): T | undefined {
    const stmt = db.prepare(sql);
    return stmt.get(...params) as T | undefined;
  },

  all<T>(sql: string, params: any[] = []): T[] {
    const stmt = db.prepare(sql);
    return stmt.all(...params) as T[];
  },

  run(
    sql: string,
    params: any[] = [],
  ): { changes: number; lastInsertRowid: number | bigint } {
    const stmt = db.prepare(sql);
    return stmt.run(...params);
  },
};
