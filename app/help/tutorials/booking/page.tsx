"use client";

import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import ProgressiveStepper from "@/app/ui/ProgressiveStepper";
import { useToast } from "@/app/ClientProviders";
import { registerSearchItem } from "@/lib/searchRegistry";
import Link from "next/link";
import { useEffect } from "react";

export default function BookingTutorial() {
  const toast = useToast();
  useEffect(() => {
    try {
      registerSearchItem({
        id: "tutorial-booking",
        title: "Booking tutorial",
        href: "/help/tutorials/booking",
      });
    } catch (e) {}
  }, []);

  return (
    <div className="min-h-screen bg-[#fcf9f8] pt-20 text-[#1A1A1A]">
      <Header />
      <main>
        <section className="relative overflow-hidden bg-[#410001]">
          <img
            src="/images/hero_banner.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#410001] via-[#410001]/95 to-[#410001]/70" />
          <div className="relative mx-auto max-w-5xl px-5 py-16 md:px-20">
            <Link href="/help" className="inline-flex items-center gap-2 text-sm font-semibold text-white/75 hover:text-white">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Help Center
            </Link>
            <p className="mt-8 text-sm font-bold uppercase tracking-widest text-[#ffb4aa]">
              Booking Tutorial
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight text-white md:text-5xl">
              Book confidently from search to payment
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-white/80">
              A guided flow for finding flights, choosing a cabin, adding passengers, and confirming your booking.
            </p>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-8 px-5 py-12 md:grid-cols-[1fr_300px] md:px-20">
          <div className="rounded-xl border border-[#e5e2e1] bg-white p-6 shadow-sm md:p-8">
            <ProgressiveStepper
              steps={[
                {
                  id: "s1",
                  title: "Search",
                  content: (
                    <div className="leading-7 text-[#5e3f3c]">
                      Choose your origin, destination, trip type, dates, passengers, and cabin. The search page keeps the URL updated so you can share or return to the same results.
                    </div>
                  ),
                },
                {
                  id: "s2",
                  title: "Select",
                  content: (
                    <div className="leading-7 text-[#5e3f3c]">
                      Compare price, duration, available seats, and included services. Pick a flight to continue into booking.
                    </div>
                  ),
                },
                {
                  id: "s3",
                  title: "Details",
                  content: (
                    <div className="leading-7 text-[#5e3f3c]">
                      Add passenger records carefully. Names, nationality, and passport numbers should match the travel documents.
                    </div>
                  ),
                },
                {
                  id: "s4",
                  title: "Payment",
                  content: (
                    <div className="leading-7 text-[#5e3f3c]">
                      Confirm the fare, complete payment, and keep the booking reference for check-in, changes, refunds, and support.
                    </div>
                  ),
                },
              ]}
              onFinish={() =>
                toast.push({ message: "Tutorial complete", tone: "success" })
              }
            />
          </div>

          <aside className="space-y-4">
            <Link href="/search" className="block rounded-xl bg-primary p-5 text-white shadow-lift">
              <span className="material-symbols-outlined">flight_takeoff</span>
              <h2 className="mt-3 text-xl font-bold">Start a search</h2>
              <p className="mt-2 text-sm leading-6 text-white/80">
                Try the updated flight search flow with live filters.
              </p>
            </Link>
            <Link href="/help/travel-requirements" className="block rounded-xl border border-[#e5e2e1] bg-white p-5 shadow-sm">
              <span className="material-symbols-outlined text-primary">verified_user</span>
              <h2 className="mt-3 font-bold">Travel guidelines</h2>
              <p className="mt-2 text-sm leading-6 text-[#5e3f3c]">
                Review destination requirements before confirming.
              </p>
            </Link>
          </aside>
        </section>
      </main>
      <Footer />
    </div>
  );
}
