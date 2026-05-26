"use client";

/**
 * PassportGenerator - A Next.js page component
 *
 * SETUP:
 *   npm install html2canvas jspdf
 *
 * USAGE (App Router):
 *   Place this file at  app/passport/page.jsx
 *
 * USAGE (Pages Router):
 *   Remove the 'use client' directive and place at  pages/passport.jsx
 *   (all logic is already client-side; no changes needed beyond that)
 */

import { useState, useRef, useCallback } from "react";

// ─── MRZ Utilities ───────────────────────────────────────────────────────────
const MRZ_ALPHA = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MRZ_W = [7, 3, 1];

function mrzCheck(str) {
  let s = 0;
  for (let i = 0; i < str.length; i++) {
    const idx = str[i] === "<" ? 0 : MRZ_ALPHA.indexOf(str[i]);
    s += (idx < 0 ? 0 : idx) * MRZ_W[i % 3];
  }
  return s % 10;
}

function toMRZDate(ds) {
  if (!ds) return "000000";
  const [y, m, d] = ds.split("-");
  return (y || "0000").slice(2) + (m || "00") + (d || "00");
}

function buildMRZ(f) {
  const cty = ((f.nationality || "XXX").toUpperCase() + "<<<").slice(0, 3);
  const sur = (f.surname || "").toUpperCase().replace(/[^A-Z]/g, "<");
  const giv = (f.givenNames || "")
    .toUpperCase()
    .replace(/[^A-Z ]/g, "")
    .replace(/ /g, "<");
  const docN = (f.passportNumber || "A00000000")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .padEnd(9, "<")
    .slice(0, 9);
  const dob = toMRZDate(f.dateOfBirth);
  const exp = toMRZDate(f.dateOfExpiry);
  const sex = f.sex === "F" ? "F" : f.sex === "M" ? "M" : "<";

  const line1 = `P<${cty}${sur}<<${giv}`.padEnd(44, "<").slice(0, 44);

  const dc = mrzCheck(docN);
  const dobc = mrzCheck(dob);
  const expc = mrzCheck(exp);
  const pers = "<<<<<<<<<<<<<<";
  const over = mrzCheck(`${docN}${dc}${dob}${dobc}${exp}${expc}${pers}`);
  const line2 = `${docN}${dc}${cty}${dob}${dobc}${sex}${exp}${expc}${pers}${over}`.padEnd(44, "<").slice(0, 44);

  return { line1, line2 };
}

function fmtDate(ds) {
  if (!ds) return "—";
  try {
    const [y, m, d] = ds.split("-");
    return `${d} ${"JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC".split(" ")[+m - 1]} ${y}`;
  } catch {
    return ds;
  }
}

function genPN() {
  const L = "ABCDEFGHJKLMNPRSTUVWXYZ";
  return L[Math.floor(Math.random() * L.length)] + Math.floor(10000000 + Math.random() * 89999999);
}

// ─── SVG Emblem ──────────────────────────────────────────────────────────────
function Emblem({ size = 110, gold = "#d4af37" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 110 110">
      {/* Outer ring */}
      <circle cx="55" cy="55" r="50" fill="none" stroke={gold} strokeWidth="1.2" opacity="0.6" />
      <circle cx="55" cy="55" r="44" fill="none" stroke={gold} strokeWidth="0.5" opacity="0.35" />

      {/* Shield */}
      <path
        d="M55 16 L86 28 L86 56 Q86 80 55 94 Q24 80 24 56 L24 28 Z"
        fill="rgba(212,175,55,0.08)"
        stroke={gold}
        strokeWidth="1.4"
      />

      {/* Shield inner partition */}
      <line x1="55" y1="16" x2="55" y2="94" stroke={gold} strokeWidth="0.4" opacity="0.4" />
      <line x1="24" y1="54" x2="86" y2="54" stroke={gold} strokeWidth="0.4" opacity="0.4" />

      {/* Eagle wings */}
      <path d="M55 46 Q38 36 28 22 Q36 34 46 44" fill={gold} opacity="0.7" />
      <path d="M55 46 Q72 36 82 22 Q74 34 64 44" fill={gold} opacity="0.7" />
      <path d="M55 50 Q34 42 22 28 Q32 42 46 50" fill={gold} opacity="0.5" />
      <path d="M55 50 Q76 42 88 28 Q78 42 64 50" fill={gold} opacity="0.5" />

      {/* Eagle body */}
      <ellipse cx="55" cy="58" rx="12" ry="16" fill={gold} opacity="0.85" />

      {/* Eagle head */}
      <circle cx="55" cy="42" r="8" fill={gold} opacity="0.9" />

      {/* Beak */}
      <path d="M55 41 L62 44 L59 44 L59 47 L51 47 L51 44 L48 44 Z" fill="#0a1628" opacity="0.9" />

      {/* Eye */}
      <circle cx="58" cy="40" r="1.5" fill="#0a1628" />

      {/* Crown */}
      <path d="M44 30 L48 22 L52 27 L55 20 L58 27 L62 22 L66 30 L62 30 L60 33 L55 31 L50 33 L48 30 Z" fill={gold} />

      {/* Talons */}
      <path
        d="M48 72 Q44 76 42 80 M52 74 Q50 79 49 83 M58 74 Q60 79 61 83 M62 72 Q66 76 68 80"
        fill="none"
        stroke={gold}
        strokeWidth="1.2"
        opacity="0.8"
      />

      {/* Bottom scroll */}
      <path d="M35 86 Q55 92 75 86" fill="none" stroke={gold} strokeWidth="1" opacity="0.6" />
      <text
        x="55"
        y="84"
        fontSize="5.5"
        fill={gold}
        opacity="0.8"
        textAnchor="middle"
        fontFamily="serif"
        letterSpacing="1.5"
      >
        VERITAS • PAX
      </text>

      {/* Top stars */}
      <text x="55" y="14" fontSize="6" fill={gold} opacity="0.7" textAnchor="middle">
        ★ ★ ★
      </text>
    </svg>
  );
}

// ─── Passport Cover ───────────────────────────────────────────────────────────
function PassportCover({ data }) {
  return (
    <div
      style={{
        width: "340px",
        height: "480px",
        background: "linear-gradient(160deg, #07101f 0%, #0c1e3d 40%, #0a1a32 70%, #07101f 100%)",
        borderRadius: "6px 0 0 6px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Palatino Linotype', Palatino, Georgia, serif",
        color: "#d4af37",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Subtle guilloche rings */}
      {[180, 220, 260, 300, 340].map((r, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            borderRadius: "50%",
            width: r,
            height: r,
            border: "0.5px solid rgba(212,175,55,0.06)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Double border frame */}
      <div
        style={{
          position: "absolute",
          inset: "14px",
          border: "1.5px solid rgba(212,175,55,0.45)",
          borderRadius: "3px",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "18px",
          border: "0.5px solid rgba(212,175,55,0.18)",
          borderRadius: "2px",
        }}
      />

      {/* Corner ornaments */}
      {[
        { top: 20, left: 20, rotate: 0 },
        { top: 20, right: 20, rotate: 90 },
        { bottom: 20, right: 20, rotate: 180 },
        { bottom: 20, left: 20, rotate: 270 },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 16,
            height: 16,
            borderTop: "1.5px solid rgba(212,175,55,0.5)",
            borderLeft: "1.5px solid rgba(212,175,55,0.5)",
            transform: `rotate(${pos.rotate}deg)`,
            ...pos,
          }}
        />
      ))}

      {/* Country header */}
      <div style={{ textAlign: "center", zIndex: 1, marginBottom: "10px" }}>
        <div style={{ fontSize: "7.5px", letterSpacing: "5px", opacity: 0.65, marginBottom: "5px" }}>✦ ✦ ✦ ✦ ✦</div>
        <div style={{ fontSize: "9px", letterSpacing: "3.5px", textTransform: "uppercase", opacity: 0.8 }}>
          {data.country || "REPUBLIC OF"}
        </div>
        <div
          style={{
            fontSize: "14px",
            letterSpacing: "3px",
            textTransform: "uppercase",
            fontWeight: "bold",
            marginTop: "2px",
          }}
        >
          {data.countryFull || "YOUR COUNTRY"}
        </div>
      </div>

      {/* Emblem */}
      <div style={{ zIndex: 1, margin: "4px 0" }}>
        <Emblem size={110} />
      </div>

      {/* PASSPORT label */}
      <div style={{ textAlign: "center", zIndex: 1, marginTop: "12px" }}>
        <div
          style={{
            fontSize: "21px",
            letterSpacing: "10px",
            fontWeight: "bold",
            textTransform: "uppercase",
            color: "#d4af37",
            textShadow: "0 0 20px rgba(212,175,55,0.4)",
          }}
        >
          PASSPORT
        </div>
        <div style={{ fontSize: "7px", letterSpacing: "2.5px", opacity: 0.55, marginTop: "4px" }}>
          PASSEPORT · PASAPORTE · REISEPASS
        </div>
      </div>

      {/* Biometric chip symbol */}
      <div style={{ zIndex: 1, marginTop: "18px", opacity: 0.6, fontSize: "20px" }}>⊙</div>

      {/* Bottom strip */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "32px",
          background: "rgba(212,175,55,0.06)",
          borderTop: "1px solid rgba(212,175,55,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: "7px", letterSpacing: "3px", opacity: 0.5 }}>BIOMETRIC PASSPORT · TYPE P</span>
      </div>
    </div>
  );
}

// ─── Passport Data Page ───────────────────────────────────────────────────────
function PassportDataPage({ data, photo }) {
  const { line1, line2 } = buildMRZ(data);

  const Field = ({ label, value, col = 1 }) => (
    <div style={{ gridColumn: `span ${col}`, marginBottom: "8px" }}>
      <div
        style={{
          fontSize: "6.5px",
          letterSpacing: "1.2px",
          color: "#1a3a70",
          textTransform: "uppercase",
          fontWeight: "700",
          marginBottom: "2px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "12.5px",
          color: "#06101e",
          fontFamily: "'Palatino Linotype', Palatino, Georgia, serif",
          borderBottom: "0.5px solid rgba(26,58,112,0.3)",
          paddingBottom: "3px",
          minHeight: "18px",
        }}
      >
        {value || "—"}
      </div>
    </div>
  );

  return (
    <div
      style={{
        width: "340px",
        height: "480px",
        background: "#f9f7f2",
        borderRadius: "0 6px 6px 0",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      {/* Security background pattern */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.035 }} aria-hidden>
        <defs>
          <pattern id="sec" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M12 0 L24 12 L12 24 L0 12 Z" fill="none" stroke="#0a1628" strokeWidth="0.4" />
            <circle cx="12" cy="12" r="1.5" fill="#0a1628" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#sec)" />
      </svg>

      {/* Header band */}
      <div
        style={{
          background: "linear-gradient(135deg, #071220 0%, #0e2756 100%)",
          padding: "9px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ color: "#d4af37", fontSize: "7.5px", letterSpacing: "2.5px", textTransform: "uppercase" }}>
            {data.country || "Country"} · {data.countryFull || ""}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.9)",
              fontSize: "10px",
              letterSpacing: "1.5px",
              fontWeight: "bold",
              fontFamily: "serif",
            }}
          >
            PASSPORT / PASSEPORT
          </div>
        </div>
        <Emblem size={34} gold="#d4af37" />
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          display: "flex",
          padding: "12px 14px 8px",
          gap: "12px",
          position: "relative",
          zIndex: 1,
          overflow: "hidden",
        }}
      >
        {/* Fields */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
          <Field label="Surname / Nom" value={(data.surname || "").toUpperCase()} col={2} />
          <Field label="Given Names / Prénoms" value={(data.givenNames || "").toUpperCase()} col={2} />
          <Field label="Nationality / Nationalité" value={data.nationality} />
          <Field label="Sex / Sexe" value={data.sex} />
          <Field label="Date of Birth / Naissance" value={fmtDate(data.dateOfBirth)} />
          <Field label="Place of Birth / Lieu" value={data.placeOfBirth} />
          <Field label="Date of Issue / Délivrance" value={fmtDate(data.dateOfIssue)} />
          <Field label="Date of Expiry / Expiration" value={fmtDate(data.dateOfExpiry)} />
          <Field label="Passport No. / N° de Passeport" value={data.passportNumber} col={2} />

          {/* Signature line */}
          <div style={{ gridColumn: "span 2", marginTop: "2px" }}>
            <div
              style={{
                fontSize: "6.5px",
                letterSpacing: "1.2px",
                color: "#1a3a70",
                textTransform: "uppercase",
                fontWeight: "700",
                fontFamily: "system-ui",
                marginBottom: "14px",
              }}
            >
              Signature / Unterschrift
            </div>
            <div style={{ borderBottom: "0.5px solid rgba(26,58,112,0.3)" }} />
          </div>
        </div>

        {/* Photo */}
        <div style={{ width: "92px", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              width: "88px",
              height: "108px",
              background: photo ? "transparent" : "#e2ddd5",
              border: "1.5px solid #0e2756",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {photo ? (
              <img src={photo} alt="portrait" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ textAlign: "center", color: "#9a9080", fontSize: "8px", fontFamily: "sans-serif" }}>
                <div style={{ fontSize: "30px", marginBottom: "4px" }}>👤</div>
                PHOTO
              </div>
            )}
          </div>
          {/* Thumbprint placeholder */}
          <div
            style={{
              marginTop: "8px",
              width: "48px",
              height: "58px",
              border: "1px dashed rgba(26,58,112,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: "20px", opacity: 0.2 }}>🖿</span>
          </div>
          <div
            style={{
              fontSize: "5.5px",
              letterSpacing: "0.8px",
              color: "#1a3a70",
              opacity: 0.6,
              marginTop: "3px",
              textAlign: "center",
              fontFamily: "sans-serif",
            }}
          >
            FINGERPRINT
          </div>
        </div>
      </div>

      {/* MRZ Zone */}
      <div
        style={{
          background: "#eeebe3",
          borderTop: "1.5px solid rgba(10,22,40,0.12)",
          padding: "6px 14px 8px",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: "5.5px",
            letterSpacing: "1.5px",
            color: "#1a3a70",
            fontFamily: "sans-serif",
            textTransform: "uppercase",
            marginBottom: "4px",
            fontWeight: "700",
          }}
        >
          Machine Readable Zone / Zone de Lecture Automatique
        </div>
        <div
          style={{
            fontFamily: "'OCR B', 'Courier New', monospace",
            fontSize: "7.8px",
            letterSpacing: "0.8px",
            color: "#06101e",
            lineHeight: "1.8",
            userSelect: "none",
            wordBreak: "break-all",
          }}
        >
          <div>{line1}</div>
          <div>{line2}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PassportGenerator() {
  const today = new Date();
  const expiry = new Date(today);
  expiry.setFullYear(expiry.getFullYear() + 10);

  const fmt = (d) => d.toISOString().split("T")[0];

  const [form, setForm] = useState({
    country: "REPUBLIC OF",
    countryFull: "ARCADIA",
    nationality: "ARCADIAN",
    surname: "",
    givenNames: "",
    sex: "M",
    dateOfBirth: "",
    placeOfBirth: "",
    dateOfIssue: fmt(today),
    dateOfExpiry: fmt(expiry),
    passportNumber: genPN(),
  });
  const [photo, setPhoto] = useState(null);
  const [exporting, setExp] = useState(false);
  const [tab, setTab] = useState("cover"); // 'cover' | 'data'

  const coverRef = useRef(null);
  const dataRef = useRef(null);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handlePhoto = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = (ev) => setPhoto(ev.target.result);
    r.readAsDataURL(file);
  }, []);

  const exportPDF = useCallback(async () => {
    setExp(true);
    try {
      // Dynamic import keeps bundle small
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const SCALE = 3;
      const W_MM = 88;
      const H_MM = 124;
      const MARGIN = 6;

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [W_MM, H_MM] });

      // ── Page 1: Cover ──
      const coverEl = coverRef.current;
      const coverCanvas = await html2canvas(coverEl, {
        scale: SCALE,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });
      const coverImg = coverCanvas.toDataURL("image/jpeg", 0.97);
      const cW = W_MM - MARGIN * 2;
      const cH = cW * (coverEl.offsetHeight / coverEl.offsetWidth);
      pdf.addImage(coverImg, "JPEG", MARGIN, (H_MM - cH) / 2, cW, cH);

      // ── Page 2: Data ──
      pdf.addPage([W_MM, H_MM], "portrait");
      const dataEl = dataRef.current;
      const dataCanvas = await html2canvas(dataEl, {
        scale: SCALE,
        useCORS: true,
        backgroundColor: "#f9f7f2",
        logging: false,
      });
      const dataImg = dataCanvas.toDataURL("image/jpeg", 0.97);
      const dW = W_MM - MARGIN * 2;
      const dH = dW * (dataEl.offsetHeight / dataEl.offsetWidth);
      pdf.addImage(dataImg, "JPEG", MARGIN, (H_MM - dH) / 2, dW, dH);

      // Document metadata
      pdf.setProperties({
        title: `Passport — ${form.surname}, ${form.givenNames}`,
        subject: "EDUCATIONAL SIMULATION — NOT A REAL DOCUMENT",
        creator: "PassportGenerator",
      });

      pdf.save(`passport_${form.passportNumber}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Export failed. Make sure html2canvas and jspdf are installed:\nnpm install html2canvas jspdf");
    } finally {
      setExp(false);
    }
  }, [form]);

  // ── Shared input styles ──
  const inp = {
    width: "100%",
    boxSizing: "border-box",
    padding: "8px 10px",
    background: "#0e1d35",
    border: "1px solid rgba(212,175,55,0.2)",
    borderRadius: "4px",
    color: "#e8e0cc",
    fontSize: "13px",
    fontFamily: "'Palatino Linotype', Palatino, Georgia, serif",
    outline: "none",
  };
  const label = {
    display: "block",
    fontSize: "9px",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    color: "#d4af37",
    fontFamily: "system-ui, sans-serif",
    fontWeight: "700",
    marginBottom: "5px",
  };
  const group = { marginBottom: "14px" };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #040d1a 0%, #0a1628 50%, #06111f 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 20px",
        fontFamily: "'Palatino Linotype', Palatino, Georgia, serif",
        color: "#e8e0cc",
      }}
    >
      {/* ── Header ── */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div style={{ fontSize: "10px", letterSpacing: "5px", color: "#d4af37", opacity: 0.7 }}>✦ ✦ ✦</div>
        <h1
          style={{
            margin: "8px 0 4px",
            fontSize: "clamp(24px, 4vw, 36px)",
            letterSpacing: "6px",
            color: "#d4af37",
            fontWeight: "normal",
            textTransform: "uppercase",
          }}
        >
          Passport Generator
        </h1>
        <p style={{ margin: 0, fontSize: "11px", letterSpacing: "2px", opacity: 0.5, color: "#c8b87a" }}>
          EDUCATIONAL SIMULATION — FOR SCHOOL PROJECTS ONLY
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: "40px",
          alignItems: "flex-start",
          flexWrap: "wrap",
          justifyContent: "center",
          width: "100%",
          maxWidth: "1100px",
        }}
      >
        {/* ─── FORM ─── */}
        <div
          style={{
            width: "340px",
            flexShrink: 0,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(212,175,55,0.15)",
            borderRadius: "8px",
            padding: "24px",
          }}
        >
          <h2
            style={{
              margin: "0 0 20px",
              fontSize: "12px",
              letterSpacing: "3px",
              color: "#d4af37",
              fontWeight: "normal",
              textTransform: "uppercase",
              fontFamily: "system-ui",
            }}
          >
            Personal Information
          </h2>

          {/* Country */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
            <div>
              <span style={label}>Country (short)</span>
              <input style={inp} value={form.country} onChange={set("country")} placeholder="REPUBLIC OF" />
            </div>
            <div>
              <span style={label}>Country Name</span>
              <input style={inp} value={form.countryFull} onChange={set("countryFull")} placeholder="ARCADIA" />
            </div>
          </div>

          <div style={group}>
            <span style={label}>Nationality (3-letter code)</span>
            <input
              style={inp}
              value={form.nationality}
              onChange={set("nationality")}
              placeholder="ARCADIAN"
              maxLength={15}
            />
          </div>

          <div style={group}>
            <span style={label}>Surname / Family Name</span>
            <input style={inp} value={form.surname} onChange={set("surname")} placeholder="SMITH" />
          </div>

          <div style={group}>
            <span style={label}>Given Names</span>
            <input style={inp} value={form.givenNames} onChange={set("givenNames")} placeholder="JOHN WILLIAM" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
            <div>
              <span style={label}>Sex</span>
              <select style={inp} value={form.sex} onChange={set("sex")}>
                <option value="M">M — Male</option>
                <option value="F">F — Female</option>
                <option value="X">X — Unspecified</option>
              </select>
            </div>
            <div>
              <span style={label}>Date of Birth</span>
              <input style={inp} type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} />
            </div>
          </div>

          <div style={group}>
            <span style={label}>Place of Birth</span>
            <input style={inp} value={form.placeOfBirth} onChange={set("placeOfBirth")} placeholder="NAIROBI" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
            <div>
              <span style={label}>Date of Issue</span>
              <input style={inp} type="date" value={form.dateOfIssue} onChange={set("dateOfIssue")} />
            </div>
            <div>
              <span style={label}>Date of Expiry</span>
              <input style={inp} type="date" value={form.dateOfExpiry} onChange={set("dateOfExpiry")} />
            </div>
          </div>

          <div style={group}>
            <span style={label}>Passport Number</span>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                style={{ ...inp, flex: 1 }}
                value={form.passportNumber}
                onChange={set("passportNumber")}
                maxLength={9}
              />
              <button
                onClick={() => setForm((p) => ({ ...p, passportNumber: genPN() }))}
                style={{
                  padding: "8px 10px",
                  background: "rgba(212,175,55,0.1)",
                  border: "1px solid rgba(212,175,55,0.3)",
                  borderRadius: "4px",
                  color: "#d4af37",
                  cursor: "pointer",
                  fontSize: "12px",
                  whiteSpace: "nowrap",
                }}
                title="Regenerate"
              >
                ↺
              </button>
            </div>
          </div>

          <div style={group}>
            <span style={label}>Photo (optional)</span>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhoto}
              style={{ ...inp, padding: "6px 10px", cursor: "pointer", fontSize: "11px" }}
            />
          </div>

          {/* Export button */}
          <button
            onClick={exportPDF}
            disabled={exporting}
            style={{
              width: "100%",
              padding: "13px",
              background: exporting
                ? "rgba(212,175,55,0.1)"
                : "linear-gradient(135deg, #c9a227 0%, #d4af37 50%, #b8921e 100%)",
              border: "none",
              borderRadius: "5px",
              color: exporting ? "#d4af37" : "#06101e",
              fontSize: "12px",
              letterSpacing: "3px",
              textTransform: "uppercase",
              fontFamily: "system-ui, sans-serif",
              fontWeight: "700",
              cursor: exporting ? "not-allowed" : "pointer",
              marginTop: "6px",
              transition: "opacity 0.2s",
            }}
          >
            {exporting ? "⏳ Generating PDF…" : "⬇ Export as PDF"}
          </button>

          <p
            style={{
              margin: "10px 0 0",
              fontSize: "9px",
              color: "#8a7a55",
              lineHeight: "1.5",
              textAlign: "center",
              fontFamily: "sans-serif",
            }}
          >
            Requires: <code>npm install html2canvas jspdf</code>
          </p>
        </div>

        {/* ─── PREVIEW ─── */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              fontSize: "9px",
              letterSpacing: "3px",
              color: "#8a7a55",
              textTransform: "uppercase",
              fontFamily: "sans-serif",
            }}
          >
            Live Preview
          </div>

          {/* Tab switcher (mobile) */}
          <div
            style={{
              display: "none", // hidden on desktop; visible via media query would need CSS-in-JS lib
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            {["cover", "data"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "6px 16px",
                  background: tab === t ? "rgba(212,175,55,0.15)" : "transparent",
                  border: `1px solid ${tab === t ? "rgba(212,175,55,0.5)" : "rgba(212,175,55,0.1)"}`,
                  borderRadius: "4px",
                  color: "#d4af37",
                  cursor: "pointer",
                  fontSize: "10px",
                  letterSpacing: "2px",
                  textTransform: "uppercase",
                  fontFamily: "sans-serif",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Passport spread (book layout) */}
          <div
            style={{
              display: "flex",
              boxShadow: "0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,175,55,0.08)",
              borderRadius: "8px",
            }}
          >
            {/* Hidden off-screen clone for PDF capture */}
            <div style={{ position: "absolute", left: "-9999px", top: 0, pointerEvents: "none" }}>
              <div ref={coverRef}>
                <PassportCover data={form} />
              </div>
              <div ref={dataRef}>
                <PassportDataPage data={form} photo={photo} />
              </div>
            </div>

            {/* Visible preview */}
            <div style={{ filter: "drop-shadow(-4px 0 12px rgba(0,0,0,0.4))" }}>
              <PassportCover data={form} />
            </div>
            {/* Spine */}
            <div
              style={{
                width: "10px",
                background: "linear-gradient(180deg, #0c1e3d 0%, #1a3a70 50%, #0c1e3d 100%)",
                boxShadow: "inset -2px 0 4px rgba(0,0,0,0.4), inset 2px 0 4px rgba(212,175,55,0.05)",
              }}
            />
            <div style={{ filter: "drop-shadow(4px 0 12px rgba(0,0,0,0.4))" }}>
              <PassportDataPage data={form} photo={photo} />
            </div>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: "8.5px",
              color: "#6a5f42",
              letterSpacing: "1.5px",
              textAlign: "center",
              maxWidth: "400px",
              lineHeight: "1.6",
              fontFamily: "sans-serif",
            }}
          >
            EDUCATIONAL SIMULATION — NOT A REAL OR VALID TRAVEL DOCUMENT
          </p>
        </div>
      </div>
    </div>
  );
}
