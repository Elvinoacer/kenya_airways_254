type PassportIdentityCardProps = {
  firstName?: string;
  lastName?: string;
  passportNo?: string | null;
  nationality?: string | null;
  dateOfBirth?: string | null;
};

export default function PassportIdentityCard({
  firstName,
  lastName,
  passportNo,
  nationality,
  dateOfBirth,
}: PassportIdentityCardProps) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-[#0f3d25] bg-linear-to-br from-[#0f3d25] via-[#154e31] to-[#072414] p-5 text-white shadow-sm">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute -right-8 top-8 h-28 w-28 rounded-full border border-white/25" />
        <div className="absolute right-2 top-14 h-44 w-44 rounded-full border border-white/10" />
        <div className="absolute -bottom-10 left-6 h-36 w-36 rounded-full border border-white/10" />
      </div>

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/70">
            Republic of Kenya
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight">Passport</p>
        </div>
        <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/90">
          Digital template
        </div>
      </div>

      <div className="relative z-10 mt-8 space-y-4 text-sm">
        <div>
          <p className="text-white/55">Name</p>
          <p className="mt-1 text-lg font-bold">
            {firstName || lastName
              ? `${firstName || ""} ${lastName || ""}`.trim()
              : "Loading passenger"}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-white/55">Number</p>
            <p className="mt-1 font-mono text-base font-black tracking-wider">
              {passportNo || "Not provided"}
            </p>
          </div>
          <div>
            <p className="text-white/55">Nationality</p>
            <p className="mt-1 text-base font-bold">
              {nationality || "Kenyan"}
            </p>
          </div>
        </div>
        <div>
          <p className="text-white/55">Date of birth</p>
          <p className="mt-1 font-bold">{dateOfBirth || "Not provided"}</p>
        </div>
      </div>

      <div className="relative z-10 mt-6 flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
            Status
          </p>
          <p className="mt-1 text-sm font-bold">Ready for booking</p>
        </div>
        <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-200">
          Active
        </span>
      </div>
    </div>
  );
}
