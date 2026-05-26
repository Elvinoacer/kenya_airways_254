import type { SeatClass } from "../types/flight";

export type RequiredTravelClass = "CLASS_A" | "CLASS_B" | "CLASS_C";

export type TravelClassInfo = {
  code: RequiredTravelClass;
  shortCode: "A" | "B" | "C";
  label: string;
  description: string;
  seatClass: SeatClass;
  fareMultiplier: number;
};

export const REQUIRED_TRAVEL_CLASSES: TravelClassInfo[] = [
  {
    code: "CLASS_A",
    shortCode: "A",
    label: "Class A: Executive",
    description: "Executive",
    seatClass: "FIRST",
    fareMultiplier: 2.8,
  },
  {
    code: "CLASS_B",
    shortCode: "B",
    label: "Class B: Middle class",
    description: "Middle class",
    seatClass: "BUSINESS",
    fareMultiplier: 1.7,
  },
  {
    code: "CLASS_C",
    shortCode: "C",
    label: "Class C: Low class",
    description: "Low class",
    seatClass: "ECONOMY",
    fareMultiplier: 1,
  },
];

const byCode = new Map(REQUIRED_TRAVEL_CLASSES.map((item) => [item.code, item]));
const bySeatClass = new Map(
  REQUIRED_TRAVEL_CLASSES.map((item) => [item.seatClass, item]),
);

export function normalizeTravelClass(input?: string | null): TravelClassInfo {
  const value = String(input || "CLASS_C").toUpperCase().replace(/[\s-]+/g, "_");
  if (byCode.has(value as RequiredTravelClass)) {
    return byCode.get(value as RequiredTravelClass)!;
  }

  if (value === "A" || value === "EXECUTIVE" || value === "FIRST") {
    return byCode.get("CLASS_A")!;
  }
  if (
    value === "B" ||
    value === "MIDDLE" ||
    value === "MIDDLE_CLASS" ||
    value === "BUSINESS" ||
    value === "PREMIUM_ECONOMY"
  ) {
    return byCode.get("CLASS_B")!;
  }
  return byCode.get("CLASS_C")!;
}

export function travelClassFromSeatClass(seatClass?: string | null) {
  return bySeatClass.get(String(seatClass || "ECONOMY") as SeatClass) || byCode.get("CLASS_C")!;
}

export function formatTravelClass(input?: string | null) {
  return normalizeTravelClass(input).label;
}

export function seatClassesForCapacity(): SeatClass[] {
  return REQUIRED_TRAVEL_CLASSES.map((item) => item.seatClass);
}
