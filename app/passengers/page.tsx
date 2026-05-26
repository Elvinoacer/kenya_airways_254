"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function PassengersPage() {
  const [passengers, setPassengers] = useState<any[]>([]);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    passportNo: "",
    nationality: "",
    phone: "",
  });
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/passengers");
    const data = await res.json();
    setPassengers(data.passengers || []);
    if (!res.ok) setMessage(data.error || "Could not load passengers");
  }

  useEffect(() => {
    load();
  }, []);

  async function addPassenger() {
    setMessage("");
    const res = await fetch("/api/passengers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Could not add passenger");
      return;
    }
    setForm({ firstName: "", lastName: "", passportNo: "", nationality: "", phone: "" });
    setMessage("Passenger added successfully.");
    await load();
  }

  async function deletePassenger(id: string) {
    const res = await fetch(`/api/passengers/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error || "Could not delete passenger");
      return;
    }
    setMessage("Passenger deleted successfully.");
    await load();
  }

  return (
    <main className="min-h-screen bg-[#fcf9f8] text-[#1A1A1A]">
      <header className="bg-[#410001] py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-white">Passenger Management</h1>
          <p className="text-white/80 mt-2">Add, change, and delete passenger records.</p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <section className="bg-white rounded-2xl border border-[#e5e2e1] p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Add Passenger</h2>
          <div className="grid gap-4 md:grid-cols-5">
            {[
              ["firstName", "First name"],
              ["lastName", "Last name"],
              ["passportNo", "Passport no."],
              ["nationality", "Nationality"],
              ["phone", "Phone"],
            ].map(([key, label]) => (
              <input
                key={key}
                className="rounded-lg border border-[#e5e2e1] px-4 py-3"
                placeholder={label}
                value={(form as any)[key]}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
              />
            ))}
          </div>
          <button
            className="mt-4 px-6 py-3 rounded-lg bg-primary text-white font-bold"
            onClick={addPassenger}
            disabled={!form.firstName || !form.lastName}
          >
            Add passenger
          </button>
          {message ? <p className="mt-3 text-sm font-semibold text-primary">{message}</p> : null}
        </section>

        <section className="bg-white rounded-2xl border border-[#e5e2e1] overflow-hidden shadow-sm">
          <div className="p-6 border-b border-[#e5e2e1]">
            <h2 className="text-xl font-bold">Passenger Records</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#fcf9f8] text-left">
                <tr>
                  <th className="p-4">Name</th>
                  <th className="p-4">Passport</th>
                  <th className="p-4">Nationality</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {passengers.map((passenger) => (
                  <tr key={passenger.id} className="border-t border-[#e5e2e1]">
                    <td className="p-4 font-bold">{passenger.firstName} {passenger.lastName}</td>
                    <td className="p-4">{passenger.passportNo || "N/A"}</td>
                    <td className="p-4">{passenger.nationality || "N/A"}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Link className="px-3 py-2 rounded-lg border border-[#e5e2e1] font-bold" href={`/passengers/${passenger.id}`}>
                          Change
                        </Link>
                        <button
                          className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-[#c8102e] font-bold"
                          onClick={() => deletePassenger(passenger.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {passengers.length === 0 ? (
                  <tr>
                    <td className="p-6 text-center text-[#5e3f3c]" colSpan={4}>No passengers found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
