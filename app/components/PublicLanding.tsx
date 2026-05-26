import Link from "next/link";
import BookingWidget from "./BookingWidget";

// ─── Data ────────────────────────────────────────────────────────────────────

const HERO_BG = "/images/hero_banner.png";

const CARD_IMG = "https://justintime.sfo3.digitaloceanspaces.com/kenya_airways/cross_the_world.png";

const PLAN_THUMB_1 =
  "https://lh3.googleusercontent.com/aida/ADBb0uhRZml1Dnf17P-nGfJ7IEfnUOLCHNT9sixdO7AZc_2FF7mkovs6RC31IeSK5TTPJGdi8LBXayi-xB7prOlTuKLYzYK4ZYreRoGD3YuiD4067hYgGygQTwiZvJ5SAUZXJb4959vgbD13anBqCLL1VuOV5VhgtD68AXf2AblVSA0E5m7HtD0_jIJrSGLRjNyCmiFJlMQtASZmIGAKSw7_VdKrbvQsyM9SUum06bzkybII1_7335WbW3HFVkKz";

const PLAN_THUMB_2 =
  "https://lh3.googleusercontent.com/aida/ADBb0uhwgNBpinLiu6LjzIDSPo5TMrvG7iuiPDrqNFYTYQngGZhqAFwBEsRgPuP3FnHUVNoJRCT19e9rh146Ol9AMeoZP0pvxvv93G0x-KWxGSzdaYZscwJmZrsYeh191RD1X7dIzIOXtkqhP44xt4q3JkVAtm-FHWnXvucTOANK5rpTM8y33NBcJT3SGAF3EcZNSx3Wf9mTAMAs0IsheaCWuzb7O7QgnpvGUMLinY6Ok30hYiaGPObVPdkWFjNu";

const EXPERIENCE_MAIN =
  "https://lh3.googleusercontent.com/aida/ADBb0ugk6l6uwwakbWcV58llof6FS7G1HSGu-_72f3utcm0arn9-GzPPvb-61f_C1XPsHgJtr4NdiztYr8P1E3rGJwpoKJxuQkey1bBWzicZVNG0xbQm05qkcugPKgE4BUj4_iw5an3D13CL8lqOUN3DTTiZiJJItjqdAgF3a1y1OtdB7xP3TcMk21Bw_CK_k8SSQi92bcN4E8H76ZxJehsH8aFSy4WLPOElMAH__eCmjDMh64vE7xW9nnz0FUk";

const EXPERIENCE_ACCENT =
  "https://lh3.googleusercontent.com/aida/ADBb0uhU4e4AhlRbU7athPcznv0hsoOmaTktJ_9kzGkDyHqmdx3tLV9wlmfFqWdL3NQp-Z2jIJEl2Zo5Ln5jGYAAkJuxic08_k0aKCb-BahKqjz3o5LA8sjyvQL03xbpYmVd1VkqHurrUv8-xJqWWHw8jbfZI1Dfh0RjVlbbVkqRxUd1AH2On_3G61q5tN0Otgw23YTjEHPUh4QvJXbFNP9oocVO48yek0l3woLtR0TmBvDvNIeXkgdg3WJ_CYMn";

const REWARDS_BG =
  "https://lh3.googleusercontent.com/aida/ADBb0ujRaTib4RuzKPDvTmUw658jEb-MsKpBeX_ReFtj0rNrzKlO2A3Cszd5wYkOIyzUFwpRaxLMFoiShQe5x9emlDheGXwtTjsjs4fraYqvXy878RhRT0_VHGGi6tiU1ztoxosV9rNVVdq_2LnbyBH5UP0UVEXkc3hS-jrNFA5w8g7j7M-dH8TSpUd8hSc8jIiLtEf8AOtm20iilhDesPbxHMeCbv9M9MLSUlibWqYI8jNlrkkCLltf9euI9cw";

const offers = [
  {
    city: "Kigali",
    dates: "03 Sept - 16 Sept 26",
    price: "USD 960",
    img: "/images/kigali.jpg",
  },
  {
    city: "Lagos",
    dates: "31 Aug - 15 Sept 26",
    price: "USD 966",
    img: "/images/lagos.webp",
  },
  {
    city: "Entebbe",
    dates: "26 Aug - 10 Sept 26",
    price: "USD 989",
    img: "/images/entebbe.jpeg",
  },
];

const popularDestinations = [
  {
    city: "Mombasa",
    country: "Kenya",
    img: "/images/mombasa.webp",
    price: "USD 120",
  },
  {
    city: "Zanzibar",
    country: "Tanzania",
    img: "/images/aerial-view-of-zanzibar-island.jpg",
    price: "USD 240",
  },
  {
    city: "Cape Town",
    country: "South Africa",
    img: "/images/cape-town-1-1.jpg",
    price: "USD 450",
  },
  {
    city: "Dubai",
    country: "UAE",
    img: "/images/dubai_travel.jpeg",
    price: "USD 380",
  },
  {
    city: "London",
    country: "UK",
    img: "/images/london.jpeg",
    price: "USD 620",
  },
  {
    city: "Paris",
    country: "France",
    img: "/images/paris.webp",
    price: "USD 590",
  },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function OfferCard({
  city,
  dates,
  price,
  img,
  href,
}: {
  city: string;
  dates: string;
  price: string;
  img: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="min-w-[300px] md:w-1/3 bg-white rounded-xl overflow-hidden shadow-[0_12px_32px_rgba(13,13,13,0.08)] group cursor-pointer flex-shrink-0 border border-[#e5e2e1] block"
    >
      <div className="h-48 overflow-hidden relative">
        <img
          src={img}
          alt={city}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <span className="bg-white/90 text-[#1A1A1A] text-xs font-semibold px-2 py-1 rounded backdrop-blur-sm">
            Economy Class
          </span>
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-2xl font-semibold text-[#1A1A1A] mb-1">{city}</h3>
        <p className="text-xs font-semibold text-[#5e3f3c] mb-4 flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">calendar_today</span>
          {dates}
        </p>
        <div className="flex justify-between items-end mt-4 pt-4 border-t border-[#f0edec]">
          <div>
            <span className="block text-xs font-semibold text-[#5e3f3c]">From</span>
            <span className="text-2xl font-semibold text-primary">{price}</span>
          </div>
          <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function KenyaAirwaysPage() {
  return (
    <>
      {/* Google Fonts + Material Symbols */}
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>

      <div
        id="top"
        className="bg-[#fcf9f8] text-[#1c1b1b] antialiased"
        style={{ fontFamily: "'Hanken Grotesk', sans-serif" }}
      >
        {/* ── Hero ── */}
        <section
          className="relative w-full h-[600px] flex items-center justify-center bg-cover bg-center"
          style={{ backgroundImage: `url('${HERO_BG}')` }}
        >
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10 w-full max-w-5xl px-5 md:px-20 mt-12">
            <div
              className="rounded-xl p-8 text-center md:text-left"
              style={{
                background: "rgba(255,255,255,0.9)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 12px 32px rgba(13,13,13,0.08)",
              }}
            >
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-[#1A1A1A] mb-2 leading-tight">
                The Pride of Africa
              </h1>
              <p className="text-lg text-[#5e3f3c] mb-8">
                Exclusive Flight Savings with Mastercard. Discover the world with us.
              </p>
              <BookingWidget />
            </div>
          </div>
        </section>

        {/* ── Exclusive Offers ── */}
        <section id="offers" className="scroll-mt-24 py-24 px-5 md:px-20 max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-semibold text-[#1A1A1A] mb-2">Exclusive Offers from New York</h2>
              <p className="text-base text-[#5e3f3c]">Discover premium destinations at unbeatable prices.</p>
            </div>
            <Link
              href="/search?origin=NBO&sort=price"
              className="hidden md:flex items-center gap-1 text-sm font-medium text-primary hover:text-[#e71520] transition-colors"
            >
              View all deals <span className="material-symbols-outlined">chevron_right</span>
            </Link>
          </div>
          <div className="flex overflow-x-auto gap-6 pb-8 -mx-5 px-5 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {offers.map((offer) => (
              <OfferCard
                key={offer.city}
                {...offer}
                href={`/search?origin=NBO&destination=${encodeURIComponent(offer.city)}&sort=price`}
              />
            ))}
          </div>
        </section>

        {/* ── Plan Your Trip ── */}
        <section id="plan" className="scroll-mt-24 py-16 bg-[#F4F4F4]">
          <div className="max-w-7xl mx-auto px-5 md:px-20">
            <h2 className="text-3xl md:text-4xl font-semibold text-[#1A1A1A] mb-12 text-center">Plan Your Trip</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Large hero card */}
              <Link
                href="/search"
                className="md:col-span-2 md:row-span-2 group relative rounded-2xl overflow-hidden shadow-[0_12px_32px_rgba(13,13,13,0.08)] block h-[400px]"
              >
                <img
                  src={CARD_IMG}
                  alt="Route map"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/80 via-[#1A1A1A]/20 to-transparent" />
                <div className="absolute bottom-0 left-0 p-8 w-full">
                  <h3 className="text-3xl font-semibold text-white mb-2">Discover Where We Fly</h3>
                  <p className="text-base text-white/80 mb-4">
                    Explore our extensive network across Africa and beyond.
                  </p>
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-white group-hover:text-[#ffb4ab] transition-colors">
                    Explore Route Map <span className="material-symbols-outlined">arrow_forward</span>
                  </span>
                </div>
              </Link>

              {/* Special Care */}
              <Link
                href="/help/getting-started"
                className="group bg-white rounded-2xl p-6 shadow-[0_12px_32px_rgba(13,13,13,0.08)] flex flex-col justify-between border border-[#e5e2e1] min-h-[188px] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none">
                  <img src={PLAN_THUMB_1} alt="" className="w-full h-full object-cover rounded-bl-full" />
                </div>
                <div>
                  <div className="w-12 h-12 rounded-full bg-[#f6f3f2] flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                    <span className="material-symbols-outlined text-primary text-2xl">accessible_forward</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-[#1A1A1A] mb-2">Special Care</h3>
                </div>
                <span className="text-[#5e3f3c] text-xs font-semibold group-hover:text-primary transition-colors flex items-center gap-1 mt-4">
                  Learn more <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </span>
              </Link>

              {/* Baggage Info */}
              <Link
                href="/help/troubleshooting-checkin"
                className="group bg-white rounded-2xl p-6 shadow-[0_12px_32px_rgba(13,13,13,0.08)] flex flex-col justify-between border border-[#e5e2e1] min-h-[188px] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none">
                  <img src={PLAN_THUMB_2} alt="" className="w-full h-full object-cover rounded-bl-full" />
                </div>
                <div>
                  <div className="w-12 h-12 rounded-full bg-[#f6f3f2] flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                    <span className="material-symbols-outlined text-primary text-2xl">luggage</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-[#1A1A1A] mb-2">Baggage Info</h3>
                </div>
                <span className="text-[#5e3f3c] text-xs font-semibold group-hover:text-primary transition-colors flex items-center gap-1 mt-4">
                  View allowances <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </span>
              </Link>

              {/* Travel Requirements */}
              <Link
                href="/help/travel-requirements"
                className="md:col-span-2 group bg-[#a33c33] rounded-2xl p-8 shadow-[0_12px_32px_rgba(13,13,13,0.08)] flex flex-col justify-center relative overflow-hidden"
              >
                <div
                  className="absolute right-0 top-0 h-full w-1/2 opacity-20 pointer-events-none"
                  style={{
                    background: "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 70%)",
                  }}
                />
                <div className="relative z-10 w-full md:w-2/3">
                  <h3 className="text-2xl font-semibold text-white mb-2">Travel Requirements</h3>
                  <p className="text-base text-white/80 mb-6">
                    Stay updated with the latest guidelines to ensure a smooth journey.
                  </p>
                  <span className="bg-transparent border border-white text-white text-sm font-medium px-6 py-2 rounded-lg hover:bg-white hover:text-[#a33c33] transition-colors inline-flex items-center gap-2 w-max">
                    Check Guidelines <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Experience Section ── */}
        <section id="experience" className="scroll-mt-24 py-24 max-w-7xl mx-auto px-5 md:px-20">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
            {/* Left */}
            <div className="md:col-span-5 flex flex-col gap-8">
              <div>
                <span className="text-sm font-medium tracking-widest uppercase text-primary mb-4 block">
                  Premium Experience
                </span>
                <h2 className="text-3xl md:text-4xl font-semibold text-[#1A1A1A] mb-6">Elevate Your Journey</h2>
                <p className="text-lg text-[#5e3f3c] mb-8">
                  From exclusive student offers to in-flight luxury shopping, we curate every moment of your travel to
                  be exceptional.
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-[#f0edec] shadow-[0_12px_32px_rgba(13,13,13,0.08)] group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#a33c33]/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[#a33c33]">school</span>
                  </div>
                  <div>
                    <h4 className="text-2xl font-semibold text-[#1A1A1A] mb-2">Kool Flyer&apos;s Club</h4>
                    <p className="text-base text-[#5e3f3c] mb-4">
                      Discover a world of great Student Offers with exclusive unlimited access when you sign up.
                    </p>
                    <Link
                      href="/register"
                      className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Register Today <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="md:col-span-7 relative">
              <div className="rounded-2xl overflow-hidden shadow-[0_12px_32px_rgba(13,13,13,0.08)] relative z-10 w-4/5 ml-auto">
                <img
                  src={EXPERIENCE_MAIN}
                  alt="Duty free shopping"
                  className="w-full h-auto aspect-[0.83] object-cover"
                />
                <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black/80 to-transparent">
                  <h3 className="text-2xl font-semibold text-white mb-2">Duty Free Shopping</h3>
                  <p className="text-base text-white/90 mb-4">Pre-order 48 hours before you fly.</p>
                  <Link
                    href="/search"
                    className="bg-primary text-white text-sm font-medium px-6 py-2 rounded-lg hover:bg-[#e71520] transition-colors inline-flex items-center"
                  >
                    Shop Now
                  </Link>
                </div>
              </div>
              {/* Accent image */}
              <div className="absolute bottom-12 -left-4 w-1/2 rounded-2xl overflow-hidden shadow-2xl z-20 border-4 border-[#fcf9f8] hidden md:block">
                <img
                  src={EXPERIENCE_ACCENT}
                  alt="In-flight experience"
                  className="w-full h-auto aspect-[2.77] object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Asante Rewards Banner ── */}
        <section id="rewards" className="scroll-mt-24 w-full bg-[#410001] py-16 mt-8 relative overflow-hidden">
          <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay">
            <img src={REWARDS_BG} alt="" className="w-full h-full object-cover object-center" />
          </div>
          <div
            className="absolute inset-0 z-10"
            style={{
              background: "linear-gradient(to right, #410001 0%, rgba(65,0,1,0.9) 60%, transparent 100%)",
            }}
          />
          <div className="max-w-7xl mx-auto px-5 md:px-20 relative z-20 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="md:w-1/2 text-left">
              <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/20 mb-6">
                <span className="material-symbols-outlined text-[#ffb4aa] text-[16px]">stars</span>
                <span className="text-xs font-semibold text-white">Loyalty Program</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight">Enjoy Up to 10% Off</h2>
              <p className="text-lg text-white/90 mb-8 max-w-lg">
                Join Asante Rewards and unlock exclusive benefits. Use promo code ASANTE10 on your next booking.
              </p>
              <div className="flex gap-4 flex-wrap">
                <Link
                  href="/register"
                  className="bg-white text-[#410001] text-sm font-medium px-8 py-3 rounded-lg hover:bg-[#f6f3f2] transition-colors shadow-lg inline-flex items-center"
                >
                  Join Asante Rewards
                </Link>
                <Link
                  href="/help"
                  className="bg-transparent border border-white/30 text-white text-sm font-medium px-8 py-3 rounded-lg hover:bg-white/10 transition-colors inline-flex items-center"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Popular Destinations ── */}
        <section className="py-24 px-5 md:px-20 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-sm font-medium tracking-widest uppercase text-primary mb-2 block">
              Explore The World
            </span>
            <h2 className="text-3xl md:text-4xl font-semibold text-[#1A1A1A] mb-4">Popular Destinations</h2>
            <p className="text-[#5e3f3c] max-w-2xl mx-auto">
              From the pristine beaches of the Indian Ocean to the bustling streets of global capitals, discover your
              next adventure with our expansive network.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularDestinations.map((dest) => (
              <Link
                key={dest.city}
                href={`/search?destination=${encodeURIComponent(dest.city)}`}
                className="group relative h-80 rounded-2xl overflow-hidden shadow-[0_12px_32px_rgba(13,13,13,0.08)] block"
              >
                <img
                  src={dest.img}
                  alt={dest.city}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 w-full p-6 flex justify-between items-end">
                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-1">{dest.city}</h3>
                    <p className="text-white/80 text-sm">{dest.country}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/60 text-xs mb-1">From</p>
                    <p className="text-white font-semibold">{dest.price}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 bg-white border border-[#e5e2e1] text-[#1A1A1A] font-semibold px-8 py-3 rounded-lg hover:bg-[#f6f3f2] hover:border-[#d7d3d2] transition-colors shadow-sm"
            >
              View All Destinations
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </section>

        {/* ── Fleet Showcase ── */}
        <section className="w-full bg-[#1A1A1A] relative overflow-hidden">
          <div className="absolute inset-0 z-0 opacity-40 mix-blend-screen">
            <img
              src="https://justintime.sfo3.digitaloceanspaces.com/kenya_airways/flyover.png"
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#1A1A1A] via-[#1A1A1A]/80 to-transparent" />

          <div className="max-w-7xl mx-auto px-5 md:px-20 py-24 relative z-20">
            <div className="max-w-xl">
              <span className="text-sm font-medium tracking-widest uppercase text-white/60 mb-4 block">
                Modern Fleet
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                Experience the Boeing 787 Dreamliner
              </h2>
              <p className="text-lg text-white/80 mb-12">
                Fly in unparalleled comfort. Featuring larger windows, cleaner air, and a quieter cabin, our flagship
                aircraft reduces jet lag and ensures you arrive refreshed.
              </p>

              <div className="grid grid-cols-2 gap-8 mb-12">
                <div>
                  <p className="text-4xl font-light text-primary mb-2">50+</p>
                  <p className="text-sm text-white/60 font-medium">Global Destinations</p>
                </div>
                <div>
                  <p className="text-4xl font-light text-primary mb-2">4M+</p>
                  <p className="text-sm text-white/60 font-medium">Passengers Annually</p>
                </div>
                <div>
                  <p className="text-4xl font-light text-primary mb-2">60+</p>
                  <p className="text-sm text-white/60 font-medium">Years of Excellence</p>
                </div>
                <div>
                  <p className="text-4xl font-light text-primary mb-2">2x</p>
                  <p className="text-sm text-white/60 font-medium">African Airline of the Year</p>
                </div>
              </div>

              <Link
                href="/help"
                className="bg-primary text-white font-semibold px-8 py-3 rounded-lg hover:bg-[#e71520] transition-colors inline-flex items-center gap-2"
              >
                Explore Our Fleet
                <span className="material-symbols-outlined text-[18px]">flight_takeoff</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Why Fly With Us / Features ── */}
        <section className="py-24 bg-white border-y border-[#e5e2e1]">
          <div className="max-w-7xl mx-auto px-5 md:px-20">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-semibold text-[#1A1A1A] mb-4">Why Fly With Kenya Airways</h2>
              <p className="text-[#5e3f3c]">Award-winning service rooted in authentic African hospitality.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-[#fcf9f8] flex items-center justify-center mx-auto mb-6 text-primary border border-[#e5e2e1]">
                  <span className="material-symbols-outlined text-3xl">verified_user</span>
                </div>
                <h3 className="text-xl font-semibold text-[#1A1A1A] mb-3">Safety First</h3>
                <p className="text-sm text-[#5e3f3c]">
                  IOSA registered and globally recognized for our impeccable safety record.
                </p>
              </div>

              <div className="text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-[#fcf9f8] flex items-center justify-center mx-auto mb-6 text-primary border border-[#e5e2e1]">
                  <span className="material-symbols-outlined text-3xl">volunteer_activism</span>
                </div>
                <h3 className="text-xl font-semibold text-[#1A1A1A] mb-3">African Hospitality</h3>
                <p className="text-sm text-[#5e3f3c]">
                  Experience the warmth and care that makes every journey feel like coming home.
                </p>
              </div>

              <div className="text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-[#fcf9f8] flex items-center justify-center mx-auto mb-6 text-primary border border-[#e5e2e1]">
                  <span className="material-symbols-outlined text-3xl">public</span>
                </div>
                <h3 className="text-xl font-semibold text-[#1A1A1A] mb-3">Global Network</h3>
                <p className="text-sm text-[#5e3f3c]">
                  Seamlessly connecting Africa to the rest of the world through our SkyTeam alliance.
                </p>
              </div>

              <div className="text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-[#fcf9f8] flex items-center justify-center mx-auto mb-6 text-primary border border-[#e5e2e1]">
                  <span className="material-symbols-outlined text-3xl">stars</span>
                </div>
                <h3 className="text-xl font-semibold text-[#1A1A1A] mb-3">Award Winning</h3>
                <p className="text-sm text-[#5e3f3c]">
                  Consistently voted as Africa's Leading Airline for both Business and Economy class.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="py-24 bg-[#fcf9f8]">
          <div className="max-w-7xl mx-auto px-5 md:px-20">
            <h2 className="text-3xl md:text-4xl font-semibold text-[#1A1A1A] mb-12 text-center">
              What Our Passengers Say
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  name: "Sarah Jenkins",
                  role: "Frequent Flyer",
                  text: "The hospitality on board was unmatched. The crew made sure I was comfortable throughout the entire 12-hour flight from New York to Nairobi.",
                  avatar: "https://justintime.sfo3.digitaloceanspaces.com/kenya_airways/happy_vacation_woman.png",
                },
                {
                  name: "David Ochieng",
                  role: "Business Traveler",
                  text: "I fly KQ monthly for business across the continent. Their punctuality and the seamless connections at JKIA make my work so much easier.",
                  avatar: "https://justintime.sfo3.digitaloceanspaces.com/kenya_airways/man_in_vacation.png",
                },
                {
                  name: "Elena Rossi",
                  role: "Tourist",
                  text: "Starting our safari vacation with Kenya Airways set the perfect tone. The Dreamliner experience was fantastic, and the food was surprisingly good!",
                  avatar: "https://justintime.sfo3.digitaloceanspaces.com/kenya_airways/happy_booking.png",
                },
              ].map((testimonial, i) => (
                <div
                  key={i}
                  className="bg-white p-8 rounded-2xl shadow-[0_12px_32px_rgba(13,13,13,0.08)] border border-[#e5e2e1]"
                >
                  <div className="flex text-[#ffb4ab] mb-6">
                    {[...Array(5)].map((_, j) => (
                      <span key={j} className="material-symbols-outlined text-xl">
                        star
                      </span>
                    ))}
                  </div>
                  <p className="text-[#1A1A1A] font-medium leading-relaxed mb-8">"{testimonial.text}"</p>
                  <div className="flex items-center gap-4">
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full bg-[#f6f3f2]"
                    />
                    <div>
                      <h4 className="font-semibold text-[#1A1A1A]">{testimonial.name}</h4>
                      <p className="text-sm text-[#5e3f3c]">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
