-- Add recommended indexes for Postgres and SQLite.
-- Run against your production DB (Postgres) or dev SQLite as appropriate.

-- Support tickets by created_at,id for cursor pagination
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at_id ON support_tickets (created_at DESC, id DESC);

-- Events by ticket
CREATE INDEX IF NOT EXISTS idx_support_ticket_events_ticket_id ON support_ticket_events (ticket_id);

-- Flights by departure time
CREATE INDEX IF NOT EXISTS idx_flights_departure_time ON flights (departure_time);

-- Bookings by flight
CREATE INDEX IF NOT EXISTS idx_bookings_flight_id ON bookings (flight_id);

-- Payments by booking
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments (booking_id);

-- Messages and threads
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages (thread_id);

-- Metrics RUM recent
CREATE INDEX IF NOT EXISTS idx_metrics_rum_received_at ON metrics_rum (received_at DESC);

-- Note: for Postgres, consider creating BRIN indexes on timestamp columns for very large tables.
