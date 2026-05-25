const footerLinks = [
  [
    { label: "About KQ", href: "/help/getting-started" },
    { label: "Our Fleet", href: "/help" },
    { label: "Destinations", href: "/search" },
    { label: "Asante Rewards", href: "/help" },
  ],
  [
    { label: "Flight Status", href: "/search" },
    { label: "Manage Booking", href: "/bookings" },
    { label: "Check-in Online", href: "/bookings" },
    { label: "Baggage Allowance", href: "/help" },
  ],
  [
    { label: "Help Center", href: "/help" },
    { label: "Contact Us", href: "/help" },
    { label: "Feedback", href: "/help" },
  ],
  [
    { label: "Privacy Policy", href: "/help/troubleshooting-checkin" },
    { label: "Terms of Use", href: "/help/faq-cancellations" },
    { label: "Cookie Policy", href: "/help/booking-tutorial" },
    { label: "Conditions of Carriage", href: "/help" },
  ],
];

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#1A1A1A] w-full mt-auto">
      <div className="max-w-7xl mx-auto px-5 md:px-20 pt-20 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 lg:gap-8 mb-16">
          {/* Brand & Newsletter */}
          <div className="md:col-span-12 lg:col-span-4 flex flex-col gap-6">
            <Link href="/" className="inline-block">
              <span className="text-3xl font-black tracking-wider text-white">
                KENYA <span className="text-[#c8102e]">AIRWAYS</span>
              </span>
            </Link>
            <p className="text-white/60 text-sm leading-relaxed max-w-sm">
              The Pride of Africa. Connecting Africa to the World and the World to Africa since 1977.
            </p>
            <div className="mt-4">
              <h4 className="text-white font-semibold mb-3">Subscribe to our newsletter</h4>
              <form className="flex gap-2" action="/api/newsletter" method="POST">
                <input
                  type="email"
                  placeholder="Email address"
                  className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full max-w-[240px]"
                />
                <button
                  type="button"
                  className="bg-primary hover:bg-[#e71520] text-white px-6 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>

          {/* Link Columns */}
          <div className="md:col-span-12 lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-8">
            {footerLinks.map((group, i) => (
              <div key={i} className="flex flex-col gap-4">
                <h4 className="text-white font-semibold mb-2">
                  {i === 0 ? "Company" : i === 1 ? "Travel" : i === 2 ? "Support" : "Legal"}
                </h4>
                {group.map(({ label, href }) => (
                  <Link
                    key={label}
                    href={href}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-white/40">
            © {new Date().getFullYear()} Kenya Airways. All rights reserved.
          </p>
          
          {/* Social Icons Placeholder */}
          <div className="flex items-center gap-4">
            {["facebook", "twitter", "instagram", "youtube", "linkedin"].map((social) => (
              <a
                key={social}
                href="#"
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                aria-label={social}
              >
                <span className="text-white/60 text-xs">{social.substring(0, 2)}</span>
              </a>
            ))}
          </div>

          {/* Alliances/Partners */}
          <div className="flex items-center gap-6">
            <span className="text-white/40 text-sm font-semibold tracking-wider">SKYTEAM</span>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-white/60">VISA</span>
              <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-white/60">MC</span>
              <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-white/60">M-PESA</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
