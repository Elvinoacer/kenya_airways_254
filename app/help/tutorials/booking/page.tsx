"use client";
import ProgressiveStepper from "@/app/ui/ProgressiveStepper";
import { useToast } from "@/app/ClientProviders";
import { registerSearchItem } from "@/lib/searchRegistry";
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
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Booking Tutorial</h1>
      <p className="text-sm text-slate-600">
        Follow the guided steps to learn booking flow.
      </p>
      <div className="mt-4">
        <ProgressiveStepper
          steps={[
            {
              id: "s1",
              title: "Search",
              content: (
                <div>
                  <p>Use the search form to find flights for your dates.</p>
                </div>
              ),
            },
            {
              id: "s2",
              title: "Select",
              content: (
                <div>
                  <p>
                    Choose fare and seat class. Seats are visualized on the seat
                    map.
                  </p>
                </div>
              ),
            },
            {
              id: "s3",
              title: "Details",
              content: (
                <div>
                  <p>
                    Enter passenger details carefully. Passport number must
                    match ID.
                  </p>
                </div>
              ),
            },
            {
              id: "s4",
              title: "Payment",
              content: (
                <div>
                  <p>
                    Complete payment using MPESA or Card. Use test card for
                    sandbox.
                  </p>
                </div>
              ),
            },
          ]}
          onFinish={() =>
            toast.push({ message: "Tutorial complete", tone: "success" })
          }
        />
      </div>
    </main>
  );
}
