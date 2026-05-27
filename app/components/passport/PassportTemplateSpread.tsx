import Image from "next/image";

type PassportTemplateData = {
  country?: string | null;
  countryFull?: string | null;
  nationality?: string | null;
  surname?: string | null;
  givenNames?: string | null;
  sex?: string | null;
  dateOfBirth?: string | null;
  placeOfBirth?: string | null;
  dateOfIssue?: string | null;
  dateOfExpiry?: string | null;
  passportNumber?: string | null;
};

type PassportTemplateSpreadProps = {
  data: PassportTemplateData;
  photo?: string | null;
};

const MRZ_ALPHA = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MRZ_W = [7, 3, 1];

function mrzCheck(str: string) {
  let total = 0;
  for (let i = 0; i < str.length; i++) {
    const idx = str[i] === "<" ? 0 : MRZ_ALPHA.indexOf(str[i]);
    total += (idx < 0 ? 0 : idx) * MRZ_W[i % 3];
  }
  return total % 10;
}

function toMRZDate(dateString?: string | null) {
  if (!dateString) return "000000";
  const [year = "0000", month = "00", day = "00"] = dateString.split("-");
  return year.slice(2) + month + day;
}

function buildMRZ(data: PassportTemplateData) {
  const country = ((data.nationality || "XXX").toUpperCase() + "<<<").slice(
    0,
    3,
  );
  const surname = (data.surname || "").toUpperCase().replace(/[^A-Z]/g, "<");
  const givenNames = (data.givenNames || "")
    .toUpperCase()
    .replace(/[^A-Z ]/g, "")
    .replace(/ /g, "<");
  const documentNumber = (data.passportNumber || "A00000000")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .padEnd(9, "<")
    .slice(0, 9);
  const birthDate = toMRZDate(data.dateOfBirth);
  const issueDate = toMRZDate(data.dateOfIssue);
  const sex = data.sex === "F" ? "F" : data.sex === "M" ? "M" : "<";

  const line1 = `P<${country}${surname}<<${givenNames}`
    .padEnd(44, "<")
    .slice(0, 44);

  const dc = mrzCheck(documentNumber);
  const bc = mrzCheck(birthDate);
  const ic = mrzCheck(issueDate);
  const personal = "<<<<<<<<<<<<<<";
  const overall = mrzCheck(
    `${documentNumber}${dc}${birthDate}${bc}${issueDate}${ic}${personal}`,
  );
  const line2 =
    `${documentNumber}${dc}${country}${birthDate}${bc}${sex}${issueDate}${ic}${personal}${overall}`
      .padEnd(44, "<")
      .slice(0, 44);

  return { line1, line2 };
}

function fmtDate(dateString?: string | null) {
  if (!dateString) return "—";
  try {
    const [year, month, day] = dateString.split("-");
    const monthLabel = "JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC".split(
      " ",
    )[Number(month) - 1];
    return `${day} ${monthLabel} ${year}`;
  } catch {
    return dateString;
  }
}

type FieldProps = {
  label: string;
  value?: string | null;
  col?: number;
};

function Field({ label, value, col = 1 }: FieldProps) {
  return (
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
}

function Emblem({ size = 110, gold = "#d4af37" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 110 110">
      <circle
        cx="55"
        cy="55"
        r="50"
        fill="none"
        stroke={gold}
        strokeWidth="1.2"
        opacity="0.6"
      />
      <circle
        cx="55"
        cy="55"
        r="44"
        fill="none"
        stroke={gold}
        strokeWidth="0.5"
        opacity="0.35"
      />
      <path
        d="M55 16 L86 28 L86 56 Q86 80 55 94 Q24 80 24 56 L24 28 Z"
        fill="rgba(212,175,55,0.08)"
        stroke={gold}
        strokeWidth="1.4"
      />
      <line
        x1="55"
        y1="16"
        x2="55"
        y2="94"
        stroke={gold}
        strokeWidth="0.4"
        opacity="0.4"
      />
      <line
        x1="24"
        y1="54"
        x2="86"
        y2="54"
        stroke={gold}
        strokeWidth="0.4"
        opacity="0.4"
      />
      <path d="M55 46 Q38 36 28 22 Q36 34 46 44" fill={gold} opacity="0.7" />
      <path d="M55 46 Q72 36 82 22 Q74 34 64 44" fill={gold} opacity="0.7" />
      <path d="M55 50 Q34 42 22 28 Q32 42 46 50" fill={gold} opacity="0.5" />
      <path d="M55 50 Q76 42 88 28 Q78 42 64 50" fill={gold} opacity="0.5" />
      <ellipse cx="55" cy="58" rx="12" ry="16" fill={gold} opacity="0.85" />
      <circle cx="55" cy="42" r="8" fill={gold} opacity="0.9" />
      <path
        d="M55 41 L62 44 L59 44 L59 47 L51 47 L51 44 L48 44 Z"
        fill="#0a1628"
        opacity="0.9"
      />
      <circle cx="58" cy="40" r="1.5" fill="#0a1628" />
      <path
        d="M44 30 L48 22 L52 27 L55 20 L58 27 L62 22 L66 30 L62 30 L60 33 L55 31 L50 33 L48 30 Z"
        fill={gold}
      />
      <path
        d="M48 72 Q44 76 42 80 M52 74 Q50 79 49 83 M58 74 Q60 79 61 83 M62 72 Q66 76 68 80"
        fill="none"
        stroke={gold}
        strokeWidth="1.2"
        opacity="0.8"
      />
      <path
        d="M35 86 Q55 92 75 86"
        fill="none"
        stroke={gold}
        strokeWidth="1"
        opacity="0.6"
      />
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
      <text
        x="55"
        y="14"
        fontSize="6"
        fill={gold}
        opacity="0.7"
        textAnchor="middle"
      >
        ★ ★ ★
      </text>
    </svg>
  );
}

function PassportCover({ data }: { data: PassportTemplateData }) {
  return (
    <div
      style={{
        width: "min(340px, 100%)",
        aspectRatio: "17 / 24",
        background:
          "linear-gradient(160deg, #07101f 0%, #0c1e3d 40%, #0a1a32 70%, #07101f 100%)",
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
      {[
        { top: 20, left: 20, rotate: 0 },
        { top: 20, right: 20, rotate: 90 },
        { bottom: 20, right: 20, rotate: 180 },
        { bottom: 20, left: 20, rotate: 270 },
      ].map(({ rotate, ...position }, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 16,
            height: 16,
            borderTop: "1.5px solid rgba(212,175,55,0.5)",
            borderLeft: "1.5px solid rgba(212,175,55,0.5)",
            transform: `rotate(${rotate}deg)`,
            ...position,
          }}
        />
      ))}
      <div style={{ textAlign: "center", zIndex: 1, marginBottom: "10px" }}>
        <div
          style={{
            fontSize: "7.5px",
            letterSpacing: "5px",
            opacity: 0.65,
            marginBottom: "5px",
          }}
        >
          ✦ ✦ ✦ ✦ ✦
        </div>
        <div
          style={{
            fontSize: "9px",
            letterSpacing: "3.5px",
            textTransform: "uppercase",
            opacity: 0.8,
          }}
        >
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
      <div style={{ zIndex: 1, margin: "4px 0" }}>
        <Emblem size={110} />
      </div>
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
        <div
          style={{
            fontSize: "7px",
            letterSpacing: "2.5px",
            opacity: 0.55,
            marginTop: "4px",
          }}
        >
          PASSEPORT · PASAPORTE · REISEPASS
        </div>
      </div>
      <div
        style={{ zIndex: 1, marginTop: "18px", opacity: 0.6, fontSize: "20px" }}
      >
        ⊙
      </div>
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
        <span style={{ fontSize: "7px", letterSpacing: "3px", opacity: 0.5 }}>
          BIOMETRIC PASSPORT · TYPE P
        </span>
      </div>
    </div>
  );
}

function PassportDataPage({
  data,
  photo,
}: {
  data: PassportTemplateData;
  photo?: string | null;
}) {
  const { line1, line2 } = buildMRZ(data);

  return (
    <div
      style={{
        width: "min(340px, 100%)",
        aspectRatio: "17 / 24",
        background: "#f9f7f2",
        borderRadius: "0 6px 6px 0",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0.035,
        }}
        aria-hidden
      >
        <defs>
          <pattern
            id="sec"
            x="0"
            y="0"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M12 0 L24 12 L12 24 L0 12 Z"
              fill="none"
              stroke="#0a1628"
              strokeWidth="0.4"
            />
            <circle cx="12" cy="12" r="1.5" fill="#0a1628" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#sec)" />
      </svg>

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
          <div
            style={{
              color: "#d4af37",
              fontSize: "7.5px",
              letterSpacing: "2.5px",
              textTransform: "uppercase",
            }}
          >
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
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0 10px",
          }}
        >
          <Field
            label="Surname / Nom"
            value={(data.surname || "").toUpperCase()}
            col={2}
          />
          <Field
            label="Given Names / Prénoms"
            value={(data.givenNames || "").toUpperCase()}
            col={2}
          />
          <Field
            label="Nationality / Nationalité"
            value={data.nationality || undefined}
          />
          <Field label="Sex / Sexe" value={data.sex || undefined} />
          <Field
            label="Date of Birth / Naissance"
            value={fmtDate(data.dateOfBirth)}
          />
          <Field
            label="Place of Birth / Lieu"
            value={data.placeOfBirth || undefined}
          />
          <Field
            label="Date of Issue / Délivrance"
            value={fmtDate(data.dateOfIssue)}
          />
          <Field
            label="Date of Expiry / Expiration"
            value={fmtDate(data.dateOfExpiry)}
          />
          <Field
            label="Passport No. / N° de Passeport"
            value={data.passportNumber || undefined}
            col={2}
          />
          <div style={{ gridColumn: "span 2", marginTop: "2px" }}>
            <div
              style={{
                fontSize: "6.5px",
                letterSpacing: "1.2px",
                color: "#1a3a70",
                textTransform: "uppercase",
                fontWeight: "700",
                marginBottom: "14px",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              Signature / Unterschrift
            </div>
            <div style={{ borderBottom: "0.5px solid rgba(26,58,112,0.3)" }} />
          </div>
        </div>

        <div
          style={{
            width: "92px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "88px",
              height: "108px",
              background: photo ? "transparent" : "#e2ddd5",
              border: "1.5px solid #0e2756",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {photo ? (
              <Image
                src={photo}
                alt="portrait"
                fill
                sizes="88px"
                style={{ objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  textAlign: "center",
                  color: "#9a9080",
                  fontSize: "8px",
                  fontFamily: "sans-serif",
                }}
              >
                <div style={{ fontSize: "30px", marginBottom: "4px" }}>👤</div>
                PHOTO
              </div>
            )}
          </div>
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

export default function PassportTemplateSpread({
  data,
  photo,
}: PassportTemplateSpreadProps) {
  return (
    <div className="grid w-full grid-cols-1 justify-items-center gap-4 rounded-lg bg-white/0 md:grid-cols-[minmax(0,340px)_10px_minmax(0,340px)] md:items-stretch md:justify-center md:gap-0">
      <PassportCover data={data} />
      <div
        className="hidden md:block"
        style={{
          width: "10px",
          background:
            "linear-gradient(180deg, #0c1e3d 0%, #1a3a70 50%, #0c1e3d 100%)",
          boxShadow:
            "inset -2px 0 4px rgba(0,0,0,0.4), inset 2px 0 4px rgba(212,175,55,0.05)",
        }}
      />
      <PassportDataPage data={data} photo={photo} />
    </div>
  );
}
