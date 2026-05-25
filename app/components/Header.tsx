"use client";

import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { label: "Explore", href: "#offers", active: true },
  { label: "Plan", href: "#plan" },
  { label: "Book & Manage", href: "/bookings" },
  { label: "Experience", href: "#experience" },
  { label: "Asante Rewards", href: "#rewards" },
  { label: "Help", href: "/help" },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 shadow-sm transition-all duration-300 ease-in-out h-20">
      <div className="flex justify-between items-center px-5 md:px-20 py-4 w-full h-full max-w-7xl mx-auto">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center">
          <div className="relative inline-flex items-center bg-primary text-white px-3 py-2 rounded-tr-xl rounded-bl-xl">
            <img
              src="/images/image.png"
              alt="Kenya Airways"
              className="h-8 md:h-10 w-auto object-contain"
            />
            <span className="sr-only">Kenya Airways</span>
            {/* Slanted accent on the right to match branding */}
            <span className="absolute -right-3 top-0 bottom-0 flex items-center pointer-events-none">
              <svg
                width="36"
                height="64"
                viewBox="0 0 36 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-primary"
              >
                <polygon points="0,0 36,32 0,64" fill="currentColor" />
              </svg>
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map(({ label, href, active }) => (
            <Link
              key={label}
              href={href}
              className={`text-sm font-medium tracking-wide transition-colors ${
                active
                  ? "text-primary border-b-2 border-primary pb-1"
                  : "text-[#5e3f3c] hover:text-primary"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* CTA Button */}
        <Link
          href="/search"
          className="hidden md:flex items-center justify-center bg-primary text-white text-sm font-medium tracking-wide px-6 py-3 rounded-lg hover:bg-[#e71520] transition-colors"
        >
          Book a Flight
        </Link>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-primary"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span className="material-symbols-outlined text-3xl">
            {mobileMenuOpen ? "close" : "menu"}
          </span>
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-outline-variant/30 shadow-lg">
          <nav className="flex flex-col px-5 py-4 gap-4">
            {navLinks.map(({ label, href, active }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-sm font-medium transition-colors ${
                  active ? "text-primary" : "text-[#5e3f3c] hover:text-primary"
                }`}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/search"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-2 w-full bg-primary text-white text-sm font-medium tracking-wide px-6 py-3 rounded-lg hover:bg-[#e71520] transition-colors text-center"
            >
              Book a Flight
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
