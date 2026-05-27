"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { createRoot } from "react-dom/client";
import WorkflowShell from "../components/WorkflowShell";
import PassportRequirementPanel from "../components/passport/PassportRequirementPanel";
import PassportTemplateSpread from "../components/passport/PassportTemplateSpread";
import { getProfileInfo } from "../actions/auth-actions";
import {
  createKenyanPassportDetails,
  hasRequiredPassportDetails,
  type PassportDetails,
} from "../../lib/passport";
import { getRouteConfig } from "../../lib/route-config";

type TravelClassCode = "CLASS_A" | "CLASS_B" | "CLASS_C";

type PassengerProfile = {
  id: string;
  firstName: string;
  lastName: string;
  passportNo?: string | null;
  nationality?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  frequentFlyerNumber?: string | null;
};

type Flight = {
  id: string;
  flightNumber: string;
  airline?: string;
  origin: string;
  destination: string;
  departAt: string;
  arriveAt?: string;
  aircraft?: string;
  terminal?: string;
  basePrice: number;
};

type ClassAvailability = {
  code: TravelClassCode;
  shortCode: string;
  label: string;
  description: string;
  capacity: number;
  occupied: number;
  locked: number;
  available: number;
  isFull: boolean;
};

type Availability = {
  selected: ClassAvailability;
  classes: ClassAvailability[];
  nextAvailable?: {
    flightId: string;
    flightNumber: string;
    origin: string;
    destination: string;
    departureTime: string | null;
    arrivalTime: string | null;
    class: ClassAvailability;
  } | null;
};

type HoldResponse = {
  ok: boolean;
  holdId: string;
  expiresAt: number;
  fare: {
    baseFare: number;
    taxes: number;
    fees: number;
    discount: number;
    total: number;
  };
  hold: {
    flight: Flight;
    travelClassLabel: string;
    seats: number;
    passengers: Array<{
      firstName: string;
      lastName: string;
      passportNo?: string | null;
      nationality?: string | null;
    }>;
  };
  availability?: Availability;
};

type ConfirmedBooking = {
  booking: {
    id: string;
    reference: string;
    flightId: string;
    flightNumber: string | null;
    route: string | null;
    departureTime: string | null;
    status: string;
    seatClass: string;
    travelClass: { code: string; shortCode: string; label: string };
    seats: number;
    fare: { total: number };
    passengers: Array<{
      firstName: string;
      lastName: string;
      seatAssignment?: string | null;
    }>;
  };
  receipt: { reference: string };
};

const TRAVEL_CLASSES: Array<{
  code: TravelClassCode;
  label: string;
  shortCode: string;
  description: string;
}> = [
  {
    code: "CLASS_A",
    label: "Executive",
    shortCode: "A",
    description: "Priority cabin, highest fare flexibility.",
  },
  {
    code: "CLASS_B",
    label: "Business",
    shortCode: "B",
    description: "Comfort cabin with balanced flexibility.",
  },
  {
    code: "CLASS_C",
    label: "Economy",
    shortCode: "C",
    description: "Best value for direct passenger travel.",
  },
];

const EMPTY_PASSPORT: PassportDetails = {
  passportNo: "",
  nationality: "Kenyan",
  country: "Republic of Kenya",
  countryCode: "KEN",
  placeOfBirth: "Nairobi",
  dateOfIssue: "",
  dateOfExpiry: "",
};

function passportDraftFromPassenger(
  passenger?: PassengerProfile | null,
): PassportDetails {
  return {
    ...EMPTY_PASSPORT,
    passportNo: passenger?.passportNo || "",
    nationality: passenger?.nationality || "Kenyan",
  };
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatUsd(value?: number | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function safeText(value?: string | null) {
  return value?.trim() || "Not provided";
}

function ticketHtml({
  title,
  reference,
  flight,
  passenger,
  travelClass,
  fare,
  seat,
}: {
  title: string;
  reference: string;
  flight?: Partial<Flight> | null;
  passenger?: PassengerProfile | null;
  travelClass?: string | null;
  fare?: number | null;
  seat?: string | null;
}) {
  return `<!doctype html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; color: #1A1A1A; background: #f5f2f1; }
    .ticket { width: 760px; margin: 32px auto; background: #fff; border: 1px solid #ddd4d2; }
    .top { display: flex; justify-content: space-between; background: #410001; color: #fff; padding: 24px; }
    .brand { font-size: 24px; font-weight: 900; letter-spacing: 1px; }
    .ref { text-align: right; font-family: monospace; font-size: 18px; }
    .route { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 28px; padding: 28px 24px; border-bottom: 1px solid #eee; }
    .airport { font-size: 42px; font-weight: 900; }
    .city { color: #5e3f3c; margin-top: 6px; }
    .plane { color: #c8102e; font-size: 28px; }
    .details { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; padding: 24px; }
    .label { color: #5e3f3c; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
    .value { margin-top: 6px; font-weight: 800; }
    .footer { padding: 18px 24px; background: #fcf9f8; color: #5e3f3c; font-size: 12px; }
    @media print { body { background: #fff; } .ticket { margin: 0; width: 100%; } }
  </style>
</head>
<body>
  <main class="ticket">
    <section class="top">
      <div>
        <div class="brand">KENYA AIRWAYS</div>
        <div>${title}</div>
      </div>
      <div class="ref">
        <div>${reference}</div>
        <div>${flight?.flightNumber || ""}</div>
      </div>
    </section>
    <section class="route">
      <div>
        <div class="airport">${flight?.origin || "--"}</div>
        <div class="city">Departure</div>
      </div>
      <div class="plane">AIR</div>
      <div style="text-align:right">
        <div class="airport">${flight?.destination || "--"}</div>
        <div class="city">Arrival</div>
      </div>
    </section>
    <section class="details">
      <div><div class="label">Passenger</div><div class="value">${safeText(`${passenger?.firstName || ""} ${passenger?.lastName || ""}`)}</div></div>
      <div><div class="label">Passport</div><div class="value">${safeText(passenger?.passportNo)}</div></div>
      <div><div class="label">Travel Class</div><div class="value">${safeText(travelClass)}</div></div>
      <div><div class="label">Departure</div><div class="value">${formatDateTime(flight?.departAt)}</div></div>
      <div><div class="label">Seat</div><div class="value">${safeText(seat)}</div></div>
      <div><div class="label">Fare</div><div class="value">${formatMoney(fare)}</div></div>
    </section>
    <section class="footer">This is a passenger ticket document. Present it with a valid passport at airport processing.</section>
  </main>
</body>
</html>`;
}

export default function BookingPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [selectedFlightId, setSelectedFlightId] = useState("");
  const [seatClass, setSeatClass] = useState<TravelClassCode>("CLASS_C");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [passenger, setPassenger] = useState<PassengerProfile | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [passportDraft, setPassportDraft] =
    useState<PassportDetails>(EMPTY_PASSPORT);
  const [hold, setHold] = useState<HoldResponse | null>(null);
  const [confirmed, setConfirmed] = useState<ConfirmedBooking | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingPassport, setSavingPassport] = useState(false);
  const [error, setError] = useState("");
  const passportTemplateRef = useRef<HTMLDivElement | null>(null);

  const passportTemplateData = useMemo(
    () =>
      createKenyanPassportDetails({
        passportNo:
          passportDraft.passportNo || passenger?.passportNo || undefined,
        nationality:
          passportDraft.nationality || passenger?.nationality || undefined,
      }),
    [
      passportDraft.passportNo,
      passportDraft.nationality,
      passenger?.passportNo,
      passenger?.nationality,
    ],
  );

  useEffect(() => {
    async function load() {
      const requestedFlightId =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("flightId")
          : null;
      const [profileInfo, flightRes, passengerRes] = await Promise.all([
        getProfileInfo(),
        fetch("/api/flights"),
        fetch("/api/passengers"),
      ]);
      const flightsData = await flightRes.json();
      const passengerData = await passengerRes.json();
      const currentPassenger = passengerData.passengers?.[0] || null;

      setFlights(flightsData.results || []);
      setSelectedFlightId(
        requestedFlightId || flightsData.results?.[0]?.id || "",
      );
      setPassenger(currentPassenger);

      const email = profileInfo?.user?.email || "";
      setUserEmail(email);
      setContactEmail(email);
      setContactPhone(currentPassenger?.phone || "");

      setPassportDraft(passportDraftFromPassenger(currentPassenger));
    }

    load().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : "Failed to load booking."),
    );
  }, []);

  useEffect(() => {
    async function loadAvailability() {
      if (!selectedFlightId) return;
      const res = await fetch(
        `/api/seats/availability?flightId=${encodeURIComponent(selectedFlightId)}&class=${encodeURIComponent(seatClass)}`,
      );
      const data = await res.json();
      setAvailability(data.classAvailability || null);
    }

    loadAvailability().catch(() => setAvailability(null));
  }, [selectedFlightId, seatClass, hold, confirmed]);

  const selectedFlight = useMemo(
    () =>
      flights.find((flight) => flight.id === selectedFlightId) ||
      hold?.hold.flight ||
      null,
    [flights, selectedFlightId, hold],
  );

  const selectedClass =
    availability?.classes.find((entry) => entry.code === seatClass) ||
    availability?.selected ||
    null;
  const selectedRoute = getRouteConfig(
    selectedFlight?.origin,
    selectedFlight?.destination,
  );
  const allClassesFull =
    Boolean(availability?.classes?.length) &&
    availability?.classes.every((entry) => entry.available <= 0);
  const passportReady = hasRequiredPassportDetails({
    passportNo: passenger?.passportNo,
    nationality: passenger?.nationality,
  });
  const canCreateHold =
    Boolean(selectedFlightId && passenger?.id) &&
    passportReady &&
    !allClassesFull &&
    !selectedClass?.isFull &&
    !loading;

  function chooseBestAvailableClass(nextAvailability: Availability | null) {
    const nextClass = nextAvailability?.classes.find(
      (entry) => entry.available > 0,
    );
    if (nextClass) setSeatClass(nextClass.code);
  }

  async function savePassport() {
    if (!passenger?.id) return;
    setSavingPassport(true);
    setError("");
    try {
      const res = await fetch(`/api/passengers/${passenger.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: passenger.firstName,
          lastName: passenger.lastName,
          phone: passenger.phone || contactPhone || undefined,
          passportNo: passportDraft.passportNo,
          nationality: passportDraft.nationality,
          dateOfBirth: passenger.dateOfBirth || undefined,
          frequentFlyerNumber: passenger.frequentFlyerNumber || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save passport.");
      setPassenger(data.profile || passenger);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not save passport.");
    } finally {
      setSavingPassport(false);
    }
  }

  async function createHold() {
    if (!canCreateHold || !passenger) return;
    setLoading(true);
    setError("");
    setHold(null);
    setConfirmed(null);
    try {
      const payload = {
        flightId: selectedFlightId,
        travelClass: seatClass,
        seats: 1,
        passengerProfileIds: [passenger.id],
        contactEmail: contactEmail || userEmail || undefined,
        contactPhone: contactPhone || passenger.phone || undefined,
        promoCode: promoCode || undefined,
      };
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create hold.");
      if (data.ok === false) {
        setAvailability(data.availability || null);
        chooseBestAvailableClass(data.availability || null);
        throw new Error(data.message || "Selected class is full.");
      }
      setHold(data);
      setAvailability(data.availability || availability);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create hold.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmHold() {
    if (!hold?.holdId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/bookings/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdId: hold.holdId,
          payment: { provider: "ONLINE", transactionId: `PAY-${Date.now()}` },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to confirm booking.");
      setConfirmed(data);
      setHold(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to confirm booking.",
      );
    } finally {
      setLoading(false);
    }
  }

  function printTicket() {
    const booking = confirmed?.booking;
    const reference = booking?.reference || hold?.holdId || "KQ-HOLD";
    const flight = booking
      ? {
          flightNumber: booking.flightNumber || selectedFlight?.flightNumber,
          origin: selectedFlight?.origin,
          destination: selectedFlight?.destination,
          departAt: booking.departureTime || selectedFlight?.departAt,
        }
      : hold?.hold.flight || selectedFlight;
    const printWindow = window.open("", "_blank", "width=900,height=720");
    if (!printWindow) return;
    printWindow.document.write(
      ticketHtml({
        title: booking ? "Passenger Ticket" : "Booking Hold",
        reference,
        flight,
        passenger,
        travelClass:
          booking?.travelClass?.label ||
          hold?.hold.travelClassLabel ||
          selectedClass?.label,
        fare: booking?.fare.total || hold?.fare.total,
        seat: booking?.passengers?.[0]?.seatAssignment,
      }),
    );
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  async function downloadTicketPdf() {
    const { jsPDF } = await import("jspdf");
    const booking = confirmed?.booking;
    const reference = booking?.reference || hold?.holdId || "KQ-HOLD";
    const flight = hold?.hold.flight || selectedFlight;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFillColor(65, 0, 1);
    doc.rect(40, 40, 515, 96, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("KENYA AIRWAYS", 64, 82);
    doc.setFontSize(12);
    doc.text(booking ? "Passenger Ticket" : "Booking Hold", 64, 108);
    doc.setFontSize(16);
    doc.text(reference, 384, 82);
    doc.setTextColor(26, 26, 26);
    doc.setFontSize(42);
    doc.text(flight?.origin || "--", 64, 210);
    doc.text(flight?.destination || "--", 400, 210);
    doc.setFontSize(12);
    doc.text(
      `Flight: ${flight?.flightNumber || booking?.flightNumber || "Not assigned"}`,
      64,
      270,
    );
    doc.text(
      `Passenger: ${safeText(`${passenger?.firstName || ""} ${passenger?.lastName || ""}`)}`,
      64,
      294,
    );
    doc.text(`Passport: ${safeText(passenger?.passportNo)}`, 64, 318);
    doc.text(
      `Class: ${booking?.travelClass?.label || hold?.hold.travelClassLabel || selectedClass?.label || "Not selected"}`,
      64,
      342,
    );
    doc.text(
      `Departure: ${formatDateTime(booking?.departureTime || flight?.departAt)}`,
      64,
      366,
    );
    doc.text(
      `Seat: ${booking?.passengers?.[0]?.seatAssignment || "Assigned at check-in"}`,
      64,
      390,
    );
    doc.text(
      `Fare: ${formatMoney(booking?.fare.total || hold?.fare.total)}`,
      64,
      414,
    );
    doc.save(`${reference}-ticket.pdf`);
  }

  async function downloadPassportPdf() {
    if (!passenger) return;

    let iframe: HTMLIFrameElement | null = null;
    let root: ReturnType<typeof createRoot> | null = null;

    try {
      await document.fonts?.ready;
      await new Promise((resolve) =>
        requestAnimationFrame(() => resolve(null)),
      );

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      iframe = document.createElement("iframe");
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.position = "fixed";
      iframe.style.left = "-10000px";
      iframe.style.top = "0";
      iframe.style.width = "740px";
      iframe.style.height = "1200px";
      iframe.style.border = "0";
      iframe.srcdoc =
        "<html><body style='margin:0;background:transparent;'></body></html>";
      document.body.appendChild(iframe);

      const exportIframe = iframe;

      await new Promise<void>((resolve, reject) => {
        exportIframe.onload = () => resolve();
        exportIframe.onerror = () =>
          reject(new Error("Passport export iframe failed to load."));
      });

      const iframeDocument = iframe.contentDocument;
      const iframeWindow = iframe.contentWindow;
      if (!iframeDocument || !iframeWindow) {
        iframe.remove();
        throw new Error("Passport export iframe could not be initialized.");
      }

      const mountNode = iframeDocument.createElement("div");
      mountNode.style.width = "720px";
      mountNode.style.margin = "0";
      iframeDocument.body.appendChild(mountNode);

      root = createRoot(mountNode);
      root.render(
        <PassportTemplateSpread
          data={{
            country: "REPUBLIC OF",
            countryFull: "KENYA",
            nationality: passportTemplateData.nationality,
            surname: passenger.lastName || "",
            givenNames: passenger.firstName || "",
            sex: "X",
            dateOfBirth: passenger.dateOfBirth || "",
            placeOfBirth: passportTemplateData.placeOfBirth,
            dateOfIssue: passportTemplateData.dateOfIssue,
            dateOfExpiry: passportTemplateData.dateOfExpiry,
            passportNumber: passportTemplateData.passportNo,
          }}
        />,
      );

      await new Promise((resolve) =>
        iframeWindow.requestAnimationFrame(() => resolve(null)),
      );

      const canvas = await html2canvas(mountNode, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });

      if (!canvas.width || !canvas.height) {
        throw new Error("Passport preview could not be rendered for export.");
      }

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [canvas.width, canvas.height],
      });

      const imageData = canvas.toDataURL("image/png");
      pdf.addImage(imageData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`${passportTemplateData.passportNo || "passport"}-template.pdf`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Passport PDF export failed. Please try again.",
      );
    } finally {
      root?.unmount();
      iframe?.remove();
    }
  }

  return (
    <WorkflowShell>
      <div className="min-h-screen bg-[#f7f3f1] text-[#1A1A1A]">
        <section className="border-b border-[#e2d8d5] bg-white">
          <div
            className="mx-auto grid gap-6 px-4 py-8 sm:px-6 md:py-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8"
            style={{ maxWidth: 1500 }}
          >
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-wide text-[#c8102e]">
                Book your flight
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
                {selectedFlight
                  ? `${selectedFlight.origin} to ${selectedFlight.destination}`
                  : "Choose a flight"}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5e3f3c] sm:text-base">
                Your passenger details are filled from your account. Choose a
                cabin, create a short hold, then print or export the ticket.
              </p>
            </div>
            <div className="self-start rounded-xl border border-[#e2d8d5] bg-[#fcf9f8] p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#5e3f3c]">
                    Passenger
                  </p>
                  <p className="mt-1 font-black">
                    {passenger
                      ? `${passenger.firstName} ${passenger.lastName}`
                      : "Loading profile"}
                  </p>
                </div>
                <span className="material-symbols-outlined text-[30px] text-[#c8102e]">
                  account_circle
                </span>
              </div>
              <div className="mt-3 text-sm text-[#5e3f3c]">
                {passportReady
                  ? passenger?.passportNo
                  : "Passport details required before hold"}
              </div>
            </div>
          </div>
        </section>

        <main
          className="mx-auto px-4 py-8 sm:px-6 lg:px-8"
          style={{ maxWidth: 1500 }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none fixed top-0 overflow-hidden"
            style={{ left: "-9999px" }}
          >
            <div ref={passportTemplateRef} style={{ width: "720px" }}>
              <PassportTemplateSpread
                data={{
                  country: "REPUBLIC OF",
                  countryFull: "KENYA",
                  nationality: passportTemplateData.nationality,
                  surname: passenger?.lastName || "",
                  givenNames: passenger?.firstName || "",
                  sex: "X",
                  dateOfBirth: passenger?.dateOfBirth || "",
                  placeOfBirth: passportTemplateData.placeOfBirth,
                  dateOfIssue: passportTemplateData.dateOfIssue,
                  dateOfExpiry: passportTemplateData.dateOfExpiry,
                  passportNumber: passportTemplateData.passportNo,
                }}
              />
            </div>
          </div>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-8">
              <section className="rounded-xl border border-[#e2d8d5] bg-white p-5 shadow-sm sm:p-6">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                  <label className="block">
                    <span className="text-sm font-bold text-[#5e3f3c]">
                      Flight
                    </span>
                    <select
                      className="mt-2 w-full rounded-lg border border-[#d8cfcc] bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#c8102e] focus:ring-2 focus:ring-[#c8102e]/20"
                      value={selectedFlightId}
                      onChange={(event) => {
                        setSelectedFlightId(event.target.value);
                        setHold(null);
                        setConfirmed(null);
                      }}
                    >
                      {flights.map((flight) => (
                        <option key={flight.id} value={flight.id}>
                          {flight.flightNumber} - {flight.origin} to{" "}
                          {flight.destination}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold text-[#5e3f3c]">
                      Promo code
                    </span>
                    <input
                      className="mt-2 w-full rounded-lg border border-[#d8cfcc] bg-white px-4 py-3 text-sm outline-none focus:border-[#c8102e] focus:ring-2 focus:ring-[#c8102e]/20"
                      value={promoCode}
                      onChange={(event) => setPromoCode(event.target.value)}
                      placeholder="Optional"
                    />
                  </label>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-[#f7f3f1] p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#5e3f3c]">
                      Flight
                    </p>
                    <p className="mt-1 text-lg font-black">
                      {selectedFlight?.flightNumber || "Not selected"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#f7f3f1] p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#5e3f3c]">
                      Departure
                    </p>
                    <p className="mt-1 text-sm font-bold">
                      {formatDateTime(selectedFlight?.departAt)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#f7f3f1] p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#5e3f3c]">
                      Base Fare
                    </p>
                    <p className="mt-1 text-lg font-black">
                      {formatUsd(selectedFlight?.basePrice)}
                    </p>
                  </div>
                </div>

                {selectedRoute ? (
                  <div className="mt-5 overflow-hidden rounded-xl border border-[#e2d8d5] bg-[#fcf9f8]">
                    <div className="grid gap-0 md:grid-cols-[180px_1fr]">
                      <div
                        className="relative bg-[#f4ece9]"
                        style={{ minHeight: 180 }}
                      >
                        <Image
                          src={selectedRoute.image}
                          alt={selectedRoute.title}
                          fill
                          className="object-cover"
                          sizes="180px"
                        />
                      </div>
                      <div className="p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-[#5e3f3c]">
                          Destination preview
                        </p>
                        <h3 className="mt-2 text-xl font-black text-[#1A1A1A]">
                          {selectedRoute.title}
                        </h3>
                        <p className="mt-1 text-sm text-[#5e3f3c]">
                          Template: {selectedRoute.key} · Terminal{" "}
                          {selectedRoute.terminal}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="rounded-xl border border-[#e2d8d5] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">Choose cabin</h2>
                    <p className="mt-1 text-sm text-[#5e3f3c]">
                      Availability updates before every hold and confirmation.
                    </p>
                  </div>
                  {allClassesFull ? (
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-[#c8102e]">
                      All classes full
                    </span>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  {TRAVEL_CLASSES.map((travelClass) => {
                    const item = availability?.classes.find(
                      (entry) => entry.code === travelClass.code,
                    );
                    const isSelected = seatClass === travelClass.code;
                    const isFull = item?.isFull || false;
                    return (
                      <button
                        key={travelClass.code}
                        type="button"
                        disabled={isFull}
                        onClick={() => {
                          setSeatClass(travelClass.code);
                          setHold(null);
                          setConfirmed(null);
                        }}
                        className={`rounded-xl border p-4 text-left transition ${
                          isSelected
                            ? "border-[#c8102e] bg-[#fff6f6] shadow-sm"
                            : "border-[#e2d8d5] bg-white hover:border-[#c8102e]/60"
                        } ${isFull ? "cursor-not-allowed opacity-55" : "cursor-pointer"}`}
                        style={{ minHeight: 170 }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-lg font-black">
                              {travelClass.label}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-[#5e3f3c]">
                              {travelClass.description}
                            </p>
                          </div>
                          <span className="rounded-full bg-[#1A1A1A] px-2 py-1 text-xs font-black text-white">
                            {travelClass.shortCode}
                          </span>
                        </div>
                        <div className="mt-5 flex items-end justify-between gap-3">
                          <div>
                            <p className="text-2xl font-black">
                              {item?.available ?? "-"}
                            </p>
                            <p className="text-xs font-bold text-[#5e3f3c]">
                              available of {item?.capacity ?? "-"}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-black ${isFull ? "bg-red-50 text-[#c8102e]" : "bg-emerald-50 text-emerald-700"}`}
                          >
                            {isFull ? "Full" : "Open"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedClass?.isFull ? (
                  <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <p className="font-black">
                      {selectedClass.label} is full for this flight.
                    </p>
                    {availability?.nextAvailable ? (
                      <button
                        type="button"
                        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#1A1A1A] px-4 py-2 font-bold text-white"
                        onClick={() => {
                          setSelectedFlightId(
                            availability.nextAvailable?.flightId ||
                              selectedFlightId,
                          );
                          setSeatClass(
                            availability.nextAvailable?.class.code || seatClass,
                          );
                        }}
                      >
                        Use next available flight
                        <span className="material-symbols-outlined text-[18px]">
                          arrow_forward
                        </span>
                      </button>
                    ) : (
                      <p className="mt-2">
                        No later flight with this class is currently available.
                      </p>
                    )}
                  </div>
                ) : null}
              </section>

              <section className="rounded-xl border border-[#e2d8d5] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">
                      Passenger and passport
                    </h2>
                    <p className="mt-1 text-sm text-[#5e3f3c]">
                      Only your account passenger is used for this booking.
                    </p>
                  </div>
                  {passportReady ? (
                    <button
                      type="button"
                      onClick={downloadPassportPdf}
                      className="inline-flex items-center gap-2 rounded-lg border border-[#1A1A1A] px-4 py-2 text-sm font-black text-[#1A1A1A]"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        download
                      </span>
                      Passport PDF
                    </button>
                  ) : null}
                </div>

                <div className="mt-6 rounded-2xl border border-[#e2d8d5] bg-[#f8f5f3] p-3 sm:p-5">
                  <div className="mx-auto" style={{ maxWidth: 820 }}>
                    <PassportTemplateSpread
                      data={{
                        country: "REPUBLIC OF",
                        countryFull: "KENYA",
                        nationality: passenger?.nationality || "KEN",
                        surname: passenger?.lastName || "",
                        givenNames: passenger?.firstName || "",
                        sex: "X",
                        dateOfBirth: passenger?.dateOfBirth || "",
                        placeOfBirth: passenger?.passportNo ? "NAIROBI" : "",
                        dateOfIssue: "",
                        dateOfExpiry: "",
                        passportNumber: passenger?.passportNo || "",
                      }}
                    />
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-[#e2d8d5] bg-[#fcf9f8] p-4 sm:p-5">
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                    <div>
                      <p className="text-sm font-black text-[#1A1A1A]">
                        Passport details
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[#5e3f3c]">
                        Update the passport information used for this booking.
                        The booklet preview above refreshes from your saved
                        profile.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={savePassport}
                        disabled={savingPassport || !passenger?.id}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1A1A1A] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          save
                        </span>
                        {savingPassport ? "Saving..." : "Save passport"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPassportDraft(
                            createKenyanPassportDetails({
                              nationality: passenger?.nationality || "Kenyan",
                            }),
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d8cfcc] bg-white px-4 py-2.5 text-sm font-black text-[#1A1A1A]"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          auto_awesome
                        </span>
                        Generate details
                      </button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <PassportRequirementPanel
                      compact
                      firstName={passenger?.firstName || ""}
                      lastName={passenger?.lastName || ""}
                      passportNo={passportDraft.passportNo}
                      nationality={passportDraft.nationality}
                      dateOfBirth={passenger?.dateOfBirth || ""}
                      onChange={(patch) => {
                        setPassportDraft((current) => ({
                          ...current,
                          ...patch,
                          passportNo: patch.passportNo ?? current.passportNo,
                          nationality: patch.nationality ?? current.nationality,
                        }));
                      }}
                    />
                  </div>
                </div>
              </section>
            </div>

            <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
              <section className="rounded-xl border border-[#e2d8d5] bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black">Trip summary</h2>
                <div className="mt-5 space-y-4">
                  <div className="flex justify-between gap-4 border-b border-[#eee6e3] pb-3 text-sm">
                    <span className="text-[#5e3f3c]">Route</span>
                    <span className="text-right font-bold">
                      {selectedFlight
                        ? `${selectedFlight.origin} to ${selectedFlight.destination}`
                        : "Not selected"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-[#eee6e3] pb-3 text-sm">
                    <span className="text-[#5e3f3c]">Class</span>
                    <span className="font-bold">
                      {selectedClass?.label ||
                        TRAVEL_CLASSES.find((entry) => entry.code === seatClass)
                          ?.label}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-[#eee6e3] pb-3 text-sm">
                    <span className="text-[#5e3f3c]">Passenger</span>
                    <span className="font-bold">1 adult</span>
                  </div>
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-[#5e3f3c]">Fare due</span>
                    <span className="text-xl font-black">
                      {hold ? formatMoney(hold.fare.total) : "After hold"}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  <label>
                    <span className="text-xs font-bold uppercase tracking-wide text-[#5e3f3c]">
                      Email
                    </span>
                    <input
                      readOnly
                      className="mt-1 w-full rounded-lg border border-[#d8cfcc] bg-[#f7f3f1] px-3 py-2 text-sm outline-none focus:border-[#c8102e]"
                      value={contactEmail}
                    />
                  </label>
                  <label>
                    <span className="text-xs font-bold uppercase tracking-wide text-[#5e3f3c]">
                      Phone
                    </span>
                    <input
                      className="mt-1 w-full rounded-lg border border-[#d8cfcc] px-3 py-2 text-sm outline-none focus:border-[#c8102e]"
                      value={contactPhone}
                      onChange={(event) => setContactPhone(event.target.value)}
                      placeholder="+254..."
                    />
                  </label>
                </div>

                <button
                  type="button"
                  disabled={!canCreateHold}
                  onClick={createHold}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#c8102e] px-5 py-3 text-sm font-black text-white transition hover:bg-[#a70d25] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">
                      lock_clock
                    </span>
                  )}
                  Create booking hold
                </button>

                {error ? (
                  <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-bold text-[#c8102e]">
                    {error}
                  </div>
                ) : null}
              </section>

              {hold ? (
                <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                  <p className="text-sm font-bold uppercase tracking-wide text-emerald-700">
                    Hold created
                  </p>
                  <p className="mt-2 break-all font-mono text-sm font-black text-emerald-950">
                    {hold.holdId}
                  </p>
                  <p className="mt-2 text-sm text-emerald-800">
                    Expires{" "}
                    {formatDateTime(new Date(hold.expiresAt).toISOString())}
                  </p>
                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      onClick={confirmHold}
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        payments
                      </span>
                      Confirm and issue ticket
                    </button>
                    <button
                      type="button"
                      onClick={printTicket}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-700 bg-white px-4 py-3 text-sm font-black text-emerald-800"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        print
                      </span>
                      Print hold
                    </button>
                  </div>
                </section>
              ) : null}

              {confirmed ? (
                <section className="rounded-lg border border-[#d8c36a] bg-[#fff9d8] p-5 shadow-sm">
                  <p className="text-sm font-bold uppercase tracking-wide text-[#5e3f3c]">
                    Ticket issued
                  </p>
                  <p className="mt-2 font-mono text-2xl font-black">
                    {confirmed.receipt.reference}
                  </p>
                  <p className="mt-1 text-sm text-[#5e3f3c]">
                    Seat{" "}
                    {confirmed.booking.passengers[0]?.seatAssignment ||
                      "assigned at check-in"}
                  </p>
                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      onClick={printTicket}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1A1A1A] px-4 py-3 text-sm font-black text-white"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        print
                      </span>
                      Print ticket
                    </button>
                    <button
                      type="button"
                      onClick={downloadTicketPdf}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#1A1A1A] bg-white px-4 py-3 text-sm font-black text-[#1A1A1A]"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        picture_as_pdf
                      </span>
                      Download ticket PDF
                    </button>
                  </div>
                </section>
              ) : null}
            </aside>
          </div>
        </main>
      </div>
    </WorkflowShell>
  );
}
