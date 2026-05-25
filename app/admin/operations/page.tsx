"use client";

import React, { useEffect, useMemo, useState } from "react";

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black text-[#002b5c]">{value}</div>
      {hint ? <div className="mt-1 text-sm text-slate-500">{hint}</div> : null}
    </div>
  );
}

function Section({
  title,
  children,
  subtitle,
}: {
  title: string;
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function OperationsDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState({ limit: 12 });
  const queryString = useMemo(() => `?limit=${query.limit}`, [query.limit]);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/operations${queryString}`);
    const payload = res.ok ? await res.json() : null;
    setData(payload);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [queryString]);

  const generatedAt = data?.generatedAt
    ? new Date(data.generatedAt).toLocaleString()
    : "—";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(0,43,92,0.08),_transparent_40%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c8102e]">
              Operations
            </div>
            <h1 className="text-2xl font-black text-[#002b5c]">
              Operational dashboards
            </h1>
            <p className="text-sm text-slate-500">
              Staff, flight operations, bookings, occupancy, revenue,
              assignments, and live operations feed.
            </p>
          </div>
          <div className="text-right text-sm text-slate-500">
            <div>Updated</div>
            <div className="font-semibold text-slate-800">{generatedAt}</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Staff active"
            value={data?.staff?.overview?.active ?? 0}
            hint={`Total staff: ${data?.staff?.overview?.total ?? 0}`}
          />
          <MetricCard
            label="Flights scheduled"
            value={data?.flights?.upcoming?.length ?? 0}
            hint={`Status groups: ${(data?.flights?.statusBreakdown || []).length}`}
          />
          <MetricCard
            label="Captured revenue"
            value={formatMoney(data?.revenue?.overview?.captured ?? 0)}
            hint={`Refunded: ${formatMoney(data?.revenue?.overview?.refunded ?? 0)}`}
          />
          <MetricCard
            label="Open assignments"
            value={data?.assignments?.overview?.open ?? 0}
            hint={`Conflicts: ${data?.assignments?.overview?.conflict ?? 0}`}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Section
            title="Staff dashboard"
            subtitle="Active headcount, departmental mix, and upcoming staff schedules."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <MetricCard
                label="On leave"
                value={data?.staff?.overview?.onLeave ?? 0}
              />
              <MetricCard
                label="Suspended"
                value={data?.staff?.overview?.suspended ?? 0}
              />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <MiniList
                title="By role"
                items={(data?.staff?.byRole || []).map(
                  (item: any) => `${item.role} • ${item.count}`,
                )}
              />
              <MiniList
                title="By department"
                items={(data?.staff?.byDepartment || []).map(
                  (item: any) => `${item.department} • ${item.count}`,
                )}
              />
            </div>
            <Table
              title="Upcoming staff schedules"
              rows={data?.staff?.upcomingSchedules || []}
              columns={["Employee", "Date", "Shift", "Status"]}
              renderRow={(row) => [
                `${row.first_name} ${row.last_name}`,
                row.schedule_date,
                `${row.shift_start} - ${row.shift_end}`,
                row.status,
              ]}
            />
          </Section>

          <Section
            title="Flight operations dashboard"
            subtitle="Upcoming schedule states and live status changes."
          >
            <div className="grid gap-4 md:grid-cols-4">
              {(data?.flights?.statusBreakdown || [])
                .slice(0, 4)
                .map((item: any) => (
                  <MetricCard
                    key={item.status}
                    label={item.status}
                    value={item.count}
                  />
                ))}
            </div>
            <Table
              title="Upcoming flights"
              rows={data?.flights?.upcoming || []}
              columns={[
                "Flight",
                "Route",
                "Departure",
                "Gate / Aircraft",
                "Status",
              ]}
              renderRow={(row) => [
                row.flight_number || row.flight_id,
                `${row.origin || "—"} → ${row.destination || "—"}`,
                row.departure_time,
                `${row.gate_code || "—"} / ${row.aircraft_registration || "—"}`,
                row.status,
              ]}
            />
          </Section>

          <Section
            title="Booking analytics dashboard"
            subtitle="Bookings by state and recent booking activity."
          >
            <div className="grid gap-4 md:grid-cols-4">
              <MetricCard
                label="Total"
                value={data?.bookings?.overview?.total ?? 0}
              />
              <MetricCard
                label="Confirmed"
                value={data?.bookings?.overview?.confirmed ?? 0}
              />
              <MetricCard
                label="Cancelled"
                value={data?.bookings?.overview?.cancelled ?? 0}
              />
              <MetricCard
                label="Pending"
                value={data?.bookings?.overview?.pending ?? 0}
              />
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-700">
                Cancellation refunds
              </div>
              <div className="mt-2 text-2xl font-black text-[#002b5c]">
                {formatMoney(data?.bookings?.cancellations?.refundTotal ?? 0)}
              </div>
              <div className="text-sm text-slate-500">
                {data?.bookings?.cancellations?.count ?? 0} cancellation records
              </div>
            </div>
            <Table
              title="Recent bookings"
              rows={data?.bookings?.recent || []}
              columns={[
                "Booking",
                "Flight",
                "Class",
                "Seats",
                "Status",
                "Created",
              ]}
              renderRow={(row) => [
                row.booking_ref,
                row.flight_id,
                row.seat_class,
                row.seats,
                row.status,
                row.created_at,
              ]}
            />
          </Section>

          <Section
            title="Occupancy dashboard"
            subtitle="Seat load and locks across the active fleet."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard
                label="Locked seats"
                value={data?.occupancy?.lockedSeats ?? 0}
              />
              <MetricCard
                label="Tracked flights"
                value={(data?.occupancy?.flights || []).length}
              />
              <MetricCard
                label="Avg occupancy"
                value={averageOccupancy(data?.occupancy?.flights || [])}
              />
            </div>
            <Table
              title="Flight occupancy"
              rows={data?.occupancy?.flights || []}
              columns={["Flight", "Route", "Occupancy", "Locked", "Available"]}
              renderRow={(row) => [
                row.flight_number,
                `${row.origin} → ${row.destination}`,
                `${row.occupancy.occupied}/${row.occupancy.total}`,
                row.occupancy.locked,
                row.occupancy.available,
              ]}
            />
          </Section>

          <Section
            title="Revenue dashboard"
            subtitle="Cash captured, pending, and refunded by provider."
          >
            <div className="grid gap-4 md:grid-cols-4">
              <MetricCard
                label="Captured"
                value={formatMoney(data?.revenue?.overview?.captured ?? 0)}
              />
              <MetricCard
                label="Pending"
                value={formatMoney(data?.revenue?.overview?.pending ?? 0)}
              />
              <MetricCard
                label="Refunded"
                value={formatMoney(data?.revenue?.overview?.refunded ?? 0)}
              />
              <MetricCard
                label="Payments"
                value={data?.revenue?.overview?.total ?? 0}
              />
            </div>
            <Table
              title="By provider"
              rows={data?.revenue?.byProvider || []}
              columns={["Provider", "Payments", "Amount"]}
              renderRow={(row) => [
                row.provider,
                row.count,
                formatMoney(row.amount),
              ]}
            />
            <Table
              title="Recent payments"
              rows={data?.revenue?.recent || []}
              columns={["Payment", "Booking", "Amount", "Provider", "Status"]}
              renderRow={(row) => [
                row.id,
                row.booking_id || "—",
                formatMoney(row.amount),
                row.provider,
                row.status,
              ]}
            />
          </Section>

          <Section
            title="Assignment dashboard"
            subtitle="Open requests, approvals, and crew allocation health."
          >
            <div className="grid gap-4 md:grid-cols-4">
              <MetricCard
                label="Total"
                value={data?.assignments?.overview?.total ?? 0}
              />
              <MetricCard
                label="Assigned"
                value={data?.assignments?.overview?.assigned ?? 0}
              />
              <MetricCard
                label="Pending"
                value={data?.assignments?.overview?.pendingApproval ?? 0}
              />
              <MetricCard
                label="Conflict"
                value={data?.assignments?.overview?.conflict ?? 0}
              />
            </div>
            <Table
              title="By role"
              rows={data?.assignments?.byRole || []}
              columns={["Role", "Count"]}
              renderRow={(row) => [row.role, row.count]}
            />
            <Table
              title="Open assignments"
              rows={data?.assignments?.open || []}
              columns={["Flight", "Employee", "Role", "Status"]}
              renderRow={(row) => [
                row.flight_number || row.flight_id,
                row.first_name ? `${row.first_name} ${row.last_name}` : "Open",
                row.assignment_role,
                row.status,
              ]}
            />
          </Section>
        </section>

        <Section
          title="Real-time operations feed"
          subtitle="Live operational events merged from flights, bookings, payments, and assignments."
        >
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-slate-600">
              Feed size
            </label>
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={query.limit}
              onChange={(e) =>
                setQuery({ limit: Number(e.target.value) || 12 })
              }
            >
              <option value={8}>8</option>
              <option value={12}>12</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
            </select>
            <button
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              onClick={load}
            >
              Refresh now
            </button>
          </div>
          <div className="space-y-3">
            {loading && !data ? (
              <div className="text-sm text-slate-500">Loading feed...</div>
            ) : null}
            {(data?.feed || []).length === 0 ? (
              <div className="text-sm text-slate-500">
                No recent operations yet.
              </div>
            ) : (
              (data?.feed || []).map((item: any) => (
                <div
                  key={`${item.type}-${item.at}-${item.title}`}
                  className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {item.title}
                    </div>
                    {item.detail ? (
                      <div className="text-sm text-slate-600">
                        {item.detail}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {new Date(item.at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </Section>
      </main>
    </div>
  );
}

function Table({
  title,
  rows,
  columns,
  renderRow,
}: {
  title: string;
  rows: any[];
  columns: string[];
  renderRow: (row: any) => (string | number | React.ReactNode)[];
}) {
  if (!rows || rows.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        {title}: no records yet.
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
        {title}
      </div>
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-white text-left text-xs uppercase tracking-[0.12em] text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-4 py-3">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.slice(0, 8).map((row) => (
            <tr key={row.id || JSON.stringify(row)}>
              {renderRow(row).map((cell, index) => (
                <td key={index} className="px-4 py-3 align-top text-slate-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-semibold text-slate-700">{title}</div>
      <div className="mt-3 space-y-2 text-sm text-slate-600">
        {items.length === 0 ? (
          <div>No data</div>
        ) : (
          items.map((item) => (
            <div key={item} className="rounded-xl bg-white px-3 py-2 shadow-sm">
              {item}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function averageOccupancy(flights: any[]) {
  if (!flights.length) return "0%";
  const ratios = flights.map((flight) => {
    const total = Number(flight.occupancy?.total || 0);
    const occupied = Number(flight.occupancy?.occupied || 0);
    return total > 0 ? occupied / total : 0;
  });
  const avg = ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
  return `${Math.round(avg * 100)}%`;
}
