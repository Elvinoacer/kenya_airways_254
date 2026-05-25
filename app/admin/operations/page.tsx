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
    <div className="rounded-2xl border border-[#e5e2e1] bg-white p-5 shadow-[0_4px_12px_rgba(13,13,13,0.05)] transition-all hover:shadow-[0_8px_24px_rgba(13,13,13,0.08)]">
      <div className="text-xs font-bold uppercase tracking-widest text-[#5e3f3c]">
        {label}
      </div>
      <div className="mt-2 text-3xl font-black text-[#1A1A1A]">{value}</div>
      {hint ? <div className="mt-2 text-sm text-[#5e3f3c]">{hint}</div> : null}
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
    <section className="rounded-3xl border border-[#e5e2e1] bg-white p-6 shadow-[0_8px_32px_rgba(13,13,13,0.06)]">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#1A1A1A]">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-[#5e3f3c]">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div>{children}</div>
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
    <div className="text-[#1A1A1A]">
      <header className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-6 lg:px-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
              Operations
            </div>
            <h1 className="text-3xl font-black text-[#1A1A1A]">
              Operational Dashboards
            </h1>
            <p className="text-sm text-[#5e3f3c] mt-2 max-w-2xl">
              Staff, flight operations, bookings, occupancy, revenue,
              assignments, and live operations feed.
            </p>
          </div>
          <div className="text-right text-sm text-[#5e3f3c] bg-[#fcf9f8] p-3 rounded-xl border border-[#e5e2e1]">
            <div className="uppercase text-[10px] tracking-wider font-bold mb-1">Updated</div>
            <div className="font-bold text-[#1A1A1A]">{generatedAt}</div>
          </div>
        </div>
      </header>

      <main className="p-6 lg:p-8 space-y-8 max-w-[1600px]">
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
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

        <section className="grid gap-8 xl:grid-cols-2">
          <Section
            title="Staff Dashboard"
            subtitle="Active headcount, departmental mix, and upcoming staff schedules."
          >
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <MetricCard
                label="On leave"
                value={data?.staff?.overview?.onLeave ?? 0}
              />
              <MetricCard
                label="Suspended"
                value={data?.staff?.overview?.suspended ?? 0}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2 mb-6">
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
                <StatusBadge key="status" status={row.status} />,
              ]}
            />
          </Section>

          <Section
            title="Flight Operations"
            subtitle="Upcoming schedule states and live status changes."
          >
            <div className="grid gap-4 md:grid-cols-4 mb-6">
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
                <span key="flight" className="font-bold">{row.flight_number || row.flight_id}</span>,
                `${row.origin || "—"} → ${row.destination || "—"}`,
                row.departure_time,
                `${row.gate_code || "—"} / ${row.aircraft_registration || "—"}`,
                <StatusBadge key="status" status={row.status} />,
              ]}
            />
          </Section>

          <Section
            title="Booking Analytics"
            subtitle="Bookings by state and recent booking activity."
          >
            <div className="grid gap-4 md:grid-cols-4 mb-6">
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
            <div className="mb-6 rounded-2xl bg-[#fcf9f8] p-5 border border-[#e5e2e1] shadow-inner">
              <div className="text-xs font-bold uppercase tracking-widest text-[#5e3f3c]">
                Cancellation refunds
              </div>
              <div className="mt-2 text-3xl font-black text-primary">
                {formatMoney(data?.bookings?.cancellations?.refundTotal ?? 0)}
              </div>
              <div className="mt-1 text-sm text-[#5e3f3c] font-medium">
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
                <span key="ref" className="font-mono text-sm font-semibold">{row.booking_ref}</span>,
                row.flight_id,
                row.seat_class,
                row.seats,
                <StatusBadge key="status" status={row.status} />,
                new Date(row.created_at).toLocaleDateString(),
              ]}
            />
          </Section>

          <Section
            title="Occupancy"
            subtitle="Seat load and locks across the active fleet."
          >
            <div className="grid gap-4 md:grid-cols-3 mb-6">
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
                <span key="flight" className="font-bold">{row.flight_number}</span>,
                `${row.origin} → ${row.destination}`,
                <span key="occ" className="inline-flex px-2 py-1 bg-[#fcf9f8] border border-[#e5e2e1] rounded-lg font-mono text-sm">
                  {row.occupancy.occupied}/{row.occupancy.total}
                </span>,
                row.occupancy.locked,
                row.occupancy.available,
              ]}
            />
          </Section>

          <Section
            title="Revenue"
            subtitle="Cash captured, pending, and refunded by provider."
          >
            <div className="grid gap-4 md:grid-cols-4 mb-6">
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
            <div className="mb-6">
              <Table
                title="By provider"
                rows={data?.revenue?.byProvider || []}
                columns={["Provider", "Payments", "Amount"]}
                renderRow={(row) => [
                  <span key="prov" className="font-semibold">{row.provider}</span>,
                  row.count,
                  <span key="amt" className="font-mono">{formatMoney(row.amount)}</span>,
                ]}
              />
            </div>
            <Table
              title="Recent payments"
              rows={data?.revenue?.recent || []}
              columns={["Payment", "Booking", "Amount", "Provider", "Status"]}
              renderRow={(row) => [
                <span key="id" className="text-xs font-mono text-[#5e3f3c]">{row.id?.substring(0, 8)}...</span>,
                row.booking_id || "—",
                <span key="amt" className="font-mono font-medium">{formatMoney(row.amount)}</span>,
                row.provider,
                <StatusBadge key="status" status={row.status} />,
              ]}
            />
          </Section>

          <Section
            title="Assignments"
            subtitle="Open requests, approvals, and crew allocation health."
          >
            <div className="grid gap-4 md:grid-cols-4 mb-6">
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
            <div className="mb-6">
              <Table
                title="By role"
                rows={data?.assignments?.byRole || []}
                columns={["Role", "Count"]}
                renderRow={(row) => [row.role, row.count]}
              />
            </div>
            <Table
              title="Open assignments"
              rows={data?.assignments?.open || []}
              columns={["Flight", "Employee", "Role", "Status"]}
              renderRow={(row) => [
                <span key="flight" className="font-bold">{row.flight_number || row.flight_id}</span>,
                row.first_name ? `${row.first_name} ${row.last_name}` : <span key="open" className="text-[#5e3f3c] italic">Open</span>,
                row.assignment_role,
                <StatusBadge key="status" status={row.status} />,
              ]}
            />
          </Section>
        </section>

        <Section
          title="Real-time operations feed"
          subtitle="Live operational events merged from flights, bookings, payments, and assignments."
        >
          <div className="mb-6 flex flex-wrap items-center gap-3 bg-[#fcf9f8] p-4 rounded-2xl border border-[#e5e2e1]">
            <label className="text-sm font-bold text-[#1A1A1A]">
              Feed size:
            </label>
            <select
              className="rounded-xl border border-[#e5e2e1] bg-white px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              value={query.limit}
              onChange={(e) =>
                setQuery({ limit: Number(e.target.value) || 12 })
              }
            >
              <option value={8}>8 events</option>
              <option value={12}>12 events</option>
              <option value={20}>20 events</option>
              <option value={30}>30 events</option>
            </select>
            <button
              className="ml-auto rounded-xl border border-[#e5e2e1] bg-white hover:bg-[#fcf9f8] transition-colors px-5 py-2 text-sm font-bold text-[#1A1A1A] flex items-center gap-2 shadow-sm"
              onClick={load}
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Refresh Now
            </button>
          </div>
          
          <div className="space-y-4">
            {loading && !data ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : null}
            {(data?.feed || []).length === 0 && !loading ? (
              <div className="text-center py-12 bg-[#fcf9f8] rounded-2xl border border-dashed border-[#e5e2e1]">
                <span className="material-symbols-outlined text-[#5e3f3c] text-4xl mb-2">inbox</span>
                <div className="font-semibold text-[#1A1A1A]">No recent operations</div>
                <div className="text-sm text-[#5e3f3c]">Check back later for new events.</div>
              </div>
            ) : (
              (data?.feed || []).map((item: any) => (
                <div
                  key={`${item.type}-${item.at}-${item.title}`}
                  className="flex flex-col gap-2 rounded-2xl border border-[#e5e2e1] bg-white p-5 sm:flex-row sm:items-start sm:justify-between shadow-sm hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-[#fcf9f8] p-2 rounded-lg border border-[#e5e2e1]">
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        {item.type === 'flight' ? 'flight' : item.type === 'booking' ? 'book_online' : item.type === 'payment' ? 'payments' : 'assignment_ind'}
                      </span>
                    </div>
                    <div>
                      <div className="text-base font-bold text-[#1A1A1A]">
                        {item.title}
                      </div>
                      {item.detail ? (
                        <div className="text-sm text-[#5e3f3c] mt-1">
                          {item.detail}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-[#5e3f3c] bg-[#fcf9f8] px-3 py-1.5 rounded-lg border border-[#e5e2e1]">
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

function StatusBadge({ status }: { status: string }) {
  if (!status) return null;
  const s = status.toLowerCase();
  
  let colorClass = "bg-gray-100 text-gray-700 border-gray-200";
  if (["confirmed", "active", "completed", "success", "approved"].includes(s)) {
    colorClass = "bg-green-50 text-green-700 border-green-200";
  } else if (["pending", "scheduled", "draft", "in_progress"].includes(s)) {
    colorClass = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (["cancelled", "failed", "conflict", "suspended"].includes(s)) {
    colorClass = "bg-red-50 text-[#c8102e] border-red-200";
  } else if (["on leave", "archived", "refunded"].includes(s)) {
    colorClass = "bg-slate-100 text-slate-600 border-slate-200";
  }

  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${colorClass}`}>
      {status}
    </span>
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
      <div className="mt-4 rounded-2xl border border-dashed border-[#e5e2e1] bg-[#fcf9f8] p-8 text-center">
        <span className="material-symbols-outlined text-[#5e3f3c] text-3xl mb-2">table_rows</span>
        <div className="font-semibold text-[#1A1A1A]">{title}</div>
        <div className="text-sm text-[#5e3f3c]">No records available.</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#e5e2e1] shadow-sm">
      <div className="border-b border-[#e5e2e1] bg-[#fcf9f8] px-5 py-4 flex items-center justify-between">
        <div className="font-bold text-[#1A1A1A]">{title}</div>
        <div className="text-xs font-bold text-[#5e3f3c] bg-white px-2.5 py-1 rounded-md border border-[#e5e2e1]">
          {rows.length} records
        </div>
      </div>
      <table className="min-w-full divide-y divide-[#e5e2e1] text-sm">
        <thead className="bg-white">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-5 py-4 text-left text-[11px] font-bold uppercase tracking-widest text-[#5e3f3c]">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e5e2e1] bg-white">
          {rows.slice(0, 8).map((row, i) => (
            <tr key={row.id || JSON.stringify(row) || i} className="hover:bg-[#fcf9f8] transition-colors">
              {renderRow(row).map((cell, index) => (
                <td key={index} className="px-5 py-4 align-middle text-[#1A1A1A]">
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
    <div className="rounded-2xl border border-[#e5e2e1] bg-[#fcf9f8] p-5">
      <div className="text-sm font-bold text-[#1A1A1A]">{title}</div>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-sm text-[#5e3f3c] italic">No data available</div>
        ) : (
          items.map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm border border-[#e5e2e1]/50 text-sm font-medium text-[#1A1A1A]">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
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
